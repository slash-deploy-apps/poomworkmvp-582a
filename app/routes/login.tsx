import { useState } from 'react';
import { Link, redirect } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { Mail, Lock, Briefcase } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
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
    <div className='min-h-[80vh] flex items-center justify-center px-4 relative overflow-hidden'>
      <div className='absolute top-0 right-0 w-64 h-64 bg-[#8B5CF6]/10 rounded-full blur-3xl animate-clay-float' aria-hidden='true' />
      <div className='absolute bottom-0 left-0 w-48 h-48 bg-[#EC4899]/10 rounded-full blur-3xl animate-clay-float-delayed' aria-hidden='true' />
      <div className='w-full max-w-md bg-white/70 backdrop-blur-xl rounded-[32px] p-8 sm:p-10 shadow-clay-card relative z-10'>
        <div className='text-center mb-8'>
          <div className='flex justify-center mb-4'>
            <div className='bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] p-3 rounded-2xl shadow-clay-button'>
              <Briefcase className='h-6 w-6 text-white' />
            </div>
          </div>
          <h1 className='text-2xl font-extrabold text-[#332F3A]' style={{ fontFamily: "'Nunito', sans-serif" }}>로그인</h1>
          <p className='text-sm text-[#635F69] mt-1'>poomwork 계정에 로그인하세요</p>
        </div>
        <form onSubmit={handleSubmit} className='space-y-4'>
          {error && <div className='p-3 text-sm text-[#EF4444] bg-red-50/80 backdrop-blur-sm rounded-[20px]'>{error}</div>}
          <div className='space-y-2'>
            <label className='text-sm font-medium text-[#332F3A]'>이메일</label>
            <div className='relative'>
              <Mail className='absolute left-4 top-5 h-4 w-4 text-[#635F69]' />
              <Input name='email' type='email' placeholder='email@example.com' className='pl-10 h-14 rounded-2xl border-0 bg-[#EFEBF5] shadow-clay-pressed focus:bg-white focus:ring-4 focus:ring-[#7C3AED]/20' required />
            </div>
          </div>
          <div className='space-y-2'>
            <label className='text-sm font-medium text-[#332F3A]'>비밀번호</label>
            <div className='relative'>
              <Lock className='absolute left-4 top-5 h-4 w-4 text-[#635F69]' />
              <Input name='password' type='password' placeholder='••••••••' className='pl-10 h-14 rounded-2xl border-0 bg-[#EFEBF5] shadow-clay-pressed focus:bg-white focus:ring-4 focus:ring-[#7C3AED]/20' required />
            </div>
          </div>
          <Button type='submit' className='w-full h-14'>로그인</Button>
        </form>
        <div className='mt-6 text-center text-sm'>
          계정이 없으신가요?{' '}
          <Link to='/register' className='text-[#7C3AED] hover:underline font-bold'>회원가입</Link>
        </div>
      </div>
    </div>
  );
}