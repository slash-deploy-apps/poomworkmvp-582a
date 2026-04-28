import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/_index.tsx'),
  route('api/auth/*', 'routes/api.auth.$.ts'),

  // Auth
  route('login', 'routes/login.tsx'),
  route('register', 'routes/register.tsx'),

  // Jobs (일거리)
  route('jobs', 'routes/jobs.tsx'),
  route('jobs/new', 'routes/jobs-new.tsx'),
  route('jobs/:jobId', 'routes/jobs-detail.tsx'),

  // Workers (인력)
  route('workers', 'routes/workers.tsx'),
  route('workers/:workerId', 'routes/workers-detail.tsx'),

  // Education (교육)
  route('courses', 'routes/courses.tsx'),
  route('courses/:courseId', 'routes/courses-detail.tsx'),
  route('courses/:courseId/learn', 'routes/courses-learn.tsx'),

  // Dashboard
  route('dashboard', 'routes/dashboard.tsx'),

  // Admin
  route('admin', 'routes/admin.tsx'),
] satisfies RouteConfig;
