import { type ActionFunctionArgs } from 'react-router';
import { eq, and } from 'drizzle-orm';
import { db } from '~/lib/db.server';
import { payments, courses } from '~/db/schema';
import { auth } from '~/lib/auth.server';
import { createCheckout } from '~/lib/nicepay.server';

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

    let body: { courseId?: string; orderId?: string };
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { success: false, error: 'INVALID_BODY' },
        { status: 400 },
      );
    }

    const { courseId, orderId } = body;
    if (!courseId || !orderId) {
      return Response.json(
        { success: false, error: 'MISSING_FIELDS' },
        { status: 400 },
      );
    }

    const course = await db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .get();

    if (!course) {
      return Response.json(
        { success: false, error: 'COURSE_NOT_FOUND' },
        { status: 404 },
      );
    }

    const existingPendingPayment = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.payerId, session.user.id),
          eq(payments.referenceId, courseId),
          eq(payments.status, 'PENDING'),
        ),
      )
      .get();

    if (existingPendingPayment) {
      // 기존 PENDING 결제가 있으면 삭제하고 새로 생성
      await db
        .delete(payments)
        .where(eq(payments.id, existingPendingPayment.id));
    }

    const appUrl = process.env.PUBLIC_APP_URL || 'http://localhost:4321';
    const sessionId = `nice_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    const checkoutResult = await createCheckout({
      sessionId,
      orderId,
      method: 'cardAndEasyPay',
      amount: course.price,
      goodsName: course.title,
      returnUrl: `${appUrl}/payment/success`,
      buyerName: session.user.name || undefined,
      buyerEmail: session.user.email || undefined,
    });

    if (!checkoutResult.success) {
      return Response.json({
        success: false,
        error: 'CHECKOUT_CREATION_FAILED',
        message: checkoutResult.error.message,
      });
    }

    await db.insert(payments).values({
      payerId: session.user.id,
      payeeId: course.instructorId,
      amount: course.price,
      type: 'course_purchase',
      status: 'PENDING',
      referenceId: courseId,
      orderId,
      nicepaySessionId: sessionId,
      paymentProvider: 'nicepay',
    });

    return Response.json({
      success: true,
      orderId,
      sessionId,
      checkoutUrl: checkoutResult.data.url,
    });
  } catch (err) {
    console.error('NicePay prepare fatal error:', err);
    return Response.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
      },
      { status: 500 },
    );
  }
};
