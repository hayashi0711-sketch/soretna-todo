import { useEffect, useState, useCallback } from 'react';
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
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Notification {
  id: string;
  userId: string;
  type: 'todo_created' | 'todo_completed' | 'todo_updated' | 'member_joined' | 'group_created';
  groupId: string;
  message: string;
  triggeredBy: string;
  triggeredByName?: string;
  relatedTodoId?: string;
  read: boolean;
  createdAt: Timestamp;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: Error | null;
  addNotification: (notification: Omit<Notification, 'id'>) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export const useNotifications = (userId: string | null | undefined): UseNotificationsReturn => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // ユーザーの通知を購読
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const notificationsRef = collection(db, 'users', userId, 'notifications');
      const q = query(notificationsRef, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const notificationList: Notification[] = [];
          snapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            notificationList.push({
              id: docSnapshot.id,
              userId,
              type: data.type,
              groupId: data.groupId,
              message: data.message,
              triggeredBy: data.triggeredBy,
              triggeredByName: data.triggeredByName,
              relatedTodoId: data.relatedTodoId,
              read: data.read || false,
              createdAt: data.createdAt || Timestamp.now(),
            } as Notification);
          });

          setNotifications(notificationList);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Error fetching notifications:', err);
          setError(err as Error);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up listener:', err);
      setError(err as Error);
      setLoading(false);
    }
  }, [userId]);

  // 通知を追加
  const addNotification = useCallback(
    async (notification: Omit<Notification, 'id'>): Promise<void> => {
      if (!userId) throw new Error('User not authenticated');

      try {
        const notificationsRef = collection(db, 'users', userId, 'notifications');
        await addDoc(notificationsRef, {
          ...notification,
          createdAt: Timestamp.now(),
        });
      } catch (err) {
        console.error('Error adding notification:', err);
        throw err;
      }
    },
    [userId]
  );

  // 通知を既読にする
  const markAsRead = useCallback(
    async (notificationId: string): Promise<void> => {
      if (!userId) throw new Error('User not authenticated');

      try {
        const notificationRef = doc(db, 'users', userId, 'notifications', notificationId);
        await updateDoc(notificationRef, { read: true });
      } catch (err) {
        console.error('Error marking notification as read:', err);
        throw err;
      }
    },
    [userId]
  );

  // 通知を削除
  const deleteNotification = useCallback(
    async (notificationId: string): Promise<void> => {
      if (!userId) throw new Error('User not authenticated');

      try {
        const notificationRef = doc(db, 'users', userId, 'notifications', notificationId);
        await deleteDoc(notificationRef);
      } catch (err) {
        console.error('Error deleting notification:', err);
        throw err;
      }
    },
    [userId]
  );

  // すべての通知を既読にする
  const markAllAsRead = useCallback(async (): Promise<void> => {
    if (!userId) throw new Error('User not authenticated');

    try {
      const promises = notifications
        .filter((n) => !n.read)
        .map((n) => markAsRead(n.id));

      await Promise.all(promises);
    } catch (err) {
      console.error('Error marking all as read:', err);
      throw err;
    }
  }, [userId, notifications, markAsRead]);

  // 未読数を計算
  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    loading,
    error,
    addNotification,
    markAsRead,
    deleteNotification,
    markAllAsRead,
  };
};
