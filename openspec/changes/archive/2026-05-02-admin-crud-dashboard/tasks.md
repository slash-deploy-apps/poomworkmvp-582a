## 1. Setup & Foundation

- [x] 1.1 Create admin account via seed script (admin@poomwork.com / 1234) using better-auth signUpEmail API
- [x] 1.2 Add soft delete filter to public job listings (/jobs, /jobs-detail loaders)
- [x] 1.3 Add soft delete filter to public course listings (/courses, /courses-detail loaders)
- [x] 1.4 Update dashboard loader to include user's own jobs and courses with status='deleted'

## 2. Admin Dashboard CRUD (/admin)

- [x] 2.1 Add user account edit form (name, email, role) to admin users tab
- [x] 2.2 Add soft delete user action handler in admin.tsx action
- [x] 2.3 Add restore user action handler in admin.tsx action
- [x] 2.4 Add soft delete job action handler in admin.tsx action
- [x] 2.5 Add restore job action handler in admin.tsx action
- [x] 2.6 Add soft delete course action handler in admin.tsx action
- [x] 2.7 Add restore course action handler in admin.tsx action
- [x] 2.8 Add '삭제됨' badge and restore button to user/job/course rows in admin tables
- [x] 2.9 Add forgot-password link button for each user in admin users tab
- [x] 2.10 Prevent admin from deleting other admin accounts (disable button + error)

## 3. User Self-Management (/dashboard)

- [x] 3.1 Add job edit button and delete button to client's job cards in dashboard
- [x] 3.2 Create /jobs/:id/edit route with full job edit form
- [x] 3.3 Add job edit action handler (authorization: clientId === session.user.id)
- [x] 3.4 Add course edit button and delete button to instructor's course cards in dashboard/my-courses
- [x] 3.5 Create /courses/:id/edit route with full course edit form
- [x] 3.6 Add course edit action handler (authorization: instructorId === session.user.id)

## 4. Soft Delete Confirmation

- [x] 4.1 Add confirmation dialog before soft delete in admin dashboard
- [x] 4.2 Add confirmation dialog before soft delete in user dashboard
- [x] 4.3 Display deleted item count/warning in confirmation (e.g., 'N개의 지원서가 있습니다')

## 5. Verification

- [x] 5.1 Run pnpm typecheck and fix type errors
- [x] 5.2 Run pnpm build and verify successful build
- [x] 5.3 Verify admin@poomwork.com can login with password 1234
- [x] 5.4 Verify admin can edit user role, soft-delete and restore users/jobs/courses
- [x] 5.5 Verify client can edit and soft-delete their own jobs
- [x] 5.6 Verify instructor can edit and soft-delete their own courses
- [x] 5.7 Verify deleted jobs/courses are hidden from public listings
- [x] 5.8 Verify deleted items show '삭제됨' label in admin dashboard with restore button
