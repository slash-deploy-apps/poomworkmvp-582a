import { and, eq } from 'drizzle-orm';
import { db } from '~/lib/db.server';
import { user, certifications, portfolios } from '~/db/schema';

export type TrustBreakdown = {
  total: number;          // 0~100
  rating: number;         // user.rating * 10 (max 50)
  reviews: number;        // min(reviewCount, 20) * 1 = max 20
  certifications: number; // approved cert 개수 * 5 (max 20)
  portfolio: number;      // portfolio 개수 * 2 (max 10)
};

export async function calcTrustScore(userId: string): Promise<TrustBreakdown> {
  const workerRow = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .get();

  const approvedCertRows = await db
    .select()
    .from(certifications)
    .where(and(eq(certifications.userId, userId), eq(certifications.status, 'approved')));

  const portfolioRows = await db
    .select()
    .from(portfolios)
    .where(eq(portfolios.workerId, userId));

  const ratingScore = Math.min(Math.round((workerRow?.rating ?? 0) * 10), 50);
  const reviewsScore = Math.min(workerRow?.reviewCount ?? 0, 20);
  const certsScore = Math.min(approvedCertRows.length * 5, 20);
  const portfolioScore = Math.min(portfolioRows.length * 2, 10);

  return {
    total: ratingScore + reviewsScore + certsScore + portfolioScore,
    rating: ratingScore,
    reviews: reviewsScore,
    certifications: certsScore,
    portfolio: portfolioScore,
  };
}
