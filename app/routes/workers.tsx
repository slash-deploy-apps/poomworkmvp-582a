import { Link, useLoaderData } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs } from 'react-router';
import { eq, like, and } from 'drizzle-orm';
import { Search, MapPin, Star } from 'lucide-react';
import { Input } from '~/components/ui/input';
import { Card, CardContent } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { db } from '~/lib/db.server';
import { user } from '~/db/schema';

export const meta: MetaFunction = () => [{ title: '인력 찾기 - poomwork' }];

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const search = url.searchParams.get('q') || '';
  const conditions = [eq(user.role, 'worker')];
  if (search) conditions.push(like(user.name, `%${search}%`));
  const workers = await db.select().from(user).where(and(...conditions)).limit(50);
  return { workers };
}

export default function WorkersPage() {
  const { workers } = useLoaderData<typeof loader>();
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">인력 찾기</h1>
        <p className="text-[#49454F] mt-1">전문 인력을 찾아보세요</p>
      </div>
      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <form><Input name="q" placeholder="이름으로 검색..." className="pl-10" defaultValue="" /></form>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workers.map((w) => (
          <Link to={`/workers/${w.id}`} key={w.id}>
            <div className="bg-[#FFFBFE] rounded-3xl p-6 h-full transition-all duration-300 ease-in-out hover:scale-[1.02] cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-[#6750A4] flex items-center justify-center text-white font-bold text-xl shrink-0">
                  {(w.name || '?')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg">{w.name}</h3>
                  {w.location && <div className="flex items-center gap-1 text-sm text-[#49454F]"><MapPin className="h-3.5 w-3.5" />{w.location}</div>}
                  {w.rating > 0 && (
                    <div className="flex items-center gap-1 text-sm mt-1">
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      <span>{w.rating}</span>
                      <span className="text-gray-400">({w.reviewCount})</span>
                    </div>
                  )}
                  {w.bio && <p className="text-sm text-[#49454F] mt-2 line-clamp-2">{w.bio}</p>}
                  {w.skills && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {w.skills.split(',').slice(0, 4).map((s) => (
                        <Badge key={s} className="text-xs bg-[#E8DEF8] text-blue-700 border-0">{s.trim()}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}