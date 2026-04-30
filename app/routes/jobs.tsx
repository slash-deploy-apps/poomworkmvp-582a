import { Link, useLoaderData, useSearchParams } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs } from 'react-router';
import { desc, eq, and, like, sql } from 'drizzle-orm';
import { Plus, MapPin, Clock, Users, Eye, Search, ArrowUpDown } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Badge } from '~/components/ui/badge';
import { db } from '~/lib/db.server';
import { jobs, user, categories } from '~/db/schema';
import { auth } from '~/lib/auth.server';

export const meta: MetaFunction = () => [{ title: '일거리 찾기 - poomwork' }];

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const search = url.searchParams.get('q') || '';
  const tag = url.searchParams.get('tag') || '';
  const sort = url.searchParams.get('sort') || 'newest';
  const session = await auth.api.getSession({ headers: request.headers });
  const conditions = [eq(jobs.status, 'open')];
  if (search) {
    conditions.push(
      sql`(${jobs.title} LIKE ${`%${search}%`} OR ${jobs.tags} LIKE ${`%${search}%`})`
    );
  }
  if (tag) conditions.push(like(jobs.tags, `%${tag}%`));

  let orderByClause;
  switch (sort) {
    case 'views': orderByClause = desc(jobs.views); break;
    case 'applications': orderByClause = desc(jobs.applicationCount); break;
    case 'budget': orderByClause = desc(jobs.budgetMax); break;
    default: orderByClause = desc(jobs.createdAt);
  }

  const allJobs = await db.select({
    id: jobs.id, title: jobs.title, budgetMin: jobs.budgetMin, budgetMax: jobs.budgetMax,
    budgetType: jobs.budgetType, duration: jobs.duration, urgency: jobs.urgency,
    location: jobs.location, isRemote: jobs.isRemote, views: jobs.views,
    applicationCount: jobs.applicationCount, createdAt: jobs.createdAt,
    clientName: user.name, categoryName: categories.name,
    thumbnailUrl: jobs.thumbnailUrl, tags: jobs.tags,
  }).from(jobs).leftJoin(user, eq(jobs.clientId, user.id))
    .leftJoin(categories, eq(jobs.categoryId, categories.id))
    .where(and(...conditions)).orderBy(orderByClause).limit(50);
  return { jobs: allJobs, user: session?.user ?? null };
}

const urgencyMap: Record<string, { label: string; color: string }> = {
  high: { label: '긴급', color: 'bg-red-100 text-red-700' },
  medium: { label: '보통', color: 'bg-yellow-100 text-yellow-700' },
  low: { label: '여유', color: 'bg-[#EDE9FE] text-[#332F3A]' },
};

const sortOptions = [
  { value: 'newest', label: '최신순' },
  { value: 'views', label: '조회순' },
  { value: 'applications', label: '지원순' },
  { value: 'budget', label: '예산순' },
];

const exampleTags = ['React', 'TypeScript', '디자인', '마케팅', '원격', '단기', '프리랜서'];

export default function JobsPage() {
  const { jobs: allJobs, user: currentUser } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentSort = searchParams.get('sort') || 'newest';
  const currentTag = searchParams.get('tag') || '';
  const currentQ = searchParams.get('q') || '';

  const updateParams = (updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => {
      if (v) next.set(k, v); else next.delete(k);
    });
    setSearchParams(next);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">일거리 찾기</h1>
          <p className="text-[#635F69] mt-1">새로운 프로젝트 기회를 찾아보세요</p>
        </div>
        {currentUser?.role === 'client' && (
          <Button asChild className="bg-[#7C3AED] hover:bg-#7C3AED">
            <Link to="/jobs/new"><Plus className="h-4 w-4 mr-2" />일거리 등록</Link>
          </Button>
        )}
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="일거리 검색..."
              className="pl-10"
              defaultValue={currentQ}
              onChange={(e) => { const v = e.target.value; updateParams({ q: v }); }}
            />
          </div>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-[#635F69]" />
            <select
              value={currentSort}
              onChange={(e) => updateParams({ sort: e.target.value })}
              className="bg-white rounded-[20px] border-0 h-10 px-4 text-[#332F3A] text-sm cursor-pointer hover:bg-gray-50 transition-colors"
            >
              {sortOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-[#635F69]">인기 태그:</span>
          {exampleTags.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => updateParams({ tag: currentTag === tag ? '' : tag })}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                currentTag === tag
                  ? 'bg-[#7C3AED] text-white'
                  : 'bg-[#EDE9FE] text-[#7C3AED] hover:bg-[#DDD6FE]'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>

        {(currentTag || currentQ) && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#635F69]">필터:</span>
            {currentQ && <Badge variant="outline" className="text-xs">검색: {currentQ}</Badge>}
            {currentTag && (
              <Badge className="bg-[#7C3AED] text-white text-xs cursor-pointer" onClick={() => updateParams({ tag: '' })}>
                #{currentTag} ✕
              </Badge>
            )}
            <button
              type="button"
              onClick={() => setSearchParams({})}
              className="text-xs text-[#635F69] hover:text-red-500 underline"
            >
              초기화
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-4">
        {allJobs.length === 0 ? (
          <div className="text-center py-16 text-[#635F69]">등록된 일거리가 없습니다.</div>
        ) : allJobs.map((job) => (
          <Link to={`/jobs/${job.id}`} key={job.id}>
            <div className='bg-white/70 backdrop-blur-xl rounded-[32px] p-6 mb-3 shadow-clay-card hover:-translate-y-1 hover:shadow-clay-card-hover transition-all duration-500 cursor-pointer'>
              <div className='flex flex-col md:flex-row md:items-center justify-between gap-3'>
                {job.thumbnailUrl && (
                  <img src={job.thumbnailUrl} alt='' className='w-20 h-20 rounded-[20px] object-cover shrink-0' />
                )}
                <div className='flex-1'>
                  <div className='flex items-center gap-2 mb-1'>
                    <h3 className='text-lg font-bold hover:text-[#7C3AED] transition-colors'>{job.title}</h3>
                    {job.urgency && urgencyMap[job.urgency] && (
                      <Badge className={urgencyMap[job.urgency]!.color}>{urgencyMap[job.urgency]!.label}</Badge>
                    )}
                  </div>
                  <div className='flex flex-wrap items-center gap-3 text-sm text-[#635F69]'>
                    {job.clientName && <span>{job.clientName}</span>}
                    {job.categoryName && <Badge className='bg-gray-100 text-[#332F3A] border-0'>{job.categoryName}</Badge>}
                    {job.tags && job.tags.split(',').filter(Boolean).slice(0, 3).map(t => (
                      <span key={t} className='text-xs text-[#7C3AED] bg-[#EDE9FE] px-2 py-0.5 rounded-full'>#{t.trim()}</span>
                    ))}
                    <span className='flex items-center gap-1'><Clock className='h-3.5 w-3.5' />{job.duration}</span>
                    <span className='flex items-center gap-1'><MapPin className='h-3.5 w-3.5' />{job.isRemote ? '원격' : job.location || '미정'}</span>
                  </div>
                </div>
                <div className='flex items-center gap-6 text-sm'>
                  <div className='text-right'>
                    <div className='font-bold text-[#7C3AED]'>
                      {job.budgetType === 'negotiable' ? '협의' : `${((job.budgetMin || 0) / 10000).toFixed(0)}~${((job.budgetMax || 0) / 10000).toFixed(0)}만원`}
                    </div>
                    <div className='text-gray-400 flex items-center gap-3'>
                      <span className='flex items-center gap-1'><Users className='h-3.5 w-3.5' />{job.applicationCount}</span>
                      <span className='flex items-center gap-1'><Eye className='h-3.5 w-3.5' />{job.views}</span>
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
