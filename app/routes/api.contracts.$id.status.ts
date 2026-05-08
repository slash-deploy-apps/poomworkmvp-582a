import { type LoaderFunctionArgs } from 'react-router';
import { eq } from 'drizzle-orm';
import { db } from '~/lib/db.server';
import { contracts } from '~/db/schema';
import { auth } from '~/lib/auth.server';

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return Response.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return Response.json({ success: false, error: 'MISSING_ID' }, { status: 400 });
  }

  const contract = await db
    .select({
      status: contracts.status,
      workerAgreed: contracts.workerAgreed,
      clientAgreed: contracts.clientAgreed,
      deliveredAt: contracts.deliveredAt,
      agreedAt: contracts.agreedAt,
    })
    .from(contracts)
    .where(eq(contracts.id, id))
    .get();

  if (!contract) {
    return Response.json({ success: false, error: 'CONTRACT_NOT_FOUND' }, { status: 404 });
  }

  const userId = session.user.id;
  const fullContract = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, id))
    .get();

  if (!fullContract) {
    return Response.json({ success: false, error: 'CONTRACT_NOT_FOUND' }, { status: 404 });
  }

  if (fullContract.workerId !== userId && fullContract.clientId !== userId) {
    return Response.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
  }

  return Response.json({
    success: true,
    data: {
      status: contract.status,
      workerAgreed: Boolean(contract.workerAgreed),
      clientAgreed: Boolean(contract.clientAgreed),
      deliveredAt: contract.deliveredAt,
      agreedAt: contract.agreedAt,
    },
  });
};