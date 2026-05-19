import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface GroupMember {
  role: 'admin' | 'member' | 'viewer';
  joinedAt: Timestamp;
  displayName?: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  emoji?: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  members: Record<string, GroupMember>;
  settings: {
    isPrivate: boolean;
    allowInvite: boolean;
    notificationLevel: 'all' | 'important' | 'none';
  };
}

interface UseGroupsReturn {
  groups: Group[];
  loading: boolean;
  error: Error | null;
  createGroup: (name: string, description?: string) => Promise<string>;
  updateGroup: (groupId: string, updates: Partial<Group>) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  addMember: (groupId: string, userId: string, displayName: string, role: 'member' | 'viewer') => Promise<void>;
  removeMember: (groupId: string, userId: string) => Promise<void>;
  updateMemberRole: (groupId: string, userId: string, role: 'admin' | 'member' | 'viewer') => Promise<void>;
}

export const useGroups = (userId: string | null | undefined): UseGroupsReturn => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // ユーザーのグループを購読
  useEffect(() => {
    if (!userId) {
      setGroups([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      collection(db, 'groups'),
      (snapshot) => {
        const userGroups: Group[] = [];
        snapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          if (data.members && userId in data.members) {
            userGroups.push({
              id: docSnapshot.id,
              ...data,
            } as Group);
          }
        });

        // 作成日時でソート（新しい順）
        userGroups.sort(
          (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()
        );

        setGroups(userGroups);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching groups:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // グループを作成
  const createGroup = useCallback(
    async (name: string, description?: string): Promise<string> => {
      if (!userId) throw new Error('User not authenticated');

      try {
        const groupRef = collection(db, 'groups');
        const newGroup = {
          name: name.trim(),
          description: description?.trim() || '',
          emoji: '👥',
          createdBy: userId,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          members: {
            [userId]: {
              role: 'admin',
              joinedAt: Timestamp.now(),
              displayName: 'You',
            },
          },
          settings: {
            isPrivate: true,
            allowInvite: true,
            notificationLevel: 'all',
          },
        };

        const docRef = await addDoc(groupRef, newGroup);
        return docRef.id;
      } catch (err) {
        console.error('Error creating group:', err);
        throw err;
      }
    },
    [userId]
  );

  // グループを更新
  const updateGroup = useCallback(
    async (groupId: string, updates: Partial<Group>): Promise<void> => {
      if (!userId) throw new Error('User not authenticated');

      try {
        const groupRef = doc(db, 'groups', groupId);
        const updateData = {
          ...updates,
          updatedAt: Timestamp.now(),
        };

        delete updateData.id;
        delete updateData.createdBy;
        delete updateData.createdAt;

        await updateDoc(groupRef, updateData);
      } catch (err) {
        console.error('Error updating group:', err);
        throw err;
      }
    },
    [userId]
  );

  // グループを削除
  const deleteGroup = useCallback(
    async (groupId: string): Promise<void> => {
      if (!userId) throw new Error('User not authenticated');

      try {
        const groupRef = doc(db, 'groups', groupId);
        await deleteDoc(groupRef);
      } catch (err) {
        console.error('Error deleting group:', err);
        throw err;
      }
    },
    [userId]
  );

  // メンバーを追加
  const addMember = useCallback(
    async (groupId: string, targetUserId: string, displayName: string, role: 'member' | 'viewer'): Promise<void> => {
      if (!userId) throw new Error('User not authenticated');

      try {
        const groupRef = doc(db, 'groups', groupId);
        const group = groups.find((g) => g.id === groupId);

        if (!group) throw new Error('Group not found');

        const newMembers = {
          ...group.members,
          [targetUserId]: {
            role,
            joinedAt: Timestamp.now(),
            displayName,
          },
        };

        await updateDoc(groupRef, { members: newMembers });
      } catch (err) {
        console.error('Error adding member:', err);
        throw err;
      }
    },
    [userId, groups]
  );

  // メンバーを削除
  const removeMember = useCallback(
    async (groupId: string, targetUserId: string): Promise<void> => {
      if (!userId) throw new Error('User not authenticated');

      try {
        const groupRef = doc(db, 'groups', groupId);
        const group = groups.find((g) => g.id === groupId);

        if (!group) throw new Error('Group not found');

        const newMembers = { ...group.members };
        delete newMembers[targetUserId];

        await updateDoc(groupRef, { members: newMembers });
      } catch (err) {
        console.error('Error removing member:', err);
        throw err;
      }
    },
    [userId, groups]
  );

  // メンバーのロールを更新
  const updateMemberRole = useCallback(
    async (groupId: string, targetUserId: string, role: 'admin' | 'member' | 'viewer'): Promise<void> => {
      if (!userId) throw new Error('User not authenticated');

      try {
        const groupRef = doc(db, 'groups', groupId);
        const group = groups.find((g) => g.id === groupId);

        if (!group) throw new Error('Group not found');

        const newMembers = { ...group.members };
        if (newMembers[targetUserId]) {
          newMembers[targetUserId].role = role;
        }

        await updateDoc(groupRef, { members: newMembers });
      } catch (err) {
        console.error('Error updating member role:', err);
        throw err;
      }
    },
    [userId, groups]
  );

  return {
    groups,
    loading,
    error,
    createGroup,
    updateGroup,
    deleteGroup,
    addMember,
    removeMember,
    updateMemberRole,
  };
};
