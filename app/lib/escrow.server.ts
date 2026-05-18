import { and, eq } from 'drizzle-orm';
import { db } from '~/lib/db.server';
import { contracts, payments, messages } from '~/db/schema';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * If a contract is in `delivered` status and 7 days have passed since
 * `deliveredAt`, auto-complete the contract and release the linked escrow
 * payment.
 *
 * Safe to call multiple times — only acts when the elapsed-time and status
 * conditions are met.
 *
 * Returns `true` if an auto-release was performed, `false` otherwise.
 */
export async function autoReleaseEscrowIfNeeded(
  contractId: string,
): Promise<boolean> {
  const contract = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .get();

  if (!contract) return false;
  if (contract.status !== 'delivered') return false;
  if (!contract.deliveredAt) return false;

  const deliveredMs =
    contract.deliveredAt instanceof Date
      ? contract.deliveredAt.getTime()
      : new Date(contract.deliveredAt as unknown as string | number).getTime();

  if (Date.now() - deliveredMs <= SEVEN_DAYS_MS) return false;

  const now = new Date();

  await db
    .update(contracts)
    .set({ status: 'completed', updatedAt: now })
    .where(eq(contracts.id, contractId));

  await db
    .update(payments)
    .set({
      status: 'escrow_released',
      escrowReleasedAt: now,
      updatedAt: now,
    })
    .where(
      and(eq(payments.referenceId, contractId), eq(payments.status, 'escrow')),
    );

  // System message: notify both parties of auto-release.
  await db.insert(messages).values({
    senderId: contract.workerId,
    receiverId: contract.clientId,
    jobId: contract.jobId,
    content: '의뢰자가 7일간 응답하지 않아 에스크로가 자동으로 해제되었습니다.',
    type: 'system',
    metadata: JSON.stringify({ contractId, event: 'escrow_auto_released' }),
  });

  return true;
}
