import { Link, useLoaderData } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs } from 'react-router';
import { eq, desc } from 'drizzle-orm';
import { MapPin, Star, ExternalLink, Briefcase } from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { StarRating } from '~/components/ui/star-rating';
import { db } from '~/lib/db.server';
import { user, portfolios, reviews } from '~/db/schema';

export async function loader({ params }: LoaderFunctionArgs) {
  const worker = await db.select().from(user).where(eq(user.id, params.workerId!)).limit(1);
  if (!worker[0]) throw new Response('Not Found', { status: 404 });
  const portfolioList = await db.select().from(portfolios).where(eq(portfolios.workerId, params.workerId!));
  const reviewList = await db.select({ id: reviews.id, rating: reviews.rating, comment: reviews.comment, createdAt: reviews.createdAt, reviewerName: user.name, jobId: reviews.jobId, jobTitle: '일거리' })
    .from(reviews).leftJoin(user, eq(reviews.reviewerId, user.id)).where(eq(reviews.revieweeId, params.workerId!)).orderBy(desc(reviews.createdAt)).limit(20);
  return { worker: worker[0], portfolios: portfolioList, reviews: reviewList };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => [{ title: `${data?.worker.name || '인력'} - poomwork` }];

export default function WorkerDetail() {
  const { worker: w, portfolios: pf, reviews: rw } = useLoaderData<typeof loader>();
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link to='/workers' className='inline-flex items-center text-sm text-[#635F69] hover:text-[#7C3AED] mb-6 transition-all duration-200 ease-in-out'>← 목록으로</Link>
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className='bg-[#EDE9FE] rounded-[32px] p-6 text-center'>
            <div className='w-20 h-20 rounded-[20px] bg-[#EDE9FE] flex items-center justify-center text-[#7C3AED] font-bold text-3xl mx-auto mb-4'>
              {(w.name || '?')[0]}
            </div>
            <h1 className='text-2xl font-bold'>{w.name}</h1>
            {w.location && <div className='flex items-center gap-1 justify-center text-sm text-[#635F69] mt-1'><MapPin className='h-4 w-4' />{w.location}</div>}
            {w.rating > 0 && (
              <div className='flex items-center gap-1 justify-center mt-2'>
              <StarRating value={w.rating} readonly size='sm' />
                <span>{w.rating}</span>
                <span className='text-gray-400'>({w.reviewCount} 리뷰)</span>
              </div>
            )}
            {w.skills && (
              <div className='flex flex-wrap gap-1 mt-4 justify-center'>
                {w.skills.split(',').map((s) => <Badge key={s} variant='secondary'>{s.trim()}</Badge>)}
              </div>
            )}
          </div>
        </div>
        <div className="md:col-span-2 space-y-6">
          {w.bio && (
            <div className='bg-[#EDE9FE] rounded-[32px] p-6'>
              <h2 className='text-lg font-bold mb-4'>소개</h2>
              <p className='text-[#332F3A]'>{w.bio}</p>
            </div>
          )}
          {pf.length > 0 && (
            <div className='bg-[#EDE9FE] rounded-[32px] p-6'>
              <h2 className='text-lg font-bold mb-4'>포트폴리오</h2>
              <div className='space-y-4'>
                {pf.map((p) => (
                  <div key={p.id} className='bg-[#F4F1FA] rounded-[32px] p-4'>
                    <div className='flex items-start justify-between'>
                      <div>
                        <h3 className='font-semibold'>{p.title}</h3>
                        <p className='text-sm text-[#635F69] mt-1'>{p.description}</p>
                        {p.skills && (
                          <div className='flex flex-wrap gap-1 mt-2'>
                            {p.skills.split(',').map((s) => <Badge key={s} variant='outline' className='text-xs'>{s.trim()}</Badge>)}
                          </div>
                        )}
                      </div>
                      {p.projectUrl && <a href={p.projectUrl} target='_blank' rel='noopener noreferrer'><ExternalLink className='h-4 w-4 text-gray-400' /></a>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Reviews */}
          {rw && rw.length > 0 && (
            <div className='bg-[#EDE9FE] rounded-[32px] p-6'>
              <h2 className='text-lg font-bold mb-4'>리뷰 ({rw.length})</h2>
              <div className='space-y-3'>
                {rw.map((r: any) => (
                  <div key={r.id} className='bg-[#F4F1FA] rounded-[24px] p-4'>
                    <div className='flex items-center justify-between mb-2'>
                      <div className='flex items-center gap-2'>
                        <div className='w-7 h-7 rounded-[20px] bg-[#EDE9FE] flex items-center justify-center text-[#7C3AED] text-xs font-semibold'>{(r.reviewerName || '?')[0]}</div>
                        <span className='text-sm font-medium'>{r.reviewerName || '익명'}</span>
                      </div>
                      <span className='text-xs text-[#635F69]'>{new Date(r.createdAt).toLocaleDateString('ko-KR')}</span>
                    </div>
                    <StarRating value={r.rating} readonly size='sm' />
                    {r.comment && <p className='text-sm text-[#332F3A] mt-2 whitespace-pre-wrap'>{r.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          <Button asChild className='bg-[#7C3AED] hover:bg-#7C3AED active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200 rounded-[20px]'><Link to='/login'>문의하기</Link></Button>
        </div>
      </div>
    </div>
  );
}