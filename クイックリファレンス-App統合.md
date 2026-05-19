# App.jsx 統合 クイックリファレンス

App.jsx に新機能を統合するための最小限のコード集です。

---

## 🔵 Step 1: インポート追加

```javascript
// 最上部に以下を追加

// === Firebase & Hooks ===
import { useAuth } from '@/hooks/useAuth';
import { useGroups } from '@/hooks/useGroups';
import { useGroupTodos } from '@/hooks/useGroupTodos';
import { useGroupMembers } from '@/hooks/useGroupMembers';
import { useNotifications } from '@/hooks/useNotifications';
import { useActivityFeed } from '@/hooks/useActivityFeed';

// === UI Components ===
import { GroupSelector } from '@/components/Groups/GroupSelector';
import { GroupModal } from '@/components/Groups/GroupModal';
import { SharedTaskForm } from '@/components/SharedTasks/SharedTaskForm';
import { SharedTaskList } from '@/components/SharedTasks/SharedTaskList';
import { NotificationPanel } from '@/components/Notifications/NotificationPanel';
```

---

## 🟢 Step 2: Hook の初期化

```javascript
export default function App() {
  // ====== 既存の状態 ======
  // ... 既存のstate（テーマ、個人タスク等）...

  // ====== 新規: 認証 ======
  const { 
    user, 
    userProfile, 
    loading: authLoading, 
    signUp, 
    signIn, 
    signOut 
  } = useAuth();

  // ====== 新規: グループ管理 ======
  const { 
    groups, 
    loading: groupsLoading, 
    createGroup, 
    updateGroup, 
    deleteGroup,
    addMember,
    removeMember,
    updateMemberRole
  } = useGroups(user?.uid);

  // ====== 新規: メンバー管理 ======
  const { 
    addMemberToGroup, 
    removeMemberFromGroup, 
    updateMemberRoleInGroup 
  } = useGroupMembers();

  // ====== 新規: グループ選択状態 ======
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  // ====== 新規: グループ内タスク ======
  const { 
    todos: groupTodos, 
    loading: todosLoading, 
    addTodo, 
    updateTodo, 
    deleteTodo, 
    toggleTodo 
  } = useGroupTodos(selectedGroupId);

  // ====== 新規: 通知 ======
  const { 
    notifications, 
    unreadCount, 
    loading: notificationsLoading, 
    addNotification, 
    markAsRead, 
    deleteNotification, 
    markAllAsRead 
  } = useNotifications(user?.uid);

  // ====== 新規: アクティビティフィード ======
  const { 
    activities, 
    loading: activitiesLoading, 
    addActivity 
  } = useActivityFeed(selectedGroupId);

  // ====== 新規: グループモーダル状態 ======
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
}
```

---

## 🟡 Step 3: イベントハンドラー実装

```javascript
// ====== グループ作成ハンドラー ======
const handleCreateGroup = async (formData) => {
  try {
    const groupId = await createGroup(formData.name, formData.description);
    setSelectedGroupId(groupId);
    setIsGroupModalOpen(false);
    
    // グループ作成通知
    await addNotification({
      userId: user.uid,
      type: 'group_created',
      groupId,
      message: `グループ「${formData.name}」を作成しました`,
      triggeredBy: user.uid,
      triggeredByName: userProfile?.displayName,
      read: false,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error('Error creating group:', err);
    alert('グループ作成に失敗しました');
  }
};

// ====== タスク追加ハンドラー ======
const handleAddGroupTask = async (taskData) => {
  try {
    const taskId = await addTodo(
      selectedGroupId, 
      taskData.text, 
      taskData.priority, 
      taskData.tags
    );
    
    // タスク作成通知
    await addNotification({
      userId: user.uid,
      type: 'todo_created',
      groupId: selectedGroupId,
      message: `「${taskData.text}」が追加されました`,
      triggeredBy: user.uid,
      triggeredByName: userProfile?.displayName,
      relatedTodoId: taskId,
      read: false,
      createdAt: new Date(),
    });
    
    // アクティビティ記録
    await addActivity({
      userId: user.uid,
      userName: userProfile?.displayName || 'User',
      type: 'todo_created',
      description: `${taskData.text} を作成しました`,
      relatedTodoId: taskId,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error('Error adding task:', err);
    alert('タスク作成に失敗しました');
  }
};

// ====== タスク完了トグル ======
const handleToggleGroupTask = async (taskId) => {
  try {
    const todo = groupTodos.find(t => t.id === taskId);
    if (!todo) return;
    
    await toggleTodo(selectedGroupId, taskId, user.uid);
    
    // アクティビティ記録
    await addActivity({
      userId: user.uid,
      userName: userProfile?.displayName || 'User',
      type: todo.done ? 'todo_completed' : 'todo_updated',
      description: `「${todo.text}」を${todo.done ? '完了' : '再開'}しました`,
      relatedTodoId: taskId,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error('Error toggling task:', err);
  }
};

// ====== タスク削除ハンドラー ======
const handleDeleteGroupTask = async (taskId) => {
  try {
    await deleteTodo(selectedGroupId, taskId);
  } catch (err) {
    console.error('Error deleting task:', err);
    alert('タスク削除に失敗しました');
  }
};
```

---

## 🔴 Step 4: JSX レンダー部分

```javascript
// ====== ログイン画面（user が null の場合）======
{!user ? (
  <div style={{ ... }}>
    {/* 既存のログイン画面 */}
    <AuthScreen onSignUp={signUp} onSignIn={signIn} />
  </div>
) : (
  <>
    {/* ====== ヘッダー ====== */}
    <header style={{ 
      display: 'flex', 
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px',
      borderBottom: '1px solid #eee'
    }}>
      <h1>それな！Todo 📋</h1>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {/* 通知パネル */}
        <NotificationPanel
          notifications={notifications}
          unreadCount={unreadCount}
          loading={notificationsLoading}
          onMarkAsRead={markAsRead}
          onDeleteNotification={deleteNotification}
          onMarkAllAsRead={markAllAsRead}
        />
        
        {/* ユーザー情報 */}
        <span>{userProfile?.displayName || 'User'}</span>
        
        {/* ログアウトボタン */}
        <button 
          onClick={signOut}
          style={{
            padding: '8px 16px',
            backgroundColor: '#FF6B6B',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          ログアウト
        </button>
      </div>
    </header>

    {/* ====== メインコンテンツ ====== */}
    <main style={{ padding: '16px' }}>
      
      {/* グループセレクタ */}
      <GroupSelector
        groups={groups}
        selectedGroupId={selectedGroupId}
        onSelectGroup={setSelectedGroupId}
        onCreateGroup={() => setIsGroupModalOpen(true)}
        onOpenSettings={(groupId) => {
          setSelectedGroupId(groupId);
          setIsSettingsOpen(true);
        }}
      />

      {/* グループが選択されている場合 */}
      {selectedGroupId ? (
        <>
          {/* 共有タスクセクション */}
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ marginBottom: '16px' }}>📋 グループタスク</h2>
            
            {/* タスク追加フォーム */}
            <SharedTaskForm
              selectedGroupId={selectedGroupId}
              onAddTask={handleAddGroupTask}
              isLoading={todosLoading}
            />
            
            {/* タスク一覧 */}
            <SharedTaskList
              todos={groupTodos}
              loading={todosLoading}
              onToggleTodo={handleToggleGroupTask}
              onDeleteTodo={handleDeleteGroupTask}
              currentUserId={user.uid}
            />
          </section>
        </>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '32px',
          color: '#999',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px'
        }}>
          👈 左のセレクタからグループを選択してください
        </div>
      )}

      {/* 既存の個人タスクセクション */}
      <section>
        <h2 style={{ marginBottom: '16px' }}>📝 個人タスク</h2>
        {/* 既存のタスク表示コンポーネント */}
      </section>
    </main>

    {/* ====== グループ作成モーダル ====== */}
    <GroupModal
      isOpen={isGroupModalOpen}
      onClose={() => setIsGroupModalOpen(false)}
      onSubmit={handleCreateGroup}
    />
  </>
)}
```

---

## 📊 Hook 依存関係図

```
App.jsx
├── useAuth()
│   └── user.uid 使用
├── useGroups(user?.uid)
│   └── groups リスト
├── useGroupTodos(selectedGroupId)
│   └── groupTodos リスト
├── useNotifications(user?.uid)
│   └── notifications リスト
└── useActivityFeed(selectedGroupId)
    └── activities リスト
```

---

## ⚡ よく使うパターン

### パターン1: タスク操作時に通知+アクティビティ

```javascript
// タスク作成
const taskId = await addTodo(...);

// 通知を追加
await addNotification({
  userId: user.uid,
  type: 'todo_created',
  groupId: selectedGroupId,
  message: `タスク「${text}」を作成`,
  triggeredBy: user.uid,
  read: false,
  createdAt: new Date(),
});

// アクティビティを記録
await addActivity({
  userId: user.uid,
  userName: userProfile.displayName,
  type: 'todo_created',
  description: `タスク「${text}」を作成`,
  relatedTodoId: taskId,
  createdAt: new Date(),
});
```

### パターン2: グループ内での権限チェック

```javascript
// グループ情報から現在のユーザーの権限を確認
const currentGroup = groups.find(g => g.id === selectedGroupId);
const currentUserRole = currentGroup?.members?.[user.uid]?.role;

// Admin のみが削除可能
if (currentUserRole !== 'admin') {
  alert('管理者のみが削除できます');
  return;
}

await deleteGroup(selectedGroupId);
```

### パターン3: リアルタイム同期の確認

```javascript
// 複数タブで同じグループを開いている場合
// 一方のタブでタスク追加
await addTodo(selectedGroupId, 'タスク1');

// もう一方のタブは useGroupTodos の onSnapshot リスナーで
// 自動的に新しいタスクを受け取り、groupTodos 配列が更新される
// → Component が自動再レンダー
// → SharedTaskList が新タスクを表示
```

---

## 🧪 デバッグ時のコンソール出力

```javascript
// Hook の状態をコンソール出力（開発時）
useEffect(() => {
  console.log('Groups:', groups);
  console.log('Selected Group ID:', selectedGroupId);
  console.log('Group Todos:', groupTodos);
  console.log('Notifications:', notifications);
}, [groups, selectedGroupId, groupTodos, notifications]);
```

---

## ✅ 統合チェックリスト

- [ ] インポート追加（Step 1）
- [ ] Hook 初期化（Step 2）
- [ ] イベントハンドラー実装（Step 3）
- [ ] JSX レンダー更新（Step 4）
- [ ] npm run dev で動作確認
- [ ] ブラウザコンソールでエラーなし
- [ ] グループ作成可能
- [ ] グループ内でタスク作成・表示可能
- [ ] 2タブでリアルタイム同期確認
- [ ] 通知パネルに通知表示

---

## 💭 よくある質問

**Q: selectedGroupId が null の場合は？**  
A: SharedTaskForm が disabled になり、メッセージ表示

**Q: ネットワークエラーが発生した場合？**  
A: try-catch で エラーハンドリング、alert()で通知

**Q: 複数グループを同時に開く？**  
A: 実装仕様では 1つのみ選択。複数グループ表示は将来機能

**Q: オフライン時は？**  
A: IndexedDB キャッシュで動作継続。同期は再接続時

---

## 🔗 関連ドキュメント

- **詳細**: 実装ガイド-グループ機能統合.md
- **テスト**: テストチェックリスト-5分.md
- **概要**: 実装完了サマリー.md

---

**このリファレンスを参考に App.jsx を更新してください！** ✨
