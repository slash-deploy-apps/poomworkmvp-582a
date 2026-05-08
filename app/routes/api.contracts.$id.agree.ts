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
  const isWorker = contract.workerId === userId;
  const isClient = contract.clientId === userId;

  if (!isWorker && !isClient) {
    return Response.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
  }

  // Can only agree when contract is in proposal_sent status
  if (contract.status !== 'proposal_sent') {
    return Response.json({
      success: false,
      error: 'INVALID_STATUS',
      message: 'Can only agree when contract is in proposal_sent status',
    }, { status: 400 });
  }

  // Cannot agree twice
  if (isWorker && contract.workerAgreed) {
    return Response.json({ success: false, error: 'ALREADY_AGREED' }, { status: 400 });
  }
  if (isClient && contract.clientAgreed) {
    return Response.json({ success: false, error: 'ALREADY_AGREED' }, { status: 400 });
  }

  const now = new Date();
  const updates: Partial<typeof contract> = {
    updatedAt: now,
  };

  if (isWorker) {
    updates.workerAgreed = true;
  }
  if (isClient) {
    updates.clientAgreed = true;
  }

  // Check if both agreed
  const willBeFullyAgreed =
    (isWorker ? true : contract.workerAgreed) &&
    (isClient ? true : contract.clientAgreed);

  if (willBeFullyAgreed) {
    updates.status = 'contract_signed';
    updates.agreedAt = now;
  }

  await db
    .update(contracts)
    .set(updates)
    .where(eq(contracts.id, id));

  // Send system message if contract is fully signed
  if (willBeFullyAgreed) {
    await db.insert(messages).values({
      senderId: contract.workerId,
      receiverId: contract.clientId,
      jobId: contract.jobId,
      content: `계약이 체결되었습니다. 금액: ${contract.amount.toLocaleString()}원`,
      type: 'system',
      metadata: JSON.stringify({ contractId: id, event: 'contract_signed' }),
    }).run();
  }

  const updatedContract = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, id))
    .get();

  return Response.json({
    success: true,
    data: updatedContract,
    bothAgreed: willBeFullyAgreed,
  });
};