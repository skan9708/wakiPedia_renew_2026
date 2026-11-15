import { ArrowRight, BookOpen, NotebookPen, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

const steps = [
  {
    title: '마시기 전에 찾아보고',
    description: '와인 이름을 검색해 다른 사람의 별점과 경험을 살펴봐요.',
    icon: Search,
  },
  {
    title: '마신 뒤에 기록하고',
    description: '별점과 짧은 후기를 남겨 나만의 와인 기록을 쌓아요.',
    icon: NotebookPen,
  },
  {
    title: '다음 사람과 나누고',
    description: '내 공개 리뷰가 누군가의 와인 선택에 도움이 돼요.',
    icon: BookOpen,
  },
];

export function AboutMobile() {
  return (
    <div className="mx-auto w-full max-w-mobile space-y-8 px-4 pb-12 pt-5">
      <header className="rounded-3xl bg-[#f6f7e9] px-5 py-8">
        <p className="text-xs font-semibold tracking-wide text-accent">ABOUT WAKIPEDIA</p>
        <h1 className="mt-3 text-2xl font-bold leading-snug text-fg">
          한 잔의 경험이<br />다음 사람의 길잡이가 돼요.
        </h1>
        <p className="mt-4 text-sm leading-7 text-muted">
          와키피디아는 와인을 마신 사람들이 각자의 기록을 모아 함께 채워가는 공간이에요.
          처음 와인을 고르는 순간부터 내 취향을 알아가는 순간까지, 서로의 경험이 도움이 됩니다.
        </p>
      </header>

      <section aria-labelledby="about-meaning-title">
        <div className="rounded-xl border-l-4 border-accent bg-[#eef1d2] px-4 py-3">
          <h2 id="about-meaning-title" className="text-base font-semibold">와키피디아가 뜻하는 것</h2>
        </div>
        <p className="px-1 pt-4 text-sm leading-7 text-muted">
          네이버 카페에서 시작한 와인 이야기가 이제 웹으로 이어졌어요.
          여러분이 남기는 리뷰 한 편 한 편이 쌓여, 와린이도 서로 도움받을 수 있는 와키피디아를 함께 만들어갑니다.
        </p>
      </section>

      <section aria-labelledby="about-how-title">
        <div className="rounded-xl border-l-4 border-accent bg-[#eef1d2] px-4 py-3">
          <h2 id="about-how-title" className="text-base font-semibold">와키피디아에서는</h2>
        </div>
        <ol className="mt-3 space-y-2">
          {steps.map(({ title, description, icon: Icon }) => (
            <li key={title} className="flex items-start gap-3 rounded-2xl border border-border bg-white px-4 py-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eef1d2] text-accent">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-sm font-semibold">{title}</h3>
                <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="about-cafe-title" className="rounded-2xl border border-border bg-white px-5 py-5">
        <p className="text-xs font-semibold text-accent">REVIEW NOTE</p>
        <h2 id="about-cafe-title" className="mt-2 text-base font-semibold">네이버 카페 리뷰 안내</h2>
        <p className="mt-2 text-sm leading-7 text-muted">
          네이버 카페에 남겨진 여러 사람의 리뷰도 이곳으로 옮겨왔어요.
          옮겨온 리뷰의 작성자명은 <strong className="font-semibold text-fg">‘와키 네이버카페 리뷰’</strong>로 표시돼요.
          여러 사람의 기록을 한곳에 모아 보여주는 이름입니다.
        </p>
      </section>

      <div className="space-y-3">
        <Link to="/search" className="flex items-center justify-between rounded-2xl bg-accent px-5 py-4 text-sm font-semibold text-white">
          와인 찾아보기 <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <Link to="/guide" className="block text-center text-sm text-muted underline underline-offset-4">
          사용법이 궁금하다면 사용 가이드 보기
        </Link>
      </div>
    </div>
  );
}
