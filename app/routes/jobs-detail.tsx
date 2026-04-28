import { Link, redirect, useLoaderData } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { desc, eq, sql } from 'drizzle-orm';
import { ArrowLeft, MapPin, Clock, Users, Eye, Star, Briefcase } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Badge } from '~/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog';
import { db } from '~/lib/db.server';
import { jobs, user, jobApplications, categories } from '~/db/schema';
import { auth } from '~/lib/auth.server';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  const job = await db.select().from(jobs).where(eq(jobs.id, params.jobId!)).limit(1);
  if (!job[0]) throw new Response('Not Found', { status: 404 });
  await db.update(jobs).set({ views: sql`${jobs.views} + 1` }).where(eq(jobs.id, params.jobId!));
  const client = await db.select().from(user).where(eq(user.id, job[0].clientId)).limit(1);
  const category = job[0].categoryId ? await db.select().from(categories).where(eq(categories.id, job[0].categoryId)).limit(1) : [];
  return { job: job[0], client: client[0] || null, category: category[0] || null, user: session?.user ?? null };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return redirect('/login');
  const formData = await request.formData();
  await db.insert(jobApplications).values({
    jobId: params.jobId!,
    workerId: session.user.id,
    coverLetter: formData.get('coverLetter') as string,
    proposedBudget: formData.get('proposedBudget') ? Number(formData.get('proposedBudget')) : null,
    proposedDuration: formData.get('proposedDuration') as string,
  });
  await db.update(jobs).set({ applicationCount: sql`${jobs.applicationCount} + 1` }).where(eq(jobs.id, params.jobId!));
  return redirect(`/jobs/${params.jobId}`);
}

export const meta: MetaFunction<typeof loader> = ({ data }) => [{ title: `${data?.job.title || '일거리'} - poomwork` }];

export default function JobDetail() {
  const { job, client, category, user: currentUser } = useLoaderData<typeof loader>();
  const formatBudget = () => {
    if (job.budgetType === 'negotiable') return '협의 가능';
    const min = job.budgetMin ? new Intl.NumberFormat('ko-KR').format(job.budgetMin) : '';
    const max = job.budgetMax ? new Intl.NumberFormat('ko-KR').format(job.budgetMax) : '';
    return `${min}~${max}원`;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link to="/jobs" className="inline-flex items-center text-sm text-[#49454F] hover:text-[#6750A4] mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" />목록으로 돌아가기
      </Link>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              {category && <Badge variant="outline">{category.name}</Badge>}
              <Badge className="bg-[#E8DEF8] text-[#1D192B]">모집중</Badge>
            </div>
            <h1 className='text-3xl font-bold mb-4'>{job.title}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-[#49454F] mb-6">
              <span className="flex items-center gap-1"><Briefcase className="h-4 w-4" />{formatBudget()}</span>
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{job.duration || '협의'}</span>
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{job.isRemote ? '원격 가능' : job.location || '미정'}</span>
              <span className="flex items-center gap-1"><Users className="h-4 w-4" />지원 {job.applicationCount}명</span>
              <span className="flex items-center gap-1"><Eye className="h-4 w-4" />조회 {job.views}</span>
            </div>
          </div>

          <div className='bg-[#F3EDF7] rounded-3xl p-6'>
            <h2 className='text-lg font-bold mb-4'>프로젝트 설명</h2>
              <div className='whitespace-pre-wrap text-[#1C1B1F]'>{job.description}</div>
          </div>

          {job.requirements && (
            <div className='bg-[#F3EDF7] rounded-3xl p-6'>
              <h2 className='text-lg font-bold mb-4'>요구 역량</h2>
              <div className='flex flex-wrap gap-2'>
                {job.requirements.split(',').map((s) => (
                  <Badge key={s} variant='secondary'>{s.trim()}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {client && (
            <div className='bg-[#F3EDF7] rounded-3xl p-6'>
              <h2 className='text-base font-bold mb-4'>의뢰자 정보</h2>
              <div className='flex items-center gap-3 mb-3'>
                <div className='w-10 h-10 rounded-full bg-[#E8DEF8] flex items-center justify-center text-[#6750A4] font-semibold'>
                  {(client.name || '?')[0]}
                </div>
                <div>
                  <div className='font-medium'>{client.name}</div>
                  <div className='text-sm text-[#49454F]'>{client.location || '한국'}</div>
                </div>
              </div>
              {client.rating > 0 && (
                <div className='flex items-center gap-1 text-sm'>
                  <Star className='h-4 w-4 text-yellow-400 fill-yellow-400' />
                  <span>{client.rating}</span>
                  <span className='text-gray-400'>({client.reviewCount})</span>
                </div>
              )}
            </div>
          )}

          {currentUser && currentUser.role === 'worker' && (
            <Dialog>
              <DialogTrigger asChild>
                <Button className='w-full bg-[#6750A4] hover:bg-purple-800 hover:bg-purple-800 active:scale-95 transition-all duration-300 ease-in-out h-12 rounded-full'>지원하기</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>프로젝트 지원</DialogTitle></DialogHeader>
                <form method='post' className='space-y-4'>
                  <div><label className='text-sm font-medium'>지원서</label><Textarea name='coverLetter' placeholder='자기소개와 관련 경험을 적어주세요' rows={5} required className='bg-[#E7E0EC] rounded-t-xl border-0 border-b-2 border-gray-400' /></div>
                  <div><label className='text-sm font-medium'>제안 금액 (원)</label><Input name='proposedBudget' type='number' placeholder='8000000' className='bg-[#E7E0EC] rounded-t-xl border-0 border-b-2 border-gray-400' /></div>
                  <div><label className='text-sm font-medium'>예상 기간</label><Input name='proposedDuration' placeholder='예: 3개월' className='bg-[#E7E0EC] rounded-t-xl border-0 border-b-2 border-gray-400' /></div>
                  <Button type='submit' className='w-full bg-[#6750A4] hover:bg-purple-800 active:scale-95 transition-all duration-300 ease-in-out h-12 rounded-full'>지원 완료</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
          {!currentUser && (
            <Button asChild className='w-full bg-[#6750A4] hover:bg-purple-800 hover:bg-purple-800 active:scale-95 transition-all duration-300 ease-in-out h-12 rounded-full'><Link to='/login'>로그인 후 지원하기</Link></Button>
          )}
        </div>
      </div>
    </div>
  );
}