import { Mail, Clock, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

const FAQS = [
  {
    q: '리뷰는 어떻게 작성하나요?',
    a: '와인 상세 페이지에서 "리뷰 등록하기" 버튼을 누르거나, 하단 리뷰 탭에서 작성할 수 있습니다. 로그인이 필요합니다.',
  },
  {
    q: '비공개 리뷰는 누가 볼 수 있나요?',
    a: '비공개로 설정한 리뷰는 본인만 볼 수 있습니다. 마이페이지 내 리뷰 목록에서 확인 가능합니다.',
  },
  {
    q: '와인을 직접 등록할 수 있나요?',
    a: '검색에서 원하는 와인이 없으면 검색 결과 하단의 "새로운 와인 등록하기"를 통해 직접 등록할 수 있습니다.',
  },
  {
    q: '회원 탈퇴는 어떻게 하나요?',
    a: '현재 앱 내 탈퇴 기능은 준비 중입니다. contact@wakipedia.co.kr 로 이메일 문의 주시면 처리해드립니다.',
  },
  {
    q: '카카오 로그인이 안 돼요.',
    a: '카카오 계정의 이메일 제공 동의가 필요합니다. 카카오 계정 설정에서 확인 후 다시 시도해주세요.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        className="w-full flex items-center justify-between py-4 text-left gap-3"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-sm font-medium text-fg">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted shrink-0" />}
      </button>
      {open && <p className="pb-4 text-sm text-muted leading-relaxed">{a}</p>}
    </div>
  );
}

export function SupportMobile() {
  return (
    <div className="space-y-5 pb-24">
      <div className="mx-auto w-full max-w-mobile px-4 pt-4">

        {/* 헤더 */}
        <div className="text-center py-6">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
            <MessageCircle className="w-7 h-7 text-accent" />
          </div>
          <h1 className="text-xl font-semibold">고객센터</h1>
          <p className="text-sm text-muted mt-1">무엇이든 도와드리겠습니다</p>
        </div>

        {/* 이메일 문의 */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Mail className="w-4 h-4 text-accent" />
            이메일 문의
          </div>
          <p className="text-sm text-muted leading-relaxed">
            서비스 이용 중 불편한 점이나 문의 사항이 있으시면 이메일로 연락주세요. 영업일 기준 1~2일 내 답변드립니다.
          </p>
          <a
            href="mailto:contact@wakipedia.co.kr"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-accent text-white text-sm font-medium"
          >
            <Mail className="w-4 h-4" />
            contact@wakipedia.co.kr
          </a>
        </div>

        {/* 운영 시간 */}
        <div className="card p-5 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Clock className="w-4 h-4 text-accent" />
            운영 시간
          </div>
          <div className="space-y-1 text-sm text-muted">
            <div className="flex justify-between">
              <span>평일</span>
              <span>오전 10:00 ~ 오후 6:00</span>
            </div>
            <div className="flex justify-between">
              <span>주말 · 공휴일</span>
              <span>휴무</span>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-base font-semibold mb-1 px-1">자주 묻는 질문</h2>
          <div className="card px-4">
            {FAQS.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
