import { Link, useLoaderData, useSearchParams } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs } from 'react-router';
import { desc, eq, and, like, sql, asc } from 'drizzle-orm';
import { Clock, Users, Star, Search, GraduationCap, ArrowUpDown } from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { Input } from '~/components/ui/input';
import { db } from '~/lib/db.server';
import { courses, user, categories } from '~/db/schema';

export const meta: MetaFunction = () => [{ title: '교육 강좌 - poomwork' }];

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const search = url.searchParams.get('q') || '';
  const tag = url.searchParams.get('tag') || '';
  const sort = url.searchParams.get('sort') || 'popular';

  const conditions = [eq(courses.status, 'published')];
  if (search) {
    conditions.push(
      sql`(${courses.title} LIKE ${`%${search}%`} OR ${courses.tags} LIKE ${`%${search}%`})`
    );
  }
  if (tag) conditions.push(like(courses.tags, `%${tag}%`));

  let orderByClause;
  switch (sort) {
    case 'newest': orderByClause = desc(courses.createdAt); break;
    case 'rating': orderByClause = desc(courses.rating); break;
    case 'price_asc': orderByClause = asc(courses.price); break;
    case 'price_desc': orderByClause = desc(courses.price); break;
    default: orderByClause = desc(courses.enrollmentCount);
  }

  const allCourses = await db.select({
    id: courses.id, title: courses.title, price: courses.price, level: courses.level,
    duration: courses.duration, rating: courses.rating, reviewCount: courses.reviewCount,
    enrollmentCount: courses.enrollmentCount, instructorName: user.name,
    thumbnailUrl: courses.thumbnailUrl, tags: courses.tags,
    categoryName: categories.name,
  }).from(courses).leftJoin(user, eq(courses.instructorId, user.id))
    .leftJoin(categories, eq(courses.categoryId, categories.id))
    .where(and(...conditions)).orderBy(orderByClause).limit(50);
  return { courses: allCourses };
}

const levelMap: Record<string, { label: string; color: string }> = {
  beginner: { label: '초급', color: 'bg-[#EDE9FE] text-[#332F3A]' },
  intermediate: { label: '중급', color: 'bg-yellow-100 text-yellow-700' },
  advanced: { label: '고급', color: 'bg-red-100 text-red-700' },
};

const gradients = ['from-blue-400 to-indigo-500', 'from-purple-400 to-pink-500', 'from-teal-400 to-cyan-500', 'from-orange-400 to-red-500', 'from-green-400 to-emerald-500', 'from-rose-400 to-fuchsia-500'];

const sortOptions = [
  { value: 'popular', label: '인기순' },
  { value: 'newest', label: '최신순' },
  { value: 'rating', label: '평점순' },
  { value: 'price_asc', label: '가격 낮은순' },
  { value: 'price_desc', label: '가격 높은순' },
];

const exampleTags = ['React', 'Python', '디자인', '마케팅', '데이터분석', '입문', '프리랜서'];

export default function CoursesPage() {
  const { courses: allCourses } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentSort = searchParams.get('sort') || 'popular';
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold">교육 강좌</h1>
        <p className="text-[#635F69] mt-1">전문 툴 사용법을 체계적으로 배우세요</p>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="강좌 검색..."
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

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allCourses.length === 0 ? (
          <div className="col-span-full text-center py-16 text-[#635F69]">등록된 강좌가 없습니다.</div>
        ) : allCourses.map((c, i) => (
          <Link to={`/courses/${c.id}`} key={c.id}>
            <div className="bg-[#F4F1FA] rounded-[32px] overflow-hidden transition-all duration-200 ease-in-out hover:scale-[1.02] cursor-pointer">
              {c.thumbnailUrl ? (
                <img src={c.thumbnailUrl} alt='' className='w-full h-40 object-cover' />
              ) : (
                <div className={`h-40 bg-gradient-to-br ${gradients[i % gradients.length]} flex items-center justify-center`}>
                  <GraduationCap className='h-16 w-16 text-white/40' />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  {levelMap[c.level] && <Badge className={levelMap[c.level]!.color}>{levelMap[c.level]!.label}</Badge>}
                  {c.categoryName && <Badge className="bg-gray-100 text-[#332F3A] border-0">{c.categoryName}</Badge>}
                </div>
                <h3 className="font-bold text-lg mb-2 line-clamp-2">{c.title}</h3>
                <div className="text-sm text-[#635F69]">{c.instructorName}</div>
                {c.tags && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {c.tags.split(',').filter(Boolean).slice(0, 3).map(t => (
                      <span key={t} className="text-xs text-[#7C3AED] bg-[#EDE9FE] px-2 py-0.5 rounded-full">#{t.trim()}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between mt-3 pt-3 border-t-2 border-gray-100">
                  <div className="flex items-center gap-3 text-sm text-[#635F69]">
                    <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />{c.rating}</span>
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{c.enrollmentCount}명</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{c.duration}</span>
                  </div>
                </div>
                <div className="mt-2 font-bold text-[#7C3AED]">
                  {c.price === 0 ? '무료' : `${new Intl.NumberFormat('ko-KR').format(c.price)}원`}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
