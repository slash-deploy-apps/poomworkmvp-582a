import { type ActionFunctionArgs, redirect, Link } from 'react-router';
import { useSearchParams } from 'react-router';
import { eq, sql } from 'drizzle-orm';
import { db } from '~/lib/db.server';
import { payments, enrollments, courses } from '~/db/schema';
import { auth } from '~/lib/auth.server';
import { approvePayment } from '~/lib/nicepay.server';
import { CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import { Button } from '~/components/ui/button';

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== 'POST') {
    return redirect('/payment/fail?error=METHOD_NOT_ALLOWED');
  }

  const formData = await request.formData();
  
  // JS SDK sends authResultCode (not resultCode)
  const authResultCode = formData.get('authResultCode') as string;
  const authResultMsg = formData.get('authResultMsg') as string;
  const tid = formData.get('tid') as string;
  const orderId = formData.get('orderId') as string;
  const amount = Number(formData.get('amount'));
  const authToken = formData.get('authToken') as string;

  if (!tid || !orderId || !amount || !authToken) {
    return redirect('/payment/fail?error=MISSING_FIELDS');
  }

  // Step 1: Check authentication result
  if (authResultCode !== '0000') {
    return redirect(`/payment/fail?resultCode=${authResultCode}&resultMsg=${encodeURIComponent(authResultMsg || '')}&orderId=${orderId}`);
  }

  const payment = await db.select().from(payments).where(eq(payments.orderId, orderId)).get();

  if (!payment) {
    return redirect('/payment/fail?error=PAYMENT_NOT_FOUND');
  }

  if (payment.status === 'DONE') {
    return redirect('/my/courses');
  }

  if (payment.amount !== amount) {
    return redirect('/payment/fail?error=AMOUNT_MISMATCH');
  }

  // Step 2: Call approval API (this is the key missing step!)
  const approvalResult = await approvePayment(tid, amount, authToken);

  if (!approvalResult.success) {
    await db.update(payments).set({ status: 'FAILED' }).where(eq(payments.id, payment.id));
    return redirect(`/payment/fail?error=APPROVAL_FAILED&message=${encodeURIComponent(approvalResult.error.message)}`);
  }

  const result = approvalResult.data;

  if (result.resultCode !== '0000' || result.status !== 'paid') {
    await db.update(payments).set({ status: 'FAILED' }).where(eq(payments.id, payment.id));
    return redirect(`/payment/fail?error=PAYMENT_NOT_COMPLETED&message=${encodeURIComponent(result.resultMsg || '')}`);
  }

  const session = await auth.api.getSession({ headers: request.headers });

  await db.update(payments).set({
    status: 'DONE',
    paymentKey: tid,
    tossPaymentMethod: result.payMethod || null,
    approvedAt: result.paidAt ? new Date(result.paidAt) : new Date(),
  }).where(eq(payments.id, payment.id));

  if (session?.user?.id) {
    await db.insert(enrollments).values({
      userId: session.user.id,
      courseId: payment.referenceId!,
      progress: 0,
    });

    await db.update(courses)
      .set({ enrollmentCount: sql`${courses.enrollmentCount} + 1` })
      .where(eq(courses.id, payment.referenceId!));
  }

  return redirect('/payment/success?status=done');
};

export default function NicepayPaymentSuccess() {
  const [searchParams] = useSearchParams();
  const statusParam = searchParams.get('status');
  const resultCode = searchParams.get('resultCode');
  const resultMsg = searchParams.get('resultMsg');
  const error = searchParams.get('error');

  const isSuccess = statusParam === 'done';
  const isError = !!error || (resultCode && resultCode !== '0000');

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#EDE9FE] to-white p-4">
        <div className="w-full max-w-md bg-white rounded-[32px] shadow-clayCard p-8 text-center space-y-6">
          <div className="flex justify-center">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#332F3A] mb-2">결제 완료!</h1>
            <p className="text-[#635F69]">내 강의 페이지로 이동합니다...</p>
          </div>
          <div className="pt-4">
            <Link to="/my/courses">
              <Button variant="outline" size="lg" className="rounded-[20px]">바로 이동하기</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#EDE9FE] to-white p-4">
        <div className="w-full max-w-md bg-white rounded-[32px] shadow-clayCard p-8 text-center space-y-6">
          <div className="flex justify-center">
            <XCircle className="h-16 w-16 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#332F3A] mb-2">결제 실패</h1>
            <p className="text-[#635F69]">{decodeURIComponent(resultMsg || error || '결제에 실패했습니다.')}</p>
          </div>
          <div className="flex flex-col gap-3 pt-4">
            <Link to="/courses">
              <Button size="lg" className="w-full bg-[#7C3AED] hover:bg-[#5a3d95] rounded-[20px]">다시 시도</Button>
            </Link>
            <Link to="/courses">
              <Button variant="outline" size="lg" className="w-full rounded-[20px]">
                <ArrowLeft className="h-4 w-4 mr-2" />강좌 목록
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#EDE9FE] to-white p-4">
      <div className="w-full max-w-md bg-white rounded-[32px] shadow-clayCard p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-16 w-16 border-4 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#332F3A] mb-2">결제 확인 중...</h1>
          <p className="text-[#635F69]">잠시만 기다려 주세요</p>
        </div>
      </div>
    </div>
  );
}