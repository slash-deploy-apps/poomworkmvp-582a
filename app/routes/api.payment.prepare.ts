import { type ActionFunctionArgs } from 'react-router';
import { eq, and } from 'drizzle-orm';
import { db } from '~/lib/db.server';
import { payments, courses, contracts, jobs } from '~/db/schema';
import { auth } from '~/lib/auth.server';

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

  let body: { courseId?: string; contractId?: string; orderId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: 'INVALID_BODY' },
      { status: 400 },
    );
  }

  const { courseId, contractId, orderId } = body;
  if ((!courseId && !contractId) || !orderId) {
    return Response.json(
      { success: false, error: 'MISSING_FIELDS' },
      { status: 400 },
    );
  }

  let amount = 0;
  let payeeId: string | null = null;
  let referenceId = '';
  let paymentType: 'course_purchase' | 'job_payment' = 'course_purchase';

  if (courseId) {
    const course = await db.select().from(courses).where(eq(courses.id, courseId)).get();
    if (!course) {
      return Response.json(
        { success: false, error: 'COURSE_NOT_FOUND' },
        { status: 404 },
      );
    }
    amount = course.price;
    payeeId = course.instructorId;
    referenceId = courseId;
    paymentType = 'course_purchase';
  } else if (contractId) {
    const contract = await db.select().from(contracts).where(eq(contracts.id, contractId)).get();
    if (!contract) {
      return Response.json(
        { success: false, error: 'CONTRACT_NOT_FOUND' },
        { status: 404 },
      );
    }
    if (contract.clientId !== session.user.id) {
      return Response.json(
        { success: false, error: 'NOT_CONTRACT_CLIENT' },
        { status: 403 },
      );
    }
    if (contract.status !== 'contract_signed') {
      return Response.json(
        { success: false, error: 'CONTRACT_NOT_SIGNED', message: '계약이 아직 체결되지 않았습니다.' },
        { status: 400 },
      );
    }
    const job = await db.select().from(jobs).where(eq(jobs.id, contract.jobId)).get();
    if (!job) {
      return Response.json(
        { success: false, error: 'JOB_NOT_FOUND' },
        { status: 404 },
      );
    }
    amount = contract.amount;
    payeeId = contract.workerId;
    referenceId = contractId;
    paymentType = 'job_payment';
  }

  const existingPendingPayment = await db.select().from(payments).where(and(
    eq(payments.payerId, session.user.id),
    eq(payments.referenceId, referenceId),
    eq(payments.status, 'PENDING'),
  )).get();

  if (existingPendingPayment) {
    return Response.json({
      success: true,
      orderId: existingPendingPayment.orderId,
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
  });

  return Response.json({ success: true, orderId });
};