import { type ActionFunctionArgs } from 'react-router';
import { eq, sql } from 'drizzle-orm';
import { db } from '~/lib/db.server';
import { payments, enrollments, courses } from '~/db/schema';
import { auth } from '~/lib/auth.server';
import { confirmPayment } from '~/lib/tosspayments.server';

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== 'POST') {
    return Response.json({ success: false, error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return Response.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
  }

  let body: { paymentKey?: string; orderId?: string; amount?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: 'INVALID_BODY' }, { status: 400 });
  }

  const { paymentKey, orderId, amount } = body;
  if (!paymentKey || !orderId || amount === undefined) {
    return Response.json({ success: false, error: 'MISSING_FIELDS' }, { status: 400 });
  }

  const payment = await db.select().from(payments).where(eq(payments.orderId, orderId)).get();

  if (!payment) {
    return Response.json({ success: false, error: 'PAYMENT_NOT_FOUND' }, { status: 404 });
  }

  if (payment.status === 'DONE') {
    const existingEnrollment = await db.select().from(enrollments).where(eq(enrollments.userId, session.user.id)).get();
    return Response.json({
      success: true,
      enrollmentId: existingEnrollment?.id,
      message: 'Payment already confirmed',
    });
  }

  if (payment.amount !== amount) {
    return Response.json({ success: false, error: 'AMOUNT_MISMATCH' }, { status: 400 });
  }

  const confirmResult = await confirmPayment(paymentKey, orderId, amount);

  if (!confirmResult.success) {
    await db
      .update(payments)
      .set({ status: 'FAILED' })
      .where(eq(payments.id, payment.id));

    return Response.json({
      success: false,
      error: 'PAYMENT_CONFIRM_FAILED',
      message: confirmResult.error.message,
    });
  }

  await db
    .update(payments)
    .set({
      status: 'DONE',
      paymentKey: confirmResult.data.paymentKey,
      tossPaymentMethod: confirmResult.data.method,
      approvedAt: new Date(confirmResult.data.approvedAt),
    })
    .where(eq(payments.id, payment.id));

  await db.insert(enrollments).values({
    userId: session.user.id,
    courseId: payment.referenceId!,
    progress: 0,
  });

  await db
    .update(courses)
    .set({ enrollmentCount: sql`${courses.enrollmentCount} + 1` })
    .where(eq(courses.id, payment.referenceId!));

  const newEnrollment = await db.select().from(enrollments).where(eq(enrollments.userId, session.user.id)).get();

  return Response.json({ success: true, enrollmentId: newEnrollment?.id });
};
