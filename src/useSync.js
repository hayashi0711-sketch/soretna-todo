import { useState, useEffect, useRef, useCallback } from 'react';
import {
  onAuthStateChanged, GoogleAuthProvider,
  signInWithPopup, signInWithRedirect, getRedirectResult, signOut,
} from 'firebase/auth';

// iOS Safari / WebView はポップアップ不可 → リダイレクト方式を使う
const isMobileOrSafari = () =>
  /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (/Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent));
import {
  collection, doc, setDoc, deleteDoc,
  onSnapshot, query, where,
  getDocs, writeBatch,
} from 'firebase/firestore';
import { auth, db } from './firebase';

const LOCAL_KEY = 'syncGroupId';

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function useSync({ todos, setTodos, tags, setTags }) {
  const [user,        setUser]        = useState(null);
  const [groupId,     setGroupId]     = useState(null);
  const [groupCode,   setGroupCode]   = useState(null);
  const [memberCount, setMemberCount] = useState(0);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError,  setLoginError]  = useState(null);
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  // ローカルで書いた ID を記録して Firestore からの echo を無視する
  const localWriteIds = useRef(new Set());

  // ── 認証状態の監視 ──────────────────────────────────────────────────────
  useEffect(() => {
    // リダイレクト方式でログインした場合の結果を受け取る
    getRedirectResult(auth).then(result => {
      if (result?.user) {
        // リダイレクトログイン完了 → モーダルを再表示させるためフラグをセット
        setJustLoggedIn(true);
      }
    }).catch(e => {
      if (e.code !== 'auth/no-current-user') {
        setLoginError(e.message || 'ログインに失敗しました');
      }
    });

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
      // tags の shared フラグを更新
      const sharedIds = data.sharedTagIds || [];
      setTags(prev => prev.map(tg => ({ ...tg, shared: sharedIds.includes(tg.id) })));
    });
    return unsub;
  }, [groupId, setTags]);

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
    return tags.some(tg => tg.id === tagId && tg.shared);
  }, [tags]);

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
    const sharedIds = tags.filter(tg => tg.shared).map(tg => tg.id);

    await setDoc(doc(db, 'groups', gId), {
      inviteCode:   code,
      memberUids:   [user.uid],
      sharedTagIds: sharedIds,
      createdAt:    Date.now(),
    });

    // 既存の共有タグタスクを一括アップロード
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
    setGroupCode(code);
    return code;
  }, [user, tags, todos]);

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
  }, [setTags]);

  // ── 共有タグIDをFirestoreに保存 ─────────────────────────────────────────
  const updateSharedTagIds = useCallback(async (sharedTagIds) => {
    if (!groupId) return;
    try {
      await setDoc(doc(db, 'groups', groupId), { sharedTagIds }, { merge: true });
    } catch (e) {
      console.warn('updateSharedTagIds error:', e);
    }
  }, [groupId]);

  // ── ログイン / ログアウト ─────────────────────────────────────────────────
  const login = async () => {
    setLoginError(null);
    try {
      const provider = new GoogleAuthProvider();
      if (isMobileOrSafari()) {
        await signInWithRedirect(auth, provider);
      } else {
        await signInWithPopup(auth, provider);
      }
    } catch (e) {
      console.warn('login error:', e);
      setLoginError(e.message || 'ログインに失敗しました');
    }
  };
  const logout = async () => { await signOut(auth); leaveGroup(); };

  return {
    user, groupId, groupCode, memberCount, authLoading, loginError, justLoggedIn,
    isSharedTag, syncAddOrUpdate, syncDelete,
    createGroup, joinGroup, leaveGroup, updateSharedTagIds,
    login, logout,
  };
}
