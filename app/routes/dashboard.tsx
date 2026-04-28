import { Link, redirect, useLoaderData } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs } from 'react-router';
import { eq, desc, sql } from 'drizzle-orm';
import { Briefcase, Users, BookOpen, CreditCard, GraduationCap, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { db } from '~/lib/db.server';
import { jobs, jobApplications, enrollments, courses, user } from '~/db/schema';
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
  }

  if (u.role === 'client') {
    data.postedJobs = await db.select().from(jobs).where(eq(jobs.clientId, u.id)).orderBy(desc(jobs.createdAt)).limit(20);
  }

  if (u.role === 'admin') {
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(user);
    const [jobCount] = await db.select({ count: sql<number>`count(*)` }).from(jobs);
    const [courseCount] = await db.select({ count: sql<number>`count(*)` }).from(courses);
    data.stats = { users: userCount.count, jobs: jobCount.count, courses: courseCount.count };
  }

  return data;
}

export default function Dashboard() {
  const data = useLoaderData<typeof loader>();
  const u = data.user as any;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">대시보드</h1>
        <p className="text-[#49454F] mt-1">{u.name || u.email}님, 안녕하세요 ({u.role === 'worker' ? '인력 제공자' : u.role === 'client' ? '일거리 제공자' : '관리자'})</p>
        <Link to="/profile/edit" className="inline-block mt-2 px-4 py-1.5 rounded-full bg-[#E8DEF8] text-[#1D192B] text-sm font-medium hover:bg-[#d4c8e8] active:scale-95 transition-all duration-300">프로필 편집</Link>
      </div>

      {u.role === 'admin' && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Card><CardContent className="p-6 text-center"><Users className="h-8 w-8 text-[#6750A4] mx-auto mb-2" /><div className="text-2xl font-bold">{(data.stats as any)?.users || 0}</div><div className="text-sm text-[#49454F]">전체 사용자</div></CardContent></Card>
            <Card><CardContent className="p-6 text-center"><Briefcase className="h-8 w-8 text-[#7D5260] mx-auto mb-2" /><div className="text-2xl font-bold">{(data.stats as any)?.jobs || 0}</div><div className="text-sm text-[#49454F]">전체 일거리</div></CardContent></Card>
            <Card><CardContent className="p-6 text-center"><BookOpen className="h-8 w-8 text-purple-600 mx-auto mb-2" /><div className="text-2xl font-bold">{(data.stats as any)?.courses || 0}</div><div className="text-sm text-[#49454F]">전체 강좌</div></CardContent></Card>
          </div>
          <Button asChild className="bg-[#6750A4]"><Link to="/admin">관리자 패널로 이동</Link></Button>
        </>
      )}

      {u.role === 'worker' && (
        <>
          <Card className="mb-8">
            <CardHeader><CardTitle>내 지원 현황</CardTitle></CardHeader>
            <CardContent>
              {(data.applications as any[])?.length === 0 ? <p className="text-[#49454F]">아직 지원한 일거리가 없습니다.</p> : (
                <div className="space-y-3">
                  {(data.applications as any[])?.map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{a.jobTitle}</div>
                        <div className="text-sm text-[#49454F]">{a.clientName} · {a.proposedBudget ? `${new Intl.NumberFormat('ko-KR').format(a.proposedBudget)}원` : '금액 협의'}</div>
                      </div>
                      <Badge className={a.status === 'accepted' ? 'bg-[#E8DEF8] text-[#1D192B]' : a.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}>
                        {a.status === 'accepted' ? '수락' : a.status === 'rejected' ? '거절' : '대기중'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>수강 중인 강좌</CardTitle></CardHeader>
            <CardContent>
              {(data.enrollments as any[])?.length === 0 ? <p className="text-[#49454F]">수강 중인 강좌가 없습니다.</p> : (
                <div className="space-y-3">
                  {(data.enrollments as any[])?.map((e: any) => (
                    <Link to={`/courses/${e.id}/learn`} key={e.id}>
                      <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div><div className="font-medium">{e.courseTitle}</div><div className="text-sm text-[#49454F]">{e.level}</div></div>
                        <div className="text-sm font-medium text-[#6750A4]">{Math.round(e.progress)}%</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {u.role === 'client' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">내 일거리</h2>
            <Button asChild className="bg-[#6750A4]"><Link to="/jobs/new"><Plus className="h-4 w-4 mr-2" />일거리 등록</Link></Button>
          </div>
          {(data.postedJobs as any[])?.length === 0 ? <Card><CardContent className="p-8 text-center text-[#49454F]">등록한 일거리가 없습니다.</CardContent></Card> : (
            <div className="space-y-3">
              {(data.postedJobs as any[])?.map((j: any) => (
                <Link to={`/jobs/${j.id}`} key={j.id}>
                  <div className="bg-[#FFFBFE] rounded-3xl p-4 flex items-center justify-between transition-all duration-300 ease-in-out hover:bg-gray-50">
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}