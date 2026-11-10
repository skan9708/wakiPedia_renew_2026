export type GuideStep = { title: string; description: string; target?: string };
export type PageGuide = { id: string; name: string; steps: GuideStep[]; autoOpen?: boolean };

const guides: Record<string, PageGuide> = {
  home: { id: 'home', name: '홈', steps: [
    { title: '와인을 찾아보세요', description: '한글·영문 이름을 입력하고 추천 항목을 고르거나 검색 버튼을 누르세요.', target: '[data-guide="home-search"]' },
    { title: '종류로 둘러보세요', description: '레드·화이트·스파클링·로제 중 하나를 누르면 해당 종류의 와인 목록이 열려요.', target: '[data-guide="home-types"]' },
    { title: '메뉴로 이동하세요', description: '화면 아래 메뉴에서 검색, 공개 리뷰, 마이페이지로 바로 갈 수 있어요.', target: '[data-guide="bottom-nav"]' },
  ] },
  search: { id: 'search', name: '검색', steps: [
    { title: '검색어 입력하기', description: '와인 이름·품종·지역을 입력하세요. 추천 목록에서 고르거나 엔터·검색 버튼으로 전체 결과를 확인할 수 있어요.', target: '[data-guide="search-input"]' },
    { title: '검색 필터 사용하기', description: '와인 종류, 원산지, 품종과 정렬 순서를 고른 뒤 필터를 적용하세요.', target: '[data-guide="search-filter"]' },
    { title: '결과 확인하기', description: '와인을 누르면 상세 화면이 열려요. 결과가 없으면 ‘새로운 와인 등록하기’로 직접 등록할 수 있어요.', target: '[data-guide="search-results"]' },
  ] },
  wine: { id: 'wine', name: '와인 상세', steps: [
    { title: '와인 정보 확인하기', description: '이름·원산지·품종을 확인하세요. 하트를 누르면 관심 와인으로 저장되고, 사진을 누르면 크게 볼 수 있어요.', target: '[data-guide="wine-summary"] > div:first-child' },
    { title: '평점과 특징 읽기', description: '사용자 총 평점은 공개 리뷰 별점의 평균이에요. 공개 리뷰가 없으면 이전 서비스 평점이 보일 수 있어요. 바디·당도·산도·탄닌도 함께 살펴보세요.', target: '[data-guide="wine-style"]' },
    { title: '내 기록 남기기', description: '‘리뷰 등록하기’에서 별점과 짧은 후기를 남길 수 있어요. 나만 보기 기록도 선택할 수 있어요.', target: '[data-guide="wine-record"]' },
    { title: '다른 사람의 리뷰 보기', description: '최신 리뷰는 최근 작성순, 인기 리뷰는 ‘도움이 돼요’를 많이 받은 순서예요.', target: '[data-guide="wine-reviews"] > div:first-child' },
  ] },
  reviews: { id: 'reviews', name: '리뷰 목록', steps: [
    { title: '리뷰 순서 바꾸기', description: '최신 리뷰와 인기 리뷰를 전환해 보세요. 인기 리뷰는 ‘도움이 돼요’를 많이 받은 순서예요.', target: '[data-guide="reviews-sort"]' },
    { title: '리뷰 읽기', description: '리뷰 카드를 누르면 사진, 별점, 느낌과 와인 정보를 자세히 볼 수 있어요.', target: '[data-guide="reviews-list"]' },
  ] },
  reviewDetail: { id: 'review-detail', name: '리뷰 상세', steps: [
    { title: '기록 살펴보기', description: '사진을 선택해 보고, 와인 이름을 누르면 해당 와인 상세 화면으로 이동해요.', target: '[data-guide="review-detail"]' },
    { title: '도움이 돼요', description: '다른 사람의 공개 리뷰가 도움이 되었다면 눌러주세요. 내 리뷰라면 수정하거나 삭제할 수 있어요.', target: '[data-guide="review-action"]' },
    { title: '리뷰 공유하기', description: '공개 리뷰는 아래 공유 버튼으로 링크를 복사하거나 휴대폰의 공유 기능을 이용할 수 있어요. 나만 보기 리뷰는 다른 사람이 열 수 없어요.', target: '[data-guide="review-share"]' },
  ] },
  reviewWrite: { id: 'review-write', name: '리뷰 작성', steps: [
    { title: '별점과 후기만 쓰면 돼요', description: '필수 항목은 별점과 후기 글이에요. 나머지는 원하는 만큼만 기록하세요.', target: '[data-guide="review-required"]' },
    { title: '사진과 상세 기록', description: '와인 사진, 바디·당도·산도·탄닌, 느낌 태그는 선택 사항이에요.', target: '[data-guide="review-optional"]' },
    { title: '공개 범위 정하기', description: '전체 공개는 다른 사람도 볼 수 있고 와인 평점에 반영돼요. 나만 보기 리뷰에도 사진을 올릴 수 있으며, 내 기록에서만 볼 수 있어요.', target: '[data-guide="review-visibility"]' },
  ] },
  reviewEdit: { id: 'review-edit', name: '리뷰 수정', steps: [
    { title: '기록 다시 다듬기', description: '별점과 후기를 고치고 사진을 추가하거나 삭제할 수 있어요. 상세 기록과 느낌도 수정할 수 있어요.', target: '[data-guide="edit-review-fields"]' },
    { title: '공개 범위 확인하기', description: '나만 보기 리뷰에도 사진을 올릴 수 있어요. 공개 범위를 바꾼 뒤 저장하면 변경 내용이 반영돼요.', target: '[data-guide="edit-review-visibility"]' },
  ] },
  me: { id: 'me', name: '마이페이지', steps: [
    { title: '내 활동 확인하기', description: '공개 리뷰 수와 다른 사용자가 ‘도움이 돼요’를 누른 내 공개 리뷰 수를 볼 수 있어요.', target: '[data-guide="me-activity"]' },
    { title: '나의 와인 셀러', description: '공개·나만 보기 기록을 합쳐 서로 다른 와인 수를 세요. 같은 와인을 여러 번 기록해도 한 병이에요. 오른쪽은 와키에 쌓인 전체 공개 리뷰 수예요.', target: '[data-guide="me-cellar"]' },
    { title: '내 기록 다시 보기', description: '좋아요한 와인과 내가 쓴 리뷰를 열어볼 수 있어요.', target: '[data-guide="me-records"]' },
    { title: '내 취향 분석', description: '내가 4점 이상 준 와인의 바디·당도·산도·탄닌을 평균내요. 같은 와인을 여러 번 기록했다면 최신 별점을 기준으로 하고, 특징이 없는 와인은 계산에서 빼요. 화이트 탭에는 스파클링도 포함돼요.', target: '[data-guide="me-taste"] h3' },
    { title: '좋아한 와인의 키워드', description: '4점 이상 준 와인의 리뷰에서 내가 선택한 느낌 태그예요. 자주 선택한 키워드일수록 크게 보여요.', target: '[data-guide="me-keywords"] h3' },
  ] },
  profile: { id: 'profile', name: '프로필 수정', steps: [
    { title: '프로필 바꾸기', description: '닉네임과 프로필 사진을 바꾼 뒤 저장할 수 있어요.', target: 'main input[placeholder="닉네임을 입력하세요"]' },
    { title: '아이디 찾기용 번호', description: '휴대폰 인증 서비스가 활성화되면 번호를 인증해 등록할 수 있어요. 등록은 선택 사항이며 아이디 찾기에 사용돼요.', target: 'main input[aria-label="휴대폰 번호"]' },
  ] },
  myWines: { id: 'my-wines', name: '좋아요한 와인', steps: [
    { title: '저장한 와인 보기', description: '와인 상세에서 하트를 누른 와인이 모여 있어요. 사진을 누르면 와인 상세로 이동해요.', target: 'main h2' },
  ] },
  myReviews: { id: 'my-reviews', name: '내 리뷰', steps: [
    { title: '내 기록 다시 보기', description: '내가 남긴 공개·나만 보기 리뷰를 확인하세요. 사진을 누르면 상세 기록으로 이동해요.', target: 'main h2' },
  ] },
  wineNew: { id: 'wine-new', name: '와인 등록', steps: [
    { title: '등록 전 확인하기', description: '검색어를 입력하고 엔터를 눌러 같은 와인이 이미 있는지 먼저 확인해 주세요.', target: 'main h2' },
    { title: '기본 정보 입력하기', description: '와인 종류와 영문·한글 이름을 입력하세요. 사진·원산지·품종도 알면 함께 입력해 주세요.', target: '[data-guide="wine-new-info"]' },
    { title: '등록 완료', description: '등록한 와인은 상세 화면에서 확인하고 리뷰를 남길 수 있어요.', target: 'main button[type="submit"]' },
  ] },
  login: { id: 'login', name: '로그인', steps: [
    { title: '이메일로 로그인', description: '가입한 이메일과 비밀번호를 입력하세요.', target: 'main input[type="email"]' },
    { title: '카카오로 로그인', description: '카카오 계정을 사용할 수도 있어요. 같은 이메일의 기존 계정이 있다면 연결을 위해 기존 비밀번호 확인이 필요할 수 있어요.', target: 'main button' },
    { title: '계정 찾기', description: '아이디 찾기는 인증해 등록한 휴대폰 번호가 있어야 해요. 재설정 메일 기능이 활성화되면 가입 이메일로 비밀번호를 바꿀 수 있어요.', target: 'main input[type="password"]' },
  ] },
  signup: { id: 'signup', name: '회원가입', steps: [
    { title: '이메일 인증하기', description: '이메일 가입 시 인증번호를 받아 입력해 주세요. 인증번호는 10분간 유효해요.', target: 'main input[type="email"]' },
    { title: '아이디 찾기용 번호', description: '휴대폰 번호 등록은 선택 사항이에요. 문자 인증 서비스가 활성화되면 등록해 이메일 아이디 찾기에 쓸 수 있어요. 광고 문자에는 사용하지 않아요.', target: 'main details summary' },
    { title: '약관 확인 후 가입', description: '개인정보처리방침과 이용약관을 확인하고 동의해 주세요. 카카오로 시작할 수도 있어요.', target: 'main button[type="submit"]' },
  ] },
  findEmail: { id: 'find-email', name: '아이디 찾기', steps: [
    { title: '등록한 번호로 찾기', description: '가입하거나 프로필에서 인증해 등록한 휴대폰 번호로 인증번호를 받고, 확인하면 로그인 이메일을 볼 수 있어요. 문자 인증 서비스가 준비 중이면 사용할 수 없어요.', target: 'main input[type="tel"]' },
  ] },
  forgotPassword: { id: 'forgot-password', name: '비밀번호 찾기', steps: [
    { title: '재설정 링크 받기', description: '가입 이메일을 입력하면 비밀번호 재설정 링크를 받을 수 있어요. 메일 발송이 준비 중이면 사용할 수 없어요. 카카오로만 가입했다면 카카오로 로그인해 주세요.', target: 'main input[type="email"]' },
  ] },
  resetPassword: { id: 'reset-password', name: '비밀번호 재설정', steps: [
    { title: '새 비밀번호 정하기', description: '메일로 받은 링크를 열고 새 비밀번호를 두 번 입력해 변경하세요. 링크가 만료됐다면 다시 요청해 주세요.', target: 'main input[type="password"]' },
  ] },
  kakaoLink: { id: 'kakao-link', name: '카카오 계정 연결', autoOpen: false, steps: [
    { title: '기존 기록 이어 쓰기', description: '같은 이메일의 기존 계정이 있다면 기존 계정 비밀번호로 확인한 뒤 카카오를 연결할 수 있어요.', target: 'main input[type="password"]' },
  ] },
  feedback: { id: 'feedback', name: '피드백', steps: [
    { title: '의견 남기기', description: '불편했던 점이나 필요한 기능을 자유롭게 적어 주세요. 어떤 화면에서 겪었는지 함께 적으면 확인에 도움이 돼요.', target: 'main textarea' },
    { title: '보내기 전 확인', description: '10~2,000자로 작성하고 개인정보나 비밀번호는 적지 마세요.', target: 'main button[type="submit"]' },
  ] },
  guide: { id: 'guide', name: '사용 가이드', autoOpen: false, steps: [
    { title: '필요한 설명만 펼쳐 보세요', description: '와인 찾기, 기록하기, 내 기록 보기 등 궁금한 질문을 눌러 답을 확인하세요.', target: 'main details' },
  ] },
  terms: { id: 'terms', name: '이용약관', autoOpen: false, steps: [
    { title: '서비스 이용약관', description: '와키피디아의 서비스 이용 조건을 이 페이지에서 확인할 수 있어요.', target: 'main h1' },
  ] },
  privacy: { id: 'privacy', name: '개인정보처리방침', autoOpen: false, steps: [
    { title: '개인정보 안내', description: '수집 항목, 이용 목적, 보유 기간과 권리 행사 방법을 이 페이지에서 확인할 수 있어요.', target: 'main h1' },
  ] },
  chat: { id: 'chat', name: '채팅', autoOpen: false, steps: [
    { title: '준비 중인 기능', description: '이 화면은 아직 개발 중인 데모예요. 실제 문의나 의견은 ‘피드백 남기기’에서 보내주세요.' },
  ] },
  wineEdit: { id: 'wine-edit', name: '와인 수정', autoOpen: false, steps: [
    { title: '준비 중인 기능', description: '와인 수정 화면은 아직 개발 중이에요.' },
  ] },
  searchFilters: { id: 'search-filters', name: '검색 필터', autoOpen: false, steps: [
    { title: '검색 화면에서 필터 사용하기', description: '실제 검색 필터는 검색 화면의 ‘검색 필터’ 버튼에서 사용해 주세요. 이 화면은 아직 준비 중이에요.' },
  ] },
};

export function getPageGuide(pathname: string): PageGuide | null {
  if (pathname === '/') return guides.home;
  if (pathname === '/search') return guides.search;
  if (pathname === '/search/filters') return guides.searchFilters;
  if (pathname === '/reviews') return guides.reviews;
  if (pathname === '/reviews/new') return guides.reviewWrite;
  if (/^\/reviews\/[^/]+$/.test(pathname)) return guides.reviewDetail;
  if (pathname === '/me') return guides.me;
  if (pathname === '/me/detail') return guides.profile;
  if (pathname === '/me/likes') return guides.myWines;
  if (pathname === '/me/reviews') return guides.myReviews;
  if (/^\/me\/reviews\/[^/]+\/edit$/.test(pathname)) return guides.reviewEdit;
  if (pathname === '/wines/new') return guides.wineNew;
  if (/^\/wines\/[^/]+\/edit$/.test(pathname)) return guides.wineEdit;
  if (/^\/wines\/[^/]+$/.test(pathname)) return guides.wine;
  if (pathname === '/auth/login') return guides.login;
  if (pathname === '/auth/signup') return guides.signup;
  if (pathname === '/auth/find-email') return guides.findEmail;
  if (pathname === '/auth/forgot-password') return guides.forgotPassword;
  if (pathname === '/auth/reset-password') return guides.resetPassword;
  if (pathname === '/auth/kakao/callback') return guides.kakaoLink;
  if (pathname === '/feedback') return guides.feedback;
  if (pathname === '/guide') return guides.guide;
  if (pathname === '/terms') return guides.terms;
  if (pathname === '/privacy') return guides.privacy;
  if (pathname === '/chat') return guides.chat;
  return null;
}
