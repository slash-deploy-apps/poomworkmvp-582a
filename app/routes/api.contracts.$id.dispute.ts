import type { ActionFunctionArgs } from 'react-router';
import { auth } from '~/lib/auth.server';
import { raiseDispute } from '~/lib/dispute.server';

export async function action({ request, params }: ActionFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return Response.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const contractId = params.id;
  if (!contractId) {
    return Response.json({ success: false, error: '계약 ID가 필요합니다.' }, { status: 400 });
  }

  let body: { reason?: string; evidenceFiles?: string[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: '잘못된 요청 형식입니다.' }, { status: 400 });
  }

  const { reason, evidenceFiles } = body;

  if (!reason || typeof reason !== 'string' || reason.trim().length < 30) {
    return Response.json(
      { success: false, error: '분쟁 사유는 30자 이상 입력해주세요.' },
      { status: 400 },
    );
  }

  try {
    const result = await raiseDispute({
      contractId,
      userId: session.user.id,
      reason: reason.trim(),
      evidenceFiles,
    });
    return Response.json({ success: true, disputeId: result.disputeId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '분쟁 제기에 실패했습니다.';
    return Response.json({ success: false, error: message }, { status: 400 });
  }
}
