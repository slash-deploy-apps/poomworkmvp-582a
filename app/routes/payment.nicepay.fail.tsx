import { useSearchParams, Link } from 'react-router';
import type { MetaFunction } from 'react-router';
import { XCircle, ArrowLeft, Home } from 'lucide-react';
import { Button } from '~/components/ui/button';

export const meta: MetaFunction = () => [{ title: '결제 실패 - poomwork' }];

export default function NicepayPaymentFail() {
  const [searchParams] = useSearchParams();

  const resultCode = searchParams.get('resultCode') || '';
  const resultMsg = searchParams.get('resultMsg') || '결제에 실패했습니다.';
  const orderId = searchParams.get('orderId') || '';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#EDE9FE] to-white p-4">
      <div className="w-full max-w-md bg-white rounded-[32px] shadow-clayCard p-8 text-center space-y-6">
        <div className="flex justify-center">
          <XCircle className="h-16 w-16 text-red-500" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-[#332F3A] mb-2">
            결제가 취소되었습니다
          </h1>
          <p className="text-[#635F69]">{decodeURIComponent(resultMsg)}</p>
        </div>

        {(resultCode || orderId) && (
          <div className="bg-[#FEE2E2] rounded-[24px] p-4 text-left">
            <p className="text-sm text-red-600">
              {resultCode && <span className="font-medium">오류 코드: </span>}
              {resultCode && <span className="font-mono">{resultCode}</span>}
            </p>
            {orderId && (
              <p className="text-sm text-red-600 mt-1">
                <span className="font-medium">주문 ID: </span>
                <span className="font-mono">{orderId}</span>
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 pt-4">
          <Link to="/courses">
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
              <Home className="h-4 w-4 mr-2" />
              홈으로
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
