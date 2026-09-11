import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Sparkles,
  AlertTriangle,
  Heart,
  Ban,
  ThumbsUp,
  CheckCircle,
  ExternalLink,
  Crown,
  Share2,
  RefreshCw,
  Check,
  Flame,
  Star,
  Trash2,
} from 'lucide-react';
import { MealPot, User, MealSlot, RestaurantRecommendation } from '../types';
import { fetchOrGenerateRecommendations } from '../lib/recommendationGenerator';

interface PotDetailViewProps {
  pot: MealPot;
  allUsers: User[];
  currentUser: User;
  onBack: () => void;
  onUpdatePot: (updated: MealPot) => void;
  onDeletePot?: (potId: string) => void;
  onSwitchUser?: (user: User) => void;
}

export const PotDetailView: React.FC<PotDetailViewProps> = ({
  pot,
  allUsers,
  currentUser,
  onBack,
  onUpdatePot,
  onDeletePot,
}) => {
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [showMemberDetails, setShowMemberDetails] = useState(false);
  const [copyNotice, setCopyNotice] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const isHost = pot.hostId === currentUser.id;

  // Resolved member objects (ensuring current user is safely included)
  const members = pot.memberIds
    .map((id) => (id === currentUser.id ? currentUser : allUsers.find((u) => u.id === id)))
    .filter((u): u is User => Boolean(u));

  const host = allUsers.find((u) => u.id === pot.hostId) || members[0] || currentUser;

  const slotLabels: Record<MealSlot, { name: string; icon: string }> = {
    BREAKFAST: { name: '아침', icon: '🌅' },
    LUNCH: { name: '점심', icon: '☀️' },
    DINNER: { name: '저녁', icon: '🌙' },
  };

  // Run AI Recommendation and Filtering (Never fails with error alert)
  const handleGenerateRecommendations = async () => {
    setIsLoadingRecs(true);
    setLoadingStep(1);

    const stepTimer1 = setTimeout(() => setLoadingStep(2), 800);
    const stepTimer2 = setTimeout(() => setLoadingStep(3), 1600);

    try {
      const { filterAnalysis, recommendations } = await fetchOrGenerateRecommendations(
        pot.locationName,
        pot.slot,
        pot.date,
        members
      );

      const updatedPot: MealPot = {
        ...pot,
        status: 'VOTING',
        filterAnalysis,
        recommendations,
        confirmedWinnerId: undefined, // Reset winner on new recommendation
      };

      onUpdatePot(updatedPot);
    } catch (err) {
      console.error('Failed to get recommendations:', err);
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setIsLoadingRecs(false);
      setLoadingStep(0);
    }
  };

  // Auto-generate recommendations if the pot was loaded with 0 recommendations
  useEffect(() => {
    if ((!pot.recommendations || pot.recommendations.length === 0) && !isLoadingRecs) {
      handleGenerateRecommendations();
    }
  }, [pot.id]);

  // Vote for a candidate
  const handleVote = (recId: string) => {
    if (pot.status === 'CONFIRMED') return;

    const updatedRecs = pot.recommendations.map((rec) => {
      // Remove current user vote from all options
      const filteredVotes = rec.votes.filter((v) => v !== currentUser.id);
      // Add current user vote to the selected option
      if (rec.id === recId) {
        return { ...rec, votes: [...filteredVotes, currentUser.id] };
      }
      return { ...rec, votes: filteredVotes };
    });

    const updatedPot: MealPot = {
      ...pot,
      recommendations: updatedRecs,
    };

    onUpdatePot(updatedPot);
  };

  // Confirm final winning location
  const handleConfirmWinner = (recId: string) => {
    const updatedPot: MealPot = {
      ...pot,
      status: 'CONFIRMED',
      confirmedWinnerId: recId,
    };
    onUpdatePot(updatedPot);
  };

  // Winner calculation
  const getLeader = () => {
    if (pot.recommendations.length === 0) return null;
    let maxVotes = -1;
    let leader: RestaurantRecommendation | null = null;
    pot.recommendations.forEach((r) => {
      if (r.votes.length > maxVotes) {
        maxVotes = r.votes.length;
        leader = r;
      }
    });
    return maxVotes > 0 ? leader : null;
  };

  const leader = getLeader();
  const confirmedWinner = pot.recommendations.find((r) => r.id === pot.confirmedWinnerId);

  // Copy plan for sharing
  const handleSharePlan = () => {
    const text = `[밥팟] ${pot.title}\n📅 일시: ${pot.date} ${slotLabels[pot.slot].name}\n📍 위치: ${pot.locationName}\n👥 멤버: ${members.map((m) => m.name).join(', ')}\n${
      confirmedWinner
        ? `🏆 확정 식당: ${confirmedWinner.name} (${confirmedWinner.recommendedDish})`
        : '투표가 진행 중입니다!'
    }`;
    navigator.clipboard.writeText(text);
    setCopyNotice(true);
    setTimeout(() => setCopyNotice(false), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-in fade-in duration-200">
      {/* Top bar with back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-body hover:text-ink px-3 py-1.5 rounded-xl hover:bg-surface-card transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>식사 팟 목록으로 돌아가기</span>
        </button>

        <div className="flex items-center gap-2">
          {copyNotice && (
            <span className="text-xs font-bold text-brand-teal bg-brand-mint/30 px-2.5 py-1 rounded-lg border border-brand-mint">
              클립보드에 복사되었습니다!
            </span>
          )}
          <button
            onClick={handleSharePlan}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-body bg-canvas hover:bg-surface-soft border border-hairline rounded-xl transition-colors"
          >
            <Share2 className="w-3.5 h-3.5 text-muted" />
            <span>계획 공유하기</span>
          </button>
          {isHost && onDeletePot && (
            <button
              onClick={() => setIsConfirmingDelete(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-error bg-error/10 hover:bg-error/15 border border-error/30 rounded-xl transition-colors"
              title="내가 만든 식사 팟 취소하기"
            >
              <Trash2 className="w-3.5 h-3.5 text-error" />
              <span>식사 팟 취소</span>
            </button>
          )}
        </div>
      </div>

      {/* Hero Card for Pot Details */}
      <div className="bg-canvas rounded-3xl p-6 sm:p-8 border border-hairline space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold bg-brand-peach/30 text-ink px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                <span>{slotLabels[pot.slot].icon}</span>
                <span>{slotLabels[pot.slot].name}</span>
              </span>
              <span className="text-xs font-semibold text-muted-soft">
                호스트: {host.name}
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl text-ink">
              {pot.title}
            </h1>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {pot.status === 'CONFIRMED' ? (
              <span className="px-3.5 py-1.5 rounded-xl bg-brand-mint/25 text-brand-teal font-bold text-xs border border-brand-mint flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-brand-teal" />
                <span>장소 확정됨</span>
              </span>
            ) : pot.status === 'VOTING' ? (
              <span className="px-3.5 py-1.5 rounded-xl bg-brand-lavender/25 text-ink font-bold text-xs border border-brand-lavender flex items-center gap-1.5">
                <ThumbsUp className="w-4 h-4 text-ink" />
                <span>투표 진행 중</span>
              </span>
            ) : (
              <span className="px-3.5 py-1.5 rounded-xl bg-surface-card text-body font-bold text-xs border border-hairline flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-brand-coral" />
                <span>팟 결성 완료</span>
              </span>
            )}
          </div>
        </div>

        {/* Metadata badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-hairline">
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-surface-card border border-hairline">
            <Calendar className="w-4 h-4 text-brand-coral flex-shrink-0" />
            <div>
              <div className="text-[10px] text-muted-soft font-semibold">약속 날짜</div>
              <div className="text-xs font-bold text-body-strong">{pot.date}</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-surface-card border border-hairline">
            <Clock className="w-4 h-4 text-brand-lavender flex-shrink-0" />
            <div>
              <div className="text-[10px] text-muted-soft font-semibold">시간대</div>
              <div className="text-xs font-bold text-body-strong">
                {slotLabels[pot.slot].icon} {slotLabels[pot.slot].name} 식사
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-surface-card border border-hairline">
            <MapPin className="w-4 h-4 text-brand-teal flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-muted-soft font-semibold">만날 위치</div>
              <div className="text-xs font-bold text-body-strong truncate">
                {pot.locationName}
              </div>
            </div>
          </div>
        </div>

        {/* Members Roster Accordion */}
        <div className="pt-2 border-t border-hairline space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-soft" />
              <span className="text-xs font-bold text-body">
                참여 멤버 ({members.length}명):
              </span>
              <div className="flex -space-x-1.5 overflow-hidden ml-1">
                {members.map((m) => (
                  <img
                    key={m.id}
                    src={m.avatar}
                    alt={m.name}
                    title={`${m.name} (${m.email})`}
                    className="w-6 h-6 rounded-full object-cover border-2 border-canvas"
                  />
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowMemberDetails(!showMemberDetails)}
              className="text-xs text-ink font-bold hover:text-brand-coral"
            >
              {showMemberDetails ? '멤버 취향 접기 ▲' : '멤버 취향/알레르기 펼치기 ▼'}
            </button>
          </div>

          {showMemberDetails && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 animate-in fade-in duration-150">
              {members.map((m) => {
                const isMe = m.id === currentUser.id;
                return (
                  <div
                    key={m.id}
                    className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
                      isMe ? 'bg-brand-peach/20 border-brand-peach/50' : 'bg-surface-card border-hairline'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={m.avatar}
                          alt={m.name}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                        <span className="font-bold text-ink">
                          {m.name} {isMe && '(나)'}
                        </span>
                      </div>
                      {isMe ? (
                        <span className="text-[10px] bg-brand-peach/40 text-ink font-bold px-1.5 py-0.5 rounded">
                          나
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-soft font-medium">
                          멤버
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-[11px]">
                      {m.allergies.length > 0 ? (
                        <div className="text-error font-bold">
                          ⚠️ 알레르기: {m.allergies.join(', ')}
                        </div>
                      ) : (
                        <div className="text-muted-soft">알레르기 없음</div>
                      )}

                      <div className="text-body truncate">
                        ❤️ 선호: {m.favoriteFoods.join(', ') || '없음'}
                      </div>

                      {m.dislikedFoods.length > 0 && (
                        <div className="text-muted truncate">
                          🚫 비선호: {m.dislikedFoods.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Confirmed Winner Announcement Card (if confirmed) */}
      {confirmedWinner && (
        <div className="bg-brand-teal rounded-3xl p-6 sm:p-8 text-on-primary space-y-4 animate-in zoom-in-95 duration-200">
          <div className="flex items-center gap-2">
            <Crown className="w-7 h-7 text-brand-ochre animate-bounce" />
            <span className="text-xs font-black uppercase tracking-wider bg-on-primary/15 px-3 py-1 rounded-full backdrop-blur-xs">
              최종 장소 확정
            </span>
          </div>

          <div className="space-y-2">
            <h2 className="font-display text-2xl sm:text-3xl text-on-primary">{confirmedWinner.name}</h2>
            <p className="text-sm text-on-primary/80 font-medium leading-relaxed">
              대표 메뉴: <strong>{confirmedWinner.recommendedDish}</strong> • {confirmedWinner.category}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-on-primary/10 backdrop-blur-md border border-on-primary/20 text-xs space-y-1.5">
            <div className="font-semibold text-brand-mint flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-brand-mint" />
              <span>선정 사유 & 팟 맞춤 검증</span>
            </div>
            <p className="text-on-primary leading-relaxed">{confirmedWinner.reason}</p>
            <div className="text-on-primary/70 text-[11px] pt-1 border-t border-on-primary/10 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{confirmedWinner.address}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href={confirmedWinner.mapSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl bg-canvas text-ink hover:bg-surface-soft font-black text-xs transition-all flex items-center gap-1.5"
            >
              <span>지도에서 위치 & 길찾기</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={handleSharePlan}
              className="px-4 py-2.5 rounded-xl bg-on-primary/15 hover:bg-on-primary/25 text-on-primary font-bold text-xs transition-colors flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>카톡/메신저로 공유하기</span>
            </button>
          </div>
        </div>
      )}

      {/* Action to Request Recommendations / Re-run */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-dark text-on-primary p-6 sm:p-7 rounded-3xl">
        <div className="space-y-1">
          <h3 className="text-base font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-ochre" />
            <span>AI 맞춤 필터링 및 2~3곳 추천</span>
          </h3>
          <p className="text-xs text-on-primary/70">
            멤버 {members.length}명의 알레르기·비선호·3일식사(선호구제)를 종합 분석하여 {pot.locationName} 근처 평점 4.5+ 식당을 선별합니다.
          </p>
        </div>

        <button
          id="btn-run-recommendations"
          onClick={handleGenerateRecommendations}
          disabled={isLoadingRecs}
          className={`px-6 py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            isLoadingRecs
              ? 'bg-surface-dark-elevated text-on-primary/40 cursor-not-allowed'
              : 'bg-canvas hover:bg-surface-soft text-ink active:scale-98'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${isLoadingRecs ? 'animate-spin' : ''}`} />
          <span>
            {isLoadingRecs
              ? loadingStep === 1
                ? '알레르기·비선호 식재료 검사 중...'
                : loadingStep === 2
                ? '3일 식사 이력 & 선호 구제 판정 중...'
                : '근처 평점 좋은 식당 2~3곳 탐색 중...'
              : pot.recommendations.length > 0
              ? '다른 식당 다시 추천받기'
              : '정보 취합 및 2~3곳 추천받기'}
          </span>
        </button>
      </div>

      {/* Filter Analysis Breakdown Box (투명한 필터링 과정 공개) */}
      {pot.filterAnalysis && (
        <div className="bg-canvas rounded-3xl p-6 border border-hairline space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-peach/30 text-ink flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-ink">식사 팟 데이터 정밀 취합 결과</h4>
              <p className="text-[11px] text-muted">{pot.filterAnalysis.summaryMessage}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* 1. Allergies */}
            <div className="p-4 rounded-2xl bg-error/5 border border-error/25 space-y-2">
              <div className="font-bold text-error flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-error" />
                <span>1. 알레르기 배제 (100% 차단)</span>
              </div>
              {pot.filterAnalysis.allergenExclusions.length === 0 ? (
                <p className="text-muted text-[11px]">배제된 알레르기 항목 없음</p>
              ) : (
                pot.filterAnalysis.allergenExclusions.map((a, idx) => (
                  <div key={idx} className="text-[11px] text-error space-y-0.5">
                    <div className="font-bold">
                      • {a.allergen} ({a.memberNames.join(', ')})
                    </div>
                    <div className="pl-3 opacity-80">
                      배제: {a.excludedDishes.slice(0, 3).join(', ')} 등
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 2. Dislikes */}
            <div className="p-4 rounded-2xl bg-surface-card border border-hairline space-y-2">
              <div className="font-bold text-body-strong flex items-center gap-1.5">
                <Ban className="w-3.5 h-3.5 text-muted" />
                <span>2. 비선호 메뉴 제외</span>
              </div>
              {pot.filterAnalysis.dislikeExclusions.length === 0 ? (
                <p className="text-muted text-[11px]">배제된 비선호 메뉴 없음</p>
              ) : (
                <div className="flex flex-wrap gap-1 pt-1">
                  {pot.filterAnalysis.dislikeExclusions.map((d, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-canvas text-body border border-hairline text-[11px]"
                    >
                      {d.dish} ({d.memberNames.join(',')})
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Recent Meals with Rescue Exception */}
            <div className="p-4 rounded-2xl bg-brand-lavender/15 border border-brand-lavender/40 space-y-2">
              <div className="font-bold text-ink flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-ink" />
                <span>3. 최근 3일 식사 & 선호 구제</span>
              </div>
              {pot.filterAnalysis.recentMealsEvaluated.length === 0 ? (
                <p className="text-muted text-[11px]">최근 3일 섭취 기록 없음</p>
              ) : (
                <div className="space-y-1.5 text-[11px]">
                  {pot.filterAnalysis.recentMealsEvaluated.map((r, idx) => (
                    <div key={idx} className="leading-snug">
                      {r.rescuedByFavorite ? (
                        <span className="text-brand-teal font-bold">
                          ✨ {r.dish} ({r.memberName}): {r.favoriteUserNames.join(',')} 선호메뉴로 구제 통과!
                        </span>
                      ) : (
                        <span className="text-body">
                          🚫 {r.dish} ({r.memberName}): 3일내 섭취로 제외
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Candidate Recommendations & Voting Section (2~3개 추천 식당) */}
      {pot.recommendations.length > 0 && (
        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xl font-bold text-ink flex items-center gap-2">
                <span>{pot.locationName} 추천 맛집 후보 (2~3곳)</span>
                <span className="text-xs bg-brand-peach/30 text-ink font-bold px-2 py-0.5 rounded-md">
                  실시간 투표 가능
                </span>
              </h3>
              <p className="text-xs text-muted">
                각 친구들이 원하는 식당에 투표할 수 있으며, 투표 결과에 따라 최종 장소를 확정할 수 있습니다.
              </p>
            </div>

            {/* Voting quick switch helper */}
            <div className="text-[11px] text-muted bg-surface-card px-3 py-1.5 rounded-xl border border-hairline self-start sm:self-auto flex items-center gap-1.5">
              <span>현재 투표자:</span>
              <strong className="text-ink font-bold">{currentUser.name}</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Cycle the 6-color feature-card palette across cards so the same brand color never repeats back-to-back */}
            {pot.recommendations.map((rec, index) => {
              const hasVoted = rec.votes.includes(currentUser.id);
              const isLeader = leader && leader.id === rec.id;
              const isConfirmed = pot.confirmedWinnerId === rec.id;
              const accentClasses = [
                'border-brand-lavender bg-brand-lavender/10',
                'border-brand-ochre bg-brand-ochre/10',
                'border-brand-peach bg-brand-peach/10',
              ];
              const accent = accentClasses[index % accentClasses.length];

              return (
                <div
                  key={rec.id}
                  className={`rounded-3xl p-6 border flex flex-col justify-between transition-all relative ${
                    isConfirmed
                      ? 'ring-3 ring-brand-teal border-brand-teal bg-brand-teal/5'
                      : isLeader
                      ? 'ring-1 ring-brand-ochre ' + accent
                      : accent + ' hover:border-ink/20'
                  }`}
                >
                  {/* Card badges */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary text-on-primary font-black text-xs flex items-center justify-center">
                        {index + 1}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {isConfirmed ? (
                          <span className="bg-brand-teal text-on-primary text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            최종 확정
                          </span>
                        ) : isLeader ? (
                          <span className="bg-brand-ochre text-ink text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Crown className="w-3 h-3 text-ink" />
                            현재 1위 ({rec.votes.length}표)
                          </span>
                        ) : null}

                        <span className="bg-canvas text-body text-[10px] font-bold px-2 py-0.5 rounded-full border border-hairline">
                          {rec.category}
                        </span>
                      </div>
                    </div>

                    {/* Restaurant Title & Rating */}
                    <div>
                      <h4 className="text-lg font-bold text-ink leading-snug">
                        {rec.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-0.5 text-xs font-bold text-ink">
                          <Star className="w-3.5 h-3.5 fill-brand-ochre text-brand-ochre" />
                          <span>{rec.rating.toFixed(1)}</span>
                        </span>
                        <span className="text-muted-soft">•</span>
                        <span className="text-xs text-muted font-medium">
                          {rec.priceRange}
                        </span>
                      </div>
                    </div>

                    {/* Recommended Dish */}
                    <div className="p-3 rounded-2xl bg-canvas border border-hairline">
                      <div className="text-[10px] font-bold text-muted uppercase tracking-wider">
                        추천 대표 메뉴
                      </div>
                      <div className="text-sm font-black text-ink mt-0.5">
                        {rec.recommendedDish}
                      </div>
                    </div>

                    {/* Review summary */}
                    <p className="text-xs text-body leading-relaxed italic bg-canvas p-2.5 rounded-xl border border-hairline">
                      "{rec.reviewSummary}"
                    </p>

                    {/* Reason why it fits */}
                    <div className="text-xs text-body leading-relaxed space-y-1">
                      <div className="font-bold text-brand-teal text-[11px] flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>맞춤 선별 사유:</span>
                      </div>
                      <p className="text-[11px] text-body">{rec.reason}</p>
                    </div>

                    {/* Address & External Map Search */}
                    <div className="pt-2 border-t border-hairline text-[11px] text-muted flex items-center justify-between">
                      <span className="truncate pr-2">{rec.address}</span>
                      <a
                        href={rec.mapSearchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ink hover:text-brand-coral font-bold flex items-center gap-0.5 flex-shrink-0"
                      >
                        <span>지도보기</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Voting Area */}
                  <div className="mt-6 pt-4 border-t border-hairline space-y-3">
                    {/* Voters Avatars */}
                    <div className="flex items-center justify-between min-h-[28px]">
                      <span className="text-xs font-bold text-body">
                        득표수: <strong className="text-ink">{rec.votes.length}</strong>표
                      </span>

                      <div className="flex -space-x-1.5 overflow-hidden">
                        {rec.votes.map((voterId) => {
                          const voter = allUsers.find((u) => u.id === voterId);
                          if (!voter) return null;
                          return (
                            <img
                              key={voter.id}
                              src={voter.avatar}
                              alt={voter.name}
                              title={`${voter.name} 투표함`}
                              className="w-6 h-6 rounded-full object-cover border-2 border-canvas"
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Vote Button */}
                    <button
                      onClick={() => handleVote(rec.id)}
                      disabled={pot.status === 'CONFIRMED'}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        hasVoted
                          ? 'bg-primary text-on-primary'
                          : 'bg-canvas hover:bg-surface-soft text-body border border-hairline'
                      } ${pot.status === 'CONFIRMED' ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 ${hasVoted ? 'fill-on-primary' : ''}`} />
                      <span>{hasVoted ? '내가 투표함 (취소하려면 재클릭)' : '이곳에 투표하기'}</span>
                    </button>

                    {/* Confirm as final winner button */}
                    {pot.status !== 'CONFIRMED' && (
                      <button
                        onClick={() => handleConfirmWinner(rec.id)}
                        className="w-full py-1.5 px-3 rounded-lg text-[11px] font-bold text-body hover:text-brand-teal hover:bg-brand-mint/20 border border-hairline transition-colors flex items-center justify-center gap-1"
                      >
                        <CheckCircle className="w-3 h-3 text-brand-teal" />
                        <span>이곳으로 장소 확정하기</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Cancel / Delete Confirmation Modal */}
      {isConfirmingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-canvas rounded-3xl max-w-md w-full p-6 shadow-2xl border border-hairline space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-error/10 text-error flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">식사 팟 취소하기</h3>
                <p className="text-xs text-muted">개설한 식사 팟을 취소하고 삭제합니다.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-error/10 border border-error/30 text-xs text-error space-y-1">
              <div className="font-bold">'{pot.title}' 팟을 정말 취소하시겠습니까?</div>
              <div className="leading-relaxed">
                취소하면 참여 중인 모든 친구들의 팟 목록에서도 즉시 삭제되며, 진행 중인 투표와 추천 목록도 모두 사라집니다.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-body hover:text-ink bg-surface-card hover:bg-surface-strong transition-colors"
              >
                돌아가기
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsConfirmingDelete(false);
                  if (onDeletePot) {
                    onDeletePot(pot.id);
                  }
                  onBack();
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-on-primary bg-error hover:bg-error/90 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>네, 팟 취소합니다</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
