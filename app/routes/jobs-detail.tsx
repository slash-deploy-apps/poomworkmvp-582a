import { ImageUploader } from '~/components/image-uploader';
import { useState } from 'react';
import { Link, redirect, useLoaderData, useNavigate, Form } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { and, desc, eq, sql } from 'drizzle-orm';
import { ArrowLeft, MapPin, Clock, Users, Eye, Star, Briefcase, Camera, X } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Badge } from '~/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog';
import { StarRating } from '~/components/ui/star-rating';
import { db } from '~/lib/db.server';
import { jobs, user, jobApplications, categories, reviews } from '~/db/schema';
import { auth } from '~/lib/auth.server';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  const job = await db.select().from(jobs).where(eq(jobs.id, params.jobId!)).limit(1);
  if (!job[0]) throw new Response('Not Found', { status: 404 });
  // NOTE: views counter moved to client-side useEffect to avoid loader side-effects
  // await db.update(jobs).set({ views: sql`${jobs.views} + 1` }).where(eq(jobs.id, params.jobId!));
  const client = await db.select().from(user).where(eq(user.id, job[0].clientId)).limit(1);
  const category = job[0].categoryId ? await db.select().from(categories).where(eq(categories.id, job[0].categoryId)).limit(1) : [];
  let hasApplied = false;
  if (session?.user && session.user.role === 'worker') {
    const existing = await db.select({ id: jobApplications.id }).from(jobApplications)
      .where(and(eq(jobApplications.jobId, params.jobId!), eq(jobApplications.workerId, session.user.id))).limit(1);
    hasApplied = existing.length > 0;
  }
  const reviewList = await db.select({ id: reviews.id, rating: reviews.rating, comment: reviews.comment, createdAt: reviews.createdAt, reviewerName: user.name, reviewerImage: user.image, reviewerId: reviews.reviewerId })
    .from(reviews).leftJoin(user, eq(reviews.reviewerId, user.id)).where(eq(reviews.jobId, params.jobId!)).orderBy(desc(reviews.createdAt));
  return { job: job[0], client: client[0] || null, category: category[0] || null, user: session?.user ?? null, hasApplied, reviews: reviewList };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return redirect('/login');
  const formData = await request.formData();
  const actionType = formData.get('_action') as string;

  if (actionType === 'review') {
    const revieweeId = formData.get('revieweeId') as string;
    const rating = Number(formData.get('rating'));
    const comment = formData.get('comment') as string;
    await db.insert(reviews).values({ reviewerId: session.user.id, revieweeId, jobId: params.jobId!, rating, comment });
    const [avg] = await db.select({ avg: sql<number>`coalesce(avg(${reviews.rating}), 0)`, count: sql<number>`count(*)` }).from(reviews).where(eq(reviews.revieweeId, revieweeId));
    await db.update(user).set({ rating: Math.round((avg?.avg ?? 0) * 10) / 10, reviewCount: avg?.count ?? 0 }).where(eq(user.id, revieweeId));
    return redirect(`/jobs/${params.jobId}`);
  }
  if (actionType === 'updateThumbnail') {
    const thumbnailUrl = formData.get('thumbnailUrl') as string || null;
    await db.update(jobs).set({ thumbnailUrl }).where(eq(jobs.id, params.jobId!));
    return redirect(`/jobs/${params.jobId}`);
  }
  if (actionType === 'deleteThumbnail') {
    await db.update(jobs).set({ thumbnailUrl: null }).where(eq(jobs.id, params.jobId!));
    return redirect(`/jobs/${params.jobId}`);
  }
  // Default: job application (form submission without _action)
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
  const { job, client, category, user: currentUser, hasApplied, reviews: reviewList } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [reviewRating, setReviewRating] = useState(0);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const formatBudget = () => {
    if (job.budgetType === 'negotiable') return '협의 가능';
    const min = job.budgetMin ? new Intl.NumberFormat('ko-KR').format(job.budgetMin) : '';
    const max = job.budgetMax ? new Intl.NumberFormat('ko-KR').format(job.budgetMax) : '';
    return `${min}~${max}원`;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link to="/jobs" className="inline-flex items-center text-sm text-[#635F69] hover:text-[#7C3AED] mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" />목록으로 돌아가기
      </Link>
          {/* Thumbnail */}
          {job.thumbnailUrl ? (
            <div className='relative mb-6'>
              <img src={job.thumbnailUrl} alt='' className='w-full max-h-64 object-cover rounded-[32px]' />
              {currentUser && currentUser.id === job.clientId && (
                <div className='absolute top-3 right-3 flex gap-2'>
                  <button type='button' onClick={() => { const el = document.getElementById('job-thumbnail-upload'); el?.click(); }} className='p-2 bg-white/90 rounded-full hover:bg-white shadow-lg'>
                    <Camera className='h-4 w-4 text-[#332F3A]' />
                  </button>
                  <Form method='post' className='inline'>
                    <input type='hidden' name='_action' value='deleteThumbnail' />
                    <button type='submit' className='p-2 bg-white/90 rounded-full hover:bg-white shadow-lg'>
                      <X className='h-4 w-4 text-red-500' />
                    </button>
                  </Form>
                </div>
              )}
            </div>
          ) : (
            currentUser && currentUser.id === job.clientId && (
              <div className='bg-[#EDE9FE] rounded-[32px] p-6 mb-6 text-center'>
                <p className='text-[#635F69] text-sm mb-3'>썸네일 이미지를 추가하세요</p>
                <ImageUploader endpoint='jobThumbnail' onUploadComplete={async (url) => {
                  const data = new FormData();
                  data.append('_action', 'updateThumbnail');
                  data.append('thumbnailUrl', url);
                  await fetch(`/jobs/${job.id}`, { method: 'POST', body: data, credentials: 'same-origin' });
                  navigate(0);
                }} />
              </div>
            )
          )}

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              {category && <Badge variant="outline">{category.name}</Badge>}
              <Badge className={job.status === 'open' ? 'bg-[#EDE9FE] text-[#332F3A]' : 'bg-gray-200 text-[#635F69]'}>{job.status === 'open' ? '모집중' : job.status === 'in_progress' ? '진행중' : '마감'}</Badge>
            </div>
            <h1 className='text-3xl font-bold mb-4'>{job.title}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-[#635F69] mb-6">
              <span className="flex items-center gap-1"><Briefcase className="h-4 w-4" />{formatBudget()}</span>
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{job.duration || '협의'}</span>
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{job.isRemote ? '원격 가능' : job.location || '미정'}</span>
              <span className="flex items-center gap-1"><Users className="h-4 w-4" />지원 {job.applicationCount}명</span>
              <span className="flex items-center gap-1"><Eye className="h-4 w-4" />조회 {job.views}</span>
            </div>
          </div>

          <div className='bg-[#EDE9FE] rounded-[32px] p-6'>
            <h2 className='text-lg font-bold mb-4'>프로젝트 설명</h2>
              <div className='whitespace-pre-wrap text-[#332F3A]'>{job.description}</div>
          </div>

          {job.requirements && (
            <div className='bg-[#EDE9FE] rounded-[32px] p-6'>
              <h2 className='text-lg font-bold mb-4'>요구 역량</h2>
              <div className='flex flex-wrap gap-2'>
                {job.requirements.split(',').map((s) => (
                  <Badge key={s} variant='secondary'>{s.trim()}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Reviews section */}
          {reviewList && reviewList.length > 0 && (
            <div className='bg-[#EDE9FE] rounded-[32px] p-6'>
              <h2 className='text-lg font-bold mb-4'>리뷰 ({reviewList.length})</h2>
              <div className='space-y-4'>
                {reviewList.map((r: any) => (
                  <div key={r.id} className='bg-[#F4F1FA] rounded-[24px] p-4'>
                    <div className='flex items-center gap-3 mb-2'>
                      <div className='w-8 h-8 rounded-[20px] bg-[#EDE9FE] flex items-center justify-center text-[#7C3AED] text-sm font-semibold'>
                        {(r.reviewerName || '?')[0]}
                      </div>
                      <div>
                        <div className='text-sm font-medium'>{r.reviewerName || '익명'}</div>
                        <StarRating value={r.rating} readonly size='sm' />
                      </div>
                      <span className='text-xs text-[#635F69] ml-auto'>{new Date(r.createdAt).toLocaleDateString('ko-KR')}</span>
                    </div>
                    {r.comment && <p className='text-sm text-[#332F3A] whitespace-pre-wrap'>{r.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {client && (
            <div className='bg-[#EDE9FE] rounded-[32px] p-6'>
              <h2 className='text-base font-bold mb-4'>의뢰자 정보</h2>
              <div className='flex items-center gap-3 mb-3'>
                <div className='w-10 h-10 rounded-[20px] bg-[#EDE9FE] flex items-center justify-center text-[#7C3AED] font-semibold'>
                  {(client.name || '?')[0]}
                </div>
                <div>
                  <div className='font-medium'>{client.name}</div>
                  <div className='text-sm text-[#635F69]'>{client.location || '한국'}</div>
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

          {/* Review form for client */}
          {currentUser && currentUser.role === 'client' && currentUser.id === job.clientId && (
            <div className='bg-[#EDE9FE] rounded-[32px] p-6'>
              <h3 className='text-base font-bold mb-3'>리뷰 작성</h3>
              <Form method='post' className='space-y-3'>
                <input type='hidden' name='_action' value='review' />
                <input type='hidden' name='revieweeId' value={job.clientId} />
                <div>
                  <label className='text-sm font-medium text-[#635F69]'>별점</label>
                  <StarRating value={reviewRating} onChange={setReviewRating} />
                  <input type='hidden' name='rating' value={reviewRating} />
                </div>
                <div>
                  <label className='text-sm font-medium text-[#635F69]'>코멘트</label>
                  <Textarea name='comment' placeholder='프로젝트 경험에 대해 적어주세요' rows={3} className='bg-[#EDE9FE] rounded-t-xl border-0 border-b-2 border-gray-400 focus:border-[#7C3AED]' />
                </div>
                <Button type='submit' disabled={reviewRating === 0} className='w-full bg-[#7C3AED] hover:bg-#7C3AED rounded-[20px] active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200 disabled:opacity-50'>리뷰 등록</Button>
              </Form>
            </div>
          )}

          {currentUser && currentUser.role === 'worker' && hasApplied && (
            <div className='bg-[#EDE9FE] rounded-[32px] p-4 text-center'>
              <p className='text-[#332F3A] font-medium'>이미 지원하셨습니다</p>
              <p className='text-sm text-[#635F69] mt-1'>지원 결과는 대시보드에서 확인하세요</p>
            </div>
          )}
          {currentUser && currentUser.role === 'worker' && !hasApplied && job.status !== 'open' && (
            <div className='bg-gray-100 rounded-[32px] p-4 text-center'>
              <p className='text-[#635F69] font-medium'>마감된 일거리입니다</p>
            </div>
          )}
          {currentUser && currentUser.role === 'worker' && !hasApplied && job.status === 'open' && (
            showApplyForm ? (
              <div className='bg-[#EDE9FE] rounded-[32px] p-6'>
                <div className='flex items-center justify-between mb-4'>
                  <h3 className='text-base font-bold'>프로젝트 지원</h3>
                  <button type='button' onClick={() => setShowApplyForm(false)} className='text-sm text-[#635F69] hover:text-[#332F3A]'>취소</button>
                </div>
                <Form method='post' className='space-y-4'>
                  <div><label className='text-sm font-medium'>지원서</label><Textarea name='coverLetter' placeholder='자기소개와 관련 경험을 적어주세요' rows={5} required className='bg-white rounded-[20px] border-0 p-4 text-[#332F3A] placeholder:text-gray-400' /></div>
                  <div><label className='text-sm font-medium'>제안 금액 (원)</label><Input name='proposedBudget' type='number' placeholder='8000000' className='bg-white rounded-[20px] border-0 h-12 px-4 text-[#332F3A] placeholder:text-gray-400' /></div>
                  <div><label className='text-sm font-medium'>예상 기간</label><Input name='proposedDuration' placeholder='예: 3개월' className='bg-white rounded-[20px] border-0 h-12 px-4 text-[#332F3A] placeholder:text-gray-400' /></div>
                  <Button type='submit' className='w-full bg-[#7C3AED] hover:bg-[#5a3d95] active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200 h-12 rounded-[20px]'>지원 완료</Button>
                </Form>
              </div>
            ) : (
              <Button onClick={() => setShowApplyForm(true)} className='w-full bg-[#7C3AED] hover:bg-[#5a3d95] active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200 h-12 rounded-[20px]'>지원하기</Button>
            )
          )}
          {!currentUser && (
            <Button asChild className='w-full bg-[#7C3AED] hover:bg-#7C3AED active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200 h-12 rounded-[20px]'><Link to='/login'>로그인 후 지원하기</Link></Button>
          )}
        </div>
      </div>
    </div>
  );
}