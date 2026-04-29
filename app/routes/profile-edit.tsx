import { useState } from 'react';
import { Link, redirect, useLoaderData, useNavigate } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { eq, desc } from 'drizzle-orm';
import { User, MapPin, Phone, FileText, Briefcase, ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { ImageUploader } from '~/components/image-uploader';
import { db } from '~/lib/db.server';
import { user, portfolios } from '~/db/schema';
import { auth } from '~/lib/auth.server';

export const meta: MetaFunction = () => [{ title: '프로필 편집 - poomwork' }];

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return redirect('/login');
  const u = await db.select().from(user).where(eq(user.id, session.user.id)).get();
  if (!u) return redirect('/login');
  const userPortfolios = await db.select().from(portfolios).where(eq(portfolios.workerId, session.user.id)).orderBy(desc(portfolios.createdAt)).all();
  return { user: u, portfolios: userPortfolios };
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return redirect('/login');
  const formData = await request.formData();
  const _action = formData.get('_action') as string;

  if (_action === 'addPortfolio') {
    const imageUrl = formData.get('portfolioImageUrl') as string | null;
    const title = (formData.get('portfolioTitle') as string) || '';
    const description = (formData.get('portfolioDescription') as string) || '';
    const projectUrl = formData.get('portfolioProjectUrl') as string | null;
    const skills = formData.get('portfolioSkills') as string | null;
    if (!title) return { error: '제목은 필수입니다' };
    await db.insert(portfolios).values({
      workerId: session.user.id,
      imageUrl: imageUrl || null,
      title,
      description,
      projectUrl: projectUrl || null,
      skills: skills || null,
    });
    return redirect('/profile/edit');
  }

  if (_action === 'updatePortfolio') {
    const id = formData.get('portfolioId') as string;
    const imageUrl = formData.get('portfolioImageUrl') as string | null;
    const title = (formData.get('portfolioTitle') as string) || '';
    const description = (formData.get('portfolioDescription') as string) || '';
    const projectUrl = formData.get('portfolioProjectUrl') as string | null;
    const skills = formData.get('portfolioSkills') as string | null;
    if (!id) return null;
    await db.update(portfolios).set({
      imageUrl: imageUrl || null,
      title,
      description,
      projectUrl: projectUrl || null,
      skills: skills || null,
    }).where(eq(portfolios.id, id));
    return redirect('/profile/edit');
  }

  if (_action === 'deletePortfolio') {
    const id = formData.get('portfolioId') as string;
    if (!id) return null;
    await db.delete(portfolios).where(eq(portfolios.id, id));
    return redirect('/profile/edit');
  }

  const name = formData.get('name') as string | null;
  const phone = formData.get('phone') as string | null;
  const bio = formData.get('bio') as string | null;
  const skills = formData.get('skills') as string | null;
  const location = formData.get('location') as string | null;
  const image = formData.get('image') as string | null;
  const coverImage = formData.get('coverImage') as string | null;

  await db.update(user).set({
    name: name || null,
    phone: phone || null,
    bio: bio || null,
    skills: skills || null,
    location: location || null,
    image: image || null,
    coverImage: coverImage || null,
    updatedAt: new Date(),
  }).where(eq(user.id, session.user.id));
  return redirect('/dashboard');
}

export default function ProfileEdit() {
  const data = useLoaderData<typeof loader>();
  const u = data.user as any;
  const userPortfolios = (data.portfolios || []) as any[];
  const navigate = useNavigate();

  const [profileImage, setProfileImage] = useState<string | null>(u.image || null);
  const [coverImg, setCoverImg] = useState<string | null>(u.coverImage || null);
  const [showPortfolioForm, setShowPortfolioForm] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<any>(null);

  return (
    <div className="min-h-screen bg-[#F4F1FA]">
      <div className="fixed top-0 right-0 w-96 h-96 bg-purple-200/30 rounded-[20px] blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="container mx-auto px-4 py-8 max-w-2xl relative">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-[20px] hover:bg-[#EDE9FE] transition-colors duration-300"
          >
            <ArrowLeft className="h-5 w-5 text-[#635F69]" />
          </button>
          <h1 className="text-2xl font-bold text-[#332F3A]">프로필 편집</h1>
        </div>

        <div className="mb-6">
          <ImageUploader
            endpoint="coverImage"
            currentImageUrl={coverImg || undefined}
            onUploadComplete={(url) => setCoverImg(url)}
            onRemove={() => setCoverImg(null)}
            aspectRatio="banner"
            className="w-full"
          />
        </div>

        <form method="post" className="space-y-6">
          <input type="hidden" name="image" value={profileImage || ''} />
          <input type="hidden" name="coverImage" value={coverImg || ''} />

          <div className="flex flex-col items-center mb-8 -mt-16 relative z-10">
            <div className="w-28 h-28 rounded-[32px] overflow-hidden bg-[#EDE9FE] flex items-center justify-center mb-3 shadow-lg border-4 border-white">
              <ImageUploader
                endpoint="profileImage"
                currentImageUrl={profileImage || undefined}
                onUploadComplete={(url) => setProfileImage(url)}
                onRemove={() => setProfileImage(null)}
                className="w-full h-full"
              />
            </div>
            <span className="text-sm text-[#635F69]">{u.email}</span>
            <Badge role={u.role} />
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-[#635F69] mb-1">이름</label>
            <div className="relative">
              <User className="absolute left-3 top-4 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                name="name"
                type="text"
                defaultValue={u.name || ''}
                placeholder="이름을 입력하세요"
                className="w-full bg-[#EDE9FE] rounded-t-xl border-0 border-b-2 border-gray-400 h-14 pl-10 pr-4 text-[#332F3A] placeholder:text-gray-400 focus:border-[#7C3AED] focus:outline-none transition-colors duration-300"
              />
            </div>
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-[#635F69] mb-1">전화번호</label>
            <div className="relative">
              <Phone className="absolute left-3 top-4 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                name="phone"
                type="tel"
                defaultValue={u.phone || ''}
                placeholder="010-0000-0000"
                className="w-full bg-[#EDE9FE] rounded-t-xl border-0 border-b-2 border-gray-400 h-14 pl-10 pr-4 text-[#332F3A] placeholder:text-gray-400 focus:border-[#7C3AED] focus:outline-none transition-colors duration-300"
              />
            </div>
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-[#635F69] mb-1">지역</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-4 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                name="location"
                type="text"
                defaultValue={u.location || ''}
                placeholder="서울특별시 강남구"
                className="w-full bg-[#EDE9FE] rounded-t-xl border-0 border-b-2 border-gray-400 h-14 pl-10 pr-4 text-[#332F3A] placeholder:text-gray-400 focus:border-[#7C3AED] focus:outline-none transition-colors duration-300"
              />
            </div>
          </div>

          {u.role === 'worker' && (
            <div className="relative">
              <label className="block text-sm font-medium text-[#635F69] mb-1">보유 기술</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-4 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  name="skills"
                  type="text"
                  defaultValue={u.skills || ''}
                  placeholder="React, Node.js, Python 등 (쉼표로 구분)"
                  className="w-full bg-[#EDE9FE] rounded-t-xl border-0 border-b-2 border-gray-400 h-14 pl-10 pr-4 text-[#332F3A] placeholder:text-gray-400 focus:border-[#7C3AED] focus:outline-none transition-colors duration-300"
                />
              </div>
            </div>
          )}

          <div className="relative">
            <label className="block text-sm font-medium text-[#635F69] mb-1">소개</label>
            <div className="relative">
              <FileText className="absolute left-3 top-4 h-4 w-4 text-gray-400 pointer-events-none" />
              <textarea
                name="bio"
                defaultValue={u.bio || ''}
                rows={4}
                placeholder="자기소개를 입력하세요"
                className="w-full bg-[#EDE9FE] rounded-t-xl border-0 border-b-2 border-gray-400 pt-4 pl-10 pr-4 pb-2 text-[#332F3A] placeholder:text-gray-400 focus:border-[#7C3AED] focus:outline-none transition-colors duration-300 resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              className="flex-1 bg-[#7C3AED] hover:bg-[#5a3d95] text-white rounded-[20px] h-14 text-base font-medium active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200"
            >
              저장하기
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              className="flex-1 rounded-[20px] h-14 text-base font-medium border-[#7C3AED] text-[#332F3A] hover:bg-[#EDE9FE] active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200"
            >
              취소
            </Button>
          </div>
        </form>

        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#332F3A]">포트폴리오</h2>
            <Button
              type="button"
              onClick={() => { setEditingPortfolio(null); setShowPortfolioForm(true); }}
              className="bg-[#7C3AED] hover:bg-[#5a3d95] text-white rounded-[20px] h-11 text-sm font-medium active:scale-[0.92] transition-all duration-200"
            >
              <Plus className="h-4 w-4 mr-1" /> 추가
            </Button>
          </div>

          {showPortfolioForm && (
            <PortfolioForm
              portfolio={editingPortfolio}
              onClose={() => { setShowPortfolioForm(false); setEditingPortfolio(null); }}
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {userPortfolios.map((p) => (
              <div key={p.id} className="bg-white/60 backdrop-blur-xl rounded-[24px] p-4 shadow-clayCard hover:-translate-y-1 transition-all duration-300">
                {p.imageUrl && (
                  <img src={p.imageUrl} alt={p.title} className="w-full h-32 object-cover rounded-[16px] mb-3" />
                )}
                <h3 className="font-semibold text-[#332F3A] truncate">{p.title}</h3>
                {p.description && <p className="text-sm text-[#635F69] line-clamp-2 mt-1">{p.description}</p>}
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => { setEditingPortfolio(p); setShowPortfolioForm(true); }}
                    className="flex-1 py-2 text-sm bg-[#EDE9FE] hover:bg-[#E0D9F5] text-[#332F3A] rounded-[16px] transition-colors"
                  >
                    <Pencil className="h-4 w-4 inline mr-1" /> 편집
                  </button>
                  <form method="post" className="flex-1">
                    <input type="hidden" name="_action" value="deletePortfolio" />
                    <input type="hidden" name="portfolioId" value={p.id} />
                    <button
                      type="submit"
                      className="w-full py-2 text-sm bg-red-50 hover:bg-red-100 text-red-500 rounded-[16px] transition-colors"
                    >
                      <Trash2 className="h-4 w-4 inline mr-1" /> 삭제
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PortfolioForm({ portfolio, onClose }: { portfolio?: any; onClose: () => void }) {
  const [imageUrl, setImageUrl] = useState<string | null>(portfolio?.imageUrl || null);

  return (
    <div className="bg-white/60 backdrop-blur-xl rounded-[24px] p-6 shadow-clayCard mb-4">
      <h3 className="text-lg font-semibold text-[#332F3A] mb-4">{portfolio ? '포트폴리오 편집' : '포트폴리오 추가'}</h3>
      <form method="post" className="space-y-4">
        <input type="hidden" name="_action" value={portfolio ? 'updatePortfolio' : 'addPortfolio'} />
        {portfolio && <input type="hidden" name="portfolioId" value={portfolio.id} />}

        <div>
          <label className="block text-sm font-medium text-[#635F69] mb-2">이미지</label>
          <ImageUploader
            endpoint="portfolioImage"
            currentImageUrl={imageUrl || undefined}
            onUploadComplete={(url) => setImageUrl(url)}
            onRemove={() => setImageUrl(null)}
            className="w-full max-w-xs"
          />
          <input type="hidden" name="portfolioImageUrl" value={imageUrl || ''} />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#635F69] mb-1">제목 *</label>
          <input
            name="portfolioTitle"
            type="text"
            defaultValue={portfolio?.title || ''}
            required
            placeholder="포트폴리오 제목"
            className="w-full bg-[#EDE9FE] rounded-[20px] h-12 px-4 text-[#332F3A] placeholder:text-gray-400 focus:border-[#7C3AED] focus:outline-none transition-colors duration-300"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#635F69] mb-1">설명</label>
          <textarea
            name="portfolioDescription"
            defaultValue={portfolio?.description || ''}
            rows={3}
            placeholder="포트폴리오 설명"
            className="w-full bg-[#EDE9FE] rounded-[20px] p-4 text-[#332F3A] placeholder:text-gray-400 focus:border-[#7C3AED] focus:outline-none transition-colors duration-300 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#635F69] mb-1">프로젝트 URL</label>
          <input
            name="portfolioProjectUrl"
            type="url"
            defaultValue={portfolio?.projectUrl || ''}
            placeholder="https://..."
            className="w-full bg-[#EDE9FE] rounded-[20px] h-12 px-4 text-[#332F3A] placeholder:text-gray-400 focus:border-[#7C3AED] focus:outline-none transition-colors duration-300"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#635F69] mb-1">기술 스택</label>
          <input
            name="portfolioSkills"
            type="text"
            defaultValue={portfolio?.skills || ''}
            placeholder="React, Node.js 등 (쉼표로 구분)"
            className="w-full bg-[#EDE9FE] rounded-[20px] h-12 px-4 text-[#332F3A] placeholder:text-gray-400 focus:border-[#7C3AED] focus:outline-none transition-colors duration-300"
          />
        </div>

        <div className="flex gap-3">
          <Button
            type="submit"
            className="flex-1 bg-[#7C3AED] hover:bg-[#5a3d95] text-white rounded-[20px] h-12 text-base font-medium active:scale-[0.92] transition-all duration-200"
          >
            {portfolio ? '수정하기' : '추가하기'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-[20px] h-12 text-base font-medium border-[#7C3AED] text-[#332F3A] hover:bg-[#EDE9FE] active:scale-[0.92] transition-all duration-200"
          >
            취소
          </Button>
        </div>
      </form>
    </div>
  );
}

function Badge({ role }: { role: string }) {
  const config = {
    worker: { label: '인력 제공자', bg: 'bg-[#EDE9FE]', text: 'text-[#332F3A]' },
    client: { label: '일거리 제공자', bg: 'bg-[#EDE9FE]', text: 'text-[#332F3A]' },
    admin: { label: '관리자', bg: 'bg-[#DB2777]', text: 'text-white' },
  }[role] || { label: role, bg: 'bg-gray-200', text: 'text-gray-700' };
  return (
    <span className={`mt-1 px-3 py-1 rounded-[20px] text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}
