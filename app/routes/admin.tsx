import { redirect, useLoaderData } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { eq, desc, sql } from 'drizzle-orm';
import { Users, Briefcase, BookOpen, CreditCard } from 'lucide-react';
import { Card, CardContent } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { db } from '~/lib/db.server';
import { user, jobs, courses, payments } from '~/db/schema';
import { auth } from '~/lib/auth.server';

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
  const allPayments = await db.select({ id: payments.id, amount: payments.amount, type: payments.type, status: payments.status, paymentMethod: payments.paymentMethod, createdAt: payments.createdAt, payerEmail: user.email })
    .from(payments).leftJoin(user, eq(payments.payerId, user.id)).orderBy(desc(payments.createdAt)).limit(50);
  return { stats: { users: userCount.count, jobs: jobCount.count, courses: courseCount.count, revenue: revenue.total }, allUsers, allJobs, allCourses, allPayments };
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
  } else if (actionType === 'releaseEscrow') {
    const paymentId = formData.get('paymentId') as string;
    await db.update(payments).set({ status: 'completed', escrowReleasedAt: new Date() }).where(eq(payments.id, paymentId));
  }
  return null;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: '대기', color: 'bg-yellow-100 text-yellow-700' },
  escrow: { label: '에스크로', color: 'bg-blue-100 text-blue-700' },
  completed: { label: '완료', color: 'bg-green-100 text-green-700' },
  refunded: { label: '환불', color: 'bg-red-100 text-red-700' },
  cancelled: { label: '취소', color: 'bg-gray-100 text-gray-700' },
};

export default function Admin() {
  const { stats, allUsers, allJobs, allCourses, allPayments } = useLoaderData<typeof loader>();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">관리자 패널</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card><CardContent className="p-6 text-center"><Users className="h-8 w-8 text-blue-600 mx-auto mb-2" /><div className="text-2xl font-bold">{stats.users}</div><div className="text-sm text-gray-500">사용자</div></CardContent></Card>
        <Card><CardContent className="p-6 text-center"><Briefcase className="h-8 w-8 text-green-600 mx-auto mb-2" /><div className="text-2xl font-bold">{stats.jobs}</div><div className="text-sm text-gray-500">일거리</div></CardContent></Card>
        <Card><CardContent className="p-6 text-center"><BookOpen className="h-8 w-8 text-purple-600 mx-auto mb-2" /><div className="text-2xl font-bold">{stats.courses}</div><div className="text-sm text-gray-500">강좌</div></CardContent></Card>
        <Card><CardContent className="p-6 text-center"><CreditCard className="h-8 w-8 text-orange-600 mx-auto mb-2" /><div className="text-2xl font-bold">{new Intl.NumberFormat('ko-KR').format(stats.revenue)}원</div><div className="text-sm text-gray-500">총 매출</div></CardContent></Card>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="mb-6"><TabsTrigger value="users">사용자</TabsTrigger><TabsTrigger value="jobs">일거리</TabsTrigger><TabsTrigger value="courses">강좌</TabsTrigger><TabsTrigger value="payments">결제</TabsTrigger></TabsList>

        <TabsContent value="users">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full"><thead className="bg-gray-50"><tr><th className="text-left p-3 text-sm">이름</th><th className="text-left p-3 text-sm">이메일</th><th className="text-left p-3 text-sm">역할</th><th className="text-left p-3 text-sm">평점</th><th className="p-3 text-sm">변경</th></tr></thead>
            <tbody>
              {allUsers.map((u) => (
                <tr key={u.id} className="border-t"><td className="p-3">{u.name || '-'}</td><td className="p-3 text-sm text-gray-500">{u.email}</td><td className="p-3"><Badge variant="outline">{u.role}</Badge></td><td className="p-3">{u.rating > 0 ? u.rating : '-'}</td>
                  <td className="p-3"><form method="post" className="flex gap-1"><input type="hidden" name="userId" value={u.id} /><input type="hidden" name="_action" value="updateRole" /><select name="role" className="text-xs border rounded px-1 py-0.5" defaultValue={u.role}><option value="worker">worker</option><option value="client">client</option><option value="admin">admin</option></select><Button type="submit" size="sm" variant="outline" className="text-xs h-6">변경</Button></form></td></tr>
              ))}
            </tbody></table>
          </div>
        </TabsContent>

        <TabsContent value="jobs">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full"><thead className="bg-gray-50"><tr><th className="text-left p-3 text-sm">제목</th><th className="text-left p-3 text-sm">의뢰자</th><th className="text-left p-3 text-sm">상태</th><th className="text-left p-3 text-sm">지원수</th><th className="p-3 text-sm">변경</th></tr></thead>
            <tbody>
              {allJobs.map((j) => (
                <tr key={j.id} className="border-t"><td className="p-3">{j.title}</td><td className="p-3 text-sm">{j.clientName || '-'}</td><td className="p-3"><Badge className={j.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>{j.status}</Badge></td><td className="p-3">{j.applicationCount}</td>
                  <td className="p-3"><form method="post" className="flex gap-1"><input type="hidden" name="jobId" value={j.id} /><input type="hidden" name="_action" value="updateJobStatus" /><select name="status" className="text-xs border rounded px-1 py-0.5" defaultValue={j.status}><option value="open">open</option><option value="in_progress">in_progress</option><option value="completed">completed</option><option value="closed">closed</option></select><Button type="submit" size="sm" variant="outline" className="text-xs h-6">변경</Button></form></td></tr>
              ))}
            </tbody></table>
          </div>
        </TabsContent>

        <TabsContent value="courses">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full"><thead className="bg-gray-50"><tr><th className="text-left p-3 text-sm">제목</th><th className="text-left p-3 text-sm">강사</th><th className="text-left p-3 text-sm">가격</th><th className="text-left p-3 text-sm">수강생</th><th className="text-left p-3 text-sm">상태</th><th className="p-3 text-sm">변경</th></tr></thead>
            <tbody>
              {allCourses.map((c) => (
                <tr key={c.id} className="border-t"><td className="p-3">{c.title}</td><td className="p-3 text-sm">{c.instructorName || '-'}</td><td className="p-3">{c.price === 0 ? '무료' : `${new Intl.NumberFormat('ko-KR').format(c.price)}원`}</td><td className="p-3">{c.enrollmentCount}</td><td className="p-3"><Badge variant="outline">{c.status}</Badge></td>
                  <td className="p-3"><form method="post" className="flex gap-1"><input type="hidden" name="courseId" value={c.id} /><input type="hidden" name="_action" value="updateCourseStatus" /><select name="status" className="text-xs border rounded px-1 py-0.5" defaultValue={c.status}><option value="draft">draft</option><option value="published">published</option><option value="archived">archived</option></select><Button type="submit" size="sm" variant="outline" className="text-xs h-6">변경</Button></form></td></tr>
              ))}
            </tbody></table>
          </div>
        </TabsContent>

        <TabsContent value="payments">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full"><thead className="bg-gray-50"><tr><th className="text-left p-3 text-sm">결제자</th><th className="text-left p-3 text-sm">금액</th><th className="text-left p-3 text-sm">유형</th><th className="text-left p-3 text-sm">수단</th><th className="text-left p-3 text-sm">상태</th><th className="p-3 text-sm">액션</th></tr></thead>
            <tbody>
              {allPayments.map((p) => (
                <tr key={p.id} className="border-t"><td className="p-3 text-sm">{p.payerEmail || '-'}</td><td className="p-3 font-medium">{new Intl.NumberFormat('ko-KR').format(p.amount)}원</td><td className="p-3"><Badge variant="outline">{p.type}</Badge></td><td className="p-3 text-sm">{p.paymentMethod}</td>
                  <td className="p-3">{statusLabels[p.status] && <Badge className={statusLabels[p.status].color}>{statusLabels[p.status].label}</Badge>}</td>
                  <td className="p-3">{p.status === 'escrow' && <form method="post"><input type="hidden" name="paymentId" value={p.id} /><input type="hidden" name="_action" value="releaseEscrow" /><Button type="submit" size="sm" className="bg-green-600 text-xs h-6">해제</Button></form>}</td></tr>
              ))}
            </tbody></table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}