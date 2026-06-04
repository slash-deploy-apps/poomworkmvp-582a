import type { MetaFunction } from 'react-router';
import { Link } from 'react-router';
import { Scale, Clock, FileText, ShieldAlert, CheckCircle, AlertTriangle } from 'lucide-react';

export const meta: MetaFunction = () => [
  { title: '분쟁 중재 정책 - poomwork' },
  { name: 'description', content: '품웍 분쟁 중재 정책 안내' },
];

const sections = [
  {
    icon: AlertTriangle,
    title: '분쟁 제기 가능 시점',
    color: 'bg-orange-50 text-orange-600',
    items: [
      '계약이 진행 중인 상태(제안 전송·합의·진행 중·결과물 전달)에서만 제기할 수 있습니다.',
      '이미 완료(승인)되거나 취소된 계약은 분쟁 대상이 아닙니다.',
      '계약 당사자(전문가 또는 발주자) 본인만 제기할 수 있습니다.',
      '같은 계약에 대해 동시에 두 건의 분쟁을 제기할 수 없습니다.',
    ],
  },
  {
    icon: Scale,
    title: '처리 절차',
    color: 'bg-[#EDE9FE] text-[#7C3AED]',
    items: [
      '접수(open): 분쟁 제기 즉시 계약 상태가 "분쟁 진행중"으로 변경됩니다.',
      '검토(reviewing): 관리자가 양측 진술과 증거 자료를 검토합니다.',
      '결정(resolved): 관리자가 아래 4가지 결정 중 하나를 내립니다.',
      '결정 이후에는 번복이 어려우므로 증거 자료를 충분히 제출해주세요.',
    ],
  },
  {
    icon: CheckCircle,
    title: '결정 종류',
    color: 'bg-green-50 text-green-600',
    items: [
      '전액 환불: 발주자에게 결제 금액 전액을 환불합니다.',
      '부분 환불: 협의된 금액만 발주자에게 환불하고 나머지는 전문가에게 지급합니다.',
      '전문가 정산: 전문가 작업 완료로 인정하여 계약을 확정하고 정산합니다.',
      '분쟁 취소: 사유 없음 또는 양측 합의로 분쟁을 취소하고 계약을 재개합니다.',
    ],
  },
  {
    icon: Clock,
    title: '처리 기한',
    color: 'bg-blue-50 text-blue-600',
    items: [
      '분쟁 접수 후 영업일 기준 5일 이내에 처리를 완료하는 것을 목표로 합니다.',
      '증거 자료가 부족하거나 추가 확인이 필요한 경우 기간이 연장될 수 있습니다.',
      '처리 완료 시 양측에게 결과가 통보됩니다.',
    ],
  },
  {
    icon: FileText,
    title: '증거 자료 가이드',
    color: 'bg-purple-50 text-purple-600',
    items: [
      '업무 지시서, 계약서, 작업 범위 문서 등 서면 증거를 첨부하세요.',
      '커뮤니케이션 내역(채팅, 이메일 등)을 스크린샷으로 제출하세요.',
      '결과물 또는 미이행 증빙 파일을 업로드하세요 (JPG/PNG/WebP/PDF, 4MB 이하, 최대 5개).',
      '허위 증거 제출 시 불이익이 발생할 수 있습니다.',
    ],
  },
  {
    icon: ShieldAlert,
    title: '부정 분쟁 시 제재',
    color: 'bg-red-50 text-red-600',
    items: [
      '허위 사실을 바탕으로 분쟁을 제기하거나 악의적으로 남용하는 경우 제재 대상입니다.',
      '허위 증거 제출, 분쟁 반복 남용 시 계정 정지 또는 영구 이용 정지가 적용될 수 있습니다.',
      '품웍은 중재자로서 최대한 공정하게 판단하지만 법적 구속력은 없습니다.',
    ],
  },
];

export default function DisputePolicy() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <Link
        to="/"
        className="inline-flex items-center text-sm text-[#635F69] hover:text-[#7C3AED] mb-8"
      >
        ← 홈으로 돌아가기
      </Link>

      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#EDE9FE] rounded-full mb-4">
          <Scale className="h-8 w-8 text-[#7C3AED]" />
        </div>
        <h1 className="text-3xl font-extrabold text-[#332F3A] mb-3" style={{ fontFamily: "'Nunito', sans-serif" }}>
          분쟁 중재 정책
        </h1>
        <p className="text-[#635F69] text-base max-w-xl mx-auto">
          품웍은 발주자와 전문가 모두를 공정하게 보호하기 위해 분쟁 중재 제도를 운영합니다.
          아래 정책을 꼼꼼히 읽고 이해한 후 분쟁을 제기해주세요.
        </p>
      </div>

      <div className="space-y-5">
        {sections.map(({ icon: Icon, title, color, items }) => (
          <div key={title} className="bg-white rounded-[28px] border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${color.split(' ')[0]}`}>
                <Icon className={`h-5 w-5 ${color.split(' ')[1]}`} />
              </div>
              <h2 className="text-lg font-bold text-[#332F3A]">{title}</h2>
            </div>
            <ul className="space-y-2">
              {items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#635F69]">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#7C3AED] shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-[#EDE9FE] rounded-[24px] p-6 text-center">
        <p className="text-sm text-[#635F69]">
          분쟁과 관련하여 추가 문의가 있으시면 고객센터로 연락해주세요.
        </p>
        <p className="text-xs text-[#635F69] mt-1 opacity-70">최종 수정일: 2025년 1월</p>
      </div>
    </div>
  );
}
