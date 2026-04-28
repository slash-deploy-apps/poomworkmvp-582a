import { useState } from 'react';
import { Link, redirect, useLoaderData, useNavigate, useParams } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { eq, sql, and } from 'drizzle-orm';
import { CheckCircle, Play, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Progress } from '~/components/ui/progress';
import { Sheet, SheetContent, SheetTrigger } from '~/components/ui/sheet';
import { db } from '~/lib/db.server';
import { courses, courseChapters, courseLessons, enrollments, lessonProgress } from '~/db/schema';
import { auth } from '~/lib/auth.server';

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
  return { course: course[0], chapters, lessons, enrollment: enrollment[0], watchedIds, currentLesson, currentLessonId };
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
  const progressPct = totalLessons[0]?.count > 0 ? (Number(watchedCount[0]?.count || 0) / Number(totalLessons[0].count)) * 100 : 0;
  const completedAt = progressPct >= 100 ? new Date() : null;
  await db.update(enrollments).set({ progress: progressPct, completedAt }).where(eq(enrollments.id, enrollment[0].id));
  return null;
}

export const meta: MetaFunction = () => [{ title: '학습 - poomwork' }];

export default function CourseLearn() {
  const { course, chapters, lessons, enrollment, watchedIds, currentLesson, currentLessonId } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const progressPct = Math.round(enrollment.progress);
  const currentIndex = lessons.findIndex(l => l.id === currentLessonId);
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

  const SidebarContent = () => (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-sm line-clamp-2">{course.title}</h2>
        <div className="mt-2"><Progress value={progressPct} className="h-2" /><p className="text-xs text-gray-500 mt-1">{progressPct}% 완료</p></div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {chapters.map((ch) => {
          const chLessons = lessons.filter(l => l.chapterId === ch.id);
          return (
            <div key={ch.id} className="border-b">
              <div className="px-4 py-2 bg-gray-50 text-sm font-medium">{ch.title}</div>
              {chLessons.map((l) => (
                <button key={l.id} onClick={() => navigate(`/courses/${course.id}/learn?lesson=${l.id}`)} className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-blue-50 transition-colors ${l.id === currentLessonId ? 'bg-blue-50 text-blue-700 font-medium' : ''}`}>
                  {watchedIds.has(l.id) ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" /> : <Play className="h-4 w-4 text-gray-400 shrink-0" />}
                  <span className="truncate">{l.title}</span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Desktop sidebar */}
      <div className="hidden md:block w-80 border-r overflow-y-auto"><SidebarContent /></div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 bg-black flex items-center justify-center">
          {currentLesson?.videoUrl ? (
            <video key={currentLesson.id} controls className="w-full h-full" autoPlay><source src={currentLesson.videoUrl} type="video/mp4" /></video>
          ) : (
            <div className="text-center text-gray-400">
              <Play className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p>비디오 준비 중</p>
              <p className="text-sm mt-1">{currentLesson?.title}</p>
            </div>
          )}
        </div>
        <div className="p-4 border-t bg-white">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-semibold">{currentLesson?.title}</h3>
              <p className="text-sm text-gray-500">{Math.floor((currentLesson?.duration || 0) / 60)}분 {(currentLesson?.duration || 0) % 60}초</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Mobile sidebar trigger */}
              <Sheet><SheetTrigger asChild className="md:hidden"><Button variant="outline" size="sm"><Menu className="h-4 w-4" /></Button></SheetTrigger><SheetContent side="left" className="w-80 p-0"><SidebarContent /></SheetContent></Sheet>
              {prevLesson && <Button variant="outline" size="sm" onClick={() => navigate(`/courses/${course.id}/learn?lesson=${prevLesson.id}`)}><ChevronLeft className="h-4 w-4" />이전</Button>}
              {!watchedIds.has(currentLessonId) && currentLesson && (
                <form method="post"><input type="hidden" name="lessonId" value={currentLesson.id} /><Button type="submit" size="sm" className="bg-green-600 hover:bg-green-700">완료</Button></form>
              )}
              {nextLesson && <Button variant="outline" size="sm" onClick={() => navigate(`/courses/${course.id}/learn?lesson=${nextLesson.id}`)}>다음<ChevronRight className="h-4 w-4" /></Button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}