import { useEffect, useState, useRef } from 'react';
import { loadTossPayments } from '@tosspayments/tosspayments-sdk';
import { Button } from '~/components/ui/button';

interface PaymentWidgetProps {
  courseId: string;
  courseTitle: string;
  price: number;
  customerKey: string;
  orderId: string;
  onClose: () => void;
  isOpen: boolean;
}

export function PaymentWidget({ courseId, courseTitle, price, customerKey, orderId, onClose, isOpen }: PaymentWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const initWidget = async () => {
      try {
        setLoading(true);
        setError(null);

        const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY as string;
        if (!clientKey) {
          throw new Error('TOSS_CLIENT_KEY not configured');
        }

        const tossPayments = await loadTossPayments(clientKey);
        if (cancelled) return;

        const widgets = tossPayments.widgets({ customerKey });
        await widgets.setAmount({ currency: 'KRW', value: price });
        if (cancelled) return;

        await widgets.renderPaymentMethods({ selector: '#payment-method' });
        await widgets.renderAgreement({ selector: '#agreement' });
        if (cancelled) return;

        setLoading(false);

        (window as unknown as { tossWidgets: typeof widgets }).tossWidgets = widgets;
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load payment widget');
          setLoading(false);
        }
      }
    };

    initWidget();

    return () => {
      cancelled = true;
    };
  }, [isOpen, customerKey, price]);

  const handlePayment = async () => {
    const widgets = (window as unknown as { tossWidgets: { requestPayment: (opts: object) => Promise<void> } }).tossWidgets;
    if (!widgets) return;

    try {
      await widgets.requestPayment({
        orderId,
        orderName: courseTitle,
        successUrl: `${window.location.origin}/payment/success?orderId=${orderId}&courseId=${courseId}`,
        failUrl: `${window.location.origin}/payment/fail?orderId=${orderId}&courseId=${courseId}`,
      });
    } catch (err) {
      console.error('Payment request failed:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-[32px] w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">수강 결제</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
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

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-[#7C3AED] border-t-transparent rounded-full" />
            </div>
          )}

          {error && (
            <div className="text-center text-red-500 py-4">
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div id="payment-method" />
            <div id="agreement" />
          </div>

          {!loading && !error && (
            <Button
              onClick={handlePayment}
              className="w-full bg-[#7C3AED] hover:bg-[#5a3d95] h-14 rounded-[20px] text-base font-medium"
            >
              결제하기
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
