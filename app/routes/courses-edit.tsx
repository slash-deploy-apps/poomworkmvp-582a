import { useState } from 'react';
import { redirect, useLoaderData, useNavigation } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { eq } from 'drizzle-orm';
import { db } from '~/lib/db.server';
import { courses, categories } from '~/db/schema';
import { auth } from '~/lib/auth.server';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Label } from '~/components/ui/label';
import { ImageUploader } from '~/components/image-uploader';

export const meta: MetaFunction = () => [{ title: '강좌 수정 - poomwork' }];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return redirect('/login');
  const course = await db.select().from(courses).where(eq(courses.id, params.courseId!)).limit(1);
  if (!course[0] || course[0].instructorId !== session.user.id) return redirect('/dashboard');
  const cats = await db.select().from(categories).orderBy(categories.sortOrder);
  return { course: course[0], categories: cats };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return redirect('/login');
  const course = await db.select().from(courses).where(eq(courses.id, params.courseId!)).limit(1);
  if (!course[0] || course[0].instructorId !== session.user.id) return redirect('/dashboard');
  
  const formData = await request.formData();
  const thumbnailUrl = formData.get('thumbnailUrl') as string;
  
  await db.update(courses).set({
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    thumbnailUrl: thumbnailUrl || null,
    categoryId: Number(formData.get('categoryId')) || null,
    price: Number(formData.get('price')) || 0,
    level: formData.get('level') as string,
    duration: formData.get('duration') as string,
    tags: formData.get('tags') as string,
    status: formData.get('status') as string,
  }).where(eq(courses.id, params.courseId!));
  
  return redirect('/dashboard');
}

export default function CoursesEdit() {
  const { course, categories: cats } = useLoaderData<typeof loader>();
  const [thumbnailUrl, setThumbnailUrl] = useState<string>(course.thumbnailUrl || '');
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className='text-3xl font-bold mb-8'>강좌 수정</h1>
      <div className='bg-[#EDE9FE] rounded-[32px] p-6'>
        <form method='post' className='space-y-6'>
          <div className='space-y-2'>
            <Label>썸네일 이미지</Label>
            <ImageUploader endpoint='courseThumbnail' onUploadComplete={setThumbnailUrl} onRemove={() => setThumbnailUrl('')} />
            <input type='hidden' name='thumbnailUrl' value={thumbnailUrl} />
          </div>
          <div className='space-y-2'>
            <Label>강좌 제목 *</Label>
            <Input name='title' defaultValue={course.title} required className='bg-white rounded-[20px] border-0 h-12 px-4 text-[#332F3A]' />
          </div>
          <div className='space-y-2'>
            <Label>카테고리</Label>
            <select name='categoryId' defaultValue={course.categoryId || ''} className='w-full bg-white rounded-[20px] border-0 h-12 px-4 text-[#332F3A]'>
              <option value=''>선택하세요</option>
              {cats.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className='space-y-2'>
            <Label>강좌 설명 *</Label>
            <Textarea name='description' defaultValue={course.description} rows={6} required className='bg-white rounded-[20px] border-0 p-4 text-[#332F3A] resize-none' />
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label>가격 (원)</Label>
              <Input name='price' type='number' defaultValue={course.price} className='bg-white rounded-[20px] border-0 h-12 px-4 text-[#332F3A]' />
            </div>
            <div className='space-y-2'>
              <Label>난이도</Label>
              <select name='level' defaultValue={course.level} className='w-full bg-white rounded-[20px] border-0 h-12 px-4 text-[#332F3A]'>
                <option value='beginner'>초급</option>
                <option value='intermediate'>중급</option>
                <option value='advanced'>고급</option>
              </select>
            </div>
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label>예상 시간</Label>
              <Input name='duration' defaultValue={course.duration || ''} placeholder='예: 10시간' className='bg-white rounded-[20px] border-0 h-12 px-4 text-[#332F3A]' />
            </div>
            <div className='space-y-2'>
              <Label>상태</Label>
              <select name='status' defaultValue={course.status} className='w-full bg-white rounded-[20px] border-0 h-12 px-4 text-[#332F3A]'>
                <option value='draft'>draft</option>
                <option value='published'>published</option>
                <option value='archived'>archived</option>
              </select>
            </div>
          </div>
          <div className='space-y-2'>
            <Label>태그</Label>
            <Input name='tags' defaultValue={course.tags || ''} placeholder='예: React, 프론트엔드' className='bg-white rounded-[20px] border-0 h-12 px-4 text-[#332F3A]' />
          </div>
          <Button type='submit' disabled={isSubmitting} className='w-full bg-[#7C3AED] hover:bg-[#5a3d95] active:scale-[0.92] h-14 rounded-[20px] text-base font-medium'>{isSubmitting ? '저장 중...' : '저장하기'}</Button>
        </form>
      </div>
    </div>
  );
}
