import { and, desc, eq, gte, inArray, ne, or } from 'drizzle-orm';
import { db } from '~/lib/db.server';
import { jobs, jobApplications, user, categories, enrollments, courses } from '~/db/schema';
import { calcTrustScore } from '~/lib/trust.server';

function parseTokens(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/[,\s·]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

function toTimestampMs(value: Date | number | null | undefined): number {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  return Number(value) * 1000;
}

export type RecommendedJob = {
  id: string;
  title: string;
  budgetMin: number | null;
  budgetMax: number | null;
  location: string | null;
  isRemote: boolean;
  tags: string | null;
  categoryName: string | null;
  clientName: string | null;
  score: number;
  matchedSkills: string[];
};

export type RecommendedWorker = {
  id: string;
  name: string | null;
  image: string | null;
  skills: string | null;
  location: string | null;
  rating: number;
  reviewCount: number;
  trustScore: number;
  score: number;
  matchedSkills: string[];
};

export async function recommendJobsForCourse(
  courseId: string,
  limit = 4,
): Promise<RecommendedJob[]> {
  const courseRow = await db
    .select()
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1)
    .then((r) => r[0]);
  if (!courseRow) return [];

  const courseTags = new Set(parseTokens(courseRow.tags));
  const fourteenDaysAgoMs = Date.now() - 14 * 24 * 60 * 60 * 1000;

  const candidates = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      budgetMin: jobs.budgetMin,
      budgetMax: jobs.budgetMax,
      location: jobs.location,
      isRemote: jobs.isRemote,
      tags: jobs.tags,
      categoryId: jobs.categoryId,
      createdAt: jobs.createdAt,
      categoryName: categories.name,
      clientName: user.name,
    })
    .from(jobs)
    .leftJoin(categories, eq(jobs.categoryId, categories.id))
    .leftJoin(user, eq(jobs.clientId, user.id))
    .where(or(eq(jobs.status, 'open'), eq(jobs.status, 'active')))
    .limit(100);

  const scored: RecommendedJob[] = candidates.map((j) => {
    const jobTags = new Set(parseTokens(j.tags));
    let score = 0;
    const matchedSkills: string[] = [];

    // Tag overlap: +10 per matched tag
    for (const tag of courseTags) {
      if (jobTags.has(tag)) {
        matchedSkills.push(tag);
        score += 10;
      }
    }

    // Same category: +5
    if (courseRow.categoryId != null && j.categoryId === courseRow.categoryId) {
      score += 5;
    }

    // Recent posting (within 14 days): +2
    if (toTimestampMs(j.createdAt) >= fourteenDaysAgoMs) {
      score += 2;
    }

    return {
      id: j.id,
      title: j.title,
      budgetMin: j.budgetMin,
      budgetMax: j.budgetMax,
      location: j.location,
      isRemote: j.isRemote === 1,
      tags: j.tags,
      categoryName: j.categoryName ?? null,
      clientName: j.clientName ?? null,
      score,
      matchedSkills,
    };
  });

  return scored
    .filter((j) => j.score > 0)
    .sort((a, b) => b.score - a.score || 0)
    .slice(0, limit);
}

export async function recommendJobsForWorker(
  workerId: string,
  limit = 6,
): Promise<RecommendedJob[]> {
  const workerRow = await db
    .select()
    .from(user)
    .where(eq(user.id, workerId))
    .limit(1)
    .then((r) => r[0]);
  if (!workerRow) return [];

  // Base skills from worker profile
  const workerSkills = new Set(parseTokens(workerRow.skills));

  // Augment with tags from nearly-completed courses (progress >= 80%)
  // This means "courses I've almost finished" count as acquired skills
  const nearlyCompletedEnrollments = await db
    .select({ courseId: enrollments.courseId })
    .from(enrollments)
    .where(and(eq(enrollments.userId, workerId), gte(enrollments.progress, 80)));

  if (nearlyCompletedEnrollments.length > 0) {
    const courseIds = nearlyCompletedEnrollments.map((e) => e.courseId);
    const courseRows = await db
      .select({ tags: courses.tags })
      .from(courses)
      .where(inArray(courses.id, courseIds));
    for (const c of courseRows) {
      for (const tag of parseTokens(c.tags)) {
        workerSkills.add(tag);
      }
    }
  }

  // Jobs the worker has already applied to
  const appliedRows = await db
    .select({ jobId: jobApplications.jobId })
    .from(jobApplications)
    .where(eq(jobApplications.workerId, workerId));
  const appliedJobIds = appliedRows.map((r) => r.jobId);

  // Category preferences from past applications
  const preferredCategoryIds = new Set<number | null>();
  if (appliedJobIds.length > 0) {
    const pastJobs = await db
      .select({ categoryId: jobs.categoryId })
      .from(jobs)
      .where(inArray(jobs.id, appliedJobIds));
    for (const j of pastJobs) {
      if (j.categoryId != null) preferredCategoryIds.add(j.categoryId);
    }
  }

  const sevenDaysAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const candidates = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      budgetMin: jobs.budgetMin,
      budgetMax: jobs.budgetMax,
      location: jobs.location,
      isRemote: jobs.isRemote,
      tags: jobs.tags,
      categoryId: jobs.categoryId,
      createdAt: jobs.createdAt,
      categoryName: categories.name,
      clientName: user.name,
    })
    .from(jobs)
    .leftJoin(categories, eq(jobs.categoryId, categories.id))
    .leftJoin(user, eq(jobs.clientId, user.id))
    .where(
      and(
        or(eq(jobs.status, 'open'), eq(jobs.status, 'active')),
        ne(jobs.clientId, workerId),
        appliedJobIds.length > 0
          ? and(...appliedJobIds.map((id) => ne(jobs.id, id)))
          : undefined,
      ),
    )
    .limit(100);

  const scored: RecommendedJob[] = candidates.map((j) => {
    const jobTags = new Set(parseTokens(j.tags));
    let score = 0;
    const matchedSkills: string[] = [];

    for (const skill of workerSkills) {
      if (jobTags.has(skill)) {
        matchedSkills.push(skill);
        score += 10;
      }
    }

    if (j.categoryId != null && preferredCategoryIds.has(j.categoryId)) {
      score += 5;
    }
    if (j.isRemote === 1 || j.location === workerRow.location) score += 3;
    if (toTimestampMs(j.createdAt) >= sevenDaysAgoMs) score += 2;

    return {
      id: j.id,
      title: j.title,
      budgetMin: j.budgetMin,
      budgetMax: j.budgetMax,
      location: j.location,
      isRemote: j.isRemote === 1,
      tags: j.tags,
      categoryName: j.categoryName ?? null,
      clientName: j.clientName ?? null,
      score,
      matchedSkills,
    };
  });

  return scored
    .sort((a, b) => b.score - a.score || 0)
    .slice(0, limit);
}

export async function recommendWorkersForJob(
  jobId: string,
  limit = 6,
): Promise<RecommendedWorker[]> {
  const jobRow = await db
    .select()
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1)
    .then((r) => r[0]);
  if (!jobRow) return [];

  const jobTags = new Set(parseTokens(jobRow.tags));

  const workers = await db
    .select()
    .from(user)
    .where(and(eq(user.role, 'worker'), ne(user.id, jobRow.clientId)))
    .limit(100);

  const scored: RecommendedWorker[] = await Promise.all(
    workers.map(async (w) => {
      const workerSkills = new Set(parseTokens(w.skills));
      let score = 0;
      const matchedSkills: string[] = [];

      for (const tag of jobTags) {
        if (workerSkills.has(tag)) {
          matchedSkills.push(tag);
          score += 10;
        }
      }

      if (jobRow.isRemote === 1 || jobRow.location === w.location) score += 3;

      const trust = await calcTrustScore(w.id);
      score += trust.total * 0.3;

      return {
        id: w.id,
        name: w.name,
        image: w.image,
        skills: w.skills,
        location: w.location,
        rating: w.rating,
        reviewCount: w.reviewCount,
        trustScore: trust.total,
        score,
        matchedSkills,
      };
    }),
  );

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

export async function recommendWorkersForClient(
  clientId: string,
  limit = 6,
): Promise<RecommendedWorker[]> {
  const recentJob = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(and(eq(jobs.clientId, clientId), eq(jobs.status, 'open')))
    .orderBy(desc(jobs.createdAt))
    .limit(1)
    .then((r) => r[0]);

  if (recentJob) {
    return recommendWorkersForJob(recentJob.id, limit);
  }

  // Fallback: trust score + review count based ranking
  const workers = await db
    .select()
    .from(user)
    .where(and(eq(user.role, 'worker'), ne(user.id, clientId)))
    .limit(100);

  const scored: RecommendedWorker[] = await Promise.all(
    workers.map(async (w) => {
      const trust = await calcTrustScore(w.id);
      const score = trust.total * 2 + w.reviewCount;
      return {
        id: w.id,
        name: w.name,
        image: w.image,
        skills: w.skills,
        location: w.location,
        rating: w.rating,
        reviewCount: w.reviewCount,
        trustScore: trust.total,
        score,
        matchedSkills: [],
      };
    }),
  );

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
