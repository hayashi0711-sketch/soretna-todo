# Firebase 初期設定 チェックリスト

このチェックリストに従って、Firebase の初期設定を完了してください。

---

## ✅ Step 1: パッケージのインストール

**ステータス**: 📋 実行待ち

ターミナルで以下のコマンドを実行してください：

```bash
npm install firebase react-firebase-hooks
```

**確認方法**:
```bash
npm list firebase react-firebase-hooks
```

出力例：
```
soretna-todo@3.0.0 /path/to/soretna-todo
├── firebase@10.x.x
└── react-firebase-hooks@5.x.x
```

- [ ] firebase がインストールされた
- [ ] react-firebase-hooks がインストールされた

---

## ✅ Step 2: Firebase プロジェクトの作成

**ステータス**: 📋 実行待ち

### 2-1: Firebase Console にアクセス

1. https://console.firebase.google.com/ にアクセス
2. Google アカウントでログイン

- [ ] Firebase Console にアクセスできた

### 2-2: プロジェクトを作成

1. **「プロジェクトを作成」** をクリック
2. プロジェクト名を入力（例：`soretna-todo`）
3. Google Analytics を有効化（オプション）
4. **「プロジェクトを作成」** をクリック
5. プロジェクトの準備が完了するまで待機（約 1-2 分）

- [ ] Firebase プロジェクトが作成された
- [ ] プロジェクト ID を確認した（例：`soretna-todo`）

---

## ✅ Step 3: Web アプリの登録

**ステータス**: 📋 実行待ち

1. Firebase コンソール → **プロジェクト設定**（⚙️ アイコン）をクリック
2. **「アプリを追加」** または **「</> を追加」** をクリック
3. **Web** を選択
4. アプリ名を入力（例：`soretna-todo-web`）
5. **「ホスティングもセットアップします」** は チェックしない
6. **「登録」** をクリック

- [ ] Web アプリが登録された

---

## ✅ Step 4: Firebase 認証情報の取得と設定

**ステータス**: 📋 実行待ち

### 4-1: 認証情報を表示

登録後、以下の形式で設定情報が表示されます：

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyD...",
  authDomain: "soretna-todo.firebaseapp.com",
  projectId: "soretna-todo",
  storageBucket: "soretna-todo.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};
```

各値をコピーしてください。

- [ ] apiKey をコピーした
- [ ] authDomain をコピーした
- [ ] projectId をコピーした
- [ ] storageBucket をコピーした
- [ ] messagingSenderId をコピーした
- [ ] appId をコピーした

### 4-2: 環境変数を設定

プロジェクトのルートディレクトリの `.env.local` ファイルを開いて、以下の情報を入力してください：

```
VITE_FIREBASE_API_KEY=AIzaSyD...
VITE_FIREBASE_AUTH_DOMAIN=soretna-todo.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=soretna-todo
VITE_FIREBASE_STORAGE_BUCKET=soretna-todo.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123def456
```

- [ ] `.env.local` に すべての値を入力した
- [ ] ファイルを保存した

---

## ✅ Step 5: Firebase Authentication を有効化

**ステータス**: 📋 実行待ち

1. Firebase コンソール → **Authentication** をクリック
2. **「Sign-in method」** タブをクリック
3. **「メール/パスワード」** をクリック
4. **「有効にする」** をクリック
5. **「保存」** をクリック

- [ ] Email/Password 認証が有効化された

---

## ✅ Step 6: Firestore Database を作成

**ステータス**: 📋 実行待ち

1. Firebase コンソール → **Firestore Database** をクリック
2. **「データベースを作成」** をクリック
3. **ロケーションを選択** （例：`asia-northeast1` (東京)）
4. **「次へ」** をクリック
5. **セキュリティルール**: **「テストモードで開始」** を選択
6. **「作成」** をクリック

- [ ] Firestore Database が作成された
- [ ] ロケーションを確認した

---

## ✅ Step 7: Firestore Security Rules を設定

**ステータス**: 📋 実行待ち

1. Firebase コンソール → **Firestore Database** → **ルール** タブ
2. 現在のルールをすべて削除
3. 以下のルールをコピー & ペーストしてください：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザーは自分のデータのみアクセス可能
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;

      // 各ユーザーの Todos
      match /todos/{todoId} {
        allow read, write: if request.auth.uid == userId;
      }
    }

    // その他のアクセスは拒否
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

4. **「公開」** をクリック

- [ ] Firestore Security Rules が設定された

---

## ✅ Step 8: 開発サーバーを起動してテスト

**ステータス**: 📋 実行待ち

ターミナルで以下のコマンドを実行してください：

```bash
npm run dev
```

ブラウザで `http://localhost:5173` にアクセスしてください。

**確認事項:**
- [ ] 開発サーバーが起動した
- [ ] ブラウザで `http://localhost:5173` にアクセスできた
- [ ] コンソールにエラーが表示されていない

---

## ✅ Step 9: 初期設定ファイルの確認

**ステータス**: ✅ 完了

以下のファイルが作成されています：

- [x] `src/lib/firebase.ts` - Firebase 初期設定
- [x] `src/hooks/useAuth.ts` - 認証カスタムフック
- [x] `src/hooks/useTodos.ts` - Todo データ操作フック
- [x] `.env.local` - 環境変数テンプレート
- [x] `vite.config.js` - Vite 設定（@/ エイリアス）
- [x] `FIREBASE_SETUP.md` - セットアップガイド

---

## 📊 進捗状況

完了したステップ: `[ ] / [ ] / [ ] / [ ] / [ ] / [ ] / [ ] / [ ] / [x]`

---

## 🎯 次のステップ

初期設定が完了したら、以下を実装してください：

1. **ログイン / サインアップコンポーネント** を実装
   - `useAuth` フックを使用
   - Email/Password フォームを作成

2. **Todo リストコンポーネント** を実装
   - `useTodos` フックを使用
   - Todo 追加、編集、削除機能

3. **複数デバイス間の同期** をテスト
   - 複数のブラウザタブで同時にテスト
   - リアルタイム更新を確認

4. **本番環境にデプロイ**
   - Netlify または Vercel にデプロイ

---

## 📞 ヘルプが必要な場合

### よくある問題と解決方法

**Q: "Cannot find module '@/lib/firebase'" エラーが表示される**

A: `vite.config.js` に以下が設定されているか確認してください：
```javascript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
},
```

**Q: 環境変数が読み込まれない**

A: 
1. ファイル名が `.env.local` か確認（`.env` ではない）
2. Vite は `VITE_` プレフィックスを要求
3. 開発サーバーを再起動してください

**Q: "Permission denied" エラーが出る**

A:
1. Firestore Security Rules が正しく設定されているか確認
2. Firebase コンソール → Firestore Database → Rules で確認
3. **「公開」** をクリックしているか確認

---

## 📚 参考資料

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [React Firebase Hooks](https://github.com/csfrequency/react-firebase-hooks)
- [Vite Documentation](https://vitejs.dev/)

---

**最終更新**: 2026-05-19
