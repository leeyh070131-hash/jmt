import React, { useState } from 'react';
import {
  Heart,
  Ban,
  AlertTriangle,
  Clock,
  Plus,
  X,
  Sparkles,
  Info,
  Calendar,
  Trash2,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { User, RecentMeal, MealSlot } from '../types';
import { COMMON_ALLERGIES, POPULAR_FOODS, getRelativeDate } from '../data/mockData';

interface ProfileTabProps {
  currentUser: User;
  onUpdateUser: (updated: User) => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ currentUser, onUpdateUser }) => {
  const [newFavoriteInput, setNewFavoriteInput] = useState('');
  const [newDislikeInput, setNewDislikeInput] = useState('');
  const [newCustomAllergy, setNewCustomAllergy] = useState('');
  const [lastSavedTime, setLastSavedTime] = useState<string>('저장됨');
  const [showSaveToast, setShowSaveToast] = useState(false);

  const triggerSaveNotify = () => {
    const timeStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLastSavedTime(timeStr);
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 2500);
  };

  // Form state for recent meal
  const [recentMealName, setRecentMealName] = useState('');
  const [recentMealDate, setRecentMealDate] = useState(getRelativeDate(0));
  const [recentMealSlot, setRecentMealSlot] = useState<MealSlot>('LUNCH');

  // Handlers for Favorites
  const handleAddFavorite = (food: string) => {
    const trimmed = food.trim();
    if (!trimmed) return;
    if (currentUser.favoriteFoods.includes(trimmed)) return;
    const updated = {
      ...currentUser,
      favoriteFoods: [...currentUser.favoriteFoods, trimmed],
      // Remove from dislikes if present
      dislikedFoods: currentUser.dislikedFoods.filter((f) => f !== trimmed),
    };
    onUpdateUser(updated);
    triggerSaveNotify();
    setNewFavoriteInput('');
  };

  const handleRemoveFavorite = (food: string) => {
    onUpdateUser({
      ...currentUser,
      favoriteFoods: currentUser.favoriteFoods.filter((f) => f !== food),
    });
    triggerSaveNotify();
  };

  // Handlers for Dislikes
  const handleAddDislike = (food: string) => {
    const trimmed = food.trim();
    if (!trimmed) return;
    if (currentUser.dislikedFoods.includes(trimmed)) return;
    const updated = {
      ...currentUser,
      dislikedFoods: [...currentUser.dislikedFoods, trimmed],
      // Remove from favorites if present
      favoriteFoods: currentUser.favoriteFoods.filter((f) => f !== trimmed),
    };
    onUpdateUser(updated);
    triggerSaveNotify();
    setNewDislikeInput('');
  };

  const handleRemoveDislike = (food: string) => {
    onUpdateUser({
      ...currentUser,
      dislikedFoods: currentUser.dislikedFoods.filter((f) => f !== food),
    });
    triggerSaveNotify();
  };

  // Handlers for Allergies
  const handleToggleAllergy = (allergy: string) => {
    const exists = currentUser.allergies.includes(allergy);
    const updated = exists
      ? currentUser.allergies.filter((a) => a !== allergy)
      : [...currentUser.allergies, allergy];
    onUpdateUser({
      ...currentUser,
      allergies: updated,
    });
    triggerSaveNotify();
  };

  const handleAddCustomAllergy = () => {
    const trimmed = newCustomAllergy.trim();
    if (!trimmed) return;
    if (!currentUser.allergies.includes(trimmed)) {
      onUpdateUser({
        ...currentUser,
        allergies: [...currentUser.allergies, trimmed],
      });
      triggerSaveNotify();
    }
    setNewCustomAllergy('');
  };

  // Handlers for Recent Meals
  const handleAddRecentMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recentMealName.trim()) return;

    const newMeal: RecentMeal = {
      id: `rm-${Date.now()}`,
      foodName: recentMealName.trim(),
      date: recentMealDate,
      mealSlot: recentMealSlot,
    };

    onUpdateUser({
      ...currentUser,
      recentMeals: [newMeal, ...currentUser.recentMeals],
    });
    triggerSaveNotify();

    setRecentMealName('');
  };

  const handleRemoveRecentMeal = (id: string) => {
    onUpdateUser({
      ...currentUser,
      recentMeals: currentUser.recentMeals.filter((m) => m.id !== id),
    });
    triggerSaveNotify();
  };

  // Manual save confirmation button
  const handleManualSave = () => {
    onUpdateUser({ ...currentUser });
    triggerSaveNotify();
  };

  // Check if a recent meal is within the last 3 days
  const isWithin3Days = (mealDateStr: string) => {
    const now = new Date();
    const mealDate = new Date(mealDateStr);
    const diffTime = Math.abs(now.getTime() - mealDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-in fade-in duration-200">
      {/* User Header Card */}
      <div className="bg-canvas rounded-3xl p-6 sm:p-8 border border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="relative">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-hairline"
            />
            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-success border-2 border-canvas rounded-full"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-ink">
                {currentUser.name}
              </h2>
              <span className="text-xs bg-brand-peach/30 text-ink font-semibold px-2 py-0.5 rounded-md">
                구글 연동 완료
              </span>
            </div>
            <p className="text-sm text-muted font-medium mt-0.5">{currentUser.email}</p>
            <div className="flex items-center gap-4 mt-3 text-xs text-body font-medium">
              <span>선호 메뉴 <strong className="text-ink font-bold">{currentUser.favoriteFoods.length}</strong>개</span>
              <span>•</span>
              <span>알레르기 <strong className="text-error font-bold">{currentUser.allergies.length}</strong>건</span>
              <span>•</span>
              <span>최근 식사 <strong className="text-body-strong font-bold">{currentUser.recentMeals.length}</strong>개</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 sm:max-w-xs w-full">
          <div className="bg-brand-ochre/20 border border-brand-ochre/50 rounded-2xl p-4 text-xs text-ink leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold mb-1 text-ink">
              <Sparkles className="w-4 h-4 text-brand-ochre flex-shrink-0" />
              <span>밥팟 스마트 필터링 규칙</span>
            </div>
            팟 결성 시 <strong>알레르기</strong>는 100% 제외, <strong>비선호</strong>도 배제됩니다. 최근 3일 이내 먹은 메뉴는 제외되지만, <strong>선호 메뉴에 등록되어 있다면 구제</strong>되어 추천될 수 있습니다!
          </div>

          {/* Cloud & Storage Persistence Status */}
          <div className="bg-brand-mint/20 border border-brand-mint/60 rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-brand-teal">
              <ShieldCheck className="w-4 h-4 text-brand-teal flex-shrink-0" />
              <div>
                <div className="flex items-center gap-1 font-bold">
                  <span>영구 보관 활성화</span>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-teal animate-pulse"></span>
                </div>
                <p className="text-[10px] font-medium leading-tight opacity-80">
                  재로그인·새로고침 시에도 변동 없이 영구 보존
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleManualSave}
              className="px-2.5 py-1.5 rounded-xl bg-brand-teal hover:bg-brand-teal/85 text-on-primary text-[11px] font-bold transition-colors flex items-center gap-1 flex-shrink-0 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{lastSavedTime === '저장됨' ? '저장 확인' : lastSavedTime}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Save Toast Notification */}
      {showSaveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-on-primary px-4 py-3 rounded-2xl shadow-xl border border-ink/40 flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-brand-mint flex-shrink-0" />
          <span>취향 및 알레르기 설정이 클라우드에 영구 저장되었습니다!</span>
        </div>
      )}

      {/* Grid: Allergies & Favorite/Dislike */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        {/* 1. Allergies */}
        <section className="bg-canvas rounded-3xl p-6 border border-hairline space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-error/10 text-error flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">알레르기 정보</h3>
                <p className="text-xs text-muted">
                  팟 추천 시 해당 식재료가 포함된 모든 메뉴가 원천 차단됩니다.
                </p>
              </div>
            </div>
          </div>

          {/* Quick toggle chips */}
          <div className="flex flex-wrap gap-2 pt-1">
            {COMMON_ALLERGIES.map((allergy) => {
              const isSelected = currentUser.allergies.includes(allergy);
              return (
                <button
                  key={allergy}
                  onClick={() => handleToggleAllergy(allergy)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-error text-on-primary scale-102 ring-2 ring-error/30'
                      : 'bg-surface-card text-body hover:bg-surface-strong'
                  }`}
                >
                  {allergy}
                </button>
              );
            })}
          </div>

          {/* Custom allergy input */}
          <div className="flex gap-2 pt-2">
            <input
              type="text"
              placeholder="직접 입력 (예: 복숭아, 특정 향신료)"
              value={newCustomAllergy}
              onChange={(e) => setNewCustomAllergy(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustomAllergy()}
              className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-hairline focus:outline-none focus:ring-2 focus:ring-error/30 bg-canvas"
            />
            <button
              onClick={handleAddCustomAllergy}
              className="px-3.5 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-ink/85 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>추가</span>
            </button>
          </div>

          {/* Active Allergy Tags */}
          <div className="pt-2 border-t border-hairline">
            <p className="text-xs font-semibold text-muted-soft mb-2">현재 등록된 알레르기:</p>
            {currentUser.allergies.length === 0 ? (
              <p className="text-xs text-muted-soft italic">등록된 알레르기가 없습니다.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {currentUser.allergies.map((a) => (
                  <span
                    key={a}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-error/10 text-error text-xs font-bold border border-error/30"
                  >
                    <span>{a}</span>
                    <button
                      onClick={() => handleToggleAllergy(a)}
                      className="hover:opacity-70"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 2. Preferences: Favorites & Dislikes */}
        <div className="space-y-6">
          {/* Favorite Foods */}
          <section className="bg-canvas rounded-3xl p-6 border border-hairline space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-brand-peach/30 text-ink flex items-center justify-center">
                <Heart className="w-4 h-4 fill-ink" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">선호 메뉴 (최애 음식)</h3>
                <p className="text-xs text-muted">
                  최근 3일 내에 먹었어도 선호 메뉴라면 추천에서 제외되지 않습니다!
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="좋아하는 메뉴 (예: 삼겹살, 초밥, 파스타)"
                value={newFavoriteInput}
                onChange={(e) => setNewFavoriteInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddFavorite(newFavoriteInput)}
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-hairline focus:outline-none focus:ring-2 focus:ring-ink/20 bg-canvas"
              />
              <button
                onClick={() => handleAddFavorite(newFavoriteInput)}
                className="px-3.5 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-ink/85 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>추가</span>
              </button>
            </div>

            {/* Favorite tags */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {currentUser.favoriteFoods.length === 0 ? (
                <p className="text-xs text-muted-soft italic">등록된 선호 메뉴가 없습니다. 좋아하는 음식을 추가해보세요!</p>
              ) : (
                currentUser.favoriteFoods.map((f) => (
                  <span
                    key={f}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-peach/25 text-ink text-xs font-semibold border border-brand-peach/50"
                  >
                    <span>{f}</span>
                    <button
                      onClick={() => handleRemoveFavorite(f)}
                      className="hover:opacity-70"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Quick popular suggestions */}
            <div className="pt-2 border-t border-hairline">
              <p className="text-[11px] text-muted-soft font-medium mb-1.5">인기 메뉴 빠른 추가:</p>
              <div className="flex flex-wrap gap-1">
                {POPULAR_FOODS.slice(0, 8).map((food) => {
                  if (currentUser.favoriteFoods.includes(food)) return null;
                  return (
                    <button
                      key={food}
                      onClick={() => handleAddFavorite(food)}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-surface-card text-body hover:bg-brand-peach/30 hover:text-ink transition-colors"
                    >
                      + {food}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Disliked Foods */}
          <section className="bg-canvas rounded-3xl p-6 border border-hairline space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-surface-card text-body flex items-center justify-center">
                <Ban className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">비선호 메뉴</h3>
                <p className="text-xs text-muted">
                  팟 구성원 중 한 명이라도 비선호하는 메뉴는 추천에서 배제됩니다.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="꺼려지는 메뉴 (예: 마라탕, 오이, 닭발)"
                value={newDislikeInput}
                onChange={(e) => setNewDislikeInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddDislike(newDislikeInput)}
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-hairline focus:outline-none focus:ring-2 focus:ring-ink/20 bg-canvas"
              />
              <button
                onClick={() => handleAddDislike(newDislikeInput)}
                className="px-3.5 py-2 rounded-xl bg-body-strong text-on-primary text-xs font-semibold hover:bg-ink transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>추가</span>
              </button>
            </div>

            {/* Dislike tags */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {currentUser.dislikedFoods.length === 0 ? (
                <p className="text-xs text-muted-soft italic">비선호 메뉴가 없습니다.</p>
              ) : (
                currentUser.dislikedFoods.map((f) => (
                  <span
                    key={f}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-card text-body text-xs font-semibold border border-hairline"
                  >
                    <span>{f}</span>
                    <button
                      onClick={() => handleRemoveDislike(f)}
                      className="hover:text-ink"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      {/* 3. Recent Meals (3-day Food Log) */}
      <section className="bg-canvas rounded-3xl p-6 sm:p-8 border border-hairline space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-lavender/25 text-ink flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-ink">최근 먹은 메뉴 기록</h3>
              <p className="text-xs text-muted">
                지난 3일간 먹은 메뉴는 자동으로 추천 후보에서 제외됩니다 (단, 선호 메뉴는 예외로 유지).
              </p>
            </div>
          </div>
          <span className="text-xs bg-brand-lavender/20 text-ink border border-brand-lavender/50 font-semibold px-3 py-1 rounded-full self-start sm:self-auto">
            3일 규칙 적용 중
          </span>
        </div>

        {/* Add Recent Meal Form */}
        <form
          onSubmit={handleAddRecentMeal}
          className="bg-surface-card p-4 rounded-2xl border border-hairline flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
        >
          <input
            type="text"
            required
            placeholder="음식 이름 (예: 김치찌개, 샌드위치)"
            value={recentMealName}
            onChange={(e) => setRecentMealName(e.target.value)}
            className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-hairline bg-canvas focus:outline-none focus:ring-2 focus:ring-ink/20"
          />

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={recentMealDate}
              onChange={(e) => setRecentMealDate(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-hairline bg-canvas focus:outline-none focus:ring-2 focus:ring-ink/20 text-body"
            />

            <select
              value={recentMealSlot}
              onChange={(e) => setRecentMealSlot(e.target.value as MealSlot)}
              className="px-3 py-2 text-xs rounded-xl border border-hairline bg-canvas focus:outline-none focus:ring-2 focus:ring-ink/20 text-body font-medium"
            >
              <option value="BREAKFAST">🌅 아침</option>
              <option value="LUNCH">☀️ 점심</option>
              <option value="DINNER">🌙 저녁</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-primary hover:bg-ink/85 text-on-primary text-xs font-semibold transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>기록</span>
            </button>
          </div>
        </form>

        {/* Recent Meals List */}
        <div className="space-y-2">
          {currentUser.recentMeals.length === 0 ? (
            <div className="text-center py-8 text-muted-soft text-xs">
              최근 식사 기록이 없습니다. 오늘이나 어제 드신 음식을 추가해보세요.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {currentUser.recentMeals.map((meal) => {
                const recent = isWithin3Days(meal.date);
                const isFavorite = currentUser.favoriteFoods.some((fav) =>
                  meal.foodName.toLowerCase().includes(fav.toLowerCase())
                );

                return (
                  <div
                    key={meal.id}
                    className="p-3 rounded-2xl bg-canvas border border-hairline flex items-center justify-between hover:border-ink/20 transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-ink text-sm truncate">
                          {meal.foodName}
                        </span>
                        {recent ? (
                          isFavorite ? (
                            <span className="text-[10px] font-bold text-brand-teal bg-brand-mint/25 px-1.5 py-0.5 rounded border border-brand-mint">
                              선호 구제됨 ✨
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-brand-ochre bg-brand-ochre/15 px-1.5 py-0.5 rounded border border-brand-ochre/50">
                              3일 이내 제외 🚫
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] font-medium text-muted-soft bg-surface-card px-1.5 py-0.5 rounded">
                            3일 경과
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-soft flex items-center gap-1.5 mt-0.5">
                        <span>{meal.date}</span>
                        <span>•</span>
                        <span>
                          {meal.mealSlot === 'BREAKFAST'
                            ? '아침'
                            : meal.mealSlot === 'DINNER'
                            ? '저녁'
                            : '점심'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveRecentMeal(meal.id)}
                      className="text-muted-soft hover:text-error p-1.5 rounded-lg hover:bg-error/10 transition-colors"
                      title="삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
