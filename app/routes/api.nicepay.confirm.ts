import { type ActionFunctionArgs } from 'react-router';
import { eq, sql } from 'drizzle-orm';
import { db } from '~/lib/db.server';
import { payments, enrollments, courses } from '~/db/schema';
import { auth } from '~/lib/auth.server';
import { getTransaction, verifySignature } from '~/lib/nicepay.server';

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

  let body: { sessionId?: string; orderId?: string; amount?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: 'INVALID_BODY' },
      { status: 400 },
    );
  }

  const { sessionId, orderId, amount } = body;
  if (!sessionId || !orderId || amount === undefined) {
    return Response.json(
      { success: false, error: 'MISSING_FIELDS' },
      { status: 400 },
    );
  }

  const payment = await db
    .select()
    .from(payments)
    .where(eq(payments.orderId, orderId))
    .get();

  if (!payment) {
    return Response.json(
      { success: false, error: 'PAYMENT_NOT_FOUND' },
      { status: 404 },
    );
  }

  if (payment.status === 'DONE') {
    const existingEnrollment = await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.userId, session.user.id))
      .get();
    return Response.json({
      success: true,
      enrollmentId: existingEnrollment?.id,
      message: 'Payment already confirmed',
    });
  }

  if (payment.amount !== amount) {
    return Response.json(
      { success: false, error: 'AMOUNT_MISMATCH' },
      { status: 400 },
    );
  }

  const txResult = await getTransaction(sessionId);

  if (!txResult.success) {
    await db
      .update(payments)
      .set({ status: 'FAILED' })
      .where(eq(payments.id, payment.id));

    return Response.json({
      success: false,
      error: 'TRANSACTION_RETRIEVAL_FAILED',
      message: txResult.error.message,
    });
  }

  const tx = txResult.data;

  if (tx.resultCode !== '0000' || tx.status !== 'paid') {
    await db
      .update(payments)
      .set({ status: 'FAILED' })
      .where(eq(payments.id, payment.id));

    return Response.json({
      success: false,
      error: 'PAYMENT_NOT_COMPLETED',
      message: tx.resultMsg || 'Payment was not completed successfully',
    });
  }

  if (tx.amount !== amount) {
    return Response.json(
      { success: false, error: 'AMOUNT_MISMATCH' },
      { status: 400 },
    );
  }

  if (tx.tid && tx.signature && tx.ediDate) {
    const sigValid = verifySignature(
      tx.tid,
      tx.amount,
      tx.ediDate,
      tx.signature,
    );
    if (!sigValid) {
      return Response.json(
        { success: false, error: 'SIGNATURE_VERIFICATION_FAILED' },
        { status: 400 },
      );
    }
  }

  await db
    .update(payments)
    .set({
      status: 'DONE',
      paymentKey: tx.tid || null,
      tossPaymentMethod: tx.payMethod || null,
      approvedAt: tx.paidAt ? new Date(tx.paidAt) : new Date(),
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

  const newEnrollment = await db
    .select()
    .from(enrollments)
    .where(eq(enrollments.userId, session.user.id))
    .get();

  return Response.json({ success: true, enrollmentId: newEnrollment?.id });
};
