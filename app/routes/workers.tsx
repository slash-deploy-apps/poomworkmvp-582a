import { Link, useLoaderData, useSearchParams } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs } from 'react-router';
import { eq, like, and, sql, asc } from 'drizzle-orm';
import { Search, MapPin, Star } from 'lucide-react';
import { Input } from '~/components/ui/input';
import { Badge } from '~/components/ui/badge';
import { db } from '~/lib/db.server';
import { user, services, categories } from '~/db/schema';

export const meta: MetaFunction = () => [{ title: '전문가 찾기 - poomwork' }];

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const search = url.searchParams.get('q') || '';
  const categoryIdParam = url.searchParams.get('categoryId');
  const location = url.searchParams.get('location') || '';
  const categoryId = categoryIdParam ? Number(categoryIdParam) : null;

  const conditions = [eq(user.role, 'worker')];

  if (search) {
    conditions.push(sql`(${user.name} LIKE ${`%${search}%`} OR ${user.skills} LIKE ${`%${search}%`})`);
  }
  if (location) {
    conditions.push(like(user.location, `%${location}%`));
  }
  if (categoryId) {
    conditions.push(sql`EXISTS (SELECT 1 FROM services WHERE services.worker_id = ${user.id} AND services.category_id = ${categoryId} AND services.status = 'active')`);
  }

  const workers = await db.select().from(user).where(and(...conditions)).limit(50);

  const topCategories = await db
    .select()
    .from(categories)
    .where(sql`${categories.parentId} IS NULL`)
    .orderBy(asc(categories.sortOrder));

  return { workers, categories: topCategories, search, location, categoryId };
}

export default function WorkersPage() {
  const { workers, categories: topCategories, search, location, categoryId } = useLoaderData<typeof loader>();
  const [, setSearchParams] = useSearchParams();

  function updateFilter(key: string, value: string) {
    setSearchParams((prev) => {
      if (value) prev.set(key, value);
      else prev.delete(key);
      return prev;
    });
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">전문가 찾기</h1>
        <p className="text-[#635F69] mt-1">전문가를 찾아보세요</p>
      </div>

      {/* Search form */}
      <form method="get" className="mb-6 flex gap-3 max-w-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input name="q" placeholder="이름 또는 기술 검색..." className="pl-10" defaultValue={search} />
        </div>
        <div className="relative w-48">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input name="location" placeholder="지역" className="pl-10" defaultValue={location} />
        </div>
        <button type="submit" className="px-6 py-2 bg-[#7C3AED] text-white rounded-[20px] font-medium hover:bg-[#5a3d95] transition-all duration-200">
          검색
        </button>
      </form>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          onClick={() => updateFilter('categoryId', '')}
          className={`px-4 py-2 rounded-[20px] text-sm font-medium transition-all duration-200 ${!categoryId ? 'bg-[#7C3AED] text-white' : 'bg-[#EDE9FE] text-[#332F3A] hover:bg-[#E0D9F5]'}`}
        >
          전체
        </button>
        {topCategories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => updateFilter('categoryId', String(cat.id))}
            className={`px-4 py-2 rounded-[20px] text-sm font-medium transition-all duration-200 ${categoryId === cat.id ? 'bg-[#7C3AED] text-white' : 'bg-[#EDE9FE] text-[#332F3A] hover:bg-[#E0D9F5]'}`}
          >
            {cat.icon && <span className="mr-1">{cat.icon}</span>}{cat.name}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workers.map((w) => (
          <Link to={`/workers/${w.id}`} key={w.id}>
            <div className="bg-[#F4F1FA] rounded-[32px] p-6 h-full transition-all duration-200 ease-in-out hover:scale-[1.02] cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-[20px] bg-[#7C3AED] flex items-center justify-center text-white font-bold text-xl shrink-0 overflow-hidden">
                  {w.image ? (
                    <img src={w.image} alt={w.name || ''} className="w-14 h-14 object-cover" />
                  ) : (
                    (w.name || '?')[0]
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg">{w.name}</h3>
                  {w.location && <div className="flex items-center gap-1 text-sm text-[#635F69]"><MapPin className="h-3.5 w-3.5" />{w.location}</div>}
                  {w.rating > 0 && (
                    <div className="flex items-center gap-1 text-sm mt-1">
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      <span>{w.rating}</span>
                      <span className="text-gray-400">({w.reviewCount})</span>
                    </div>
                  )}
                  {w.bio && <p className="text-sm text-[#635F69] mt-2 line-clamp-2">{w.bio}</p>}
                  {w.skills && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {w.skills.split(',').slice(0, 4).map((s) => (
                        <Badge key={s} className="text-xs bg-[#EDE9FE] text-blue-700 border-0">{s.trim()}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {workers.length === 0 && (
        <div className="text-center py-20">
          <p className="text-[#635F69] text-lg">검색 결과가 없습니다</p>
        </div>
      )}
    </div>
  );
}