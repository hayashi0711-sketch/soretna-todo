import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  onAuthStateChanged, GoogleAuthProvider,
  signInWithPopup, signOut,
} from 'firebase/auth';
import {
  collection, doc, setDoc, deleteDoc,
  onSnapshot, query, where, orderBy,
  getDocs, writeBatch,
} from 'firebase/firestore';
import { auth, db } from './firebase';

const LOCAL_KEY = 'syncGroupId';

// App.jsx の FIXED_TAGS と同期して定義（タグ定義の Firestore 保存に使用）
const FIXED_TAG_DEFS = [
  { id: 'shopping', label: '買物',     color: '#22d3ee' },
  { id: 'stock',    label: 'ストック有', color: '#a78bfa' },
];

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// sharedTagIds に対応するタグ定義オブジェクト配列を返す
function buildSharedTagDefs(sharedTagIds, userTags) {
  const allDefs = [...FIXED_TAG_DEFS, ...userTags];
  return sharedTagIds
    .map(id => allDefs.find(t => t.id === id))
    .filter(Boolean)
    .map(({ id, label, color }) => ({ id, label, color }));
}

export function useSync({ todos, setTodos, tags, setTags, sharedFixedTagIds = [], setSharedFixedTagIds }) {
  const [user,        setUser]        = useState(null);
  const [groupId,     setGroupId]     = useState(null);
  const [groupCode,   setGroupCode]   = useState(null);
  const [memberCount, setMemberCount] = useState(0);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError,  setLoginError]  = useState(null);
  const [messages,       setMessages]       = useState([]);
  const [lastReadAt,     setLastReadAt]     = useState(0);
  const [readStatuses,   setReadStatuses]   = useState({});
  const [sharedMealPlan, setSharedMealPlan] = useState({});
  const lastWrittenMeals = useRef(null);

  // ローカルで書いた ID を記録して Firestore からの echo を無視する
  const localWriteIds = useRef(new Set());

  // ── 認証状態の監視 ──────────────────────────────────────────────────────
  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      setUser(u);
      setAuthLoading(false);
      if (u) {
        const saved = localStorage.getItem(LOCAL_KEY);
        if (saved) setGroupId(saved);
      } else {
        setGroupId(null);
        setGroupCode(null);
      }
    });
  }, []);

  // ── グループ情報（meta）の監視 ──────────────────────────────────────────
  useEffect(() => {
    if (!groupId) return;
    const unsub = onSnapshot(doc(db, 'groups', groupId), snap => {
      if (!snap.exists()) return;
      const data = snap.data();
      setGroupCode(data.inviteCode || null);
      setMemberCount((data.memberUids || []).length);
      const sharedIds   = data.sharedTagIds || [];
      const sharedDefs  = data.sharedTags   || [];
      const fixedIds    = FIXED_TAG_DEFS.map(t => t.id);
      setTags(prev => {
        // 他メンバーが追加した未知のタグをローカルにマージ
        const known = new Map(prev.map(t => [t.id, t]));
        sharedDefs.forEach(def => {
          if (!fixedIds.includes(def.id) && !known.has(def.id)) {
            known.set(def.id, { ...def, shared: true });
          }
        });
        return [...known.values()].map(tg => ({ ...tg, shared: sharedIds.includes(tg.id) }));
      });
      setSharedFixedTagIds(fixedIds.filter(id => sharedIds.includes(id)));
    });
    return unsub;
  }, [groupId, setTags, setSharedFixedTagIds]);

  // ── 共有タスクのリアルタイム監視 ────────────────────────────────────────
  useEffect(() => {
    if (!groupId || !user) return;
    const unsub = onSnapshot(collection(db, 'groups', groupId, 'tasks'), snapshot => {
      snapshot.docChanges().forEach(change => {
        const data = change.doc.data();
        // 自分が書いた直後のエコーは無視
        if (localWriteIds.current.has(String(data.id))) {
          localWriteIds.current.delete(String(data.id));
          return;
        }
        if (change.type === 'added' || change.type === 'modified') {
          setTodos(prev => {
            const exists = prev.some(t => String(t.id) === String(data.id));
            if (exists) return prev.map(t => String(t.id) === String(data.id) ? { ...t, ...data } : t);
            return [data, ...prev];
          });
        }
        if (change.type === 'removed') {
          setTodos(prev => prev.filter(t => String(t.id) !== String(data.id)));
        }
      });
    });
    return unsub;
  }, [groupId, user, setTodos]);

  // ── helpers ──────────────────────────────────────────────────────────────
  const isSharedTag = useCallback((tagId) => {
    return tags.some(tg => tg.id === tagId && tg.shared) || sharedFixedTagIds.includes(tagId);
  }, [tags, sharedFixedTagIds]);

  // ── Firestore への書き込み ────────────────────────────────────────────────
  const syncAddOrUpdate = useCallback(async (task) => {
    if (!groupId || !user) return;
    if (!isSharedTag(task.tagId)) return;
    try {
      const strId = String(task.id);
      localWriteIds.current.add(strId);
      await setDoc(
        doc(db, 'groups', groupId, 'tasks', strId),
        { ...task, updatedAt: Date.now() }
      );
    } catch (e) {
      console.warn('sync write error:', e);
    }
  }, [groupId, user, isSharedTag]);

  const syncDelete = useCallback(async (id) => {
    if (!groupId || !user) return;
    try {
      await deleteDoc(doc(db, 'groups', groupId, 'tasks', String(id)));
    } catch (e) {
      console.warn('sync delete error:', e);
    }
  }, [groupId, user]);

  // ── グループ作成 ──────────────────────────────────────────────────────────
  const createGroup = useCallback(async () => {
    if (!user) return;
    const code  = randomCode();
    const gId   = `${user.uid.slice(0, 8)}_${Date.now().toString(36)}`;
    const allSharedIds = [...sharedFixedTagIds, ...tags.filter(tg => tg.shared).map(tg => tg.id)];

    await setDoc(doc(db, 'groups', gId), {
      inviteCode:   code,
      memberUids:   [user.uid],
      sharedTagIds: allSharedIds,
      sharedTags:   buildSharedTagDefs(allSharedIds, tags),
      createdAt:    Date.now(),
    });

    // 既存の共有タグタスクを一括アップロード
    const batch = writeBatch(db);
    todos
      .filter(td => allSharedIds.includes(td.tagId))
      .forEach(task => {
        batch.set(
          doc(db, 'groups', gId, 'tasks', String(task.id)),
          { ...task, updatedAt: Date.now() }
        );
      });
    await batch.commit();

    localStorage.setItem(LOCAL_KEY, gId);
    setGroupId(gId);
    setGroupCode(code);
    return code;
  }, [user, tags, todos, sharedFixedTagIds]);

  // ── グループ参加 ──────────────────────────────────────────────────────────
  const joinGroup = useCallback(async (code) => {
    if (!user) return 'notLoggedIn';
    try {
      const q    = query(collection(db, 'groups'), where('inviteCode', '==', code.trim().toUpperCase()));
      const snap = await getDocs(q);
      if (snap.empty) return 'notFound';

      const gDoc  = snap.docs[0];
      const gId   = gDoc.id;
      const gData = gDoc.data();

      // メンバーに追加
      await setDoc(doc(db, 'groups', gId), {
        ...gData,
        memberUids: [...new Set([...(gData.memberUids || []), user.uid])],
      });

      // 自分のローカルタスクの中で共有タグに該当するものをアップロード
      const sharedIds = gData.sharedTagIds || [];
      const batch = writeBatch(db);
      todos
        .filter(td => sharedIds.includes(td.tagId))
        .forEach(task => {
          batch.set(
            doc(db, 'groups', gId, 'tasks', String(task.id)),
            { ...task, updatedAt: Date.now() }
          );
        });
      await batch.commit();

      localStorage.setItem(LOCAL_KEY, gId);
      setGroupId(gId);
      return 'ok';
    } catch (e) {
      console.warn('joinGroup error:', e);
      return 'error';
    }
  }, [user, todos]);

  // ── グループ退出 ──────────────────────────────────────────────────────────
  const leaveGroup = useCallback(() => {
    localStorage.removeItem(LOCAL_KEY);
    setGroupId(null);
    setGroupCode(null);
    setMemberCount(0);
    setTags(prev => prev.map(tg => ({ ...tg, shared: false })));
    setSharedFixedTagIds([]);
  }, [setTags, setSharedFixedTagIds]);

  // ── メッセージ監視 ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!groupId || !user) return;
    const unsub = onSnapshot(
      query(collection(db, 'groups', groupId, 'messages'), orderBy('createdAt', 'asc')),
      snapshot => {
        const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setMessages(msgs);
      }
    );
    return unsub;
  }, [groupId, user]);

  // ── 献立リアルタイム監視 ────────────────────────────────────────────────────
  useEffect(() => {
    if (!groupId) { setSharedMealPlan({}); return; }
    const unsub = onSnapshot(doc(db, 'groups', groupId, 'mealPlan', 'shared'), snap => {
      if (!snap.exists()) { setSharedMealPlan({}); return; }
      const incoming = JSON.stringify(snap.data().meals || {});
      if (incoming === lastWrittenMeals.current) {
        lastWrittenMeals.current = null;
        return;
      }
      setSharedMealPlan(snap.data().meals || {});
    });
    return unsub;
  }, [groupId]);

  const updateMealPlan = useCallback(async (meals) => {
    if (!groupId) return;
    setSharedMealPlan(meals);
    lastWrittenMeals.current = JSON.stringify(meals);
    try {
      await setDoc(doc(db, 'groups', groupId, 'mealPlan', 'shared'), { meals, updatedAt: Date.now() });
    } catch (e) {
      console.warn('updateMealPlan error:', e);
      lastWrittenMeals.current = null;
    }
  }, [groupId]);

  // ── 既読ステータス監視（各ユーザーの lastReadAt） ─────────────────────────
  useEffect(() => {
    if (!groupId || !user) return;
    const unsub = onSnapshot(
      collection(db, 'groups', groupId, 'readStatus'),
      snapshot => {
        const statuses = {};
        snapshot.docs.forEach(d => { statuses[d.id] = d.data().lastReadAt || 0; });
        setReadStatuses(statuses);
      }
    );
    return unsub;
  }, [groupId, user]);

  // groupId 変更時に lastReadAt を localStorage から復元、離脱時はリセット
  useEffect(() => {
    if (groupId) {
      try { setLastReadAt(parseInt(localStorage.getItem(`lastReadAt_${groupId}`) || '0', 10)); }
      catch { setLastReadAt(0); }
    } else {
      setLastReadAt(0);
      setMessages([]);
      setReadStatuses({});
    }
  }, [groupId]);

  // ── 未読カウント ────────────────────────────────────────────────────────────
  const unreadCount = useMemo(() => {
    if (!groupId || !user) return 0;
    return messages.filter(m => m.createdAt > lastReadAt && m.senderUid !== user.uid).length;
  }, [messages, lastReadAt, groupId, user]);

  // ── メッセージ送信 ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text, senderName, senderEmoji) => {
    if (!groupId || !user || !text.trim()) return;
    const msgId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    try {
      await setDoc(doc(db, 'groups', groupId, 'messages', msgId), {
        id: msgId,
        text: text.trim(),
        senderName:  senderName  || 'ユーザー',
        senderEmoji: senderEmoji || '🐱',
        senderUid: user.uid,
        createdAt: Date.now(),
      });
    } catch (e) {
      console.warn('sendMessage error:', e);
    }
  }, [groupId, user]);

  // ── 既読マーク（ローカル + Firestore） ─────────────────────────────────────
  const markAsRead = useCallback(() => {
    if (!groupId || !user) return;
    const now = Date.now();
    try { localStorage.setItem(`lastReadAt_${groupId}`, String(now)); } catch {}
    setLastReadAt(now);
    // Firestore に書き込み（fire and forget）
    setDoc(doc(db, 'groups', groupId, 'readStatus', user.uid), { lastReadAt: now }, { merge: true })
      .catch(e => console.warn('markAsRead Firestore error:', e));
  }, [groupId, user]);

  // ── 共有タグIDとタグ定義をFirestoreに保存 ──────────────────────────────
  const updateSharedTagIds = useCallback(async (sharedTagIds) => {
    if (!groupId) return;
    try {
      await setDoc(doc(db, 'groups', groupId), {
        sharedTagIds,
        sharedTags: buildSharedTagDefs(sharedTagIds, tags),
      }, { merge: true });
    } catch (e) {
      console.warn('updateSharedTagIds error:', e);
    }
  }, [groupId, tags]);

  // ── ログイン / ログアウト ─────────────────────────────────────────────────
  const login = async () => {
    setLoginError(null);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e) {
      console.warn('login error:', e);
      setLoginError(e.message || 'ログインに失敗しました');
    }
  };
  const logout = async () => { await signOut(auth); leaveGroup(); };

  return {
    user, groupId, groupCode, memberCount, authLoading, loginError,
    isSharedTag, syncAddOrUpdate, syncDelete,
    createGroup, joinGroup, leaveGroup, updateSharedTagIds,
    login, logout,
    messages, unreadCount, sendMessage, markAsRead, readStatuses,
    sharedMealPlan, updateMealPlan,
  };
}
