import { useState } from 'react';
import { Link, redirect } from 'react-router';
import type { MetaFunction, LoaderFunctionArgs } from 'react-router';
import { User, Building2, Mail, Lock } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { auth } from '~/lib/auth.server';
import { authClient } from '~/lib/auth-client';

export const meta: MetaFunction = () => [{ title: '회원가입 - poomwork' }];

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (session) return redirect('/dashboard');
  return {};
}

export default function Register() {
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<'worker' | 'client'>('worker');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    };
    const { error: signUpError } = await authClient.signUp.email({ ...data, name: data.name, role });
    setLoading(false);
    if (signUpError) { setError(signUpError.message || '회원가입에 실패했습니다.'); return; }
    window.location.href = '/dashboard';
  };

  return (
    <div className='min-h-[80vh] flex items-center justify-center bg-[#FFFBFE] px-4 py-12 relative overflow-hidden'>
      <div className='absolute bottom-0 left-0 w-72 h-72 bg-purple-200 rounded-full blur-3xl' aria-hidden='true' />
      <div className='w-full max-w-md bg-[#F3EDF7] rounded-3xl p-8 shadow-sm relative z-10'>
        <div className='text-center mb-8'>
          <h1 className='text-2xl font-bold text-[#1C1B1F]'>회원가입</h1>
          <p className='text-sm text-[#49454F] mt-1'>poomwork에 가입하세요</p>
        </div>
        {step === 0 ? (
          <div className='space-y-4'>
            <p className='text-center text-sm text-[#49454F] mb-6'>어떤 역할로 가입하시겠습니까?</p>
            <div className='grid grid-cols-2 gap-4'>
              <button
                type='button'
                onClick={() => { setRole('worker'); setStep(1); }}
                className={`p-6 rounded-3xl border-0 text-center transition-all duration-300 ease-in-out hover:scale-[1.02] shadow-sm hover:shadow-md cursor-pointer ${role === 'worker' ? 'bg-[#6750A4] text-white ring-2 ring-purple-300' : 'bg-[#E8DEF8] text-[#1D192B]'}`}
              >
                <User className={`h-10 w-10 mx-auto mb-3 ${role === 'worker' ? 'text-white' : 'text-[#6750A4]'}`} />
                <div className='font-semibold'>인력 제공자</div>
                <div className={`text-xs mt-1 ${role === 'worker' ? 'text-purple-100' : 'text-[#49454F]'}`}>전문가로 활동</div>
              </button>
              <button
                type='button'
                onClick={() => { setRole('client'); setStep(1); }}
                className={`p-6 rounded-3xl border-0 text-center transition-all duration-300 ease-in-out hover:scale-[1.02] shadow-sm hover:shadow-md cursor-pointer ${role === 'client' ? 'bg-[#6750A4] text-white ring-2 ring-purple-300' : 'bg-[#E8DEF8] text-[#1D192B]'}`}
              >
                <Building2 className={`h-10 w-10 mx-auto mb-3 ${role === 'client' ? 'text-white' : 'text-[#6750A4]'}`} />
                <div className='font-semibold'>일거리 제공자</div>
                <div className={`text-xs mt-1 ${role === 'client' ? 'text-purple-100' : 'text-[#49454F]'}`}>프로젝트 의뢰</div>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className='space-y-4'>
            <button type='button' onClick={() => setStep(0)} className='text-sm text-[#6750A4] hover:underline mb-2 rounded-full hover:bg-purple-50 px-2 transition-all duration-300'>← 역할 다시 선택</button>
            <div className='p-3 bg-[#E8DEF8] rounded-full text-sm text-[#1D192B] mb-4 text-center font-medium'>
              {role === 'worker' ? '인력 제공자' : '일거리 제공자'}로 가입
            </div>
            {error && <div className='p-3 text-sm text-[#B3261E] bg-red-50 rounded-2xl'>{error}</div>}
            <div className='space-y-2'>
              <label className='text-sm font-medium text-[#1C1B1F]'>이름</label>
              <Input name='name' placeholder='홍길동' required className='bg-[#E7E0EC] rounded-t-xl border-0 border-b-2 border-gray-400 h-14 focus:border-purple-700' />
            </div>
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
                <Input name='password' type='password' placeholder='8자 이상' className='pl-10 bg-[#E7E0EC] rounded-t-xl border-0 border-b-2 border-gray-400 h-14 focus:border-purple-700' minLength={8} required />
              </div>
            </div>
            <Button type='submit' className='w-full rounded-full bg-[#6750A4] text-white hover:bg-purple-800 active:scale-95 shadow-sm hover:shadow-md h-12 font-medium transition-all duration-300 ease-in-out' disabled={loading}>
              {loading ? '가입 중...' : '회원가입'}
            </Button>
          </form>
        )}
        <div className='mt-6 text-center text-sm'>
          이미 계정이 있으신가요?{' '}
          <Link to='/login' className='text-[#6750A4] hover:underline font-medium'>로그인</Link>
        </div>
      </div>
    </div>
  );
}