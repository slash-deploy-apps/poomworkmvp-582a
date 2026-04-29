import { ImageUploader } from '~/components/image-uploader';
import { useState } from 'react';
import { redirect, useLoaderData, useNavigation } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { db } from '~/lib/db.server';
import { jobs, categories } from '~/db/schema';
import { auth } from '~/lib/auth.server';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Label } from '~/components/ui/label';

export const meta: MetaFunction = () => [{ title: '일거리 등록 - poomwork' }];

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return redirect('/login');
  if (session.user.role !== 'client') return redirect('/dashboard');
  const cats = await db.select().from(categories).orderBy(categories.sortOrder);
  return { categories: cats };
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  console.log('[jobs-new action] session:', session?.user?.id, session?.user?.role);
  if (!session?.user) return redirect('/login');
  if (session.user.role !== 'client') return redirect('/dashboard');
  const formData = await request.formData();
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const thumbnailUrl = formData.get('thumbnailUrl') as string;
  console.log('[jobs-new action] title:', title, 'thumbnailUrl:', thumbnailUrl);

  try {
    await db.insert(jobs).values({
      clientId: session.user.id,
      categoryId: Number(formData.get('categoryId')) || null,
      title,
      thumbnailUrl: thumbnailUrl || null,
      description,
      budgetMin: Number(formData.get('budgetMin')) || null,
      budgetMax: Number(formData.get('budgetMax')) || null,
      budgetType: formData.get('budgetType') as string,
      duration: formData.get('duration') as string,
      urgency: formData.get('urgency') as string,
      requirements: formData.get('requirements') as string,
      location: formData.get('location') as string,
      isRemote: formData.get('isRemote') === 'on' ? 1 : 0,
    });
    console.log('[jobs-new action] insert success');
    return redirect('/jobs');
  } catch (err: any) {
    console.error('[jobs-new action] insert failed:', err);
    throw err;
  }
}

export default function JobsNew() {
  const { categories: cats } = useLoaderData<typeof loader>();
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className='text-3xl font-bold mb-8'>일거리 등록</h1>
      <div className='bg-[#EDE9FE] rounded-[32px] p-6'>
        <form method='post' className='space-y-6'>
          <div className='space-y-2'>
            <Label>썸네일 이미지</Label>
            <ImageUploader endpoint='jobThumbnail' onUploadComplete={setThumbnailUrl} onRemove={() => setThumbnailUrl('')} />
            <input type='hidden' name='thumbnailUrl' value={thumbnailUrl} />
          </div>
          <div className='space-y-2'>
            <Label>제목 *</Label>
            <Input name='title' placeholder='예: React 웹앱 개발' required className='bg-white rounded-[20px] border-0 h-12 px-4 text-[#332F3A] placeholder:text-gray-400 focus:border-[#7C3AED] focus:outline-none' />
          </div>
          <div className='space-y-2'>
            <Label>카테고리</Label>
            <select name='categoryId' className='w-full bg-white rounded-[20px] border-0 h-12 px-4 text-[#332F3A]'>
              <option value=''>선택하세요</option>
              {cats.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className='space-y-2'>
            <Label>상세 설명 *</Label>
            <Textarea name='description' placeholder='프로젝트의 상세 내용을 적어주세요' rows={8} required className='bg-white rounded-[20px] border-0 p-4 text-[#332F3A] placeholder:text-gray-400 focus:border-[#7C3AED] focus:outline-none resize-none' />
          </div>
          <div className='space-y-2'>
            <Label>예산 유형</Label>
            <div className='flex gap-4 bg-white rounded-[24px] p-3'>
              {[['fixed', '고정'], ['hourly', '시간당'], ['negotiable', '협의']].map(([v, l]) => (
                <label key={v} className='flex items-center gap-2'><input type='radio' name='budgetType' value={v} defaultChecked={v === 'negotiable'} />{l}</label>
              ))}
            </div>
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'><Label>최소 예산 (원)</Label><Input name='budgetMin' type='number' placeholder='5000000' className='bg-white rounded-[20px] border-0 h-12 px-4 text-[#332F3A] placeholder:text-gray-400' /></div>
            <div className='space-y-2'><Label>최대 예산 (원)</Label><Input name='budgetMax' type='number' placeholder='10000000' className='bg-white rounded-[20px] border-0 h-12 px-4 text-[#332F3A] placeholder:text-gray-400' /></div>
          </div>
          <div className='space-y-2'>
            <Label>예상 기간</Label>
            <select name='duration' className='w-full bg-white rounded-[20px] border-0 h-12 px-4 text-[#332F3A]'>
              {['1주일', '2주일', '1개월', '3개월', '6개월', '협의'].map(v => <option key={v}>{v}</option>)}
            </select>
          </div>
          <div className='space-y-2'>
            <Label>우선순위</Label>
            <div className='flex gap-4 bg-white rounded-[24px] p-3'>
              {[['low', '낮음'], ['medium', '보통'], ['high', '높음']].map(([v, l]) => (
                <label key={v} className='flex items-center gap-2'><input type='radio' name='urgency' value={v} defaultChecked={v === 'medium'} />{l}</label>
              ))}
            </div>
          </div>
          <div className='space-y-2'><Label>요구 역량</Label><Input name='requirements' placeholder='React, TypeScript, Node.js' className='bg-white rounded-[20px] border-0 h-12 px-4 text-[#332F3A] placeholder:text-gray-400' /></div>
          <div className='space-y-2'><Label>근무지</Label><Input name='location' placeholder='서울' className='bg-white rounded-[20px] border-0 h-12 px-4 text-[#332F3A] placeholder:text-gray-400' /></div>
          <label className='flex items-center gap-2'><input type='checkbox' name='isRemote' defaultChecked />원격 근무 가능</label>
          <Button type='submit' disabled={isSubmitting} className='w-full bg-[#7C3AED] hover:bg-[#5a3d95] active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200 ease-in-out h-14 rounded-[20px] text-base font-medium disabled:opacity-50'>{isSubmitting ? '등록 중...' : '등록하기'}</Button>
        </form>
      </div>
    </div>
  );
}
