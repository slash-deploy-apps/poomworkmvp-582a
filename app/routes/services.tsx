import { Link, useLoaderData, useSearchParams } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs } from 'react-router';
import { eq, and, like, sql, desc, asc } from 'drizzle-orm';
import { Search, Star, Clock, Eye } from 'lucide-react';
import { Input } from '~/components/ui/input';
import { Badge } from '~/components/ui/badge';
import { db } from '~/lib/db.server';
import { services, user, categories } from '~/db/schema';

export const meta: MetaFunction = () => [{ title: '서비스 - poomwork' }];

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const search = url.searchParams.get('q') || '';
  const categoryIdParam = url.searchParams.get('categoryId');
  const sort = url.searchParams.get('sort') || 'latest';
  const categoryId = categoryIdParam ? Number(categoryIdParam) : null;

  const conditions = [eq(services.status, 'active')];

  if (search) {
    conditions.push(like(services.title, `%${search}%`));
  }
  if (categoryId) {
    conditions.push(eq(services.categoryId, categoryId));
  }

  const orderByClause =
    sort === 'popular'
      ? desc(services.orderCount)
      : sort === 'cheap'
        ? asc(services.price)
        : sort === 'expensive'
          ? desc(services.price)
          : desc(services.createdAt);

  const serviceRows = await db
    .select({
      id: services.id,
      title: services.title,
      thumbnailUrl: services.thumbnailUrl,
      price: services.price,
      deliveryDays: services.deliveryDays,
      rating: services.rating,
      reviewCount: services.reviewCount,
      views: services.views,
      tags: services.tags,
      createdAt: services.createdAt,
      workerId: services.workerId,
      workerName: user.name,
      workerImage: user.image,
    })
    .from(services)
    .leftJoin(user, eq(services.workerId, user.id))
    .where(and(...conditions))
    .orderBy(orderByClause)
    .limit(50);

  const topCategories = await db
    .select()
    .from(categories)
    .where(sql`${categories.parentId} IS NULL`)
    .orderBy(asc(categories.sortOrder));

  return { services: serviceRows, categories: topCategories, search, categoryId, sort };
}

export default function ServicesPage() {
  const { services: serviceList, categories: topCategories, search, categoryId, sort } = useLoaderData<typeof loader>();
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
        <h1 className="text-3xl font-bold text-[#332F3A]">서비스</h1>
        <p className="text-[#635F69] mt-1">전문가의 품(서비스)을 찾아보세요</p>
      </div>

      {/* Search bar */}
      <form method="get" className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          name="q"
          placeholder="서비스 검색..."
          className="pl-10"
          defaultValue={search}
        />
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
            {cat.icon && <span className="mr-1">{cat.icon}</span>}
            {cat.name}
          </button>
        ))}
      </div>

      {/* Sort tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'latest', label: '최신순' },
          { key: 'popular', label: '인기순' },
          { key: 'cheap', label: '낮은 가격' },
          { key: 'expensive', label: '높은 가격' },
        ].map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => updateFilter('sort', s.key)}
            className={`px-3 py-1.5 rounded-[16px] text-xs font-medium transition-all duration-200 ${sort === s.key ? 'bg-[#7C3AED] text-white' : 'bg-[#F4F1FA] text-[#635F69] hover:bg-[#EDE9FE]'}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Service grid */}
      {serviceList.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[#635F69] text-lg">아직 등록된 서비스가 없습니다</p>
          <Link to="/services/new" className="inline-block mt-4 px-6 py-3 bg-[#7C3AED] text-white rounded-[20px] font-medium hover:bg-[#5a3d95] transition-all duration-200">
            서비스 등록하기
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {serviceList.map((s) => (
            <Link to={`/services/${s.id}`} key={s.id} className="group">
              <div className="bg-[#F4F1FA] rounded-[32px] overflow-hidden transition-all duration-200 ease-in-out hover:scale-[1.02]">
                <div className="w-full h-40 bg-[#EDE9FE] flex items-center justify-center overflow-hidden">
                  {s.thumbnailUrl ? (
                    <img src={s.thumbnailUrl} alt={s.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl">📦</span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-[#332F3A] line-clamp-2">{s.title}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-6 h-6 rounded-full bg-[#EDE9FE] flex items-center justify-center text-[#7C3AED] text-xs font-bold overflow-hidden">
                      {s.workerImage ? (
                        <img src={s.workerImage} alt="" className="w-6 h-6 object-cover" />
                      ) : (
                        (s.workerName || '?')[0]
                      )}
                    </div>
                    <span className="text-sm text-[#635F69]">{s.workerName || '전문가'}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="font-bold text-[#7C3AED]">{s.price.toLocaleString()}원</span>
                    <div className="flex items-center gap-1 text-xs text-[#635F69]">
                      {s.rating > 0 && (
                        <>
                          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                          <span>{s.rating}</span>
                          <span>({s.reviewCount})</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[#635F69]">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{s.deliveryDays}일</span>
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{s.views}</span>
                  </div>
                  {s.tags && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {s.tags.split(',').slice(0, 3).map((tag) => (
                        <Badge key={tag} className="text-xs bg-[#EDE9FE] text-[#7C3AED] border-0">{tag.trim()}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}