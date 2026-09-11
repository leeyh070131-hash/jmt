import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { User, MealPot, FriendRequest } from '../types';

/**
 * Sync or create user profile in Firestore
 */
export async function syncUserProfile(firebaseUser: {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}): Promise<User> {
  const userRef = doc(db, 'users', firebaseUser.uid);

  // Read local cache first if available
  let localCache: User | null = null;
  try {
    const raw = localStorage.getItem(`bobpot_user_profile_${firebaseUser.uid}`);
    if (raw) localCache = JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse local profile cache:', e);
  }

  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      const userObj: User = {
        id: firebaseUser.uid,
        name: data.name || firebaseUser.displayName || localCache?.name || '사용자',
        email: data.email || firebaseUser.email || localCache?.email || '',
        avatar: data.avatar || firebaseUser.photoURL || localCache?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
        allergies: Array.isArray(data.allergies) && data.allergies.length > 0
          ? data.allergies
          : (localCache?.allergies || []),
        favoriteFoods: Array.isArray(data.favoriteFoods) && data.favoriteFoods.length > 0
          ? data.favoriteFoods
          : (localCache?.favoriteFoods || []),
        dislikedFoods: Array.isArray(data.dislikedFoods) && data.dislikedFoods.length > 0
          ? data.dislikedFoods
          : (localCache?.dislikedFoods || []),
        recentMeals: Array.isArray(data.recentMeals) && data.recentMeals.length > 0
          ? data.recentMeals
          : (localCache?.recentMeals || []),
      };

      // If local cache had items that Firestore document was missing, sync them back to Firestore
      if (
        localCache &&
        ((!data.allergies?.length && localCache.allergies?.length) ||
         (!data.favoriteFoods?.length && localCache.favoriteFoods?.length) ||
         (!data.dislikedFoods?.length && localCache.dislikedFoods?.length))
      ) {
        setDoc(
          userRef,
          {
            allergies: userObj.allergies,
            favoriteFoods: userObj.favoriteFoods,
            dislikedFoods: userObj.dislikedFoods,
            recentMeals: userObj.recentMeals,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        ).catch((err) => console.warn('Sync back to Firestore deferred:', err));
      }

      try {
        localStorage.setItem(`bobpot_user_profile_${firebaseUser.uid}`, JSON.stringify(userObj));
      } catch (e) {}

      return userObj;
    } else {
      const newUser: User = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || localCache?.name || '사용자',
        email: (firebaseUser.email || localCache?.email || '').toLowerCase(),
        avatar:
          firebaseUser.photoURL ||
          localCache?.avatar ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
            firebaseUser.displayName || firebaseUser.uid
          )}`,
        allergies: localCache?.allergies || [],
        favoriteFoods: localCache?.favoriteFoods || [],
        dislikedFoods: localCache?.dislikedFoods || [],
        recentMeals: localCache?.recentMeals || [],
      };

      await setDoc(userRef, {
        uid: newUser.id,
        name: newUser.name,
        email: newUser.email,
        avatar: newUser.avatar,
        allergies: newUser.allergies,
        favoriteFoods: newUser.favoriteFoods,
        dislikedFoods: newUser.dislikedFoods,
        recentMeals: newUser.recentMeals,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      try {
        localStorage.setItem(`bobpot_user_profile_${firebaseUser.uid}`, JSON.stringify(newUser));
      } catch (e) {}

      return newUser;
    }
  } catch (error) {
    if (localCache) return localCache;
    handleFirestoreError(error, OperationType.WRITE, `users/${firebaseUser.uid}`);
    throw error;
  }
}

/**
 * Update user preferences and dietary info permanently in Firestore & local cache
 */
export async function updateUserProfileInDb(user: User): Promise<void> {
  // 1. Immediately persist to localStorage for instantaneous client-side persistence
  try {
    localStorage.setItem(`bobpot_user_profile_${user.id}`, JSON.stringify(user));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }

  // 2. Persist to Firestore with setDoc(..., { merge: true })
  const userRef = doc(db, 'users', user.id);
  try {
    await setDoc(
      userRef,
      {
        uid: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        allergies: user.allergies || [],
        favoriteFoods: user.favoriteFoods || [],
        dislikedFoods: user.dislikedFoods || [],
        recentMeals: user.recentMeals || [],
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
    throw error;
  }
}

/**
 * Listen to all registered users from Firestore
 */
export function subscribeAllUsers(onUpdate: (users: User[]) => void) {
  const usersCol = collection(db, 'users');
  return onSnapshot(
    usersCol,
    (snapshot) => {
      const list: User[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          name: d.name || '사용자',
          email: d.email || '',
          avatar: d.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${docSnap.id}`,
          allergies: d.allergies || [],
          favoriteFoods: d.favoriteFoods || [],
          dislikedFoods: d.dislikedFoods || [],
          recentMeals: d.recentMeals || [],
        });
      });
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    }
  );
}

/**
 * Listen to a user's friends from Firestore subcollection: users/{userId}/friends
 */
export function subscribeUserFriends(
  userId: string,
  onUpdate: (friendIds: string[], friendMeta?: Record<string, Partial<User>>) => void
) {
  return subscribeConfirmedFriends(userId, onUpdate);
}

/**
 * Listen to all confirmed friends for a user from both:
 * 1. users/{userId}/friends subcollection
 * 2. friendRequests where status == 'ACCEPTED' (bidirectional)
 */
export function subscribeConfirmedFriends(
  userId: string,
  onUpdate: (friendIds: string[], friendMeta: Record<string, Partial<User>>) => void
) {
  const friendsCol = collection(db, 'users', userId, 'friends');
  const qSent = query(
    collection(db, 'friendRequests'),
    where('fromUserId', '==', userId),
    where('status', '==', 'ACCEPTED')
  );
  const qReceived = query(
    collection(db, 'friendRequests'),
    where('toUserId', '==', userId),
    where('status', '==', 'ACCEPTED')
  );

  let subcolFriendIds: string[] = [];
  const subcolMeta: Record<string, Partial<User>> = {};
  let reqSentFriendIds: string[] = [];
  const reqSentMeta: Record<string, Partial<User>> = {};
  let reqReceivedFriendIds: string[] = [];
  const reqReceivedMeta: Record<string, Partial<User>> = {};

  const notify = () => {
    const allIds = Array.from(
      new Set([...subcolFriendIds, ...reqSentFriendIds, ...reqReceivedFriendIds])
    );
    const mergedMeta: Record<string, Partial<User>> = {
      ...reqSentMeta,
      ...reqReceivedMeta,
      ...subcolMeta,
    };
    onUpdate(allIds, mergedMeta);
  };

  const unsubSubcol = onSnapshot(
    friendsCol,
    (snapshot) => {
      subcolFriendIds = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const fid = docSnap.id;
        subcolFriendIds.push(fid);
        subcolMeta[fid] = {
          id: fid,
          name: d.friendName,
          email: d.friendEmail,
          avatar: d.friendAvatar,
          allergies: d.allergies || [],
          favoriteFoods: d.favoriteFoods || [],
          dislikedFoods: d.dislikedFoods || [],
        };
      });
      notify();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${userId}/friends`);
    }
  );

  const unsubSent = onSnapshot(
    qSent,
    (snapshot) => {
      reqSentFriendIds = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data() as FriendRequest;
        if (d.toUserId) {
          reqSentFriendIds.push(d.toUserId);
          reqSentMeta[d.toUserId] = {
            id: d.toUserId,
            name: d.toUserName || d.toUserEmail,
            email: d.toUserEmail,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${d.toUserId}`,
          };
        }
      });
      notify();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'friendRequests/accepted_sent');
    }
  );

  const unsubReceived = onSnapshot(
    qReceived,
    (snapshot) => {
      reqReceivedFriendIds = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data() as FriendRequest;
        if (d.fromUserId) {
          reqReceivedFriendIds.push(d.fromUserId);
          reqReceivedMeta[d.fromUserId] = {
            id: d.fromUserId,
            name: d.fromUserName,
            email: d.fromUserEmail,
            avatar: d.fromUserAvatar,
          };
        }
      });
      notify();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'friendRequests/accepted_received');
    }
  );

  return () => {
    unsubSubcol();
    unsubSent();
    unsubReceived();
  };
}

/**
 * Send real Google account friend request
 */
export async function sendRealFriendRequest(fromUser: User, toUser: User): Promise<void> {
  // Check self
  if (
    fromUser.id === toUser.id ||
    (fromUser.email && toUser.email && fromUser.email.toLowerCase() === toUser.email.toLowerCase())
  ) {
    throw new Error('자기 자신에게는 친구 요청을 보낼 수 없습니다.');
  }

  // Check if target user already sent a pending request to me (mutual request -> instant accept!)
  const reverseRequestId = `${toUser.id}_${fromUser.id}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  try {
    const revSnap = await getDoc(doc(db, 'friendRequests', reverseRequestId));
    if (revSnap.exists()) {
      const revData = revSnap.data() as FriendRequest;
      if (revData.status === 'PENDING') {
        await respondToFriendRequest(revData, true, fromUser, toUser);
        return;
      }
    }
  } catch (e) {
    // Non-fatal if reverse check fails
  }

  const requestId = `${fromUser.id}_${toUser.id}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  const reqRef = doc(db, 'friendRequests', requestId);

  try {
    try {
      const existing = await getDoc(reqRef);
      if (existing.exists()) {
        const data = existing.data();
        if (data.status === 'PENDING') {
          throw new Error('이미 보낸 친구 요청이 대기 중입니다.');
        } else if (data.status === 'ACCEPTED') {
          throw new Error('이미 친구로 등록되어 있습니다.');
        }
      }
    } catch (checkErr: any) {
      if (checkErr.message && checkErr.message.includes('이미')) {
        throw checkErr;
      }
    }

    await setDoc(
      reqRef,
      {
        id: requestId,
        fromUserId: fromUser.id,
        fromUserName: fromUser.name,
        fromUserEmail: fromUser.email,
        fromUserAvatar: fromUser.avatar,
        toUserId: toUser.id,
        toUserName: toUser.name,
        toUserEmail: toUser.email,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error: any) {
    if (error.message && (error.message.includes('이미') || error.message.includes('자신'))) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, `friendRequests/${requestId}`);
    throw error;
  }
}

/**
 * Respond to an incoming friend request (accept or reject)
 */
export async function respondToFriendRequest(
  request: FriendRequest,
  accept: boolean,
  currentUser: User,
  fromUser: User
): Promise<void> {
  const reqRef = doc(db, 'friendRequests', request.id);
  try {
    if (accept) {
      // 1. Update request status to ACCEPTED
      await updateDoc(reqRef, {
        status: 'ACCEPTED',
        updatedAt: new Date().toISOString(),
      });

      // 2. Add fromUser into currentUser's friend list with full details
      const myFriendDocRef = doc(db, 'users', currentUser.id, 'friends', request.fromUserId);
      await setDoc(
        myFriendDocRef,
        {
          friendId: request.fromUserId,
          friendName: fromUser.name || request.fromUserName,
          friendEmail: fromUser.email || request.fromUserEmail,
          friendAvatar: fromUser.avatar || request.fromUserAvatar,
          allergies: fromUser.allergies || [],
          favoriteFoods: fromUser.favoriteFoods || [],
          dislikedFoods: fromUser.dislikedFoods || [],
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // 3. Attempt adding currentUser into sender's friend list as reciprocal
      try {
        const otherFriendDocRef = doc(db, 'users', request.fromUserId, 'friends', currentUser.id);
        await setDoc(
          otherFriendDocRef,
          {
            friendId: currentUser.id,
            friendName: currentUser.name,
            friendEmail: currentUser.email,
            friendAvatar: currentUser.avatar,
            allergies: currentUser.allergies || [],
            favoriteFoods: currentUser.favoriteFoods || [],
            dislikedFoods: currentUser.dislikedFoods || [],
            createdAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (reciprocalErr) {
        console.warn('Sender friend subcollection reciprocal write handled:', reciprocalErr);
      }
    } else {
      // Reject or delete
      await updateDoc(reqRef, {
        status: 'REJECTED',
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `friendRequests/${request.id}`);
    throw error;
  }
}

/**
 * Cancel a pending friend request
 */
export async function cancelFriendRequest(requestId: string): Promise<void> {
  const reqRef = doc(db, 'friendRequests', requestId);
  try {
    await deleteDoc(reqRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `friendRequests/${requestId}`);
    throw error;
  }
}

/**
 * Subscribe to incoming friend requests directed to current user (by userId or userEmail)
 */
export function subscribeIncomingFriendRequests(
  userId: string,
  userEmail: string | undefined,
  onUpdate: (requests: FriendRequest[]) => void
) {
  const incomingMap = new Map<string, FriendRequest>();

  const emit = () => {
    const list = Array.from(incomingMap.values()).filter(
      (r) => !r.status || r.status.toUpperCase() === 'PENDING'
    );
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    onUpdate(list);
  };

  const q1 = query(
    collection(db, 'friendRequests'),
    where('toUserId', '==', userId)
  );

  const unsub1 = onSnapshot(
    q1,
    (snapshot) => {
      snapshot.forEach((d) => {
        const data = d.data() as FriendRequest;
        if (!data.status || data.status.toUpperCase() === 'PENDING') {
          incomingMap.set(d.id, data);
        } else {
          incomingMap.delete(d.id);
        }
      });
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'removed') {
          incomingMap.delete(change.doc.id);
        }
      });
      emit();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'friendRequests/incoming');
    }
  );

  let unsub2 = () => {};
  if (userEmail) {
    const normalizedEmail = userEmail.trim().toLowerCase();
    const q2 = query(
      collection(db, 'friendRequests'),
      where('toUserEmail', '==', normalizedEmail)
    );
    unsub2 = onSnapshot(
      q2,
      (snapshot) => {
        snapshot.forEach((d) => {
          const data = d.data() as FriendRequest;
          if (!data.status || data.status.toUpperCase() === 'PENDING') {
            incomingMap.set(d.id, data);
          } else {
            incomingMap.delete(d.id);
          }
        });
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'removed') {
            incomingMap.delete(change.doc.id);
          }
        });
        emit();
      },
      () => {
        // quiet fallback
      }
    );
  }

  return () => {
    unsub1();
    unsub2();
  };
}

/**
 * Subscribe to outgoing friend requests sent by current user
 */
export function subscribeOutgoingFriendRequests(
  userId: string,
  onUpdate: (requests: FriendRequest[]) => void
) {
  const q = query(
    collection(db, 'friendRequests'),
    where('fromUserId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: FriendRequest[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as FriendRequest;
        if (!data.status || data.status.toUpperCase() === 'PENDING') {
          list.push(data);
        }
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'friendRequests/outgoing');
    }
  );
}

/**
 * Add a friend to user's friend subcollection
 */
export async function addFriendInDb(userId: string, friend: User): Promise<void> {
  const friendDocRef = doc(db, 'users', userId, 'friends', friend.id);
  try {
    await setDoc(friendDocRef, {
      friendId: friend.id,
      friendName: friend.name,
      friendEmail: friend.email,
      friendAvatar: friend.avatar,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/friends/${friend.id}`);
    throw error;
  }
}

/**
 * Remove a friend from user's friend subcollection and clean up accepted requests
 */
export async function removeFriendInDb(userId: string, friendId: string): Promise<void> {
  const friendDocRef = doc(db, 'users', userId, 'friends', friendId);
  try {
    await deleteDoc(friendDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/friends/${friendId}`);
  }

  // Also remove the reciprocal entry in the other user's friends subcollection.
  // Without this, the other user still sees me as a friend after I unfriend them,
  // since their friend list is built from their own users/{friendId}/friends subcollection.
  try {
    const reciprocalDocRef = doc(db, 'users', friendId, 'friends', userId);
    await deleteDoc(reciprocalDocRef);
  } catch (error) {
    console.warn('Reciprocal friend subcollection cleanup failed:', error);
  }

  // Also safely remove reciprocal or accepted request records so friendship state remains consistent
  try {
    const reqId1 = `${userId}_${friendId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const reqId2 = `${friendId}_${userId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    await deleteDoc(doc(db, 'friendRequests', reqId1)).catch(() => {});
    await deleteDoc(doc(db, 'friendRequests', reqId2)).catch(() => {});
  } catch {
    // Ignore cleanup error
  }
}

/**
 * Search user by email in Firestore
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const usersCol = collection(db, 'users');
  try {
    const q = query(usersCol, where('email', '==', normalizedEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      const d = docSnap.data();
      return {
        id: docSnap.id,
        name: d.name || '사용자',
        email: d.email || normalizedEmail,
        avatar: d.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${docSnap.id}`,
        allergies: d.allergies || [],
        favoriteFoods: d.favoriteFoods || [],
        dislikedFoods: d.dislikedFoods || [],
        recentMeals: d.recentMeals || [],
      };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'users');
    return null;
  }
}

/**
 * Listen to all Meal Pots in real time
 */
export function subscribeMealPots(onUpdate: (pots: MealPot[]) => void) {
  const potsCol = collection(db, 'mealPots');
  return onSnapshot(
    potsCol,
    (snapshot) => {
      const list: MealPot[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data() as MealPot;
        list.push({
          ...d,
          id: docSnap.id,
        });
      });
      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'mealPots');
    }
  );
}

/**
 * Create or save a meal pot in Firestore
 */
export async function saveMealPotInDb(pot: MealPot): Promise<void> {
  const potRef = doc(db, 'mealPots', pot.id);
  try {
    await setDoc(potRef, {
      ...pot,
      // Firestore rejects `undefined` field values (thrown client-side before any network call),
      // and coordinates stays undefined unless the host used the GPS button.
      coordinates: pot.coordinates || null,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `mealPots/${pot.id}`);
    throw error;
  }
}

/**
 * Update a meal pot in Firestore (voting, winner confirmation, recommendations)
 */
export async function updateMealPotInDb(pot: MealPot): Promise<void> {
  const potRef = doc(db, 'mealPots', pot.id);
  try {
    await updateDoc(potRef, {
      status: pot.status,
      filterAnalysis: pot.filterAnalysis || null,
      recommendations: pot.recommendations || [],
      confirmedWinnerId: pot.confirmedWinnerId || null,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `mealPots/${pot.id}`);
    throw error;
  }
}

/**
  * Cancel / Delete a meal pot from Firestore
  */
export async function deleteMealPotInDb(potId: string): Promise<void> {
  const potRef = doc(db, 'mealPots', potId);
  try {
    await deleteDoc(potRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `mealPots/${potId}`);
    throw error;
  }
}
