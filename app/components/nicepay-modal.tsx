import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface NicepayModalProps {
  checkoutUrl: string;
  onClose: () => void;
}

export function NicepayModal({ checkoutUrl, onClose }: NicepayModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Listen for messages from the iframe (if NicePay sends any)
    const handleMessage = (event: MessageEvent) => {
      console.log(
        '[NicepayModal] Message from iframe:',
        event.origin,
        event.data,
      );
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-[24px] w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-bold text-[#332F3A]">결제하기</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-[#635F69]" />
          </button>
        </div>
        <div className="flex-1 relative">
          <iframe
            ref={iframeRef}
            src={checkoutUrl}
            className="w-full h-full border-0"
            title="NicePay 결제창"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
        </div>
        <div className="p-4 border-t bg-gray-50">
          <p className="text-sm text-[#635F69] text-center">
            결제가 완료되면 자동으로 창이 닫힙니다.
          </p>
        </div>
      </div>
    </div>
  );
}
