import { useEffect, useState, useCallback } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  Timestamp,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface ActivityLog {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  type: 'todo_created' | 'todo_completed' | 'todo_updated' | 'todo_deleted' | 'member_joined' | 'member_left' | 'group_created' | 'group_updated';
  description: string;
  relatedTodoId?: string;
  createdAt: Timestamp;
}

interface UseActivityFeedReturn {
  activities: ActivityLog[];
  loading: boolean;
  error: Error | null;
  addActivity: (activity: Omit<ActivityLog, 'id'>) => Promise<void>;
  deleteActivity: (activityId: string) => Promise<void>;
  clearActivityHistory: (groupId: string) => Promise<void>;
}

export const useActivityFeed = (groupId: string | null | undefined): UseActivityFeedReturn => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // グループのアクティビティログを購読
  useEffect(() => {
    if (!groupId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const activitiesRef = collection(db, 'groups', groupId, 'activityLogs');
      const q = query(
        activitiesRef,
        orderBy('createdAt', 'desc'),
        limit(100) // 最新100件に制限
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const activityList: ActivityLog[] = [];
          snapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            activityList.push({
              id: docSnapshot.id,
              groupId,
              userId: data.userId,
              userName: data.userName || 'Unknown',
              type: data.type,
              description: data.description,
              relatedTodoId: data.relatedTodoId,
              createdAt: data.createdAt || Timestamp.now(),
            } as ActivityLog);
          });

          setActivities(activityList);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Error fetching activity logs:', err);
          setError(err as Error);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up activity listener:', err);
      setError(err as Error);
      setLoading(false);
    }
  }, [groupId]);

  // アクティビティログを追加
  const addActivity = useCallback(
    async (activity: Omit<ActivityLog, 'id'>): Promise<void> => {
      if (!groupId) throw new Error('Group not selected');

      try {
        const activitiesRef = collection(db, 'groups', groupId, 'activityLogs');
        await addDoc(activitiesRef, {
          ...activity,
          createdAt: Timestamp.now(),
        });
      } catch (err) {
        console.error('Error adding activity log:', err);
        throw err;
      }
    },
    [groupId]
  );

  // 個別のアクティビティログを削除
  const deleteActivity = useCallback(
    async (activityId: string): Promise<void> => {
      if (!groupId) throw new Error('Group not selected');

      try {
        const activityRef = doc(db, 'groups', groupId, 'activityLogs', activityId);
        await deleteDoc(activityRef);
      } catch (err) {
        console.error('Error deleting activity log:', err);
        throw err;
      }
    },
    [groupId]
  );

  // グループ内のすべてのアクティビティログを削除（クリア）
  const clearActivityHistory = useCallback(
    async (targetGroupId: string): Promise<void> => {
      try {
        const activitiesRef = collection(db, 'groups', targetGroupId, 'activityLogs');
        const snapshot = await new Promise<any>((resolve) => {
          const q = query(activitiesRef);
          const unsubscribe = onSnapshot(q, resolve);
          // 最初のスナップショットのみ使用してアンサブスクライブ
          setTimeout(() => unsubscribe(), 100);
        });

        const deletePromises = snapshot.docs.map((doc: any) =>
          deleteDoc(doc.ref)
        );

        await Promise.all(deletePromises);
      } catch (err) {
        console.error('Error clearing activity history:', err);
        throw err;
      }
    },
    []
  );

  return {
    activities,
    loading,
    error,
    addActivity,
    deleteActivity,
    clearActivityHistory,
  };
};
