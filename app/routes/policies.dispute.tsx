import type { MetaFunction } from 'react-router';
import { Link } from 'react-router';
import {
  Scale,
  Clock,
  FileText,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  FileSignature,
  Copyright,
  Lock,
} from 'lucide-react';

export const meta: MetaFunction = () => [
  { title: '안전 거래 및 분쟁 중재 정책 - poomwork' },
  { name: 'description', content: '품웍 안전 거래 및 분쟁 중재 정책 안내' },
];

const legalSections = [
  {
    icon: FileSignature,
    title: '전자계약의 법적 효력',
    color: 'bg-indigo-50 text-indigo-600',
    items: [
      '민사적 계약 성립: 품웍 내에서 체결된 제안 및 합의사항은 전자문서 및 전자서명법에 따라 당사자 간의 의사 합치를 증명하는 민사상 유효하고 구속력 있는 계약으로 인정됩니다.',
      '효력 발생 시점: 발주자와 전문가 상호 간에 합의 승인이 완료되고, 발주자의 에스크로 대금 결제가 완료된 시점부터 정식 계약의 법적 효력이 발생합니다.',
      '신의성실의 원칙: 계약 당사자는 계약에서 정한 작업 범위와 납품 기한을 신의성실의 원칙에 따라 준수하여야 하며, 임의로 파기하거나 정당한 사유 없이 이행을 지체할 수 없습니다.',
    ],
  },
  {
    icon: Copyright,
    title: '산출물 지식재산권(저작권) 귀속',
    color: 'bg-emerald-50 text-emerald-600',
    items: [
      '저작권 이전 시점: 최종 작업 산출물에 대한 저작권 및 일체의 지식재산권은 발주자가 에스크로 대금 지급을 승인하여 정산(계약 확정)이 완료된 시점에 자동으로 전문가로부터 발주자에게 양도됩니다.',
      '미승인 산출물 보호: 대금 결제 및 지급 승인이 완료되지 않은 시안, 중간 결과물, 미이행 계약 상태의 산출물은 당사자 간 별도의 합의가 없는 한 발주자가 무단으로 사용할 수 없습니다.',
      '제3자 권리 보호: 전문가는 납품하는 산출물이 제3자의 특허권, 저작권, 초상권 등 지식재산권을 침해하지 않도록 보장해야 하며, 이를 위반하여 발생하는 법적 책임은 전문가에게 귀속됩니다.',
    ],
  },
  {
    icon: Lock,
    title: '비밀유지 및 직거래 제한',
    color: 'bg-sky-50 text-sky-600',
    items: [
      '상호 비밀유지 의무(NDA): 양 당사자는 계약 수행 과정에서 알게 된 상대방의 경영비밀, 기술정보, 개인정보를 상대방의 서면 동의 없이 외부로 유출하거나 제3자에게 공개할 수 없습니다.',
      '플랫폼 외 직거래 금지: 품웍 플랫폼 내에서 알게 된 회원과 고의로 플랫폼 외부에서 결제 및 거래를 직접 조율하는 행위는 엄격히 제한됩니다.',
      '직거래 시 대금 보호 예외: 플랫폼 외부에서 직거래 진행 시 플랫폼이 제공하는 에스크로 대금 보호 및 분쟁 조정 서비스 혜택을 일절 받을 수 없으며, 적발 시 계정 정지 등의 패널티가 부과됩니다.',
    ],
  },
];

const disputeSections = [
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

      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#EDE9FE] rounded-full mb-4">
          <ShieldCheck className="h-8 w-8 text-[#7C3AED]" />
        </div>
        <h1 className="text-3xl font-extrabold text-[#332F3A] mb-3" style={{ fontFamily: "'Nunito', sans-serif" }}>
          안전 거래 및 분쟁 중재 정책
        </h1>
        <p className="text-[#635F69] text-base max-w-xl mx-auto leading-relaxed">
          품웍은 발주자와 전문가 간의 모든 계약과 거래가 공정하고 법적인 안전장치 아래에서 진행되도록 에스크로 시스템 및 신뢰 정책을 운영합니다.
        </p>
      </div>

      <div className="space-y-8">
        {/* 법적 안전장치 섹션 */}
        <div>
          <h2 className="text-xl font-bold text-[#332F3A] mb-4 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-[#7C3AED] rounded-full inline-block" />
            1. 거래 및 법적 안전보장 가이드
          </h2>
          <div className="space-y-5">
            {legalSections.map(({ icon: Icon, title, color, items }) => (
              <div key={title} className="bg-white rounded-[28px] border border-gray-100 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${color.split(' ')[0]}`}>
                    <Icon className={`h-5 w-5 ${color.split(' ')[1]}`} />
                  </div>
                  <h3 className="text-base font-bold text-[#332F3A]">{title}</h3>
                </div>
                <ul className="space-y-2">
                  {items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#635F69] leading-relaxed">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#7C3AED] shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* 분쟁 중재 섹션 */}
        <div className="pt-4">
          <h2 className="text-xl font-bold text-[#332F3A] mb-4 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-[#7C3AED] rounded-full inline-block" />
            2. 분쟁 중재 정책 안내
          </h2>
          <div className="space-y-5">
            {disputeSections.map(({ icon: Icon, title, color, items }) => (
              <div key={title} className="bg-white rounded-[28px] border border-gray-100 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${color.split(' ')[0]}`}>
                    <Icon className={`h-5 w-5 ${color.split(' ')[1]}`} />
                  </div>
                  <h3 className="text-base font-bold text-[#332F3A]">{title}</h3>
                </div>
                <ul className="space-y-2">
                  {items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#635F69] leading-relaxed">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#7C3AED] shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-12 bg-[#EDE9FE] rounded-[24px] p-6 text-center">
        <p className="text-sm text-[#635F69] font-medium">
          품웍의 안전 거래 및 정책과 관련하여 추가 문의가 있으시면 고객센터로 연락해주세요.
        </p>
        <p className="text-xs text-[#635F69] mt-2 opacity-70">최종 수정일: 2025년 1월</p>
      </div>
    </div>
  );
}
