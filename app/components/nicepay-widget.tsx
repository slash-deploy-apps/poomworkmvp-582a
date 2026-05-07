import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Loader2 } from 'lucide-react';

interface NicepayWidgetProps {
  courseId: string;
  courseTitle: string;
  price: number;
  orderId: string;
  onClose: () => void;
  isOpen: boolean;
}

export function NicepayWidget({
  courseId,
  courseTitle,
  price,
  orderId,
  onClose,
  isOpen,
}: NicepayWidgetProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/payment/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, orderId }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || '결제 준비에 실패했습니다.');
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('결제창 URL을 받지 못했습니다.');
      }
    } catch (err) {
      setLoading(false);
      setError(
        err instanceof Error
          ? err.message
          : '결제 준비 중 오류가 발생했습니다.',
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-[32px] w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">수강 결제</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center p-4 bg-[#EDE9FE] rounded-[24px]">
            <p className="text-lg font-semibold">{courseTitle}</p>
            <p className="text-2xl font-bold text-[#7C3AED] mt-2">
              {new Intl.NumberFormat('ko-KR').format(price)}원
            </p>
          </div>

          <div className="space-y-2 text-sm text-[#635F69]">
            <p>• 신용카드 및 간편결제를 지원합니다.</p>
            <p>• 결제창에서 안전하게 결제를 진행해 주세요.</p>
            <p>• 결제 완료 후 자동으로 수강 등록됩니다.</p>
          </div>

          {error && (
            <div className="text-center text-red-500 py-2 text-sm">
              <p>{error}</p>
            </div>
          )}

          <Button
            onClick={handlePayment}
            disabled={loading}
            className="w-full bg-[#7C3AED] hover:bg-[#5a3d95] h-14 rounded-[20px] text-base font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                결제 준비 중...
              </>
            ) : (
              '결제하기'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
