import { useState, useEffect, useCallback } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  createdAt: any;
}

interface UseAuthReturn {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: Error | null;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Firebase 認証状態の購読
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          setUser(currentUser);

          // ユーザープロフィールを取得
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const profileData = userDocSnap.data();
            setUserProfile({
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: profileData.displayName || currentUser.displayName || 'User',
              createdAt: profileData.createdAt,
            });
          } else {
            // ドキュメントが存在しない場合は作成
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || 'User',
              createdAt: new Date(),
            };

            await setDoc(userDocRef, {
              ...newProfile,
              createdAt: new Date(),
            });

            setUserProfile(newProfile);
          }
        } else {
          setUser(null);
          setUserProfile(null);
        }

        setError(null);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // サインアップ
  const signUp = useCallback(
    async (email: string, password: string, displayName: string): Promise<void> => {
      try {
        setError(null);
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;

        // ユーザープロフィールを作成
        const userDocRef = doc(db, 'users', newUser.uid);
        const newProfile: UserProfile = {
          uid: newUser.uid,
          email: newUser.email || '',
          displayName,
          createdAt: new Date(),
        };

        await setDoc(userDocRef, {
          ...newProfile,
          createdAt: new Date(),
        });

        setUser(newUser);
        setUserProfile(newProfile);
      } catch (err) {
        console.error('Error signing up:', err);
        setError(err as Error);
        throw err;
      }
    },
    []
  );

  // サインイン
  const signIn = useCallback(
    async (email: string, password: string): Promise<void> => {
      try {
        setError(null);
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        setUser(userCredential.user);

        // ユーザープロフィールを取得
        const userDocRef = doc(db, 'users', userCredential.user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const profileData = userDocSnap.data();
          setUserProfile({
            uid: userCredential.user.uid,
            email: userCredential.user.email || '',
            displayName: profileData.displayName || userCredential.user.displayName || 'User',
            createdAt: profileData.createdAt,
          });
        }
      } catch (err) {
        console.error('Error signing in:', err);
        setError(err as Error);
        throw err;
      }
    },
    []
  );

  // サインアウト
  const signOut = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      await firebaseSignOut(auth);
      setUser(null);
      setUserProfile(null);
    } catch (err) {
      console.error('Error signing out:', err);
      setError(err as Error);
      throw err;
    }
  }, []);

  // 表示名を更新
  const updateDisplayName = useCallback(
    async (newDisplayName: string): Promise<void> => {
      if (!user) throw new Error('User not authenticated');

      try {
        setError(null);
        const userDocRef = doc(db, 'users', user.uid);

        await setDoc(userDocRef, {
          displayName: newDisplayName,
        }, { merge: true });

        // ローカルプロフィールも更新
        if (userProfile) {
          setUserProfile({
            ...userProfile,
            displayName: newDisplayName,
          });
        }
      } catch (err) {
        console.error('Error updating display name:', err);
        setError(err as Error);
        throw err;
      }
    },
    [user, userProfile]
  );

  return {
    user,
    userProfile,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    updateDisplayName,
  };
};
