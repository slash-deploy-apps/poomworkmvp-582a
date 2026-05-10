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

  const formData = await request.formData();
  const resultCode = formData.get('resultCode') as string;
  const resultMsg = formData.get('resultMsg') as string;
  const sessionId = formData.get('sessionId') as string;
  const orderId = formData.get('orderId') as string;
  const amount = Number(formData.get('amount'));

  if (!sessionId || !orderId || !amount) {
    return Response.json(
      { success: false, error: 'MISSING_FIELDS' },
      { status: 400 },
    );
  }

  if (resultCode !== '0000') {
    return Response.json({
      success: false,
      error: 'PAYMENT_FAILED',
      message: resultMsg,
    });
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
    return Response.json({
      success: true,
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

  const session = await auth.api.getSession({ headers: request.headers });

  await db
    .update(payments)
    .set({
      status: 'DONE',
      paymentKey: tx.tid || null,
      tossPaymentMethod: tx.payMethod || null,
      approvedAt: tx.paidAt ? new Date(tx.paidAt) : new Date(),
    })
    .where(eq(payments.id, payment.id));

  if (session?.user?.id) {
    await db.insert(enrollments).values({
      userId: session.user.id,
      courseId: payment.referenceId!,
      progress: 0,
    });

    await db
      .update(courses)
      .set({ enrollmentCount: sql`${courses.enrollmentCount} + 1` })
      .where(eq(courses.id, payment.referenceId!));
  }

  return Response.json({ success: true });
};
