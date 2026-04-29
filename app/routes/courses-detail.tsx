import { ImageUploader } from '~/components/image-uploader';
import { useState } from 'react';
import { Link, redirect, useLoaderData } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { eq, sql } from 'drizzle-orm';
import { Star, Users, Clock, Play, Lock, Camera, X } from 'lucide-react';
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
  const formData = await request.formData();
  const actionType = formData.get('_action') as string;

  if (actionType === 'updateThumbnail') {
    const thumbnailUrl = formData.get('thumbnailUrl') as string || null;
    await db.update(courses).set({ thumbnailUrl }).where(eq(courses.id, params.courseId!));
    return redirect(`/courses/${params.courseId}`);
  }

  if (actionType === 'deleteThumbnail') {
    await db.update(courses).set({ thumbnailUrl: null }).where(eq(courses.id, params.courseId!));
    return redirect(`/courses/${params.courseId}`);
  }

  if (actionType === 'updateCourse') {
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const categoryId = Number(formData.get('categoryId')) || null;
    const price = Number(formData.get('price')) || 0;
    const level = formData.get('level') as string;
    const duration = formData.get('duration') as string;
    const thumbnailUrl = formData.get('thumbnailUrl') as string || null;
    await db.update(courses).set({ title, description, categoryId, price, level, duration, thumbnailUrl }).where(eq(courses.id, params.courseId!));
    return redirect(`/courses/${params.courseId}`);
  }

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
  const isOwner = currentUser && currentUser.id === c.instructorId;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Link to="/courses" className="inline-flex items-center text-sm text-[#635F69] hover:text-[#7C3AED] mb-6">
        ← 강좌 목록
      </Link>
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          {c.thumbnailUrl ? (
            <div className='relative mb-6'>
              <img src={c.thumbnailUrl} alt='' className='w-full h-48 object-cover rounded-[32px]' />
              {isOwner && (
                <div className='absolute top-3 right-3 flex gap-2'>
                  <button type='button' onClick={() => { const el = document.getElementById('course-thumb-upload'); el?.click(); }} className='p-2 bg-white/90 rounded-full hover:bg-white shadow-lg'>
                    <Camera className='h-4 w-4 text-[#332F3A]' />
                  </button>
                  <form method='post' className='inline'>
                    <input type='hidden' name='_action' value='deleteThumbnail' />
                    <button type='submit' className='p-2 bg-white/90 rounded-full hover:bg-white shadow-lg'>
                      <X className='h-4 w-4 text-red-500' />
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            isOwner ? (
              <div className='bg-gradient-to-br from-[#7C3AED] to-[#DB2777] rounded-[32px] h-48 flex items-center justify-center mb-6 relative'>
                <Play className='h-20 w-20 text-white/40' />
                <div className='absolute inset-0 flex items-center justify-center'>
                  <ImageUploader endpoint='courseThumbnail' onUploadComplete={(url) => {
                    const frm = document.createElement('form');
                    frm.method = 'post';
                    frm.innerHTML = `<input type='hidden' name='_action' value='updateThumbnail' /><input type='hidden' name='thumbnailUrl' value='${url}' />`;
                    document.body.appendChild(frm);
                    frm.submit();
                  }} className='w-32 h-32' />
                </div>
              </div>
            ) : (
              <div className='bg-gradient-to-br from-[#7C3AED] to-[#DB2777] rounded-[32px] h-48 flex items-center justify-center mb-6'>
                <Play className='h-20 w-20 text-white/40' />
              </div>
            )
          )}
          <h1 className="text-3xl font-bold">{c.title}</h1>
          <div className="flex flex-wrap gap-3 text-sm text-[#635F69]">
            <Badge>{levelLabels[c.level] || c.level}</Badge>
            <span className="flex items-center gap-1"><Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />{c.rating} ({c.reviewCount})</span>
            <span className="flex items-center gap-1"><Users className="h-4 w-4" />{c.enrollmentCount}명 수강</span>
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{c.duration || `${Math.round(totalDuration / 60)}분`}</span>
          </div>
          <div className="bg-[#EDE9FE] rounded-[32px] p-6"><h2 className="text-lg font-bold mb-4">강좌 소개</h2><div className="whitespace-pre-wrap">{c.description}</div></div>
          {chapters.length > 0 && (
            <div className="bg-[#EDE9FE] rounded-[32px] p-6">
              <h2 className="text-lg font-bold mb-4">커리큘럼</h2>
              <Accordion type="multiple" className="w-full">
                {chapters.map((ch) => (
                  <AccordionItem key={ch.id} value={ch.id} className="border-b-0 px-2">
                    <AccordionTrigger className="text-left font-semibold hover:no-underline">{ch.title}</AccordionTrigger>
                    <AccordionContent>
                      <div className="pl-4 space-y-2">
                        {lessons.filter(l => l.chapterId === ch.id).map((l) => (
                          <div key={l.id} className="flex items-center gap-2 text-sm text-[#635F69]">
                            {l.isFree ? <Play className="h-4 w-4 text-green-500" /> : <Lock className="h-4 w-4" />}
                            <span>{l.title}</span>
                            <span className="text-xs">({Math.round(l.duration / 60)}분)</span>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}
        </div>
        <div className="space-y-6">
          <div className="bg-white/60 backdrop-blur-xl rounded-[32px] p-6 shadow-clayCard sticky top-8">
            <div className="text-center mb-6">
              {c.price === 0 ? (
                <span className="text-3xl font-bold text-[#7C3AED]">무료</span>
              ) : (
                <>
                  <span className="text-3xl font-bold text-[#332F3A]">{new Intl.NumberFormat('ko-KR').format(c.price)}</span>
                  <span className="text-[#635F69]">원</span>
                </>
              )}
            </div>
            {enrollment ? (
              <Link to={`/courses/${c.id}/learn`}>
                <Button className="w-full bg-[#7C3AED] hover:bg-[#5a3d95] active:scale-[0.92] transition-all h-14 rounded-[20px] text-base font-medium mb-3">
                  계속 학습하기
                </Button>
              </Link>
            ) : (
              <Dialog open={payOpen} onOpenChange={setPayOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-[#7C3AED] hover:bg-[#5a3d95] active:scale-[0.92] transition-all h-14 rounded-[20px] text-base font-medium">
                    {c.price === 0 ? '무료로 시작하기' : '수강 신청하기'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-[32px]">
                  <DialogHeader>
                    <DialogTitle className="text-center">{c.price === 0 ? '무료 수강 신청' : '수강 결제'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="text-center p-4 bg-[#EDE9FE] rounded-[24px]">
                      <p className="text-lg font-semibold">{c.title}</p>
                      {c.price > 0 && <p className="text-2xl font-bold text-[#7C3AED] mt-2">{new Intl.NumberFormat('ko-KR').format(c.price)}원</p>}
                    </div>
                    <form method="post">
                      <Button type="submit" className="w-full bg-[#7C3AED] hover:bg-[#5a3d95] h-14 rounded-[20px] text-base font-medium">
                        {c.price === 0 ? '무료로 수강하기' : '결제하기'}
                      </Button>
                    </form>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {instructor && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-[#635F69] mb-3">강사</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[20px] bg-[#EDE9FE] flex items-center justify-center">
                    {instructor.image ? (
                      <img src={instructor.image} alt={instructor.name || ''} className="w-10 h-10 rounded-[20px] object-cover" />
                    ) : (
                      <span className="text-[#7C3AED] font-semibold">{instructor.name?.[0] || '강'}</span>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-[#332F3A]">{instructor.name || '강사'}</p>
                    {instructor.rating > 0 && <p className="text-xs text-[#635F69]">★ {instructor.rating} ({instructor.reviewCount}개 리뷰)</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
