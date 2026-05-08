import { type ActionFunctionArgs } from 'react-router';
import { eq } from 'drizzle-orm';
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

  const application = await db
    .select()
    .from(jobApplications)
    .where(eq(jobApplications.jobId, jobId))
    .get();

  if (!application) {
    return Response.json({ success: false, error: 'APPLICATION_NOT_FOUND' }, { status: 404 });
  }

  if (application.workerId !== session.user.id) {
    return Response.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
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
    // Get job to find clientId
    const job = await db.select().from(jobs).where(eq(jobs.id, jobId)).get();
    if (job) {
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
    }
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
