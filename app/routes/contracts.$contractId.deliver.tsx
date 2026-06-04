import { useState, useCallback, useRef } from 'react';
import { Link, redirect, useLoaderData, useNavigate } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs } from 'react-router';
import { Upload, X, FileText, AlertTriangle } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { db } from '~/lib/db.server';
import { contracts, jobs, user, disputes } from '~/db/schema';
import { auth } from '~/lib/auth.server';
import { eq, and, inArray } from 'drizzle-orm';

export const meta: MetaFunction = () => [{ title: '결과물 전달 - poomwork' }];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return redirect('/login');

  const contract = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, params.contractId!))
    .get();

  if (!contract) throw new Response('Not Found', { status: 404 });

  if (contract.workerId !== session.user.id) {
    return redirect('/dashboard');
  }

  const job = await db.select().from(jobs).where(eq(jobs.id, contract.jobId)).get();
  const clientInfo = await db
    .select({ id: user.id, name: user.name, image: user.image })
    .from(user)
    .where(eq(user.id, contract.clientId))
    .get();

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

  return { contract, job, clientInfo, user: session.user, activeDispute: activeDispute ?? null };
}

export default function ContractDeliver() {
  const { contract, job, clientInfo, activeDispute } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [deliverableText, setDeliverableText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setError(null);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload?endpoint=deliverable', {
          method: 'POST',
          credentials: 'same-origin',
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '업로드에 실패했습니다.');
        return data.url as string;
      });

      const urls = await Promise.all(uploadPromises);
      setUploadedFiles((prev) => [...prev, ...urls]);
    } catch (err: any) {
      setError(err.message || '파일 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleRemoveFile = useCallback((url: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f !== url));
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      handleFileUpload(event.dataTransfer.files);
    },
    [handleFileUpload]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadedFiles.length === 0 && !deliverableText.trim()) {
      setError('파일 또는 설명을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/contracts/${contract.id}/deliver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: uploadedFiles,
          text: deliverableText,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || '결과물 전달에 실패했습니다.');
      }

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || '결과물 전달 중 오류가 발생했습니다.');
      setIsSubmitting(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link to="/dashboard" className="inline-flex items-center text-sm text-[#635F69] hover:text-[#7C3AED] mb-6">
        ← 대시보드로 돌아가기
      </Link>

      <Card className="bg-[#EDE9FE] rounded-[32px] border-0">
        <CardHeader>
          <CardTitle className="text-xl font-bold">결과물 전달</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Contract Summary */}
          <div className="bg-white/60 rounded-[24px] p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h3 className="font-bold text-lg">{job?.title || '프로젝트'}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-[#635F69]">의뢰자: {clientInfo?.name || '미확인'}</span>
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

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Upload Section */}
            <div>
              <label className="block text-sm font-medium text-[#332F3A] mb-3">
                파일 업로드
              </label>
              <input
                ref={inputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
              <div
                onClick={() => inputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-[#7C3AED]/30 hover:border-[#7C3AED]/60 bg-[#F4F1FA] rounded-[24px] p-8 text-center cursor-pointer transition-all duration-200"
              >
                {isUploading ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-[#635F69]">업로드 중...</p>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-[#7C3AED]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Upload className="h-6 w-6 text-[#7C3AED]" />
                    </div>
                    <p className="text-sm text-[#635F69]">파일을 드래그하거나 클릭하여 선택</p>
                    <p className="text-xs text-[#7C3AED]/60 mt-1">JPG, PNG, PDF 등</p>
                  </>
                )}
              </div>

              {/* Uploaded Files */}
              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {uploadedFiles.map((url, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-white rounded-[16px] p-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-5 w-5 text-[#7C3AED] shrink-0" />
                        <span className="text-sm text-[#332F3A] truncate">{url.split('/').pop()}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(url)}
                        className="p-1 hover:bg-red-50 rounded-full shrink-0"
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Text/Link Input */}
            <div>
              <label className="block text-sm font-medium text-[#332F3A] mb-3">
                결과물 설명 또는 링크
              </label>
              <Textarea
                value={deliverableText}
                onChange={(e) => setDeliverableText(e.target.value)}
                placeholder="결과물에 대한 설명이나 외부 링크를 입력해주세요"
                rows={5}
                className="bg-white rounded-[20px] border-0 p-4 text-[#332F3A] placeholder:text-gray-400"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            <Button
              type="submit"
              disabled={isSubmitting || (uploadedFiles.length === 0 && !deliverableText.trim())}
              className="w-full h-14 bg-[#7C3AED] hover:bg-[#5a3d95] active:scale-[0.98] active:shadow-clay-pressed transition-all duration-200 rounded-[20px] text-white font-bold disabled:opacity-50"
            >
              {isSubmitting ? '전송 중...' : '결과물 전달'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 분쟁 제기 섹션 */}
      <div className="mt-6">
        {activeDispute ? (
          <div className="flex items-center gap-2 bg-orange-50 rounded-[20px] px-5 py-4 border border-orange-200">
            <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
            <span className="text-sm text-orange-700 font-medium">현재 분쟁 검토 중입니다. 관리자가 처리할 때까지 기다려주세요.</span>
          </div>
        ) : (
          <div className="bg-white rounded-[24px] border border-gray-100 p-5">
            {!showDisputeForm ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#332F3A]">이 거래에 문제가 있나요?</p>
                  <p className="text-xs text-[#635F69] mt-0.5">
                    분쟁을 제기하면 관리자가 중재합니다.{' '}
                    <a href="/policies/dispute" target="_blank" rel="noopener noreferrer" className="text-[#7C3AED] hover:underline">정책 보기</a>
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDisputeForm(true)}
                  className="text-orange-600 border-orange-200 hover:bg-orange-50 rounded-[16px] text-sm shrink-0"
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  분쟁 제기
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-[#332F3A]">분쟁 사유를 상세히 입력해주세요</p>
                <Textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="최소 30자 이상 입력해주세요. 문제 상황을 구체적으로 설명해주세요."
                  rows={4}
                  className="bg-gray-50 rounded-[16px] border border-gray-200 p-3 text-sm text-[#332F3A] placeholder:text-gray-400"
                />
                <p className="text-xs text-[#635F69]">
                  {disputeReason.length}/30자 이상 필요 ·{' '}
                  <a href="/policies/dispute" target="_blank" rel="noopener noreferrer" className="text-[#7C3AED] hover:underline">분쟁 중재 정책 보기</a>
                </p>
                {disputeError && <p className="text-xs text-red-500">{disputeError}</p>}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleDisputeSubmit}
                    disabled={isDisputeSubmitting || disputeReason.trim().length < 30}
                    className="bg-orange-500 hover:bg-orange-600 text-white rounded-[16px] text-sm disabled:opacity-50 active:scale-[0.97] transition-all duration-200"
                  >
                    {isDisputeSubmitting ? '제출 중...' : '분쟁 제기'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setShowDisputeForm(false); setDisputeReason(''); setDisputeError(null); }}
                    className="rounded-[16px] text-sm"
                  >
                    취소
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}