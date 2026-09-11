import React, { useState } from 'react';
import { Utensils, ShieldCheck, Users, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { loginWithGoogle } from '../lib/firebase';
import { syncUserProfile } from '../lib/firestoreService';
import { User } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const fbUser = await loginWithGoogle();
      const syncedUser = await syncUserProfile({
        uid: fbUser.uid,
        displayName: fbUser.displayName,
        email: fbUser.email,
        photoURL: fbUser.photoURL,
      });
      onLoginSuccess(syncedUser);
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMsg('로그인 팝업 창이 닫혔습니다. 다시 시도해주세요.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setErrorMsg('이전 요청이 진행 중입니다. 잠시 후 다시 눌러주세요.');
      } else {
        setErrorMsg(err.message || 'Google 로그인에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="max-w-md w-full bg-canvas rounded-3xl shadow-xl border border-hairline overflow-hidden">
        {/* Header Visual */}
        <div className="bg-brand-lavender p-8 text-ink text-center relative overflow-hidden">
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-canvas/70 backdrop-blur-md flex items-center justify-center text-ink border border-ink/10 shadow-md mb-4">
              <Utensils className="w-8 h-8" />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl flex items-center gap-2">
              밥팟 <span className="text-ink/60 text-lg font-medium">BobPot</span>
            </h1>
            <p className="text-ink/70 text-xs sm:text-sm mt-1.5 font-medium max-w-xs">
              친구들과 함께하는 실시간 식사 팟 & 취향 기반 맛집 투표
            </p>
          </div>
          {/* Subtle decorative circles */}
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-canvas/20 blur-xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-brand-peach/30 blur-xl pointer-events-none" />
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-brand-pink border border-hairline">
              <div className="w-8 h-8 rounded-xl bg-on-primary/15 text-on-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-on-primary">알레르기 & 비선호 100% 안심 배제</div>
                <div className="text-on-primary/80 mt-0.5 leading-relaxed">
                  참여 멤버의 기피 음식과 알레르기를 자동으로 계산해 안전한 맛집만 후보로 추천합니다.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-brand-peach border border-hairline">
              <div className="w-8 h-8 rounded-xl bg-ink/10 text-ink flex items-center justify-center flex-shrink-0 mt-0.5">
                <Users className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-ink">가짜 데이터 없는 진짜 친구 연동</div>
                <div className="text-body mt-0.5 leading-relaxed">
                  지어낸 유저 없이, 실제 구글 이메일로 친구를 맺고 실시간으로 식사 투표에 참여합니다.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-brand-ochre border border-hairline">
              <div className="w-8 h-8 rounded-xl bg-ink/10 text-ink flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-ink">클라우드 자동 저장</div>
                <div className="text-body mt-0.5 leading-relaxed">
                  한 번 설정한 취향과 식사 기록은 Firestore에 안전하게 보관되어 언제든 유지됩니다.
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-error/10 border border-error/30 flex items-center gap-2.5 text-xs text-error">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-error" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Google Sign-in Button */}
          <div className="space-y-3 pt-2">
            <button
              id="google-login-primary-btn"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-3.5 px-5 rounded-xl bg-canvas hover:bg-surface-soft border border-hairline hover:border-ink/30 text-ink font-semibold text-sm transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-ink" />
                  <span>Google 인증 진행 중...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Google 계정으로 계속하기</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-muted-soft">
              구글 공식 보안 인증(Firebase Authentication)을 사용합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
