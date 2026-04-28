import { useState } from 'react';
import { Link, redirect } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { Mail, Lock, Briefcase } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card';
import { auth } from '~/lib/auth.server';
import { authClient } from '~/lib/auth-client';

export const meta: MetaFunction = () => [{ title: '로그인 - poomwork' }];

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (session) return redirect('/dashboard');
  return {};
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const { error } = await authClient.signIn.email({ email, password });
  if (error) return { error: error.message || '로그인에 실패했습니다.' };
  return redirect('/dashboard');
}

export default function Login() {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const res = await fetch('/login', { method: 'POST', body: formData });
    if (res.ok) { window.location.href = '/dashboard'; }
    else { const data = await res.json(); setError(data.error || '로그인에 실패했습니다.'); }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <Briefcase className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">로그인</CardTitle>
          <CardDescription>poomwork 계정에 로그인하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">{error}</div>}
            <div className="space-y-2">
              <label className="text-sm font-medium">이메일</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input name="email" type="email" placeholder="email@example.com" className="pl-10" required />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">비밀번호</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input name="password" type="password" placeholder="••••••••" className="pl-10" required />
              </div>
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">로그인</Button>
          </form>
          <div className="mt-6 text-center text-sm">
            계정이 없으신가요?{' '}
            <Link to="/register" className="text-blue-600 hover:underline font-medium">회원가입</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}