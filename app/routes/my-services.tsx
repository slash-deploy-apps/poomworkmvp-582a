import { redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { Link, useLoaderData } from 'react-router';
import { eq, desc } from 'drizzle-orm';
import { Plus, Eye, Star } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { db } from '~/lib/db.server';
import { services } from '~/db/schema';
import { auth } from '~/lib/auth.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return redirect('/login');

  const myServices = await db
    .select()
    .from(services)
    .where(eq(services.workerId, session.user.id))
    .orderBy(desc(services.createdAt));

  return { services: myServices };
}

const statusLabel: Record<string, { label: string; className: string }> = {
  active: { label: '활성', className: 'bg-green-100 text-green-700' },
  paused: { label: '일시정지', className: 'bg-yellow-100 text-yellow-700' },
  draft: { label: '임시저장', className: 'bg-gray-100 text-gray-600' },
};

export default function MyServices() {
  const { services: myServices } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-[#F4F1FA]">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-[#332F3A]">내 서비스</h1>
          <Link to="/services/new">
            <Button className="bg-[#7C3AED] hover:bg-[#5a3d95] text-white rounded-[20px] h-11 text-sm font-medium active:scale-[0.92] transition-all duration-200">
              <Plus className="h-4 w-4 mr-1" /> 새 서비스 등록
            </Button>
          </Link>
        </div>

        {myServices.length === 0 ? (
          <div className="text-center py-20 bg-[#EDE9FE] rounded-[32px]">
            <p className="text-[#635F69] text-lg mb-4">아직 등록된 서비스가 없습니다</p>
            <Link to="/services/new" className="inline-block px-6 py-3 bg-[#7C3AED] text-white rounded-[20px] font-medium hover:bg-[#5a3d95] transition-all duration-200">
              첫 서비스 등록하기
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {myServices.map((s) => {
              const sl = statusLabel[s.status] || statusLabel.draft;
              return (
                <Link to={`/services/${s.id}`} key={s.id} className="block group">
                  <div className="bg-[#EDE9FE] rounded-[32px] p-5 flex gap-4 items-center transition-all duration-200 hover:scale-[1.01]">
                    <div className="w-24 h-24 rounded-[20px] bg-[#F4F1FA] flex items-center justify-center overflow-hidden shrink-0">
                      {s.thumbnailUrl ? (
                        <img src={s.thumbnailUrl} alt={s.title} className="w-24 h-24 object-cover rounded-[20px]" />
                      ) : (
                        <span className="text-3xl">📦</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-[#332F3A] truncate">{s.title}</h3>
                        <Badge className={`text-xs border-0 ${sl.className}`}>{sl.label}</Badge>
                      </div>
                      <div className="text-lg font-bold text-[#7C3AED]">{s.price.toLocaleString()}원</div>
                      <div className="flex items-center gap-3 text-sm text-[#635F69] mt-1">
                        <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{s.views}</span>
                        {s.rating > 0 && (
                          <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />{s.rating} ({s.reviewCount})</span>
                        )}
                      </div>
                    </div>
                    <Link
                      to={`/services/${s.id}/edit`}
                      onClick={(e) => e.stopPropagation()}
                      className="px-4 py-2 bg-white rounded-[16px] text-sm font-medium text-[#7C3AED] hover:bg-[#F4F1FA] transition-colors duration-200 shrink-0"
                    >
                      수정
                    </Link>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}