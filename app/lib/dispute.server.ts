import { eq, and, inArray } from 'drizzle-orm';
import { db } from '~/lib/db.server';
import { disputes, contracts, payments, user } from '~/db/schema';

const DISPUTABLE_STATUSES = ['proposal_sent', 'agreed', 'in_progress', 'delivered'] as const;

export type RaiseDisputeInput = {
  contractId: string;
  userId: string;
  reason: string;
  evidenceFiles?: string[];
};

export async function raiseDispute(input: RaiseDisputeInput): Promise<{ disputeId: string }> {
  const { contractId, userId, reason, evidenceFiles } = input;

  const contract = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .get();

  if (!contract) throw new Error('계약을 찾을 수 없습니다.');

  const isParty = contract.workerId === userId || contract.clientId === userId;
  if (!isParty) throw new Error('계약 당사자만 분쟁을 제기할 수 있습니다.');

  if (!(DISPUTABLE_STATUSES as readonly string[]).includes(contract.status)) {
    throw new Error('이미 종결된 계약에는 분쟁을 제기할 수 없습니다.');
  }

  const existing = await db
    .select()
    .from(disputes)
    .where(
      and(
        eq(disputes.contractId, contractId),
        inArray(disputes.status, ['open', 'reviewing']),
      ),
    )
    .get();

  if (existing) throw new Error('이미 진행 중인 분쟁이 있습니다.');

  const raisedRole = contract.workerId === userId ? 'worker' : 'client';

  const disputeId = crypto.randomUUID();

  await db.insert(disputes).values({
    id: disputeId,
    contractId,
    raisedBy: userId,
    raisedRole,
    reason,
    evidenceFiles: evidenceFiles && evidenceFiles.length > 0 ? JSON.stringify(evidenceFiles) : null,
    status: 'open',
  });

  await db
    .update(contracts)
    .set({ status: 'disputed' })
    .where(eq(contracts.id, contractId));

  return { disputeId };
}

export type ResolveDisputeInput = {
  disputeId: string;
  adminId: string;
  resolution: 'refund_full' | 'refund_partial' | 'pay_worker' | 'cancel_dispute';
  refundAmount?: number;
  adminNote?: string;
};

export async function resolveDispute(input: ResolveDisputeInput): Promise<void> {
  const { disputeId, adminId, resolution, refundAmount, adminNote } = input;

  const admin = await db
    .select()
    .from(user)
    .where(eq(user.id, adminId))
    .get();

  if (!admin || admin.role !== 'admin') {
    throw new Error('관리자만 분쟁을 처리할 수 있습니다.');
  }

  const dispute = await db
    .select()
    .from(disputes)
    .where(eq(disputes.id, disputeId))
    .get();

  if (!dispute) throw new Error('분쟁을 찾을 수 없습니다.');

  if (!['open', 'reviewing'].includes(dispute.status)) {
    throw new Error('이미 처리된 분쟁입니다.');
  }

  if (resolution === 'refund_partial' && (refundAmount === undefined || refundAmount <= 0)) {
    throw new Error('부분 환불 금액을 입력해주세요.');
  }

  const now = new Date();

  switch (resolution) {
    case 'refund_full': {
      const payment = await db
        .select()
        .from(payments)
        .where(eq(payments.referenceId, dispute.contractId))
        .get();

      if (payment) {
        // TODO: NicePay cancel API call
        await db
          .update(payments)
          .set({
            status: 'CANCELLED',
            cancelledAt: now,
            cancelReason: 'admin-dispute-refund',
          })
          .where(eq(payments.id, payment.id));
      }

      await db
        .update(contracts)
        .set({ status: 'cancelled' })
        .where(eq(contracts.id, dispute.contractId));

      await db
        .update(disputes)
        .set({
          status: 'resolved_buyer',
          resolution,
          adminNote: adminNote ?? null,
          handledBy: adminId,
          resolvedAt: now,
        })
        .where(eq(disputes.id, disputeId));
      break;
    }

    case 'refund_partial': {
      const payment = await db
        .select()
        .from(payments)
        .where(eq(payments.referenceId, dispute.contractId))
        .get();

      if (payment) {
        // TODO: NicePay cancel API call (partial)
        await db
          .update(payments)
          .set({
            cancelReason: `admin-dispute-partial-refund:${refundAmount}`,
          })
          .where(eq(payments.id, payment.id));
      }

      await db
        .update(contracts)
        .set({ status: 'cancelled' })
        .where(eq(contracts.id, dispute.contractId));

      await db
        .update(disputes)
        .set({
          status: 'resolved_split',
          resolution,
          refundAmount: refundAmount ?? null,
          adminNote: adminNote ?? null,
          handledBy: adminId,
          resolvedAt: now,
        })
        .where(eq(disputes.id, disputeId));
      break;
    }

    case 'pay_worker': {
      await db
        .update(contracts)
        .set({ status: 'confirmed' })
        .where(eq(contracts.id, dispute.contractId));

      await db
        .update(disputes)
        .set({
          status: 'resolved_seller',
          resolution,
          adminNote: adminNote ?? null,
          handledBy: adminId,
          resolvedAt: now,
        })
        .where(eq(disputes.id, disputeId));
      break;
    }

    case 'cancel_dispute': {
      await db
        .update(contracts)
        .set({ status: 'in_progress' })
        .where(eq(contracts.id, dispute.contractId));

      await db
        .update(disputes)
        .set({
          status: 'cancelled',
          resolution,
          adminNote: adminNote ?? null,
          handledBy: adminId,
          resolvedAt: now,
        })
        .where(eq(disputes.id, disputeId));
      break;
    }
  }
}
