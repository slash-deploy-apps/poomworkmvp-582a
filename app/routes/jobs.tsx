import { Link, useLoaderData, useSearchParams } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs } from 'react-router';
import { desc, eq, and, like, sql } from 'drizzle-orm';
import { Plus, MapPin, Clock, Users, Eye, Search } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Card, CardContent } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { db } from '~/lib/db.server';
import { jobs, user, categories } from '~/db/schema';
import { auth } from '~/lib/auth.server';

export const meta: MetaFunction = () => [{ title: '일거리 찾기 - poomwork' }];

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const search = url.searchParams.get('q') || '';
  const session = await auth.api.getSession({ headers: request.headers });
  const conditions = [eq(jobs.status, 'open')];
  if (search) conditions.push(like(jobs.title, `%${search}%`));
  const allJobs = await db.select({
    id: jobs.id, title: jobs.title, budgetMin: jobs.budgetMin, budgetMax: jobs.budgetMax,
    budgetType: jobs.budgetType, duration: jobs.duration, urgency: jobs.urgency,
    location: jobs.location, isRemote: jobs.isRemote, views: jobs.views,
    applicationCount: jobs.applicationCount, createdAt: jobs.createdAt,
    clientName: user.name, categoryName: categories.name,
  }).from(jobs).leftJoin(user, eq(jobs.clientId, user.id))
    .leftJoin(categories, eq(jobs.categoryId, categories.id))
    .where(and(...conditions)).orderBy(desc(jobs.createdAt)).limit(50);
  return { jobs: allJobs, user: session?.user ?? null };
}

const urgencyMap: Record<string, { label: string; color: string }> = {
  high: { label: '긴급', color: 'bg-red-100 text-red-700' },
  medium: { label: '보통', color: 'bg-yellow-100 text-yellow-700' },
  low: { label: '여유', color: 'bg-[#E8DEF8] text-[#1D192B]' },
};

export default function JobsPage() {
  const { jobs: allJobs, user: currentUser } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">일거리 찾기</h1>
          <p className="text-[#49454F] mt-1">새로운 프로젝트 기회를 찾아보세요</p>
        </div>
        {currentUser?.role === 'client' && (
          <Button asChild className="bg-[#6750A4] hover:bg-purple-800">
            <Link to="/jobs/new"><Plus className="h-4 w-4 mr-2" />일거리 등록</Link>
          </Button>
        )}
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="일거리 검색..."
            className="pl-10"
            defaultValue={searchParams.get('q') || ''}
            onChange={(e) => { const v = e.target.value; setSearchParams(v ? { q: v } : {}); }}
          />
        </div>
      </div>

      <div className="grid gap-4">
        {allJobs.length === 0 ? (
          <div className="text-center py-16 text-[#49454F]">등록된 일거리가 없습니다.</div>
        ) : allJobs.map((job) => (
          <Link to={`/jobs/${job.id}`} key={job.id}>
            <div className="bg-[#FFFBFE] rounded-3xl p-6 mb-3 transition-all duration-300 ease-in-out hover:scale-[1.02] cursor-pointer">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold hover:text-[#6750A4] transition-colors">{job.title}</h3>
                    {job.urgency && urgencyMap[job.urgency] && (
                      <Badge className={urgencyMap[job.urgency].color}>{urgencyMap[job.urgency].label}</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-[#49454F]">
                    {job.clientName && <span>{job.clientName}</span>}
                    {job.categoryName && <Badge className="bg-gray-100 text-[#1C1B1F] border-0">{job.categoryName}</Badge>}
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{job.duration}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.isRemote ? '원격' : job.location || '미정'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-right">
                    <div className="font-bold text-[#6750A4]">
                      {job.budgetType === 'negotiable' ? '협의' : `${((job.budgetMin || 0) / 10000).toFixed(0)}~${((job.budgetMax || 0) / 10000).toFixed(0)}만원`}
                    </div>
                    <div className="text-gray-400 flex items-center gap-3">
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{job.applicationCount}</span>
                      <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{job.views}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}