const NICEPAY_API_BASE = 'https://api.nicepay.co.kr';

interface NicepayCheckoutCreateResponse {
  resulCode: string;
  resulMsg: string;
  messageSource: string;
  sessionId: string;
  url: string;
  isExpire: boolean;
  expireDate: string;
  status?: string;
  tid?: string;
  clientId: string;
  method: string;
  orderId: string;
  amount: number;
  goodsName: string;
  returnUrl: string;
}

interface NicepayTransactionResponse {
  resultCode: string;
  resultMsg: string;
  sessionId: string;
  orderId: string;
  clientId: string;
  tid?: string;
  amount: number;
  goodsName: string;
  status: string;
  payMethod?: string;
  paidAt?: string;
  failedAt?: string;
  ediDate?: string;
  signature?: string;
  buyerName?: string;
  buyerTel?: string;
  buyerEmail?: string;
  cardCode?: string;
  cardName?: string;
  cardQuota?: string;
  approveNo?: string;
  vbankCode?: string;
  vbankName?: string;
  vbankNumber?: string;
  vbankExpDate?: string;
  vbankHolder?: string;
  bankCode?: string;
  bankName?: string;
  receiptUrl?: string;
}

interface NicepayCancelResponse {
  resultCode: string;
  resultMsg: string;
  sessionId: string;
  orderId: string;
  clientId: string;
  tid?: string;
  amount: number;
  goodsName: string;
  status: string;
  isExpire: boolean;
  expireDate: string;
}

interface ApiError {
  code: string;
  message: string;
}

function getBasicAuthHeader(): string {
  const clientId = process.env.NICEPAY_CLIENT_ID;
  const secretKey = process.env.NICEPAY_SECRET_KEY;
  if (!clientId || !secretKey) {
    throw new Error('NICEPAY_CLIENT_ID or NICEPAY_SECRET_KEY is not set');
  }
  const credentials = Buffer.from(`${clientId}:${secretKey}`).toString(
    'base64',
  );
  return `Basic ${credentials}`;
}

export async function createCheckout(params: {
  sessionId: string;
  orderId: string;
  method: string;
  amount: number;
  goodsName: string;
  returnUrl: string;
  buyerName?: string;
  buyerTel?: string;
  buyerEmail?: string;
  mallUserId?: string;
  mallReserved?: string;
}): Promise<
  | { success: true; data: NicepayCheckoutCreateResponse }
  | { success: false; error: ApiError }
> {
  try {
    const response = await fetch(`${NICEPAY_API_BASE}/v1/checkout`, {
      method: 'POST',
      headers: {
        Authorization: getBasicAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const text = await response.text();
      let errorData: ApiError;
      try {
        errorData = JSON.parse(text);
      } catch {
        errorData = { code: 'HTTP_ERROR', message: `HTTP ${response.status}: ${text.slice(0, 200)}` };
      }
      return { success: false, error: errorData };
    }

    const data = (await response.json()) as NicepayCheckoutCreateResponse;
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'Network request failed',
      },
    };
  }
}

export async function getTransaction(
  sessionId: string,
): Promise<
  | { success: true; data: NicepayTransactionResponse }
  | { success: false; error: ApiError }
> {
  try {
    const response = await fetch(
      `${NICEPAY_API_BASE}/v1/payments/checkout/${sessionId}`,
      {
        method: 'GET',
        headers: {
          Authorization: getBasicAuthHeader(),
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      const text = await response.text();
      let errorData: ApiError;
      try {
        errorData = JSON.parse(text);
      } catch {
        errorData = { code: 'HTTP_ERROR', message: `HTTP ${response.status}: ${text.slice(0, 200)}` };
      }
      return { success: false, error: errorData };
    }

    const data = (await response.json()) as NicepayTransactionResponse;
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'Network request failed',
      },
    };
  }
}

export async function cancelTransaction(
  sessionId: string,
  orderId: string,
  reason: string,
): Promise<
  | { success: true; data: NicepayCancelResponse }
  | { success: false; error: ApiError }
> {
  try {
    const response = await fetch(
      `${NICEPAY_API_BASE}/v1/payments/checkout/${sessionId}/cancel`,
      {
        method: 'POST',
        headers: {
          Authorization: getBasicAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId, reason }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      let errorData: ApiError;
      try {
        errorData = JSON.parse(text);
      } catch {
        errorData = { code: 'HTTP_ERROR', message: `HTTP ${response.status}: ${text.slice(0, 200)}` };
      }
      return { success: false, error: errorData };
    }

    const data = (await response.json()) as NicepayCancelResponse;
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'Network request failed',
      },
    };
  }
}

export function verifySignature(
  tid: string,
  amount: number,
  ediDate: string,
  signature: string,
): boolean {
  const secretKey = process.env.NICEPAY_SECRET_KEY;
  if (!secretKey) return false;

  const crypto = require('crypto');
  const expected = crypto
    .createHash('sha256')
    .update(tid + amount + ediDate + secretKey)
    .digest('hex');

  return expected === signature;
}
