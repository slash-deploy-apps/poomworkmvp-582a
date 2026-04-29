import { Link, redirect, useLoaderData } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { eq, desc, and, or } from 'drizzle-orm';
import { Send } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { db } from '~/lib/db.server';
import { messages, user, jobs } from '~/db/schema';
import { auth } from '~/lib/auth.server';

export const meta: MetaFunction = () => [{ title: '메시지 - poomwork' }];

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return redirect('/login');
  const url = new URL(request.url);
  const jobId = url.searchParams.get('jobId');
  const peerId = url.searchParams.get('peerId');

  const allMessages = await db.select({
    id: messages.id, content: messages.content, createdAt: messages.createdAt,
    senderId: messages.senderId, receiverId: messages.receiverId,
    jobId: messages.jobId, isRead: messages.isRead,
    peerName: user.name, peerEmail: user.email, peerImage: user.image,
  })
    .from(messages)
    .leftJoin(user, or(eq(messages.senderId, user.id), eq(messages.receiverId, user.id)))
    .where(or(eq(messages.senderId, session.user.id), eq(messages.receiverId, session.user.id)))
    .orderBy(desc(messages.createdAt));

  const conversations: Record<string, any> = {};
  for (const m of allMessages) {
    const peer = m.senderId === session.user.id ? m.receiverId : m.senderId;
    if (!conversations[peer]) {
      conversations[peer] = { peerId: peer, peerName: m.peerName || m.peerEmail, peerImage: m.peerImage, lastMessage: m.content, lastAt: m.createdAt, unread: 0 };
    }
    if (!m.isRead && m.receiverId === session.user.id) {
      conversations[peer].unread++;
    }
  }

  let activeMessages: any[] = [];
  let peerInfo: any = null;
  let jobInfo: any = null;
  if (peerId) {
    activeMessages = await db.select({
      id: messages.id, content: messages.content, createdAt: messages.createdAt,
      senderId: messages.senderId,
    })
      .from(messages)
      .where(and(
        or(eq(messages.senderId, session.user.id), eq(messages.receiverId, session.user.id)),
        or(eq(messages.senderId, peerId), eq(messages.receiverId, peerId)),
      ))
      .orderBy(desc(messages.createdAt)).limit(50);
    const peer = await db.select().from(user).where(eq(user.id, peerId)).limit(1);
    peerInfo = peer[0] || null;
    if (jobId) {
      const job = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
      jobInfo = job[0] || null;
    }
  }

  return { user: session.user, conversations: Object.values(conversations), activeMessages: activeMessages.reverse(), peerInfo, jobInfo, activePeerId: peerId, activeJobId: jobId };
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return redirect('/login');
  const formData = await request.formData();
  const receiverId = formData.get('receiverId') as string;
  const content = formData.get('content') as string;
  const jobId = formData.get('jobId') as string;
  await db.insert(messages).values({ senderId: session.user.id, receiverId, content, jobId: jobId || null });
  return null;
}

export default function Messages() {
  const data = useLoaderData<typeof loader>();
  return (
    <div className='min-h-screen bg-[#F4F1FA]'>
      <div className='container mx-auto px-4 py-8 max-w-5xl'>
        <h1 className='text-2xl font-bold text-[#332F3A] mb-6'>메시지</h1>
        <div className='grid md:grid-cols-3 gap-6'>
          <div className='md:col-span-1 space-y-2'>
            <div className='bg-[#EDE9FE] rounded-[32px] p-4'>
              <h2 className='text-sm font-bold text-[#635F69] mb-3'>대화 목록</h2>
              {data.conversations.length === 0 ? (
                <p className='text-sm text-[#635F69] py-4 text-center'>아직 대화가 없습니다</p>
              ) : (
                <div className='space-y-2'>
                  {data.conversations.map((c: any) => (
                    <Link key={c.peerId} to={`/messages?peerId=${c.peerId}`}
                      className={`block p-3 rounded-[24px] transition-all duration-200 ${data.activePeerId === c.peerId ? 'bg-[#EDE9FE]' : 'hover:bg-[#EDE9FE]'}`}
                    >
                      <div className='flex items-center gap-2'>
                        <div className='w-8 h-8 rounded-[20px] bg-[#EDE9FE] flex items-center justify-center text-[#7C3AED] text-xs font-semibold'>
                          {(c.peerName || '?')[0]}
                        </div>
                        <div className='flex-1 min-w-0'>
                          <div className='text-sm font-medium truncate'>{c.peerName}</div>
                          <div className='text-xs text-[#635F69] truncate'>{c.lastMessage}</div>
                        </div>
                        {c.unread > 0 && <span className='bg-[#7C3AED] text-white text-xs rounded-[20px] w-5 h-5 flex items-center justify-center'>{c.unread}</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className='md:col-span-2'>
            {data.peerInfo ? (
              <div className='bg-[#EDE9FE] rounded-[32px] overflow-hidden flex flex-col h-[600px]'>
                <div className='p-4 border-b border-[#EDE9FE] flex items-center gap-3'>
                  <div className='w-10 h-10 rounded-[20px] bg-[#EDE9FE] flex items-center justify-center text-[#7C3AED] font-semibold'>
                    {(data.peerInfo.name || '?')[0]}
                  </div>
                  <div>
                    <div className='font-medium'>{data.peerInfo.name}</div>
                    {data.jobInfo && <div className='text-xs text-[#635F69]'>일거리: {data.jobInfo.title}</div>}
                  </div>
                </div>
                <div className='flex-1 overflow-y-auto p-4 space-y-3'>
                  {(data.activeMessages as any[])?.map((m: any) => {
                    const isMe = m.senderId === data.user.id;
                    return (
                      <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] rounded-[24px] px-4 py-2 ${isMe ? 'bg-[#7C3AED] text-white' : 'bg-white text-[#332F3A]'}`}>
                          <p className='text-sm'>{m.content}</p>
                          <p className={`text-xs mt-1 ${isMe ? 'text-purple-200' : 'text-[#635F69]'}`}>{new Date(m.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <form method='post' className='p-4 border-t border-[#EDE9FE] flex gap-2'>
                  <input type='hidden' name='receiverId' value={data.activePeerId || ''} />
                  {data.activeJobId && <input type='hidden' name='jobId' value={data.activeJobId} />}
                  <Input name='content' placeholder='메시지를 입력하세요' required className='flex-1 bg-[#EDE9FE] rounded-[20px] border-0 h-10 px-4' />
                  <Button type='submit' className='bg-[#7C3AED] rounded-[20px] h-10 w-10 p-0 hover:bg-#7C3AED active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200'>
                    <Send className='h-4 w-4' />
                  </Button>
                </form>
              </div>
            ) : (
              <div className='bg-[#EDE9FE] rounded-[32px] h-[600px] flex items-center justify-center'>
                <p className='text-[#635F69]'>대화를 선택하세요</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
