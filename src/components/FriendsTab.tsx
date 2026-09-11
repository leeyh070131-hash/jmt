import React, { useState, useMemo } from 'react';
import {
  UserPlus,
  Users,
  Search,
  Check,
  AlertCircle,
  Trash2,
  AlertTriangle,
  Heart,
  Ban,
  ShieldCheck,
  Mail,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Share2,
  Send,
  Loader2,
  Sparkles,
  Inbox,
  UserCheck,
} from 'lucide-react';
import { User, FriendRequest } from '../types';

interface FriendsTabProps {
  currentUser: User;
  allUsers: User[];
  userFriends: User[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  isRealFirebaseUser: boolean;
  onSendFriendRequest: (targetUser: User) => Promise<void>;
  onRespondFriendRequest: (request: FriendRequest, accept: boolean) => Promise<void>;
  onCancelFriendRequest: (requestId: string) => Promise<void>;
  onRemoveFriend: (friendId: string) => Promise<void>;
  onOpenGoogleAuth: () => void;
  onCreatePotClick: () => void;
}

export const FriendsTab: React.FC<FriendsTabProps> = ({
  currentUser,
  allUsers,
  userFriends,
  incomingRequests,
  outgoingRequests,
  isRealFirebaseUser,
  onSendFriendRequest,
  onRespondFriendRequest,
  onCancelFriendRequest,
  onRemoveFriend,
  onOpenGoogleAuth,
  onCreatePotClick,
}) => {
  // Search inputs
  const [searchFriendTerm, setSearchFriendTerm] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [isSearchingUser, setIsSearchingUser] = useState(false);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  // Notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sub-tabs in Friends tab for clean organization
  const [subTab, setSubTab] = useState<'all' | 'requests' | 'search'>('all');

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Copy email to clipboard
  const handleCopyMyEmail = async () => {
    try {
      await navigator.clipboard.writeText(currentUser.email);
      setCopiedEmail(true);
      showNotification('info', `내 이메일(${currentUser.email})이 복사되었습니다. 친구에게 전달하세요!`);
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch {
      showNotification('error', '이메일 복사에 실패했습니다.');
    }
  };

  // Copy invitation link with instructions
  const handleCopyInviteLink = async () => {
    try {
      const inviteText = `[밥팟 BobPot] 친구와 밥 먹을 때 뭐 먹을지 고민 끝! 내 구글 이메일(${currentUser.email})로 친구 요청해줘! 접속 주소: ${window.location.origin}`;
      await navigator.clipboard.writeText(inviteText);
      setCopiedLink(true);
      showNotification('success', '초대 메시지와 접속 링크가 복사되었습니다! 카카오톡이나 메시지로 친구에게 보내보세요.');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      showNotification('error', '초대 링크 복사에 실패했습니다.');
    }
  };

  // Filtered confirmed friends
  const filteredFriends = useMemo(() => {
    return userFriends.filter(
      (f) =>
        f.name.toLowerCase().includes(searchFriendTerm.toLowerCase()) ||
        f.email.toLowerCase().includes(searchFriendTerm.toLowerCase())
    );
  }, [userFriends, searchFriendTerm]);

  // Find user by entered email from all registered users
  const searchedTargetUser = useMemo(() => {
    const q = emailInput.trim().toLowerCase();
    if (!q) return null;
    return allUsers.find((u) => u.email.toLowerCase() === q) || null;
  }, [emailInput, allUsers]);

  // Check relationship status with a user
  const getUserFriendStatus = (user: User) => {
    if (user.id === currentUser.id) return 'SELF';
    if (
      userFriends.some(
        (f) =>
          f.id === user.id ||
          (Boolean(f.email) && Boolean(user.email) && f.email.toLowerCase() === user.email.toLowerCase())
      )
    ) {
      return 'FRIENDS';
    }
    const hasIncoming = incomingRequests.find(
      (r) =>
        r.fromUserId === user.id ||
        (Boolean(r.fromUserEmail) && Boolean(user.email) && r.fromUserEmail.toLowerCase() === user.email.toLowerCase())
    );
    if (hasIncoming) return 'INCOMING';
    const hasOutgoing = outgoingRequests.find(
      (r) =>
        r.toUserId === user.id ||
        (Boolean(r.toUserEmail) && Boolean(user.email) && r.toUserEmail.toLowerCase() === user.email.toLowerCase())
    );
    if (hasOutgoing) return 'OUTGOING';
    return 'NONE';
  };

  // Send friend request
  const handleSendRequest = async (targetUser: User) => {
    if (!isRealFirebaseUser) {
      onOpenGoogleAuth();
      return;
    }

    if (targetUser.id === currentUser.id) {
      showNotification('error', '자신에게는 친구 요청을 보낼 수 없습니다.');
      return;
    }

    setIsSendingRequest(true);
    try {
      await onSendFriendRequest(targetUser);
      showNotification('success', `'${targetUser.name}'님에게 진짜 친구 요청을 보냈습니다! 상대방이 수락하면 친구가 됩니다.`);
      setEmailInput('');
    } catch (err: any) {
      showNotification('error', err.message || '친구 요청 전송 중 오류가 발생했습니다.');
    } finally {
      setIsSendingRequest(false);
    }
  };

  // Accept or decline request
  const handleRespondRequest = async (request: FriendRequest, accept: boolean) => {
    setProcessingRequestId(request.id);
    try {
      await onRespondFriendRequest(request, accept);
      if (accept) {
        showNotification(
          'success',
          `'${request.fromUserName}'님의 친구 요청을 수락했습니다! 이제 서로의 친구 목록에 실시간 등록되었습니다.`
        );
        setSubTab('all');
      } else {
        showNotification('info', `'${request.fromUserName}'님의 친구 요청을 거절했습니다.`);
      }
    } catch (err: any) {
      showNotification('error', err.message || '요청 처리 중 오류가 발생했습니다.');
    } finally {
      setProcessingRequestId(null);
    }
  };

  // Cancel pending outgoing request
  const handleCancelOutgoing = async (requestId: string, targetName: string) => {
    try {
      await onCancelFriendRequest(requestId);
      showNotification('info', `'${targetName}'님에게 보낸 친구 요청을 취소했습니다.`);
    } catch (err: any) {
      showNotification('error', err.message || '요청 취소에 실패했습니다.');
    }
  };

  // Unfriend with confirm
  const handleUnfriend = async (friend: User) => {
    if (window.confirm(`정말로 '${friend.name}'님을 친구 목록에서 삭제하시겠습니까?`)) {
      try {
        await onRemoveFriend(friend.id);
        showNotification('info', `'${friend.name}'님을 친구 목록에서 삭제했습니다.`);
      } catch (err: any) {
        showNotification('error', err.message || '친구 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  // Registered users excluding me & confirmed friends
  const registeredNonFriends = allUsers.filter(
    (u) => u.id !== currentUser.id && !userFriends.some((f) => f.id === u.id)
  );

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-7 animate-in fade-in duration-200">
      {/* Top Banner: Real Google Account Status & Quick Share */}
      <div className="bg-surface-dark rounded-3xl p-6 sm:p-7 text-on-primary relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-brand-coral/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-on-primary/30 shadow-md"
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-brand-mint rounded-full border-2 border-surface-dark flex items-center justify-center">
                <Check className="w-3 h-3 text-surface-dark" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold">{currentUser.name}</h2>
                {isRealFirebaseUser ? (
                  <span className="text-xs font-bold bg-brand-mint/20 text-brand-mint border border-brand-mint/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Google 인증 계정
                  </span>
                ) : (
                  <button
                    onClick={onOpenGoogleAuth}
                    className="text-xs font-bold bg-brand-peach hover:bg-brand-peach/85 text-ink px-2.5 py-0.5 rounded-full transition-colors flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    진짜 구글 로그인하기
                  </button>
                )}
              </div>
              <p className="text-xs text-on-primary/60 mt-1 font-mono flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-on-primary/50" />
                <span>{currentUser.email}</span>
              </p>
            </div>
          </div>

          {/* Quick Copy Buttons */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              id="btn-copy-my-email"
              onClick={handleCopyMyEmail}
              className="flex-1 md:flex-none px-3.5 py-2 rounded-xl bg-on-primary/10 hover:bg-on-primary/20 text-xs font-bold text-on-primary border border-on-primary/10 transition-colors flex items-center justify-center gap-1.5"
              title="친구에게 알려줄 내 구글 이메일 복사"
            >
              {copiedEmail ? <Check className="w-3.5 h-3.5 text-brand-mint" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedEmail ? '복사됨!' : '내 이메일 복사'}</span>
            </button>
            <button
              id="btn-share-invite-link"
              onClick={handleCopyInviteLink}
              className="flex-1 md:flex-none px-3.5 py-2 rounded-xl bg-brand-peach hover:bg-brand-peach/85 text-xs font-bold text-ink transition-colors flex items-center justify-center gap-1.5"
              title="친구 초대 링크 및 안내 복사"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-ink" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? '복사 완료!' : '초대 링크 복사'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating feedback alert */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-2.5 text-xs font-bold shadow-md animate-in slide-in-from-top-2 duration-200 ${
            feedback.type === 'success'
              ? 'bg-brand-mint/20 text-brand-teal border border-brand-mint'
              : feedback.type === 'error'
              ? 'bg-error/10 text-error border border-error/30'
              : 'bg-brand-lavender/20 text-ink border border-brand-lavender/50'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-brand-teal flex-shrink-0" />
          ) : feedback.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-error flex-shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-ink flex-shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Navigation Subtabs: Confirmed Friends / Requests (with badge) / Add & Search */}
      <div className="flex items-center justify-between border-b border-hairline pb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab('all')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
              subTab === 'all'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-card text-body hover:text-ink'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>내 친구 목록</span>
            <span className="ml-1 text-[11px] px-1.5 py-0.2 rounded-md bg-ink/20 text-inherit">
              {userFriends.length}
            </span>
          </button>

          <button
            id="tab-requests-toggle"
            onClick={() => setSubTab('requests')}
            className={`relative px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
              subTab === 'requests'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-card text-body hover:text-ink'
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>친구 요청함</span>
            {incomingRequests.length > 0 && (
              <span className="bg-error text-on-primary text-[11px] font-black px-1.5 py-0.2 rounded-full animate-bounce">
                {incomingRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setSubTab('search')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
              subTab === 'search'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-card text-body hover:text-ink'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>친구 찾기 & 요청</span>
          </button>
        </div>

        {userFriends.length > 0 && (
          <button
            onClick={onCreatePotClick}
            className="px-3.5 py-2 rounded-xl bg-primary hover:bg-ink/85 text-on-primary text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>친구들과 식사 팟 만들기</span>
          </button>
        )}
      </div>

      {/* 1. INCOMING & OUTGOING FRIEND REQUESTS (Highlighted when active or selected) */}
      {(subTab === 'requests' || incomingRequests.length > 0) && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Incoming requests */}
          <div className="bg-brand-ochre/15 rounded-3xl p-6 border-2 border-brand-ochre/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-ochre text-ink flex items-center justify-center">
                  <Inbox className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink flex items-center gap-2">
                    <span>나에게 도착한 친구 요청</span>
                    <span className="text-xs bg-error text-on-primary font-black px-2 py-0.5 rounded-full">
                      {incomingRequests.length}건
                    </span>
                  </h3>
                  <p className="text-xs text-muted">
                    수락하면 상대방과 서로의 식사 팟에 참여하고 취향/알레르기가 자동 반영됩니다.
                  </p>
                </div>
              </div>
            </div>

            {incomingRequests.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-soft font-medium bg-canvas/70 rounded-2xl border border-brand-ochre/40">
                새로 도착한 친구 요청이 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {incomingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-canvas rounded-2xl p-4 border border-brand-ochre/40 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={req.fromUserAvatar}
                        alt={req.fromUserName}
                        className="w-11 h-11 rounded-xl object-cover border border-hairline"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-ink truncate">
                          {req.fromUserName}
                        </div>
                        <div className="text-xs text-muted truncate font-mono">
                          {req.fromUserEmail}
                        </div>
                        <div className="text-[10px] text-muted-soft flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        id={`btn-accept-request-${req.id}`}
                        onClick={() => handleRespondRequest(req, true)}
                        disabled={processingRequestId === req.id}
                        className="p-2 px-3 rounded-xl bg-brand-teal hover:bg-brand-teal/85 text-on-primary text-xs font-bold transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        {processingRequestId === req.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>수락</span>
                      </button>

                      <button
                        onClick={() => handleRespondRequest(req, false)}
                        disabled={processingRequestId === req.id}
                        className="p-2 rounded-xl bg-surface-card hover:bg-surface-strong text-body text-xs font-semibold transition-colors"
                        title="거절"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outgoing pending requests */}
          {outgoingRequests.length > 0 && (
            <div className="bg-canvas rounded-3xl p-6 border border-hairline space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-muted-soft" />
                  <span>내가 보낸 친구 요청 (수락 대기 중 {outgoingRequests.length}건)</span>
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {outgoingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3 rounded-2xl bg-surface-card border border-hairline flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-ink truncate block">
                        {req.toUserName || req.toUserEmail}
                      </span>
                      <span className="text-[11px] text-muted-soft truncate block font-mono">
                        {req.toUserEmail}
                      </span>
                      <span className="text-[10px] text-brand-ochre font-semibold flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        상대방 수락 대기 중
                      </span>
                    </div>

                    <button
                      onClick={() => handleCancelOutgoing(req.id, req.toUserName || req.toUserEmail)}
                      className="text-xs text-muted-soft hover:text-error px-2 py-1 rounded-lg hover:bg-surface-strong font-semibold transition-colors whitespace-nowrap"
                    >
                      요청 취소
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. SEND REAL FRIEND REQUEST / SEARCH BY EMAIL */}
      {(subTab === 'search' || subTab === 'all') && (
        <div className="bg-canvas rounded-3xl p-6 sm:p-7 border border-hairline space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-brand-peach/30 text-ink flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink">
                실제 구글 계정으로 친구 찾기 & 친구 요청
              </h3>
              <p className="text-xs text-muted">
                상대방의 구글 이메일(`@gmail.com`)을 입력하여 실시간으로 검색하고 친구 요청을 보낼 수 있습니다.
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Mail className="w-4 h-4 text-muted-soft absolute left-3.5 top-3.5" />
              <input
                id="input-friend-search-email"
                type="email"
                placeholder="친구의 구글 이메일 입력 (예: bagjongo464@gmail.com)"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-2xl border border-hairline bg-surface-card focus:bg-canvas focus:outline-none focus:ring-2 focus:ring-ink/20 font-mono"
              />
            </div>

            {searchedTargetUser && (
              <button
                id="btn-send-request-to-found"
                onClick={() => handleSendRequest(searchedTargetUser)}
                disabled={isSendingRequest || getUserFriendStatus(searchedTargetUser) !== 'NONE'}
                className="py-2.5 px-5 rounded-2xl bg-primary hover:bg-ink/85 text-on-primary text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
              >
                {isSendingRequest ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>친구 요청 보내기</span>
              </button>
            )}
          </div>

          {/* User search result preview card */}
          {emailInput.trim() && (
            <div className="p-4 rounded-2xl border transition-all animate-in fade-in duration-150">
              {searchedTargetUser ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <img
                      src={searchedTargetUser.avatar}
                      alt={searchedTargetUser.name}
                      className="w-12 h-12 rounded-2xl object-cover border border-hairline"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink text-sm">{searchedTargetUser.name}</span>
                        <span className="text-[10px] bg-brand-mint/25 text-brand-teal border border-brand-mint px-1.5 py-0.5 rounded font-bold">
                          밥팟 가입 계정
                        </span>
                      </div>
                      <p className="text-xs text-muted font-mono mt-0.5">{searchedTargetUser.email}</p>

                      {searchedTargetUser.allergies.length > 0 && (
                        <p className="text-[11px] text-error font-semibold mt-1">
                          알레르기: {searchedTargetUser.allergies.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    {getUserFriendStatus(searchedTargetUser) === 'SELF' && (
                      <span className="text-xs font-bold text-muted-soft bg-surface-card px-3 py-1.5 rounded-xl">
                        본인 계정입니다
                      </span>
                    )}
                    {getUserFriendStatus(searchedTargetUser) === 'FRIENDS' && (
                      <span className="text-xs font-bold text-brand-teal bg-brand-mint/20 border border-brand-mint px-3 py-1.5 rounded-xl flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        이미 친구로 등록됨
                      </span>
                    )}
                    {getUserFriendStatus(searchedTargetUser) === 'OUTGOING' && (
                      <span className="text-xs font-bold text-brand-ochre bg-brand-ochre/15 border border-brand-ochre/50 px-3 py-1.5 rounded-xl flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        친구 요청 대기 중
                      </span>
                    )}
                    {getUserFriendStatus(searchedTargetUser) === 'INCOMING' && (
                      <button
                        onClick={() => {
                          const req = incomingRequests.find((r) => r.fromUserId === searchedTargetUser.id);
                          if (req) handleRespondRequest(req, true);
                        }}
                        className="text-xs font-bold text-on-primary bg-brand-teal hover:bg-brand-teal/85 px-3.5 py-2 rounded-xl flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        받은 요청 수락하기
                      </button>
                    )}
                    {getUserFriendStatus(searchedTargetUser) === 'NONE' && (
                      <button
                        onClick={() => handleSendRequest(searchedTargetUser)}
                        disabled={isSendingRequest}
                        className="py-2 px-4 rounded-xl bg-primary hover:bg-ink/85 text-on-primary text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>친구 요청</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-left space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-body font-bold">
                    <AlertCircle className="w-4 h-4 text-brand-ochre flex-shrink-0" />
                    <span>'{emailInput.trim()}' 주소로 직접 친구 요청을 보낼 수 있습니다.</span>
                  </div>
                  <p className="text-muted leading-relaxed">
                    친구 요청을 미리 전송하면 상대방이 밥팟에 로그인했을 때 '친구 요청함'에서 바로 확인하고 수락할 수 있습니다.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.trim()) && (
                      <button
                        onClick={() => {
                          const normalizedEmail = emailInput.trim().toLowerCase();
                          const fallbackUser: User = {
                            id: `user_${normalizedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
                            name: emailInput.trim().split('@')[0],
                            email: normalizedEmail,
                            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${normalizedEmail}`,
                            allergies: [],
                            favoriteFoods: [],
                            dislikedFoods: [],
                            recentMeals: [],
                          };
                          handleSendRequest(fallbackUser);
                        }}
                        disabled={isSendingRequest}
                        className="px-3.5 py-2 rounded-xl bg-primary hover:bg-ink/85 text-on-primary font-bold text-xs inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>이 이메일로 친구 요청 보내기</span>
                      </button>
                    )}
                    <button
                      onClick={handleCopyInviteLink}
                      className="px-3 py-2 rounded-xl bg-surface-card hover:bg-surface-strong text-ink font-bold text-xs inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5 text-brand-coral" />
                      <span>초대 링크 및 메시지 복사</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Registered Users on BobPot (Quick connect) */}
          {registeredNonFriends.length > 0 && (
            <div className="pt-4 border-t border-hairline space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-muted uppercase tracking-wider">
                  밥팟에 가입된 다른 사용자들:
                </p>
                <span className="text-[11px] text-muted-soft">
                  클릭 시 친구 요청이 발송됩니다
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {registeredNonFriends.map((user) => {
                  const status = getUserFriendStatus(user);
                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2.5 px-3 rounded-2xl bg-surface-card hover:bg-surface-strong transition-colors border border-hairline"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-8 h-8 rounded-xl object-cover border border-hairline"
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-ink truncate block">
                            {user.name}
                          </span>
                          <span className="text-[10px] text-muted-soft truncate block font-mono">
                            {user.email}
                          </span>
                        </div>
                      </div>

                      <div>
                        {status === 'OUTGOING' ? (
                          <span className="text-[11px] text-brand-ochre bg-brand-ochre/15 border border-brand-ochre/50 px-2 py-1 rounded-lg font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            대기 중
                          </span>
                        ) : status === 'INCOMING' ? (
                          <button
                            onClick={() => {
                              const req = incomingRequests.find((r) => r.fromUserId === user.id);
                              if (req) handleRespondRequest(req, true);
                            }}
                            className="p-1 px-2.5 rounded-lg bg-brand-teal hover:bg-brand-teal/85 text-on-primary text-[11px] font-bold"
                          >
                            수락
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSendRequest(user)}
                            className="p-1 px-2.5 rounded-lg bg-primary hover:bg-ink/85 text-on-primary text-[11px] font-bold transition-colors flex items-center gap-1"
                          >
                            <UserPlus className="w-3 h-3" />
                            <span>요청</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. CONFIRMED MUTUAL FRIENDS LIST */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-muted-soft absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="내 친구 목록에서 검색 (이름, 이메일)..."
              value={searchFriendTerm}
              onChange={(e) => setSearchFriendTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-2xl border border-hairline bg-canvas focus:outline-none focus:ring-2 focus:ring-ink/20"
            />
          </div>

          <div className="flex items-center gap-3 text-xs text-muted">
            <span>
              등록된 상호 친구 <strong>{userFriends.length}</strong>명
            </span>
          </div>
        </div>

        {filteredFriends.length === 0 ? (
          <div className="bg-canvas rounded-3xl p-12 text-center border border-hairline text-muted space-y-3">
            <div className="w-14 h-14 rounded-3xl bg-surface-card flex items-center justify-center mx-auto text-muted-soft">
              <Users className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-body">
                {searchFriendTerm ? '검색 결과와 일치하는 친구가 없습니다.' : '등록된 친구가 없습니다.'}
              </p>
              <p className="text-xs text-muted-soft max-w-sm mx-auto">
                친구의 구글 이메일을 검색하여 친구 요청을 보내거나, 상단 '내 이메일 복사'를 눌러 친구에게 내 이메일로 요청을 보내달라고 해보세요!
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredFriends.map((friend) => (
              <div
                key={friend.id}
                className="bg-canvas rounded-3xl p-5 border border-hairline hover:border-ink/20 transition-all space-y-3.5 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={friend.avatar}
                      alt={friend.name}
                      className="w-12 h-12 rounded-2xl object-cover border border-hairline flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-ink text-sm truncate">{friend.name}</h4>
                        <span className="text-[10px] bg-brand-lavender/20 text-ink font-bold px-1.5 py-0.2 rounded border border-brand-lavender/50 flex items-center gap-0.5">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          상호 친구
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-0.5 flex items-center gap-1 truncate font-mono">
                        <Mail className="w-3 h-3 text-muted-soft flex-shrink-0" />
                        <span className="truncate">{friend.email}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleUnfriend(friend)}
                    className="p-2 text-muted-soft hover:text-error rounded-xl hover:bg-error/10 transition-colors"
                    title="친구 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Dietary details calculated dynamically */}
                <div className="space-y-1.5 pt-2 border-t border-hairline text-xs">
                  {/* Allergies */}
                  <div className="flex items-start gap-1.5">
                    <span className="font-semibold text-muted flex items-center gap-1 min-w-[62px]">
                      <AlertTriangle className="w-3 h-3 text-error" />
                      알레르기:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {friend.allergies.length === 0 ? (
                        <span className="text-muted-soft">없음 (안전)</span>
                      ) : (
                        friend.allergies.map((a) => (
                          <span
                            key={a}
                            className="bg-error/10 text-error font-bold px-1.5 py-0.2 rounded text-[11px] border border-error/30"
                          >
                            {a}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Favorites */}
                  <div className="flex items-start gap-1.5">
                    <span className="font-semibold text-muted flex items-center gap-1 min-w-[62px]">
                      <Heart className="w-3 h-3 text-brand-coral" />
                      선호메뉴:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {friend.favoriteFoods.length === 0 ? (
                        <span className="text-muted-soft">미설정</span>
                      ) : (
                        friend.favoriteFoods.slice(0, 3).map((f) => (
                          <span
                            key={f}
                            className="bg-brand-peach/25 text-ink font-semibold px-1.5 py-0.2 rounded text-[11px]"
                          >
                            {f}
                          </span>
                        ))
                      )}
                      {friend.favoriteFoods.length > 3 && (
                        <span className="text-muted-soft text-[10px]">
                          +{friend.favoriteFoods.length - 3}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dislikes */}
                  {friend.dislikedFoods.length > 0 && (
                    <div className="flex items-start gap-1.5">
                      <span className="font-semibold text-muted flex items-center gap-1 min-w-[62px]">
                        <Ban className="w-3 h-3 text-muted-soft" />
                        비선호:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {friend.dislikedFoods.slice(0, 3).map((d) => (
                          <span
                            key={d}
                            className="bg-surface-card text-body px-1.5 py-0.2 rounded text-[11px]"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
