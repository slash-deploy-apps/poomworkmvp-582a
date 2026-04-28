import { Link } from 'react-router';
import type { MetaFunction } from 'react-router';
import { Code, Palette, Megaphone, Video, Languages, GraduationCap, Lightbulb, MoreHorizontal, ArrowRight, Users, FolderOpen, BookOpen, Star } from 'lucide-react';
import { Button } from '~/components/ui/button';

export const meta: MetaFunction = () => [{ title: 'poomwork - 전문 인력과 일거리를 연결하는 플랫폼' }];

const categories = [
  { name: 'IT·개발', icon: Code, color: 'bg-[#6750A4]' },
  { name: '디자인', icon: Palette, color: 'bg-[#7D5260]' },
  { name: '마케팅', icon: Megaphone, color: 'bg-purple-400' },
  { name: '영상·사진', icon: Video, color: 'bg-rose-500' },
  { name: '번역·통역', icon: Languages, color: 'bg-[#6750A4]/50' },
  { name: '교육', icon: GraduationCap, color: 'bg-[#7D5260]/50' },
  { name: '컨설팅', icon: Lightbulb, color: 'bg-[#E8DEF8] text-[#1D192B]' },
  { name: '기타', icon: MoreHorizontal, color: 'bg-[#49454F]' },
];

const sampleCourses = [
  { title: 'React 완벽 가이드', level: '초급', price: '49,000원', students: '1,234명' },
  { title: 'Figma 마스터 클래스', level: '중급', price: '59,000원', students: '856명' },
  { title: '디지털 마케팅 입문', level: '초급', price: '무료', students: '2,341명' },
];

export default function Index() {
  return (
    <div className='min-h-screen bg-[#FFFBFE]'>
      {/* Hero with organic blur shapes */}
      <section className='relative bg-[#F3EDF7] py-24 md:py-36 overflow-hidden rounded-b-[48px]'>
        <div className='absolute top-0 right-0 w-96 h-96 bg-purple-200 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4' aria-hidden='true' />
        <div className='absolute bottom-0 left-0 w-80 h-80 bg-[#E8DEF8]/40 rounded-full blur-3xl translate-y-1/4 -translate-x-1/4' aria-hidden='true' />
        <div className='absolute top-1/2 left-1/2 w-64 h-64 bg-[#7D5260]/15 rounded-full blur-3xl' aria-hidden='true' />
        <div className='container mx-auto px-4 text-center relative z-10'>
          <h1 className='text-5xl md:text-7xl font-bold mb-6 leading-tight text-[#1C1B1F]'>
            전문 인력과 일거리를<br />연결하는 플랫폼
          </h1>
          <p className='text-lg md:text-xl text-[#49454F] mb-12 max-w-2xl mx-auto font-medium'>
            품웍에서 전문가를 찾거나, 새로운 기회를 발견하세요
          </p>
          <div className='flex flex-col sm:flex-row gap-4 justify-center'>
            <Button size='lg' asChild className='rounded-full bg-[#6750A4] text-white hover:bg-purple-800 active:scale-95 shadow-sm hover:shadow-md font-medium text-base px-8 h-12 transition-all duration-300 ease-in-out'>
              <Link to='/jobs'>
                일거리 찾기 <ArrowRight className='ml-2 h-5 w-5' />
              </Link>
            </Button>
            <Button size='lg' asChild className='rounded-full bg-[#E8DEF8] text-[#1D192B] hover:bg-[#E8DEF8]/80 active:scale-95 font-medium text-base px-8 h-12 transition-all duration-300 ease-in-out'>
              <Link to='/register'>인력 등록하기</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className='py-20 bg-[#FFFBFE]'>
        <div className='container mx-auto px-4'>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-6'>
            {[
              { value: '1,000+', label: '등록 인력', icon: Users, color: 'text-[#6750A4]' },
              { value: '500+', label: '진행 프로젝트', icon: FolderOpen, color: 'text-[#7D5260]' },
              { value: '50+', label: '교육 강좌', icon: BookOpen, color: 'text-[#6750A4]' },
              { value: '98%', label: '만족도', icon: Star, color: 'text-[#7D5260]' },
            ].map((metric) => (
              <div key={metric.label} className='text-center group'>
                <div className='bg-[#F3EDF7] rounded-3xl p-6 shadow-sm group-hover:shadow-md transition-all duration-300 ease-in-out'>
                  <metric.icon className={`h-10 w-10 ${metric.color} mx-auto mb-4`} />
                  <div className={`text-4xl font-bold ${metric.color}`}>{metric.value}</div>
                  <div className='text-sm text-[#49454F] mt-2 font-medium'>{metric.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className='py-20 bg-[#F3EDF7]'>
        <div className='container mx-auto px-4'>
          <h2 className='text-4xl font-bold text-center mb-14 text-[#1C1B1F]'>카테고리별로 찾아보세요</h2>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-5'>
            {categories.map((cat) => (
              <Link to={`/jobs?category=${cat.name}`} key={cat.name} className='group'>
                <div className='bg-[#FFFBFE] rounded-3xl p-8 text-center shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 ease-in-out'>
                  <div className={`${cat.color} w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-transform duration-300 group-hover:scale-110`}>
                    <cat.icon className='h-7 w-7 text-white' />
                  </div>
                  <div className='font-bold text-[#1C1B1F]'>{cat.name}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className='py-20 bg-[#FFFBFE] relative overflow-hidden'>
        <div className='absolute top-20 right-0 w-72 h-72 bg-purple-50 rounded-full blur-3xl' aria-hidden='true' />
        <div className='container mx-auto px-4 relative z-10'>
          <h2 className='text-4xl font-bold text-center mb-14 text-[#1C1B1F]'>이용 방법</h2>
          <div className='grid md:grid-cols-3 gap-10 max-w-4xl mx-auto'>
            {[
              { step: '1', title: '일거리 등록', desc: '필요한 프로젝트의 상세 내용을 등록하세요', color: 'bg-[#6750A4]' },
              { step: '2', title: '전문가 매칭', desc: '조건에 맞는 전문 인력을 찾아드립니다', color: 'bg-[#7D5260]' },
              { step: '3', title: '프로젝트 시작', desc: '안전한 에스크로 결제로 프로젝트를 시작하세요', color: 'bg-purple-400' },
            ].map((item) => (
              <div key={item.step} className='text-center group'>
                <div className='relative'>
                  <div className={`w-20 h-20 ${item.color} rounded-full flex items-center justify-center mx-auto mb-6 shadow-md group-hover:shadow-lg transition-all duration-300`}>
                    <span className='text-3xl font-bold text-white'>{item.step}</span>
                  </div>
                  <div className={`absolute inset-0 w-20 h-20 ${item.color} rounded-full blur-xl mx-auto opacity-0 group-hover:opacity-30 transition-opacity duration-300`} aria-hidden='true' />
                </div>
                <h3 className='text-xl font-bold mb-3 text-[#1C1B1F]'>{item.title}</h3>
                <p className='text-[#49454F] leading-relaxed'>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Education Preview */}
      <section className='py-20 bg-[#6750A4] relative overflow-hidden rounded-t-[48px]'>
        <div className='absolute top-0 right-0 w-80 h-80 bg-[#E8DEF8]/20 rounded-full blur-3xl' aria-hidden='true' />
        <div className='absolute bottom-0 left-0 w-64 h-64 bg-rose-200 rounded-full blur-3xl' aria-hidden='true' />
        <div className='container mx-auto px-4 relative z-10'>
          <div className='flex items-center justify-between mb-14'>
            <h2 className='text-4xl font-bold text-white'>전문 툴 교육 강좌</h2>
            <Button asChild className='rounded-full bg-white/10 border border-white/20 text-white hover:bg-white hover:text-[#6750A4] font-medium h-12 transition-all duration-300 ease-in-out'>
              <Link to='/courses'>전체 강좌 보기 <ArrowRight className='ml-2 h-4 w-4' /></Link>
            </Button>
          </div>
          <div className='grid md:grid-cols-3 gap-6'>
            {sampleCourses.map((course) => (
              <div key={course.title} className='bg-white/10 backdrop-blur-sm border border-white/10 rounded-3xl p-6 transition-all duration-300 hover:scale-[1.02] hover:bg-white/15 hover:shadow-md'>
                <div className='flex items-center justify-center h-32 mb-4'>
                  <GraduationCap className='h-16 w-16 text-white/30' />
                </div>
                <h3 className='font-bold text-lg mb-2 text-white'>{course.title}</h3>
                <div className='flex items-center justify-between'>
                  <span className='text-sm text-purple-100'>{course.level} · {course.students}</span>
                  <span className='font-bold text-white'>{course.price}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className='py-24 bg-[#F3EDF7] relative overflow-hidden'>
        <div className='absolute top-0 left-1/4 w-72 h-72 bg-purple-50 rounded-full blur-3xl' aria-hidden='true' />
        <div className='absolute bottom-0 right-1/4 w-64 h-64 bg-rose-100 rounded-full blur-3xl' aria-hidden='true' />
        <div className='container mx-auto px-4 text-center relative z-10'>
          <h2 className='text-4xl md:text-5xl font-bold text-[#1C1B1F] mb-6'>지금 시작하세요</h2>
          <p className='text-[#49454F] text-lg mb-10 max-w-2xl mx-auto font-medium'>
            전문가를 찾고 계신가요? 새로운 기회를 찾고 계신가요?
          </p>
          <Button size='lg' asChild className='rounded-full bg-[#6750A4] text-white hover:bg-purple-800 active:scale-95 shadow-md hover:shadow-lg font-bold px-10 h-14 transition-all duration-300 ease-in-out'>
            <Link to='/register'>무료로 시작하기</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}