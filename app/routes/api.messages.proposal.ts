import { type ActionFunctionArgs } from 'react-router';
import { and, eq } from 'drizzle-orm';
import { db } from '~/lib/db.server';
import { messages, jobApplications, contracts, jobs } from '~/db/schema';
import { auth } from '~/lib/auth.server';

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== 'POST') {
    return Response.json({ success: false, error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return Response.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
  }

  let body: {
    jobId?: string;
    receiverId?: string;
    amount?: number;
    duration?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: 'INVALID_BODY' }, { status: 400 });
  }

  const { jobId, receiverId, amount, duration } = body;

  if (!jobId || !receiverId || amount == null) {
    return Response.json({ success: false, error: 'MISSING_FIELDS' }, { status: 400 });
  }

  // Verify the receiver is the job's client and the sender is a worker (not the client).
  const job = await db.select().from(jobs).where(eq(jobs.id, jobId)).get();
  if (!job) {
    return Response.json({ success: false, error: 'JOB_NOT_FOUND' }, { status: 404 });
  }
  if (job.clientId === session.user.id) {
    return Response.json(
      { success: false, error: 'CLIENT_CANNOT_PROPOSE', message: '의뢰자는 자신의 일거리에 제안할 수 없습니다.' },
      { status: 403 },
    );
  }
  if (job.clientId !== receiverId) {
    return Response.json(
      { success: false, error: 'RECEIVER_NOT_JOB_CLIENT', message: '수신자가 이 일거리의 의뢰자와 일치하지 않습니다.' },
      { status: 400 },
    );
  }

  // Find or create an application for this worker+job pair.
  let application = await db
    .select()
    .from(jobApplications)
    .where(
      and(
        eq(jobApplications.jobId, jobId),
        eq(jobApplications.workerId, session.user.id),
      ),
    )
    .get();

  if (!application) {
    application = await db
      .insert(jobApplications)
      .values({
        jobId,
        workerId: session.user.id,
        coverLetter: '',
        proposedBudget: amount,
        proposedDuration: duration ?? null,
        status: 'proposal_sent',
      })
      .returning()
      .get();
  }

  const metadata = JSON.stringify({
    amount,
    duration: duration ?? null,
    proposalStatus: 'pending',
  });

  const content = `금액 제안: ${amount.toLocaleString()}원${duration ? `, 예상 기간: ${duration}` : ''}`;

  const newMessage = await db
    .insert(messages)
    .values({
      senderId: session.user.id,
      receiverId,
      jobId,
      content,
      type: 'proposal',
      metadata,
    })
    .returning()
    .get();

  // Create or link contract for this application
  const existingContract = await db
    .select()
    .from(contracts)
    .where(eq(contracts.applicationId, application.id))
    .get();

  let contract = existingContract;
  if (!existingContract) {
    contract = await db
      .insert(contracts)
      .values({
        applicationId: application.id,
        workerId: application.workerId,
        clientId: job.clientId,
        jobId,
        amount,
        duration: duration || '',
        status: 'proposal_sent',
      })
      .returning()
      .get();
  } else {
    // Update existing contract with new proposal amount/duration
    contract = await db
      .update(contracts)
      .set({ amount, duration: duration || '', status: 'proposal_sent', updatedAt: new Date() })
      .where(eq(contracts.id, existingContract.id))
      .returning()
      .get();
  }

  await db
    .update(jobApplications)
    .set({ status: 'proposal_sent' })
    .where(eq(jobApplications.id, application.id));

  return Response.json({ success: true, message: newMessage, contract });
};
