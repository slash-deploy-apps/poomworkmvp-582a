import { type ActionFunctionArgs, redirect, Link } from 'react-router';
import { useSearchParams } from 'react-router';
import { eq, sql } from 'drizzle-orm';
import { db } from '~/lib/db.server';
import { payments, enrollments, courses } from '~/db/schema';
import { auth } from '~/lib/auth.server';
import { getTransaction, verifySignature } from '~/lib/nicepay.server';
import { CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import { Button } from '~/components/ui/button';

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== 'POST') {
    return redirect('/payment/fail?error=METHOD_NOT_ALLOWED');
  }

  const formData = await request.formData();
  const resultCode = formData.get('resultCode') as string;
  const resultMsg = formData.get('resultMsg') as string;
  const sessionId = formData.get('sessionId') as string;
  const orderId = formData.get('orderId') as string;
  const amount = Number(formData.get('amount'));

  if (!sessionId || !orderId || !amount) {
    return redirect('/payment/fail?error=MISSING_FIELDS');
  }

  if (resultCode !== '0000') {
    return redirect(`/payment/fail?resultCode=${resultCode}&resultMsg=${encodeURIComponent(resultMsg || '')}&orderId=${orderId}`);
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

  const txResult = await getTransaction(sessionId);

  if (!txResult.success) {
    await db.update(payments).set({ status: 'FAILED' }).where(eq(payments.id, payment.id));
    return redirect(`/payment/fail?error=TRANSACTION_RETRIEVAL_FAILED&message=${encodeURIComponent(txResult.error.message)}`);
  }

  const tx = txResult.data;

  if (tx.resultCode !== '0000' || tx.status !== 'paid') {
    await db.update(payments).set({ status: 'FAILED' }).where(eq(payments.id, payment.id));
    return redirect(`/payment/fail?error=PAYMENT_NOT_COMPLETED&message=${encodeURIComponent(tx.resultMsg || '')}`);
  }

  if (tx.amount !== amount) {
    return redirect('/payment/fail?error=AMOUNT_MISMATCH');
  }

  if (tx.tid && tx.signature && tx.ediDate) {
    const sigValid = verifySignature(tx.tid, tx.amount, tx.ediDate, tx.signature);
    if (!sigValid) {
      return redirect('/payment/fail?error=SIGNATURE_VERIFICATION_FAILED');
    }
  }

  const session = await auth.api.getSession({ headers: request.headers });

  await db.update(payments).set({
    status: 'DONE',
    paymentKey: tx.tid || null,
    tossPaymentMethod: tx.payMethod || null,
    approvedAt: tx.paidAt ? new Date(tx.paidAt) : new Date(),
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