import { redirect, useLoaderData } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { eq, desc, sql } from 'drizzle-orm';
import { Users, Briefcase, BookOpen, CreditCard } from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { db } from '~/lib/db.server';
import { user, jobs, courses, payments } from '~/db/schema';
import { auth } from '~/lib/auth.server';
import { useState } from 'react';

export const meta: MetaFunction = () => [{ title: '관리자 - poomwork' }];

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user || session.user.role !== 'admin') return redirect('/dashboard');
  const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(user);
  const [jobCount] = await db.select({ count: sql<number>`count(*)` }).from(jobs);
  const [courseCount] = await db.select({ count: sql<number>`count(*)` }).from(courses);
  const [revenue] = await db.select({ total: sql<number>`coalesce(sum(${payments.amount}), 0)` }).from(payments).where(eq(payments.status, 'completed'));
  const allUsers = await db.select().from(user).orderBy(desc(user.createdAt)).limit(50);
  const allJobs = await db.select({ id: jobs.id, title: jobs.title, status: jobs.status, applicationCount: jobs.applicationCount, createdAt: jobs.createdAt, clientName: user.name })
    .from(jobs).leftJoin(user, eq(jobs.clientId, user.id)).orderBy(desc(jobs.createdAt)).limit(50);
  const allCourses = await db.select({ id: courses.id, title: courses.title, price: courses.price, status: courses.status, enrollmentCount: courses.enrollmentCount, instructorName: user.name })
    .from(courses).leftJoin(user, eq(courses.instructorId, user.id)).orderBy(desc(courses.createdAt)).limit(50);
  const allPaymentsRaw = await db.select({
    id: payments.id,
    amount: payments.amount,
    type: payments.type,
    status: payments.status,
    paymentMethod: payments.tossPaymentMethod,
    createdAt: payments.createdAt,
    payerId: payments.payerId,
    payerName: user.name,
    payerEmail: user.email,
    courseId: payments.referenceId,
  })
  .from(payments)
  .leftJoin(user, eq(payments.payerId, user.id))
  .orderBy(desc(payments.createdAt)).limit(100);

  const courseIds = allPaymentsRaw.filter(p => p.type === 'course_purchase').map(p => p.courseId).filter(Boolean);
  const relevantCourses = courseIds.length > 0 ? await db.select({ id: courses.id, title: courses.title }).from(courses).where(sql`${courses.id} IN (${sql.join(courseIds.map(id => sql`${id}`), sql`, `)})`) : [];
  const courseMap = Object.fromEntries(relevantCourses.map(c => [c.id, c.title]));
  const allPayments = allPaymentsRaw.map(p => ({
    ...p,
    courseTitle: p.type === 'course_purchase' ? courseMap[p.courseId as string] : null,
  }));
  return { stats: { users: userCount?.count ?? 0, jobs: jobCount?.count ?? 0, courses: courseCount?.count ?? 0, revenue: revenue?.total ?? 0 }, allUsers, allJobs, allCourses, allPayments };
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user || session.user.role !== 'admin') return redirect('/dashboard');
  const formData = await request.formData();
  const actionType = formData.get('_action') as string;
  if (actionType === 'updateRole') {
    const userId = formData.get('userId') as string;
    const role = formData.get('role') as string;
    await db.update(user).set({ role }).where(eq(user.id, userId));
  } else if (actionType === 'updateJobStatus') {
    const jobId = formData.get('jobId') as string;
    const status = formData.get('status') as string;
    await db.update(jobs).set({ status }).where(eq(jobs.id, jobId));
  } else if (actionType === 'updateCourseStatus') {
    const courseId = formData.get('courseId') as string;
    const status = formData.get('status') as string;
    await db.update(courses).set({ status }).where(eq(courses.id, courseId));
  } else if (actionType === 'updateCoursePrice') {
    const courseId = formData.get('courseId') as string;
    const price = Number(formData.get('price')) || 0;
    await db.update(courses).set({ price }).where(eq(courses.id, courseId));
  } else if (actionType === 'updateCoursePrice') {
    const courseId = formData.get('courseId') as string;
    const price = Number(formData.get('price')) || 0;
    await db.update(courses).set({ price }).where(eq(courses.id, courseId));
  } else if (actionType === 'updateUserAccount') {
    const userId = formData.get('userId') as string;
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const role = formData.get('role') as string;
    await db.update(user).set({ name, email, role }).where(eq(user.id, userId));
  } else if (actionType === 'softDeleteUser') {
    const userId = formData.get('userId') as string;
    const target = await db.select({ role: user.role }).from(user).where(eq(user.id, userId)).limit(1);
    if (target[0]?.role === 'admin') return null;
    await db.update(user).set({ status: 'deleted' as any }).where(eq(user.id, userId));
  } else if (actionType === 'restoreUser') {
    const userId = formData.get('userId') as string;
    await db.update(user).set({ status: 'active' as any }).where(eq(user.id, userId));
  } else if (actionType === 'softDeleteJob') {
    const jobId = formData.get('jobId') as string;
    await db.update(jobs).set({ status: 'deleted' }).where(eq(jobs.id, jobId));
  } else if (actionType === 'restoreJob') {
    const jobId = formData.get('jobId') as string;
    await db.update(jobs).set({ status: 'open' }).where(eq(jobs.id, jobId));
  } else if (actionType === 'softDeleteCourse') {
    const courseId = formData.get('courseId') as string;
    await db.update(courses).set({ status: 'deleted' }).where(eq(courses.id, courseId));
  } else if (actionType === 'restoreCourse') {
    const courseId = formData.get('courseId') as string;
    await db.update(courses).set({ status: 'draft' }).where(eq(courses.id, courseId));
  } else if (actionType === 'releaseEscrow') {
    const paymentId = formData.get('paymentId') as string;
    await db.update(payments).set({ status: 'completed', escrowReleasedAt: new Date() }).where(eq(payments.id, paymentId));
  }
  return null;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: '대기', color: 'bg-yellow-100 text-yellow-700' },
  DONE: { label: '완료', color: 'bg-green-100 text-green-700' },
  FAILED: { label: '실패', color: 'bg-red-100 text-red-700' },
  CANCELLED: { label: '취소', color: 'bg-gray-100 text-gray-700' },
  pending: { label: '대기', color: 'bg-yellow-100 text-yellow-700' },
  escrow: { label: '에스크로', color: 'bg-[#EDE9FE] text-blue-700' },
  completed: { label: '완료', color: 'bg-[#EDE9FE] text-[#332F3A]' },
  refunded: { label: '환불', color: 'bg-red-100 text-red-700' },
  cancelled: { label: '취소', color: 'bg-gray-100 text-[#332F3A]' },
};

export default function Admin() {
  const { stats, allUsers, allJobs, allCourses, allPayments } = useLoaderData<typeof loader>();
  const [statusFilter, setStatusFilter] = useState<string>('전체');

  const filteredPayments = statusFilter === '전체' ? allPayments : allPayments.filter((p: any) => p.status === statusFilter);
  const statusCounts = {
    '전체': allPayments.length,
    'PENDING': allPayments.filter((p: any) => p.status === 'PENDING').length,
    'DONE': allPayments.filter((p: any) => p.status === 'DONE').length,
    'FAILED': allPayments.filter((p: any) => p.status === 'FAILED').length,
    'CANCELLED': allPayments.filter((p: any) => p.status === 'CANCELLED').length,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className='text-3xl font-bold mb-8'>관리자 패널</h1>
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-8'>
        <div className='bg-[#7C3AED] text-white rounded-lg p-6 text-center hover:scale-[1.02] transition-all duration-200 ease-in-out'><Users className='h-8 w-8 text-purple-100 mx-auto mb-2' /><div className='text-2xl font-bold'>{stats.users}</div><div className='text-sm text-purple-100'>사용자</div></div>
        <div className='bg-[#DB2777] text-white rounded-lg p-6 text-center hover:scale-[1.02] transition-all duration-200 ease-in-out'><Briefcase className='h-8 w-8 text-purple-100 mx-auto mb-2' /><div className='text-2xl font-bold'>{stats.jobs}</div><div className='text-sm text-purple-100'>일거리</div></div>
        <div className='bg-purple-400 text-white rounded-lg p-6 text-center hover:scale-[1.02] transition-all duration-200 ease-in-out'><BookOpen className='h-8 w-8 text-purple-100 mx-auto mb-2' /><div className='text-2xl font-bold'>{stats.courses}</div><div className='text-sm text-purple-100'>강좌</div></div>
        <div className='bg-[#332F3A] text-white rounded-lg p-6 text-center hover:scale-[1.02] transition-all duration-200 ease-in-out'><CreditCard className='h-8 w-8 text-purple-100 mx-auto mb-2' /><div className='text-2xl font-bold'>{new Intl.NumberFormat('ko-KR').format(stats.revenue)}원</div><div className='text-sm text-purple-100'>총 매출</div></div>
      </div>

      <Tabs defaultValue='users'>
        <TabsList className='mb-6 bg-gray-100 rounded-[20px]'><TabsTrigger value='users'>사용자</TabsTrigger><TabsTrigger value='jobs'>일거리</TabsTrigger><TabsTrigger value='courses'>강좌</TabsTrigger><TabsTrigger value='payments'>결제</TabsTrigger></TabsList>

        <TabsContent value='users'>
          <div className='bg-[#EDE9FE] rounded-[32px] overflow-hidden'>
            <table className='w-full'><thead className='bg-gray-100'><tr><th className='text-left p-3 text-sm'>이름</th><th className='text-left p-3 text-sm'>이메일</th><th className='text-left p-3 text-sm'>역할</th><th className='text-left p-3 text-sm'>평점</th><th className='p-3 text-sm'>변경</th></tr></thead>
            <tbody>
              {allUsers.map((u) => (
                <tr key={u.id} className={`bg-white ${u.status === 'deleted' ? 'opacity-60' : ''}`}>
                  <td className='p-3'>
                    <form method='post' className='flex gap-1'>
                      <input type='hidden' name='userId' value={u.id} />
                      <input type='hidden' name='_action' value='updateUserAccount' />
                      <input name='name' defaultValue={u.name || ''} className='bg-[#EDE9FE] rounded-t-xl border-0 border-b-2 border-gray-400 text-xs px-2 py-1 w-24' />
                    </form>
                  </td>
                  <td className='p-3 text-sm text-[#635F69]'>
                    <form method='post' className='flex gap-1'>
                      <input type='hidden' name='userId' value={u.id} />
                      <input type='hidden' name='_action' value='updateUserAccount' />
                      <input name='email' defaultValue={u.email} className='bg-[#EDE9FE] rounded-t-xl border-0 border-b-2 border-gray-400 text-xs px-2 py-1 w-40' />
                    </form>
                  </td>
                  <td className='p-3'>
                    <form method='post' className='flex gap-1'>
                      <input type='hidden' name='userId' value={u.id} />
                      <input type='hidden' name='_action' value='updateUserAccount' />
                      <select name='role' className='bg-[#EDE9FE] rounded-t-xl border-0 border-b-2 border-gray-400 text-xs px-2 py-1' defaultValue={u.role}>
                        <option value='worker'>worker</option>
                        <option value='client'>client</option>
                        <option value='admin'>admin</option>
                      </select>
                      <Button type='submit' size='sm' variant='outline' className='text-xs h-6 rounded-[20px] hover:bg-#7C3AED active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200 ease-in-out'>변경</Button>
                    </form>
                  </td>
                  <td className='p-3'>{u.rating > 0 ? u.rating : '-'}</td>
                  <td className='p-3'>
                    <div className='flex gap-1 flex-wrap'>
                      {u.status === 'deleted' && <Badge className='bg-red-100 text-red-700 rounded-[20px] text-xs'>삭제됨</Badge>}
                      {u.role !== 'admin' && u.status !== 'deleted' && (
                        <form method='post' onSubmit={(e) => { if (!confirm('정말 삭제하시겠습니까?')) e.preventDefault(); }}>
                          <input type='hidden' name='userId' value={u.id} />
                          <input type='hidden' name='_action' value='softDeleteUser' />
                          <Button type='submit' size='sm' variant='outline' className='text-xs h-6 rounded-[20px] border-red-300 text-red-600 hover:bg-red-50 active:scale-[0.92] transition-all duration-200'>삭제</Button>
                        </form>
                      )}
                      {u.status === 'deleted' && (
                        <form method='post'>
                          <input type='hidden' name='userId' value={u.id} />
                          <input type='hidden' name='_action' value='restoreUser' />
                          <Button type='submit' size='sm' variant='outline' className='text-xs h-6 rounded-[20px] border-green-300 text-green-600 hover:bg-green-50 active:scale-[0.92] transition-all duration-200'>복구</Button>
                        </form>
                      )}
                      <a href={`/forgot-password?email=${encodeURIComponent(u.email)}`} className='inline-flex items-center px-2 py-1 rounded-[20px] border border-gray-300 text-xs text-[#635F69] hover:bg-gray-50 active:scale-[0.92] transition-all duration-200'>비밀번호 재설정</a>
                    </div>
                  </td>
                </tr>
              ))}

            </tbody></table>
          </div>
        </TabsContent>

        <TabsContent value='jobs'>
          <div className='bg-[#EDE9FE] rounded-[32px] overflow-hidden'>
            <table className='w-full'><thead className='bg-gray-100'><tr><th className='text-left p-3 text-sm'>제목</th><th className='text-left p-3 text-sm'>의뢰자</th><th className='text-left p-3 text-sm'>상태</th><th className='text-left p-3 text-sm'>지원수</th><th className='p-3 text-sm'>변경</th></tr></thead>
            <tbody>
              {allJobs.map((j) => (
                <tr key={j.id} className={`bg-white ${j.status === 'deleted' ? 'opacity-60' : ''}`}><td className='p-3'>{j.title}</td><td className='p-3 text-sm'>{j.clientName || '-'}</td><td className='p-3'><Badge className={`rounded-[20px] ${j.status === 'open' ? 'bg-emerald-100 text-emerald-700' : j.status === 'deleted' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-[#332F3A]'}`}>{j.status}</Badge></td><td className='p-3'>{j.applicationCount}</td>
                  <td className='p-3'><div className='flex gap-1 flex-wrap'><form method='post' className='flex gap-1'><input type='hidden' name='jobId' value={j.id} /><input type='hidden' name='_action' value='updateJobStatus' /><select name='status' className='bg-[#EDE9FE] rounded-t-xl border-0 border-b-2 border-gray-400 text-xs px-2 py-1' defaultValue={j.status}><option value='open'>open</option><option value='in_progress'>in_progress</option><option value='completed'>completed</option><option value='closed'>closed</option></select><Button type='submit' size='sm' variant='outline' className='text-xs h-6 rounded-[20px] hover:bg-#7C3AED active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200 ease-in-out'>변경</Button></form>
                  {j.status !== 'deleted' && (<form method='post' onSubmit={(e) => { if (!confirm('정말 삭제하시겠습니까?')) e.preventDefault(); }}><input type='hidden' name='jobId' value={j.id} /><input type='hidden' name='_action' value='softDeleteJob' /><Button type='submit' size='sm' variant='outline' className='text-xs h-6 rounded-[20px] border-red-300 text-red-600 hover:bg-red-50 active:scale-[0.92] transition-all duration-200'>삭제</Button></form>)}
                  {j.status === 'deleted' && (<form method='post'><input type='hidden' name='jobId' value={j.id} /><input type='hidden' name='_action' value='restoreJob' /><Button type='submit' size='sm' variant='outline' className='text-xs h-6 rounded-[20px] border-green-300 text-green-600 hover:bg-green-50 active:scale-[0.92] transition-all duration-200'>복구</Button></form>)}
                  </div></td></tr>
              ))}
            </tbody></table>
          </div>
        </TabsContent>

        <TabsContent value='courses'>
          <div className='bg-[#EDE9FE] rounded-[32px] overflow-hidden'>
            <table className='w-full'><thead className='bg-gray-100'><tr><th className='text-left p-3 text-sm'>제목</th><th className='text-left p-3 text-sm'>강사</th><th className='text-left p-3 text-sm'>가격</th><th className='text-left p-3 text-sm'>수강생</th><th className='text-left p-3 text-sm'>상태</th><th className='p-3 text-sm'>변경</th></tr></thead>
            <tbody>
              {allCourses.map((c) => (
                <tr key={c.id} className={`bg-white ${c.status === 'deleted' ? 'opacity-60' : ''}`}><td className='p-3'>{c.title}</td><td className='p-3 text-sm'>{c.instructorName || '-'}</td><td className='p-3'><form method='post' className='flex gap-1 items-center'><input type='hidden' name='courseId' value={c.id} /><input type='hidden' name='_action' value='updateCoursePrice' /><input name='price' type='number' defaultValue={c.price} className='bg-[#EDE9FE] rounded-t-xl border-0 border-b-2 border-gray-400 text-xs px-2 py-1 w-20' /><span className='text-xs text-[#635F69]'>원</span><Button type='submit' size='sm' variant='outline' className='text-xs h-6 rounded-[20px] hover:bg-#7C3AED active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200 ease-in-out'>변경</Button></form></td><td className='p-3'>{c.enrollmentCount}</td><td className='p-3'><Badge variant='outline' className={`rounded-[20px] ${c.status === 'deleted' ? 'bg-red-100 text-red-700' : ''}`}>{c.status}</Badge></td><td className='p-3'><div className='flex gap-1 flex-wrap'><form method='post'><input type='hidden' name='courseId' value={c.id} /><input type='hidden' name='_action' value='softDeleteCourse' /><Button type='submit' size='sm' variant='destructive' className='text-xs h-6 rounded-[20px] bg-red-500 hover:bg-red-600' onClick={(e) => { if (!confirm('삭제하시겠습니까?')) e.preventDefault(); }}>삭제</Button></form>{c.status === 'deleted' && <form method='post'><input type='hidden' name='courseId' value={c.id} /><input type='hidden' name='_action' value='restoreCourse' /><Button type='submit' size='sm' variant='outline' className='text-xs h-6 rounded-[20px]'>복구</Button></form>}</div></td></tr>
              ))}
            </tbody></table>
          </div>
        </TabsContent>

        <TabsContent value='payments'>
          <div className='mb-4 flex gap-2 flex-wrap'>
            {(['전체', 'PENDING', 'DONE', 'FAILED', 'CANCELLED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-[20px] text-sm font-medium transition-all duration-200 ${statusFilter === s ? 'bg-[#7C3AED] text-white' : 'bg-white text-[#332F3A] hover:bg-[#EDE9FE]'}`}
              >
                {s} {statusCounts[s] > 0 && <span className='ml-1 text-xs opacity-80'>({statusCounts[s]})</span>}
              </button>
            ))}
          </div>
          <div className='bg-[#EDE9FE] rounded-[32px] overflow-hidden'>
            <table className='w-full'><thead className='bg-gray-100'><tr><th className='text-left p-3 text-sm'>결제자</th><th className='text-left p-3 text-sm'>강좌</th><th className='text-left p-3 text-sm'>금액</th><th className='text-left p-3 text-sm'>유형</th><th className='text-left p-3 text-sm'>수단</th><th className='text-left p-3 text-sm'>상태</th><th className='p-3 text-sm'>액션</th></tr></thead>
            <tbody>
            {filteredPayments.length === 0 ? <tr><td colSpan={7} className='p-4 text-center text-[#635F69]'>결제 내역이 없습니다</td></tr> : filteredPayments.map((p: any) => (
              <tr key={p.id} className='bg-white'>
                <td className='p-3 text-sm'><div>{p.payerName || '-'}</div><div className='text-xs text-[#635F69]'>{p.payerEmail}</div></td>
                <td className='p-3 text-sm'>{p.courseTitle || (p.type === 'job_payment' ? '일거리 결제' : p.type)}</td>
                <td className='p-3 font-medium'>{new Intl.NumberFormat('ko-KR').format(p.amount)}원</td>
                <td className='p-3'><Badge variant='outline' className='rounded-[20px]'>{p.type}</Badge></td>
                <td className='p-3 text-sm'>{p.paymentMethod || 'N/A'}</td>
                <td className='p-3'>{statusLabels[p.status] && <Badge className={`rounded-[20px] ${statusLabels[p.status]!.color}`}>{statusLabels[p.status]!.label}</Badge>}</td>
                <td className='p-3'>
                  {p.status === 'DONE' && (
                    <form method='post' action='/api/payment/refund'>
                      <input type='hidden' name='paymentId' value={p.id} />
                      <input type='hidden' name='reason' value='관리자 환불' />
                      <Button type='submit' size='sm' className='bg-[#DB2777] hover:bg-[#DB2777] active:scale-[0.92] transition-all duration-200 ease-in-out rounded-[20px] text-xs h-6'>환불 승인</Button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};