import { type LoaderFunctionArgs } from 'react-router';
import { eq } from 'drizzle-orm';
import { db } from '~/lib/db.server';
import { contracts } from '~/db/schema';
import { auth } from '~/lib/auth.server';
import { autoReleaseEscrowIfNeeded } from '~/lib/escrow.server';

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return Response.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return Response.json({ success: false, error: 'MISSING_ID' }, { status: 400 });
  }

  const fullContract = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, id))
    .get();

  if (!fullContract) {
    return Response.json({ success: false, error: 'CONTRACT_NOT_FOUND' }, { status: 404 });
  }

  const userId = session.user.id;
  if (fullContract.workerId !== userId && fullContract.clientId !== userId) {
    return Response.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
  }

  // Run idempotent auto-release on every status poll so the 7-day timer
  // resolves without requiring a separate cron.
  const released = await autoReleaseEscrowIfNeeded(id);
  const effectiveStatus = released ? 'completed' : fullContract.status;

  return Response.json({
    success: true,
    data: {
      status: effectiveStatus,
      workerAgreed: Boolean(fullContract.workerAgreed),
      clientAgreed: Boolean(fullContract.clientAgreed),
      deliveredAt: fullContract.deliveredAt,
      agreedAt: fullContract.agreedAt,
    },
    autoReleased: released,
  });
};