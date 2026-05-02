## ADDED Requirements

### Requirement: Admin can edit user account

The system SHALL allow admin users to modify user email, name, and role through the admin dashboard.

#### Scenario: Admin updates user role

- **WHEN** admin submits a form with \_action='updateUserAccount', userId, name, email, role
- **THEN** the user's name, email, and role are updated in the database
- **AND** the admin is redirected back to the admin dashboard

#### Scenario: Admin attempts to edit without permission

- **WHEN** a non-admin user submits the updateUserAccount action
- **THEN** they are redirected to /dashboard

### Requirement: Admin can soft-delete users

The system SHALL allow admin users to soft-delete user accounts by setting the user's status to 'deleted'.

#### Scenario: Admin soft-deletes a user

- **WHEN** admin submits a form with \_action='softDeleteUser' and userId
- **THEN** the user's status is set to 'deleted'
- **AND** the user is displayed with a '삭제됨' label in the user list

#### Scenario: Admin cannot delete other admins

- **WHEN** admin attempts to soft-delete a user with role='admin'
- **THEN** the action is rejected and an error message is shown

### Requirement: Admin can restore deleted users

The system SHALL allow admin users to restore soft-deleted users by setting the user's status back to 'active'.

#### Scenario: Admin restores a deleted user

- **WHEN** admin submits a form with \_action='restoreUser' and userId
- **THEN** the user's status is set back to 'active'
- **AND** the '삭제됨' label is removed

### Requirement: Admin can soft-delete jobs

The system SHALL allow admin users to soft-delete any job posting.

#### Scenario: Admin soft-deletes a job

- **WHEN** admin submits a form with \_action='softDeleteJob' and jobId
- **THEN** the job's status is set to 'deleted'
- **AND** the job is displayed with a '삭제됨' label in the job list

### Requirement: Admin can restore deleted jobs

The system SHALL allow admin users to restore soft-deleted jobs.

#### Scenario: Admin restores a deleted job

- **WHEN** admin submits a form with \_action='restoreJob' and jobId
- **THEN** the job's status is set back to 'open'
- **AND** the '삭제됨' label is removed

### Requirement: Admin can soft-delete courses

The system SHALL allow admin users to soft-delete any course.

#### Scenario: Admin soft-deletes a course

- **WHEN** admin submits a form with \_action='softDeleteCourse' and courseId
- **THEN** the course's status is set to 'deleted'
- **AND** the course is displayed with a '삭제됨' label in the course list

### Requirement: Admin can restore deleted courses

The system SHALL allow admin users to restore soft-deleted courses.

#### Scenario: Admin restores a deleted course

- **WHEN** admin submits a form with \_action='restoreCourse' and courseId
- **THEN** the course's status is set back to 'draft'
- **AND** the '삭제됨' label is removed

### Requirement: Admin can trigger password reset

The system SHALL provide a link to the better-auth forgot-password page for each user in the admin dashboard.

#### Scenario: Admin clicks password reset link

- **WHEN** admin clicks the password reset button for a user
- **THEN** the browser navigates to /forgot-password with the user's email pre-filled
