import { redirect } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { db } from '~/lib/db.server';
import { jobs, categories } from '~/db/schema';
import { auth } from '~/lib/auth.server';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Label } from '~/components/ui/label';

export const meta: MetaFunction = () => [{ title: '일거리 등록 - poomwork' }];

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return redirect('/login');
  if (session.user.role !== 'client') return redirect('/dashboard');
  const cats = await db.select().from(categories).orderBy(categories.sortOrder);
  return { categories: cats };
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user || session.user.role !== 'client') return redirect('/login');
  const formData = await request.formData();
  await db.insert(jobs).values({
    clientId: session.user.id,
    categoryId: Number(formData.get('categoryId')) || null,
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    budgetMin: Number(formData.get('budgetMin')) || null,
    budgetMax: Number(formData.get('budgetMax')) || null,
    budgetType: formData.get('budgetType') as string,
    duration: formData.get('duration') as string,
    urgency: formData.get('urgency') as string,
    requirements: formData.get('requirements') as string,
    location: formData.get('location') as string,
    isRemote: formData.get('isRemote') === 'on' ? 1 : 0,
  });
  return redirect('/jobs');
}

export default function JobsNew() {
  const { categories: cats } = {} as any;
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">일거리 등록</h1>
      <Card>
        <CardContent className="p-6">
          <form method="post" className="space-y-6">
            <div className="space-y-2">
              <Label>제목 *</Label>
              <Input name="title" placeholder="예: React 웹앱 개발" required />
            </div>
            <div className="space-y-2">
              <Label>카테고리</Label>
              <select name="categoryId" className="w-full rounded-md border px-3 py-2 text-sm">
                <option value="">선택하세요</option>
                {(cats || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>상세 설명 *</Label>
              <Textarea name="description" placeholder="프로젝트의 상세 내용을 적어주세요" rows={8} required />
            </div>
            <div className="space-y-2">
              <Label>예산 유형</Label>
              <div className="flex gap-4">
                {[['fixed', '고정'], ['hourly', '시간당'], ['negotiable', '협의']].map(([v, l]) => (
                  <label key={v} className="flex items-center gap-2"><input type="radio" name="budgetType" value={v} defaultChecked={v === 'negotiable'} />{l}</label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>최소 예산 (원)</Label><Input name="budgetMin" type="number" placeholder="5000000" /></div>
              <div className="space-y-2"><Label>최대 예산 (원)</Label><Input name="budgetMax" type="number" placeholder="10000000" /></div>
            </div>
            <div className="space-y-2">
              <Label>예상 기간</Label>
              <select name="duration" className="w-full rounded-md border px-3 py-2 text-sm">
                {['1주일', '2주일', '1개월', '3개월', '6개월', '협의'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>우선순위</Label>
              <div className="flex gap-4">
                {[['low', '낮음'], ['medium', '보통'], ['high', '높음']].map(([v, l]) => (
                  <label key={v} className="flex items-center gap-2"><input type="radio" name="urgency" value={v} defaultChecked={v === 'medium'} />{l}</label>
                ))}
              </div>
            </div>
            <div className="space-y-2"><Label>요구 역량</Label><Input name="requirements" placeholder="React, TypeScript, Node.js" /></div>
            <div className="space-y-2"><Label>근무지</Label><Input name="location" placeholder="서울" /></div>
            <label className="flex items-center gap-2"><input type="checkbox" name="isRemote" defaultChecked />원격 근무 가능</label>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">등록하기</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}