import { useState } from 'react';
import { Link, redirect, useLoaderData, useNavigate } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { eq, sql, and } from 'drizzle-orm';
import { CheckCircle, Play, ChevronLeft, ChevronRight, Menu, Briefcase } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Progress } from '~/components/ui/progress';
import { Sheet, SheetContent, SheetTrigger } from '~/components/ui/sheet';
import { db } from '~/lib/db.server';
import { courses, courseChapters, courseLessons, enrollments, lessonProgress } from '~/db/schema';
import { auth } from '~/lib/auth.server';
import { getYouTubeEmbedUrl } from '~/lib/youtube';
import { recommendJobsForCourse } from '~/lib/recommend.server';
import type { RecommendedJob } from '~/lib/recommend.server';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return redirect(`/courses/${params.courseId}`);
  const enrollment = await db.select().from(enrollments).where(and(eq(enrollments.userId, session.user.id), eq(enrollments.courseId, params.courseId!))).limit(1);
  if (!enrollment[0]) return redirect(`/courses/${params.courseId}`);
  const course = await db.select().from(courses).where(eq(courses.id, params.courseId!)).limit(1);
  if (!course[0]) throw new Response('Not Found', { status: 404 });
  const chapters = await db.select().from(courseChapters).where(eq(courseChapters.courseId, params.courseId!)).orderBy(courseChapters.sortOrder);
  const lessons = await db.select().from(courseLessons).where(eq(courseLessons.courseId, params.courseId!)).orderBy(courseLessons.sortOrder);
  const progress = await db.select().from(lessonProgress).where(eq(lessonProgress.enrollmentId, enrollment[0].id));
  const watchedIds = new Set(progress.map(p => p.lessonId));
  const url = new URL(request.url);
  const currentLessonId = url.searchParams.get('lesson') || lessons[0]?.id;
  const currentLesson = lessons.find(l => l.id === currentLessonId) || lessons[0];

  // Show related jobs when progress >= 90% (nearly done with course)
  const relatedJobs: RecommendedJob[] = enrollment[0].progress >= 90
    ? await recommendJobsForCourse(params.courseId!, 3)
    : [];

  return { course: course[0], chapters, lessons, enrollment: enrollment[0], watchedIds, currentLesson, currentLessonId, relatedJobs };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return redirect('/login');
  const formData = await request.formData();
  const lessonId = formData.get('lessonId') as string;
  const enrollment = await db.select().from(enrollments).where(and(eq(enrollments.userId, session.user.id), eq(enrollments.courseId, params.courseId!))).limit(1);
  if (!enrollment[0]) return redirect(`/courses/${params.courseId}`);
  await db.insert(lessonProgress).values({ enrollmentId: enrollment[0].id, lessonId }).onConflictDoNothing();
  const totalLessons = await db.select({ count: sql<number>`count(*)` }).from(courseLessons).where(eq(courseLessons.courseId, params.courseId!));
  const watchedCount = await db.select({ count: sql<number>`count(*)` }).from(lessonProgress).where(eq(lessonProgress.enrollmentId, enrollment[0].id));
  const progressPct = (totalLessons[0]?.count ?? 0) > 0 ? (Number(watchedCount[0]?.count ?? 0) / Number(totalLessons[0]?.count ?? 1)) * 100 : 0;
  const completedAt = progressPct >= 100 ? new Date() : null;
  await db.update(enrollments).set({ progress: progressPct, completedAt }).where(eq(enrollments.id, enrollment[0].id));
  return null;
}

export const meta: MetaFunction = () => [{ title: '학습 - poomwork' }];

export default function CourseLearn() {
  const { course, chapters, lessons, enrollment, watchedIds, currentLesson, currentLessonId, relatedJobs } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const progressPct = Math.round(enrollment.progress);
  const currentIndex = lessons.findIndex(l => l.id === currentLessonId);
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

  const SidebarContent = () => (
    <div className="h-full flex flex-col">
      <div className='p-4 bg-gray-50'>
        <h2 className='font-semibold text-sm line-clamp-2'>{course.title}</h2>
        <div className='mt-2'><Progress value={progressPct} className='h-2' /><p className='text-xs text-[#635F69] mt-1'>{progressPct}% 완료</p></div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {chapters.map((ch) => {
          const chLessons = lessons.filter(l => l.chapterId === ch.id);
          return (
            <div key={ch.id} className='bg-gray-100'>
              <div className='px-4 py-2 bg-gray-100 text-sm font-medium'>{ch.title}</div>
              {chLessons.map((l) => (
                <button key={l.id} onClick={() => navigate(`/courses/${course.id}/learn?lesson=${l.id}`)} className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-purple-50 transition-all duration-200 ease-in-out ${l.id === currentLessonId ? 'bg-purple-50 text-blue-700 font-medium' : ''}`}>
                  {watchedIds.has(l.id) ? <CheckCircle className="h-4 w-4 text-[#DB2777] shrink-0" /> : <Play className="h-4 w-4 text-gray-400 shrink-0" />}
                  <span className="truncate">{l.title}</span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );

  const firstTag = course.tags ? course.tags.split(',').map((t) => t.trim()).filter(Boolean)[0] : null;

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <div className='hidden md:block w-80 bg-gray-50 overflow-y-auto'><SidebarContent /></div>

        {/* Main content */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 bg-black flex items-center justify-center min-h-[300px]">
            {currentLesson?.videoUrl ? (
              getYouTubeEmbedUrl(currentLesson.videoUrl) ? (
                <iframe
                  key={currentLesson.id}
                  src={getYouTubeEmbedUrl(currentLesson.videoUrl)!}
                  title={currentLesson.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video key={currentLesson.id} controls className="w-full h-full" autoPlay><source src={currentLesson.videoUrl} type="video/mp4" /></video>
              )
            ) : (
              <div className="text-center text-gray-400">
                <Play className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p>비디오 준비 중</p>
                <p className="text-sm mt-1">{currentLesson?.title}</p>
              </div>
            )}
          </div>
          <div className='p-4 bg-gray-50'>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold">{currentLesson?.title}</h3>
                <p className="text-sm text-[#635F69]">{Math.floor((currentLesson?.duration || 0) / 60)}분 {(currentLesson?.duration || 0) % 60}초</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Mobile sidebar trigger */}
                <Sheet><SheetTrigger asChild className='md:hidden'><Button variant='outline' size='sm' className='rounded-[20px]'><Menu className='h-4 w-4' /></Button></SheetTrigger><SheetContent side='left' className='w-80 p-0'><SidebarContent /></SheetContent></Sheet>
                {prevLesson && <Button variant='outline' size='sm' onClick={() => navigate(`/courses/${course.id}/learn?lesson=${prevLesson!.id}`)} className='rounded-[20px] hover:bg-#7C3AED active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200 ease-in-out'><ChevronLeft className='h-4 w-4' />이전</Button>}
                {!!currentLessonId && !watchedIds.has(currentLessonId) && currentLesson && (
                  <form method='post'><input type='hidden' name='lessonId' value={currentLesson.id} /><Button type='submit' size='sm' className='bg-[#DB2777] hover:bg-[#DB2777] hover:bg-#7C3AED active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200 ease-in-out rounded-[20px]'>완료</Button></form>
                )}
                {nextLesson && <Button variant='outline' size='sm' onClick={() => navigate(`/courses/${course.id}/learn?lesson=${nextLesson.id}`)} className='rounded-[20px] hover:bg-#7C3AED active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200 ease-in-out'>다음<ChevronRight className='h-4 w-4' /></Button>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🎯 관련 일거리 섹션 */}
      {progressPct >= 90 && relatedJobs.length > 0 && (
        <div className="p-6 bg-gradient-to-r from-[#A78BFA] to-[#7C3AED]">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="h-5 w-5 text-white" />
              <h3 className="font-extrabold text-white text-lg" style={{ fontFamily: "'Nunito', sans-serif" }}>
                🎯 강좌 마무리가 코앞이네요! 관련 일감에 도전해보세요
              </h3>
            </div>
            <p className="text-purple-100 text-sm mb-4">배운 기술로 바로 일감을 수주할 수 있어요</p>
            <div className="grid sm:grid-cols-3 gap-4">
              {relatedJobs.map((job) => (
                <Link
                  key={job.id}
                  to={`/jobs/${job.id}`}
                  className="bg-white/15 backdrop-blur-xl border border-white/20 rounded-[24px] p-4 hover:bg-white/25 transition-all duration-200 hover:-translate-y-1 block"
                >
                  <div className="font-bold text-white text-sm line-clamp-2 mb-2" style={{ fontFamily: "'Nunito', sans-serif" }}>
                    {job.title}
                  </div>
                  <div className="text-purple-100 text-xs mb-2">
                    {job.isRemote ? '원격' : job.location || '위치 미정'}
                    {job.budgetMin != null && (
                      <span className="ml-1 font-medium">
                        {new Intl.NumberFormat('ko-KR').format(job.budgetMin)}원~
                      </span>
                    )}
                  </div>
                  {job.matchedSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {job.matchedSkills.slice(0, 2).map((skill) => (
                        <span key={skill} className="bg-white/20 text-white rounded-full px-2 py-0.5 text-xs">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 진도 < 90일 때: 작은 관련 일거리 링크 */}
      {progressPct < 90 && firstTag && (
        <div className="px-6 py-3 bg-[#F5F3FF] border-t border-[#EDE9FE] text-center">
          <span className="text-sm text-[#635F69]">
            {progressPct < 50
              ? `🔥 ${100 - progressPct}%만 더 들으면 관련 일감에 도전할 수 있어요!`
              : `🎯 거의 다 왔어요! ${100 - progressPct}% 남았습니다.`}
          </span>
          {' '}
          <Link
            to={`/jobs?tag=${encodeURIComponent(firstTag)}`}
            className="text-sm font-bold text-[#7C3AED] hover:underline"
          >
            관련 일거리 미리 보기 →
          </Link>
        </div>
      )}
    </div>
  );
}