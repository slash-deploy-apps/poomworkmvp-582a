import { type ActionFunctionArgs } from 'react-router';
import { eq, and } from 'drizzle-orm';
import { db } from '~/lib/db.server';
import { payments, courses, jobs, jobApplications } from '~/db/schema';
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

    let body: { courseId?: string; jobId?: string; applicationId?: string; orderId?: string };
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { success: false, error: 'INVALID_BODY' },
        { status: 400 },
      );
    }

    const { courseId, jobId, applicationId, orderId } = body;
    if ((!courseId && !jobId) || !orderId) {
      return Response.json(
        { success: false, error: 'MISSING_FIELDS' },
        { status: 400 },
      );
    }
    if (jobId && !applicationId) {
      return Response.json(
        { success: false, error: 'MISSING_APPLICATION_ID' },
        { status: 400 },
      );
    }

    let amount = 0;
    let goodsName = '';
    let payeeId: string | null = null;
    let referenceId = '';
    let paymentType: 'course_purchase' | 'job_payment' = 'course_purchase';

    if (courseId) {
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

      amount = course.price;
      goodsName = course.title;
      payeeId = course.instructorId;
      referenceId = courseId;
      paymentType = 'course_purchase';
    } else if (jobId) {
      const job = await db
        .select()
        .from(jobs)
        .where(eq(jobs.id, jobId))
        .get();

      if (!job) {
        return Response.json(
          { success: false, error: 'JOB_NOT_FOUND' },
          { status: 404 },
        );
      }

      if (job.clientId !== session.user.id) {
        return Response.json(
          { success: false, error: 'NOT_JOB_OWNER' },
          { status: 403 },
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

      if (application.jobId !== jobId) {
        return Response.json(
          { success: false, error: 'APPLICATION_JOB_MISMATCH' },
          { status: 400 },
        );
      }

      amount = application.proposedBudget || job.budgetMin || 0;
      goodsName = job.title;
      payeeId = application.workerId;
      referenceId = jobId;
      paymentType = 'job_payment';
    }

    const existingPendingPayment = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.payerId, session.user.id),
          eq(payments.referenceId, referenceId),
          eq(payments.status, 'PENDING'),
        ),
      )
      .get();

    if (existingPendingPayment) {
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
      amount,
      goodsName,
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
      payeeId,
      amount,
      type: paymentType,
      status: 'PENDING',
      referenceId,
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