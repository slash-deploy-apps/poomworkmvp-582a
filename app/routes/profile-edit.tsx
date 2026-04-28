import { useState } from 'react';
import { Link, redirect, useLoaderData, useNavigate } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { eq } from 'drizzle-orm';
import { User, MapPin, Phone, FileText, Briefcase, ArrowLeft } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { db } from '~/lib/db.server';
import { user } from '~/db/schema';
import { auth } from '~/lib/auth.server';

export const meta: MetaFunction = () => [{ title: '프로필 편집 - poomwork' }];

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return redirect('/login');
  const u = await db.select().from(user).where(eq(user.id, session.user.id)).get();
  if (!u) return redirect('/login');
  return { user: u };
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return redirect('/login');
  const formData = await request.formData();
  const name = formData.get('name') as string;
  const phone = formData.get('phone') as string;
  const bio = formData.get('bio') as string;
  const skills = formData.get('skills') as string;
  const location = formData.get('location') as string;
  await db.update(user).set({
    name: name || null,
    phone: phone || null,
    bio: bio || null,
    skills: skills || null,
    location: location || null,
    updatedAt: new Date(),
  }).where(eq(user.id, session.user.id));
  return redirect('/dashboard');
}

export default function ProfileEdit() {
  const data = useLoaderData<typeof loader>();
  const u = data.user as any;
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FFFBFE]">
      {/* Decorative blur shape */}
      <div className="fixed top-0 right-0 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="container mx-auto px-4 py-8 max-w-2xl relative">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-[#E7E0EC] transition-colors duration-300"
          >
            <ArrowLeft className="h-5 w-5 text-[#49454F]" />
          </button>
          <h1 className="text-2xl font-bold text-[#1C1B1F]">프로필 편집</h1>
        </div>

        <form method="post" className="space-y-6">
          {/* Avatar section */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-24 h-24 rounded-full bg-[#E8DEF8] flex items-center justify-center mb-3">
              {u.image ? (
                <img src={u.image} alt={u.name} className="w-24 h-24 rounded-full object-cover" />
              ) : (
                <User className="h-12 w-12 text-[#6750A4]" />
              )}
            </div>
            <span className="text-sm text-[#49454F]">{u.email}</span>
            <Badge role={u.role} />
          </div>

          {/* Name */}
          <div className="relative">
            <label className="block text-sm font-medium text-[#49454F] mb-1">이름</label>
            <div className="relative">
              <User className="absolute left-3 top-4 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                name="name"
                type="text"
                defaultValue={u.name || ''}
                placeholder="이름을 입력하세요"
                className="w-full bg-[#E7E0EC] rounded-t-xl border-0 border-b-2 border-gray-400 h-14 pl-10 pr-4 text-[#1C1B1F] placeholder:text-gray-400 focus:border-[#6750A4] focus:outline-none transition-colors duration-300"
              />
            </div>
          </div>

          {/* Phone */}
          <div className="relative">
            <label className="block text-sm font-medium text-[#49454F] mb-1">전화번호</label>
            <div className="relative">
              <Phone className="absolute left-3 top-4 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                name="phone"
                type="tel"
                defaultValue={u.phone || ''}
                placeholder="010-0000-0000"
                className="w-full bg-[#E7E0EC] rounded-t-xl border-0 border-b-2 border-gray-400 h-14 pl-10 pr-4 text-[#1C1B1F] placeholder:text-gray-400 focus:border-[#6750A4] focus:outline-none transition-colors duration-300"
              />
            </div>
          </div>

          {/* Location */}
          <div className="relative">
            <label className="block text-sm font-medium text-[#49454F] mb-1">지역</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-4 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                name="location"
                type="text"
                defaultValue={u.location || ''}
                placeholder="서울특별시 강남구"
                className="w-full bg-[#E7E0EC] rounded-t-xl border-0 border-b-2 border-gray-400 h-14 pl-10 pr-4 text-[#1C1B1F] placeholder:text-gray-400 focus:border-[#6750A4] focus:outline-none transition-colors duration-300"
              />
            </div>
          </div>

          {/* Skills (worker only) */}
          {u.role === 'worker' && (
            <div className="relative">
              <label className="block text-sm font-medium text-[#49454F] mb-1">보유 기술</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-4 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  name="skills"
                  type="text"
                  defaultValue={u.skills || ''}
                  placeholder="React, Node.js, Python 등 (쉼표로 구분)"
                  className="w-full bg-[#E7E0EC] rounded-t-xl border-0 border-b-2 border-gray-400 h-14 pl-10 pr-4 text-[#1C1B1F] placeholder:text-gray-400 focus:border-[#6750A4] focus:outline-none transition-colors duration-300"
                />
              </div>
            </div>
          )}

          {/* Bio */}
          <div className="relative">
            <label className="block text-sm font-medium text-[#49454F] mb-1">소개</label>
            <div className="relative">
              <FileText className="absolute left-3 top-4 h-4 w-4 text-gray-400 pointer-events-none" />
              <textarea
                name="bio"
                defaultValue={u.bio || ''}
                rows={4}
                placeholder="자기소개를 입력하세요"
                className="w-full bg-[#E7E0EC] rounded-t-xl border-0 border-b-2 border-gray-400 pt-4 pl-10 pr-4 pb-2 text-[#1C1B1F] placeholder:text-gray-400 focus:border-[#6750A4] focus:outline-none transition-colors duration-300 resize-none"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              className="flex-1 bg-[#6750A4] hover:bg-[#5a3d95] text-white rounded-full h-14 text-base font-medium active:scale-95 transition-all duration-300"
            >
              저장하기
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              className="flex-1 rounded-full h-14 text-base font-medium border-[#79747E] text-[#1C1B1F] hover:bg-[#E7E0EC] active:scale-95 transition-all duration-300"
            >
              취소
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Badge({ role }: { role: string }) {
  const config = {
    worker: { label: '인력 제공자', bg: 'bg-[#E8DEF8]', text: 'text-[#1D192B]' },
    client: { label: '일거리 제공자', bg: 'bg-[#E8DEF8]', text: 'text-[#1D192B]' },
    admin: { label: '관리자', bg: 'bg-[#7D5260]', text: 'text-white' },
  }[role] || { label: role, bg: 'bg-gray-200', text: 'text-gray-700' };
  return (
    <span className={`mt-1 px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}