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
    <div className='min-h-[80vh] flex items-center justify-center bg-[#FFFBFE] px-4 relative overflow-hidden'>
      <div className='absolute top-0 right-0 w-64 h-64 bg-purple-50 rounded-full blur-3xl' aria-hidden='true' />
      <div className='w-full max-w-md bg-[#F3EDF7] rounded-3xl p-8 shadow-sm relative z-10'>
        <div className='text-center mb-8'>
          <div className='flex justify-center mb-4'>
            <div className='bg-[#6750A4] p-3 rounded-full shadow-sm'>
              <Briefcase className='h-6 w-6 text-white' />
            </div>
          </div>
          <h1 className='text-2xl font-bold text-[#1C1B1F]'>로그인</h1>
          <p className='text-sm text-[#49454F] mt-1'>poomwork 계정에 로그인하세요</p>
        </div>
        <form onSubmit={handleSubmit} className='space-y-4'>
          {error && <div className='p-3 text-sm text-[#B3261E] bg-red-50 rounded-2xl'>{error}</div>}
          <div className='space-y-2'>
            <label className='text-sm font-medium text-[#1C1B1F]'>이메일</label>
            <div className='relative'>
              <Mail className='absolute left-3 top-4 h-4 w-4 text-gray-400' />
              <Input name='email' type='email' placeholder='email@example.com' className='pl-10 bg-[#E7E0EC] rounded-t-xl border-0 border-b-2 border-gray-400 h-14 focus:border-purple-700' required />
            </div>
          </div>
          <div className='space-y-2'>
            <label className='text-sm font-medium text-[#1C1B1F]'>비밀번호</label>
            <div className='relative'>
              <Lock className='absolute left-3 top-4 h-4 w-4 text-gray-400' />
              <Input name='password' type='password' placeholder='••••••••' className='pl-10 bg-[#E7E0EC] rounded-t-xl border-0 border-b-2 border-gray-400 h-14 focus:border-purple-700' required />
            </div>
          </div>
          <Button type='submit' className='w-full rounded-full bg-[#6750A4] text-white hover:bg-purple-800 active:scale-95 shadow-sm hover:shadow-md h-12 font-medium transition-all duration-300 ease-in-out'>로그인</Button>
        </form>
        <div className='mt-6 text-center text-sm'>
          계정이 없으신가요?{' '}
          <Link to='/register' className='text-[#6750A4] hover:underline font-medium'>회원가입</Link>
        </div>
      </div>
    </div>
  );
}