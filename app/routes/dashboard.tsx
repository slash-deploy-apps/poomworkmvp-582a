import { Link, redirect, useLoaderData } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { eq, desc, inArray } from 'drizzle-orm';
import { Briefcase, Users, BookOpen, CreditCard, GraduationCap, Plus, Receipt, ArrowRight, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { db } from '~/lib/db.server';
import { jobs, jobApplications, enrollments, courses, user, payments } from '~/db/schema';
import { auth } from '~/lib/auth.server';
import { recommendJobsForWorker, recommendWorkersForClient } from '~/lib/recommend.server';
import type { RecommendedJob, RecommendedWorker } from '~/lib/recommend.server';

export const meta: MetaFunction = () => [{ title: '대시보드 - poomwork' }];

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return redirect('/login');
    const u = session.user;
    let data: Record<string, any> = { user: u };

    if (u.role === 'worker') {
      // 1. Fetch applications
      const apps = await db.select().from(jobApplications).where(eq(jobApplications.workerId, u.id)).orderBy(desc(jobApplications.createdAt));

      // 2. Fetch job details
      const jobIds = [...new Set(apps.map(a => a.jobId))];
      const jobMap = new Map();
      if (jobIds.length > 0) {
        const jobList = await db.select().from(jobs).where(inArray(jobs.id, jobIds));
        for (const j of jobList) jobMap.set(j.id, j);
      }

      // 3. Fetch client details
      const clientIds = [...new Set(Array.from(jobMap.values()).map((j: any) => j.clientId))];
      const clientMap = new Map();
      if (clientIds.length > 0) {
        const clientList = await db.select().from(user).where(inArray(user.id, clientIds));
        for (const c of clientList) clientMap.set(c.id, c);
      }

      // 4. Merge
      data.applications = apps.map(a => {
        const job = jobMap.get(a.jobId);
        const client = job ? clientMap.get(job.clientId) : null;
        return {
          ...a,
          jobTitle: job?.title || '',
          clientName: client?.name || '',
        };
      });

      // 5. Fetch enrollments
      const enrolls = await db.select().from(enrollments).where(eq(enrollments.userId, u.id)).orderBy(desc(enrollments.createdAt));
      const courseIds = [...new Set(enrolls.map(e => e.courseId))];
      const courseMap = new Map();
      if (courseIds.length > 0) {
        const courseList = await db.select().from(courses).where(inArray(courses.id, courseIds));
        for (const c of courseList) courseMap.set(c.id, c);
      }
      data.enrollments = enrolls.map(e => {
        const course = courseMap.get(e.courseId);
        return {
          ...e,
          title: course?.title || '',
          level: course?.level || '',
          thumbnailUrl: course?.thumbnailUrl || '',
        };
      });

      data.workerPayments = await db.select({
        id: payments.id,
        payerId: payments.payerId,
        payeeId: payments.payeeId,
        amount: payments.amount,
        type: payments.type,
        status: payments.status,
        referenceId: payments.referenceId,
        createdAt: payments.createdAt,
      }).from(payments).where(eq(payments.payeeId, u.id)).orderBy(desc(payments.createdAt));

      data.recommendedJobs = await recommendJobsForWorker(u.id, 4);
    }

    if (u.role === 'client') {
      data.postedJobs = await db.select().from(jobs).where(eq(jobs.clientId, u.id)).orderBy(desc(jobs.createdAt));
      data.myCourses = await db.select().from(courses).where(eq(courses.instructorId, u.id)).orderBy(desc(courses.createdAt));

      const myJobIds = data.postedJobs.map((j: any) => j.id);
      if (myJobIds.length > 0) {
        const apps = await db.select().from(jobApplications).where(inArray(jobApplications.jobId, myJobIds)).orderBy(desc(jobApplications.createdAt));
        const workerIds = [...new Set(apps.map(a => a.workerId))];
        const workerMap = new Map();
        if (workerIds.length > 0) {
          const workerList = await db.select().from(user).where(inArray(user.id, workerIds));
          for (const w of workerList) workerMap.set(w.id, w);
        }
        data.receivedApplications = apps.map(a => {
          const worker = workerMap.get(a.workerId);
          return {
            ...a,
            workerName: worker?.name || '',
            workerEmail: worker?.email || '',
            workerRating: worker?.rating || 0,
          };
        });
      } else {
        data.receivedApplications = [];
      }

      data.userPayments = await db.select({
        id: payments.id,
        payerId: payments.payerId,
        payeeId: payments.payeeId,
        amount: payments.amount,
        type: payments.type,
        status: payments.status,
        referenceId: payments.referenceId,
        createdAt: payments.createdAt,
      }).from(payments).where(eq(payments.payerId, u.id)).orderBy(desc(payments.createdAt));

      data.recommendedWorkers = await recommendWorkersForClient(u.id, 4);
    }

    if (u.role === 'admin') {
      const allUsers = await db.select().from(user);
      const allJobs = await db.select().from(jobs);
      const allCourses = await db.select().from(courses);
      data.stats = { users: allUsers.length, jobs: allJobs.length, courses: allCourses.length };
    }

    return data;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Dashboard loader error]', message);
    return { user: null, error: message };
  }
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

  if (data.error) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">대시보드 오류</h1>
        <p className="text-[#635F69] mb-4">{data.error}</p>
        <Button onClick={() => window.location.reload()} className="bg-[#7C3AED] rounded-[20px]">새로고침</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold" style={{ fontFamily: "'Nunito', sans-serif" }}>대시보드</h1>
        <p className="text-[#635F69] mt-1">{u.name || u.email}님, 안녕하세요 ({u.role === 'worker' ? '전문가' : u.role === 'client' ? '일거리 제공자' : '관리자'})</p>
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
          {(data.applications as any[])?.length === 0 && (data.enrollments as any[])?.length === 0 && (
            <div className='mb-8 bg-gradient-to-br from-[#EDE9FE] to-[#F5F3FF] rounded-[32px] p-8'>
              <div className='flex items-start gap-4 mb-6'>
                <div className='w-12 h-12 rounded-[16px] bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] flex items-center justify-center shadow-clay-button flex-shrink-0'>
                  <Briefcase className='h-6 w-6 text-white' />
                </div>
                <div>
                  <h2 className='text-xl font-extrabold text-[#332F3A]' style={{ fontFamily: "'Nunito', sans-serif" }}>첫 활동을 시작해보세요!</h2>
                  <p className='text-sm text-[#635F69] mt-1'>아직 지원하거나 수강 중인 내역이 없습니다.</p>
                </div>
              </div>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4'>
                <Link
                  to='/profile/edit'
                  className='flex items-center justify-between p-4 bg-white/80 backdrop-blur-xl rounded-[20px] shadow-clay-card hover:-translate-y-1 transition-all duration-200 active:scale-[0.97] group'
                >
                  <div>
                    <div className='font-bold text-[#332F3A] text-sm' style={{ fontFamily: "'Nunito', sans-serif" }}>프로필 완성하기</div>
                    <div className='text-xs text-[#635F69] mt-0.5'>bio와 스킬을 등록하세요</div>
                  </div>
                  <ArrowRight className='h-4 w-4 text-[#7C3AED] group-hover:translate-x-1 transition-transform duration-200' />
                </Link>
                <Link
                  to='/jobs'
                  className='flex items-center justify-between p-4 bg-white/80 backdrop-blur-xl rounded-[20px] shadow-clay-card hover:-translate-y-1 transition-all duration-200 active:scale-[0.97] group'
                >
                  <div>
                    <div className='font-bold text-[#332F3A] text-sm' style={{ fontFamily: "'Nunito', sans-serif" }}>일거리 둘러보기</div>
                    <div className='text-xs text-[#635F69] mt-0.5'>프로젝트에 지원해보세요</div>
                  </div>
                  <ArrowRight className='h-4 w-4 text-[#7C3AED] group-hover:translate-x-1 transition-transform duration-200' />
                </Link>
              </div>
              <Link
                to='/onboarding'
                className='inline-flex items-center gap-2 text-sm font-bold text-[#7C3AED] hover:underline'
              >
                온보딩 다시 보기 <ArrowRight className='h-4 w-4' />
              </Link>
            </div>
          )}
          {(data.recommendedJobs as RecommendedJob[])?.length > 0 && (
            <div className='mb-8'>
              <h2 className='text-xl font-extrabold text-[#332F3A] mb-4' style={{ fontFamily: "'Nunito', sans-serif" }}>
                ✨ 맞춤 추천 일거리
              </h2>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                {(data.recommendedJobs as RecommendedJob[]).map((job) => (
                  <Link
                    key={job.id}
                    to={`/jobs/${job.id}`}
                    className='bg-white/70 backdrop-blur-xl rounded-[24px] shadow-clay-card p-5 hover:-translate-y-1 hover:shadow-clay-card-hover transition-all duration-200 block'
                  >
                    <div className='font-bold text-[#332F3A] mb-1 line-clamp-2' style={{ fontFamily: "'Nunito', sans-serif" }}>
                      {job.title}
                    </div>
                    <div className='text-sm text-[#635F69] mb-3'>
                      {job.isRemote ? '원격' : job.location || '위치 미정'}
                      {job.budgetMin != null && (
                        <span className='ml-2 text-[#7C3AED] font-medium'>
                          {new Intl.NumberFormat('ko-KR').format(job.budgetMin)}원~
                        </span>
                      )}
                    </div>
                    {job.matchedSkills.length > 0 && (
                      <div className='flex flex-wrap gap-1'>
                        {job.matchedSkills.slice(0, 3).map((skill) => (
                          <span
                            key={skill}
                            className='bg-[#EDE9FE] text-[#7C3AED] rounded-full px-2.5 py-1 text-xs font-medium'
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
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
                    <div key={e.id}>
                      <Link to={`/courses/${e.id}/learn`}>
                        <div className='flex items-center justify-between p-4 bg-[#EDE9FE] rounded-[32px] hover:bg-[#EDE9FE] transition-all duration-200'>
                          <div><div className='font-medium'>{e.courseTitle}</div><div className='text-sm text-[#635F69]'>{e.level}</div></div>
                          <div className='text-sm font-medium text-[#7C3AED]'>{Math.round(e.progress)}%</div>
                        </div>
                      </Link>
                      {e.progress < 100 && (
                        <Link to={`/courses/${e.courseId}#related`} className='text-xs text-[#7C3AED] hover:underline pl-1 mt-1 inline-block'>
                          이 강좌 관련 일거리 보기 →
                        </Link>
                      )}
                    </div>
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
                      <Badge className={p.status === 'escrow_released' || p.status === 'DONE' ? 'bg-[#EDE9FE] text-[#332F3A]' : p.status === 'escrow' ? 'bg-yellow-100 text-yellow-700' : p.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-[#635F69]'}>
                        {p.status === 'escrow_released' || p.status === 'DONE' ? '정산 완료' : p.status === 'escrow' ? '에스크로 보관중' : p.status === 'PENDING' ? '결제 대기' : p.status === 'FAILED' ? '실패' : p.status === 'CANCELLED' ? '환불됨' : p.status}
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
          {!(data.myCourses as any[])?.length ? (
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
                  <div className='text-sm text-[#635F69]'>가격: {(c.price ?? 0) === 0 ? '묣' : `${new Intl.NumberFormat('ko-KR').format(c.price ?? 0)}원`}</div>
                </div>
              ))}
            </div>
          )}
          {(data.recommendedWorkers as RecommendedWorker[])?.length > 0 && (
            <div className='mb-8'>
              <h2 className='text-xl font-extrabold text-[#332F3A] mb-4' style={{ fontFamily: "'Nunito', sans-serif" }}>
                ✨ 추천 전문가
              </h2>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                {(data.recommendedWorkers as RecommendedWorker[]).map((w) => (
                  <Link
                    key={w.id}
                    to={`/workers/${w.id}`}
                    className='bg-white/70 backdrop-blur-xl rounded-[24px] shadow-clay-card p-5 hover:-translate-y-1 hover:shadow-clay-card-hover transition-all duration-200 flex items-start gap-3'
                  >
                    <div className='w-10 h-10 rounded-[20px] bg-[#EDE9FE] flex items-center justify-center text-[#7C3AED] font-bold text-sm shrink-0 overflow-hidden'>
                      {w.image ? (
                        <img src={w.image} alt='' className='w-full h-full object-cover' />
                      ) : (
                        (w.name || '?')[0]
                      )}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='font-bold text-[#332F3A] truncate' style={{ fontFamily: "'Nunito', sans-serif" }}>
                        {w.name || '익명'}
                      </div>
                      <div className='flex items-center gap-2 text-xs text-[#635F69] mb-2'>
                        {w.rating > 0 && (
                          <span className='flex items-center gap-0.5'>
                            <Star className='h-3 w-3 text-yellow-400 fill-yellow-400' />
                            {w.rating}
                          </span>
                        )}
                        <span className='text-[#7C3AED] font-medium'>신뢰점수 {w.trustScore}</span>
                      </div>
                      {w.matchedSkills.length > 0 && (
                        <div className='flex flex-wrap gap-1'>
                          {w.matchedSkills.slice(0, 3).map((skill) => (
                            <span
                              key={skill}
                              className='bg-[#EDE9FE] text-[#7C3AED] rounded-full px-2.5 py-1 text-xs font-medium'
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
          <div className='flex justify-between items-center mb-6'>
            <h2 className='text-xl font-bold'>내 일거리</h2>
            <Button asChild className='bg-[#7C3AED] rounded-[20px] hover:bg-#7C3AED active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200'><Link to='/jobs/new'><Plus className='h-4 w-4 mr-2' />일거리 등록</Link></Button>
          </div>
          {(data.postedJobs as any[])?.length === 0 ? (
            <div className='bg-gradient-to-br from-[#EDE9FE] to-[#F5F3FF] rounded-[32px] p-8 mb-8'>
              <div className='text-center mb-6'>
                <div className='w-14 h-14 rounded-[20px] bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] flex items-center justify-center shadow-clay-button mx-auto mb-4'>
                  <Briefcase className='h-7 w-7 text-white' />
                </div>
                <h3 className='text-xl font-extrabold text-[#332F3A]' style={{ fontFamily: "'Nunito', sans-serif" }}>첫 일거리를 등록해보세요</h3>
                <p className='text-sm text-[#635F69] mt-2'>필요한 작업을 올리면 전문가가 지원합니다</p>
              </div>
              <div className='flex flex-col sm:flex-row gap-3 justify-center'>
                <Link
                  to='/jobs/new'
                  className='flex items-center justify-center gap-2 h-12 px-6 rounded-[20px] bg-gradient-to-r from-[#A78BFA] to-[#7C3AED] text-white font-bold shadow-clay-button hover:-translate-y-1 active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200'
                >
                  <Plus className='h-4 w-4' /> 첫 일거리 등록하기
                </Link>
                <Link
                  to='/workers'
                  className='flex items-center justify-center gap-2 h-12 px-6 rounded-[20px] bg-white/80 backdrop-blur-xl text-[#332F3A] font-bold shadow-clay-card hover:-translate-y-1 active:scale-[0.92] transition-all duration-200 group'
                >
                  전문가 둘러보기 <ArrowRight className='h-4 w-4 text-[#7C3AED] group-hover:translate-x-1 transition-transform duration-200' />
                </Link>
              </div>
            </div>
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
                                <Link to={`/messages?peerId=${a.workerId}&jobId=${j.id}`}>
                                  <Button size='sm' className='bg-[#7C3AED] hover:bg-#7C3AED rounded-[20px] active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200'>채팅으로 수락 진행</Button>
                                </Link>
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
                        <Badge className={p.status === 'DONE' ? 'bg-green-100 text-green-700' : p.status === 'escrow' ? 'bg-yellow-100 text-yellow-700' : p.status === 'escrow_released' ? 'bg-green-100 text-green-700' : p.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : p.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}>
                          {p.status === 'DONE' ? '결제 완료' : p.status === 'escrow' ? '에스크로 보관중' : p.status === 'escrow_released' ? '지급 완료' : p.status === 'PENDING' ? '대기중' : p.status === 'FAILED' ? '실패' : p.status === 'CANCELLED' ? '취소됨' : p.status}
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