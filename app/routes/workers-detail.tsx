import { Link, useLoaderData } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs } from 'react-router';
import { eq } from 'drizzle-orm';
import { MapPin, Star, ExternalLink, Briefcase } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
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
      <Link to="/workers" className="inline-flex items-center text-sm text-gray-500 hover:text-blue-600 mb-6">← 목록으로</Link>
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-3xl mx-auto mb-4">
                {(w.name || '?')[0]}
              </div>
              <h1 className="text-2xl font-bold">{w.name}</h1>
              {w.location && <div className="flex items-center gap-1 justify-center text-sm text-gray-500 mt-1"><MapPin className="h-4 w-4" />{w.location}</div>}
              {w.rating > 0 && (
                <div className="flex items-center gap-1 justify-center mt-2">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  <span>{w.rating}</span>
                  <span className="text-gray-400">({w.reviewCount} 리뷰)</span>
                </div>
              )}
              {w.skills && (
                <div className="flex flex-wrap gap-1 mt-4 justify-center">
                  {w.skills.split(',').map((s) => <Badge key={s} variant="secondary">{s.trim()}</Badge>)}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-2 space-y-6">
          {w.bio && (
            <Card>
              <CardHeader><CardTitle>소개</CardTitle></CardHeader>
              <CardContent><p className="text-gray-700">{w.bio}</p></CardContent>
            </Card>
          )}
          {pf.length > 0 && (
            <Card>
              <CardHeader><CardTitle>포트폴리오</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {pf.map((p) => (
                  <div key={p.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{p.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{p.description}</p>
                        {p.skills && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {p.skills.split(',').map((s) => <Badge key={s} variant="outline" className="text-xs">{s.trim()}</Badge>)}
                          </div>
                        )}
                      </div>
                      {p.projectUrl && <a href={p.projectUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 text-gray-400" /></a>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          <Button asChild className="bg-blue-600 hover:bg-blue-700"><Link to="/login">문의하기</Link></Button>
        </div>
      </div>
    </div>
  );
}