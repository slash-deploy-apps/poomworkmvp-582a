import { useState } from 'react';
import { redirect } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { useLoaderData, useNavigate } from 'react-router';
import { eq, asc } from 'drizzle-orm';
import { ArrowLeft } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { ImageUploader } from '~/components/image-uploader';
import { db } from '~/lib/db.server';
import { services, categories } from '~/db/schema';
import { auth } from '~/lib/auth.server';

export const meta: MetaFunction = () => [{ title: '서비스 등록 - poomwork' }];

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return redirect('/login');
  if (session.user.role !== 'worker') return redirect('/dashboard');

  const topCategories = await db
    .select()
    .from(categories)
    .orderBy(asc(categories.sortOrder));

  return { categories: topCategories };
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return redirect('/login');

  const formData = await request.formData();
  const title = (formData.get('title') as string) || '';
  const description = (formData.get('description') as string) || '';
  const categoryIdStr = formData.get('categoryId') as string | null;
  const thumbnailUrl = (formData.get('thumbnailUrl') as string) || null;
  const videoUrl = (formData.get('videoUrl') as string) || null;
  const priceStr = (formData.get('price') as string) || '0';
  const deliveryDaysStr = (formData.get('deliveryDays') as string) || '7';
  const revisionsStr = (formData.get('revisions') as string) || '2';
  const tags = (formData.get('tags') as string) || null;

  if (!title) return { error: '제목은 필수입니다' };
  if (!description) return { error: '설명은 필수입니다' };

  const id = crypto.randomUUID();
  await db.insert(services).values({
    id,
    workerId: session.user.id,
    categoryId: categoryIdStr ? Number(categoryIdStr) : null,
    title,
    description,
    thumbnailUrl,
    videoUrl,
    price: Number(priceStr),
    deliveryDays: Number(deliveryDaysStr),
    revisions: Number(revisionsStr),
    tags,
    status: 'active',
  });

  return redirect(`/services/${id}`);
}

export default function ServicesNew() {
  const data = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F4F1FA]">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate(-1)} className="p-2 rounded-[20px] hover:bg-[#EDE9FE] transition-colors duration-300">
            <ArrowLeft className="h-5 w-5 text-[#635F69]" />
          </button>
          <h1 className="text-2xl font-bold text-[#332F3A]">서비스 등록</h1>
        </div>

        <form method="post" className="space-y-6">
          <div className="bg-white/60 backdrop-blur-xl rounded-[32px] p-6 shadow-clayCard space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#635F69] mb-1">카테고리</label>
              <select
                name="categoryId"
                className="w-full bg-[#EDE9FE] rounded-[20px] h-12 px-4 text-[#332F3A] focus:border-[#7C3AED] focus:outline-none transition-colors duration-300"
              >
                <option value="">선택 안함</option>
                {data.categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#635F69] mb-1">제목 *</label>
              <input
                name="title"
                type="text"
                required
                placeholder="어떤 서비스인가요?"
                className="w-full bg-[#EDE9FE] rounded-[20px] h-12 px-4 text-[#332F3A] placeholder:text-gray-400 focus:border-[#7C3AED] focus:outline-none transition-colors duration-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#635F69] mb-1">설명 *</label>
              <textarea
                name="description"
                required
                rows={5}
                placeholder="서비스에 대해 자세히 설명해주세요"
                className="w-full bg-[#EDE9FE] rounded-[20px] p-4 text-[#332F3A] placeholder:text-gray-400 focus:border-[#7C3AED] focus:outline-none transition-colors duration-300 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#635F69] mb-2">썸네일</label>
              <ServiceThumbnailUploader />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#635F69] mb-1">소개 동영상 (YouTube/Vimeo URL)</label>
              <input
                name="videoUrl"
                type="url"
                placeholder="https://youtube.com/watch?v=... 또는 https://vimeo.com/..."
                className="w-full bg-[#EDE9FE] rounded-[20px] h-12 px-4 text-[#332F3A] placeholder:text-gray-400 focus:border-[#7C3AED] focus:outline-none transition-colors duration-300"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#635F69] mb-1">가격 (원) *</label>
                <input
                  name="price"
                  type="number"
                  required
                  min={0}
                  placeholder="0"
                  className="w-full bg-[#EDE9FE] rounded-[20px] h-12 px-4 text-[#332F3A] placeholder:text-gray-400 focus:border-[#7C3AED] focus:outline-none transition-colors duration-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#635F69] mb-1">소요일</label>
                <input
                  name="deliveryDays"
                  type="number"
                  min={1}
                  defaultValue={7}
                  className="w-full bg-[#EDE9FE] rounded-[20px] h-12 px-4 text-[#332F3A] focus:border-[#7C3AED] focus:outline-none transition-colors duration-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#635F69] mb-1">수정 횟수</label>
                <input
                  name="revisions"
                  type="number"
                  min={0}
                  defaultValue={2}
                  className="w-full bg-[#EDE9FE] rounded-[20px] h-12 px-4 text-[#332F3A] focus:border-[#7C3AED] focus:outline-none transition-colors duration-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#635F69] mb-1">태그 (쉼표로 구분)</label>
              <input
                name="tags"
                type="text"
                placeholder="디자인, 로고, 브랜딩"
                className="w-full bg-[#EDE9FE] rounded-[20px] h-12 px-4 text-[#332F3A] placeholder:text-gray-400 focus:border-[#7C3AED] focus:outline-none transition-colors duration-300"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" className="flex-1 bg-[#7C3AED] hover:bg-[#5a3d95] text-white rounded-[20px] h-14 text-base font-medium active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200">
              등록하기
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1 rounded-[20px] h-14 text-base font-medium border-[#7C3AED] text-[#332F3A] hover:bg-[#EDE9FE] active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200">
              취소
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ServiceThumbnailUploader() {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  return (
    <>
      <ImageUploader
        endpoint="serviceImage"
        currentImageUrl={thumbnailUrl || undefined}
        onUploadComplete={(url) => setThumbnailUrl(url)}
        onRemove={() => setThumbnailUrl(null)}
        className="w-full max-w-xs"
      />
      <input type="hidden" name="thumbnailUrl" value={thumbnailUrl || ''} />
    </>
  );
}