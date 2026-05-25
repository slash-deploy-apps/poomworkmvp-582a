import { useState } from 'react';
import { redirect } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { Link, useLoaderData, useNavigate } from 'react-router';
import { eq, asc } from 'drizzle-orm';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { ImageUploader } from '~/components/image-uploader';
import { db } from '~/lib/db.server';
import { services, categories } from '~/db/schema';
import { auth } from '~/lib/auth.server';

export const meta: MetaFunction = () => [{ title: '서비스 수정 - poomwork' }];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return redirect('/login');

  const serviceId = params.serviceId!;
  const s = await db.select().from(services).where(eq(services.id, serviceId)).get();
  if (!s) throw new Response('Not Found', { status: 404 });
  if (s.workerId !== session.user.id) return redirect('/dashboard');

  const topCategories = await db
    .select()
    .from(categories)
    .orderBy(asc(categories.sortOrder));

  return { service: s, categories: topCategories };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return redirect('/login');

  const serviceId = params.serviceId!;
  const formData = await request.formData();
  const _action = formData.get('_action') as string;

  if (_action === 'delete') {
    await db.delete(services).where(eq(services.id, serviceId));
    return redirect('/my/services');
  }

  const title = (formData.get('title') as string) || '';
  const description = (formData.get('description') as string) || '';
  const categoryIdStr = formData.get('categoryId') as string | null;
  const thumbnailUrl = (formData.get('thumbnailUrl') as string) || null;
  const videoUrl = (formData.get('videoUrl') as string) || null;
  const priceStr = (formData.get('price') as string) || '0';
  const deliveryDaysStr = (formData.get('deliveryDays') as string) || '7';
  const revisionsStr = (formData.get('revisions') as string) || '2';
  const tags = (formData.get('tags') as string) || null;
  const status = (formData.get('status') as string) || 'active';

  await db.update(services).set({
    title,
    description,
    categoryId: categoryIdStr ? Number(categoryIdStr) : null,
    thumbnailUrl,
    videoUrl,
    price: Number(priceStr),
    deliveryDays: Number(deliveryDaysStr),
    revisions: Number(revisionsStr),
    tags,
    status,
    updatedAt: new Date(),
  }).where(eq(services.id, serviceId));

  return redirect(`/services/${serviceId}`);
}

export default function ServicesEdit() {
  const data = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const s = data.service as typeof data.service;
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(s.thumbnailUrl);

  return (
    <div className="min-h-screen bg-[#F4F1FA]">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate(-1)} className="p-2 rounded-[20px] hover:bg-[#EDE9FE] transition-colors duration-300">
            <ArrowLeft className="h-5 w-5 text-[#635F69]" />
          </button>
          <h1 className="text-2xl font-bold text-[#332F3A]">서비스 수정</h1>
        </div>

        <form method="post" className="space-y-6">
          <input type="hidden" name="_action" value="update" />

          <div className="bg-white/60 backdrop-blur-xl rounded-[32px] p-6 shadow-clayCard space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#635F69] mb-1">상태</label>
              <select name="status" defaultValue={s.status} className="w-full bg-[#EDE9FE] rounded-[20px] h-12 px-4 text-[#332F3A] focus:border-[#7C3AED] focus:outline-none transition-colors duration-300">
                <option value="active">활성</option>
                <option value="paused">일시정지</option>
                <option value="draft">임시저장</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#635F69] mb-1">카테고리</label>
              <select name="categoryId" defaultValue={s.categoryId ?? ''} className="w-full bg-[#EDE9FE] rounded-[20px] h-12 px-4 text-[#332F3A] focus:border-[#7C3AED] focus:outline-none transition-colors duration-300">
                <option value="">선택 안함</option>
                {data.categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#635F69] mb-1">제목 *</label>
              <input name="title" type="text" required defaultValue={s.title} className="w-full bg-[#EDE9FE] rounded-[20px] h-12 px-4 text-[#332F3A] focus:border-[#7C3AED] focus:outline-none transition-colors duration-300" />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#635F69] mb-1">설명 *</label>
              <textarea name="description" required rows={5} defaultValue={s.description} className="w-full bg-[#EDE9FE] rounded-[20px] p-4 text-[#332F3A] focus:border-[#7C3AED] focus:outline-none transition-colors duration-300 resize-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#635F69] mb-2">썸네일</label>
              <ImageUploader endpoint="serviceImage" currentImageUrl={thumbnailUrl || undefined} onUploadComplete={(url) => setThumbnailUrl(url)} onRemove={() => setThumbnailUrl(null)} className="w-full max-w-xs" />
              <input type="hidden" name="thumbnailUrl" value={thumbnailUrl || ''} />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#635F69] mb-1">소개 동영상 (YouTube/Vimeo URL)</label>
              <input name="videoUrl" type="url" defaultValue={s.videoUrl ?? ''} placeholder="https://youtube.com/watch?v=..." className="w-full bg-[#EDE9FE] rounded-[20px] h-12 px-4 text-[#332F3A] placeholder:text-gray-400 focus:border-[#7C3AED] focus:outline-none transition-colors duration-300" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#635F69] mb-1">가격 (원) *</label>
                <input name="price" type="number" required min={0} defaultValue={s.price} className="w-full bg-[#EDE9FE] rounded-[20px] h-12 px-4 text-[#332F3A] focus:border-[#7C3AED] focus:outline-none transition-colors duration-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#635F69] mb-1">소요일</label>
                <input name="deliveryDays" type="number" min={1} defaultValue={s.deliveryDays} className="w-full bg-[#EDE9FE] rounded-[20px] h-12 px-4 text-[#332F3A] focus:border-[#7C3AED] focus:outline-none transition-colors duration-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#635F69] mb-1">수정 횟수</label>
                <input name="revisions" type="number" min={0} defaultValue={s.revisions} className="w-full bg-[#EDE9FE] rounded-[20px] h-12 px-4 text-[#332F3A] focus:border-[#7C3AED] focus:outline-none transition-colors duration-300" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#635F69] mb-1">태그 (쉼표로 구분)</label>
              <input name="tags" type="text" defaultValue={s.tags ?? ''} placeholder="디자인, 로고, 브랜딩" className="w-full bg-[#EDE9FE] rounded-[20px] h-12 px-4 text-[#332F3A] placeholder:text-gray-400 focus:border-[#7C3AED] focus:outline-none transition-colors duration-300" />
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" className="flex-1 bg-[#7C3AED] hover:bg-[#5a3d95] text-white rounded-[20px] h-14 text-base font-medium active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200">
              수정하기
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1 rounded-[20px] h-14 text-base font-medium border-[#7C3AED] text-[#332F3A] hover:bg-[#EDE9FE] active:scale-[0.92] transition-all duration-200">
              취소
            </Button>
          </div>
        </form>

        {/* Delete section */}
        <div className="mt-8 pt-8 border-t border-red-200">
          <form method="post">
            <input type="hidden" name="_action" value="delete" />
            <Button type="submit" variant="destructive" className="w-full rounded-[20px] h-12 bg-red-500 hover:bg-red-600 text-white active:scale-[0.92] transition-all duration-200">
              <Trash2 className="h-4 w-4 mr-2" /> 서비스 삭제
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}