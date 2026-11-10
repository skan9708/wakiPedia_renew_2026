import { ChevronDown } from 'lucide-react';

type GuideTopic = {
  id: string;
  title: string;
  summary: string;
  questions: { question: string; answer: string }[];
};

const topics: GuideTopic[] = [
  {
    id: 'search',
    title: '와인 찾기',
    summary: '이름으로 찾고, 필요한 조건만 골라보세요.',
    questions: [
      { question: '와인을 어떻게 찾나요?', answer: '홈이나 검색 화면에서 한글·영문 이름을 입력하세요. 검색 필터에서 와인 종류, 나라, 품종을 고를 수 있어요.' },
      { question: '찾는 와인이 없어요.', answer: '추천 목록에 와인이 보이지 않아도 검색어를 입력한 뒤 엔터를 누르거나 ‘검색’ 버튼을 눌러 보세요. 검색 결과에도 와인이 없다면 ‘새로운 와인 등록하기’ 버튼이 나타납니다. 등록하려면 로그인이 필요해요.' },
    ],
  },
  {
    id: 'wine',
    title: '와인 상세 보기',
    summary: '평점과 리뷰를 읽고 기록할 와인을 골라보세요.',
    questions: [
      { question: '사용자 총 평점은 어떻게 계산하나요?', answer: '공개 리뷰에 매긴 별점의 평균이에요. 공개 리뷰가 아직 없다면 이전 서비스에서 가져온 평균 평점이 표시될 수 있어요.' },
      { question: '최신 리뷰와 인기 리뷰의 차이는 무엇인가요?', answer: '최신 리뷰는 최근 작성순, 인기 리뷰는 ‘도움이 돼요’를 많이 받은 순서예요. 받은 수가 같으면 최근 리뷰가 먼저 나옵니다.' },
      { question: '와인 사진이 없으면 어떻게 되나요?', answer: '대표 사진이 없는 와인은 사진이 담긴 첫 공개 리뷰의 사진을 보여줄 수 있어요. 사용할 사진이 없으면 기본 이미지가 표시됩니다.' },
      { question: '와인 이름 옆 하트는 무엇인가요?', answer: '관심 있는 와인을 저장하는 버튼이에요. 저장한 와인은 마이페이지의 ‘내가 좋아요한 와인’에서 다시 볼 수 있어요.' },
    ],
  },
  {
    id: 'review',
    title: '와인 기록하기',
    summary: '별점과 짧은 후기만 있어도 시작할 수 있어요.',
    questions: [
      { question: '리뷰에서 꼭 써야 하는 것은 무엇인가요?', answer: '별점과 후기 글만 필수예요. 사진, 맛의 세기, 느낌 태그는 원하는 것만 기록하세요.' },
      { question: '‘전체 공개’와 ‘나만 보기’는 어떻게 다른가요?', answer: '전체 공개 리뷰는 다른 사람도 볼 수 있고 와인 평점에 반영돼요. 나만 보기 리뷰와 사진은 내 기록에서만 볼 수 있어요.' },
      { question: '나만 보기 리뷰에도 사진을 올릴 수 있나요?', answer: '네. 리뷰를 작성하거나 수정할 때 사진을 올릴 수 있어요. 나만 보기로 저장한 사진은 다른 사람에게 보이지 않고 내 리뷰에서만 볼 수 있어요.' },
      { question: '나만 보기 리뷰도 내 취향 분석에 들어가나요?', answer: '네. 공개 여부와 관계없이 내가 4점 이상 준 와인은 취향 분석 대상이 될 수 있어요. 와인의 특징 정보가 없는 항목은 수치 계산에서 제외됩니다.' },
      { question: '‘도움이 돼요’는 무엇인가요?', answer: '다른 사람의 공개 리뷰가 도움이 됐다면 누를 수 있어요. 내 리뷰에는 직접 누를 수 없습니다.' },
    ],
  },
  {
    id: 'me',
    title: '내 기록 보기',
    summary: '마이페이지에서 마신 와인과 취향을 확인하세요.',
    questions: [
      { question: '‘마셔본 와인’과 와인병은 어떻게 채워지나요?', answer: '공개·나만 보기 리뷰를 모두 포함해 서로 다른 와인을 세요. 같은 와인을 여러 번 기록해도 한 병으로 계산하고, 기록한 와인이 늘수록 다음 레벨로 올라갑니다.' },
      { question: '‘와키에 쌓인 리뷰’는 무엇인가요?', answer: '와키피디아에 쌓인 전체 공개 리뷰 수예요. 내가 쓴 나만 보기 리뷰는 이 숫자에 들어가지 않아요.' },
      { question: '‘내 취향 분석’은 어떤 리뷰를 쓰나요?', answer: '내가 4점 이상 준 와인의 등록된 바디·당도·산도·탄닌 특징을 평균내요. 같은 와인을 여러 번 리뷰했다면 가장 최근 리뷰의 별점을 기준으로 고릅니다. 화이트 탭에는 스파클링이 포함돼요.' },
      { question: '‘좋아한 와인의 키워드’와 ‘도움 준 리뷰’는 무엇인가요?', answer: '키워드는 4점 이상 준 와인의 리뷰에서 내가 고른 느낌 태그예요. 도움 준 리뷰는 다른 사람이 ‘도움이 돼요’를 한 번 이상 누른 내 공개 리뷰의 개수예요.' },
    ],
  },
  {
    id: 'help',
    title: '계정과 문의',
    summary: '내 정보를 관리하고 서비스에 의견을 남겨주세요.',
    questions: [
      { question: '프로필은 어디서 바꾸나요?', answer: '로그인한 뒤 마이페이지의 ‘프로필 수정’에서 닉네임과 프로필 사진 등을 관리할 수 있어요.' },
      { question: '오류나 개선 의견은 어디에 남기나요?', answer: '왼쪽 메뉴의 ‘피드백 남기기’에서 알려주세요. 어떤 화면에서 무슨 일이 있었는지 적어주시면 확인에 도움이 됩니다.' },
    ],
  },
];

const quickSteps = [
  { title: '와인 찾기', description: '왼쪽 메뉴나 화면 아래의 ‘검색’을 눌러 와인을 찾으세요.' },
  { title: '기록 남기기', description: '와인 상세 화면에서 ‘리뷰 등록하기’를 눌러 기록하세요.' },
  { title: '내 기록 보기', description: '왼쪽 메뉴의 ‘마이페이지’나 화면 아래의 ‘마이’를 누르세요.' },
];

export function GuideMobile() {
  return (
    <div className="mx-auto w-full max-w-mobile space-y-8 px-4 pb-10 pt-5">
      <header className="rounded-3xl bg-[#f6f7e9] px-5 py-6">
        <p className="text-xs font-semibold tracking-wide text-accent">WAKIPEDIA GUIDE</p>
        <h1 className="mt-2 text-2xl font-bold">와키피디아 사용 가이드</h1>
        <p className="mt-2 text-sm leading-6 text-muted">마시기 전엔 리뷰를 찾아보고, 마신 뒤엔 내 와인을 기록해 보세요.</p>
      </header>

      <section aria-labelledby="quick-start-title">
        <h2 id="quick-start-title" className="text-lg font-semibold">처음이라면 이렇게</h2>
        <ol className="mt-3 space-y-2">
          {quickSteps.map((step, index) => (
            <li key={step.title}>
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eef1d2] text-sm font-semibold text-[#596400]">{index + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{step.title}</span>
                  <span className="block text-xs text-muted">{step.description}</span>
                </span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <p className="text-sm text-muted">자세한 내용은 궁금한 질문만 펼쳐 보세요.</p>

      {topics.map((topic) => (
        <section key={topic.id} id={topic.id} aria-labelledby={`${topic.id}-title`} className="scroll-mt-20">
          <div className="rounded-xl border-l-4 border-accent bg-[#eef1d2] px-4 py-3">
            <h2 id={`${topic.id}-title`} className="text-base font-semibold">{topic.title}</h2>
            <p className="mt-1 text-xs text-muted">{topic.summary}</p>
          </div>
          <div className="mt-3 divide-y divide-border rounded-2xl border border-border bg-white px-4">
            {topic.questions.map(({ question, answer }) => (
              <details key={question} className="group py-3">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-sm font-medium">
                  <span>{question}</span>
                  <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-accent transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="pt-3 text-sm leading-6 text-muted">{answer}</p>
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
