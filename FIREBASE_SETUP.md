# Firebase セットアップガイド

このドキュメントでは、soretna-todo プロジェクトに Firebase Firestore と Firebase Authentication を統合するための手順を説明します。

---

## 📋 前提条件

- Node.js 16以上がインストールされていること
- npm または yarn がインストールされていること
- Google アカウント（Firebase プロジェクト作成用）

---

## 🚀 インストール手順

### Step 1: 必要なパッケージをインストール

プロジェクトディレクトリで以下のコマンドを実行してください：

```bash
npm install firebase react-firebase-hooks
```

または yarn を使用している場合：

```bash
yarn add firebase react-firebase-hooks
```

**インストールされるパッケージ：**
- `firebase`: Firebase SDK
- `react-firebase-hooks`: React での Firebase 統合を簡単にする Hooks

### Step 2: Firebase プロジェクトを作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. **「プロジェクトを作成」** をクリック
3. プロジェクト名を入力（例：`soretna-todo`）
4. Google Analytics を有効化（オプション）
5. **「プロジェクトを作成」** をクリック

### Step 3: Web アプリを登録

1. Firebase コンソール → **プロジェクト設定** をクリック
2. **「</> を追加」** をクリックして Web アプリを登録
3. アプリ名を入力（例：`soretna-todo-web`）
4. 「ホスティングもセットアップします」は チェックしない
5. **「登録」** をクリック

### Step 4: Firebase 認証情報を取得

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

### Step 5: 環境変数を設定

プロジェクトのルートディレクトリに `.env.local` ファイルがあります。以下の情報を入力してください：

ファイル: `.env.local`

```
VITE_FIREBASE_API_KEY=AIzaSyD...
VITE_FIREBASE_AUTH_DOMAIN=soretna-todo.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=soretna-todo
VITE_FIREBASE_STORAGE_BUCKET=soretna-todo.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123def456
```

⚠️ **重要**: `.env.local` は Git にコミットされません。安全です。

---

## 🔐 Firebase Authentication セットアップ

### 1. Email/Password 認証を有効化

1. Firebase コンソール → **Authentication** → **Sign-in method** タブ
2. **Email/Password** をクリック
3. **「有効にする」** をクリック
4. **「保存」** をクリック

### 2. Firestore Security Rules を設定

1. Firebase コンソール → **Firestore Database** → **Rules** タブ
2. 以下のルールを設定：

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

3. **「公開」** をクリック

---

## 📁 プロジェクト構造

セットアップファイルが以下の場所に作成されています：

```
soretna-todo/
├── src/
│   ├── lib/
│   │   └── firebase.ts          # Firebase 初期設定
│   ├── hooks/
│   │   ├── useAuth.ts           # 認証カスタムフック
│   │   └── useTodos.ts          # Todo データ操作フック
│   ├── App.jsx
│   └── main.jsx
├── .env.local                   # 環境変数（Git に含まれない）
├── vite.config.js               # Vite 設定（@/ エイリアス追加済み）
└── package.json
```

---

## 🎯 使用方法

### 認証の使用例

```jsx
import { useAuth } from '@/hooks/useAuth';

function LoginPage() {
  const { user, signIn, signUp, error } = useAuth();

  const handleSignUp = async (email, password) => {
    try {
      await signUp(email, password);
      // ユーザーが作成されました
    } catch (err) {
      console.error('Sign up failed:', err);
    }
  };

  const handleSignIn = async (email, password) => {
    try {
      await signIn(email, password);
      // ログイン成功
    } catch (err) {
      console.error('Sign in failed:', err);
    }
  };

  return (
    <div>
      {user ? <p>Logged in as {user.email}</p> : <p>Please log in</p>}
      {error && <p>Error: {error.message}</p>}
    </div>
  );
}
```

### Todo データ操作の使用例

```jsx
import { useAuth } from '@/hooks/useAuth';
import { useTodos } from '@/hooks/useTodos';
import { useState } from 'react';

function TodoApp() {
  const { user } = useAuth();
  const { todos, loading, addTodo, updateTodo, deleteTodo, toggleTodo } = useTodos(user?.uid);
  const [newTitle, setNewTitle] = useState('');

  const handleAddTodo = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      await addTodo(newTitle, '', 'medium');
      setNewTitle('');
    } catch (err) {
      console.error('Failed to add todo:', err);
    }
  };

  const handleToggle = async (todoId) => {
    try {
      await toggleTodo(todoId);
    } catch (err) {
      console.error('Failed to toggle todo:', err);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>My Todos</h1>

      <form onSubmit={handleAddTodo}>
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="新しいタスクを入力..."
        />
        <button type="submit">追加</button>
      </form>

      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => handleToggle(todo.id)}
            />
            <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
              {todo.title}
            </span>
            <button onClick={() => deleteTodo(todo.id)}>削除</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TodoApp;
```

---

## 🧪 開発サーバーの起動

すべてのセットアップが完了したら、以下のコマンドで開発サーバーを起動します：

```bash
npm run dev
```

ブラウザで `http://localhost:5173` にアクセスしてください。

---

## 🆘 トラブルシューティング

### Issue: "Cannot find module '@/lib/firebase'"

**解決策**: `vite.config.js` に以下が設定されているか確認してください：

```javascript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
},
```

### Issue: "Permission denied" エラー

**原因**: Firestore Security Rules が正しく設定されていない

**確認**:
1. Firebase コンソール → Firestore Database → Rules
2. ルールが正しく設定されているか確認
3. **「公開」** をクリックしているか確認

### Issue: 環境変数が読み込まれない

**確認**:
1. ファイル名が `.env.local` か確認（`.env` ではない）
2. Vite が VITE_ プレフィックスを要求しています
3. 開発サーバーを再起動してください（`npm run dev`）

---

## 📚 次のステップ

1. **ログイン / サインアップコンポーネント** を実装
2. **Todo リストコンポーネント** を実装
3. **複数デバイス間の同期** をテスト
4. **本番環境にデプロイ** （Netlify, Vercel など）

---

## 📖 参考リソース

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [React Firebase Hooks](https://github.com/csfrequency/react-firebase-hooks)
- [Vite Documentation](https://vitejs.dev/)

---

## 💡 ヒント

- **オフラインサポート**: Firebase は自動的に IndexedDB を使用してオフラインデータをキャッシュします
- **セキュリティ**: 環境変数を `.gitignore` に含めることで、秘密情報がリポジトリに含まれないようにしています
- **リアルタイム同期**: `useTodos` フックは自動的にリアルタイムでデータを同期します
