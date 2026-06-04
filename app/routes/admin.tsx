import { redirect, useLoaderData } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { eq, desc, sql, or, inArray } from 'drizzle-orm';
import { Users, Briefcase, BookOpen, CreditCard, ShieldCheck, ExternalLink, Scale } from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { db } from '~/lib/db.server';
import { user, jobs, courses, payments, certifications, disputes, contracts } from '~/db/schema';
import { auth } from '~/lib/auth.server';
import { resolveDispute } from '~/lib/dispute.server';
import { useState } from 'react';

export const meta: MetaFunction = () => [{ title: '관리자 - poomwork' }];

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user || session.user.role !== 'admin') return redirect('/dashboard');
  const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(user);
  const [jobCount] = await db.select({ count: sql<number>`count(*)` }).from(jobs);
  const [courseCount] = await db.select({ count: sql<number>`count(*)` }).from(courses);
  const [revenue] = await db.select({ total: sql<number>`coalesce(sum(${payments.amount}), 0)` }).from(payments).where(or(eq(payments.status, 'DONE'), eq(payments.status, 'escrow_released')));
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
    paymentProvider: payments.paymentProvider,
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
  const pendingCertsRaw = await db
    .select()
    .from(certifications)
    .leftJoin(user, eq(certifications.userId, user.id))
    .where(eq(certifications.status, 'pending'))
    .orderBy(desc(certifications.createdAt))
    .limit(50);
  const pendingCerts = pendingCertsRaw.map((row) => ({
    ...row.certifications,
    userName: row.user?.name ?? null,
    userEmail: row.user?.email ?? null,
  }));

  const pendingDisputesRaw = await db
    .select()
    .from(disputes)
    .leftJoin(user, eq(disputes.raisedBy, user.id))
    .leftJoin(contracts, eq(disputes.contractId, contracts.id))
    .where(inArray(disputes.status, ['open', 'reviewing']))
    .orderBy(desc(disputes.createdAt))
    .limit(50);

  const pendingDisputes = pendingDisputesRaw.map((row) => ({
    ...row.disputes,
    raiserName: row.user?.name ?? null,
    raiserEmail: row.user?.email ?? null,
    contractAmount: row.contracts?.amount ?? null,
  }));

  return { stats: { users: userCount?.count ?? 0, jobs: jobCount?.count ?? 0, courses: courseCount?.count ?? 0, revenue: revenue?.total ?? 0 }, allUsers, allJobs, allCourses, allPayments, pendingCerts, pendingDisputes };
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
    await db.update(payments).set({ status: 'escrow_released', escrowReleasedAt: new Date() }).where(eq(payments.id, paymentId));
  } else if (actionType === 'resolveDispute') {
    const disputeId = formData.get('disputeId') as string;
    const resolution = formData.get('resolution') as 'refund_full' | 'refund_partial' | 'pay_worker' | 'cancel_dispute';
    const refundAmountStr = formData.get('refundAmount') as string | null;
    const adminNote = (formData.get('adminNote') as string) || undefined;
    const refundAmount = refundAmountStr ? parseInt(refundAmountStr, 10) : undefined;
    await resolveDispute({ disputeId, adminId: session.user.id, resolution, refundAmount, adminNote });
  } else if (actionType === 'approveCertification') {
    const certId = formData.get('certificationId') as string;
    await db.update(certifications).set({
      status: 'approved',
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
      reviewNote: null,
    }).where(eq(certifications.id, certId));
  } else if (actionType === 'rejectCertification') {
    const certId = formData.get('certificationId') as string;
    const reviewNote = (formData.get('reviewNote') as string) || '반려';
    await db.update(certifications).set({
      status: 'rejected',
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
      reviewNote,
    }).where(eq(certifications.id, certId));
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

const CERT_TYPE_LABELS: Record<string, string> = {
  license: '자격증',
  business: '사업자등록',
  education: '학력',
  identity: '신분확인',
};

const RESOLUTION_LABELS: Record<string, string> = {
  refund_full: '전액 환불',
  refund_partial: '부분 환불',
  pay_worker: '전문가 정산',
  cancel_dispute: '분쟁 취소',
};

export default function Admin() {
  const { stats, allUsers, allJobs, allCourses, allPayments, pendingCerts, pendingDisputes } = useLoaderData<typeof loader>();
  const [statusFilter, setStatusFilter] = useState<string>('전체');
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [disputeResolutions, setDisputeResolutions] = useState<Record<string, string>>({});
  const [disputeRefundAmounts, setDisputeRefundAmounts] = useState<Record<string, string>>({});
  const [disputeNotes, setDisputeNotes] = useState<Record<string, string>>({});

  const filteredPayments = statusFilter === '전체' ? allPayments : allPayments.filter((p: any) => p.status === statusFilter);
  const statusCounts = {
    '전체': allPayments.length,
    'PENDING': allPayments.filter((p: any) => p.status === 'PENDING').length,
    'escrow': allPayments.filter((p: any) => p.status === 'escrow').length,
    'escrow_released': allPayments.filter((p: any) => p.status === 'escrow_released').length,
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
        <TabsList className='mb-6 bg-gray-100 rounded-[20px]'>
          <TabsTrigger value='users'>사용자</TabsTrigger>
          <TabsTrigger value='jobs'>일거리</TabsTrigger>
          <TabsTrigger value='courses'>강좌</TabsTrigger>
          <TabsTrigger value='payments'>결제</TabsTrigger>
          <TabsTrigger value='certifications' className='flex items-center gap-1'>
            <ShieldCheck className='h-3.5 w-3.5' />인증 승인
            {pendingCerts.length > 0 && (
              <span className='ml-1 bg-[#DB2777] text-white text-xs rounded-full px-1.5 py-0.5 leading-none'>{pendingCerts.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value='disputes' className='flex items-center gap-1'>
            <Scale className='h-3.5 w-3.5' />분쟁 중재
            {pendingDisputes.length > 0 && (
              <span className='ml-1 bg-orange-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none'>{pendingDisputes.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value='users'>
          <div className='bg-[#EDE9FE] rounded-[32px] overflow-hidden'>
            <table className='w-full'><thead className='bg-gray-100'><tr><th className='text-left p-3 text-sm'>이름</th><th className='text-left p-3 text-sm'>이메일</th><th className='text-left p-3 text-sm'>역할</th><th className='text-left p-3 text-sm'>평점</th><th className='p-3 text-sm'>변경</th></tr></thead>
            <tbody>
              {allUsers.map((u) => (
                <tr key={u.id} className='bg-white'><td className='p-3'>{u.name || '-'}</td><td className='p-3 text-sm text-[#635F69]'>{u.email}</td><td className='p-3'><Badge variant='outline'>{u.role}</Badge></td><td className='p-3'>{u.rating > 0 ? u.rating : '-'}</td>
                  <td className='p-3'><form method='post' className='flex gap-1'><input type='hidden' name='userId' value={u.id} /><input type='hidden' name='_action' value='updateRole' /><select name='role' className='bg-[#EDE9FE] rounded-t-xl border-0 border-b-2 border-gray-400 text-xs px-2 py-1' defaultValue={u.role}><option value='worker'>worker</option><option value='client'>client</option><option value='admin'>admin</option></select><Button type='submit' size='sm' variant='outline' className='text-xs h-6 rounded-[20px] hover:bg-#7C3AED active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200 ease-in-out'>변경</Button></form></td></tr>
              ))}
            </tbody></table>
          </div>
        </TabsContent>

        <TabsContent value='jobs'>
          <div className='bg-[#EDE9FE] rounded-[32px] overflow-hidden'>
            <table className='w-full'><thead className='bg-gray-100'><tr><th className='text-left p-3 text-sm'>제목</th><th className='text-left p-3 text-sm'>의뢰자</th><th className='text-left p-3 text-sm'>상태</th><th className='text-left p-3 text-sm'>지원수</th><th className='p-3 text-sm'>변경</th></tr></thead>
            <tbody>
              {allJobs.map((j) => (
                <tr key={j.id} className='bg-white'><td className='p-3'>{j.title}</td><td className='p-3 text-sm'>{j.clientName || '-'}</td><td className='p-3'><Badge className={`rounded-[20px] ${j.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-[#332F3A]'}`}>{j.status}</Badge></td><td className='p-3'>{j.applicationCount}</td>
                  <td className='p-3'><form method='post' className='flex gap-1'><input type='hidden' name='jobId' value={j.id} /><input type='hidden' name='_action' value='updateJobStatus' /><select name='status' className='bg-[#EDE9FE] rounded-t-xl border-0 border-b-2 border-gray-400 text-xs px-2 py-1' defaultValue={j.status}><option value='open'>open</option><option value='in_progress'>in_progress</option><option value='completed'>completed</option><option value='closed'>closed</option></select><Button type='submit' size='sm' variant='outline' className='text-xs h-6 rounded-[20px] hover:bg-#7C3AED active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200 ease-in-out'>변경</Button></form></td></tr>
              ))}
            </tbody></table>
          </div>
        </TabsContent>

        <TabsContent value='courses'>
          <div className='bg-[#EDE9FE] rounded-[32px] overflow-hidden'>
            <table className='w-full'><thead className='bg-gray-100'><tr><th className='text-left p-3 text-sm'>제목</th><th className='text-left p-3 text-sm'>강사</th><th className='text-left p-3 text-sm'>가격</th><th className='text-left p-3 text-sm'>수강생</th><th className='text-left p-3 text-sm'>상태</th><th className='p-3 text-sm'>변경</th></tr></thead>
            <tbody>
              {allCourses.map((c) => (
                <tr key={c.id} className='bg-white'><td className='p-3'>{c.title}</td><td className='p-3 text-sm'>{c.instructorName || '-'}</td><td className='p-3'>{c.price === 0 ? '무료' : `${new Intl.NumberFormat('ko-KR').format(c.price)}원`}</td><td className='p-3'>{c.enrollmentCount}</td><td className='p-3'><Badge variant='outline' className='rounded-[20px]'>{c.status}</Badge></td>
                  <td className='p-3'><form method='post' className='flex gap-1'><input type='hidden' name='courseId' value={c.id} /><input type='hidden' name='_action' value='updateCourseStatus' /><select name='status' className='bg-[#EDE9FE] rounded-t-xl border-0 border-b-2 border-gray-400 text-xs px-2 py-1' defaultValue={c.status}><option value='draft'>draft</option><option value='published'>published</option><option value='archived'>archived</option></select><Button type='submit' size='sm' variant='outline' className='text-xs h-6 rounded-[20px] hover:bg-#7C3AED active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200 ease-in-out'>변경</Button></form></td></tr>
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
        <TabsContent value='certifications'>
          {pendingCerts.length === 0 ? (
            <div className='text-center py-12 text-[#635F69]'>
              <ShieldCheck className='h-12 w-12 mx-auto mb-3 text-[#7C3AED]/30' />
              <p>검토 대기 중인 인증이 없습니다</p>
            </div>
          ) : (
            <div className='space-y-4'>
              {pendingCerts.map((cert) => (
                <div key={cert.id} className='bg-[#EDE9FE] rounded-[24px] p-5'>
                  <div className='flex items-start justify-between gap-4'>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2 mb-1'>
                        <span className='text-xs bg-white rounded-[12px] px-2 py-0.5 text-[#635F69] font-medium'>
                          {CERT_TYPE_LABELS[cert.type] ?? cert.type}
                        </span>
                        <span className='text-xs text-[#635F69]'>
                          {cert.userName ?? '-'} ({cert.userEmail})
                        </span>
                      </div>
                      <p className='font-semibold text-[#332F3A]'>{cert.title}</p>
                      {cert.issuer && <p className='text-sm text-[#635F69]'>{cert.issuer}</p>}
                      {cert.issuedAt && <p className='text-xs text-[#635F69]'>발급일: {cert.issuedAt}</p>}
                      <a
                        href={cert.fileUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='inline-flex items-center gap-1 text-sm text-[#7C3AED] hover:underline mt-2'
                      >
                        <ExternalLink className='h-3.5 w-3.5' />파일 확인
                      </a>
                    </div>
                    <div className='flex flex-col gap-2 shrink-0'>
                      <form method='post'>
                        <input type='hidden' name='_action' value='approveCertification' />
                        <input type='hidden' name='certificationId' value={cert.id} />
                        <Button type='submit' size='sm' className='bg-emerald-600 hover:bg-emerald-700 text-white rounded-[20px] text-xs h-8 px-4 active:scale-[0.92] transition-all duration-200'>
                          승인
                        </Button>
                      </form>
                      <form method='post' className='flex flex-col gap-1'>
                        <input type='hidden' name='_action' value='rejectCertification' />
                        <input type='hidden' name='certificationId' value={cert.id} />
                        <input
                          name='reviewNote'
                          type='text'
                          placeholder='반려 사유 (선택)'
                          value={rejectNotes[cert.id] ?? ''}
                          onChange={(e) => setRejectNotes((prev) => ({ ...prev, [cert.id]: e.target.value }))}
                          className='bg-white rounded-[12px] border border-red-200 text-xs px-2 py-1 w-36 focus:outline-none focus:border-red-400'
                        />
                        <Button type='submit' size='sm' variant='outline' className='border-red-300 text-red-600 hover:bg-red-50 rounded-[20px] text-xs h-8 active:scale-[0.92] transition-all duration-200'>
                          반려
                        </Button>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value='disputes'>
          {pendingDisputes.length === 0 ? (
            <div className='text-center py-12 text-[#635F69]'>
              <Scale className='h-12 w-12 mx-auto mb-3 text-[#7C3AED]/30' />
              <p>처리 대기 중인 분쟁이 없습니다</p>
            </div>
          ) : (
            <div className='space-y-4'>
              {pendingDisputes.map((dispute) => {
                const resolution = disputeResolutions[dispute.id] ?? 'refund_full';
                return (
                  <div key={dispute.id} className='bg-[#EDE9FE] rounded-[24px] p-5'>
                    <div className='flex items-start justify-between gap-4 mb-3'>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2 mb-1'>
                          <span className='text-xs bg-orange-100 text-orange-700 rounded-[12px] px-2 py-0.5 font-medium'>
                            {dispute.raisedRole === 'worker' ? '전문가 제기' : '발주자 제기'}
                          </span>
                          <span className='text-xs text-[#635F69]'>{dispute.raiserName ?? '-'} ({dispute.raiserEmail})</span>
                        </div>
                        {dispute.contractAmount !== null && (
                          <p className='text-sm font-semibold text-[#332F3A]'>계약 금액: {new Intl.NumberFormat('ko-KR').format(dispute.contractAmount)}원</p>
                        )}
                        <p className='text-sm text-[#332F3A] mt-2 whitespace-pre-wrap'>{dispute.reason}</p>
                        {dispute.evidenceFiles && (
                          <div className='mt-2 flex flex-wrap gap-2'>
                            {(JSON.parse(dispute.evidenceFiles) as string[]).map((url, i) => (
                              <a key={i} href={url} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1 text-xs text-[#7C3AED] hover:underline'>
                                <ExternalLink className='h-3 w-3' />증거{i + 1}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <form method='post' className='space-y-3 bg-white rounded-[16px] p-4'>
                      <input type='hidden' name='_action' value='resolveDispute' />
                      <input type='hidden' name='disputeId' value={dispute.id} />
                      <div className='flex flex-wrap gap-2 items-end'>
                        <div>
                          <label className='block text-xs text-[#635F69] mb-1'>처리 방식</label>
                          <select
                            name='resolution'
                            value={resolution}
                            onChange={(e) => setDisputeResolutions((p) => ({ ...p, [dispute.id]: e.target.value }))}
                            className='bg-[#EDE9FE] rounded-t-xl border-0 border-b-2 border-gray-400 text-sm px-3 py-1.5'
                          >
                            {Object.entries(RESOLUTION_LABELS).map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
                        </div>
                        {resolution === 'refund_partial' && (
                          <div>
                            <label className='block text-xs text-[#635F69] mb-1'>환불 금액 (원)</label>
                            <input
                              type='number'
                              name='refundAmount'
                              min={1}
                              value={disputeRefundAmounts[dispute.id] ?? ''}
                              onChange={(e) => setDisputeRefundAmounts((p) => ({ ...p, [dispute.id]: e.target.value }))}
                              placeholder='부분 환불 금액'
                              className='bg-[#EDE9FE] rounded-t-xl border-0 border-b-2 border-gray-400 text-sm px-3 py-1.5 w-36'
                            />
                          </div>
                        )}
                        <div className='flex-1 min-w-40'>
                          <label className='block text-xs text-[#635F69] mb-1'>관리자 메모 (선택)</label>
                          <input
                            type='text'
                            name='adminNote'
                            value={disputeNotes[dispute.id] ?? ''}
                            onChange={(e) => setDisputeNotes((p) => ({ ...p, [dispute.id]: e.target.value }))}
                            placeholder='처리 사유 또는 메모'
                            className='bg-[#EDE9FE] rounded-t-xl border-0 border-b-2 border-gray-400 text-sm px-3 py-1.5 w-full'
                          />
                        </div>
                        <Button type='submit' className='bg-[#7C3AED] hover:bg-[#5a3d95] text-white rounded-[20px] text-sm h-9 px-5 active:scale-[0.92] transition-all duration-200'>
                          처리 완료
                        </Button>
                      </div>
                    </form>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};