import { Link, redirect, useLoaderData } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs } from 'react-router';
import { eq } from 'drizzle-orm';
import { CheckCircle2, Circle, User, Briefcase, GraduationCap, Users } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { db } from '~/lib/db.server';
import { portfolios } from '~/db/schema';
import { auth } from '~/lib/auth.server';

export const meta: MetaFunction = () => [{ title: '시작하기 - poomwork' }];

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return redirect('/login');

  const u = session.user as { id: string; name?: string | null; email: string; role?: string; bio?: string | null };

  if (u.role === 'admin') return redirect('/admin');

  const portfolioRows = await db
    .select()
    .from(portfolios)
    .where(eq(portfolios.workerId, u.id))
    .limit(1);

  return {
    user: u,
    hasPortfolio: portfolioRows.length > 0,
    hasBio: Boolean(u.bio && u.bio.trim().length > 0),
  };
}

type LoaderData = {
  user: { id: string; name?: string | null; email: string; role?: string };
  hasPortfolio: boolean;
  hasBio: boolean;
};

interface CheckItem {
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  done: boolean;
  optional?: boolean;
}

export default function Onboarding() {
  const { user, hasPortfolio, hasBio } = useLoaderData<LoaderData>();
  const isWorker = user.role === 'worker' || !user.role;

  const workerChecklist: CheckItem[] = [
    {
      label: '프로필 완성하기',
      description: 'bio, 스킬, 위치 정보를 채워 전문가 신뢰도를 높이세요',
      href: '/profile/edit',
      icon: <User className="h-6 w-6" />,
      done: hasBio,
    },
    {
      label: '포트폴리오 등록하기',
      description: '내 작업물을 공유해 발주자에게 역량을 어필하세요',
      href: '/profile/edit#portfolio',
      icon: <Briefcase className="h-6 w-6" />,
      done: hasPortfolio,
    },
    {
      label: '일거리 둘러보기',
      description: '지금 열려있는 프로젝트를 탐색하고 지원해보세요',
      href: '/jobs',
      icon: <Users className="h-6 w-6" />,
      done: false,
    },
    {
      label: '강좌 개설하기',
      description: '내 전문 지식을 강좌로 만들고 수익을 올려보세요 (선택)',
      href: '/courses/new',
      icon: <GraduationCap className="h-6 w-6" />,
      done: false,
      optional: true,
    },
  ];

  const clientChecklist: CheckItem[] = [
    {
      label: '프로필 작성하기',
      description: '회사 소개와 연락처를 등록해 전문가의 신뢰를 얻으세요',
      href: '/profile/edit',
      icon: <User className="h-6 w-6" />,
      done: hasBio,
    },
    {
      label: '첫 일거리 등록하기',
      description: '필요한 작업을 올리면 전문가가 지원합니다',
      href: '/jobs/new',
      icon: <Briefcase className="h-6 w-6" />,
      done: false,
    },
    {
      label: '전문가 둘러보기',
      description: '프로필과 포트폴리오로 최적의 전문가를 찾아보세요',
      href: '/workers',
      icon: <Users className="h-6 w-6" />,
      done: false,
    },
  ];

  const checklist = isWorker ? workerChecklist : clientChecklist;
  const doneCount = checklist.filter((c) => c.done && !c.optional).length;
  const requiredCount = checklist.filter((c) => !c.optional).length;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Blob backgrounds */}
      <div
        className="absolute top-0 left-1/4 w-96 h-96 bg-[#8B5CF6]/10 rounded-full blur-3xl animate-clay-float pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 right-1/4 w-72 h-72 bg-[#EC4899]/10 rounded-full blur-3xl animate-clay-float-delayed pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute top-1/3 right-0 w-56 h-56 bg-[#06B6D4]/10 rounded-full blur-3xl animate-clay-float pointer-events-none"
        aria-hidden="true"
      />

      <div className="w-full max-w-xl relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-[#EDE9FE] px-4 py-2 rounded-full text-sm font-bold text-[#7C3AED] mb-4">
            {isWorker ? '전문가' : '일거리 제공자'} 온보딩
          </div>
          <h1
            className="text-4xl font-extrabold text-[#332F3A] leading-tight"
            style={{ fontFamily: "'Nunito', sans-serif" }}
          >
            {isWorker ? '전문가로 시작하기' : '프로젝트 시작하기'}
          </h1>
          <p className="text-[#635F69] mt-3 text-lg">
            {isWorker
              ? '프로필을 채우고 첫 일감을 만나보세요'
              : '전문가에게 일거리를 맡겨보세요'}
          </p>
          {/* Progress bar */}
          <div className="mt-5 flex items-center justify-center gap-3">
            <div className="flex-1 max-w-[200px] bg-[#EDE9FE] rounded-full h-2">
              <div
                className="bg-gradient-to-r from-[#A78BFA] to-[#7C3AED] h-2 rounded-full transition-all duration-500"
                style={{ width: `${(doneCount / requiredCount) * 100}%` }}
              />
            </div>
            <span className="text-sm font-bold text-[#7C3AED]">
              {doneCount}/{requiredCount} 완료
            </span>
          </div>
        </div>

        {/* Checklist cards */}
        <div className="space-y-3 mb-8">
          {checklist.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`group flex items-center gap-4 p-5 rounded-[24px] transition-all duration-200 active:scale-[0.97] ${
                item.done
                  ? 'bg-white/60 backdrop-blur-xl shadow-clay-card opacity-75'
                  : 'bg-white/80 backdrop-blur-xl shadow-clay-card hover:-translate-y-1 hover:shadow-clay-card-hover'
              }`}
            >
              {/* Status icon */}
              <div
                className={`flex-shrink-0 w-12 h-12 rounded-[16px] flex items-center justify-center transition-all duration-200 ${
                  item.done
                    ? 'bg-[#7C3AED]/10 text-[#7C3AED]'
                    : 'bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] text-white shadow-clay-button group-hover:scale-105'
                }`}
              >
                {item.icon}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-bold text-base ${item.done ? 'text-[#635F69] line-through' : 'text-[#332F3A]'}`}
                    style={{ fontFamily: "'Nunito', sans-serif" }}
                  >
                    {item.label}
                  </span>
                  {item.optional && (
                    <span className="text-xs bg-[#EDE9FE] text-[#7C3AED] px-2 py-0.5 rounded-full font-medium">
                      선택
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#635F69] mt-0.5 truncate">{item.description}</p>
              </div>

              {/* Check */}
              <div className="flex-shrink-0">
                {item.done ? (
                  <CheckCircle2 className="h-6 w-6 text-[#7C3AED]" />
                ) : (
                  <Circle className="h-6 w-6 text-[#C4B5FD]" />
                )}
              </div>
            </Link>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="text-center">
          <Button
            asChild
            className="h-14 px-10 text-base font-bold rounded-[20px] bg-gradient-to-r from-[#A78BFA] to-[#7C3AED] shadow-clay-button active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200"
          >
            <Link to="/dashboard">대시보드로 이동 →</Link>
          </Button>
          <p className="text-sm text-[#635F69] mt-3">나중에 언제든지 체크리스트로 돌아올 수 있어요</p>
        </div>
      </div>
    </div>
  );
}
