import { Link } from 'react-router';
import { Briefcase } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="h-6 w-6 text-blue-400" />
              <span className="text-lg font-bold text-white">poomwork</span>
            </div>
            <p className="text-sm text-gray-400">
              전문 인력과 일거리를 연결하고,<br />
              실무 교육을 제공하는 플랫폼
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-4">서비스</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/jobs" className="hover:text-white transition-colors">일거리 찾기</Link></li>
              <li><Link to="/workers" className="hover:text-white transition-colors">인력 찾기</Link></li>
              <li><Link to="/courses" className="hover:text-white transition-colors">교육 강좌</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-4">고객지원</h3>
            <ul className="space-y-2 text-sm">
              <li><span className="hover:text-white transition-colors cursor-pointer">이용약관</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">개인정보처리방침</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">자주 묻는 질문</span></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-4">연락처</h3>
            <ul className="space-y-2 text-sm">
              <li>이메일: help@poomwork.com</li>
              <li>전화: 02-1234-5678</li>
              <li>운영시간: 평일 9시~18시</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500">
          © 2026 poomwork. All rights reserved.
        </div>
      </div>
    </footer>
  );
}