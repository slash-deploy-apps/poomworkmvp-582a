import { useState } from 'react';
import { Link, redirect, useLoaderData } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { eq, sql } from 'drizzle-orm';
import { Star, Users, Clock, Play, Lock, CreditCard } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '~/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog';
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
  const [payOpen, setPayOpen] = useState(false);
  const levelLabels: Record<string, string> = { beginner: '초급', intermediate: '중급', advanced: '고급' };
  const totalDuration = lessons.reduce((sum, l) => sum + l.duration, 0);
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className='bg-[#7C3AED] rounded-lg h-48 flex items-center justify-center'>
            <Play className="h-20 w-20 text-white/40" />
          </div>
          <h1 className='text-3xl font-bold'>{c.title}</h1>
          <div className="flex flex-wrap gap-3 text-sm text-[#635F69]">
            <Badge>{levelLabels[c.level] || c.level}</Badge>
            <span className="flex items-center gap-1"><Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />{c.rating} ({c.reviewCount})</span>
            <span className="flex items-center gap-1"><Users className="h-4 w-4" />{c.enrollmentCount}명 수강</span>
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{c.duration || `${Math.round(totalDuration / 60)}분`}</span>
          </div>
          <div className='bg-[#EDE9FE] rounded-[32px] p-6'><h2 className='text-lg font-bold mb-4'>강좌 소개</h2><div className='whitespace-pre-wrap'>{c.description}</div></div>

          <div>
            <h2 className='text-xl font-bold mb-4'>강의 커리큘럼</h2>
            <Accordion type="multiple" defaultValue={chapters.map(ch => ch.id)}>
              {chapters.map((ch) => (
                <AccordionItem key={ch.id} value={ch.id}>
                  <AccordionTrigger className="text-base">{ch.title}</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1">
                      {lessons.filter(l => l.chapterId === ch.id).map((l) => (
            <div key={l.id} className='flex items-center justify-between p-2 rounded hover:bg-purple-50 transition-all duration-200 ease-in-out'>
                          <div className="flex items-center gap-2">
                            {l.isFree || enrollment ? <Play className="h-4 w-4 text-[#7C3AED]" /> : <Lock className="h-4 w-4 text-gray-400" />}
                            <span className="text-sm">{l.title}</span>
                            {l.isFree && <Badge variant="outline" className="text-xs text-[#7C3AED]">미리보기</Badge>}
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
          <div className='bg-[#EDE9FE] rounded-[32px] p-6 sticky top-20'>
            <div className='text-3xl font-bold mb-4'>{c.price === 0 ? '무료' : `${new Intl.NumberFormat('ko-KR').format(c.price)}원`}</div>
            {enrollment ? (
              <Button asChild className='w-full bg-[#7C3AED] hover:bg-#7C3AED active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200 ease-in-out rounded-[20px] h-14'><Link to={`/courses/${c.id}/learn`}>학습 계속하기</Link></Button>
            ) : currentUser ? (
              c.price === 0 ? (
                <form method='post'><Button type='submit' className='w-full bg-[#7C3AED] hover:bg-#7C3AED active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200 rounded-[20px] h-14'>무료로 시작하기</Button></form>
              ) : (
                <Dialog open={payOpen} onOpenChange={setPayOpen}>
                  <DialogTrigger asChild>
                    <Button className='w-full bg-[#7C3AED] hover:bg-#7C3AED active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200 rounded-[20px] h-14'>수강하기</Button>
                  </DialogTrigger>
                  <DialogContent className='sm:max-w-md'>
                    <DialogHeader><DialogTitle className='text-xl'>결제 확인</DialogTitle></DialogHeader>
                    <div className='space-y-4 mt-2'>
                      {/* Course info card */}
                      <div className='bg-gradient-to-br from-[#7C3AED] to-[#DB2777] rounded-[32px] p-5 text-white'>
                        <p className='text-purple-200 text-sm font-medium'>강좌</p>
                        <p className='font-bold text-lg mt-1'>{c.title}</p>
                        <div className='flex items-center gap-2 mt-3 text-purple-200 text-sm'>
                          <Clock className='h-4 w-4' />
                          <span>{c.duration || '자유 학습'}</span>
                          <span className='mx-1'>·</span>
                          <span>{levelLabels[c.level] || c.level}</span>
                        </div>
                      </div>
                      {/* Price breakdown */}
                      <div className='bg-[#EDE9FE] rounded-[32px] p-5'>
                        <div className='flex items-center justify-between mb-3'>
                          <span className='text-[#635F69]'>수강료</span>
                          <span className='text-2xl font-bold text-[#7C3AED]'>{new Intl.NumberFormat('ko-KR').format(c.price)}원</span>
                        </div>
                        <div className='border-t border-[#EDE9FE] pt-3 flex items-center justify-between'>
                          <span className='text-sm text-[#635F69]'>결제 수단</span>
                          <span className='text-sm font-medium'>가상 신용카드</span>
                        </div>
                      </div>
                      {/* Security notice */}
                      <div className='flex items-center gap-3 bg-[#EDE9FE] rounded-[24px] p-4'>
                        <div className='w-10 h-10 rounded-[20px] bg-[#7C3AED] flex items-center justify-center shrink-0'>
                          <CreditCard className='h-5 w-5 text-white' />
                        </div>
                        <div>
                          <p className='text-sm font-medium text-[#332F3A]'>에스크로 안전 결제</p>
                          <p className='text-xs text-[#635F69]'>결제 금액은 안전하게 보관되며 강좌 완료 후 정산됩니다</p>
                        </div>
                      </div>
                      {/* Actions */}
                      <form method='post' className='flex gap-3 pt-1'>
                        <Button type='button' variant='outline' onClick={() => setPayOpen(false)} className='flex-1 rounded-[20px] h-12 border-[#7C3AED] text-[#332F3A] hover:bg-[#EDE9FE] active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200'>취소</Button>
                        <Button type='submit' className='flex-1 bg-[#7C3AED] hover:bg-#7C3AED rounded-[20px] h-12 text-base font-medium active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200'>{new Intl.NumberFormat('ko-KR').format(c.price)}원 결제</Button>
                      </form>
                    </div>
                  </DialogContent>
                </Dialog>
              )
            ) : (
              <Button asChild className='w-full bg-[#7C3AED] hover:bg-#7C3AED active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200 ease-in-out rounded-[20px] h-14'><Link to='/login'>로그인 후 수강</Link></Button>
            )}
          </div>
          {instructor && (
            <div className='bg-[#EDE9FE] rounded-[32px] p-6'>
              <h2 className='text-base font-bold mb-4'>강사 정보</h2>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-[20px] bg-[#EDE9FE] flex items-center justify-center text-[#7C3AED] font-semibold'>{(instructor.name || '?')[0]}</div>
                <div><div className='font-medium'>{instructor.name}</div>{instructor.bio && <p className='text-sm text-[#635F69] line-clamp-2'>{instructor.bio}</p>}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}