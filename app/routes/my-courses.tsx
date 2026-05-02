import { Link, redirect, useLoaderData, Form } from 'react-router';
import type {
  MetaFunction,
  LoaderFunctionArgs,
  ActionFunctionArgs,
} from 'react-router';
import { desc, eq, and, sql } from 'drizzle-orm';
import { Clock, Users, Star, GraduationCap, Plus } from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { db } from '~/lib/db.server';
import { courses, categories } from '~/db/schema';
import { auth } from '~/lib/auth.server';

export const meta: MetaFunction = () => [{ title: '내 강좌 - poomwork' }];

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return redirect('/login');

  const myCourses = await db
    .select({
      id: courses.id,
      title: courses.title,
      price: courses.price,
      level: courses.level,
      duration: courses.duration,
      rating: courses.rating,
      reviewCount: courses.reviewCount,
      enrollmentCount: courses.enrollmentCount,
      thumbnailUrl: courses.thumbnailUrl,
      status: courses.status,
      createdAt: courses.createdAt,
      categoryName: categories.name,
    })
    .from(courses)
    .leftJoin(categories, eq(courses.categoryId, categories.id))
    .where(eq(courses.instructorId, session.user.id))
    .orderBy(desc(courses.createdAt));

  return { courses: myCourses };
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return redirect('/login');

  const formData = await request.formData();
  const intent = formData.get('intent') as string;
  const courseId = formData.get('courseId') as string;
  if (!courseId) return { error: '강좌 ID가 없습니다' };

  // Verify ownership
  const owned = await db
    .select({ id: courses.id, status: courses.status })
    .from(courses)
    .where(
      and(eq(courses.id, courseId), eq(courses.instructorId, session.user.id)),
    )
    .limit(1);
  if (!owned[0]) return { error: '권한이 없습니다' };

  if (intent === 'publish') {
    await db
      .update(courses)
      .set({ status: 'published', updatedAt: new Date() })
      .where(eq(courses.id, courseId));
  } else if (intent === 'unpublish') {
    await db
      .update(courses)
      .set({ status: 'draft', updatedAt: new Date() })
      .where(eq(courses.id, courseId));
  } else if (intent === 'delete') {
    await db.update(courses).set({ status: 'deleted' }).where(eq(courses.id, courseId));
    await db.delete(courses).where(eq(courses.id, courseId));
  }

  return redirect('/my/courses');
}

const levelMap: Record<string, { label: string; color: string }> = {
  beginner: { label: '초급', color: 'bg-[#EDE9FE] text-[#332F3A]' },
  intermediate: { label: '중급', color: 'bg-yellow-100 text-yellow-700' },
  advanced: { label: '고급', color: 'bg-red-100 text-red-700' },
};

const statusMap: Record<string, { label: string; color: string }> = {
  draft: { label: '초안', color: 'bg-gray-200 text-gray-700' },
  published: { label: '공개', color: 'bg-green-100 text-green-700' },
};

const gradients = [
  'from-blue-400 to-indigo-500',
  'from-purple-400 to-pink-500',
  'from-teal-400 to-cyan-500',
  'from-orange-400 to-red-500',
  'from-green-400 to-emerald-500',
  'from-rose-400 to-fuchsia-500',
];

export default function MyCoursesPage() {
  const { courses: myCourses } = useLoaderData<typeof loader>();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: "'Nunito', sans-serif" }}
          >
            내 강좌
          </h1>
          <p className="text-[#635F69] mt-1">내가 만든 강좌를 관리하세요</p>
        </div>
        <Link
          to="/courses/new"
          className="inline-flex items-center gap-1 px-5 py-2.5 rounded-[20px] bg-[#7C3AED] text-white text-sm font-bold shadow-clay-button active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200"
        >
          <Plus className="h-4 w-4" />새 강좌 만들기
        </Link>
      </div>

      {myCourses.length === 0 ? (
        <div className="bg-[#F4F1FA] rounded-[32px] p-12 text-center">
          <GraduationCap className="h-16 w-16 text-[#A78BFA] mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">아직 만든 강좌가 없어요</h3>
          <p className="text-[#635F69] mb-6">
            첫 강좌를 만들어 지식을 공유해보세요
          </p>
          <Link
            to="/courses/new"
            className="inline-flex items-center gap-1 px-6 py-3 rounded-[20px] bg-[#7C3AED] text-white text-sm font-bold shadow-clay-button active:scale-[0.92] transition-all duration-200"
          >
            <Plus className="h-4 w-4" />
            강좌 만들기
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myCourses.map((c, i) => {
            const status = statusMap[c.status] ?? {
              label: c.status,
              color: 'bg-gray-100 text-gray-600',
            };
            return (
              <div
                key={c.id}
                className="bg-[#F4F1FA] rounded-[32px] overflow-hidden"
              >
                <Link to={`/courses/${c.id}`}>
                  {c.thumbnailUrl ? (
                    <img
                      src={c.thumbnailUrl}
                      alt=""
                      className="w-full h-40 object-cover"
                    />
                  ) : (
                    <div
                      className={`h-40 bg-gradient-to-br ${gradients[i % gradients.length]} flex items-center justify-center`}
                    >
                      <GraduationCap className="h-16 w-16 text-white/40" />
                    </div>
                  )}
                </Link>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge className={status.color}>{status.label}</Badge>
                    {levelMap[c.level] && (
                      <Badge className={levelMap[c.level]!.color}>
                        {levelMap[c.level]!.label}
                      </Badge>
                    )}
                    {c.categoryName && (
                      <Badge className="bg-gray-100 text-[#332F3A] border-0">
                        {c.categoryName}
                      </Badge>
                    )}
                  </div>
                  <Link to={`/courses/${c.id}`}>
                    <h3 className="font-bold text-lg mb-2 line-clamp-2 hover:text-[#7C3AED]">
                      {c.title}
                    </h3>
                  </Link>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t-2 border-gray-100">
                    <div className="flex items-center gap-3 text-sm text-[#635F69]">
                      <span className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                        {c.rating}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {c.enrollmentCount}명
                      </span>
                      {c.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {c.duration}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 font-bold text-[#7C3AED]">
                    {c.price === 0
                      ? '무료'
                      : `${new Intl.NumberFormat('ko-KR').format(c.price)}원`}
                  </div>
                  <div className="mt-4 flex gap-2 flex-wrap">
                    <Link to={`/courses/${c.id}/edit`} className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-[16px] bg-[#7C3AED] text-white text-sm font-medium hover:bg-[#5a3d95] active:scale-[0.92] transition-all duration-200 h-10">수정</Link>
                    {c.status === 'draft' ? (
                      <Form method="post" className="flex-1">
                        <input type="hidden" name="intent" value="publish" />
                        <input type="hidden" name="courseId" value={c.id} />
                        <Button
                          type="submit"
                          className="w-full bg-[#7C3AED] hover:bg-[#5a3d95] active:scale-[0.92] transition-all duration-200 h-10 rounded-[16px] text-sm font-medium"
                        >
                          공개하기
                        </Button>
                      </Form>
                    ) : (
                      <Form method="post" className="flex-1">
                        <input type="hidden" name="intent" value="unpublish" />
                        <input type="hidden" name="courseId" value={c.id} />
                        <Button
                          type="submit"
                          variant="outline"
                          className="w-full h-10 rounded-[16px] text-sm font-medium border-gray-300"
                        >
                          비공개로 전환
                        </Button>
                      </Form>
                    )}
                    <Form
                      method="post"
                      onSubmit={(e) => {
                        if (!confirm('정말 이 강좌를 삭제하시겠습니까?'))
                          e.preventDefault();
                      }}
                    >
                      <input type="hidden" name="intent" value="delete" />
                      <input type="hidden" name="courseId" value={c.id} />
                      <Button
                        type="submit"
                        variant="outline"
                        className="h-10 rounded-[16px] text-sm font-medium border-red-200 text-red-600 hover:bg-red-50"
                      >
                        삭제
                      </Button>
                    </Form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
