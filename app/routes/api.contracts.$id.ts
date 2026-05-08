import { type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '~/lib/db.server';
import { contracts, jobs, user, jobApplications } from '~/db/schema';
import { auth } from '~/lib/auth.server';

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
    .select({
      contract: contracts,
      job: {
        id: jobs.id,
        title: jobs.title,
        description: jobs.description,
        status: jobs.status,
      },
      worker: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
      client: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
      application: {
        id: jobApplications.id,
        coverLetter: jobApplications.coverLetter,
        proposedBudget: jobApplications.proposedBudget,
        proposedDuration: jobApplications.proposedDuration,
      },
    })
    .from(contracts)
    .leftJoin(jobs, eq(contracts.jobId, jobs.id))
    .leftJoin(user, eq(contracts.workerId, user.id))
    .leftJoin(jobApplications, eq(contracts.applicationId, jobApplications.id))
    .where(eq(contracts.id, id))
    .get();

  if (!contract) {
    return Response.json({ success: false, error: 'CONTRACT_NOT_FOUND' }, { status: 404 });
  }

  const userId = session.user.id;
  if (contract.contract.workerId !== userId && contract.contract.clientId !== userId) {
    return Response.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
  }

  // Auto-release check: if status='delivered' and deliveredAt + 7 days < now
  if (contract.contract.status === 'delivered' && contract.contract.deliveredAt) {
    const deliveredAt = new Date(contract.contract.deliveredAt);
    const autoReleaseDate = new Date(deliveredAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (new Date() > autoReleaseDate) {
      await db
        .update(contracts)
        .set({ status: 'completed', updatedAt: new Date() })
        .where(eq(contracts.id, id));

      return Response.json({
        success: true,
        data: {
          ...contract.contract,
          status: 'completed',
          job: contract.job,
          worker: contract.worker,
          client: contract.client,
        },
        autoReleased: true,
      });
    }
  }

  return Response.json({
    success: true,
    data: {
      ...contract.contract,
      job: contract.job,
      worker: contract.worker,
      client: contract.client,
      application: contract.application,
    },
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