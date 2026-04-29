import { Link } from 'react-router';
import { Briefcase } from 'lucide-react';

export function Footer() {
  return (
    <footer className='bg-[#332F3A] text-[#A89FB8] relative overflow-hidden rounded-t-[48px]'>
      {/* Decorative blur shape */}
      <div className='absolute top-0 right-0 w-64 h-64 bg-[#7C3AED]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4' aria-hidden='true' />
      <div className='container mx-auto px-4 py-12 relative z-10'>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-8'>
          <div>
            <div className='flex items-center gap-2 mb-4'>
              <Briefcase className='h-6 w-6 text-[#A78BFA]' />
              <span className='text-lg font-black text-white' style={{ fontFamily: "'Nunito', sans-serif" }}>poomwork</span>
            </div>
            <p className='text-sm text-[#A89FB8]'>
              전문 인력과 일거리를 연결하고,<br />
              실무 교육을 제공하는 플랫폼
            </p>
          </div>
          <div>
            <h3 className='font-bold text-white mb-4'>서비스</h3>
            <ul className='space-y-2 text-sm'>
              <li><Link to='/jobs' className='hover:text-white transition-all duration-300 rounded-full px-2 py-1 -mx-2'>일거리 찾기</Link></li>
              <li><Link to='/workers' className='hover:text-white transition-all duration-300 rounded-full px-2 py-1 -mx-2'>인력 찾기</Link></li>
              <li><Link to='/courses' className='hover:text-white transition-all duration-300 rounded-full px-2 py-1 -mx-2'>교육 강좌</Link></li>
            </ul>
          </div>
          <div>
            <h3 className='font-bold text-white mb-4'>고객지원</h3>
            <ul className='space-y-2 text-sm'>
              <li><span className='hover:text-white transition-all duration-300 cursor-pointer rounded-full px-2 py-1 -mx-2'>이용약관</span></li>
              <li><span className='hover:text-white transition-all duration-300 cursor-pointer rounded-full px-2 py-1 -mx-2'>개인정보처리방침</span></li>
              <li><span className='hover:text-white transition-all duration-300 cursor-pointer rounded-full px-2 py-1 -mx-2'>자주 묻는 질문</span></li>
            </ul>
          </div>
          <div>
            <h3 className='font-bold text-white mb-4'>연락처</h3>
            <ul className='space-y-2 text-sm'>
              <li>이메일: help@poomwork.com</li>
              <li>전화: 02-1234-5678</li>
              <li>운영시간: 평일 9시~18시</li>
            </ul>
          </div>
        </div>
        <div className='mt-8 pt-8 text-center text-sm text-[#A89FB8]'>
          © 2026 poomwork. All rights reserved.
        </div>
      </div>
    </footer>
  );
}