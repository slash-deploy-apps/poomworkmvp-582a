import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/_index.tsx'),
  route('api/auth/*', 'routes/api.auth.$.ts'),
  route('api/uploadthing', 'routes/api.uploadthing.ts'),
  route('api/upload', 'routes/api.upload.ts'),


  // Auth
  route('login', 'routes/login.tsx'),
  route('register', 'routes/register.tsx'),
  route('logout', 'routes/logout.tsx'),

  // Jobs (일거리)
  route('jobs', 'routes/jobs.tsx'),
  route('jobs/new', 'routes/jobs-new.tsx'),
  route('jobs/:jobId', 'routes/jobs-detail.tsx'),
  route('jobs/:jobId/edit', 'routes/jobs-edit.tsx'),

  // Workers (인력)
  route('workers', 'routes/workers.tsx'),
  route('workers/:workerId', 'routes/workers-detail.tsx'),

  // Education (교육)
  route('courses', 'routes/courses.tsx'),
  route('courses/new', 'routes/courses-new.tsx'),
  route('courses/:courseId', 'routes/courses-detail.tsx'),
  route('courses/:courseId/edit', 'routes/courses-edit.tsx'),
  route('courses/:courseId/learn', 'routes/courses-learn.tsx'),
  route('my/courses', 'routes/my-courses.tsx'),

  // Dashboard
  route('dashboard', 'routes/dashboard.tsx'),

  // Profile
  route('profile/edit', 'routes/profile-edit.tsx'),

  // Messages
  route('messages', 'routes/messages.tsx'),

  // Admin
  route('admin', 'routes/admin.tsx'),

  // Payments
  route('payment/success', 'routes/payment.success.tsx'),
  route('payment/fail', 'routes/payment.fail.tsx'),
  route('api/payment/prepare', 'routes/api.payment.prepare.ts'),
  route('api/payment/confirm', 'routes/api.payment.confirm.ts'),
  route('api/payment/refund', 'routes/api.payment.refund.ts'),
] satisfies RouteConfig;
