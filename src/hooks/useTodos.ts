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
  Query,
  QueryConstraint,
  orderBy,
  where
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Todo {
  id: string;
  userId: string;
  title: string;
  completed: boolean;
  description?: string;
  dueDate?: Timestamp;
  priority: 'high' | 'medium' | 'low';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface UseTodosReturn {
  todos: Todo[];
  loading: boolean;
  error: Error | null;
  addTodo: (title: string, description?: string, priority?: string) => Promise<string>;
  updateTodo: (todoId: string, updates: Partial<Todo>) => Promise<void>;
  deleteTodo: (todoId: string) => Promise<void>;
  toggleTodo: (todoId: string) => Promise<void>;
}

export const useTodos = (userId: string | null | undefined): UseTodosReturn => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // リアルタイムリスナーの設定
  useEffect(() => {
    if (!userId) {
      setTodos([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const todosRef = collection(db, 'users', userId, 'todos');
      const q: Query = query(
        todosRef,
        orderBy('createdAt', 'desc')
      );

      // リアルタイムリスナーの登録
      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const todoList: Todo[] = [];
          querySnapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            todoList.push({
              id: docSnapshot.id,
              userId,
              title: data.title || '',
              completed: data.completed || false,
              description: data.description || '',
              dueDate: data.dueDate,
              priority: data.priority || 'medium',
              createdAt: data.createdAt || Timestamp.now(),
              updatedAt: data.updatedAt || Timestamp.now(),
            } as Todo);
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
  }, [userId]);

  // Todo を追加
  const addTodo = useCallback(
    async (title: string, description?: string, priority: string = 'medium'): Promise<string> => {
      if (!userId) {
        throw new Error('User not authenticated');
      }

      try {
        const todosRef = collection(db, 'users', userId, 'todos');
        const newTodo = {
          title: title.trim(),
          description: description?.trim() || '',
          completed: false,
          priority,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        const docRef = await addDoc(todosRef, newTodo);
        return docRef.id;
      } catch (err) {
        console.error('Error adding todo:', err);
        throw err;
      }
    },
    [userId]
  );

  // Todo を更新
  const updateTodo = useCallback(
    async (todoId: string, updates: Partial<Todo>): Promise<void> => {
      if (!userId) {
        throw new Error('User not authenticated');
      }

      try {
        const todoRef = doc(db, 'users', userId, 'todos', todoId);
        const updateData = {
          ...updates,
          updatedAt: Timestamp.now(),
        };

        // id と userId フィールドは削除
        delete updateData.id;
        delete updateData.userId;

        await updateDoc(todoRef, updateData);
      } catch (err) {
        console.error('Error updating todo:', err);
        throw err;
      }
    },
    [userId]
  );

  // Todo を削除
  const deleteTodo = useCallback(
    async (todoId: string): Promise<void> => {
      if (!userId) {
        throw new Error('User not authenticated');
      }

      try {
        const todoRef = doc(db, 'users', userId, 'todos', todoId);
        await deleteDoc(todoRef);
      } catch (err) {
        console.error('Error deleting todo:', err);
        throw err;
      }
    },
    [userId]
  );

  // Todo の完了状態をトグル
  const toggleTodo = useCallback(
    async (todoId: string): Promise<void> => {
      const todo = todos.find((t) => t.id === todoId);
      if (!todo) {
        throw new Error('Todo not found');
      }

      await updateTodo(todoId, { completed: !todo.completed });
    },
    [todos, updateTodo]
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
