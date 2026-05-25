import { Link, useLoaderData } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs } from 'react-router';
import { eq, desc, and, sql } from 'drizzle-orm';
import { MapPin, Star, Clock, Eye, MessageCircle, Pencil } from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { VideoEmbedIframe } from '~/lib/video-embed';
import { db } from '~/lib/db.server';
import { services, user, categories } from '~/db/schema';
import { auth } from '~/lib/auth.server';

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: data ? `${data.service.title} - poomwork` : '서비스 - poomwork' },
];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const serviceId = params.serviceId!;
  const session = await auth.api.getSession({ headers: request.headers });

  const serviceRows = await db
    .select({
      id: services.id,
      title: services.title,
      description: services.description,
      thumbnailUrl: services.thumbnailUrl,
      videoUrl: services.videoUrl,
      price: services.price,
      deliveryDays: services.deliveryDays,
      revisions: services.revisions,
      tags: services.tags,
      status: services.status,
      views: services.views,
      orderCount: services.orderCount,
      rating: services.rating,
      reviewCount: services.reviewCount,
      createdAt: services.createdAt,
      workerId: services.workerId,
      categoryId: services.categoryId,
      workerName: user.name,
      workerImage: user.image,
      workerLocation: user.location,
      workerRating: user.rating,
      workerReviewCount: user.reviewCount,
      workerBio: user.bio,
    })
    .from(services)
    .leftJoin(user, eq(services.workerId, user.id))
    .where(eq(services.id, serviceId))
    .limit(1);

  const s = serviceRows[0];
  if (!s) throw new Response('Not Found', { status: 404 });

  // Increment views
  await db.update(services).set({ views: s.views + 1 }).where(eq(services.id, serviceId));

  let categoryName: string | null = null;
  if (s.categoryId) {
    const cat = await db.select().from(categories).where(eq(categories.id, s.categoryId)).get();
    categoryName = cat?.name ?? null;
  }

  // Load worker's other services
  const otherServices = await db
    .select({
      id: services.id,
      title: services.title,
      thumbnailUrl: services.thumbnailUrl,
      price: services.price,
      rating: services.rating,
      reviewCount: services.reviewCount,
    })
    .from(services)
    .where(and(eq(services.workerId, s.workerId), eq(services.status, 'active'), sql`${services.id} != ${serviceId}`))
    .orderBy(desc(services.createdAt))
    .limit(4);

  const isOwner = session?.user?.id === s.workerId;

  return { service: s, categoryName, otherServices, isOwner };
}

export default function ServiceDetail() {
  const { service: s, categoryName, otherServices, isOwner } = useLoaderData<typeof loader>();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link to="/services" className="inline-flex items-center text-sm text-[#635F69] hover:text-[#7C3AED] mb-6 transition-all duration-200">
        ← 서비스 목록
      </Link>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="md:col-span-2 space-y-6">
          {/* Thumbnail/Video */}
          <div className="bg-[#EDE9FE] rounded-[32px] overflow-hidden">
            {s.videoUrl ? (
              <VideoEmbedIframe url={s.videoUrl} className="w-full aspect-video" />
            ) : s.thumbnailUrl ? (
              <img src={s.thumbnailUrl} alt={s.title} className="w-full aspect-video object-cover" />
            ) : (
              <div className="w-full aspect-video flex items-center justify-center text-6xl">📦</div>
            )}
          </div>

          {/* Info card */}
          <div className="bg-[#EDE9FE] rounded-[32px] p-6">
            <div className="flex items-start justify-between">
              <div>
                {categoryName && (
                  <Badge className="bg-[#7C3AED]/10 text-[#7C3AED] border-0 mb-2">{categoryName}</Badge>
                )}
                <h1 className="text-2xl font-bold text-[#332F3A]">{s.title}</h1>
              </div>
              {isOwner && (
                <Link to={`/services/${s.id}/edit`}>
                  <Button variant="outline" className="rounded-[20px] border-[#7C3AED] text-[#7C3AED]">
                    <Pencil className="h-4 w-4 mr-1" /> 수정
                  </Button>
                </Link>
              )}
            </div>

            <p className="text-[#332F3A] mt-4 whitespace-pre-wrap">{s.description}</p>

            <div className="flex flex-wrap items-center gap-4 mt-6 text-sm text-[#635F69]">
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{s.deliveryDays}일 소요</span>
              <span className="flex items-center gap-1"><Eye className="h-4 w-4" />{s.views} 조회</span>
              {s.rating > 0 && (
                <span className="flex items-center gap-1"><Star className="h-4 w-4 text-amber-500 fill-amber-500" />{s.rating} ({s.reviewCount} 리뷰)</span>
              )}
            </div>

            {s.tags && (
              <div className="flex flex-wrap gap-1 mt-4">
                {s.tags.split(',').map((tag) => (
                  <Badge key={tag} className="text-xs bg-[#F4F1FA] text-[#7C3AED] border-0">{tag.trim()}</Badge>
                ))}
              </div>
            )}
          </div>

          {/* Worker's other services */}
          {otherServices.length > 0 && (
            <div className="bg-[#EDE9FE] rounded-[32px] p-6">
              <h2 className="text-lg font-bold text-[#332F3A] mb-4">이 전문가의 다른 서비스</h2>
              <div className="grid grid-cols-2 gap-4">
                {otherServices.map((os) => (
                  <Link to={`/services/${os.id}`} key={os.id} className="group">
                    <div className="bg-[#F4F1FA] rounded-[20px] overflow-hidden transition-all duration-200 hover:scale-[1.02]">
                      <div className="h-24 bg-[#EDE9FE] flex items-center justify-center overflow-hidden">
                        {os.thumbnailUrl ? (
                          <img src={os.thumbnailUrl} alt={os.title} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl">📦</span>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="font-medium text-sm line-clamp-1">{os.title}</h3>
                        <span className="font-bold text-[#7C3AED] text-sm">{os.price.toLocaleString()}원</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="md:col-span-1 space-y-4">
          {/* Price card */}
          <div className="bg-[#EDE9FE] rounded-[32px] p-6 sticky top-24">
            <div className="text-3xl font-bold text-[#7C3AED] mb-2">{s.price.toLocaleString()}원</div>
            <div className="text-sm text-[#635F69] space-y-1">
              <p>소요: {s.deliveryDays}일</p>
              <p>수정: {s.revisions}회 가능</p>
            </div>
            <Button asChild className="w-full mt-4 bg-[#7C3AED] hover:bg-[#5a3d95] text-white rounded-[20px] h-12 text-base font-medium active:scale-[0.92] transition-all duration-200">
              <Link to={`/messages?peerId=${s.workerId}`}>
                <MessageCircle className="h-5 w-5 mr-2" /> 문의하기
              </Link>
            </Button>
          </div>

          {/* Worker card */}
          <Link to={`/workers/${s.workerId}`} className="block">
            <div className="bg-[#F4F1FA] rounded-[32px] p-6 transition-all duration-200 hover:scale-[1.02]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-[20px] bg-[#7C3AED] flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                  {s.workerImage ? (
                    <img src={s.workerImage} alt="" className="w-12 h-12 object-cover" />
                  ) : (
                    (s.workerName || '?')[0]
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-[#332F3A]">{s.workerName || '전문가'}</h3>
                  {s.workerLocation && (
                    <div className="flex items-center gap-1 text-xs text-[#635F69]">
                      <MapPin className="h-3 w-3" />{s.workerLocation}
                    </div>
                  )}
                </div>
              </div>
              {s.workerRating > 0 && (
                <div className="flex items-center gap-1 mt-3 text-sm">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <span>{s.workerRating}</span>
                  <span className="text-[#635F69]">({s.workerReviewCount})</span>
                </div>
              )}
              {s.workerBio && (
                <p className="text-sm text-[#635F69] mt-2 line-clamp-2">{s.workerBio}</p>
              )}
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}