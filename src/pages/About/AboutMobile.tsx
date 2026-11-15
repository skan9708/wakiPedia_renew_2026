import { ArrowRight, BookOpen, Compass, Heart, MessageCircle, NotebookPen, RefreshCw, Wine } from 'lucide-react';
import { Link } from 'react-router-dom';

const cycleSteps = [
  {
    title: '마셔보기',
    description: '새로운 한 잔을 경험해요',
    icon: Wine,
  },
  {
    title: '내 말로 기록하기',
    description: '맛과 느낌을 그대로 남겨요',
    icon: NotebookPen,
  },
  {
    title: '취향 알아가기',
    description: '내가 좋아하는 맛을 찾아요',
    icon: Heart,
  },
  {
    title: '다시 탐험하기',
    description: '다음 와인을 골라봐요',
    icon: Compass,
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
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eef1d2] text-accent">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="text-base font-semibold">마신 와인을 잊지 않으려고 시작했어요</h3>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted">
            마신 와인의 맛도, 돈 들여 배운 지식도 금세 잊히는 게 아쉬웠어요.
            와인 초보가 느낀 것을 내 말로 기록하면 누군가에게도 도움이 될 거라 생각했습니다.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-muted" aria-label="블로그에서 네이버 카페를 거쳐 와키피디아 웹으로 이어진 이야기">
            <span className="rounded-lg bg-white px-2.5 py-1.5">블로그</span>
            <ArrowRight className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            <span className="rounded-lg bg-white px-2.5 py-1.5">네이버 카페</span>
            <ArrowRight className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            <span className="rounded-lg bg-[#eef1d2] px-2.5 py-1.5 text-fg">와키피디아 웹</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">
            혼자 쓰던 블로그가 서로의 솔직한 후기를 모으는 카페로 커졌고, 이제 웹에서 그 기록을 함께 이어갑니다.
          </p>
          <p className="mt-4 border-t border-border pt-4 text-xs leading-5 text-muted">
            * 네이버 카페에서 옮겨온 리뷰는 작성자명이 ‘와키 네이버카페 리뷰’로 표시돼요.
          </p>
        </div>

        <div className="mt-3 rounded-2xl border border-border bg-white px-5 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5e9ed] text-[#7b2641]">
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="text-base font-semibold">한국 와린이들의 진짜 후기</h3>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted">
            비비노 같은 해외 앱의 영어 리뷰와 유명 평점만으로는 내 입맛에 맞는 와인을 고르기 어려웠어요.
            한국에서 나와 비슷한 와린이가 마신 후기를 보고 싶었습니다.
          </p>
          <p className="mt-4 rounded-xl bg-[#f8f3f5] px-4 py-3 text-sm font-medium leading-6 text-[#6b253d]">
            “달다”, “시다”, “또 마시고 싶다”처럼 느낀 그대로, 초보의 말로 남겨주세요.
          </p>
        </div>
      </section>

      <section aria-labelledby="about-cycle-title">
        <div className="rounded-xl border-l-4 border-accent bg-[#eef1d2] px-4 py-3">
          <h2 id="about-cycle-title" className="text-base font-semibold">기록할수록 넓어지는 취향</h2>
        </div>
        <p className="px-1 pt-4 text-sm leading-6 text-muted">
          와인을 마시고 기록하다 보면 좋아하는 맛이 보입니다. 그 취향을 따라 새 와인을 골라 맛보고, 다시 경험을 남겨요.
        </p>
        <ol className="mt-4 grid grid-cols-2 gap-2">
          {cycleSteps.map(({ title, description, icon: Icon }, index) => (
            <li key={title} className="rounded-2xl border border-border bg-white px-4 py-4">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eef1d2] text-accent">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-xs font-semibold text-accent">0{index + 1}</span>
              </div>
              <h3 className="mt-3 text-sm font-semibold">{title}</h3>
              <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-[#f6f7e9] px-4 py-4 text-sm leading-6 text-muted">
          <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
          <span>내 취향의 폭과 깊이가 넓어지고, 쌓인 리뷰는 다음 사람의 선택을 도와요. 한국 와린이들이 함께 채우는 와인 사전을 만들고 싶습니다.</span>
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
