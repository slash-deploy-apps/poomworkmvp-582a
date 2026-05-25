import { Link, redirect, useLoaderData, useFetcher, useRevalidator } from 'react-router';
import type {
  MetaFunction,
  LoaderFunctionArgs,
  ActionFunctionArgs,
} from 'react-router';
import { eq, desc, and, or, asc } from 'drizzle-orm';
import { Send, DollarSign, CheckCircle2, XCircle, Info } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import { Badge } from '~/components/ui/badge';
import { db } from '~/lib/db.server';
import { messages, user, jobs, jobApplications, contracts } from '~/db/schema';
import { auth } from '~/lib/auth.server';

export const meta: MetaFunction = () => [{ title: '메시지 - poomwork' }];

type ProposalMetadata = {
  amount: number;
  duration: string | null;
  proposalStatus: 'pending' | 'accepted' | 'rejected';
  contractId?: string;
};

type SystemMetadata = {
  contractId?: string;
  event?: string;
  [key: string]: unknown;
};

type LoadedMessage = {
  id: string;
  content: string;
  createdAt: Date;
  senderId: string;
  receiverId: string;
  jobId: string | null;
  type: string;
  metadata: string | null;
  isRead: number;
};

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return redirect('/login');
  const url = new URL(request.url);
  const jobId = url.searchParams.get('jobId');
  const peerId = url.searchParams.get('peerId');

  // Mark messages from the active peer as read BEFORE computing the conversation
  // list / unread counts. This way the badges visible on this very page render
  // already reflect the user's intent to read them.
  if (peerId) {
    await db
      .update(messages)
      .set({ isRead: 1 })
      .where(
        and(
          eq(messages.receiverId, session.user.id),
          eq(messages.senderId, peerId),
          eq(messages.isRead, 0),
        ),
      );
  }

  // Conversation list — peers I have ever exchanged messages with.
  const allMessages = (await db
    .select({
      id: messages.id,
      content: messages.content,
      createdAt: messages.createdAt,
      senderId: messages.senderId,
      receiverId: messages.receiverId,
      jobId: messages.jobId,
      isRead: messages.isRead,
      type: messages.type,
      peerName: user.name,
      peerEmail: user.email,
      peerImage: user.image,
    })
    .from(messages)
    .leftJoin(
      user,
      or(eq(messages.senderId, user.id), eq(messages.receiverId, user.id)),
    )
    .where(
      or(
        eq(messages.senderId, session.user.id),
        eq(messages.receiverId, session.user.id),
      ),
    )
    .orderBy(desc(messages.createdAt))) as unknown as Array<{
    id: string;
    content: string;
    createdAt: Date;
    senderId: string;
    receiverId: string;
    jobId: string | null;
    isRead: number;
    type: string;
    peerName: string | null;
    peerEmail: string | null;
    peerImage: string | null;
  }>;

  const conversations: Record<string, any> = {};
  for (const m of allMessages) {
    const peer = m.senderId === session.user.id ? m.receiverId : m.senderId;
    if (peer === session.user.id) continue;
    if (!conversations[peer]) {
      conversations[peer] = {
        peerId: peer,
        peerName: m.peerName || m.peerEmail,
        peerImage: m.peerImage,
        lastMessage:
          m.type === 'proposal'
            ? '[금액 제안]'
            : m.type === 'system'
              ? `[알림] ${m.content}`
              : m.content,
        lastAt: m.createdAt,
        unread: 0,
      };
    }
    if (!m.isRead && m.receiverId === session.user.id) {
      conversations[peer].unread++;
    }
  }

  let activeMessages: LoadedMessage[] = [];
  let peerInfo: any = null;
  let jobInfo: any = null;
  let activeApplication: any = null;
  let activeContract: any = null;

  if (peerId) {
    activeMessages = (await db
      .select({
        id: messages.id,
        content: messages.content,
        createdAt: messages.createdAt,
        senderId: messages.senderId,
        receiverId: messages.receiverId,
        jobId: messages.jobId,
        type: messages.type,
        metadata: messages.metadata,
        isRead: messages.isRead,
      })
      .from(messages)
      .where(
        and(
          or(
            eq(messages.senderId, session.user.id),
            eq(messages.receiverId, session.user.id),
          ),
          or(eq(messages.senderId, peerId), eq(messages.receiverId, peerId)),
        ),
      )
      .orderBy(asc(messages.createdAt))
      .limit(100)) as unknown as LoadedMessage[];

    const peer = await db
      .select()
      .from(user)
      .where(eq(user.id, peerId))
      .limit(1);
    peerInfo = peer[0] || null;
    if (jobId) {
      const job = await db
        .select()
        .from(jobs)
        .where(eq(jobs.id, jobId))
        .limit(1);
      jobInfo = job[0] || null;

      const appRows = await db
        .select()
        .from(jobApplications)
        .where(
          and(
            eq(jobApplications.jobId, jobId),
            or(
              eq(jobApplications.workerId, session.user.id),
              eq(jobApplications.workerId, peerId),
            ),
          ),
        )
        .limit(1);
      activeApplication = appRows[0] || null;

      if (activeApplication) {
        const contractRows = await db
          .select()
          .from(contracts)
          .where(eq(contracts.applicationId, activeApplication.id))
          .limit(1);
        activeContract = contractRows[0] || null;
      }
    }
  }

  return {
    user: session.user,
    conversations: Object.values(conversations),
    activeMessages,
    peerInfo,
    jobInfo,
    activePeerId: peerId,
    activeJobId: jobId,
    activeApplication,
    activeContract,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return redirect('/login');
  const formData = await request.formData();
  const intent = (formData.get('_intent') as string) || 'sendText';

  if (intent === 'sendText') {
    const receiverId = formData.get('receiverId') as string;
    const content = (formData.get('content') as string) || '';
    const jobId = formData.get('jobId') as string;
    if (!receiverId || !content.trim()) {
      return Response.json({ success: false, error: 'EMPTY' }, { status: 400 });
    }
    await db.insert(messages).values({
      senderId: session.user.id,
      receiverId,
      content,
      jobId: jobId || null,
      type: 'text',
      metadata: null,
    });
    return { success: true };
  }

  if (intent === 'acceptProposal') {
    const messageId = formData.get('messageId') as string;
    if (!messageId) {
      return Response.json(
        { success: false, error: 'MISSING_MESSAGE_ID' },
        { status: 400 },
      );
    }
    const msg = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .get();
    if (!msg || msg.type !== 'proposal') {
      return Response.json(
        { success: false, error: 'NOT_A_PROPOSAL' },
        { status: 400 },
      );
    }
    if (msg.receiverId !== session.user.id) {
      return Response.json(
        { success: false, error: 'FORBIDDEN' },
        { status: 403 },
      );
    }
    let meta: ProposalMetadata;
    try {
      meta = JSON.parse(msg.metadata || '{}');
    } catch {
      return Response.json(
        { success: false, error: 'BAD_METADATA' },
        { status: 400 },
      );
    }
    if (meta.proposalStatus !== 'pending') {
      return Response.json(
        { success: false, error: 'ALREADY_HANDLED' },
        { status: 400 },
      );
    }

    let contractId = meta.contractId;
    if (!contractId && msg.jobId) {
      const appRow = await db
        .select()
        .from(jobApplications)
        .where(
          and(
            eq(jobApplications.jobId, msg.jobId),
            eq(jobApplications.workerId, msg.senderId),
          ),
        )
        .get();
      if (appRow) {
        const c = await db
          .select()
          .from(contracts)
          .where(eq(contracts.applicationId, appRow.id))
          .get();
        contractId = c?.id;
      }
    }
    if (!contractId) {
      return Response.json(
        { success: false, error: 'CONTRACT_NOT_FOUND' },
        { status: 404 },
      );
    }

    const newMeta: ProposalMetadata = {
      ...meta,
      proposalStatus: 'accepted',
      contractId,
    };
    await db
      .update(messages)
      .set({ metadata: JSON.stringify(newMeta) })
      .where(eq(messages.id, messageId));

    await db.insert(messages).values({
      senderId: session.user.id,
      receiverId: msg.senderId,
      jobId: msg.jobId,
      content:
        '의뢰자가 제안을 수락했습니다. 계약 동의 페이지로 이동해 주세요.',
      type: 'system',
      metadata: JSON.stringify({ contractId, event: 'proposal_accepted' }),
    });

    return Response.json({
      success: true,
      redirectTo: `/contracts/${contractId}/agree`,
    });
  }

  if (intent === 'rejectProposal') {
    const messageId = formData.get('messageId') as string;
    if (!messageId) {
      return Response.json(
        { success: false, error: 'MISSING_MESSAGE_ID' },
        { status: 400 },
      );
    }
    const msg = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .get();
    if (!msg || msg.type !== 'proposal') {
      return Response.json(
        { success: false, error: 'NOT_A_PROPOSAL' },
        { status: 400 },
      );
    }
    if (msg.receiverId !== session.user.id) {
      return Response.json(
        { success: false, error: 'FORBIDDEN' },
        { status: 403 },
      );
    }
    let meta: ProposalMetadata;
    try {
      meta = JSON.parse(msg.metadata || '{}');
    } catch {
      return Response.json(
        { success: false, error: 'BAD_METADATA' },
        { status: 400 },
      );
    }
    if (meta.proposalStatus !== 'pending') {
      return Response.json(
        { success: false, error: 'ALREADY_HANDLED' },
        { status: 400 },
      );
    }
    const newMeta: ProposalMetadata = { ...meta, proposalStatus: 'rejected' };
    await db
      .update(messages)
      .set({ metadata: JSON.stringify(newMeta) })
      .where(eq(messages.id, messageId));

    await db.insert(messages).values({
      senderId: session.user.id,
      receiverId: msg.senderId,
      jobId: msg.jobId,
      content:
        '의뢰자가 제안을 거부했습니다. 다른 금액으로 재제안할 수 있습니다.',
      type: 'system',
      metadata: JSON.stringify({ event: 'proposal_rejected' }),
    });

    return { success: true };
  }

  return Response.json(
    { success: false, error: 'UNKNOWN_INTENT' },
    { status: 400 },
  );
}

function formatKRW(n: number) {
  return new Intl.NumberFormat('ko-KR').format(n) + '원';
}

function ProposalCard({
  message,
  isMe,
  isClient,
  fetcher,
}: {
  message: LoadedMessage;
  isMe: boolean;
  isClient: boolean;
  fetcher: ReturnType<typeof useFetcher>;
}) {
  let meta: ProposalMetadata;
  try {
    meta = JSON.parse(message.metadata || '{}');
  } catch {
    meta = { amount: 0, duration: null, proposalStatus: 'pending' };
  }

  const isPending = meta.proposalStatus === 'pending';
  const isAccepted = meta.proposalStatus === 'accepted';
  const isRejected = meta.proposalStatus === 'rejected';

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[85%] bg-white rounded-[24px] border-2 border-[#7C3AED] p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="h-4 w-4 text-[#7C3AED]" />
          <span className="text-xs font-bold text-[#7C3AED] uppercase tracking-wider">
            금액 제안
          </span>
          {isAccepted && (
            <Badge className="bg-green-100 text-green-700 ml-auto">
              수락됨
            </Badge>
          )}
          {isRejected && (
            <Badge className="bg-red-100 text-red-700 ml-auto">거부됨</Badge>
          )}
          {isPending && (
            <Badge className="bg-yellow-100 text-yellow-700 ml-auto">
              대기중
            </Badge>
          )}
        </div>

        <div className="space-y-2 mb-3">
          <div>
            <div className="text-xs text-[#635F69]">금액</div>
            <div className="text-lg font-bold text-[#332F3A]">
              {formatKRW(meta.amount)}
            </div>
          </div>
          {meta.duration && (
            <div>
              <div className="text-xs text-[#635F69]">예상 기간</div>
              <div className="text-sm text-[#332F3A]">{meta.duration}</div>
            </div>
          )}
        </div>

        {isPending && isClient && !isMe && (
          <div className="flex gap-2 pt-2 border-t border-[#EDE9FE]">
            <fetcher.Form method="post" className="flex-1">
              <input type="hidden" name="_intent" value="acceptProposal" />
              <input type="hidden" name="messageId" value={message.id} />
              <Button
                type="submit"
                size="sm"
                disabled={fetcher.state !== 'idle'}
                className="w-full bg-[#7C3AED] hover:bg-[#5a3d95] rounded-[20px] text-white"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                수락
              </Button>
            </fetcher.Form>
            <fetcher.Form method="post" className="flex-1">
              <input type="hidden" name="_intent" value="rejectProposal" />
              <input type="hidden" name="messageId" value={message.id} />
              <Button
                type="submit"
                size="sm"
                variant="outline"
                disabled={fetcher.state !== 'idle'}
                className="w-full border-[#DB2777] text-[#DB2777] rounded-[20px]"
              >
                <XCircle className="h-4 w-4 mr-1" />
                거부
              </Button>
            </fetcher.Form>
          </div>
        )}

        {isAccepted && meta.contractId && (
          <Link
            to={`/contracts/${meta.contractId}/agree`}
            className="block mt-2 pt-2 border-t border-[#EDE9FE] text-center text-xs font-bold text-[#7C3AED] hover:underline"
          >
            계약 동의 페이지로 이동 →
          </Link>
        )}

        <div className="text-xs mt-2 text-[#635F69]">
          {new Date(message.createdAt).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}

function SystemMessage({ message }: { message: LoadedMessage }) {
  let meta: SystemMetadata = {};
  try {
    meta = JSON.parse(message.metadata || '{}');
  } catch {}

  return (
    <div className="flex justify-center">
      <div className="bg-[#EDE9FE]/80 rounded-[20px] px-4 py-2 max-w-[80%] flex items-start gap-2">
        <Info className="h-4 w-4 text-[#7C3AED] flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#635F69] text-center">
            {message.content}
          </p>
          {meta.contractId && (
            <Link
              to={`/contracts/${meta.contractId}/agree`}
              className="block text-xs font-bold text-[#7C3AED] hover:underline text-center mt-1"
            >
              계약 보기 →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function ProposeAmountDialog({
  jobId,
  receiverId,
  proposedBudget,
  proposedDuration,
}: {
  jobId: string;
  receiverId: string;
  proposedBudget: number | null | undefined;
  proposedDuration: string | null | undefined;
}) {
  const revalidator = useRevalidator();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<string>(
    proposedBudget != null ? String(proposedBudget) : '',
  );
  const [duration, setDuration] = useState<string>(proposedDuration || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('유효한 금액을 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/messages/proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          receiverId,
          amount: amt,
          duration: duration.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const errorMessages: Record<string, string> = {
          UNAUTHORIZED: '로그인이 필요합니다.',
          FORBIDDEN: '이 일거리에 제안할 권한이 없습니다.',
          MISSING_FIELDS: '필수 항목이 빠졌습니다.',
          JOB_NOT_FOUND: '일거리를 찾을 수 없습니다.',
          CLIENT_CANNOT_PROPOSE: '의뢰자는 자신의 일거리에 제안할 수 없습니다.',
          RECEIVER_NOT_JOB_CLIENT: '수신자가 이 일거리의 의뢰자와 일치하지 않습니다.',
          INVALID_BODY: '잘못된 요청입니다.',
          METHOD_NOT_ALLOWED: '허용되지 않은 요청 방식입니다.',
        };
        const key = data.error as string | undefined;
        throw new Error(
          data.message || (key && errorMessages[key]) || key || '제안 전송에 실패했습니다.',
        );
      }
      setOpen(false);
      revalidator.revalidate();
    } catch (err: any) {
      setError(err.message || '제안 전송 중 오류');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-[20px] border-[#7C3AED] text-[#7C3AED] hover:bg-[#EDE9FE] shrink-0"
        >
          <DollarSign className="h-4 w-4 mr-1" />
          금액 제안
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-[24px]">
        <DialogHeader>
          <DialogTitle>금액 제안하기</DialogTitle>
          <DialogDescription>
            의뢰자에게 금액과 예상 기간을 제안합니다. 의뢰자가 수락하면 계약
            동의 페이지로 이동합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="block text-sm font-medium text-[#332F3A] mb-2">
              금액 (원) *
            </label>
            <Input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="예: 500000"
              className="rounded-[20px]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#332F3A] mb-2">
              예상 기간 (선택)
            </label>
            <Input
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="예: 2주"
              className="rounded-[20px]"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={submitting}
            className="rounded-[20px]"
          >
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-[#7C3AED] hover:bg-[#5a3d95] rounded-[20px]"
          >
            {submitting ? '전송중...' : '제안 보내기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Messages() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher<{ success: boolean; redirectTo?: string }>();
  const revalidator = useRevalidator();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Poll for new messages every 3s when tab is visible and a conversation is active.
  useEffect(() => {
    if (!data.activePeerId) return;

    const poll = () => {
      if (document.visibilityState === 'visible' && revalidator.state === 'idle') {
        revalidator.revalidate();
      }
    };

    const intervalId = setInterval(poll, 3000);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        poll();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [data.activePeerId, revalidator]);

  // Revalidate immediately after the fetcher (text send / proposal accept / reject) completes.
  const prevFetcherStateRef = useRef(fetcher.state);
  useEffect(() => {
    if (
      prevFetcherStateRef.current !== 'idle' &&
      fetcher.state === 'idle' &&
      revalidator.state === 'idle'
    ) {
      revalidator.revalidate();
    }
    prevFetcherStateRef.current = fetcher.state;
  }, [fetcher.state, revalidator]);

  // After accepting a proposal, follow redirectTo if returned.
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.redirectTo) {
      window.location.href = fetcher.data.redirectTo;
    }
  }, [fetcher.state, fetcher.data]);

  // Scroll to bottom on new messages.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data.activeMessages?.length]);

  const isClient = data.user.role === 'client';
  const isWorker = data.user.role === 'worker';

  return (
    <div className="min-h-screen bg-[#F4F1FA]">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <h1 className="text-2xl font-bold text-[#332F3A] mb-6">메시지</h1>
        <div className="grid md:grid-cols-3 gap-6">
          {/* Conversation list */}
          <div className="md:col-span-1 space-y-2">
            <div className="bg-white rounded-[32px] p-4 shadow-sm">
              <h2 className="text-sm font-bold text-[#635F69] mb-3">
                대화 목록
              </h2>
              {data.conversations.length === 0 ? (
                <p className="text-sm text-[#635F69] py-4 text-center">
                  아직 대화가 없습니다
                </p>
              ) : (
                <div className="space-y-2">
                  {(data.conversations as any[]).map((c: any) => (
                    <Link
                      key={c.peerId}
                      to={`/messages?peerId=${c.peerId}${data.activeJobId ? `&jobId=${data.activeJobId}` : ''}`}
                      className={`block p-3 rounded-[24px] transition-all duration-200 ${
                        data.activePeerId === c.peerId
                          ? 'bg-[#EDE9FE]'
                          : 'hover:bg-[#F4F1FA]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-[20px] bg-[#EDE9FE] flex items-center justify-center text-[#7C3AED] text-xs font-semibold">
                          {(c.peerName || '?')[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {c.peerName}
                          </div>
                          <div className="text-xs text-[#635F69] truncate">
                            {c.lastMessage}
                          </div>
                        </div>
                        {c.unread > 0 && (
                          <span className="bg-[#7C3AED] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {c.unread}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Active conversation */}
          <div className="md:col-span-2">
            {data.peerInfo ? (
              <div className="bg-white rounded-[32px] overflow-hidden flex flex-col h-[600px] shadow-sm">
                <div className="p-4 border-b border-[#EDE9FE] flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[20px] bg-[#EDE9FE] flex items-center justify-center text-[#7C3AED] font-semibold">
                    {(data.peerInfo.name || '?')[0]}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{data.peerInfo.name}</div>
                    {data.jobInfo && (
                      <Link
                        to={`/jobs/${data.jobInfo.id}`}
                        className="text-xs text-[#7C3AED] hover:underline"
                      >
                        일거리: {data.jobInfo.title}
                      </Link>
                    )}
                  </div>
                  {(data.activeContract as any) && (
                    <Link
                      to={`/contracts/${(data.activeContract as any).id}/agree`}
                      className="text-xs px-3 py-1 rounded-[20px] bg-[#EDE9FE] text-[#7C3AED] font-bold hover:bg-[#DDD6FE]"
                    >
                      계약 보기
                    </Link>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {(data.activeMessages as unknown as LoadedMessage[]).map(
                    (m) => {
                      const isMe = m.senderId === data.user.id;
                      if (m.type === 'system') {
                        return <SystemMessage key={m.id} message={m} />;
                      }
                      if (m.type === 'proposal') {
                        return (
                          <ProposalCard
                            key={m.id}
                            message={m}
                            isMe={isMe}
                            isClient={isClient}
                            fetcher={fetcher}
                          />
                        );
                      }
                      return (
                        <div
                          key={m.id}
                          className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-[24px] px-4 py-2 ${
                              isMe
                                ? 'bg-[#7C3AED] text-white'
                                : 'bg-[#EDE9FE] text-[#332F3A]'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">
                              {m.content}
                            </p>
                            <p
                              className={`text-xs mt-1 ${
                                isMe ? 'text-purple-200' : 'text-[#635F69]'
                              }`}
                            >
                              {new Date(m.createdAt).toLocaleTimeString(
                                'ko-KR',
                                {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                },
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    },
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <fetcher.Form
                  method="post"
                  className="p-4 border-t border-[#EDE9FE] flex gap-2 items-center"
                  onSubmit={(e) => {
                    const form = e.currentTarget;
                    requestAnimationFrame(() => {
                      const input = form.querySelector(
                        'input[name="content"]',
                      ) as HTMLInputElement | null;
                      if (input) input.value = '';
                    });
                  }}
                >
                  <input type="hidden" name="_intent" value="sendText" />
                  <input
                    type="hidden"
                    name="receiverId"
                    value={data.activePeerId || ''}
                  />
                  {data.activeJobId && (
                    <input
                      type="hidden"
                      name="jobId"
                      value={data.activeJobId}
                    />
                  )}
                  {isWorker && data.activeJobId && data.activePeerId && (
                    <ProposeAmountDialog
                      jobId={data.activeJobId}
                      receiverId={data.activePeerId}
                      proposedBudget={
                        (data.activeApplication as any)?.proposedBudget
                      }
                      proposedDuration={
                        (data.activeApplication as any)?.proposedDuration
                      }
                    />
                  )}
                  <Input
                    name="content"
                    placeholder="메시지를 입력하세요"
                    required
                    className="flex-1 bg-[#EDE9FE] rounded-[20px] border-0 h-10 px-4"
                  />
                  <Button
                    type="submit"
                    disabled={fetcher.state !== 'idle'}
                    className="bg-[#7C3AED] hover:bg-[#5a3d95] rounded-[20px] h-10 w-10 p-0 active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </fetcher.Form>
              </div>
            ) : (
              <div className="bg-white rounded-[32px] h-[600px] flex items-center justify-center shadow-sm">
                <p className="text-[#635F69]">대화를 선택하세요</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
