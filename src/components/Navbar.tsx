import React, { useState } from 'react';
import { Utensils, Users, UserCheck, CalendarDays, ChevronDown, Check, LogIn, Sparkles, LogOut, ShieldCheck } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  currentUser: User;
  allUsers: User[];
  isRealFirebaseUser: boolean;
  pendingRequestsCount?: number;
  onSwitchUser?: (user: User) => void;
  activeTab: 'pots' | 'friends' | 'profile';
  setActiveTab: (tab: 'pots' | 'friends' | 'profile') => void;
  onOpenGoogleAuth?: () => void;
  onLogout: () => void;
  onCreatePotClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  allUsers,
  isRealFirebaseUser,
  pendingRequestsCount = 0,
  activeTab,
  setActiveTab,
  onLogout,
  onCreatePotClick,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-canvas/95 backdrop-blur-md border-b border-hairline">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              id="app-logo"
              onClick={() => setActiveTab('pots')}
              className="flex items-center gap-2.5 cursor-pointer select-none group"
            >
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-on-primary group-hover:scale-105 transition-transform">
                <Utensils className="w-5 h-5" />
              </div>
              <div>
                <span className="font-display text-xl text-ink flex items-center gap-1.5">
                  밥팟 <span className="text-body font-semibold text-sm tracking-normal px-1.5 py-0.5 rounded-md bg-surface-card border border-hairline">BobPot</span>
                </span>
                <p className="text-[11px] text-muted font-medium hidden sm:block">
                  친구 맞춤 맛집 필터링 & 실시간 투표
                </p>
              </div>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="flex items-center bg-surface-card p-1 rounded-xl border border-hairline">
            <button
              id="nav-pots-tab"
              onClick={() => setActiveTab('pots')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'pots'
                  ? 'bg-canvas text-ink shadow-xs'
                  : 'text-muted hover:text-ink'
              }`}
            >
              <CalendarDays className="w-4 h-4 text-brand-coral" />
              <span>식사 팟</span>
            </button>

            <button
              id="nav-friends-tab"
              onClick={() => setActiveTab('friends')}
              className={`relative flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'friends'
                  ? 'bg-canvas text-ink shadow-xs'
                  : 'text-muted hover:text-ink'
              }`}
            >
              <Users className="w-4 h-4 text-brand-lavender" />
              <span>친구 목록</span>
              {pendingRequestsCount > 0 && (
                <span className="ml-0.5 bg-error text-on-primary text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse shadow-2xs">
                  {pendingRequestsCount}
                </span>
              )}
            </button>

            <button
              id="nav-profile-tab"
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'profile'
                  ? 'bg-canvas text-ink shadow-xs'
                  : 'text-muted hover:text-ink'
              }`}
            >
              <UserCheck className="w-4 h-4 text-brand-teal" />
              <span>내 취향/알레르기</span>
            </button>
          </nav>

          {/* Right Action: User switcher & New Pot */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              id="btn-quick-new-pot"
              onClick={onCreatePotClick}
              className="hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-ink/85 text-on-primary text-xs sm:text-sm font-semibold transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>새 팟 만들기</span>
            </button>

            {/* Google Login Status / Account Profile Dropdown */}
            <div className="relative">
              <button
                id="user-account-switcher-btn"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-hairline bg-canvas hover:bg-surface-soft transition-colors"
                title="내 계정 정보"
              >
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-7 h-7 rounded-full object-cover border border-hairline"
                />
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-ink leading-tight flex items-center gap-1">
                    <span>{currentUser.name}</span>
                    <span className="text-[10px] text-brand-teal font-bold bg-brand-mint/40 px-1 py-0.2 rounded flex items-center gap-0.5">
                      <ShieldCheck className="w-2.5 h-2.5" />
                      구글 계정
                    </span>
                  </div>
                  <div className="text-[10px] text-muted truncate max-w-[120px]">
                    {currentUser.email}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-muted-soft hidden sm:block" />
              </button>

              {showUserDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserDropdown(false)}
                  />
                  <div className="absolute right-0 mt-2 w-72 bg-canvas rounded-2xl shadow-xl border border-hairline py-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 pb-3 border-b border-hairline">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-muted-soft uppercase tracking-wider">
                          내 계정 정보
                        </span>
                        <span className="text-[10px] text-brand-teal font-bold bg-brand-mint/30 border border-brand-mint px-1.5 py-0.5 rounded">
                          Google 연동
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <img
                          src={currentUser.avatar}
                          alt={currentUser.name}
                          className="w-10 h-10 rounded-full object-cover border border-hairline"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-ink truncate">
                            {currentUser.name}
                          </div>
                          <div className="text-xs text-muted truncate">
                            {currentUser.email}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-2 space-y-1">
                      <button
                        onClick={() => {
                          setActiveTab('profile');
                          setShowUserDropdown(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-body hover:bg-surface-soft transition-colors"
                      >
                        <UserCheck className="w-4 h-4 text-brand-teal" />
                        <span>내 취향 & 알레르기 설정하기</span>
                      </button>

                      <button
                        id="btn-navbar-logout"
                        onClick={() => {
                          setShowUserDropdown(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-error hover:bg-error/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Google 계정 로그아웃</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
