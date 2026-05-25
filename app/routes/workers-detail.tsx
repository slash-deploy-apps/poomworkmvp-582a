import { Link, useLoaderData } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs } from 'react-router';
import { eq, desc, sql, and } from 'drizzle-orm';
import { MapPin, Star, ExternalLink, Briefcase, MessageCircle } from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { StarRating } from '~/components/ui/star-rating';
import { VideoEmbedIframe } from '~/lib/video-embed';
import { db } from '~/lib/db.server';
import { user, portfolios, reviews, services } from '~/db/schema';

export async function loader({ params }: LoaderFunctionArgs) {
  const worker = await db.select().from(user).where(eq(user.id, params.workerId!)).limit(1);
  if (!worker[0]) throw new Response('Not Found', { status: 404 });
  const w = worker[0];

  const portfolioList = await db.select().from(portfolios).where(eq(portfolios.workerId, params.workerId!));
  const reviewList = await db.select({ id: reviews.id, rating: reviews.rating, comment: reviews.comment, createdAt: reviews.createdAt, reviewerName: user.name, jobId: reviews.jobId, jobTitle: sql<string>`'일거리'` })
    .from(reviews).leftJoin(user, eq(reviews.reviewerId, user.id)).where(eq(reviews.revieweeId, params.workerId!)).orderBy(desc(reviews.createdAt)).limit(20);

  const workerServices = await db.select({
    id: services.id,
    title: services.title,
    thumbnailUrl: services.thumbnailUrl,
    price: services.price,
    rating: services.rating,
    reviewCount: services.reviewCount,
    deliveryDays: services.deliveryDays,
  }).from(services).where(and(eq(services.workerId, params.workerId!), eq(services.status, 'active')))
    .orderBy(desc(services.createdAt))
    .limit(10);

  return { worker: w, portfolios: portfolioList, reviews: reviewList, services: workerServices };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => [{ title: `${data?.worker.name || '전문가'} - poomwork` }];

export default function WorkerDetail() {
  const { worker: w, portfolios: pf, reviews: rw, services: ws } = useLoaderData<typeof loader>();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link to='/workers' className='inline-flex items-center text-sm text-[#635F69] hover:text-[#7C3AED] mb-6 transition-all duration-200 ease-in-out'>← 목록으로</Link>
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className='bg-[#EDE9FE] rounded-[32px] p-6 text-center'>
            <div className='w-20 h-20 rounded-[20px] bg-[#EDE9FE] flex items-center justify-center text-[#7C3AED] font-bold text-3xl mx-auto mb-4 overflow-hidden'>
              {w.image ? (
                <img src={w.image} alt={w.name || ''} className='w-20 h-20 object-cover' />
              ) : (
                <span>{(w.name || '?')[0]}</span>
              )}
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
            <Button asChild className='mt-4 w-full bg-[#7C3AED] hover:bg-#7C3AED rounded-[20px] text-white active:scale-[0.92] transition-all duration-200'>
              <Link to={`/messages?peerId=${w.id}`}><MessageCircle className='h-4 w-4 mr-2' />문의하기</Link>
            </Button>
          </div>

          {/* Profile video */}
          {w.videoUrl && (
            <div className='mt-4 rounded-[32px] overflow-hidden'>
              <VideoEmbedIframe url={w.videoUrl} />
            </div>
          )}
        </div>
        <div className="md:col-span-2 space-y-6">
          {w.bio && (
            <div className='bg-[#EDE9FE] rounded-[32px] p-6'>
              <h2 className='text-lg font-bold mb-4'>소개</h2>
              <p className='text-[#332F3A]'>{w.bio}</p>
            </div>
          )}

          {/* Worker's services */}
          {ws.length > 0 && (
            <div className='bg-[#EDE9FE] rounded-[32px] p-6'>
              <div className='flex items-center justify-between mb-4'>
                <h2 className='text-lg font-bold'>서비스</h2>
                <Link to='/services' className='text-sm text-[#7C3AED] hover:underline'>더보기</Link>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                {ws.map((s) => (
                  <Link to={`/services/${s.id}`} key={s.id} className='group'>
                    <div className='bg-[#F4F1FA] rounded-[20px] overflow-hidden transition-all duration-200 hover:scale-[1.02]'>
                      <div className='h-28 bg-[#EDE9FE] flex items-center justify-center overflow-hidden'>
                        {s.thumbnailUrl ? (
                          <img src={s.thumbnailUrl} alt={s.title} className='w-full h-full object-cover' />
                        ) : (
                          <span className='text-2xl'>📦</span>
                        )}
                      </div>
                      <div className='p-3'>
                        <h3 className='font-medium text-sm line-clamp-1'>{s.title}</h3>
                        <span className='font-bold text-[#7C3AED] text-sm'>{s.price.toLocaleString()}원</span>
                        {s.rating > 0 && (
                          <div className='flex items-center gap-1 text-xs text-[#635F69]'>
                            <Star className='h-3 w-3 text-amber-500 fill-amber-500' />{s.rating}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {pf.length > 0 && (
            <div className='bg-[#EDE9FE] rounded-[32px] p-6'>
              <h2 className='text-lg font-bold mb-4'>포트폴리오</h2>
              <div className='grid grid-cols-2 gap-4'>
                {pf.map((p) => (
                  <div key={p.id} className='bg-[#F4F1FA] rounded-[32px] overflow-hidden'>
                    {p.imageUrl && (
                      <img src={p.imageUrl} alt={p.title} className='w-full h-32 object-cover' />
                    )}
                    <div className='p-4'>
                      <h3 className='font-semibold text-sm'>{p.title}</h3>
                      <p className='text-xs text-[#635F69] mt-1 line-clamp-2'>{p.description}</p>
                      {p.skills && (
                        <div className='flex flex-wrap gap-1 mt-2'>
                          {p.skills.split(',').map((s) => <Badge key={s} variant='outline' className='text-xs'>{s.trim()}</Badge>)}
                        </div>
                      )}
                      {p.projectUrl && <a href={p.projectUrl} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1 text-xs text-[#7C3AED] mt-2'><ExternalLink className='h-3 w-3' />프로젝트</a>}
                    </div>
                    {p.videoUrl && (
                      <div className='px-4 pb-4'>
                        <VideoEmbedIframe url={p.videoUrl} />
                      </div>
                    )}
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
        </div>
      </div>
    </div>
  );
}