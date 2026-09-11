import React, { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { User, MealPot, FriendRequest } from './types';
import { INITIAL_USERS, INITIAL_POTS } from './data/mockData';
import { Navbar } from './components/Navbar';
import { PotListTab } from './components/PotListTab';
import { PotDetailView } from './components/PotDetailView';
import { FriendsTab } from './components/FriendsTab';
import { ProfileTab } from './components/ProfileTab';
import { CreatePotModal } from './components/CreatePotModal';
import { LoginScreen } from './components/LoginScreen';
import { auth, logout } from './lib/firebase';
import {
  syncUserProfile,
  updateUserProfileInDb,
  subscribeAllUsers,
  subscribeUserFriends,
  removeFriendInDb,
  sendRealFriendRequest,
  respondToFriendRequest,
  cancelFriendRequest,
  subscribeIncomingFriendRequests,
  subscribeOutgoingFriendRequests,
  subscribeMealPots,
  saveMealPotInDb,
  updateMealPotInDb,
  deleteMealPotInDb,
} from './lib/firestoreService';
import { Utensils, ShieldCheck } from 'lucide-react';

export default function App() {
  // Authentication state
  const [authLoading, setAuthLoading] = useState(true);
  const [authUser, setAuthUser] = useState<User | null>(null);

  // Firestore collections synced state
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [pots, setPots] = useState<MealPot[]>(INITIAL_POTS);
  const [friendsMap, setFriendsMap] = useState<Record<string, string[]>>({});
  const [friendMetaMap, setFriendMetaMap] = useState<Record<string, Partial<User>>>({});
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);

  // Navigation states
  const [activeTab, setActiveTab] = useState<'pots' | 'friends' | 'profile'>('pots');
  const [selectedPotId, setSelectedPotId] = useState<string | null>(null);

  // Modals
  const [isCreatePotOpen, setIsCreatePotOpen] = useState(false);

  // 1. Listen for Real Firebase Google Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const syncedUser = await syncUserProfile({
            uid: fbUser.uid,
            displayName: fbUser.displayName,
            email: fbUser.email,
            photoURL: fbUser.photoURL,
          });
          setAuthUser(syncedUser);
        } catch (err) {
          console.error('Failed to sync user profile from Firestore:', err);
          // Fallback minimal user object
          setAuthUser({
            id: fbUser.uid,
            name: fbUser.displayName || '사용자',
            email: fbUser.email || '',
            avatar:
              fbUser.photoURL ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fbUser.uid)}`,
            allergies: [],
            favoriteFoods: [],
            dislikedFoods: [],
            recentMeals: [],
          });
        }
      } else {
        setAuthUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Real-time Subscription: All Real Users in Firestore
  useEffect(() => {
    const unsub = subscribeAllUsers((firestoreUsers) => {
      setUsers(firestoreUsers);
      // Sync authUser if remote has updated data without wiping existing local preferences
      if (authUser?.id) {
        const remoteMe = firestoreUsers.find((u) => u.id === authUser.id);
        if (remoteMe) {
          setAuthUser((prev) => {
            if (!prev) return remoteMe;
            return {
              ...prev,
              name: remoteMe.name || prev.name,
              email: remoteMe.email || prev.email,
              avatar: remoteMe.avatar || prev.avatar,
              allergies: remoteMe.allergies && remoteMe.allergies.length > 0 ? remoteMe.allergies : prev.allergies,
              favoriteFoods: remoteMe.favoriteFoods && remoteMe.favoriteFoods.length > 0 ? remoteMe.favoriteFoods : prev.favoriteFoods,
              dislikedFoods: remoteMe.dislikedFoods && remoteMe.dislikedFoods.length > 0 ? remoteMe.dislikedFoods : prev.dislikedFoods,
              recentMeals: remoteMe.recentMeals && remoteMe.recentMeals.length > 0 ? remoteMe.recentMeals : prev.recentMeals,
            };
          });
        }
      }
    });

    return () => unsub();
  }, [authUser?.id]);

  // 3. Real-time Subscription: Current User's Friends in Firestore
  useEffect(() => {
    if (!authUser?.id) {
      setFriendsMap({});
      setFriendMetaMap({});
      return;
    }
    const currentUserId = authUser.id;
    const unsub = subscribeUserFriends(currentUserId, (remoteFriendIds, remoteFriendMeta) => {
      setFriendsMap((prev) => ({
        ...prev,
        [currentUserId]: remoteFriendIds,
      }));
      if (remoteFriendMeta) {
        setFriendMetaMap((prev) => ({
          ...prev,
          ...remoteFriendMeta,
        }));
      }
    });

    return () => unsub();
  }, [authUser?.id]);

  // 4. Real-time Subscription: Meal Pots in Firestore
  useEffect(() => {
    const unsub = subscribeMealPots((remotePots) => {
      setPots(remotePots);
    });

    return () => unsub();
  }, []);

  // 5. Real-time Subscription: Friend Requests in Firestore
  useEffect(() => {
    if (!authUser?.id) {
      setIncomingRequests([]);
      setOutgoingRequests([]);
      return;
    }
    const currentUserId = authUser.id;
    const currentUserEmail = authUser.email;
    const unsubIn = subscribeIncomingFriendRequests(currentUserId, currentUserEmail, (reqs) => {
      setIncomingRequests(reqs);
    });
    const unsubOut = subscribeOutgoingFriendRequests(currentUserId, (reqs) => {
      setOutgoingRequests(reqs);
    });

    return () => {
      unsubIn();
      unsubOut();
    };
  }, [authUser?.id, authUser?.email]);

  // Handle Logout
  const handleSignOut = async () => {
    try {
      await logout();
      setAuthUser(null);
      setSelectedPotId(null);
      setActiveTab('pots');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  // Update current user's profile (Allergies, Foods, Recent Meals)
  const handleUpdateUser = async (updatedUser: User) => {
    setAuthUser(updatedUser);
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    try {
      await updateUserProfileInDb(updatedUser);
    } catch (err) {
      console.error('Firestore user update deferred:', err);
    }
  };

  // Send real friend request
  const handleSendFriendRequest = async (targetUser: User) => {
    if (!authUser) return;
    await sendRealFriendRequest(authUser, targetUser);
  };

  // Accept or decline real friend request
  const handleRespondFriendRequest = async (request: FriendRequest, accept: boolean) => {
    if (!authUser) return;
    const sender = users.find((u) => u.id === request.fromUserId) || {
      id: request.fromUserId,
      name: request.fromUserName,
      email: request.fromUserEmail,
      avatar: request.fromUserAvatar,
      allergies: [],
      favoriteFoods: [],
      dislikedFoods: [],
      recentMeals: [],
    };

    if (accept) {
      // Optimistically update local state immediately so user sees immediate feedback
      setFriendsMap((prev) => ({
        ...prev,
        [authUser.id]: Array.from(new Set([...(prev[authUser.id] || []), request.fromUserId])),
        [request.fromUserId]: Array.from(new Set([...(prev[request.fromUserId] || []), authUser.id])),
      }));
      setFriendMetaMap((prev) => ({
        ...prev,
        [request.fromUserId]: sender,
      }));
      setUsers((prev) => {
        if (!prev.some((u) => u.id === sender.id)) {
          return [...prev, sender];
        }
        return prev;
      });
      // Remove from incoming requests optimistically
      setIncomingRequests((prev) => prev.filter((r) => r.id !== request.id));
    } else {
      setIncomingRequests((prev) => prev.filter((r) => r.id !== request.id));
    }

    await respondToFriendRequest(request, accept, authUser, sender);
  };

  // Cancel outgoing friend request
  const handleCancelFriendRequest = async (requestId: string) => {
    await cancelFriendRequest(requestId);
  };

  // Remove friend from current user's list
  const handleRemoveFriend = async (friendId: string) => {
    if (!authUser) return;
    setFriendsMap((prev) => {
      const existing = prev[authUser.id] || [];
      return {
        ...prev,
        [authUser.id]: existing.filter((id) => id !== friendId),
      };
    });

    try {
      await removeFriendInDb(authUser.id, friendId);
    } catch (err) {
      console.warn('Firestore remove friend deferred:', err);
    }
  };

  // Create new pot
  const handleCreatePot = async (newPot: MealPot) => {
    setPots((prev) => [newPot, ...prev]);
    setSelectedPotId(newPot.id);
    setActiveTab('pots');

    try {
      await saveMealPotInDb(newPot);
    } catch (err) {
      console.error('Failed to save pot to Firestore:', err);
      // Roll back the optimistic update so the UI doesn't show a pot that isn't actually shared/persisted.
      setPots((prev) => prev.filter((p) => p.id !== newPot.id));
      setSelectedPotId(null);
      alert('식사 팟 저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  // Update existing pot
  const handleUpdatePot = async (updatedPot: MealPot) => {
    setPots((prev) => prev.map((p) => (p.id === updatedPot.id ? updatedPot : p)));

    try {
      await updateMealPotInDb(updatedPot);
    } catch (err) {
      console.warn('Firestore update pot deferred:', err);
    }
  };

  // Cancel / Delete pot
  const handleDeletePot = async (potId: string) => {
    setPots((prev) => prev.filter((p) => p.id !== potId));
    if (selectedPotId === potId) {
      setSelectedPotId(null);
    }

    try {
      await deleteMealPotInDb(potId);
    } catch (err) {
      console.warn('Firestore delete pot deferred:', err);
    }
  };

  // Active user's confirmed mutual friends
  const currentFriendIds = authUser ? friendsMap[authUser.id] || [] : [];
  const userFriends = useMemo(() => {
    return currentFriendIds.map((id) => {
      const foundInUsers = users.find((u) => u.id === id);
      if (foundInUsers) return foundInUsers;
      const meta = friendMetaMap[id];
      const fallbackUser: User = {
        id,
        name: meta?.name || '친구',
        email: meta?.email || '',
        avatar: meta?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`,
        allergies: meta?.allergies || [],
        favoriteFoods: meta?.favoriteFoods || [],
        dislikedFoods: meta?.dislikedFoods || [],
        recentMeals: meta?.recentMeals || [],
      };
      return fallbackUser;
    });
  }, [currentFriendIds, users, friendMetaMap]);

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-on-primary animate-bounce">
          <Utensils className="w-7 h-7" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="font-display text-lg text-ink">밥팟 BobPot</h2>
          <p className="text-xs text-muted font-medium">로그인 상태를 확인하는 중입니다...</p>
        </div>
      </div>
    );
  }

  // Not logged in: Show Google Login Screen first!
  if (!authUser) {
    return (
      <LoginScreen
        onLoginSuccess={(syncedUser) => {
          setAuthUser(syncedUser);
        }}
      />
    );
  }

  // Resolved active user (authoritative authUser state)
  const currentUser: User = authUser;

  const selectedPot = pots.find((p) => p.id === selectedPotId);

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans">
      {/* Google Account Status Bar */}
      <div className="bg-brand-teal text-on-primary px-4 py-1.5 text-xs font-semibold">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-mint flex-shrink-0" />
            <span>
              <strong>{currentUser.name}</strong>님의 구글 계정({currentUser.email})으로 접속 중입니다.
            </span>
          </div>
          <span className="text-[11px] text-on-primary/70 hidden md:inline">
            내 취향·알레르기·식사 팟이 클라우드에 실시간 보관됩니다.
          </span>
        </div>
      </div>

      {/* Navbar */}
      <Navbar
        currentUser={currentUser}
        allUsers={users}
        isRealFirebaseUser={true}
        pendingRequestsCount={incomingRequests.length}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedPotId(null);
        }}
        onLogout={handleSignOut}
        onCreatePotClick={() => setIsCreatePotOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {activeTab === 'pots' && (
          selectedPot ? (
            <PotDetailView
              pot={selectedPot}
              allUsers={users}
              currentUser={currentUser}
              onBack={() => setSelectedPotId(null)}
              onUpdatePot={handleUpdatePot}
              onDeletePot={handleDeletePot}
            />
          ) : (
            <PotListTab
              pots={pots}
              allUsers={users}
              currentUser={currentUser}
              onSelectPot={(pot) => setSelectedPotId(pot.id)}
              onCreatePotClick={() => setIsCreatePotOpen(true)}
              onDeletePot={handleDeletePot}
            />
          )
        )}

        {activeTab === 'friends' && (
          <FriendsTab
            currentUser={currentUser}
            allUsers={users}
            userFriends={userFriends}
            incomingRequests={incomingRequests}
            outgoingRequests={outgoingRequests}
            isRealFirebaseUser={true}
            onSendFriendRequest={handleSendFriendRequest}
            onRespondFriendRequest={handleRespondFriendRequest}
            onCancelFriendRequest={handleCancelFriendRequest}
            onRemoveFriend={handleRemoveFriend}
            onOpenGoogleAuth={() => {}}
            onCreatePotClick={() => setIsCreatePotOpen(true)}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileTab
            currentUser={currentUser}
            onUpdateUser={handleUpdateUser}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-surface-soft border-t border-hairline py-6 text-center text-xs text-muted">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>밥팟 (BobPot) — 구글 계정 기반 맞춤 식사 팟 추천 & 실시간 투표 서비스</span>
          <span className="text-[11px] text-muted-soft">
            알레르기 100% 차단 • 비선호 배제 • 최근 3일 식사(선호 구제) • Firebase 실시간 연동
          </span>
        </div>
      </footer>

      {/* Create Pot Modal */}
      <CreatePotModal
        isOpen={isCreatePotOpen}
        onClose={() => setIsCreatePotOpen(false)}
        currentUser={currentUser}
        userFriends={userFriends}
        existingPots={pots}
        allUsers={users}
        onCreatePot={handleCreatePot}
      />
    </div>
  );
}
