import { Link } from 'react-router';
import type { MetaFunction } from 'react-router';
import { Briefcase, Code, Palette, Megaphone, Video, Languages, GraduationCap, Lightbulb, MoreHorizontal, ArrowRight, Users, FolderOpen, BookOpen, Star } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';

export const meta: MetaFunction = () => [{ title: 'poomwork - 전문 인력과 일거리를 연결하는 플랫폼' }];

const categories = [
  { name: 'IT·개발', icon: Code, color: 'bg-blue-500' },
  { name: '디자인', icon: Palette, color: 'bg-purple-500' },
  { name: '마케팅', icon: Megaphone, color: 'bg-orange-500' },
  { name: '영상·사진', icon: Video, color: 'bg-red-500' },
  { name: '번역·통역', icon: Languages, color: 'bg-green-500' },
  { name: '교육', icon: GraduationCap, color: 'bg-teal-500' },
  { name: '컨설팅', icon: Lightbulb, color: 'bg-yellow-500' },
  { name: '기타', icon: MoreHorizontal, color: 'bg-gray-500' },
];

const sampleCourses = [
  { title: 'React 완벽 가이드', level: '초급', price: '49,000원', students: '1,234명' },
  { title: 'Figma 마스터 클래스', level: '중급', price: '59,000원', students: '856명' },
  { title: '디지털 마케팅 입문', level: '초급', price: '무료', students: '2,341명' },
];

export default function Index() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 py-20 md:py-32">
        <div className="container mx-auto px-4 text-center text-white">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            전문 인력과 일거리를<br />연결하는 플랫폼
          </h1>
          <p className="text-lg md:text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            품웍에서 전문가를 찾거나, 새로운 기회를 발견하세요
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="bg-white text-blue-700 hover:bg-blue-50 font-semibold text-base px-8 py-6">
              <Link to="/jobs">
                일거리 찾기 <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" asChild variant="outline" className="border-white text-white hover:bg-white/10 font-semibold text-base px-8 py-6">
              <Link to="/register">인력 등록하기</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Trust Metrics */}
      <section className="py-16 bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '1,000+', label: '등록 인력', icon: Users },
              { value: '500+', label: '진행 프로젝트', icon: FolderOpen },
              { value: '50+', label: '교육 강좌', icon: BookOpen },
              { value: '98%', label: '만족도', icon: Star },
            ].map((metric) => (
              <div key={metric.label} className="text-center">
                <metric.icon className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                <div className="text-3xl md:text-4xl font-bold text-gray-900">{metric.value}</div>
                <div className="text-sm text-gray-500 mt-1">{metric.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">카테고리별로 찾아보세요</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <Link to={`/jobs?category=${cat.name}`} key={cat.name}>
                <Card className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
                  <CardContent className="p-6 text-center">
                    <div className={`${cat.color} w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3`}>
                      <cat.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="font-semibold text-gray-900">{cat.name}</div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">이용 방법</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: '1', title: '일거리 등록', desc: '필요한 프로젝트의 상세 내용을 등록하세요' },
              { step: '2', title: '전문가 매칭', desc: '조건에 맞는 전문 인력을 찾아드립니다' },
              { step: '3', title: '프로젝트 시작', desc: '안전한 에스크로 결제로 프로젝트를 시작하세요' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">{item.step}</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Education Preview */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl font-bold">전문 툴 교육 강좌</h2>
            <Button variant="outline" asChild>
              <Link to="/courses">전체 강좌 보기 <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {sampleCourses.map((course) => (
              <Card key={course.title} className="hover:shadow-lg transition-all">
                <div className="h-40 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-t-lg flex items-center justify-center">
                  <GraduationCap className="h-16 w-16 text-white/50" />
                </div>
                <CardContent className="p-5">
                  <h3 className="font-semibold text-lg mb-2">{course.title}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{course.level} · {course.students}</span>
                    <span className="font-semibold text-blue-600">{course.price}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-blue-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">지금 시작하세요</h2>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            전문가를 찾고 계신가요? 새로운 기회를 찾고 계신가요?
          </p>
          <Button size="lg" asChild className="bg-white text-blue-700 hover:bg-blue-50 font-semibold px-8 py-6">
            <Link to="/register">무료로 시작하기</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}