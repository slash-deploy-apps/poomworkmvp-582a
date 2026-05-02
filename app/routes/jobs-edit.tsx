import { redirect, useLoaderData, useNavigation } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { eq } from 'drizzle-orm';
import { db } from '~/lib/db.server';
import { jobs, categories } from '~/db/schema';
import { auth } from '~/lib/auth.server';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Label } from '~/components/ui/label';

export const meta: MetaFunction = () => [{ title: '일거리 수정 - poomwork' }];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return redirect('/login');
  const job = await db.select().from(jobs).where(eq(jobs.id, params.jobId!)).limit(1);
  if (!job[0] || job[0].clientId !== session.user.id) return redirect('/dashboard');
  const cats = await db.select().from(categories).orderBy(categories.sortOrder);
  return { job: job[0], categories: cats };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return redirect('/login');
  const job = await db.select().from(jobs).where(eq(jobs.id, params.jobId!)).limit(1);
  if (!job[0] || job[0].clientId !== session.user.id) return redirect('/dashboard');
  
  const formData = await request.formData();
  await db.update(jobs).set({
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    budgetMin: Number(formData.get('budgetMin')) || null,
    budgetMax: Number(formData.get('budgetMax')) || null,
    budgetType: formData.get('budgetType') as string,
    status: formData.get('status') as string,
    urgency: formData.get('urgency') as string,
    requirements: formData.get('requirements') as string,
    tags: formData.get('tags') as string,
    location: formData.get('location') as string,
    isRemote: formData.get('isRemote') === '1' ? 1 : 0,
  }).where(eq(jobs.id, params.jobId!));
  
  return redirect('/dashboard');
}

export default function JobsEdit() {
  const { job, categories: cats } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className='text-3xl font-bold mb-8'>일거리 수정</h1>
      <div className='bg-[#EDE9FE] rounded-[32px] p-6'>
        <form method='post' className='space-y-6'>
          <div className='space-y-2'>
            <Label>제목 *</Label>
            <Input name='title' defaultValue={job.title} required className='bg-white rounded-[20px] border-0 h-12 px-4 text-[#332F3A]' />
          </div>
          <div className='space-y-2'>
            <Label>설명 *</Label>
            <Textarea name='description' defaultValue={job.description} rows={6} required className='bg-white rounded-[20px] border-0 p-4 text-[#332F3A] resize-none' />
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label>최소 예산</Label>
              <Input name='budgetMin' type='number' defaultValue={job.budgetMin ?? ''} className='bg-white rounded-[20px] border-0 h-12 px-4' />
            </div>
            <div className='space-y-2'>
              <Label>최대 예산</Label>
              <Input name='budgetMax' type='number' defaultValue={job.budgetMax ?? ''} className='bg-white rounded-[20px] border-0 h-12 px-4' />
            </div>
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label>예산 유형</Label>
              <select name='budgetType' defaultValue={job.budgetType} className='w-full bg-white rounded-[20px] border-0 h-12 px-4 text-[#332F3A]'>
                <option value='negotiable'>협의</option>
                <option value='fixed'>고정</option>
              </select>
            </div>
            <div className='space-y-2'>
              <Label>상태</Label>
              <select name='status' defaultValue={job.status} className='w-full bg-white rounded-[20px] border-0 h-12 px-4 text-[#332F3A]'>
                <option value='open'>모집중</option>
                <option value='in_progress'>진행중</option>
                <option value='completed'>완료</option>
                <option value='closed'>마감</option>
              </select>
            </div>
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label>긴급도</Label>
              <select name='urgency' defaultValue={job.urgency || 'medium'} className='w-full bg-white rounded-[20px] border-0 h-12 px-4 text-[#332F3A]'>
                <option value='low'>낮음</option>
                <option value='medium'>보통</option>
                <option value='high'>높음</option>
              </select>
            </div>
            <div className='space-y-2'>
              <Label>카테고리</Label>
              <select name='categoryId' defaultValue={job.categoryId || ''} className='w-full bg-white rounded-[20px] border-0 h-12 px-4 text-[#332F3A]'>
                <option value=''>선택하세요</option>
                {cats.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className='space-y-2'>
            <Label>요구사항</Label>
            <Input name='requirements' defaultValue={job.requirements || ''} className='bg-white rounded-[20px] border-0 h-12 px-4' />
          </div>
          <div className='space-y-2'>
            <Label>태그</Label>
            <Input name='tags' defaultValue={job.tags || ''} className='bg-white rounded-[20px] border-0 h-12 px-4' />
          </div>
          <div className='space-y-2'>
            <Label>위치</Label>
            <Input name='location' defaultValue={job.location || ''} className='bg-white rounded-[20px] border-0 h-12 px-4' />
          </div>
          <div className='flex items-center gap-2'>
            <input type='checkbox' name='isRemote' value='1' defaultChecked={job.isRemote === 1} className='w-4 h-4' />
            <Label className='mb-0'>원격 근무 가능</Label>
          </div>
          <Button type='submit' disabled={isSubmitting} className='w-full bg-[#7C3AED] hover:bg-[#5a3d95] active:scale-[0.92] h-14 rounded-[20px] text-base font-medium'>{isSubmitting ? '저장 중...' : '저장하기'}</Button>
        </form>
      </div>
    </div>
  );
}
