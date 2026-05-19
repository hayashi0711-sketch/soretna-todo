import { useCallback } from 'react';
import {
  doc,
  updateDoc,
  Timestamp,
  deleteField,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { GroupMember } from './useGroups';

interface UseGroupMembersReturn {
  addMemberToGroup: (groupId: string, userId: string, displayName: string, role: 'member' | 'viewer') => Promise<void>;
  removeMemberFromGroup: (groupId: string, userId: string) => Promise<void>;
  updateMemberRoleInGroup: (groupId: string, userId: string, role: 'admin' | 'member' | 'viewer') => Promise<void>;
}

export const useGroupMembers = (): UseGroupMembersReturn => {
  // グループにメンバーを追加
  const addMemberToGroup = useCallback(
    async (groupId: string, userId: string, displayName: string, role: 'member' | 'viewer'): Promise<void> => {
      try {
        const groupRef = doc(db, 'groups', groupId);

        // 既存のメンバーを取得してから追加
        // この操作は useGroups の addMember と同じ処理
        const newMember: GroupMember = {
          role,
          joinedAt: Timestamp.now(),
          displayName,
        };

        await updateDoc(groupRef, {
          [`members.${userId}`]: newMember,
          updatedAt: Timestamp.now(),
        });
      } catch (err) {
        console.error('Error adding member to group:', err);
        throw err;
      }
    },
    []
  );

  // グループからメンバーを削除
  const removeMemberFromGroup = useCallback(
    async (groupId: string, userId: string): Promise<void> => {
      try {
        const groupRef = doc(db, 'groups', groupId);

        await updateDoc(groupRef, {
          [`members.${userId}`]: deleteField(),
          updatedAt: Timestamp.now(),
        });
      } catch (err) {
        console.error('Error removing member from group:', err);
        throw err;
      }
    },
    []
  );

  // グループ内のメンバーのロールを更新
  const updateMemberRoleInGroup = useCallback(
    async (groupId: string, userId: string, role: 'admin' | 'member' | 'viewer'): Promise<void> => {
      try {
        const groupRef = doc(db, 'groups', groupId);

        await updateDoc(groupRef, {
          [`members.${userId}.role`]: role,
          updatedAt: Timestamp.now(),
        });
      } catch (err) {
        console.error('Error updating member role:', err);
        throw err;
      }
    },
    []
  );

  return {
    addMemberToGroup,
    removeMemberFromGroup,
    updateMemberRoleInGroup,
  };
};
