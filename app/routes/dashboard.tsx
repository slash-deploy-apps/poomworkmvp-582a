import { Link, redirect, useLoaderData } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { eq, desc, sql } from 'drizzle-orm';
import { Briefcase, Users, BookOpen, CreditCard, GraduationCap, Plus, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { db } from '~/lib/db.server';
import { jobs, jobApplications, enrollments, courses, user, payments } from '~/db/schema';
import { auth } from '~/lib/auth.server';

export const meta: MetaFunction = () => [{ title: '대시보드 - poomwork' }];

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return redirect('/login');
  const u = session.user;
  let data: Record<string, any> = { user: u };

  if (u.role === 'worker') {
    data.applications = await db.select({ id: jobApplications.id, status: jobApplications.status, coverLetter: jobApplications.coverLetter, proposedBudget: jobApplications.proposedBudget, createdAt: jobApplications.createdAt, jobTitle: jobs.title, clientName: user.name })
      .from(jobApplications).leftJoin(jobs, eq(jobApplications.jobId, jobs.id)).leftJoin(user, eq(jobs.clientId, user.id))
      .where(eq(jobApplications.workerId, u.id)).orderBy(desc(jobApplications.createdAt)).limit(20);
    data.enrollments = await db.select({ id: enrollments.id, progress: enrollments.progress, courseTitle: courses.title, level: courses.level })
      .from(enrollments).leftJoin(courses, eq(enrollments.courseId, courses.id))
      .where(eq(enrollments.userId, u.id)).orderBy(desc(enrollments.createdAt)).limit(10);
    data.workerPayments = await db.select().from(payments).where(eq(payments.payeeId, u.id)).orderBy(desc(payments.createdAt)).limit(20);
  }

  if (u.role === 'client') {
    data.postedJobs = await db.select().from(jobs).where(eq(jobs.clientId, u.id)).orderBy(desc(jobs.createdAt)).limit(20);
    data.myCourses = await db.select().from(courses).where(eq(courses.instructorId, u.id)).orderBy(desc(courses.createdAt)).limit(20);
    data.receivedApplications = await db.select({
      id: jobApplications.id, status: jobApplications.status, coverLetter: jobApplications.coverLetter, proposedBudget: jobApplications.proposedBudget, proposedDuration: jobApplications.proposedDuration, workerId: jobApplications.workerId,
      workerName: user.name, workerEmail: user.email, workerRating: user.rating,
      jobId: jobs.id, jobTitle: jobs.title, jobBudgetMin: jobs.budgetMin, jobBudgetMax: jobs.budgetMax,
    })
      .from(jobApplications)
      .leftJoin(jobs, eq(jobApplications.jobId, jobs.id))
      .leftJoin(user, eq(jobApplications.workerId, user.id))
      .where(eq(jobs.clientId, u.id)).orderBy(desc(jobApplications.createdAt)).limit(50);
  }
  if (u.role === 'client') {
    const userPayments = await db.select({
      id: payments.id,
      amount: payments.amount,
      type: payments.type,
      status: payments.status,
      paymentMethod: payments.tossPaymentMethod,
      createdAt: payments.createdAt,
      courseId: payments.referenceId,
    })
    .from(payments)
    .where(eq(payments.payerId, u.id))
    .orderBy(desc(payments.createdAt));

    const courseIds = userPayments.filter(p => p.type === 'course_purchase').map(p => p.courseId).filter(Boolean);
    const relevantCourses = courseIds.length > 0 ? await db.select({ id: courses.id, title: courses.title }).from(courses).where(sql`${courses.id} IN (${sql.join(courseIds.map(id => sql`${id}`), sql`, `)})`) : [];
    const courseMap = Object.fromEntries(relevantCourses.map(c => [c.id, c.title]));
    data.userPayments = userPayments.map(p => ({
      ...p,
      courseTitle: p.type === 'course_purchase' ? courseMap[p.courseId as string] : null,
    }));
  }
  if (u.role === 'admin') {
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(user);
    const [jobCount] = await db.select({ count: sql<number>`count(*)` }).from(jobs);
    const [courseCount] = await db.select({ count: sql<number>`count(*)` }).from(courses);
    data.stats = { users: userCount?.count ?? 0, jobs: jobCount?.count ?? 0, courses: courseCount?.count ?? 0 };
  }

  return data;
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return redirect('/login');
  const formData = await request.formData();
  const actionType = formData.get('_action') as string;

  if (actionType === 'acceptApplication') {
    const appId = formData.get('applicationId') as string;
    const jobId = formData.get('jobId') as string;
    await db.update(jobApplications).set({ status: 'accepted' }).where(eq(jobApplications.id, appId));
    const job = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
    if (job[0]) {
      await db.insert(payments).values({
        payerId: session.user.id,
        payeeId: formData.get('workerId') as string,
        amount: Number(formData.get('amount') || 0),
        type: 'job_payment',
        status: 'escrow',
        referenceId: jobId,
        paymentMethod: 'card',
      });
    }
  } else if (actionType === 'rejectApplication') {
    const appId = formData.get('applicationId') as string;
    await db.update(jobApplications).set({ status: 'rejected' }).where(eq(jobApplications.id, appId));
  } else if (actionType === 'softDeleteCourse') {
    const courseId = formData.get('courseId') as string;
    const course = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
    if (course[0] && course[0].instructorId === session.user.id) {
      await db.update(courses).set({ status: 'deleted' }).where(eq(courses.id, courseId));
    }
  }
  return redirect('/dashboard');
}

export default function Dashboard() {
  const data = useLoaderData<typeof loader>();
  const u = data.user as any;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold" style={{ fontFamily: "'Nunito', sans-serif" }}>대시보드</h1>
        <p className="text-[#635F69] mt-1">{u.name || u.email}님, 안녕하세요 ({u.role === 'worker' ? '인력 제공자' : u.role === 'client' ? '일거리 제공자' : '관리자'})</p>
        <div className='flex gap-2 mt-2'>
          <Link to='/profile/edit' className='inline-block px-5 py-2 rounded-[20px] bg-white/70 backdrop-blur-xl shadow-clay-card text-[#332F3A] text-sm font-bold active:scale-[0.92] transition-all duration-200'>프로필 편집</Link>
          <Link to='/messages' className='inline-block px-5 py-2 rounded-[20px] bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] text-white text-sm font-bold shadow-clay-button active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200'>메시지</Link>
          {u.role !== 'admin' && (
            <>
              <Link to='/my/courses' className='inline-block px-5 py-2 rounded-[20px] bg-white/70 backdrop-blur-xl shadow-clay-card text-[#332F3A] text-sm font-bold active:scale-[0.92] transition-all duration-200'>
                <GraduationCap className='h-4 w-4 inline mr-1' />내 강좌
              </Link>
              <Link to='/courses/new' className='inline-block px-5 py-2 rounded-[20px] bg-[#7C3AED] text-white text-sm font-bold shadow-clay-button active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200'>
                <GraduationCap className='h-4 w-4 inline mr-1' />새 강좌 만들기
              </Link>
            </>
          )}
        </div>
      </div>

      {u.role === 'admin' && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Card><CardContent className="p-6 text-center"><Users className="h-8 w-8 text-[#7C3AED] mx-auto mb-2" /><div className="text-2xl font-black" style={{ fontFamily: "'Nunito', sans-serif" }}>{(data.stats as any)?.users || 0}</div><div className="text-sm text-[#635F69]">전체 사용자</div></CardContent></Card>
            <Card><CardContent className="p-6 text-center"><Briefcase className="h-8 w-8 text-[#DB2777] mx-auto mb-2" /><div className="text-2xl font-black" style={{ fontFamily: "'Nunito', sans-serif" }}>{(data.stats as any)?.jobs || 0}</div><div className="text-sm text-[#635F69]">전체 일거리</div></CardContent></Card>
            <Card><CardContent className="p-6 text-center"><BookOpen className="h-8 w-8 text-[#0EA5E9] mx-auto mb-2" /><div className="text-2xl font-black" style={{ fontFamily: "'Nunito', sans-serif" }}>{(data.stats as any)?.courses || 0}</div><div className="text-sm text-[#635F69]">전체 강좌</div></CardContent></Card>
          </div>
          <Button asChild><Link to="/admin">관리자 패널로 이동</Link></Button>
        </>
      )}

      {u.role === 'worker' && (
        <>
          <Card className='mb-8'>
            <CardHeader><CardTitle>내 지원 현황</CardTitle></CardHeader>
            <CardContent>
              {(data.applications as any[])?.length === 0 ? <p className='text-[#635F69]'>아직 지원한 일거리가 없습니다.</p> : (
                <div className='space-y-3'>
                  {(data.applications as any[])?.map((a: any) => (
                    <div key={a.id} className='flex items-center justify-between p-4 bg-[#EDE9FE] rounded-[32px]'>
                      <div>
                        <div className='font-medium'>{a.jobTitle}</div>
                        <div className='text-sm text-[#635F69]'>{a.clientName} · {a.proposedBudget ? `${new Intl.NumberFormat('ko-KR').format(a.proposedBudget)}원` : '금액 협의'}</div>
                      </div>
                      <Badge className={a.status === 'accepted' ? 'bg-[#EDE9FE] text-[#332F3A]' : a.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}>
                        {a.status === 'accepted' ? '수락' : a.status === 'rejected' ? '거절' : '대기중'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className='mb-8'>
            <CardHeader><CardTitle>수강 중인 강좌</CardTitle></CardHeader>
            <CardContent>
              {(data.enrollments as any[])?.length === 0 ? <p className='text-[#635F69]'>수강 중인 강좌가 없습니다.</p> : (
                <div className='space-y-3'>
                  {(data.enrollments as any[])?.map((e: any) => (
                    <Link to={`/courses/${e.id}/learn`} key={e.id}>
                      <div className='flex items-center justify-between p-4 bg-[#EDE9FE] rounded-[32px] hover:bg-[#EDE9FE] transition-all duration-200'>
                        <div><div className='font-medium'>{e.courseTitle}</div><div className='text-sm text-[#635F69]'>{e.level}</div></div>
                        <div className='text-sm font-medium text-[#7C3AED]'>{Math.round(e.progress)}%</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          {(data.workerPayments as any[])?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className='flex items-center gap-2'><CreditCard className='h-5 w-5' />정산 내역</CardTitle></CardHeader>
              <CardContent>
                <div className='space-y-3'>
                  {(data.workerPayments as any[])?.map((p: any) => (
                    <div key={p.id} className='flex items-center justify-between p-4 bg-[#EDE9FE] rounded-[32px]'>
                      <div>
                        <div className='font-medium'>{new Intl.NumberFormat('ko-KR').format(p.amount)}원</div>
                        <div className='text-sm text-[#635F69]'>{p.type === 'job_payment' ? '일거리 정산' : p.type} · {new Date(p.createdAt).toLocaleDateString('ko-KR')}</div>
                      </div>
                      <Badge className={p.status === 'completed' ? 'bg-[#EDE9FE] text-[#332F3A]' : p.status === 'escrow' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-[#635F69]'}>
                        {p.status === 'completed' ? '정산 완료' : p.status === 'escrow' ? '에스크로' : p.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {u.role === 'client' && (
        <>
          <div className='flex justify-between items-center mb-6'>
            <h2 className='text-xl font-bold'>내 강좌</h2>
            <Button asChild className='bg-[#7C3AED] rounded-[20px] hover:bg-#7C3AED active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200'><Link to='/courses/new'><GraduationCap className='h-4 w-4 mr-2' />새 강좌 만들기</Link></Button>
          </div>
          {(data.myCourses as any[])?.length === 0 ? (
            <div className='bg-[#EDE9FE] rounded-[32px] p-8 text-center text-[#635F69] mb-8'>등록한 강좌가 없습니다.</div>
          ) : (
            <div className='space-y-4 mb-8'>
              {(data.myCourses as any[])?.map((c: any) => (
                <div key={c.id} className='bg-[#EDE9FE] rounded-[32px] p-5'>
                  <div className='flex items-center justify-between mb-3'>
                    <Link to={`/courses/${c.id}`} className='font-bold text-[#332F3A] hover:text-[#7C3AED] transition-colors'>{c.title}</Link>
                    <Badge className={c.status === 'published' ? 'bg-green-100 text-green-700' : c.status === 'draft' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-200 text-[#635F69]'}>{c.status === 'published' ? '공개' : c.status === 'draft' ? '임시저장' : '삭제됨'}</Badge>
                    <Link to={`/courses/${c.id}/edit`} className='px-3 py-1 rounded-[20px] bg-white text-sm font-medium hover:bg-[#DDD6FE] active:scale-[0.92] transition-all duration-200'>수정</Link>
                    <form method='post' onSubmit={(e) => { if (!confirm('삭제하시겠습니까?')) e.preventDefault(); }}>
                      <input type='hidden' name='_action' value='softDeleteCourse' />
                      <input type='hidden' name='courseId' value={c.id} />
                      <button type='submit' className='px-3 py-1 rounded-[20px] bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 active:scale-[0.92] transition-all duration-200'>삭제</button>
                    </form>
                  </div>
                  <div className='text-sm text-[#635F69]'>가격: {c.price === 0 ? '묣' : `${new Intl.NumberFormat('ko-KR').format(c.price)}원`}</div>
                </div>
              ))}
            </div>
          )}
          <div className='flex justify-between items-center mb-6'>
            <h2 className='text-xl font-bold'>내 일거리</h2>
            <h2 className='text-xl font-bold'>내 일거리</h2>
            <Button asChild className='bg-[#7C3AED] rounded-[20px] hover:bg-#7C3AED active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200'><Link to='/jobs/new'><Plus className='h-4 w-4 mr-2' />일거리 등록</Link></Button>
          </div>
          {(data.postedJobs as any[])?.length === 0 ? (
            <div className='bg-[#EDE9FE] rounded-[32px] p-8 text-center text-[#635F69]'>등록한 일거리가 없습니다.</div>
          ) : (
            <div className='space-y-4 mb-8'>
              {(data.postedJobs as any[])?.map((j: any) => {
                const jobApps = (data.receivedApplications as any[])?.filter((a: any) => a.jobId === j.id) || [];
                return (
                  <div key={j.id} className='bg-[#EDE9FE] rounded-[32px] p-5'>
                    <div className='flex items-center justify-between mb-3'>
                      <Link to={`/jobs/${j.id}`} className='font-bold text-[#332F3A] hover:text-[#7C3AED] transition-colors'>{j.title}</Link>
                      <Badge className={j.status === 'open' ? 'bg-[#EDE9FE] text-[#332F3A]' : 'bg-gray-200 text-[#635F69]'}>{j.status === 'open' ? '모집중' : j.status === 'in_progress' ? '진행중' : '마감'}</Badge>
                    </div>
                    {j.budgetMin != null && <div className='text-sm text-[#635F69] mb-3'>예산: {new Intl.NumberFormat('ko-KR').format(j.budgetMin)}{j.budgetMax ? `~${new Intl.NumberFormat('ko-KR').format(j.budgetMax)}` : ''}원</div>}
                    {jobApps.length === 0 ? (
                      <p className='text-sm text-[#635F69]'>아직 지원자가 없습니다</p>
                    ) : (
                      <div className='space-y-2'>
                        <p className='text-sm font-medium text-[#7C3AED]'>지원자 {jobApps.length}명</p>
                        {jobApps.map((a: any) => (
                          <div key={a.id} className='bg-[#F4F1FA] rounded-[24px] p-4'>
                            <div className='flex items-center justify-between'>
                              <div>
                                <Link to={`/workers/${a.workerId}`} className='font-medium hover:text-[#7C3AED] transition-colors'>{a.workerName || a.workerEmail}</Link>
                                {a.workerRating > 0 && <span className='text-sm text-yellow-500 ml-2'>★ {a.workerRating}</span>}
                              </div>
                              <Badge className={a.status === 'accepted' ? 'bg-[#EDE9FE] text-[#332F3A]' : a.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}>
                                {a.status === 'accepted' ? '수락' : a.status === 'rejected' ? '거절' : '대기중'}
                              </Badge>
                            </div>
                            {a.proposedBudget && <div className='text-sm text-[#635F69] mt-1'>제안 금액: {new Intl.NumberFormat('ko-KR').format(a.proposedBudget)}원</div>}
                            {a.proposedDuration && <div className='text-sm text-[#635F69]'>예상 기간: {a.proposedDuration}</div>}
                            {a.status === 'pending' && (
                              <div className='flex gap-2 mt-3'>
                                <form method='post'>
                                  <input type='hidden' name='_action' value='acceptApplication' />
                                  <input type='hidden' name='applicationId' value={a.id} />
                                  <input type='hidden' name='jobId' value={j.id} />
                                  <input type='hidden' name='workerId' value={a.workerId || ''} />
                                  <input type='hidden' name='amount' value={a.proposedBudget || j.budgetMin || 0} />
                                  <Button type='submit' size='sm' className='bg-[#7C3AED] hover:bg-#7C3AED rounded-[20px] active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200'>수락</Button>
                                </form>
                                <form method='post'>
                                  <input type='hidden' name='_action' value='rejectApplication' />
                                  <input type='hidden' name='applicationId' value={a.id} />
                                  <Button type='submit' size='sm' variant='outline' className='rounded-[20px] border-[#7C3AED] text-[#DB2777] active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200'>거절</Button>
                                </form>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {(data.userPayments as any[])?.length > 0 ? (
            <Card>
              <CardHeader><CardTitle className='flex items-center gap-2'><Receipt className='h-5 w-5' />결제 내역</CardTitle></CardHeader>
              <CardContent>
                <div className='space-y-3'>
                  {(data.userPayments as any[])?.map((p: any) => (
                    <div key={p.id} className='flex items-center justify-between p-4 bg-[#EDE9FE] rounded-[32px]'>
                      <div>
                        {p.courseTitle && <Link to={`/courses/${p.courseId}`} className='font-medium hover:text-[#7C3AED] transition-colors'>{p.courseTitle}</Link>}
                        {!p.courseTitle && <div className='font-medium'>{p.type === 'job_payment' ? '일거리 결제' : p.type === 'course_purchase' ? '강좌 구매' : p.type}</div>}
                        <div className='text-sm text-[#635F69]'>{new Intl.NumberFormat('ko-KR').format(p.amount)}원 · {p.paymentMethod || 'N/A'} · {new Date(p.createdAt).toLocaleDateString('ko-KR')}</div>
                      </div>
                      <div className='flex items-center gap-2'>
                        <Badge className={p.status === 'DONE' ? 'bg-green-100 text-green-700' : p.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : p.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}>
                          {p.status === 'DONE' ? '결제 완료' : p.status === 'PENDING' ? '대기중' : p.status === 'FAILED' ? '실패' : p.status === 'CANCELLED' ? '취소됨' : p.status}
                        </Badge>
                        {p.status === 'DONE' && (
                          <Button size='sm' variant='outline' className='rounded-[20px] text-xs h-7 border-[#DB2777] text-[#DB2777] hover:bg-red-50 active:scale-[0.92] transition-all duration-200' onClick={() => window.alert('환불은 관리자 승인 후 처리됩니다')}>환불 요청</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader><CardTitle className='flex items-center gap-2'><Receipt className='h-5 w-5' />결제 내역</CardTitle></CardHeader>
              <CardContent>
                <div className='p-4 bg-[#EDE9FE] rounded-[32px] text-center text-[#635F69]'>결제 내역이 없습니다</div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}