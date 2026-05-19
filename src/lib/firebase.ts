import { initializeApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  Auth
} from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  Firestore,
  enableIndexedDbPersistence
} from 'firebase/firestore';

// Firebase 設定情報
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Firebase の初期化
const app = initializeApp(firebaseConfig);

// Auth と Firestore の取得
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

// 開発環境でエミュレータを使用（オプション）
if (import.meta.env.DEV && !window.location.hostname.includes('localhost:5173')) {
  // 本当の localhost:5173 でない場合のみエミュレータに接続
  // これにより、本番環境では Firebase に接続します
}

// オフラインサポート: IndexedDB で Firestore データをキャッシュ
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.log('複数のタブが開いています。オフラインサポートは無効です。');
    } else if (err.code === 'unimplemented') {
      console.log('このブラウザはオフラインサポートに対応していません。');
    }
  });
} catch (err) {
  console.warn('オフラインサポートの初期化に失敗しました:', err);
}

export default app;
