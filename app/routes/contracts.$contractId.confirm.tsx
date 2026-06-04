import { Link, redirect, useLoaderData, useNavigate } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs } from 'react-router';
import { eq, and, inArray } from 'drizzle-orm';
import { ArrowLeft, CheckCircle, XCircle, FileText, ExternalLink, AlertTriangle } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { db } from '~/lib/db.server';
import { contracts, jobs, user, disputes } from '~/db/schema';
import { auth } from '~/lib/auth.server';
import { useState } from 'react';

export const meta: MetaFunction = () => [{ title: '결과물 컨펌 - poomwork' }];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return redirect('/login');
  if (session.user.role !== 'client') return redirect('/dashboard');

  const contract = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, params.contractId!))
    .get();

  if (!contract) throw new Response('Not Found', { status: 404 });
  if (contract.clientId !== session.user.id) return redirect('/dashboard');

  const job = await db.select().from(jobs).where(eq(jobs.id, contract.jobId)).get();
  const workerInfo = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, contract.workerId))
    .get();

  // Parse deliverable files if present
  let deliverableFiles: string[] = [];
  if (contract.deliverableFiles) {
    try {
      deliverableFiles = JSON.parse(contract.deliverableFiles);
    } catch {
      deliverableFiles = [];
    }
  }

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

  return { contract, job, workerInfo, deliverableFiles, activeDispute: activeDispute ?? null };
}

export default function ContractConfirm() {
  const { contract, job, workerInfo, deliverableFiles, activeDispute } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [revisionNote, setRevisionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/contracts/${contract.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || '컨펌에 실패했습니다.');
      }

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || '컨펌 중 오류가 발생했습니다.');
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!revisionNote.trim()) {
      setError('거부 사유를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/contracts/${contract.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: revisionNote }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || '재작업 요청에 실패했습니다.');
      }

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || '재작업 요청 중 오류가 발생했습니다.');
      setIsSubmitting(false);
    }
  };

  const isDelivered = contract.status === 'delivered';

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link to="/dashboard" className="inline-flex items-center text-sm text-[#635F69] hover:text-[#7C3AED] mb-6">
        ← 대시보드로 돌아가기
      </Link>

      <Card className="bg-[#EDE9FE] rounded-[32px] border-0">
        <CardHeader>
          <CardTitle className="text-xl font-bold">결과물 컨펌</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Job & Worker Info */}
          <div className="bg-white/60 rounded-[24px] p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h3 className="font-bold text-lg">{job?.title || '프로젝트'}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-[#635F69]">작업자: {workerInfo?.name || '미확인'}</span>
                </div>
              </div>
              <Badge className="bg-[#7C3AED] text-white shrink-0">
                {new Intl.NumberFormat('ko-KR').format(contract.amount)}원
              </Badge>
            </div>
            {contract.duration && (
              <p className="text-sm text-[#635F69]">예상 기간: {contract.duration}</p>
            )}
          </div>

          {/* Status Check */}
          {!isDelivered && (
            <div className="bg-yellow-50 rounded-[24px] p-5 text-center">
              <p className="text-yellow-700">아직 결과물이 전달되지 않았습니다.</p>
            </div>
          )}

          {/* Deliverables */}
          {isDelivered && (
            <>
              {/* Files */}
              {deliverableFiles.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-[#332F3A] mb-3">전달된 파일</h4>
                  <div className="space-y-2">
                    {deliverableFiles.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 bg-white rounded-[16px] p-4 hover:bg-gray-50 transition-colors"
                      >
                        <FileText className="h-5 w-5 text-[#7C3AED] shrink-0" />
                        <span className="text-sm text-[#332F3A] flex-1 truncate">{url.split('/').pop()}</span>
                        <ExternalLink className="h-4 w-4 text-[#635F69] shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Text */}
              {contract.deliverableText && (
                <div>
                  <h4 className="text-sm font-medium text-[#332F3A] mb-3">결과물 설명</h4>
                  <div className="bg-white rounded-[20px] p-4">
                    <p className="text-sm text-[#332F3A] whitespace-pre-wrap">{contract.deliverableText}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          {/* Actions */}
          {isDelivered && !showRejectForm && (
            <div className="flex gap-3">
              <Button
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="flex-1 h-14 bg-green-600 hover:bg-green-700 active:scale-[0.98] transition-all duration-200 rounded-[20px] text-white font-bold disabled:opacity-50"
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                {isSubmitting ? '처리 중...' : '컨펌하기'}
              </Button>
              <Button
                onClick={() => setShowRejectForm(true)}
                variant="outline"
                className="flex-1 h-14 border-red-200 text-red-600 hover:bg-red-50 active:scale-[0.98] transition-all duration-200 rounded-[20px] font-bold"
              >
                <XCircle className="h-5 w-5 mr-2" />
                거부 및 재작업 요청
              </Button>
            </div>
          )}

          {/* 분쟁 제기 섹션 */}
          <div className="pt-2 border-t border-gray-100">
            {activeDispute ? (
              <div className="flex items-center gap-2 bg-orange-50 rounded-[16px] px-4 py-3">
                <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
                <span className="text-sm text-orange-700 font-medium">현재 분쟁 검토 중입니다.</span>
              </div>
            ) : (
              <div>
                {!showDisputeForm ? (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[#635F69]">
                      문제가 있나요?{' '}
                      <a href="/policies/dispute" target="_blank" rel="noopener noreferrer" className="text-[#7C3AED] hover:underline">분쟁 정책</a>
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
                    <p className="text-sm font-medium text-[#332F3A]">분쟁 사유를 입력해주세요</p>
                    <Textarea
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      placeholder="최소 30자 이상 입력해주세요."
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

          {/* Reject Form */}
          {isDelivered && showRejectForm && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#332F3A] mb-2">
                  거부 사유 (재작업 요청사항)
                </label>
                <Textarea
                  value={revisionNote}
                  onChange={(e) => setRevisionNote(e.target.value)}
                  placeholder="수정이나 재작업이 필요한 부분에 대해 상세히 입력해주세요"
                  rows={4}
                  className="bg-white rounded-[20px] border-0 p-4 text-[#332F3A] placeholder:text-gray-400"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleReject}
                  disabled={isSubmitting || !revisionNote.trim()}
                  className="flex-1 h-14 bg-red-500 hover:bg-red-600 active:scale-[0.98] transition-all duration-200 rounded-[20px] text-white font-bold disabled:opacity-50"
                >
                  {isSubmitting ? '처리 중...' : '재작업 요청'}
                </Button>
                <Button
                  onClick={() => {
                    setShowRejectForm(false);
                    setRevisionNote('');
                    setError(null);
                  }}
                  variant="outline"
                  className="flex-1 h-14 border-gray-200 text-[#635F69] hover:bg-gray-50 active:scale-[0.98] transition-all duration-200 rounded-[20px] font-bold"
                >
                  취소
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
