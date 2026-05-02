import { type ActionFunctionArgs } from 'react-router';
import { eq, and } from 'drizzle-orm';
import { db } from '~/lib/db.server';
import { payments, courses } from '~/db/schema';
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

  const course = await db.select().from(courses).where(eq(courses.id, courseId)).get();

  if (!course) {
    return Response.json(
      { success: false, error: 'COURSE_NOT_FOUND' },
      { status: 404 },
    );
  }

  const existingPendingPayment = await db.select().from(payments).where(and(
    eq(payments.payerId, session.user.id),
    eq(payments.referenceId, courseId),
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
    payeeId: course.instructorId,
    amount: course.price,
    type: 'course_purchase',
    status: 'PENDING',
    referenceId: courseId,
    orderId,
  });

  return Response.json({ success: true, orderId });
};
