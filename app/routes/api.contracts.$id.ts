import { type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import { eq } from 'drizzle-orm';
import { db } from '~/lib/db.server';
import { contracts, jobs, user, jobApplications } from '~/db/schema';
import { auth } from '~/lib/auth.server';
import { autoReleaseEscrowIfNeeded } from '~/lib/escrow.server';

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  proposal_sent: ['contract_signed', 'cancelled'],
  contract_signed: ['in_progress', 'cancelled'],
  in_progress: ['delivered', 'cancelled'],
  delivered: ['completed', 'revision_requested'],
  revision_requested: ['delivered', 'cancelled'],
  completed: [],
  cancelled: [],
};

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
    .select()
    .from(contracts)
    .where(eq(contracts.id, id))
    .get();

  if (!contract) {
    return Response.json({ success: false, error: 'CONTRACT_NOT_FOUND' }, { status: 404 });
  }

  const userId = session.user.id;
  if (contract.workerId !== userId && contract.clientId !== userId) {
    return Response.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
  }

  // Auto-release check (idempotent): completes contract + releases escrow if 7 days passed.
  const released = await autoReleaseEscrowIfNeeded(id);

  // After auto-release, re-read contract to pick up new status / updatedAt.
  const fresh = released
    ? await db.select().from(contracts).where(eq(contracts.id, id)).get()
    : contract;

  const [job, workerInfo, clientInfo, application] = await Promise.all([
    db.select().from(jobs).where(eq(jobs.id, contract.jobId)).get(),
    db
      .select({ id: user.id, name: user.name, email: user.email, image: user.image })
      .from(user)
      .where(eq(user.id, contract.workerId))
      .get(),
    db
      .select({ id: user.id, name: user.name, email: user.email, image: user.image })
      .from(user)
      .where(eq(user.id, contract.clientId))
      .get(),
    db
      .select()
      .from(jobApplications)
      .where(eq(jobApplications.id, contract.applicationId))
      .get(),
  ]);

  return Response.json({
    success: true,
    data: {
      ...fresh,
      job,
      worker: workerInfo,
      client: clientInfo,
      application,
    },
    autoReleased: released,
  });
};

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
  if (contract.workerId !== userId && contract.clientId !== userId) {
    return Response.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
  }

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: 'INVALID_BODY' }, { status: 400 });
  }

  const { status: newStatus } = body;
  if (!newStatus) {
    return Response.json({ success: false, error: 'MISSING_STATUS' }, { status: 400 });
  }

  const validTransitions = VALID_TRANSITIONS[contract.status] || [];
  if (!validTransitions.includes(newStatus)) {
    return Response.json({
      success: false,
      error: 'INVALID_STATUS_TRANSITION',
      message: `Cannot transition from '${contract.status}' to '${newStatus}'`,
    }, { status: 400 });
  }

  const now = new Date();
  await db
    .update(contracts)
    .set({ status: newStatus, updatedAt: now })
    .where(eq(contracts.id, id));

  const updatedContract = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, id))
    .get();

  return Response.json({ success: true, data: updatedContract });
};