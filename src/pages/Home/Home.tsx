import { useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import SearchBar from '@/components/common/SearchBar';
import { WineType } from '@/lib/types';
import logoIcon from '@/assets/icons/icon.svg';

function BottleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M28 4h8v10c0 1.9.8 3.7 2.1 5l1.9 1.9V22c0 1.1-.9 2-2 2H26c-1.1 0-2-.9-2-2v-1.1l1.9-1.9A7.1 7.1 0 0 0 28 14V4z" />
      <path d="M20 24h24v30c0 5.5-4.5 10-10 10H30c-5.5 0-10-4.5-10-10V24z" />
    </svg>
  );
}

export function Home() {
  const navigate = useNavigate();

  const wineCategories = [
    {
      type: 'Red' as WineType,
      label: 'Red',
      bg: 'bg-rose-800',
      icon: 'text-rose-100',
      labelClass: 'text-white',
    },
    {
      type: 'White' as WineType,
      label: 'White',
      bg: 'bg-amber-50',
      icon: 'text-amber-300',
      labelClass: 'text-slate-800',
    },
    {
      type: 'Sparkling' as WineType,
      label: 'Sparkling',
      bg: 'bg-amber-200',
      icon: 'text-amber-100',
      labelClass: 'text-slate-900',
    },
    {
      type: 'Rose' as WineType,
      label: 'Rose',
      bg: 'bg-rose-200',
      icon: 'text-rose-300',
      labelClass: 'text-slate-900',
    },
  ];

  const handleSearch = (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleCategoryClick = (wineType: WineType) => {
    navigate(`/search?type=${wineType}`);
  };

  return (
    <div className="min-h-screen bg-[#0f1720] text-white">
      {/* 히어로 */}
      <header className="relative">
        {/* 배경 이미지 */}
        <div 
          className="h-80 bg-cover bg-center relative"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1200 800\"><rect fill=\"%23334155\" width=\"1200\" height=\"800\"/><g opacity=\"0.3\"><rect x=\"100\" y=\"100\" width=\"80\" height=\"600\" fill=\"%23475569\"/><rect x=\"200\" y=\"100\" width=\"80\" height=\"600\" fill=\"%23475569\"/><rect x=\"300\" y=\"100\" width=\"80\" height=\"600\" fill=\"%23475569\"/><rect x=\"400\" y=\"100\" width=\"80\" height=\"600\" fill=\"%23475569\"/><rect x=\"500\" y=\"100\" width=\"80\" height=\"600\" fill=\"%23475569\"/><rect x=\"600\" y=\"100\" width=\"80\" height=\"600\" fill=\"%23475569\"/><rect x=\"700\" y=\"100\" width=\"80\" height=\"600\" fill=\"%23475569\"/><rect x=\"800\" y=\"100\" width=\"80\" height=\"600\" fill=\"%23475569\"/><rect x=\"900\" y=\"100\" width=\"80\" height=\"600\" fill=\"%23475569\"/><rect x=\"1000\" y=\"100\" width=\"80\" height=\"600\" fill=\"%23475569\"/></g></svg>')`
          }}
        >
          {/* 상단 네비게이션은 글로벌 헤더로 대체 */}

          {/* 중앙 로고 및 검색 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 mx-auto w-full max-w-mobile">
            {/* 로고 아이콘 */}
            <img src={logoIcon} alt="Wakipedia 로고" className="w-23 h-23 mb-4" />

            {/* 메인 로고 */}
            <h1 className="text-accent font-brand text-5xl font-normal tracking-tight mb-6 text-center">
              Wakipedia
            </h1>

            {/* 검색바 */}
            <div className="w-full max-w-md">
              <SearchBar
                placeholder="와인 리뷰를 검색해 보세요"
                onSearch={handleSearch}
                className="bg-white/95 backdrop-blur-sm border-0 shadow-lg"
              />
            </div>
          </div>
        </div>
      </header>

      {/* 와인 카테고리 섹션 */}
      <section className="px-6 pt-4 pb-8 page-container">
        <div className="grid grid-cols-2 gap-4">
          {wineCategories.map((category) => (
            <button
              key={category.type}
              onClick={() => handleCategoryClick(category.type)}
              className="relative aspect-square rounded-2xl overflow-hidden transition-all duration-300 group shadow-sm"
            >
              {/* 배경 색상 */}
              <div className={`absolute inset-0 ${category.bg}`} />
              
              {/* 와인 병 아이콘 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <BottleIcon className={`w-16 h-24 drop-shadow-sm ${category.icon}`} />
              </div>

              {/* 라벨 */}
              <div className="absolute bottom-4 left-4 right-4">
                <h3 className={`text-lg font-semibold text-center drop-shadow ${category.labelClass}`}>
                  {category.label}
                </h3>
              </div>

              {/* 호버 효과 */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300" />
            </button>
          ))}
        </div>
      </section>

      {/* 푸터 */}
      <footer className="mt-auto px-6 py-8 border-t border-slate-700 page-container">
        <div className="text-center space-y-2">
          <div className="text-slate-400 text-xs space-y-1">
            <p>상호명: (주)와키피디아</p>
            <p>대표자: 홍길동</p>
            <p>사업자등록번호: 123-45-67890</p>
            <p>통신판매업신고번호: 제2024-서울강남-1234호</p>
            <p>주소: 서울특별시 강남구 테헤란로 123, 4층</p>
            <p>고객센터: 1588-1234 (평일 09:00~18:00)</p>
            <p>이메일: contact@wakipedia.co.kr</p>
          </div>
          <div className="pt-4 text-slate-500 text-xs">
            <p>© 2024 Wakipedia. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}


