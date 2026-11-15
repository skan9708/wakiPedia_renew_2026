import { ArrowRight, BookOpen, NotebookPen, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

const steps = [
  {
    title: '찾아보고',
    description: '다른 사람의 리뷰',
    icon: Search,
  },
  {
    title: '기록하고',
    description: '나만의 와인 일기',
    icon: NotebookPen,
  },
  {
    title: '나누고',
    description: '다음 사람을 위한 팁',
    icon: BookOpen,
  },
];

export function AboutMobile() {
  return (
    <div className="mx-auto w-full max-w-mobile space-y-8 px-4 pb-12 pt-5">
      <header className="relative overflow-hidden rounded-3xl bg-[#d8e027] px-5 pb-8 pt-7 text-[#171913]">
        <div aria-hidden="true" className="absolute -right-14 -top-16 h-44 w-44 rounded-full border-[28px] border-white/20" />
        <p className="relative text-xs font-semibold tracking-[0.2em]">ABOUT WAKIPEDIA</p>
        <div className="relative mt-8 flex items-end justify-center gap-0.5" role="img" aria-label="WAKI, 와키">
          <span className="text-[clamp(3.3rem,16vw,4.9rem)] font-black leading-none tracking-[-0.09em]" aria-hidden="true">WAK</span>
          <svg
            viewBox="0 0 40 70"
            className="h-[clamp(3.3rem,16vw,4.9rem)] w-[clamp(1.9rem,9.2vw,2.8rem)] shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 11h30v9c0 10.5-6 17.5-15 18.5C11 37.5 5 30.5 5 20v-9Z" />
            <path d="M20 39v18M8 63h24" />
          </svg>
        </div>
        <p className="relative mx-auto mt-6 flex w-fit items-baseline gap-1.5 rounded-full bg-white/65 px-3 py-1.5 text-sm font-bold">
          <span className="font-black">와키</span>
          <span className="font-black text-[#7b2641]">:</span>
          <span><strong className="font-black text-[#7b2641]">와</strong>린이들이 <strong className="font-black text-[#7b2641]">키</strong>우다</span>
        </p>
        <h1 className="relative mt-4 text-center text-xl font-bold leading-snug">
          와린이들이 경험을 쌓고 나누며 만드는 곳
        </h1>
      </header>

      <section aria-labelledby="about-meaning-title">
        <div className="rounded-xl border-l-4 border-accent bg-[#eef1d2] px-4 py-3">
          <h2 id="about-meaning-title" className="text-base font-semibold">와키피디아가 뜻하는 것</h2>
        </div>
        <div className="mt-4 rounded-2xl border border-border bg-[#fafbf4] px-5 py-5">
          <p className="text-base font-semibold leading-7">와인을 잘 몰라도, 한 잔의 경험은 나눌 수 있어요.</p>
          <div className="mt-4 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-muted" aria-label="블로그에서 네이버 카페를 거쳐 와키피디아 웹으로 이어진 이야기">
            <span className="rounded-lg bg-white px-2.5 py-1.5">블로그</span>
            <ArrowRight className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            <span className="rounded-lg bg-white px-2.5 py-1.5">네이버 카페</span>
            <ArrowRight className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            <span className="rounded-lg bg-[#eef1d2] px-2.5 py-1.5 text-fg">와키피디아 웹</span>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted">
            와인 초보가 배운 것을 쉽게 기록하던 블로그에서 시작해, 서로의 솔직한 후기를 모으는 네이버 카페로 이어졌어요.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            이제 이곳에서 다른 사람의 리뷰를 찾아보고 내 경험도 남겨주세요. 처음엔 구경만 해도 좋아요.
          </p>
        </div>
      </section>

      <section aria-labelledby="about-how-title">
        <div className="rounded-xl border-l-4 border-accent bg-[#eef1d2] px-4 py-3">
          <h2 id="about-how-title" className="text-base font-semibold">와키피디아에서는</h2>
        </div>
        <ol className="mt-3 grid grid-cols-3 gap-2">
          {steps.map(({ title, description, icon: Icon }) => (
            <li key={title} className="flex min-w-0 flex-col items-center rounded-2xl border border-border bg-white px-1 py-4 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eef1d2] text-accent">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-3 text-sm font-semibold">{title}</h3>
              <p className="mt-1 text-[11px] leading-4 text-muted">{description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="about-cafe-title" className="rounded-2xl border border-border bg-white px-5 py-5">
        <p className="text-xs font-semibold text-accent">REVIEW NOTE</p>
        <h2 id="about-cafe-title" className="mt-2 text-base font-semibold">네이버 카페 리뷰 안내</h2>
        <p className="mt-2 text-sm leading-7 text-muted">
          카페에서 옮겨온 리뷰는 작성자명이 <strong className="font-semibold text-fg">‘와키 네이버카페 리뷰’</strong>로 표시돼요.
          여러 사람이 남긴 기록을 한곳에 모아 보여주는 이름입니다.
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
