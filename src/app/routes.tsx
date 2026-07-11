import { Route, Routes, useLocation } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { SideDrawer } from '@/components/layout/SideDrawer';
import { Home } from '@/pages/Home/Home';
import { LoginMobile } from '@/pages/Auth/LoginMobile';
import { SignupMobile } from '@/pages/Auth/SignupMobile';
import { KakaoCallback } from '@/pages/Auth/KakaoCallback';
import { SearchListMobile } from '@/pages/Search/SearchListMobile';
import { WineFilterListMobile } from '@/pages/Search/WineFilterListMobile';
import { WineReviewListMobile } from '@/pages/Reviews/WineReviewListMobile';
import { ReviewDetailMobile } from '@/pages/Reviews/ReviewDetailMobile';
import { WineReviewWriteMobile } from '@/pages/Reviews/WineReviewWriteMobile';
import { MyPageMobile } from '@/pages/Me/MyPageMobile';
import { MyPageDetailMobile } from '@/pages/Me/MyPageDetailMobile';
import { MyPageReviewEditMobile } from '@/pages/Me/MyPageReviewEditMobile';
import { WineRegistMobile } from '@/pages/Wines/WineRegistMobile';
import { WineRegistEditMobile } from '@/pages/Wines/WineRegistEditMobile';
import WineDetailMobile from '@/pages/Wines/WineDetailMobile';
import LikesFeedMobile from '@/pages/Me/LikesFeedMobile';
import MyReviewsFeedMobile from '@/pages/Me/MyReviewsFeedMobile';
import ChatMobile from '@/pages/Chat/ChatMobile';
import { useEffect, useState } from 'react';
import { SupportMobile } from '@/pages/Support/SupportMobile';
import { AdminApp } from '@/pages/Admin/AdminApp';

export function AppRoutes() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  const isAdmin = location.pathname.startsWith('/admin-panel');

  useEffect(() => {
    const handler = () => setDrawerOpen(true);
    window.addEventListener('open-drawer', handler as EventListener);
    return () => window.removeEventListener('open-drawer', handler as EventListener);
  }, []);

  if (isAdmin) {
    return (
      <Routes>
        <Route path="/admin-panel/*" element={<AdminApp />} />
      </Routes>
    );
  }

  return (
    <div className="relative">
      <Header onMenu={() => setDrawerOpen(true)} />
      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <main className="pt-16 pb-24">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth/login" element={<LoginMobile />} />
          <Route path="/auth/signup" element={<SignupMobile />} />
          <Route path="/auth/kakao/callback" element={<KakaoCallback />} />
          <Route path="/search" element={<SearchListMobile />} />
          <Route path="/search/filters" element={<WineFilterListMobile />} />
          <Route path="/reviews" element={<WineReviewListMobile />} />
          <Route path="/reviews/new" element={<WineReviewWriteMobile />} />
          <Route path="/reviews/:id" element={<ReviewDetailMobile />} />
          <Route path="/me" element={<MyPageMobile />} />
          <Route path="/me/detail" element={<MyPageDetailMobile />} />
          <Route path="/me/reviews/:id/edit" element={<MyPageReviewEditMobile />} />
          <Route path="/wines/new" element={<WineRegistMobile />} />
          <Route path="/wines/:id/edit" element={<WineRegistEditMobile />} />
          <Route path="/wines/:id" element={<WineDetailMobile />} />
          <Route path="/me/likes" element={<LikesFeedMobile />} />
          <Route path="/me/reviews" element={<MyReviewsFeedMobile />} />
          <Route path="/chat" element={<ChatMobile />} />
          <Route path="/support" element={<SupportMobile />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}


