import { Link, useLoaderData } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs } from 'react-router';
import { eq } from 'drizzle-orm';
import { MapPin, Star, ExternalLink, Briefcase } from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { db } from '~/lib/db.server';
import { user, portfolios } from '~/db/schema';

export async function loader({ params }: LoaderFunctionArgs) {
  const worker = await db.select().from(user).where(eq(user.id, params.workerId!)).limit(1);
  if (!worker[0]) throw new Response('Not Found', { status: 404 });
  const portfolioList = await db.select().from(portfolios).where(eq(portfolios.workerId, params.workerId!));
  return { worker: worker[0], portfolios: portfolioList };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => [{ title: `${data?.worker.name || '인력'} - poomwork` }];

export default function WorkerDetail() {
  const { worker: w, portfolios: pf } = useLoaderData<typeof loader>();
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link to='/workers' className='inline-flex items-center text-sm text-[#49454F] hover:text-[#6750A4] mb-6 transition-all duration-300 ease-in-out'>← 목록으로</Link>
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className='bg-[#F3EDF7] rounded-3xl p-6 text-center'>
            <div className='w-20 h-20 rounded-full bg-[#E8DEF8] flex items-center justify-center text-[#6750A4] font-bold text-3xl mx-auto mb-4'>
              {(w.name || '?')[0]}
            </div>
            <h1 className='text-2xl font-bold'>{w.name}</h1>
            {w.location && <div className='flex items-center gap-1 justify-center text-sm text-[#49454F] mt-1'><MapPin className='h-4 w-4' />{w.location}</div>}
            {w.rating > 0 && (
              <div className='flex items-center gap-1 justify-center mt-2'>
                <Star className='h-4 w-4 text-yellow-400 fill-yellow-400' />
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
            <div className='bg-[#F3EDF7] rounded-3xl p-6'>
              <h2 className='text-lg font-bold mb-4'>소개</h2>
              <p className='text-[#1C1B1F]'>{w.bio}</p>
            </div>
          )}
          {pf.length > 0 && (
            <div className='bg-[#F3EDF7] rounded-3xl p-6'>
              <h2 className='text-lg font-bold mb-4'>포트폴리오</h2>
              <div className='space-y-4'>
                {pf.map((p) => (
                  <div key={p.id} className='bg-[#FFFBFE] rounded-3xl p-4'>
                    <div className='flex items-start justify-between'>
                      <div>
                        <h3 className='font-semibold'>{p.title}</h3>
                        <p className='text-sm text-[#49454F] mt-1'>{p.description}</p>
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
          <Button asChild className='bg-[#6750A4] hover:bg-purple-800 hover:bg-purple-800 active:scale-95 transition-all duration-300 ease-in-out rounded-full'><Link to='/login'>문의하기</Link></Button>
        </div>
      </div>
    </div>
  );
}