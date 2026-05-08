import { Link, redirect, useLoaderData } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs } from 'react-router';
import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle, Clock, CreditCard } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Checkbox } from '~/components/ui/checkbox';
import { Badge } from '~/components/ui/badge';
import { db } from '~/lib/db.server';
import { contracts, jobApplications, jobs, user } from '~/db/schema';
import { auth } from '~/lib/auth.server';
import { eq } from 'drizzle-orm';

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

  return {
    contract,
    job,
    application,
    worker,
    client,
    currentUser: session.user,
  };
}

interface ContractStatus {
  workerAgreed: boolean;
  clientAgreed: boolean;
  status: string;
}

export default function ContractAgree() {
  const data = useLoaderData<typeof loader>();
  const { contract, job, application, worker, client, currentUser } = data as {
    contract: { id: string; jobId: string; applicationId: string; workerId: string; clientId: string; amount: number | null; duration: string | null; workerAgreed: boolean; clientAgreed: boolean; status: string };
    job: { title: string; budgetMin?: number | null };
    application: { proposedBudget: number | null };
    worker: { name: string };
    client: { name: string };
    currentUser: { id: string };
  };

  const [statusData, setStatusData] = useState<ContractStatus>({
    workerAgreed: contract.workerAgreed,
    clientAgreed: contract.clientAgreed,
    status: contract.status,
  });
  const [myAgreed, setMyAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolling, setIsPolling] = useState(true);

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
