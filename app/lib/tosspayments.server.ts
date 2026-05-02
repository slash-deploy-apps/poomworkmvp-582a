const TOSS_API_BASE = 'https://api.tosspayments.com/v1/payments';

interface TossConfirmResponse {
  paymentKey: string;
  orderId: string;
  orderName: string;
  amount: number;
  method: string;
  requestedAt: string;
  approvedAt: string;
}

interface TossCancelResponse {
  paymentKey: string;
  orderId: string;
  orderName: string;
  amount: number;
  method: string;
  cancelledAt: string;
  cancelReason: string;
}

interface ApiError {
  code: string;
  message: string;
}

function getBasicAuthHeader(): string {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) throw new Error('TOSS_SECRET_KEY is not set');
  const credentials = Buffer.from(`${secretKey}:`).toString('base64');
  return `Basic ${credentials}`;
}

export async function confirmPayment(
  paymentKey: string,
  orderId: string,
  amount: number,
): Promise<
  | { success: true; data: TossConfirmResponse }
  | { success: false; error: ApiError }
> {
  const response = await fetch(`${TOSS_API_BASE}/confirm`, {
    method: 'POST',
    headers: {
      Authorization: getBasicAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      code: 'UNKNOWN',
      message: 'Payment confirmation failed',
    }));
    return { success: false, error: errorData as ApiError };
  }

  const data = (await response.json()) as TossConfirmResponse;
  return { success: true, data };
}

export async function cancelPayment(
  paymentKey: string,
  cancelReason: string,
): Promise<
  | { success: true; data: TossCancelResponse }
  | { success: false; error: ApiError }
> {
  const response = await fetch(`${TOSS_API_BASE}/${paymentKey}/cancel`, {
    method: 'POST',
    headers: {
      Authorization: getBasicAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ cancelReason }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      code: 'UNKNOWN',
      message: 'Payment cancellation failed',
    }));
    return { success: false, error: errorData as ApiError };
  }

  const data = (await response.json()) as TossCancelResponse;
  return { success: true, data };
}
