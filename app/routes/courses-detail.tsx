import { Link, redirect, useLoaderData } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { eq, sql } from 'drizzle-orm';
import { Star, Users, Clock, Play, Lock } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '~/components/ui/accordion';
import { db } from '~/lib/db.server';
import { courses, courseChapters, courseLessons, enrollments, payments, user } from '~/db/schema';
import { auth } from '~/lib/auth.server';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  const course = await db.select().from(courses).where(eq(courses.id, params.courseId!)).limit(1);
  if (!course[0]) throw new Response('Not Found', { status: 404 });
  const instructor = await db.select().from(user).where(eq(user.id, course[0].instructorId)).limit(1);
  const chapters = await db.select().from(courseChapters).where(eq(courseChapters.courseId, params.courseId!)).orderBy(courseChapters.sortOrder);
  const lessons = await db.select().from(courseLessons).where(eq(courseLessons.courseId, params.courseId!)).orderBy(courseLessons.sortOrder);
  const enrollment = session?.user ? await db.select().from(enrollments).where(sql`${enrollments.userId} = ${session.user.id} AND ${enrollments.courseId} = ${params.courseId!}`).limit(1) : [];
  return { course: course[0], instructor: instructor[0] || null, chapters, lessons, enrollment: enrollment[0] || null, user: session?.user ?? null };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return redirect('/login');
  const course = await db.select().from(courses).where(eq(courses.id, params.courseId!)).limit(1);
  if (!course[0]) throw new Response('Not Found', { status: 404 });
  if (course[0].price > 0) {
    await db.insert(payments).values({ payerId: session.user.id, amount: course[0].price, type: 'course_purchase', status: 'escrow', referenceId: params.courseId, paymentMethod: 'card' });
  }
  await db.insert(enrollments).values({ userId: session.user.id, courseId: params.courseId! });
  await db.update(courses).set({ enrollmentCount: sql`${courses.enrollmentCount} + 1` }).where(eq(courses.id, params.courseId!));
  return redirect(`/courses/${params.courseId}/learn`);
}

export const meta: MetaFunction<typeof loader> = ({ data }) => [{ title: `${data?.course.title || '강좌'} - poomwork` }];

export default function CourseDetail() {
  const { course: c, instructor, chapters, lessons, enrollment, user: currentUser } = useLoaderData<typeof loader>();
  const levelLabels: Record<string, string> = { beginner: '초급', intermediate: '중급', advanced: '고급' };
  const totalDuration = lessons.reduce((sum, l) => sum + l.duration, 0);
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className='bg-[#6750A4] rounded-lg h-48 flex items-center justify-center'>
            <Play className="h-20 w-20 text-white/40" />
          </div>
          <h1 className='text-3xl font-bold'>{c.title}</h1>
          <div className="flex flex-wrap gap-3 text-sm text-[#49454F]">
            <Badge>{levelLabels[c.level] || c.level}</Badge>
            <span className="flex items-center gap-1"><Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />{c.rating} ({c.reviewCount})</span>
            <span className="flex items-center gap-1"><Users className="h-4 w-4" />{c.enrollmentCount}명 수강</span>
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{c.duration || `${Math.round(totalDuration / 60)}분`}</span>
          </div>
          <div className='bg-[#F3EDF7] rounded-3xl p-6'><h2 className='text-lg font-bold mb-4'>강좌 소개</h2><div className='whitespace-pre-wrap'>{c.description}</div></div>

          <div>
            <h2 className='text-xl font-bold mb-4'>강의 커리큘럼</h2>
            <Accordion type="multiple" defaultValue={chapters.map(ch => ch.id)}>
              {chapters.map((ch) => (
                <AccordionItem key={ch.id} value={ch.id}>
                  <AccordionTrigger className="text-base">{ch.title}</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1">
                      {lessons.filter(l => l.chapterId === ch.id).map((l) => (
            <div key={l.id} className='flex items-center justify-between p-2 rounded hover:bg-purple-50 transition-all duration-300 ease-in-out'>
                          <div className="flex items-center gap-2">
                            {l.isFree || enrollment ? <Play className="h-4 w-4 text-[#6750A4]" /> : <Lock className="h-4 w-4 text-gray-400" />}
                            <span className="text-sm">{l.title}</span>
                            {l.isFree && <Badge variant="outline" className="text-xs text-[#6750A4]">미리보기</Badge>}
                          </div>
                          <span className="text-xs text-gray-400">{Math.floor(l.duration / 60)}:{String(l.duration % 60).padStart(2, '0')}</span>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>

        <div className="space-y-4">
          <div className='bg-[#F3EDF7] rounded-3xl p-6 sticky top-20'>
            <div className='text-3xl font-bold mb-4'>{c.price === 0 ? '무료' : `${new Intl.NumberFormat('ko-KR').format(c.price)}원`}</div>
            {enrollment ? (
              <Button asChild className='w-full bg-[#6750A4] hover:bg-purple-800 active:scale-95 transition-all duration-300 ease-in-out rounded-full h-14'><Link to={`/courses/${c.id}/learn`}>학습 계속하기</Link></Button>
            ) : currentUser ? (
              <form method='post'><Button type='submit' className='w-full bg-[#6750A4] hover:bg-purple-800 hover:bg-purple-800 active:scale-95 transition-all duration-300 ease-in-out rounded-full h-14'>{c.price === 0 ? '무료로 시작하기' : '수강하기'}</Button></form>
            ) : (
              <Button asChild className='w-full bg-[#6750A4] hover:bg-purple-800 active:scale-95 transition-all duration-300 ease-in-out rounded-full h-14'><Link to='/login'>로그인 후 수강</Link></Button>
            )}
          </div>
          {instructor && (
            <div className='bg-[#F3EDF7] rounded-3xl p-6'>
              <h2 className='text-base font-bold mb-4'>강사 정보</h2>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-full bg-[#E8DEF8] flex items-center justify-center text-[#6750A4] font-semibold'>{(instructor.name || '?')[0]}</div>
                <div><div className='font-medium'>{instructor.name}</div>{instructor.bio && <p className='text-sm text-[#49454F] line-clamp-2'>{instructor.bio}</p>}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}