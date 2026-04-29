import { ImageUploader } from '~/components/image-uploader';
import { useState } from 'react';
import { redirect, useLoaderData, useNavigation } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { db } from '~/lib/db.server';
import { courses, categories } from '~/db/schema';
import { auth } from '~/lib/auth.server';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Label } from '~/components/ui/label';

export const meta: MetaFunction = () => [{ title: '강좌 생성 - poomwork' }];

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return redirect('/login');
  const cats = await db.select().from(categories).orderBy(categories.sortOrder);
  return { categories: cats };
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  console.log('[courses-new action] session:', session?.user?.id);
  if (!session?.user) return redirect('/login');
  const formData = await request.formData();
  const title = formData.get('title') as string;
  const thumbnailUrl = formData.get('thumbnailUrl') as string;
  console.log('[courses-new action] title:', title, 'thumbnailUrl:', thumbnailUrl);

  try {
    const result = await db.insert(courses).values({
      instructorId: session.user.id,
      title,
      description: formData.get('description') as string,
      thumbnailUrl: thumbnailUrl || null,
      categoryId: Number(formData.get('categoryId')) || null,
      price: Number(formData.get('price')) || 0,
      level: formData.get('level') as string || 'beginner',
      duration: formData.get('duration') as string,
      status: 'draft',
    }).returning();
    console.log('[courses-new action] insert success, id:', result[0]?.id);
    return redirect('/my/courses');
  } catch (err: any) {
    console.error('[courses-new action] insert failed:', err);
    throw err;
  }
}

export default function CoursesNew() {
  const { categories: cats } = useLoaderData<typeof loader>();
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className='text-3xl font-bold mb-8'>강좌 생성</h1>
      <div className='bg-[#EDE9FE] rounded-[32px] p-6'>
        <form method='post' className='space-y-6'>
          <div className='space-y-2'>
            <Label>썸네일 이미지</Label>
            <ImageUploader endpoint='courseThumbnail' onUploadComplete={setThumbnailUrl} onRemove={() => setThumbnailUrl('')} />
            <input type='hidden' name='thumbnailUrl' value={thumbnailUrl} />
          </div>
          <div className='space-y-2'>
            <Label>강좌 제목 *</Label>
            <Input name='title' placeholder='예: React 완전 정복' required className='bg-white rounded-[20px] border-0 h-12 px-4 text-[#332F3A] placeholder:text-gray-400 focus:border-[#7C3AED] focus:outline-none' />
          </div>
          <div className='space-y-2'>
            <Label>카테고리</Label>
            <select name='categoryId' className='w-full bg-white rounded-[20px] border-0 h-12 px-4 text-[#332F3A]'>
              <option value=''>선택하세요</option>
              {cats.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className='space-y-2'>
            <Label>강좌 설명 *</Label>
            <Textarea name='description' placeholder='강좌에 대해 자세히 설명해주세요' rows={6} required className='bg-white rounded-[20px] border-0 p-4 text-[#332F3A] placeholder:text-gray-400 focus:border-[#7C3AED] focus:outline-none resize-none' />
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label>가격 (원)</Label>
              <Input name='price' type='number' placeholder='0' defaultValue='0' className='bg-white rounded-[20px] border-0 h-12 px-4 text-[#332F3A] placeholder:text-gray-400' />
            </div>
            <div className='space-y-2'>
              <Label>난이도</Label>
              <select name='level' className='w-full bg-white rounded-[20px] border-0 h-12 px-4 text-[#332F3A]'>
                <option value='beginner'>초급</option>
                <option value='intermediate'>중급</option>
                <option value='advanced'>고급</option>
              </select>
            </div>
          </div>
          <div className='space-y-2'>
            <Label>예상 시간</Label>
            <Input name='duration' placeholder='예: 10시간' className='bg-white rounded-[20px] border-0 h-12 px-4 text-[#332F3A] placeholder:text-gray-400' />
          </div>
          <Button type='submit' disabled={isSubmitting} className='w-full bg-[#7C3AED] hover:bg-[#5a3d95] active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200 ease-in-out h-14 rounded-[20px] text-base font-medium disabled:opacity-50'>{isSubmitting ? '생성 중...' : '생성하기'}</Button>
        </form>
      </div>
    </div>
  );
}
