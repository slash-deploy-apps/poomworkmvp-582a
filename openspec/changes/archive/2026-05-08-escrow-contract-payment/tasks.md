## 1. Database Schema & Migration

- [x] 1.1 Create `contracts` table with fields: id, applicationId, workerId, clientId, jobId, amount, duration, status, workerAgreed, clientAgreed, agreedAt, deliveredAt, deliverableFiles (JSON), deliverableText, revisionNote, createdAt, updatedAt
- [x] 1.2 Add `type` (`'text'|'proposal'|'system'`) and `metadata` (JSON) columns to `messages` table
- [x] 1.3 Expand `jobApplications.status` enum to include: `proposal_sent`, `contract_pending`, `contract_signed`, `paid`, `in_progress`, `delivered`, `completed`, `revision_requested`
- [x] 1.4 Ensure `payments` table supports `escrow` and `escrow_released` statuses and `escrowReleasedAt` is functional
- [x] 1.5 Run Drizzle migration and verify schema in SQLite

## 2. API Routes & Server Logic

- [x] 2.1 Create `app/routes/api.contracts.ts` or individual contract API routes: create, get, update status, agree, submit deliverable, confirm, reject
- [x] 2.2 Implement contract creation endpoint when proposal is accepted
- [x] 2.3 Implement agreement endpoints: `POST /api/contracts/:id/agree` (sets workerAgreed or clientAgreed based on current user)
- [x] 2.4 Implement polling endpoint `GET /api/contracts/:id/status` returning both agreement flags
- [x] 2.5 Implement deliverable submission endpoint with UploadThing integration
- [x] 2.6 Implement confirm/reject endpoints with status transitions and escrow logic
- [x] 2.7 Implement 7-day auto-release check logic in contract status query
- [x] 2.8 Implement proposal message creation endpoint `POST /api/messages/proposal`

## 3. Chat & Proposal UI

- [x] 3.1 Update `app/routes/messages.tsx` to render `type='proposal'` messages as proposal cards with amount, duration, status badge
- [x] 3.2 Add "Accept" / "Reject" buttons on proposal cards (visible only to client)
- [x] 3.3 Add "Propose Amount" button in chat input area with modal/form for amount and duration
- [x] 3.4 Render `type='system'` messages as centered notification bubbles
- [x] 3.5 Update message send action to support `type` and `metadata` fields

## 4. Contract Agreement Page

- [x] 4.1 Create `app/routes/contracts.$contractId.agree.tsx` route with loader for contract details
- [x] 4.2 Build agreement UI showing contract summary (job info, amount, duration)
- [x] 4.3 Add checkbox + confirm button for current user's agreement
- [x] 4.4 Implement 3-second polling (`useEffect` + `setInterval`) to show peer's agreement status
- [x] 4.5 Auto-transition to payment button when both parties agree (client only)

## 5. Payment Integration (Escrow Flow)

- [x] 5.1 Update NicePay prepare/confirm flow to set `payments.status = 'escrow'` on success
- [x] 5.2 Link payment `referenceId` to `contractId`
- [x] 5.3 On payment success, update contract status to `paid` then `in_progress`
- [x] 5.4 Show "Start Work" banner on worker dashboard and chat when contract is `in_progress`

## 6. Deliverable Submission & Confirmation

- [x] 6.1 Create `app/routes/contracts.$contractId.deliver.tsx` for worker to upload deliverables
- [x] 6.2 Build file upload (UploadThing) + text/link input form
- [x] 6.3 On submit, update contract to `delivered` with `deliveredAt` timestamp
- [x] 6.4 Create `app/routes/contracts.$contractId.confirm.tsx` for client to review deliverables
- [x] 6.5 Show uploaded files and description with "Confirm" / "Reject & Request Revision" buttons
- [x] 6.6 On confirm, trigger escrow release (update payment status to `escrow_released`)
- [x] 6.7 On reject, update contract to `revision_requested` with note, notify worker
- [x] 6.8 Implement 7-day auto-release check on contract status endpoints

## 7. Dashboard & Status Updates

- [x] 7.1 Update `app/routes/dashboard.tsx` to show contract status badges and actions for workers and clients
- [x] 7.2 Update `app/routes/jobs-detail.tsx` to link to active contract if exists
- [x] 7.3 Show payment/escrow status in dashboard payment history

## 8. Routes Configuration

- [x] 8.1 Add new routes to `app/routes.ts`: contracts agreement, deliver, confirm pages
- [x] 8.2 Add API routes for contracts and proposal messages

## 9. Testing & Verification

- [x] 9.1 Verify build passes (`pnpm run build`)
- [ ] 9.2 Verify TypeScript types are clean
- [ ] 9.3 Test complete flow: propose → accept → agree → pay → deliver → confirm → release
- [ ] 9.4 Test rejection and re-proposal flow
- [ ] 9.5 Test 7-day auto-release logic (mock deliveredAt)
