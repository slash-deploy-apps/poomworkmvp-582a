import { Link, useLoaderData } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs } from 'react-router';
import { desc, eq } from 'drizzle-orm';
import { Clock, Users, Star, Search, GraduationCap } from 'lucide-react';
import { Card, CardContent } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { db } from '~/lib/db.server';
import { courses, user, categories } from '~/db/schema';

export const meta: MetaFunction = () => [{ title: '교육 강좌 - poomwork' }];

export async function loader({ request }: LoaderFunctionArgs) {
  const allCourses = await db.select({
    id: courses.id, title: courses.title, price: courses.price, level: courses.level,
    duration: courses.duration, rating: courses.rating, reviewCount: courses.reviewCount,
    enrollmentCount: courses.enrollmentCount, instructorName: user.name,
    thumbnailUrl: courses.thumbnailUrl,
    categoryName: categories.name,
  }).from(courses).leftJoin(user, eq(courses.instructorId, user.id))
    .leftJoin(categories, eq(courses.categoryId, categories.id))
    .where(eq(courses.status, 'published')).orderBy(desc(courses.enrollmentCount)).limit(50);
  return { courses: allCourses };
}

const levelMap: Record<string, { label: string; color: string }> = {
  beginner: { label: '초급', color: 'bg-[#EDE9FE] text-[#332F3A]' },
  intermediate: { label: '중급', color: 'bg-yellow-100 text-yellow-700' },
  advanced: { label: '고급', color: 'bg-red-100 text-red-700' },
};

const gradients = ['from-blue-400 to-indigo-500', 'from-purple-400 to-pink-500', 'from-teal-400 to-cyan-500', 'from-orange-400 to-red-500', 'from-green-400 to-emerald-500', 'from-rose-400 to-fuchsia-500'];

export default function CoursesPage() {
  const { courses: allCourses } = useLoaderData<typeof loader>();
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">교육 강좌</h1>
        <p className="text-[#635F69] mt-1">전문 툴 사용법을 체계적으로 배우세요</p>
      </div>
      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input placeholder="강좌 검색..." className="pl-10" />
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allCourses.map((c, i) => (
          <Link to={`/courses/${c.id}`} key={c.id}>
            <div className="bg-[#F4F1FA] rounded-[32px] overflow-hidden transition-all duration-200 ease-in-out hover:scale-[1.02] cursor-pointer">
              {c.thumbnailUrl ? (
                <img src={c.thumbnailUrl} alt='' className='w-full h-40 object-cover' />
              ) : (
                <div className={`h-40 bg-gradient-to-br ${gradients[i % gradients.length]} flex items-center justify-center`}>
                  <GraduationCap className='h-16 w-16 text-white/40' />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  {levelMap[c.level] && <Badge className={levelMap[c.level]!.color}>{levelMap[c.level]!.label}</Badge>}
                  {c.categoryName && <Badge className="bg-gray-100 text-[#332F3A] border-0">{c.categoryName}</Badge>}
                </div>
                <h3 className="font-bold text-lg mb-2 line-clamp-2">{c.title}</h3>
                <div className="text-sm text-[#635F69]">{c.instructorName}</div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t-2 border-gray-100">
                  <div className="flex items-center gap-3 text-sm text-[#635F69]">
                    <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />{c.rating}</span>
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{c.enrollmentCount}명</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{c.duration}</span>
                  </div>
                </div>
                <div className="mt-2 font-bold text-[#7C3AED]">
                  {c.price === 0 ? '무료' : `${new Intl.NumberFormat('ko-KR').format(c.price)}원`}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}