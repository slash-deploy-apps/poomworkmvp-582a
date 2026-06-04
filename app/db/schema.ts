import { relations, sql } from 'drizzle-orm';
import { index, sqliteTable, uniqueIndex } from 'drizzle-orm/sqlite-core';

// ─── User (Better Auth compatible + poomwork extensions) ───────────────────

export const user = sqliteTable('user', (d) => ({
  id: d
    .text({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: d.text({ length: 255 }),
  email: d.text({ length: 255 }).notNull().unique(),
  emailVerified: d.integer({ mode: 'boolean' }).default(false),
  image: d.text({ length: 255 }),
  role: d.text({ length: 20 }).default('worker').notNull(), // 'worker' | 'client' | 'admin'
  phone: d.text({ length: 20 }),
  bio: d.text(),
  skills: d.text(),
  location: d.text({ length: 255 }),
  coverImage: d.text({ length: 500 }),
  videoUrl: d.text({ length: 500 }),
  rating: d.real().default(0).notNull(),
  reviewCount: d.integer({ mode: 'number' }).default(0).notNull(),
  createdAt: d
    .integer({ mode: 'timestamp' })
    .default(sql`(unixepoch())`)
    .notNull(),
  updatedAt: d.integer({ mode: 'timestamp' }).$onUpdate(() => new Date()),
}));

// ─── Account (Better Auth) ────────────────────────────────────────────────

export const account = sqliteTable(
  'account',
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: d
      .text({ length: 255 })
      .notNull()
      .references(() => user.id),
    accountId: d.text({ length: 255 }).notNull(),
    providerId: d.text({ length: 255 }).notNull(),
    accessToken: d.text(),
    refreshToken: d.text(),
    accessTokenExpiresAt: d.integer({ mode: 'timestamp' }),
    refreshTokenExpiresAt: d.integer({ mode: 'timestamp' }),
    scope: d.text({ length: 255 }),
    idToken: d.text(),
    password: d.text(),
    createdAt: d
      .integer({ mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: 'timestamp' }).$onUpdate(() => new Date()),
  }),
  (t) => [index('account_user_id_idx').on(t.userId)],
);

// ─── Session (Better Auth) ────────────────────────────────────────────────

export const session = sqliteTable(
  'session',
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: d
      .text({ length: 255 })
      .notNull()
      .references(() => user.id),
    token: d.text({ length: 255 }).notNull().unique(),
    expiresAt: d.integer({ mode: 'timestamp' }).notNull(),
    ipAddress: d.text({ length: 255 }),
    userAgent: d.text({ length: 255 }),
    createdAt: d
      .integer({ mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: 'timestamp' }).$onUpdate(() => new Date()),
  }),
  (t) => [index('session_user_id_idx').on(t.userId)],
);

// ─── Verification (Better Auth) ───────────────────────────────────────────

export const verification = sqliteTable(
  'verification',
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    identifier: d.text({ length: 255 }).notNull(),
    value: d.text({ length: 255 }).notNull(),
    expiresAt: d.integer({ mode: 'timestamp' }).notNull(),
    createdAt: d
      .integer({ mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: 'timestamp' }).$onUpdate(() => new Date()),
  }),
  (t) => [index('verification_identifier_idx').on(t.identifier)],
);

// ─── Categories ───────────────────────────────────────────────────────────

export const categories = sqliteTable(
  'categories',
  (d) => ({
    id: d.integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
    name: d.text({ length: 100 }).notNull(),
    slug: d.text({ length: 100 }).notNull().unique(),
    icon: d.text({ length: 50 }),
    parentId: d.integer({ mode: 'number' }).references((): any => categories.id),
    sortOrder: d.integer({ mode: 'number' }).default(0).notNull(),
  }),
  (t) => [index('categories_parent_id_idx').on(t.parentId as any)],
);

// ─── Jobs (일거리) ────────────────────────────────────────────────────────

export const jobs = sqliteTable(
  'jobs',
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    clientId: d
      .text({ length: 255 })
      .notNull()
      .references(() => user.id),
    categoryId: d
      .integer({ mode: 'number' })
      .references(() => categories.id),
    title: d.text({ length: 255 }).notNull(),
    description: d.text().notNull(),
    budgetMin: d.integer({ mode: 'number' }),
    budgetMax: d.integer({ mode: 'number' }),
    budgetType: d.text({ length: 20 }).default('negotiable').notNull(),
    duration: d.text({ length: 50 }),
    status: d.text({ length: 20 }).default('open').notNull(),
    urgency: d.text({ length: 20 }).default('medium'),
    requirements: d.text(),
    tags: d.text(),
    location: d.text({ length: 255 }),
    isRemote: d.integer({ mode: 'number' }).default(1).notNull(),
    views: d.integer({ mode: 'number' }).default(0).notNull(),
    applicationCount: d.integer({ mode: 'number' }).default(0).notNull(),
    thumbnailUrl: d.text({ length: 500 }),
    createdAt: d
      .integer({ mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: 'timestamp' }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index('jobs_client_id_idx').on(t.clientId),
    index('jobs_category_id_idx').on(t.categoryId),
    index('jobs_status_idx').on(t.status),
  ],
);

// ─── Job Applications (지원서) ────────────────────────────────────────────

export const jobApplications = sqliteTable(
  'job_applications',
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    jobId: d
      .text({ length: 255 })
      .notNull()
      .references(() => jobs.id),
    workerId: d
      .text({ length: 255 })
      .notNull()
      .references(() => user.id),
    coverLetter: d.text().notNull(),
    proposedBudget: d.integer({ mode: 'number' }),
    proposedDuration: d.text({ length: 50 }),
    status: d.text({ length: 20 }).default('pending').notNull(),
    createdAt: d
      .integer({ mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: 'timestamp' }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index('job_applications_job_id_idx').on(t.jobId),
    index('job_applications_worker_id_idx').on(t.workerId),
  ],
);

// ─── Portfolios (포트폴리오) ──────────────────────────────────────────────

export const portfolios = sqliteTable(
  'portfolios',
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workerId: d
      .text({ length: 255 })
      .notNull()
      .references(() => user.id),
    title: d.text({ length: 255 }).notNull(),
    description: d.text().notNull(),
    imageUrl: d.text({ length: 500 }),
    projectUrl: d.text({ length: 500 }),
    videoUrl: d.text({ length: 500 }),
    skills: d.text(),
    createdAt: d
      .integer({ mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
  }),
  (t) => [index('portfolios_worker_id_idx').on(t.workerId)],
);

// ─── Courses (강좌) ───────────────────────────────────────────────────────

export const courses = sqliteTable(
  'courses',
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: d.text({ length: 255 }).notNull(),
    description: d.text().notNull(),
    instructorId: d
      .text({ length: 255 })
      .notNull()
      .references(() => user.id),
    categoryId: d
      .integer({ mode: 'number' })
      .references(() => categories.id),
    thumbnailUrl: d.text({ length: 500 }),
    price: d.integer({ mode: 'number' }).default(0).notNull(),
    level: d.text({ length: 20 }).default('beginner').notNull(),
    duration: d.text({ length: 50 }),
    tags: d.text(),
    rating: d.real().default(0).notNull(),
    reviewCount: d.integer({ mode: 'number' }).default(0).notNull(),
    enrollmentCount: d.integer({ mode: 'number' }).default(0).notNull(),
    status: d.text({ length: 20 }).default('draft').notNull(),
    createdAt: d
      .integer({ mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: 'timestamp' }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index('courses_instructor_id_idx').on(t.instructorId),
    index('courses_category_id_idx').on(t.categoryId),
    index('courses_status_idx').on(t.status),
  ],
);

// ─── Course Chapters (강좌 챕터) ──────────────────────────────────────────

export const courseChapters = sqliteTable(
  'course_chapters',
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    courseId: d
      .text({ length: 255 })
      .notNull()
      .references(() => courses.id),
    title: d.text({ length: 255 }).notNull(),
    sortOrder: d.integer({ mode: 'number' }).default(0).notNull(),
    createdAt: d
      .integer({ mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
  }),
  (t) => [index('course_chapters_course_id_idx').on(t.courseId)],
);

// ─── Course Lessons (강좌 레슨/비디오) ────────────────────────────────────

export const courseLessons = sqliteTable(
  'course_lessons',
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    chapterId: d
      .text({ length: 255 })
      .notNull()
      .references(() => courseChapters.id),
    courseId: d
      .text({ length: 255 })
      .notNull()
      .references(() => courses.id),
    title: d.text({ length: 255 }).notNull(),
    videoUrl: d.text({ length: 500 }),
    duration: d.integer({ mode: 'number' }).default(0).notNull(),
    sortOrder: d.integer({ mode: 'number' }).default(0).notNull(),
    isFree: d.integer({ mode: 'number' }).default(0).notNull(),
    createdAt: d
      .integer({ mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
  }),
  (t) => [
    index('course_lessons_chapter_id_idx').on(t.chapterId),
    index('course_lessons_course_id_idx').on(t.courseId),
  ],
);

// ─── Enrollments (수강 등록) ──────────────────────────────────────────────

export const enrollments = sqliteTable(
  'enrollments',
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: d
      .text({ length: 255 })
      .notNull()
      .references(() => user.id),
    courseId: d
      .text({ length: 255 })
      .notNull()
      .references(() => courses.id),
    progress: d.real().default(0).notNull(),
    completedAt: d.integer({ mode: 'timestamp' }),
    createdAt: d
      .integer({ mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
  }),
  (t) => [
    index('enrollments_user_id_idx').on(t.userId),
    index('enrollments_course_id_idx').on(t.courseId),
  ],
);

// ─── Lesson Progress (레슨 시청 기록) ─────────────────────────────────────

export const lessonProgress = sqliteTable(
  'lesson_progress',
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    enrollmentId: d
      .text({ length: 255 })
      .notNull()
      .references(() => enrollments.id),
    lessonId: d
      .text({ length: 255 })
      .notNull()
      .references(() => courseLessons.id),
    watchedAt: d
      .integer({ mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
  }),
  (t) => [
    uniqueIndex('lesson_progress_enrollment_lesson_idx').on(
      t.enrollmentId,
      t.lessonId,
    ),
  ],
);

// ─── Payments (가상 결제) ─────────────────────────────────────────────────

export const payments = sqliteTable(
  'payments',
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    payerId: d
      .text({ length: 255 })
      .notNull()
      .references(() => user.id),
    payeeId: d.text({ length: 255 }).references(() => user.id),
    amount: d.integer({ mode: 'number' }).notNull(),
    type: d.text({ length: 30 }).notNull(),
    status: d.text({ length: 20 }).default('pending').notNull(),
    referenceId: d.text({ length: 255 }),
    paymentMethod: d.text({ length: 30 }).default('card').notNull(),
    escrowReleasedAt: d.integer({ mode: 'timestamp' }),
    orderId: d.text({ length: 255 }).unique(),
    paymentKey: d.text({ length: 255 }),
    nicepaySessionId: d.text({ length: 255 }),
    paymentProvider: d.text({ length: 20 }),
    tossPaymentMethod: d.text({ length: 50 }),
    approvedAt: d.integer({ mode: 'timestamp' }),
    cancelledAt: d.integer({ mode: 'timestamp' }),
    cancelReason: d.text({ length: 500 }),
    createdAt: d
      .integer({ mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: 'timestamp' }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index('payments_payer_id_idx').on(t.payerId),
    index('payments_payee_id_idx').on(t.payeeId),
    index('payments_status_idx').on(t.status),
    index('payments_order_id_idx').on(t.orderId),
  ],
);

// ─── Reviews (리뷰) ───────────────────────────────────────────────────────

export const reviews = sqliteTable(
  'reviews',
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    reviewerId: d
      .text({ length: 255 })
      .notNull()
      .references(() => user.id),
    revieweeId: d
      .text({ length: 255 })
      .notNull()
      .references(() => user.id),
    jobId: d.text({ length: 255 }).references(() => jobs.id),
    courseId: d.text({ length: 255 }).references(() => courses.id),
    rating: d.integer({ mode: 'number' }).notNull(),
    comment: d.text(),
    createdAt: d
      .integer({ mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
  }),
  (t) => [
    index('reviews_reviewer_id_idx').on(t.reviewerId),
    index('reviews_reviewee_id_idx').on(t.revieweeId),
  ],
);

// ─── Messages (메시지) ────────────────────────────────────────────────────

export const messages = sqliteTable(
  'messages',
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    senderId: d
      .text({ length: 255 })
      .notNull()
      .references(() => user.id),
    receiverId: d
      .text({ length: 255 })
      .notNull()
      .references(() => user.id),
    jobId: d.text({ length: 255 }).references(() => jobs.id),
    content: d.text().notNull(),
    type: d.text({ length: 20 }).default('text').notNull(),
    metadata: d.text(),
    isRead: d.integer({ mode: 'number' }).default(0).notNull(),
    createdAt: d
      .integer({ mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
  }),
  (t) => [
    index('messages_sender_id_idx').on(t.senderId),
    index('messages_receiver_id_idx').on(t.receiverId),
    index('messages_job_id_idx').on(t.jobId),
  ],
);

// ─── Relations ────────────────────────────────────────────────────────────

export const userRelations = relations(user, ({ many }) => ({
  account: many(account),
  session: many(session),
  jobs: many(jobs),
  jobApplications: many(jobApplications),
  portfolios: many(portfolios),
  certifications: many(certifications, { relationName: 'certificationOwner' }),
  services: many(services),
  coursesAsInstructor: many(courses),
  enrollments: many(enrollments),
  paymentsAsPayer: many(payments),
  reviewsGiven: many(reviews, { relationName: 'reviewer' }),
  reviewsReceived: many(reviews, { relationName: 'reviewee' }),
  messagesSent: many(messages, { relationName: 'sender' }),
  messagesReceived: many(messages, { relationName: 'receiver' }),
  disputesRaised: many(disputes, { relationName: 'disputeRaiser' }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'categoryHierarchy',
  }),
  children: many(categories, { relationName: 'categoryHierarchy' }),
  jobs: many(jobs),
  courses: many(courses),
  services: many(services),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  client: one(user, { fields: [jobs.clientId], references: [user.id] }),
  category: one(categories, {
    fields: [jobs.categoryId],
    references: [categories.id],
  }),
  applications: many(jobApplications),
  reviews: many(reviews),
  messages: many(messages),
}));

export const jobApplicationsRelations = relations(
  jobApplications,
  ({ one }) => ({
    job: one(jobs, { fields: [jobApplications.jobId], references: [jobs.id] }),
    worker: one(user, {
      fields: [jobApplications.workerId],
      references: [user.id],
    }),
  }),
);

export const portfoliosRelations = relations(portfolios, ({ one }) => ({
  worker: one(user, { fields: [portfolios.workerId], references: [user.id] }),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  instructor: one(user, {
    fields: [courses.instructorId],
    references: [user.id],
  }),
  category: one(categories, {
    fields: [courses.categoryId],
    references: [categories.id],
  }),
  chapters: many(courseChapters),
  enrollments: many(enrollments),
  reviews: many(reviews),
}));

export const courseChaptersRelations = relations(
  courseChapters,
  ({ one, many }) => ({
    course: one(courses, {
      fields: [courseChapters.courseId],
      references: [courses.id],
    }),
    lessons: many(courseLessons),
  }),
);

export const courseLessonsRelations = relations(courseLessons, ({ one }) => ({
  chapter: one(courseChapters, {
    fields: [courseLessons.chapterId],
    references: [courseChapters.id],
  }),
  course: one(courses, {
    fields: [courseLessons.courseId],
    references: [courses.id],
  }),
}));

export const enrollmentsRelations = relations(enrollments, ({ one, many }) => ({
  user: one(user, { fields: [enrollments.userId], references: [user.id] }),
  course: one(courses, {
    fields: [enrollments.courseId],
    references: [courses.id],
  }),
  lessonProgress: many(lessonProgress),
}));

export const lessonProgressRelations = relations(lessonProgress, ({ one }) => ({
  enrollment: one(enrollments, {
    fields: [lessonProgress.enrollmentId],
    references: [enrollments.id],
  }),
  lesson: one(courseLessons, {
    fields: [lessonProgress.lessonId],
    references: [courseLessons.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  payer: one(user, {
    fields: [payments.payerId],
    references: [user.id],
    relationName: 'payer',
  }),
  payee: one(user, {
    fields: [payments.payeeId],
    references: [user.id],
    relationName: 'payee',
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  reviewer: one(user, {
    fields: [reviews.reviewerId],
    references: [user.id],
    relationName: 'reviewer',
  }),
  reviewee: one(user, {
    fields: [reviews.revieweeId],
    references: [user.id],
    relationName: 'reviewee',
  }),
  job: one(jobs, { fields: [reviews.jobId], references: [jobs.id] }),
  course: one(courses, {
    fields: [reviews.courseId],
    references: [courses.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(user, {
    fields: [messages.senderId],
    references: [user.id],
    relationName: 'sender',
  }),
  receiver: one(user, {
    fields: [messages.receiverId],
    references: [user.id],
    relationName: 'receiver',
  }),
  job: one(jobs, { fields: [messages.jobId], references: [jobs.id] }),
}));

// ─── Certifications (자격·인증) ───────────────────────────────────────────

export const certifications = sqliteTable(
  'certifications',
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: d
      .text({ length: 255 })
      .notNull()
      .references(() => user.id),
    type: d.text({ length: 30 }).notNull(), // 'license' | 'business' | 'education' | 'identity'
    title: d.text({ length: 255 }).notNull(),
    issuer: d.text({ length: 255 }),
    issuedAt: d.text({ length: 20 }), // YYYY-MM-DD (선택)
    fileUrl: d.text({ length: 500 }).notNull(),
    status: d.text({ length: 20 }).default('pending').notNull(), // pending | approved | rejected
    reviewNote: d.text(),
    reviewedBy: d.text({ length: 255 }).references(() => user.id),
    reviewedAt: d.integer({ mode: 'timestamp' }),
    createdAt: d
      .integer({ mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
  }),
  (t) => [
    index('certifications_user_id_idx').on(t.userId),
    index('certifications_status_idx').on(t.status),
  ],
);

// ─── Services (품/서비스) ─────────────────────────────────────────────────

export const services = sqliteTable(
  'services',
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workerId: d
      .text({ length: 255 })
      .notNull()
      .references(() => user.id),
    categoryId: d
      .integer({ mode: 'number' })
      .references(() => categories.id),
    title: d.text({ length: 255 }).notNull(),
    description: d.text().notNull(),
    thumbnailUrl: d.text({ length: 500 }),
    videoUrl: d.text({ length: 500 }),
    price: d.integer({ mode: 'number' }).notNull(),
    deliveryDays: d.integer({ mode: 'number' }).default(7).notNull(),
    revisions: d.integer({ mode: 'number' }).default(2).notNull(),
    tags: d.text(),
    status: d.text({ length: 20 }).default('active').notNull(),
    views: d.integer({ mode: 'number' }).default(0).notNull(),
    orderCount: d.integer({ mode: 'number' }).default(0).notNull(),
    rating: d.real().default(0).notNull(),
    reviewCount: d.integer({ mode: 'number' }).default(0).notNull(),
    createdAt: d
      .integer({ mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: 'timestamp' }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index('services_worker_id_idx').on(t.workerId),
    index('services_category_id_idx').on(t.categoryId),
    index('services_status_idx').on(t.status),
  ],
);

// ─── Contracts (계약) ─────────────────────────────────────────────────────

export const contracts = sqliteTable(
  'contracts',
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    applicationId: d
      .text({ length: 255 })
      .notNull()
      .references(() => jobApplications.id),
    workerId: d
      .text({ length: 255 })
      .notNull()
      .references(() => user.id),
    clientId: d
      .text({ length: 255 })
      .notNull()
      .references(() => user.id),
    jobId: d
      .text({ length: 255 })
      .notNull()
      .references(() => jobs.id),
    amount: d.integer({ mode: 'number' }).notNull(),
    duration: d.text({ length: 50 }),
    status: d.text({ length: 30 }).default('proposal_sent').notNull(),
    workerAgreed: d.integer({ mode: 'boolean' }).default(false),
    clientAgreed: d.integer({ mode: 'boolean' }).default(false),
    agreedAt: d.integer({ mode: 'timestamp' }),
    deliveredAt: d.integer({ mode: 'timestamp' }),
    deliverableFiles: d.text(), // JSON array of file URLs
    deliverableText: d.text(),
    revisionNote: d.text(),
    createdAt: d
      .integer({ mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: 'timestamp' }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index('contracts_application_id_idx').on(t.applicationId),
    index('contracts_worker_id_idx').on(t.workerId),
    index('contracts_client_id_idx').on(t.clientId),
    index('contracts_job_id_idx').on(t.jobId),
    index('contracts_status_idx').on(t.status),
  ],
);

export const contractsRelations = relations(contracts, ({ one, many }) => ({
  application: one(jobApplications, {
    fields: [contracts.applicationId],
    references: [jobApplications.id],
  }),
  worker: one(user, {
    fields: [contracts.workerId],
    references: [user.id],
    relationName: 'contractWorker',
  }),
  client: one(user, {
    fields: [contracts.clientId],
    references: [user.id],
    relationName: 'contractClient',
  }),
  job: one(jobs, { fields: [contracts.jobId], references: [jobs.id] }),
  disputes: many(disputes),
}));

// ─── Disputes (분쟁) ──────────────────────────────────────────────────────

export const disputes = sqliteTable(
  'disputes',
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    contractId: d.text({ length: 255 }).notNull().references(() => contracts.id),
    raisedBy: d.text({ length: 255 }).notNull().references(() => user.id),
    raisedRole: d.text({ length: 10 }).notNull(), // 'worker' | 'client'
    reason: d.text().notNull(),
    evidenceFiles: d.text(), // JSON array of file URLs
    status: d.text({ length: 30 }).default('open').notNull(), // open | reviewing | resolved_buyer | resolved_seller | resolved_split | cancelled
    adminNote: d.text(),
    resolution: d.text({ length: 50 }), // 'refund_full' | 'refund_partial' | 'pay_worker' | 'cancel_dispute'
    refundAmount: d.integer({ mode: 'number' }),
    handledBy: d.text({ length: 255 }).references(() => user.id),
    resolvedAt: d.integer({ mode: 'timestamp' }),
    createdAt: d
      .integer({ mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: 'timestamp' }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index('disputes_contract_id_idx').on(t.contractId),
    index('disputes_status_idx').on(t.status),
    index('disputes_raised_by_idx').on(t.raisedBy),
  ],
);

export const disputesRelations = relations(disputes, ({ one }) => ({
  contract: one(contracts, { fields: [disputes.contractId], references: [contracts.id] }),
  raiser: one(user, {
    fields: [disputes.raisedBy],
    references: [user.id],
    relationName: 'disputeRaiser',
  }),
  handler: one(user, {
    fields: [disputes.handledBy],
    references: [user.id],
    relationName: 'disputeHandler',
  }),
}));

export const servicesRelations = relations(services, ({ one }) => ({
  worker: one(user, { fields: [services.workerId], references: [user.id] }),
  category: one(categories, {
    fields: [services.categoryId],
    references: [categories.id],
  }),
}));

export const certificationsRelations = relations(certifications, ({ one }) => ({
  user: one(user, {
    fields: [certifications.userId],
    references: [user.id],
    relationName: 'certificationOwner',
  }),
  reviewer: one(user, {
    fields: [certifications.reviewedBy],
    references: [user.id],
    relationName: 'certificationReviewer',
  }),
}));