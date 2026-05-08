import { type ActionFunctionArgs } from 'react-router';
import { eq } from 'drizzle-orm';
import { db } from '~/lib/db.server';
import { contracts, messages } from '~/db/schema';
import { auth } from '~/lib/auth.server';

export const action = async ({ request, params }: ActionFunctionArgs) => {
  if (request.method !== 'POST') {
    return Response.json({ success: false, error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return Response.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return Response.json({ success: false, error: 'MISSING_ID' }, { status: 400 });
  }

  const contract = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, id))
    .get();

  if (!contract) {
    return Response.json({ success: false, error: 'CONTRACT_NOT_FOUND' }, { status: 404 });
  }

  const userId = session.user.id;
  if (contract.clientId !== userId) {
    return Response.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
  }

  // Can only reject when contract is in delivered status
  if (contract.status !== 'delivered') {
    return Response.json({
      success: false,
      error: 'INVALID_STATUS',
      message: 'Can only reject when contract is in delivered status',
    }, { status: 400 });
  }

  let body: { note?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: 'INVALID_BODY' }, { status: 400 });
  }

  const { note = '' } = body;

  const now = new Date();
  await db
    .update(contracts)
    .set({
      status: 'revision_requested',
      revisionNote: note,
      updatedAt: now,
    })
    .where(eq(contracts.id, id));

  // Send system message to worker with rejection reason
  await db.insert(messages).values({
    senderId: contract.clientId,
    receiverId: contract.workerId,
    jobId: contract.jobId,
    content: note ? `의뢰자가 결과물을 거부하고 재작업을 요청했습니다. 사유: ${note}` : '의뢰자가 결과물을 거부하고 재작업을 요청했습니다.',
    type: 'system',
    metadata: JSON.stringify({ contractId: id, event: 'deliverables_rejected', note }),
  }).run();

  const updatedContract = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, id))
    .get();

  return Response.json({ success: true, data: updatedContract });
};