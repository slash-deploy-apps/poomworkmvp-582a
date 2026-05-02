import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import type { MetaFunction } from 'react-router';
import { Loader2, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import { Button } from '~/components/ui/button';

export const meta: MetaFunction = () => [
  { title: '결제 확인 중... - poomwork' },
];

interface ConfirmResult {
  success: boolean;
  error?: string;
  message?: string;
  enrollmentId?: string;
}

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  );
  const [errorMessage, setErrorMessage] = useState('');

  const paymentKey = searchParams.get('paymentKey');
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');
  const courseId = searchParams.get('courseId');

  useEffect(() => {
    if (!paymentKey || !orderId || !amount || !courseId) {
      setStatus('error');
      setErrorMessage('필요한 파라미터가 없습니다.');
      return;
    }

    const confirmPayment = async () => {
      try {
        const response = await fetch('/api/payment/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount: Number(amount),
          }),
        });

        const data: ConfirmResult = await response.json();

        if (data.success) {
          setStatus('success');
          setTimeout(() => {
            navigate(`/courses/${courseId}/learn`);
          }, 2000);
        } else {
          setStatus('error');
          setErrorMessage(data.message || data.error || '결제에 실패했습니다.');
        }
      } catch {
        setStatus('error');
        setErrorMessage('서버와 통신 중 오류가 발생했습니다.');
      }
    };

    confirmPayment();
  }, [paymentKey, orderId, amount, courseId, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#EDE9FE] to-white p-4">
      <div className="w-full max-w-md bg-white rounded-[32px] shadow-clayCard p-8 text-center space-y-6">
        {status === 'loading' && (
          <>
            <div className="flex justify-center">
              <Loader2 className="h-16 w-16 text-[#7C3AED] animate-spin" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#332F3A] mb-2">
                결제 확인 중...
              </h1>
              <p className="text-[#635F69]">잠시만 기다려 주세요</p>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="flex justify-center">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#332F3A] mb-2">
                결제 완료!
              </h1>
              <p className="text-[#635F69]">강의 페이지로 이동합니다...</p>
            </div>
            <div className="pt-4">
              <Link to={`/courses/${courseId}/learn`}>
                <Button variant="outline" size="lg" className="rounded-[20px]">
                  바로 이동하기
                </Button>
              </Link>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex justify-center">
              <XCircle className="h-16 w-16 text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#332F3A] mb-2">
                결제 실패
              </h1>
              <p className="text-[#635F69]">{errorMessage}</p>
            </div>
            <div className="flex flex-col gap-3 pt-4">
              <Link to={`/courses/${courseId}`}>
                <Button
                  size="lg"
                  className="w-full bg-[#7C3AED] hover:bg-[#5a3d95] rounded-[20px]"
                >
                  다시 시도
                </Button>
              </Link>
              <Link to="/courses">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full rounded-[20px]"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  강좌 목록
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
