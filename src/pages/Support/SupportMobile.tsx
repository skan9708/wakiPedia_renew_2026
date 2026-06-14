import { Mail, MessageCircle } from 'lucide-react';

export function SupportMobile() {
  return (
    <div className="space-y-5 pb-24">
      <div className="mx-auto w-full max-w-mobile px-4 pt-4">

        <div className="text-center py-6">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
            <MessageCircle className="w-7 h-7 text-accent" />
          </div>
          <h1 className="text-xl font-semibold">고객센터</h1>
          <p className="text-sm text-muted mt-1">무엇이든 도와드리겠습니다</p>
        </div>

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

      </div>
    </div>
  );
}
