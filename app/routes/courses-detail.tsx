import { ImageUploader } from '~/components/image-uploader';
import { useState } from 'react';
import { Link, redirect, useLoaderData } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { eq, sql } from 'drizzle-orm';
import { Star, Users, Clock, Play, Lock, Camera, X } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Badge } from '~/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '~/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog';
import { db } from '~/lib/db.server';
import { courses, courseChapters, courseLessons, enrollments, user } from '~/db/schema';
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

  // Instructor-only actions
  const instructorActions = ['addChapter','updateChapter','deleteChapter','addLesson','updateLesson','deleteLesson','updateThumbnail','deleteThumbnail','updateCourse'];
  if (instructorActions.includes(actionType)) {
    if (course[0].instructorId !== session.user.id) return redirect(`/courses/${params.courseId}`);
  }

  if (actionType === 'addChapter') {
    const title = formData.get('title') as string;
    if (!title) return redirect(`/courses/${params.courseId}`);
    const lastChapter = await db.select({ sortOrder: courseChapters.sortOrder }).from(courseChapters).where(eq(courseChapters.courseId, params.courseId!)).orderBy(sql`${courseChapters.sortOrder} DESC`).limit(1);
    const sortOrder = lastChapter[0] ? lastChapter[0].sortOrder + 1 : 1;
    await db.insert(courseChapters).values({ title, courseId: params.courseId!, sortOrder });
    return redirect(`/courses/${params.courseId}`);
  }

  if (actionType === 'updateChapter') {
    const chapterId = formData.get('chapterId') as string;
    const title = formData.get('title') as string;
    if (!chapterId || !title) return redirect(`/courses/${params.courseId}`);
    await db.update(courseChapters).set({ title }).where(eq(courseChapters.id, chapterId));
    return redirect(`/courses/${params.courseId}`);
  }

  if (actionType === 'deleteChapter') {
    const chapterId = formData.get('chapterId') as string;
    if (!chapterId) return redirect(`/courses/${params.courseId}`);
    await db.delete(courseLessons).where(eq(courseLessons.chapterId, chapterId));
    await db.delete(courseChapters).where(eq(courseChapters.id, chapterId));
    return redirect(`/courses/${params.courseId}`);
  }

  if (actionType === 'addLesson') {
    const chapterId = formData.get('chapterId') as string;
    const title = formData.get('title') as string;
    const videoUrl = formData.get('videoUrl') as string;
    const durationMin = Number(formData.get('durationMin')) || 0;
    const isFree = formData.get('isFree') === 'on' ? 1 : 0;
    if (!chapterId || !title) return redirect(`/courses/${params.courseId}`);
    const lastLesson = await db.select({ sortOrder: courseLessons.sortOrder }).from(courseLessons).where(eq(courseLessons.chapterId, chapterId)).orderBy(sql`${courseLessons.sortOrder} DESC`).limit(1);
    const sortOrder = lastLesson[0] ? lastLesson[0].sortOrder + 1 : 1;
    await db.insert(courseLessons).values({ chapterId, courseId: params.courseId!, title, videoUrl: videoUrl || null, duration: durationMin * 60, sortOrder, isFree });
    return redirect(`/courses/${params.courseId}`);
  }

  if (actionType === 'updateLesson') {
    const lessonId = formData.get('lessonId') as string;
    const title = formData.get('title') as string;
    const videoUrl = formData.get('videoUrl') as string;
    const durationMin = Number(formData.get('durationMin')) || 0;
    const isFree = formData.get('isFree') === 'on' ? 1 : 0;
    if (!lessonId || !title) return redirect(`/courses/${params.courseId}`);
    await db.update(courseLessons).set({ title, videoUrl: videoUrl || null, duration: durationMin * 60, isFree }).where(eq(courseLessons.id, lessonId));
    return redirect(`/courses/${params.courseId}`);
  }

  if (actionType === 'deleteLesson') {
    const lessonId = formData.get('lessonId') as string;
    if (!lessonId) return redirect(`/courses/${params.courseId}`);
    await db.delete(courseLessons).where(eq(courseLessons.id, lessonId));
    return redirect(`/courses/${params.courseId}`);
  }

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

  // Free courses only - paid courses go through NicePay widget flow
  if (course[0].price === 0) {
    await db.insert(enrollments).values({ userId: session.user.id, courseId: params.courseId! });
    await db.update(courses).set({ enrollmentCount: sql`${courses.enrollmentCount} + 1` }).where(eq(courses.id, params.courseId!));
    return redirect(`/courses/${params.courseId}/learn`);
  }
  return redirect(`/courses/${params.courseId}`);
}

export const meta: MetaFunction<typeof loader> = ({ data }) => [{ title: `${data?.course.title || '강좌'} - poomwork` }];

function EnrollmentButton({ courseId }: { courseId: string }) {
  const [loading, setLoading] = useState(false);

  const handleEnroll = async () => {
    setLoading(true);
    try {
      const newOrderId = crypto.randomUUID();
      const res = await fetch('/api/payment/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, orderId: newOrderId }),
      });
      const data = await res.json();
      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        console.error('Payment prepare failed:', data);
        alert(data.message || '결제 준비에 실패했습니다.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to prepare payment:', err);
      alert('결제 준비 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleEnroll}
      disabled={loading}
      className="w-full bg-[#7C3AED] hover:bg-[#5a3d95] active:scale-[0.92] transition-all h-14 rounded-[20px] text-base font-medium"
    >
      {loading ? '처리 중...' : '수강 신청하기'}
    </Button>
  );
}

export default function CourseDetail() {
  const { course: c, instructor, chapters, lessons, enrollment, user: currentUser } = useLoaderData<typeof loader>();
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
          {c.tags && (
            <div className="bg-[#EDE9FE] rounded-[32px] p-6">
              <h2 className="text-lg font-bold mb-4">태그</h2>
              <div className="flex flex-wrap gap-2">
                {c.tags.split(',').filter(Boolean).map(t => (
                  <Badge key={t} variant="secondary">{t.trim()}</Badge>
                ))}
              </div>
            </div>
          )}
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
          {isOwner && (
            <div className="bg-[#EDE9FE] rounded-[32px] p-6 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold">커리큘럼 관리</h2>
                <Link to={`/courses/${c.id}/edit`}>
                  <Button size="sm" className="bg-[#7C3AED] hover:bg-[#5a3d95] rounded-[16px]">강좌 정보 수정</Button>
                </Link>
              </div>
              <form method="post" className="flex gap-2">
                <input type="hidden" name="_action" value="addChapter" />
                <Input name="title" placeholder="새 챕터 제목" className="flex-1 rounded-[20px] bg-white border-0" required />
                <Button type="submit" className="bg-[#7C3AED] hover:bg-[#5a3d95] rounded-[20px]">챕터 추가</Button>
              </form>
              {chapters.map((ch) => {
                const chapterLessons = lessons.filter(l => l.chapterId === ch.id);
                return (
                  <div key={ch.id} className="bg-white rounded-[24px] p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <form method="post" className="flex-1 flex gap-2">
                        <input type="hidden" name="_action" value="updateChapter" />
                        <input type="hidden" name="chapterId" value={ch.id} />
                        <Input name="title" defaultValue={ch.title} className="flex-1 rounded-[20px] border-0" required />
                        <Button type="submit" size="sm" className="bg-[#7C3AED] hover:bg-[#5a3d95] rounded-[16px]">저장</Button>
                      </form>
                      <form method="post" onSubmit={(e) => { if (!confirm('챕터를 삭제하면 해당 레슨도 모두 삭제됩니다. 계속하시겠습니까?')) e.preventDefault(); }}>
                        <input type="hidden" name="_action" value="deleteChapter" />
                        <input type="hidden" name="chapterId" value={ch.id} />
                        <Button type="submit" size="sm" variant="destructive" className="rounded-[16px]">삭제</Button>
                      </form>
                    </div>
                    <div className="pl-4 space-y-2">
                      {chapterLessons.map((l) => (
                        <LessonItem key={l.id} lesson={l} />
                      ))}
                      <LessonForm chapterId={ch.id} />
                    </div>
                  </div>
                );
              })}
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
            ) : currentUser ? (
              c.price === 0 ? (
                <form method="post">
                  <Button type="submit" className="w-full bg-[#7C3AED] hover:bg-[#5a3d95] active:scale-[0.92] transition-all h-14 rounded-[20px] text-base font-medium">
                    무료로 시작하기
                  </Button>
                </form>
              ) : (
                <EnrollmentButton courseId={c.id} />
              )
            ) : (
              <Link to="/login">
                <Button className="w-full bg-[#7C3AED] hover:bg-[#5a3d95] active:scale-[0.92] transition-all h-14 rounded-[20px] text-base font-medium">
                  수강 신청하기
                </Button>
              </Link>
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

function LessonItem({ lesson }: { lesson: { id: string; title: string; videoUrl: string | null; duration: number; isFree: boolean } }) {
  const [editOpen, setEditOpen] = useState(false);
  return (
    <div className='flex items-center gap-2 bg-[#EDE9FE] rounded-[16px] p-3'>
      <div className='flex-1'>
        <p className='text-sm font-medium'>{lesson.title}</p>
        <p className='text-xs text-[#635F69]'>{Math.round(lesson.duration / 60)}분{lesson.videoUrl ? ' • 영상 있음' : ''}</p>
      </div>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger asChild>
          <Button size='sm' variant='ghost' className='rounded-[12px]' onClick={() => setEditOpen(true)}>편집</Button>
        </DialogTrigger>
        <DialogContent className='rounded-[24px]'>
          <DialogHeader><DialogTitle>레슨 편집</DialogTitle></DialogHeader>
          <form method="post" className="space-y-4 pt-4">
            <input type="hidden" name="_action" value="updateLesson" />
            <input type="hidden" name="lessonId" value={lesson.id} />
            <div><label className='text-sm font-medium'>레슨 제목</label><Input name="title" defaultValue={lesson.title} className="mt-1 rounded-[16px]" required /></div>
            <div><label className='text-sm font-medium'>유튜브 링크</label><Input name="videoUrl" defaultValue={lesson.videoUrl || ''} placeholder='https://youtube.com/...' className="mt-1 rounded-[16px]" /></div>
            <div><label className='text-sm font-medium'>예상 시간 (분)</label><Input name="durationMin" type="number" defaultValue={Math.round(lesson.duration / 60)} min='1' className="mt-1 rounded-[16px]" required /></div>
            <div className='flex items-center gap-2'><Input type='checkbox' name='isFree' defaultChecked={lesson.isFree} className='w-4 h-4' /><label className='text-sm'>맛보기 레슨</label></div>
            <Button type='submit' className='w-full bg-[#7C3AED] hover:bg-[#5a3d95] rounded-[16px]' onClick={() => setEditOpen(false)}>저장</Button>
          </form>
        </DialogContent>
      </Dialog>
      <form method="post" onSubmit={(e) => { if (!confirm('이 레슨을 삭제하시겠습니까?')) e.preventDefault(); }}>
        <input type="hidden" name="_action" value="deleteLesson" />
        <input type="hidden" name="lessonId" value={lesson.id} />
        <Button type="submit" size='sm' variant='ghost' className='text-red-500 rounded-[12px]'>삭제</Button>
      </form>
    </div>
  );
}

function LessonForm({ chapterId }: { chapterId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size='sm' variant='ghost' className='rounded-[12px]' onClick={() => setOpen(true)}>+ 레슨 추가</Button>
      </DialogTrigger>
      <DialogContent className='rounded-[24px]'>
        <DialogHeader><DialogTitle>새 레슨 추가</DialogTitle></DialogHeader>
        <form method="post" className="space-y-4 pt-4">
          <input type="hidden" name="_action" value="addLesson" />
          <input type="hidden" name="chapterId" value={chapterId} />
          <div><label className='text-sm font-medium'>레슨 제목</label><Input name="title" placeholder='레슨 제목' className="mt-1 rounded-[16px]" required /></div>
          <div><label className='text-sm font-medium'>유튜브 링크</label><Input name="videoUrl" placeholder='https://youtube.com/...' className="mt-1 rounded-[16px]" /></div>
          <div><label className='text-sm font-medium'>예상 시간 (분)</label><Input name="durationMin" type="number" min='1' defaultValue='10' className="mt-1 rounded-[16px]" required /></div>
          <div className='flex items-center gap-2'><Input type='checkbox' name='isFree' className='w-4 h-4' /><label className='text-sm'>맛보기 레슨</label></div>
          <Button type='submit' className='w-full bg-[#7C3AED] hover:bg-[#5a3d95] rounded-[16px]' onClick={() => setOpen(false)}>추가</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
