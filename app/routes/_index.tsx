import { Link } from 'react-router';
import type { MetaFunction } from 'react-router';
import { Code, Palette, Megaphone, Video, Languages, GraduationCap, Lightbulb, MoreHorizontal, ArrowRight, Users, FolderOpen, BookOpen, Star, Search, Shield, CheckCircle } from 'lucide-react';
import { Button } from '~/components/ui/button';

export const meta: MetaFunction = () => [{ title: 'poomwork - 전문 인력과 일거리를 연결하는 플랫폼' }];

const categories = [
  { name: 'IT·개발', icon: Code, gradient: 'from-blue-400 to-blue-600' },
  { name: '디자인', icon: Palette, gradient: 'from-pink-400 to-pink-600' },
  { name: '마케팅', icon: Megaphone, gradient: 'from-purple-400 to-purple-600' },
  { name: '영상·사진', icon: Video, gradient: 'from-rose-400 to-rose-600' },
  { name: '번역·통역', icon: Languages, gradient: 'from-cyan-400 to-cyan-600' },
  { name: '교육', icon: GraduationCap, gradient: 'from-emerald-400 to-emerald-600' },
  { name: '컨설팅', icon: Lightbulb, gradient: 'from-amber-400 to-amber-600' },
  { name: '기타', icon: MoreHorizontal, gradient: 'from-slate-400 to-slate-600' },
];

const sampleCourses = [
  { title: 'React 완벽 가이드', level: '초급', price: '49,000원', students: '1,234명' },
  { title: 'Figma 마스터 클래스', level: '중급', price: '59,000원', students: '856명' },
  { title: '디지털 마케팅 입문', level: '초급', price: '무료', students: '2,341명' },
];

export default function Index() {
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get('search') as string;
    if (query.trim()) {
      window.location.href = `/jobs?search=${encodeURIComponent(query.trim())}`;
    }
  };
  return (
    <div className='min-h-screen'>
      {/* Hero */}
      <section className='relative bg-[#EDE9FE] py-24 md:py-36 overflow-hidden rounded-b-[48px] sm:rounded-b-[60px]'>
        <div className='absolute top-0 right-0 w-96 h-96 bg-[#8B5CF6]/15 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4 animate-clay-float' aria-hidden='true' />
        <div className='absolute bottom-0 left-0 w-80 h-80 bg-[#EC4899]/10 rounded-full blur-3xl translate-y-1/4 -translate-x-1/4 animate-clay-float-delayed animation-delay-2000' aria-hidden='true' />
        <div className='absolute top-1/2 left-1/2 w-64 h-64 bg-[#0EA5E9]/10 rounded-full blur-3xl animate-clay-float-slow animation-delay-4000' aria-hidden='true' />
        <div className='container mx-auto px-4 text-center relative z-10'>
          <div className='inline-flex items-center gap-2 bg-white/60 backdrop-blur-xl rounded-full px-5 py-2.5 mb-8 shadow-clay-card animate-[fadeIn_0.5s_ease-out]'>
            <span className='text-sm font-medium text-[#7C3AED]'>✨ 새로운 방식으로 전문가를 만나보세요</span>
          </div>
          <h1 className='text-5xl md:text-7xl lg:text-8xl font-black mb-6 leading-[1.1] text-[#332F3A] animate-[fadeIn_0.6s_ease-out]' style={{ fontFamily: "'Nunito', sans-serif" }}>
            전문 인력과 일거리를<br />
            <span className='clay-text-gradient'>연결하는 플랫폼</span>
          </h1>
          <p className='text-lg md:text-xl text-[#635F69] mb-8 max-w-2xl mx-auto font-medium leading-relaxed animate-[fadeIn_0.7s_ease-out]'>
            품웍에서 전문가를 찾거나, 새로운 기회를 발견하세요
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className='max-w-xl mx-auto mb-8 animate-[fadeIn_0.8s_ease-out]'>
            <div className='relative'>
              <div className='flex items-center bg-white/80 backdrop-blur-xl rounded-[20px] shadow-clay-card overflow-hidden'>
                <Search className='h-5 w-5 text-[#635F69] ml-5' />
                <input
                  name='search'
                  type='text'
                  placeholder='어떤 일거리를 찾고 계신가요?'
                  className='flex-1 h-14 px-4 bg-transparent text-[#332F3A] placeholder:text-[#635F69] outline-none text-base'
                />
                <button
                  type='submit'
                  className='h-11 px-6 mr-2 bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] text-white rounded-2xl font-bold text-sm shadow-clay-button hover:-translate-y-0.5 hover:shadow-clay-button-hover active:scale-[0.92] active:shadow-clay-pressed transition-all duration-200'
                >
                  검색
                </button>
              </div>
            </div>
          </form>

          {/* Trust Badges */}
          <div className='flex flex-wrap items-center justify-center gap-6 mb-10 text-sm text-[#635F69] animate-[fadeIn_0.9s_ease-out]'>
            <div className='flex items-center gap-1.5'>
              <Shield className='h-4 w-4 text-[#7C3AED]' />
              <span>에스크로 결제</span>
            </div>
            <div className='flex items-center gap-1.5'>
              <CheckCircle className='h-4 w-4 text-[#7C3AED]' />
              <span>무료 가입</span>
            </div>
            <div className='flex items-center gap-1.5'>
              <Users className='h-4 w-4 text-[#7C3AED]' />
              <span>1,000+ 전문가</span>
            </div>
          </div>

          <div className='flex flex-col sm:flex-row gap-4 justify-center animate-[fadeIn_1s_ease-out]'>
            <Button size='lg' asChild>
              <Link to='/jobs'>
                일거리 찾기 <ArrowRight className='ml-2 h-5 w-5' />
              </Link>
            </Button>
            <Button size='lg' variant='secondary' asChild>
              <Link to='/register'>인력 등록하기</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className='py-20'>
        <div className='container mx-auto px-4'>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-6'>
            {[
              { value: '1,000+', label: '등록 인력', icon: Users, gradient: 'from-purple-400 to-purple-600', textColor: 'text-[#7C3AED]' },
              { value: '500+', label: '진행 프로젝트', icon: FolderOpen, gradient: 'from-pink-400 to-pink-600', textColor: 'text-[#DB2777]' },
              { value: '50+', label: '교육 강좌', icon: BookOpen, gradient: 'from-sky-400 to-sky-600', textColor: 'text-[#0EA5E9]' },
              { value: '98%', label: '만족도', icon: Star, gradient: 'from-amber-400 to-amber-600', textColor: 'text-[#F59E0B]' },
            ].map((metric) => (
              <div key={metric.label} className='text-center group'>
                <div className='bg-white/70 backdrop-blur-xl rounded-[32px] p-6 shadow-clay-card hover:-translate-y-2 hover:shadow-clay-card-hover transition-all duration-500'>
                  <div className={`bg-gradient-to-br ${metric.gradient} w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                    <metric.icon className='h-6 w-6 text-white' />
                  </div>
                  <div className={`text-4xl font-black ${metric.textColor}`} style={{ fontFamily: "'Nunito', sans-serif" }}>{metric.value}</div>
                  <div className='text-sm text-[#635F69] mt-2 font-medium'>{metric.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className='py-20 bg-[#EDE9FE]/50'>
        <div className='container mx-auto px-4'>
          <h2 className='text-3xl sm:text-4xl font-extrabold text-center mb-14 text-[#332F3A]' style={{ fontFamily: "'Nunito', sans-serif" }}>카테고리별로 찾아보세요</h2>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-5'>
            {categories.map((cat) => (
              <Link to={`/jobs?category=${cat.name}`} key={cat.name} className='group'>
                <div className='bg-white/70 backdrop-blur-xl rounded-[32px] p-8 text-center shadow-clay-card hover:-translate-y-2 hover:shadow-clay-card-hover transition-all duration-500'>
                  <div className={`bg-gradient-to-br ${cat.gradient} w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-transform duration-300 group-hover:scale-110`}>
                    <cat.icon className='h-7 w-7 text-white' />
                  </div>
                  <div className='font-bold text-[#332F3A]'>{cat.name}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className='py-20 relative overflow-hidden'>
        <div className='absolute top-20 right-0 w-72 h-72 bg-[#8B5CF6]/10 rounded-full blur-3xl animate-clay-float' aria-hidden='true' />
        <div className='container mx-auto px-4 relative z-10'>
          <h2 className='text-3xl sm:text-4xl font-extrabold text-center mb-14 text-[#332F3A]' style={{ fontFamily: "'Nunito', sans-serif" }}>이용 방법</h2>
          <div className='grid md:grid-cols-3 gap-10 max-w-4xl mx-auto'>
            {[
              { step: '1', title: '일거리 등록', desc: '필요한 프로젝트의 상세 내용을 등록하세요' },
              { step: '2', title: '전문가 매칭', desc: '조건에 맞는 전문 인력을 찾아드립니다' },
              { step: '3', title: '프로젝트 시작', desc: '안전한 에스크로 결제로 프로젝트를 시작하세요' },
            ].map((item) => (
              <div key={item.step} className='text-center group'>
                <div className='relative'>
                  <div className='w-20 h-20 bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] rounded-full flex items-center justify-center mx-auto mb-6 shadow-clay-button animate-clay-breathe'>
                    <span className='text-3xl font-black text-white' style={{ fontFamily: "'Nunito', sans-serif" }}>{item.step}</span>
                  </div>
                  <div className='absolute inset-0 w-20 h-20 bg-[#7C3AED] rounded-full blur-xl mx-auto opacity-20' aria-hidden='true' />
                </div>
                <h3 className='text-xl font-bold mb-3 text-[#332F3A]' style={{ fontFamily: "'Nunito', sans-serif" }}>{item.title}</h3>
                <p className='text-[#635F69] leading-relaxed'>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Education Preview */}
      <section className='py-20 bg-gradient-to-br from-[#7C3AED] to-[#DB2777] relative overflow-hidden rounded-t-[48px] sm:rounded-t-[60px]'>
        <div className='absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-clay-float' aria-hidden='true' />
        <div className='absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-clay-float-delayed' aria-hidden='true' />
        <div className='container mx-auto px-4 relative z-10'>
          <div className='flex items-center justify-between mb-14'>
            <h2 className='text-3xl sm:text-4xl font-extrabold text-white' style={{ fontFamily: "'Nunito', sans-serif" }}>전문 툴 교육 강좌</h2>
            <Button asChild className='rounded-[20px] bg-white/10 border border-white/20 text-white hover:bg-white hover:text-[#7C3AED] font-bold h-12 transition-all duration-200'>
              <Link to='/courses'>전체 강좌 보기 <ArrowRight className='ml-2 h-4 w-4' /></Link>
            </Button>
          </div>
          <div className='grid md:grid-cols-3 gap-6'>
            {sampleCourses.map((course) => (
              <div key={course.title} className='bg-white/10 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 transition-all duration-500 hover:-translate-y-2 hover:bg-white/15 hover:shadow-clay-card-hover'>
                <div className='flex items-center justify-center h-32 mb-4'>
                  <GraduationCap className='h-16 w-16 text-white/30' />
                </div>
                <h3 className='font-bold text-lg mb-2 text-white' style={{ fontFamily: "'Nunito', sans-serif" }}>{course.title}</h3>
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
      <section className='py-24 bg-[#EDE9FE]/50 relative overflow-hidden'>
        <div className='absolute top-0 left-1/4 w-72 h-72 bg-[#8B5CF6]/10 rounded-full blur-3xl animate-clay-float' aria-hidden='true' />
        <div className='absolute bottom-0 right-1/4 w-64 h-64 bg-[#EC4899]/10 rounded-full blur-3xl animate-clay-float-delayed' aria-hidden='true' />
        <div className='container mx-auto px-4 text-center relative z-10'>
          <h2 className='text-4xl md:text-5xl font-extrabold text-[#332F3A] mb-6' style={{ fontFamily: "'Nunito', sans-serif" }}>지금 시작하세요</h2>
          <p className='text-[#635F69] text-lg mb-10 max-w-2xl mx-auto font-medium leading-relaxed'>
            전문가를 찾고 계신가요? 새로운 기회를 찾고 계신가요?
          </p>
          <Button size='lg' asChild>
            <Link to='/register'>무료로 시작하기</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}