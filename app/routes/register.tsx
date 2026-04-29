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
    const { error: signUpError } = await (authClient.signUp.email as any)({ ...data, name: data.name, role });
    setLoading(false);
    if (signUpError) { setError(signUpError.message || '회원가입에 실패했습니다.'); return; }
    window.location.href = '/dashboard';
  };

  return (
    <div className='min-h-[80vh] flex items-center justify-center px-4 py-12 relative overflow-hidden'>
      <div className='absolute bottom-0 left-0 w-72 h-72 bg-[#8B5CF6]/10 rounded-full blur-3xl animate-clay-float' aria-hidden='true' />
      <div className='absolute top-0 right-0 w-48 h-48 bg-[#EC4899]/10 rounded-full blur-3xl animate-clay-float-delayed' aria-hidden='true' />
      <div className='w-full max-w-md bg-white/70 backdrop-blur-xl rounded-[32px] p-8 sm:p-10 shadow-clay-card relative z-10'>
        <div className='text-center mb-8'>
          <h1 className='text-2xl font-extrabold text-[#332F3A]' style={{ fontFamily: "'Nunito', sans-serif" }}>회원가입</h1>
          <p className='text-sm text-[#635F69] mt-1'>poomwork에 가입하세요</p>
        </div>
        {step === 0 ? (
          <div className='space-y-4'>
            <p className='text-center text-sm text-[#635F69] mb-6'>어떤 역할로 가입하시겠습니까?</p>
            <div className='grid grid-cols-2 gap-4'>
              <button
                type='button'
                onClick={() => { setRole('worker'); setStep(1); }}
                className={`p-6 rounded-[24px] border-0 text-center transition-all duration-200 cursor-pointer active:scale-[0.92] ${role === 'worker' ? 'bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] text-white shadow-clay-button' : 'bg-white/80 text-[#332F3A] shadow-clay-card hover:-translate-y-1 hover:shadow-clay-card-hover'}`}
              >
                <User className={`h-10 w-10 mx-auto mb-3 ${role === 'worker' ? 'text-white' : 'text-[#7C3AED]'}`} />
                <div className='font-bold'>인력 제공자</div>
                <div className={`text-xs mt-1 ${role === 'worker' ? 'text-purple-100' : 'text-[#635F69]'}`}>전문가로 활동</div>
              </button>
              <button
                type='button'
                onClick={() => { setRole('client'); setStep(1); }}
                className={`p-6 rounded-[24px] border-0 text-center transition-all duration-200 cursor-pointer active:scale-[0.92] ${role === 'client' ? 'bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] text-white shadow-clay-button' : 'bg-white/80 text-[#332F3A] shadow-clay-card hover:-translate-y-1 hover:shadow-clay-card-hover'}`}
              >
                <Building2 className={`h-10 w-10 mx-auto mb-3 ${role === 'client' ? 'text-white' : 'text-[#7C3AED]'}`} />
                <div className='font-bold'>일거리 제공자</div>
                <div className={`text-xs mt-1 ${role === 'client' ? 'text-purple-100' : 'text-[#635F69]'}`}>프로젝트 의뢰</div>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className='space-y-4'>
            <button type='button' onClick={() => setStep(0)} className='text-sm text-[#7C3AED] hover:underline mb-2 rounded-[20px] hover:bg-[#7C3AED]/10 px-3 py-1 transition-all duration-200'>← 역할 다시 선택</button>
            <div className='p-3 bg-[#EDE9FE] rounded-[20px] text-sm text-[#332F3A] mb-4 text-center font-bold'>
              {role === 'worker' ? '인력 제공자' : '일거리 제공자'}로 가입
            </div>
            {error && <div className='p-3 text-sm text-[#EF4444] bg-red-50/80 backdrop-blur-sm rounded-[20px]'>{error}</div>}
            <div className='space-y-2'>
              <label className='text-sm font-medium text-[#332F3A]'>이름</label>
              <Input name='name' placeholder='홍길동' required className='h-14 rounded-2xl border-0 bg-[#EFEBF5] shadow-clay-pressed focus:bg-white focus:ring-4 focus:ring-[#7C3AED]/20' />
            </div>
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
                <Input name='password' type='password' placeholder='8자 이상' className='pl-10 h-14 rounded-2xl border-0 bg-[#EFEBF5] shadow-clay-pressed focus:bg-white focus:ring-4 focus:ring-[#7C3AED]/20' minLength={8} required />
              </div>
            </div>
            <Button type='submit' className='w-full h-14' disabled={loading}>
              {loading ? '가입 중...' : '회원가입'}
            </Button>
          </form>
        )}
        <div className='mt-6 text-center text-sm'>
          이미 계정이 있으신가요?{' '}
          <Link to='/login' className='text-[#7C3AED] hover:underline font-bold'>로그인</Link>
        </div>
      </div>
    </div>
  );
}