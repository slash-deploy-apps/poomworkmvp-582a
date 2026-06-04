import { Link, redirect, useLoaderData, useNavigate } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs } from 'react-router';
import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle, Clock, CreditCard, AlertTriangle } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Checkbox } from '~/components/ui/checkbox';
import { Badge } from '~/components/ui/badge';
import { db } from '~/lib/db.server';
import { contracts, jobApplications, jobs, user, disputes } from '~/db/schema';
import { auth } from '~/lib/auth.server';
import { eq, and, inArray } from 'drizzle-orm';

export const meta: MetaFunction = () => [{ title: '계약 동의 - poomwork' }];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return redirect('/login');

  const contractId = params.contractId;
  if (!contractId) return redirect('/dashboard');

  const contract = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .get();

  if (!contract) return redirect('/dashboard');

  if (contract.workerId !== session.user.id && contract.clientId !== session.user.id) {
    return redirect('/dashboard');
  }

  const [application, job, worker, client] = await Promise.all([
    db.select().from(jobApplications).where(eq(jobApplications.id, contract.applicationId)).get(),
    db.select().from(jobs).where(eq(jobs.id, contract.jobId)).get(),
    db.select({ id: user.id, name: user.name }).from(user).where(eq(user.id, contract.workerId)).get(),
    db.select({ id: user.id, name: user.name }).from(user).where(eq(user.id, contract.clientId)).get(),
  ]);

  const activeDispute = await db
    .select()
    .from(disputes)
    .where(
      and(
        eq(disputes.contractId, contract.id),
        inArray(disputes.status, ['open', 'reviewing']),
      ),
    )
    .get();

  return {
    contract,
    job,
    application,
    worker,
    client,
    currentUser: session.user,
    activeDispute: activeDispute ?? null,
  };
}

interface ContractStatus {
  workerAgreed: boolean;
  clientAgreed: boolean;
  status: string;
}

export default function ContractAgree() {
  const data = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { contract, job, application, worker, client, currentUser, activeDispute } = data as {
    contract: { id: string; jobId: string; applicationId: string; workerId: string; clientId: string; amount: number | null; duration: string | null; workerAgreed: boolean; clientAgreed: boolean; status: string };
    job: { title: string; budgetMin?: number | null };
    application: { proposedBudget: number | null };
    worker: { name: string };
    client: { name: string };
    currentUser: { id: string };
    activeDispute: { id: string; status: string } | null;
  };

  const [statusData, setStatusData] = useState<ContractStatus>({
    workerAgreed: contract.workerAgreed,
    clientAgreed: contract.clientAgreed,
    status: contract.status,
  });
  const [myAgreed, setMyAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolling, setIsPolling] = useState(true);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [isDisputeSubmitting, setIsDisputeSubmitting] = useState(false);
  const [disputeError, setDisputeError] = useState<string | null>(null);

  const handleDisputeSubmit = async () => {
    if (disputeReason.trim().length < 30) {
      setDisputeError('분쟁 사유는 30자 이상 입력해주세요.');
      return;
    }
    setIsDisputeSubmitting(true);
    setDisputeError(null);
    try {
      const res = await fetch(`/api/contracts/${contract.id}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: disputeReason }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || '분쟁 제기에 실패했습니다.');
      navigate('/dashboard');
    } catch (err: unknown) {
      setDisputeError(err instanceof Error ? err.message : '분쟁 제기 중 오류가 발생했습니다.');
      setIsDisputeSubmitting(false);
    }
  };

  const isWorker = currentUser.id === contract.workerId;
  const isClient = currentUser.id === contract.clientId;
  const myAgreedField = isWorker ? statusData.workerAgreed : statusData.clientAgreed;
  const bothAgreed = statusData.workerAgreed && statusData.clientAgreed;

  useEffect(() => {
    if (!isPolling) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/contracts/${contract.id}/status`);
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setStatusData({
              workerAgreed: json.data.workerAgreed,
              clientAgreed: json.data.clientAgreed,
              status: json.data.status,
            });
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [contract.id, isPolling]);

  const handleAgree = async () => {
    if (!myAgreed || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/contracts/${contract.id}/agree`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setStatusData({
            workerAgreed: json.data.workerAgreed,
            clientAgreed: json.data.clientAgreed,
            status: json.data.status,
          });
          setIsPolling(false);
        }
      }
    } catch (err) {
      console.error('Agree error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayment = async () => {
    try {
      const orderId = `order_${contract.id}_${Date.now()}`;
      const res = await fetch('/api/payment/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: contract.id,
          orderId,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        alert(json.message || '결제 준비에 실패했습니다.');
        return;
      }

      const nice = (window as unknown as { AUTHNICE?: { requestPay: (opts: Record<string, unknown>) => void } }).AUTHNICE;
      if (!nice) {
        alert('결제 모듈을 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
        return;
      }

      const returnUrl = `${window.location.origin}/payment/success`;

      nice.requestPay({
        clientId: 'R2_770a929902ef484eb91d6c43688e80c1',
        method: 'card',
        orderId,
        amount: contract.amount || job.budgetMin || 0,
        goodsName: job.title,
        returnUrl,
        fnError: function (result: Record<string, unknown>) {
          console.error('NicePay error:', result);
          alert('결제 오류: ' + (result.errorMsg || '알 수 없는 오류'));
        },
      });
    } catch (err) {
      console.error('Payment error:', err);
      alert('결제 준비 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link to="/dashboard" className="inline-flex items-center text-sm text-[#635F69] hover:text-[#7C3AED] mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" />대시보드로 돌아가기
      </Link>

      <h1 className="text-3xl font-extrabold mb-8" style={{ fontFamily: "'Nunito', sans-serif" }}>
        계약 동의
      </h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>계약 요약</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-[#EDE9FE] rounded-[24px] p-5 space-y-3">
            <div>
              <div className="text-sm text-[#635F69]">프로젝트</div>
              <div className="font-medium text-lg">{job.title}</div>
            </div>
            <div className="flex gap-6">
              <div>
                <div className="text-sm text-[#635F69]">금액</div>
                <div className="font-medium">
                  {new Intl.NumberFormat('ko-KR').format(contract.amount || 0)}원
                </div>
              </div>
              <div>
                <div className="text-sm text-[#635F69]">기간</div>
                <div className="font-medium">{contract.duration || '협의'}</div>
              </div>
            </div>
            <div className="flex gap-6">
              <div>
                <div className="text-sm text-[#635F69]">전문가</div>
                <div className="font-medium">{worker.name}</div>
              </div>
              <div>
                <div className="text-sm text-[#635F69]">의뢰자</div>
                <div className="font-medium">{client.name}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>동의 상태</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[#332F3A]">전문가 동의 상태</span>
            {statusData.workerAgreed ? (
              <Badge className="bg-green-100 text-green-700">
                <CheckCircle className="h-3 w-3 mr-1" />동의 완료
              </Badge>
            ) : (
              <Badge className="bg-yellow-100 text-yellow-700">
                <Clock className="h-3 w-3 mr-1" />대기중
              </Badge>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#332F3A]">의뢰자 동의 상태</span>
            {statusData.clientAgreed ? (
              <Badge className="bg-green-100 text-green-700">
                <CheckCircle className="h-3 w-3 mr-1" />동의 완료
              </Badge>
            ) : (
              <Badge className="bg-yellow-100 text-yellow-700">
                <Clock className="h-3 w-3 mr-1" />대기중
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {!myAgreedField ? (
        <Card>
          <CardHeader>
            <CardTitle>본 계약 내용에 동의합니다</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Checkbox
                id="agree-checkbox"
                checked={myAgreed}
                onCheckedChange={(checked) => setMyAgreed(checked === true)}
                className="data-checked:bg-[#7C3AED] data-checked:border-[#7C3AED]"
              />
              <label htmlFor="agree-checkbox" className="text-sm text-[#332F3A] cursor-pointer">
                본 계약 내용에 동의합니다
              </label>
            </div>
            <Button
              onClick={handleAgree}
              disabled={!myAgreed || isSubmitting}
              className="w-full bg-[#7C3AED] hover:bg-[#5a3d95] active:scale-[0.98] active:shadow-clay-pressed transition-all duration-200 h-12 rounded-[20px] disabled:opacity-50"
            >
              {isSubmitting ? '동의 처리중...' : '확인'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-green-700">
              <CheckCircle className="h-6 w-6" />
              <span className="font-medium">이미 동의하셨습니다</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 분쟁 제기 섹션 */}
      <div className="mt-4">
        {activeDispute ? (
          <div className="flex items-center gap-2 bg-orange-50 rounded-[20px] px-5 py-4 border border-orange-200">
            <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
            <span className="text-sm text-orange-700 font-medium">현재 분쟁 검토 중입니다. 관리자가 처리할 때까지 기다려주세요.</span>
          </div>
        ) : (
          <div className="bg-white rounded-[24px] border border-gray-100 p-4">
            {!showDisputeForm ? (
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#635F69]">
                  이 거래에 문제가 있나요?{' '}
                  <a href="/policies/dispute" target="_blank" rel="noopener noreferrer" className="text-[#7C3AED] hover:underline">정책 보기</a>
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDisputeForm(true)}
                  className="text-orange-600 border-orange-200 hover:bg-orange-50 rounded-[14px] text-xs"
                >
                  <AlertTriangle className="h-3.5 w-3.5 mr-1" />분쟁 제기
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-[#332F3A]">분쟁 사유를 입력해주세요 (최소 30자)</p>
                <Textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="문제 상황을 구체적으로 설명해주세요."
                  rows={3}
                  className="bg-gray-50 rounded-[16px] border border-gray-200 p-3 text-sm text-[#332F3A] placeholder:text-gray-400"
                />
                <p className="text-xs text-[#635F69]">{disputeReason.length}/30자 이상 필요</p>
                {disputeError && <p className="text-xs text-red-500">{disputeError}</p>}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleDisputeSubmit}
                    disabled={isDisputeSubmitting || disputeReason.trim().length < 30}
                    className="bg-orange-500 hover:bg-orange-600 text-white rounded-[14px] text-xs h-8 px-4 disabled:opacity-50 active:scale-[0.97] transition-all duration-200"
                  >
                    {isDisputeSubmitting ? '제출 중...' : '분쟁 제기'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { setShowDisputeForm(false); setDisputeReason(''); setDisputeError(null); }}
                    className="rounded-[14px] text-xs h-8"
                  >
                    취소
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {bothAgreed && (
        <div className="mt-6">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-green-700 mb-4">
                <CheckCircle className="h-6 w-6" />
                <span className="font-bold text-lg">양측 동의 완료!</span>
              </div>
              {isClient ? (
                <Button
                  onClick={handlePayment}
                  className="w-full bg-[#DB2777] hover:bg-[#a91d5b] active:scale-[0.98] active:shadow-clay-pressed transition-all duration-200 h-12 rounded-[20px]"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  결제하기
                </Button>
              ) : (
                <div className="bg-white/80 rounded-[20px] p-4 text-center text-[#635F69]">
                  의뢰자 결제 대기중
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
