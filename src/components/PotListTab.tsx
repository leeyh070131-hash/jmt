import React, { useState } from 'react';
import {
  Plus,
  Calendar,
  Clock,
  MapPin,
  Users,
  ChevronRight,
  CheckCircle,
  ThumbsUp,
  Sparkles,
  Utensils,
  Filter,
  Trash2,
} from 'lucide-react';
import { MealPot, User, MealSlot } from '../types';

interface PotListTabProps {
  pots: MealPot[];
  allUsers: User[];
  currentUser: User;
  onSelectPot: (pot: MealPot) => void;
  onCreatePotClick: () => void;
  onDeletePot?: (potId: string) => void;
}

export const PotListTab: React.FC<PotListTabProps> = ({
  pots,
  allUsers,
  currentUser,
  onSelectPot,
  onCreatePotClick,
  onDeletePot,
}) => {
  const [slotFilter, setSlotFilter] = useState<'ALL' | MealSlot>('ALL');
  const [potToDelete, setPotToDelete] = useState<MealPot | null>(null);

  const filteredPots = pots.filter((p) => {
    if (slotFilter === 'ALL') return true;
    return p.slot === slotFilter;
  });

  const slotLabels: Record<MealSlot, { name: string; icon: string }> = {
    BREAKFAST: { name: '아침', icon: '🌅' },
    LUNCH: { name: '점심', icon: '☀️' },
    DINNER: { name: '저녁', icon: '🌙' },
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-in fade-in duration-200">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-brand-peach p-6 sm:p-8 text-ink">
        <div className="relative z-10 max-w-2xl space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ink/10 backdrop-blur-md text-xs font-black uppercase tracking-wider text-ink/70">
            <Sparkles className="w-3.5 h-3.5" />
            <span>스마트 식사 약속 해결사</span>
          </span>
          <h1 className="font-display text-2xl sm:text-3xl text-ink leading-snug">
            친구들과 뭐 먹을지 고민 끝!<br />
            알레르기·비선호 빼고 진짜 맛집만 추천받으세요.
          </h1>
          <p className="text-xs sm:text-sm text-ink/70 font-medium leading-relaxed">
            모든 친구의 알레르기 식재료 100% 차단, 최근 3일 식사 이력(선호 메뉴 구제 룰 적용)을 스마트하게 분석하여 주변 최고 평점 식당 2~3곳을 추천하고 투표로 결정합니다.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              id="btn-hero-new-pot"
              onClick={onCreatePotClick}
              className="px-5 py-2.5 rounded-xl bg-canvas text-ink hover:bg-surface-soft font-bold text-xs transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>새 식사 팟 만들기</span>
            </button>
          </div>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-canvas/20 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Filter and Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-ink flex items-center gap-2">
            <span>식사 팟 일정</span>
            <span className="text-xs font-bold bg-surface-card text-body px-2 py-0.5 rounded-md">
              총 {pots.length}개
            </span>
          </h2>
          <p className="text-xs text-muted mt-0.5">
            아침, 점심, 저녁 시간대별로 중복 없는 식사 약속을 관리합니다.
          </p>
        </div>

        {/* Slot Filter Chips */}
        <div className="flex items-center gap-1.5 bg-canvas p-1 rounded-2xl border border-hairline self-start sm:self-auto">
          <button
            onClick={() => setSlotFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              slotFilter === 'ALL'
                ? 'bg-primary text-on-primary'
                : 'text-body hover:text-ink'
            }`}
          >
            전체
          </button>
          {(['BREAKFAST', 'LUNCH', 'DINNER'] as MealSlot[]).map((s) => (
            <button
              key={s}
              onClick={() => setSlotFilter(s)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 ${
                slotFilter === s
                  ? 'bg-primary text-on-primary'
                  : 'text-body hover:text-ink'
              }`}
            >
              <span>{slotLabels[s].icon}</span>
              <span>{slotLabels[s].name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Pots Grid */}
      {filteredPots.length === 0 ? (
        <div className="bg-surface-card rounded-3xl p-12 text-center border border-hairline text-muted space-y-4">
          <Utensils className="w-12 h-12 mx-auto text-muted-soft" />
          <div>
            <p className="text-base font-bold text-body">생성된 식사 팟이 없습니다.</p>
            <p className="text-xs text-muted mt-1">
              새로운 식사 팟을 만들어 친구들과 투표를 시작해보세요!
            </p>
          </div>
          <button
            onClick={onCreatePotClick}
            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-ink/85 text-on-primary text-xs font-bold transition-colors inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>첫 팟 만들기</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredPots.map((pot) => {
            const members = pot.memberIds
              .map((id) => allUsers.find((u) => u.id === id))
              .filter((u): u is User => Boolean(u));

            const confirmedWinner = pot.recommendations.find(
              (r) => r.id === pot.confirmedWinnerId
            );

            return (
              <div
                key={pot.id}
                onClick={() => onSelectPot(pot)}
                className="bg-canvas rounded-3xl p-6 border border-hairline hover:border-ink/25 transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  {/* Top Bar: Date, Slot & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <span className="px-2.5 py-1 rounded-lg bg-surface-card text-body flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-muted" />
                        <span>{pot.date}</span>
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-brand-peach/25 text-ink flex items-center gap-1 border border-hairline">
                        <span>{slotLabels[pot.slot].icon}</span>
                        <span>{slotLabels[pot.slot].name}</span>
                      </span>
                    </div>

                      <div className="flex items-center gap-1.5">
                        {pot.status === 'CONFIRMED' ? (
                          <span className="text-[11px] font-bold text-brand-teal bg-brand-mint/30 px-2.5 py-1 rounded-lg border border-brand-mint flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-brand-teal" />
                            <span>장소 확정</span>
                          </span>
                        ) : pot.status === 'VOTING' ? (
                          <span className="text-[11px] font-bold text-ink bg-brand-lavender/30 px-2.5 py-1 rounded-lg border border-brand-lavender flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3 text-ink" />
                            <span>투표 중</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-body bg-surface-card px-2.5 py-1 rounded-lg">
                            결성 완료
                          </span>
                        )}

                        {onDeletePot && pot.hostId === currentUser.id && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPotToDelete(pot);
                            }}
                            className="p-1.5 rounded-lg text-muted-soft hover:text-error hover:bg-error/10 transition-colors"
                            title="식사 팟 취소하기"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                  </div>

                  {/* Title & Location */}
                  <div>
                    <h3 className="text-lg font-bold text-ink group-hover:text-brand-coral transition-colors">
                      {pot.title}
                    </h3>
                    <p className="text-xs text-muted flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-muted-soft" />
                      <span>{pot.locationName}</span>
                    </p>
                  </div>

                  {/* Result preview if recommendations or winner exist */}
                  {confirmedWinner ? (
                    <div className="p-3 rounded-2xl bg-brand-mint/20 border border-brand-mint/60 text-xs">
                      <span className="text-[10px] font-bold text-brand-teal uppercase tracking-wider block">
                        확정된 식사 장소
                      </span>
                      <strong className="text-ink font-black text-sm block mt-0.5">
                        {confirmedWinner.name}
                      </strong>
                      <span className="text-body text-[11px]">
                        추천 메뉴: {confirmedWinner.recommendedDish}
                      </span>
                    </div>
                  ) : pot.recommendations.length > 0 ? (
                    <div className="p-3 rounded-2xl bg-brand-peach/20 border border-brand-peach/50 text-xs">
                      <span className="text-[10px] font-bold text-ink/70 uppercase tracking-wider block">
                        추천 맛집 후보 {pot.recommendations.length}곳 선정됨
                      </span>
                      <div className="text-body text-[11px] mt-0.5 truncate">
                        {pot.recommendations.map((r) => r.name).join(' • ')}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Bottom Members & Arrow */}
                <div className="pt-3 border-t border-hairline flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {members.map((m) => (
                        <img
                          key={m.id}
                          src={m.avatar}
                          alt={m.name}
                          title={m.name}
                          className="w-6 h-6 rounded-full object-cover border-2 border-canvas"
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted font-medium">
                      {members.map((m) => m.name).slice(0, 3).join(', ')}
                      {members.length > 3 && ` 외 ${members.length - 3}명`}
                    </span>
                  </div>

                  <span className="text-xs font-bold text-ink flex items-center gap-0.5 group-hover:text-brand-coral group-hover:translate-x-0.5 transition-all">
                    <span>자세히 보기</span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete / Cancel Confirmation Modal */}
      {potToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            e.stopPropagation();
            setPotToDelete(null);
          }}
        >
          <div
            className="bg-canvas rounded-3xl max-w-md w-full p-6 shadow-2xl border border-hairline space-y-5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-error/10 text-error flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">식사 팟 취소하기</h3>
                <p className="text-xs text-muted">개설된 식사 팟을 취소하고 완전히 삭제합니다.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-error/10 border border-error/30 text-xs text-error space-y-1">
              <div className="font-bold">'{potToDelete.title}' 팟을 정말 취소하시겠습니까?</div>
              <div className="leading-relaxed">
                취소하면 나와 참여 중인 친구들의 팟 목록에서 즉시 삭제되며, 추천 결과와 투표도 함께 삭제됩니다.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPotToDelete(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-body hover:text-ink bg-surface-card hover:bg-surface-strong transition-colors"
              >
                돌아가기
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = potToDelete.id;
                  setPotToDelete(null);
                  if (onDeletePot) {
                    onDeletePot(id);
                  }
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-on-primary bg-error hover:bg-error/90 transition-colors flex items-center gap-1.5 active:scale-95"
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
