import { useEffect, useState, useCallback } from 'react';
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface SharedTag {
  id: string;
  name: string;
  color: string;
}

export interface GroupTodo {
  id: string;
  groupId: string;
  text: string;
  done: boolean;
  priority: 'high' | 'medium' | 'low';
  deadline?: Timestamp;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedBy?: string;
  completedAt?: Timestamp;
  tags: string[];
  description?: string;
  watchers?: Record<string, { lastViewedAt: Timestamp }>;
}

interface UseGroupTodosReturn {
  todos: GroupTodo[];
  loading: boolean;
  error: Error | null;
  addTodo: (groupId: string, text: string, priority?: string, tags?: string[]) => Promise<string>;
  updateTodo: (groupId: string, todoId: string, updates: Partial<GroupTodo>) => Promise<void>;
  deleteTodo: (groupId: string, todoId: string) => Promise<void>;
  toggleTodo: (groupId: string, todoId: string, userId: string) => Promise<void>;
}

export const useGroupTodos = (groupId: string | null | undefined): UseGroupTodosReturn => {
  const [todos, setTodos] = useState<GroupTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // グループのタスクを購読
  useEffect(() => {
    if (!groupId) {
      setTodos([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const todosRef = collection(db, 'groups', groupId, 'todos');
      const q = query(todosRef, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const todoList: GroupTodo[] = [];
          snapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            todoList.push({
              id: docSnapshot.id,
              groupId,
              text: data.text || '',
              done: data.done || false,
              priority: data.priority || 'medium',
              deadline: data.deadline,
              createdBy: data.createdBy,
              createdAt: data.createdAt || Timestamp.now(),
              updatedAt: data.updatedAt || Timestamp.now(),
              completedBy: data.completedBy,
              completedAt: data.completedAt,
              tags: data.tags || [],
              description: data.description || '',
              watchers: data.watchers || {},
            } as GroupTodo);
          });

          setTodos(todoList);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Error fetching todos:', err);
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
  }, [groupId]);

  // タスクを追加
  const addTodo = useCallback(
    async (groupId: string, text: string, priority: string = 'medium', tags: string[] = []): Promise<string> => {
      if (!groupId) throw new Error('Group not selected');

      try {
        const todosRef = collection(db, 'groups', groupId, 'todos');
        const newTodo = {
          text: text.trim(),
          done: false,
          priority,
          tags,
          createdBy: 'current-user-id', // 後で userId に置き換える
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          description: '',
          watchers: {},
        };

        const docRef = await addDoc(todosRef, newTodo);
        return docRef.id;
      } catch (err) {
        console.error('Error adding todo:', err);
        throw err;
      }
    },
    []
  );

  // タスクを更新
  const updateTodo = useCallback(
    async (groupId: string, todoId: string, updates: Partial<GroupTodo>): Promise<void> => {
      if (!groupId) throw new Error('Group not selected');

      try {
        const todoRef = doc(db, 'groups', groupId, 'todos', todoId);
        const updateData = {
          ...updates,
          updatedAt: Timestamp.now(),
        };

        delete updateData.id;
        delete updateData.groupId;
        delete updateData.createdBy;
        delete updateData.createdAt;

        await updateDoc(todoRef, updateData);
      } catch (err) {
        console.error('Error updating todo:', err);
        throw err;
      }
    },
    []
  );

  // タスクを削除
  const deleteTodo = useCallback(
    async (groupId: string, todoId: string): Promise<void> => {
      if (!groupId) throw new Error('Group not selected');

      try {
        const todoRef = doc(db, 'groups', groupId, 'todos', todoId);
        await deleteDoc(todoRef);
      } catch (err) {
        console.error('Error deleting todo:', err);
        throw err;
      }
    },
    []
  );

  // タスクの完了状態をトグル
  const toggleTodo = useCallback(
    async (groupId: string, todoId: string, userId: string): Promise<void> => {
      if (!groupId) throw new Error('Group not selected');

      try {
        const todo = todos.find((t) => t.id === todoId);
        if (!todo) throw new Error('Todo not found');

        const todoRef = doc(db, 'groups', groupId, 'todos', todoId);
        const updateData = {
          done: !todo.done,
          updatedAt: Timestamp.now(),
          ...(todo.done ? {} : {
            completedBy: userId,
            completedAt: Timestamp.now(),
          }),
        };

        await updateDoc(todoRef, updateData);
      } catch (err) {
        console.error('Error toggling todo:', err);
        throw err;
      }
    },
    [todos]
  );

  return {
    todos,
    loading,
    error,
    addTodo,
    updateTodo,
    deleteTodo,
    toggleTodo,
  };
};
