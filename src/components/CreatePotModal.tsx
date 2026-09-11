import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  AlertTriangle,
  Sparkles,
  Compass,
  Check,
} from 'lucide-react';
import { User, MealSlot, MealPot } from '../types';
import { POPULAR_LOCATIONS, getRelativeDate } from '../data/mockData';
import { fetchOrGenerateRecommendations } from '../lib/recommendationGenerator';

interface CreatePotModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  userFriends: User[];
  existingPots: MealPot[];
  allUsers: User[];
  onCreatePot: (newPot: MealPot) => void;
}

export const CreatePotModal: React.FC<CreatePotModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  userFriends,
  existingPots,
  allUsers,
  onCreatePot,
}) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(getRelativeDate(0));
  const [slot, setSlot] = useState<MealSlot>('DINNER');
  const [locationName, setLocationName] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  // Toggle friend selection
  const handleToggleFriend = (friendId: string) => {
    setSelectedFriendIds((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]
    );
  };

  // Get GPS current location
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('브라우저에서 위치 정보를 지원하지 않습니다. 직접 위치를 입력해주세요.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoordinates({ lat, lng });
        
        try {
          // Attempt reverse geocoding via OpenStreetMap Nominatim
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`);
          if (res.ok) {
            const data = await res.json();
            const addr = data.address;
            const district = addr.city_district || addr.suburb || addr.borough || addr.city || addr.town || '';
            const road = addr.road || addr.neighbourhood || '';
            const formatted = district ? `${district} ${road}`.trim() : data.display_name?.split(',')[0] || '';
            if (formatted) {
              setLocationName(`내 현재 위치 (${formatted})`);
              return;
            }
          }
        } catch (e) {
          console.warn('Reverse geocode fallback:', e);
        }
        setLocationName(`내 현재 위치 (GPS 좌표: ${lat.toFixed(3)}, ${lng.toFixed(3)})`);
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        alert('현재 위치 정보를 가져올 수 없습니다. 권한을 허용해주시거나 검색창에 직접 위치를 입력해주세요.');
      },
      { timeout: 8000 }
    );
  };

  // OVERLAP CHECK:
  // "팟은 날짜와 아침점심저녁이 구분되어야 하고, 겹치는 팟 계획은 설정할수 없도록 해."
  // Check if current user or any selected member already has a pot on the same date and slot!
  const targetMembers = [currentUser.id, ...selectedFriendIds];
  const overlappingConflicts: { userName: string; potTitle: string }[] = [];

  for (const memberId of targetMembers) {
    const memberObj = (memberId === currentUser.id ? currentUser : allUsers.find((u) => u.id === memberId)) || currentUser;
    const conflictingPot = existingPots.find(
      (p) => p.date === date && p.slot === slot && p.memberIds.includes(memberId)
    );

    if (conflictingPot) {
      overlappingConflicts.push({
        userName: memberObj.name,
        potTitle: conflictingPot.title,
      });
    }
  }

  const hasOverlap = overlappingConflicts.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasOverlap || isCreating) return;
    if (!title.trim() || !locationName.trim()) return;

    setIsCreating(true);

    try {
      const targetMemberObjects = targetMembers
        .map((id) => (id === currentUser.id ? currentUser : allUsers.find((u) => u.id === id)))
        .filter((u): u is User => Boolean(u));

      // Automatically generate recommendations based on the chosen location & members!
      const { filterAnalysis, recommendations } = await fetchOrGenerateRecommendations(
        locationName.trim(),
        slot,
        date,
        targetMemberObjects
      );

      const newPot: MealPot = {
        id: `pot-${Date.now()}`,
        title: title.trim(),
        date,
        slot,
        locationName: locationName.trim(),
        coordinates,
        hostId: currentUser.id,
        memberIds: targetMembers,
        status: 'VOTING', // Automatically ready for voting!
        filterAnalysis,
        recommendations,
        createdAt: new Date().toISOString(),
      };

      onCreatePot(newPot);
      onClose();
    } catch (err) {
      console.error('Error creating pot with auto-recommendations:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const slotLabels: Record<MealSlot, { name: string; icon: string; desc: string }> = {
    BREAKFAST: { name: '아침', icon: '🌅', desc: '07:00 ~ 10:00' },
    LUNCH: { name: '점심', icon: '☀️', desc: '11:30 ~ 14:00' },
    DINNER: { name: '저녁', icon: '🌙', desc: '17:30 ~ 21:00' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-canvas rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-hairline">
        {/* Header */}
        <div className="p-6 border-b border-hairline flex items-center justify-between sticky top-0 bg-canvas/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-primary text-on-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-ink">새 식사 팟 만들기</h3>
              <p className="text-xs text-muted">날짜·시간대·위치를 정하고 친구들을 초대하세요.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-soft hover:text-ink rounded-xl hover:bg-surface-card transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Overlap Error Warning Banner */}
          {hasOverlap && (
            <div className="p-4 rounded-2xl bg-error/10 border border-error/30 text-xs text-error space-y-1.5 animate-in shake duration-150">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 text-error flex-shrink-0" />
                <span>중복 식사 팟 일정 감지! (생성 불가)</span>
              </div>
              <p className="leading-relaxed">
                동일한 날짜({date})와 시간대({slotLabels[slot].name})에 이미 일정이 있는 멤버가 있습니다:
              </p>
              <ul className="list-disc list-inside space-y-0.5 font-semibold pl-1">
                {overlappingConflicts.map((c, i) => (
                  <li key={i}>
                    <strong>[{c.userName}]</strong>님 → '{c.potTitle}' 팟에 이미 참여 중
                  </li>
                ))}
              </ul>
              <p className="text-[11px] opacity-80 mt-1">
                ※ 날짜나 시간대(아침/점심/저녁)를 변경하거나, 일정이 겹치는 멤버를 제외해주세요.
              </p>
            </div>
          )}

          {/* Pot Title */}
          <div>
            <label className="block text-xs font-bold text-body mb-1.5">
              식사 팟 이름 <span className="text-error">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="예: 금요일 강남역 저녁 번개, 점심 맛집 탐방"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-hairline focus:outline-none focus:ring-2 focus:ring-ink/20 bg-canvas"
            />
          </div>

          {/* Date and Slot selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-body mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-soft" />
                <span>식사 날짜</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-hairline focus:outline-none focus:ring-2 focus:ring-ink/20 bg-canvas font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-body mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-soft" />
                <span>시간대 구분 (아침/점심/저녁)</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['BREAKFAST', 'LUNCH', 'DINNER'] as MealSlot[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSlot(s)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-0.5 ${
                      slot === s
                        ? 'bg-primary text-on-primary scale-102 ring-2 ring-ink/15'
                        : 'bg-surface-card text-body hover:bg-surface-strong'
                    }`}
                  >
                    <span className="text-sm">{slotLabels[s].icon}</span>
                    <span>{slotLabels[s].name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Location Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-body flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-muted-soft" />
                <span>만날 위치 / 지역</span>
              </label>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={isLocating}
                className="text-xs text-ink font-bold hover:text-brand-coral flex items-center gap-1"
              >
                <Compass className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? '위치 찾는 중...' : '내 현재 위치'}</span>
              </button>
            </div>

            <input
              type="text"
              required
              placeholder="식사할 장소를 입력하세요 (예: 홍대, 성수, 판교, 여의도, 우리 동네 등)"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-hairline focus:outline-none focus:ring-2 focus:ring-ink/20 bg-canvas"
            />

            {/* Popular location chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {POPULAR_LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocationName(loc)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors ${
                    locationName === loc
                      ? 'bg-brand-peach/30 text-ink font-bold border border-brand-peach'
                      : 'bg-surface-card text-body hover:bg-surface-strong'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          {/* Friends Selection */}
          <div>
            <label className="block text-xs font-bold text-body mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-muted-soft" />
                <span>함께할 친구 선택</span>
              </span>
              <span className="text-[11px] text-muted-soft font-normal">
                나(호스트) 포함 총 {1 + selectedFriendIds.length}명
              </span>
            </label>

            {userFriends.length === 0 ? (
              <div className="p-4 rounded-2xl bg-surface-card border border-hairline text-center text-xs text-muted">
                등록된 친구가 없습니다. 친구 목록 탭에서 친구를 추가해주세요!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                {userFriends.map((friend) => {
                  const isSelected = selectedFriendIds.includes(friend.id);
                  // Check if this friend specifically has an overlap on this date/slot
                  const friendConflict = existingPots.find(
                    (p) => p.date === date && p.slot === slot && p.memberIds.includes(friend.id)
                  );

                  return (
                    <div
                      key={friend.id}
                      onClick={() => handleToggleFriend(friend.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-brand-peach/20 border-brand-peach'
                          : 'bg-canvas border-hairline hover:border-ink/20'
                      } ${friendConflict ? 'opacity-70 ring-1 ring-error/40' : ''}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={friend.avatar}
                          alt={friend.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div className="min-w-0 text-left">
                          <div className="text-xs font-bold text-ink truncate">
                            {friend.name}
                          </div>
                          {friend.allergies.length > 0 ? (
                            <div className="text-[10px] text-error font-semibold truncate">
                              ⚠️ {friend.allergies[0]}
                            </div>
                          ) : (
                            <div className="text-[10px] text-muted-soft truncate">알레르기 없음</div>
                          )}
                          {friendConflict && (
                            <div className="text-[9px] text-error font-bold">
                              ⚠️ 이 시간대 팟 있음
                            </div>
                          )}
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-colors ${
                          isSelected
                            ? 'bg-primary border-primary text-on-primary'
                            : 'border-hairline bg-canvas'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-hairline">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-body hover:bg-surface-card transition-colors"
            >
              취소
            </button>
            <button
              id="btn-create-pot-submit"
              type="submit"
              disabled={hasOverlap || isCreating}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                hasOverlap || isCreating
                  ? 'bg-surface-strong cursor-not-allowed text-muted-soft'
                  : 'bg-primary hover:bg-ink/85 text-on-primary'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${isCreating ? 'animate-spin' : ''}`} />
              <span>{isCreating ? '지역 맛집 추천 생성 & 결성 중...' : '식사 팟 결성하기'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
