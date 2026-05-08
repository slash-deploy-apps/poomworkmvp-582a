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
  if (contract.workerId !== userId) {
    return Response.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
  }

  // Can only deliver when contract is in contract_signed or revision_requested status
  if (contract.status !== 'contract_signed' && contract.status !== 'revision_requested') {
    return Response.json({
      success: false,
      error: 'INVALID_STATUS',
      message: 'Can only deliver when contract is in contract_signed or revision_requested status',
    }, { status: 400 });
  }

  let body: { files?: string[]; text?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: 'INVALID_BODY' }, { status: 400 });
  }

  const { files = [], text = '' } = body;
  if (!files.length && !text) {
    return Response.json({ success: false, error: 'MISSING_DELIVERABLES' }, { status: 400 });
  }

  const now = new Date();
  await db
    .update(contracts)
    .set({
      deliverableFiles: JSON.stringify(files),
      deliverableText: text,
      status: 'delivered',
      deliveredAt: now,
      updatedAt: now,
    })
    .where(eq(contracts.id, id));

  // Send system message to client
  await db.insert(messages).values({
    senderId: contract.workerId,
    receiverId: contract.clientId,
    jobId: contract.jobId,
    content: '전문가가 결과물을 전달했습니다.',
    type: 'system',
    metadata: JSON.stringify({ contractId: id, event: 'deliverables_submitted' }),
  }).run();

  const updatedContract = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, id))
    .get();

  return Response.json({ success: true, data: updatedContract });
};