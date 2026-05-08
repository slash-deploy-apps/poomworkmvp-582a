import { type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import { eq, and, or } from 'drizzle-orm';
import { db } from '~/lib/db.server';
import { contracts, jobApplications, jobs, user, payments } from '~/db/schema';
import { auth } from '~/lib/auth.server';

// Auto-release: if delivered > 7 days ago, auto-complete
async function autoReleaseIfNeeded(contractId: string) {
  const contract = await db.query.contracts.findFirst({
    where: eq(contracts.id, contractId),
  });
  if (!contract || contract.status !== 'delivered' || !contract.deliveredAt) return;

  const now = Date.now();
  const deliveredMs = contract.deliveredAt.getTime();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  if (now - deliveredMs > sevenDays) {
    await db.update(contracts)
      .set({ status: 'completed' })
      .where(eq(contracts.id, contractId));

    await db.update(payments)
      .set({
        status: 'escrow_released',
        escrowReleasedAt: new Date(),
      })
      .where(
        and(
          eq(payments.referenceId, contractId),
          eq(payments.status, 'escrow'),
        ),
      );
  }
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return Response.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const url = new URL(request.url);
  const contractId = url.searchParams.get('contractId');

  // If contractId provided, return single contract
  if (contractId) {
    const contract = await db.query.contracts.findFirst({
      where: eq(contracts.id, contractId),
    });

    if (!contract) {
      return Response.json({ success: false, error: 'CONTRACT_NOT_FOUND' }, { status: 404 });
    }

    if (contract.workerId !== session.user.id && contract.clientId !== session.user.id) {
      return Response.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    await autoReleaseIfNeeded(contractId);

    const updatedContract = await db.query.contracts.findFirst({
      where: eq(contracts.id, contractId),
    });

    return Response.json({ success: true, contract: updatedContract });
  }

  // Otherwise return all contracts for this user
  const userId = session.user.id;
  const contractsList = await db
    .select({
      contract: contracts,
      job: {
        id: jobs.id,
        title: jobs.title,
        status: jobs.status,
      },
      worker: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
    })
    .from(contracts)
    .leftJoin(jobs, eq(contracts.jobId, jobs.id))
    .leftJoin(user, eq(contracts.workerId, user.id))
    .where(or(eq(contracts.workerId, userId), eq(contracts.clientId, userId)))
    .orderBy(contracts.createdAt);

  return Response.json({
    success: true,
    data: contractsList.map((row) => ({
      ...row.contract,
      job: row.job,
      worker: row.worker,
    })),
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    if (request.method !== 'POST') {
      return Response.json(
        { success: false, error: 'METHOD_NOT_ALLOWED' },
        { status: 405 },
      );
    }

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return Response.json(
        { success: false, error: 'UNAUTHORIZED' },
        { status: 401 },
      );
    }

    let body: { intent?: string; [key: string]: unknown };
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { success: false, error: 'INVALID_BODY' },
        { status: 400 },
      );
    }

    const { intent } = body;
    if (!intent) {
      return Response.json(
        { success: false, error: 'MISSING_INTENT' },
        { status: 400 },
      );
    }

    switch (intent) {
      case 'create': {
        const { applicationId, amount, duration } = body as {
          applicationId: string;
          amount: number;
          duration?: string;
        };

        if (!applicationId || typeof amount !== 'number') {
          return Response.json(
            { success: false, error: 'MISSING_FIELDS' },
            { status: 400 },
          );
        }

        const application = await db
          .select()
          .from(jobApplications)
          .where(eq(jobApplications.id, applicationId))
          .get();

        if (!application) {
          return Response.json(
            { success: false, error: 'APPLICATION_NOT_FOUND' },
            { status: 404 },
          );
        }

        const jobRecord = await db
          .select()
          .from(jobs)
          .where(eq(jobs.id, application.jobId))
          .get();

        if (!jobRecord) {
          return Response.json(
            { success: false, error: 'JOB_NOT_FOUND' },
            { status: 404 },
          );
        }

        // Only worker can create contract proposal
        if (application.workerId !== session.user.id) {
          return Response.json(
            { success: false, error: 'FORBIDDEN' },
            { status: 403 },
          );
        }

        const existingContract = await db
          .select()
          .from(contracts)
          .where(eq(contracts.applicationId, applicationId))
          .get();

        if (existingContract) {
          return Response.json(
            { success: false, error: 'CONTRACT_ALREADY_EXISTS' },
            { status: 409 },
          );
        }

        const now = new Date();
        const result = await db
          .insert(contracts)
          .values({
            applicationId,
            workerId: application.workerId,
            clientId: jobRecord.clientId,
            jobId: application.jobId,
            amount,
            duration: duration || application.proposedDuration || '',
            status: 'proposal_sent',
            createdAt: now,
          })
          .returning()
          .get();

        await db
          .update(jobApplications)
          .set({ status: 'proposal_sent', updatedAt: now })
          .where(eq(jobApplications.id, applicationId));

        return Response.json({ success: true, contract: result });
      }

      case 'agree': {
        const { contractId } = body as { contractId: string };
        if (!contractId) {
          return Response.json(
            { success: false, error: 'MISSING_CONTRACT_ID' },
            { status: 400 },
          );
        }

        const contract = await db.query.contracts.findFirst({
          where: eq(contracts.id, contractId),
        });

        if (!contract) {
          return Response.json(
            { success: false, error: 'CONTRACT_NOT_FOUND' },
            { status: 404 },
          );
        }

        if (contract.workerId !== session.user.id && contract.clientId !== session.user.id) {
          return Response.json(
            { success: false, error: 'FORBIDDEN' },
            { status: 403 },
          );
        }

        const isWorker = contract.workerId === session.user.id;
        const isClient = contract.clientId === session.user.id;

        const updateData: Record<string, unknown> = {};

        if (isWorker) {
          updateData.workerAgreed = true;
        }
        if (isClient) {
          updateData.clientAgreed = true;
        }

        const bothAgreed = (isWorker ? true : contract.workerAgreed) &&
                           (isClient ? true : contract.clientAgreed);

        if (bothAgreed) {
          updateData.status = 'contract_signed';
          updateData.agreedAt = Math.floor(Date.now() / 1000);
        }

        const updated = await db.update(contracts)
          .set(updateData)
          .where(eq(contracts.id, contractId))
          .returning()
          .get();

        return Response.json({ success: true, contract: updated });
      }

      case 'deliver': {
        const { contractId, deliverableFiles, deliverableText } = body as {
          contractId: string;
          deliverableFiles?: string[];
          deliverableText?: string;
        };

        if (!contractId) {
          return Response.json(
            { success: false, error: 'MISSING_CONTRACT_ID' },
            { status: 400 },
          );
        }

        const contract = await db.query.contracts.findFirst({
          where: eq(contracts.id, contractId),
        });

        if (!contract) {
          return Response.json(
            { success: false, error: 'CONTRACT_NOT_FOUND' },
            { status: 404 },
          );
        }

        // Only worker can deliver
        if (contract.workerId !== session.user.id) {
          return Response.json(
            { success: false, error: 'FORBIDDEN' },
            { status: 403 },
          );
        }

        const updated = await db.update(contracts)
          .set({
            status: 'delivered',
            deliveredAt: new Date(),
            deliverableFiles: JSON.stringify(deliverableFiles ?? []),
            deliverableText: deliverableText ?? null,
          })
          .where(eq(contracts.id, contractId))
          .returning()
          .get();

        return Response.json({ success: true, contract: updated });
      }

      case 'confirm': {
        const { contractId } = body as { contractId: string };
        if (!contractId) {
          return Response.json(
            { success: false, error: 'MISSING_CONTRACT_ID' },
            { status: 400 },
          );
        }

        const contract = await db.query.contracts.findFirst({
          where: eq(contracts.id, contractId),
        });

        if (!contract) {
          return Response.json(
            { success: false, error: 'CONTRACT_NOT_FOUND' },
            { status: 404 },
          );
        }

        // Only client can confirm
        if (contract.clientId !== session.user.id) {
          return Response.json(
            { success: false, error: 'FORBIDDEN' },
            { status: 403 },
          );
        }

        const updated = await db.update(contracts)
          .set({ status: 'completed' })
          .where(eq(contracts.id, contractId))
          .returning()
          .get();

        // Release escrow payment
        await db.update(payments)
          .set({
            status: 'escrow_released',
            escrowReleasedAt: new Date(),
          })
          .where(
            and(
              eq(payments.referenceId, contractId),
              eq(payments.status, 'escrow'),
            ),
          );

        return Response.json({ success: true, contract: updated });
      }

      case 'reject': {
        const { contractId, revisionNote } = body as {
          contractId: string;
          revisionNote?: string;
        };
        if (!contractId) {
          return Response.json(
            { success: false, error: 'MISSING_CONTRACT_ID' },
            { status: 400 },
          );
        }

        const contract = await db.query.contracts.findFirst({
          where: eq(contracts.id, contractId),
        });

        if (!contract) {
          return Response.json(
            { success: false, error: 'CONTRACT_NOT_FOUND' },
            { status: 404 },
          );
        }

        // Only client can reject
        if (contract.clientId !== session.user.id) {
          return Response.json(
            { success: false, error: 'FORBIDDEN' },
            { status: 403 },
          );
        }

        const updated = await db.update(contracts)
          .set({
            status: 'revision_requested',
            revisionNote: revisionNote ?? null,
          })
          .where(eq(contracts.id, contractId))
          .returning()
          .get();

        return Response.json({ success: true, contract: updated });
      }

      default:
        return Response.json(
          { success: false, error: 'UNKNOWN_INTENT' },
          { status: 400 },
        );
    }
  } catch (err) {
    console.error('Contract API error:', err);
    return Response.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
};

