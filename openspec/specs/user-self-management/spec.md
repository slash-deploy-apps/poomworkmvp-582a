## ADDED Requirements

### Requirement: Client can edit their own jobs

The system SHALL allow clients to edit job postings they created through their dashboard.

#### Scenario: Client updates their job

- **WHEN** client navigates to /jobs/:id/edit for a job they created
- **THEN** a form is displayed pre-filled with the job's current data
- **AND** client can modify title, description, budgetMin, budgetMax, budgetType, status, urgency, requirements, tags, location, isRemote
- **AND** upon submission, the job is updated in the database

#### Scenario: Client attempts to edit another user's job

- **WHEN** client navigates to /jobs/:id/edit for a job they did not create
- **THEN** they are redirected to /dashboard with an error message

### Requirement: Client can soft-delete their own jobs

The system SHALL allow clients to soft-delete job postings they created.

#### Scenario: Client soft-deletes their job

- **WHEN** client clicks delete on their job in the dashboard
- **THEN** a confirmation dialog appears
- **AND** upon confirmation, the job's status is set to 'deleted'

### Requirement: Instructor can edit their own courses

The system SHALL allow instructors to edit courses they created through their dashboard.

#### Scenario: Instructor updates their course

- **WHEN** instructor navigates to /courses/:id/edit for a course they created
- **THEN** a form is displayed pre-filled with the course's current data
- **AND** instructor can modify title, description, price, status, level, categoryId, duration, tags, thumbnailUrl
- **AND** upon submission, the course is updated in the database

#### Scenario: Instructor attempts to edit another user's course

- **WHEN** instructor navigates to /courses/:id/edit for a course they did not create
- **THEN** they are redirected to /dashboard with an error message

### Requirement: Instructor can soft-delete their own courses

The system SHALL allow instructors to soft-delete courses they created.

#### Scenario: Instructor soft-deletes their course

- **WHEN** instructor clicks delete on their course in the dashboard
- **THEN** a confirmation dialog appears
- **AND** upon confirmation, the course's status is set to 'deleted'

### Requirement: Public listings exclude deleted items

The system SHALL exclude soft-deleted jobs and courses from public listings.

#### Scenario: User views job listings

- **WHEN** any user visits /jobs
- **THEN** jobs with status='deleted' are not displayed

#### Scenario: User views course listings

- **WHEN** any user visits /courses
- **THEN** courses with status='deleted' are not displayed
