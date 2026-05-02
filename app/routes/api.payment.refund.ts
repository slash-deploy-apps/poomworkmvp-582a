import { type ActionFunctionArgs } from 'react-router';
import { eq, sql } from 'drizzle-orm';
import { db } from '~/lib/db.server';
import { payments, enrollments, courses } from '~/db/schema';
import { auth } from '~/lib/auth.server';
import { cancelPayment } from '~/lib/tosspayments.server';

export const action = async ({ request }: ActionFunctionArgs) => {
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

  if (session.user.role !== 'admin') {
    return Response.json(
      { success: false, error: 'FORBIDDEN' },
      { status: 403 },
    );
  }

  let body: { paymentId?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: 'INVALID_BODY' },
      { status: 400 },
    );
  }

  const { paymentId, reason } = body;
  if (!paymentId || !reason) {
    return Response.json(
      { success: false, error: 'MISSING_FIELDS' },
      { status: 400 },
    );
  }

  const payment = await db.select().from(payments).where(eq(payments.id, paymentId)).get();

  if (!payment) {
    return Response.json(
      { success: false, error: 'PAYMENT_NOT_FOUND' },
      { status: 404 },
    );
  }

  if (payment.status !== 'DONE') {
    return Response.json(
      { success: false, error: 'PAYMENT_NOT_COMPLETED' },
      { status: 400 },
    );
  }

  if (!payment.paymentKey) {
    return Response.json(
      { success: false, error: 'PAYMENT_KEY_MISSING' },
      { status: 400 },
    );
  }

  const enrollment = await db.select().from(enrollments).where(eq(enrollments.userId, payment.payerId)).get();

  if (enrollment && enrollment.progress >= 0.5) {
    return Response.json(
      {
        success: false,
        error: 'REFUND_BLOCKED_HIGH_PROGRESS',
        message: '수강률이 50%를 초과하여 환불이 불가능합니다',
      },
      { status: 400 },
    );
  }

  const cancelResult = await cancelPayment(payment.paymentKey, reason);

  if (!cancelResult.success) {
    return Response.json({
      success: false,
      error: 'CANCEL_FAILED',
      message: cancelResult.error.message,
    });
  }

  await db
    .update(payments)
    .set({
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelReason: reason,
    })
    .where(eq(payments.id, payment.id));

  if (enrollment) {
    await db.delete(enrollments).where(eq(enrollments.id, enrollment.id));
  }

  await db
    .update(courses)
    .set({ enrollmentCount: sql`${courses.enrollmentCount} - 1` })
    .where(eq(courses.id, payment.referenceId!));

  return Response.json({ success: true });
};
