import { type ActionFunctionArgs } from 'react-router';
import { eq } from 'drizzle-orm';
import { db } from '~/lib/db.server';
import { contracts, payments, messages } from '~/db/schema';
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

  // Can only confirm when contract is in delivered status
  if (contract.status !== 'delivered') {
    return Response.json({
      success: false,
      error: 'INVALID_STATUS',
      message: 'Can only confirm when contract is in delivered status',
    }, { status: 400 });
  }

  const now = new Date();
  await db
    .update(contracts)
    .set({ status: 'completed', updatedAt: now })
    .where(eq(contracts.id, id));

  // Update linked payment to escrow_released
  const payment = await db
    .select()
    .from(payments)
    .where(eq(payments.referenceId, id))
    .get();

  if (payment) {
    await db
      .update(payments)
      .set({
        status: 'escrow_released',
        escrowReleasedAt: now,
        updatedAt: now,
      })
      .where(eq(payments.id, payment.id));
  }

  // Send system message to worker
  await db.insert(messages).values({
    senderId: contract.clientId,
    receiverId: contract.workerId,
    jobId: contract.jobId,
    content: '의뢰자가 결과물을 컨펌했습니다. 에스크로가 해제되었습니다.',
    type: 'system',
    metadata: JSON.stringify({ contractId: id, event: 'deliverables_confirmed', paymentId: payment?.id }),
  }).run();

  const updatedContract = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, id))
    .get();

  return Response.json({
    success: true,
    data: updatedContract,
    paymentId: payment?.id,
  });
};