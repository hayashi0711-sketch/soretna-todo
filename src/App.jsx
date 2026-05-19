import { useState, useRef, useEffect, useCallback } from "react";
import { storage, haptics, requestNotificationPermission, scheduleDeadlineNotification, cancelNotification, requestSpeechPermission, startListening, addKeyboardListeners, addBackButtonListener } from "./capacitor-adapters";
import { useAuth } from "@/hooks/useAuth";
import { useGroups } from "@/hooks/useGroups";
import { useGroupTodos } from "@/hooks/useGroupTodos";
import { useNotifications } from "@/hooks/useNotifications";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { GroupSelector } from "@/components/Groups/GroupSelector";
import { GroupModal } from "@/components/Groups/GroupModal";
import { GroupMemberManager } from "@/components/Groups/GroupMemberManager";
import { SharedTaskForm } from "@/components/SharedTasks/SharedTaskForm";
import { SharedTaskList } from "@/components/SharedTasks/SharedTaskList";
import { NotificationPanel } from "@/components/Notifications/NotificationPanel";

// ─── Constants ────────────────────────────────────────────────────────────────
const PRESET_COLORS = ["#f87171","#fb923c","#fbbf24","#a3e635","#34d399","#22d3ee","#60a5fa","#a78bfa","#f472b6","#e2e8f0"];
const PRIORITY_CONFIG = {
  high:   { label: "高", color: "#f87171", bg: "rgba(248,113,113,0.12)", order: 0 },
  medium: { label: "中", color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  order: 1 },
  low:    { label: "低", color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  order: 2 },
  none:   { label: "－", color: "#444",    bg: "transparent",            order: 3 },
};
const DEFAULT_TAGS = [
  { id: "work",     label: "仕事", color: "#fbbf24" },
  { id: "personal", label: "個人", color: "#34d399" },
  { id: "urgent",   label: "急ぎ", color: "#f87171" },
];
const GROCERY_KEYWORDS = ['牛乳','卵','たまご','野菜','肉','魚','パン','豆腐','米','果物','チーズ','ヨーグルト','鶏肉','豚肉','牛肉','キャベツ','にんじん','トマト','玉ねぎ','じゃがいも','大根','ほうれん草','もやし','バナナ','りんご'];
const WEEKDAY_LABELS = ["日","月","火","水","木","金","土"];
const FIXED_TAGS = [
  { id: "shopping", label: "買物",    color: "#22d3ee", fixed: true },
  { id: "stock",    label: "ストック有", color: "#a78bfa", fixed: true },
];
const SHOPPING_CATEGORIES = [
  { id: "veg",     label: "野菜・果物",        order: 1 },
  { id: "tofu",    label: "豆腐・納豆",         order: 2 },
  { id: "dairy",   label: "乳製品・卵",         order: 3 },
  { id: "fish",    label: "魚",                order: 4 },
  { id: "meat",    label: "肉",                order: 5 },
  { id: "frozen",  label: "冷凍食品・惣菜",     order: 6 },
  { id: "sauce",   label: "調味料・油・乾物",   order: 7 },
  { id: "snack",   label: "お菓子・飲料・お酒", order: 8 },
  { id: "other",   label: "日用品・その他",     order: 9 },
];
const CATEGORY_COLORS = {
  veg:    { bg: "rgba(134,239,172,0.28)", color: "#16a34a" },
  tofu:   { bg: "rgba(253,224,71,0.28)",  color: "#ca8a04" },
  dairy:  { bg: "rgba(251,191,36,0.28)",  color: "#d97706" },
  fish:   { bg: "rgba(96,165,250,0.28)",  color: "#2563eb" },
  meat:   { bg: "rgba(248,113,113,0.28)", color: "#dc2626" },
  frozen: { bg: "rgba(147,197,253,0.28)", color: "#0284c7" },
  sauce:  { bg: "rgba(251,146,60,0.28)",  color: "#c2410c" },
  snack:  { bg: "rgba(244,114,182,0.28)", color: "#be185d" },
  other:  { bg: "rgba(156,163,175,0.28)", color: "#6b7280" },
};

const THEMES = [
  { id: "dark",   label: "ダーク",     emoji: "🌙", isLight: false, bg: "#0f0f13", card: "#16161d", headerCard: "#1a1a24", text: "#f0f0f0", sub: "#888", subDim: "#444", border: "rgba(255,255,255,0.06)", inputBg: "#1e1e28", inputBorder: "rgba(255,255,255,0.07)", chipOff: "rgba(255,255,255,0.05)", chipOffText: "#888", calBg: "#1e1e2e", sidebarBg: "#13131a", sidebarBorder: "rgba(255,255,255,0.06)" },
  { id: "navy",   label: "ネイビー",   emoji: "🌊", isLight: false, bg: "#0a0e1a", card: "#111827", headerCard: "#161e30", text: "#e8eaf0", sub: "#7a8aaa", subDim: "#3a4560", border: "rgba(100,130,200,0.12)", inputBg: "#1a2338", inputBorder: "rgba(100,130,200,0.15)", chipOff: "rgba(100,130,200,0.08)", chipOffText: "#7a8aaa", calBg: "#1a2338", sidebarBg: "#0d1525", sidebarBorder: "rgba(100,130,200,0.12)" },
  { id: "forest", label: "フォレスト", emoji: "🌲", isLight: false, bg: "#0b130d", card: "#121a14", headerCard: "#172019", text: "#e0ede2", sub: "#6a9470", subDim: "#2a4030", border: "rgba(80,160,100,0.12)", inputBg: "#1a2a1c", inputBorder: "rgba(80,160,100,0.15)", chipOff: "rgba(80,160,100,0.08)", chipOffText: "#6a9470", calBg: "#1a2a1c", sidebarBg: "#0e1810", sidebarBorder: "rgba(80,160,100,0.12)" },
  { id: "light",  label: "ライト",     emoji: "☀️", isLight: true,  bg: "#f0f2f8", card: "#ffffff", headerCard: "#f8f9fc", text: "#1a1a2e", sub: "#666888", subDim: "#aaaacc", border: "rgba(0,0,0,0.07)", inputBg: "#f0f2f8", inputBorder: "rgba(0,0,0,0.1)", chipOff: "rgba(0,0,0,0.06)", chipOffText: "#666888", calBg: "#f0f2f8", sidebarBg: "#e8eaf4", sidebarBorder: "rgba(0,0,0,0.08)" },
  { id: "mint",   label: "ミント",     emoji: "🌿", isLight: true,  bg: "#f0faf4", card: "#ffffff", headerCard: "#f5fdf8", text: "#1a3028", sub: "#5a8070", subDim: "#aaccbb", border: "rgba(0,0,0,0.07)", inputBg: "#edf8f2", inputBorder: "rgba(0,0,0,0.09)", chipOff: "rgba(0,0,0,0.05)", chipOffText: "#5a8070", calBg: "#edf8f2", sidebarBg: "#e4f5ec", sidebarBorder: "rgba(0,0,0,0.07)" },
  { id: "peach",  label: "ピーチ",     emoji: "🍑", isLight: true,  bg: "#fff8f5", card: "#ffffff", headerCard: "#fff5f0", text: "#2a1810", sub: "#a07060", subDim: "#d4b0a0", border: "rgba(0,0,0,0.07)", inputBg: "#fff2ec", inputBorder: "rgba(0,0,0,0.09)", chipOff: "rgba(0,0,0,0.05)", chipOffText: "#a07060", calBg: "#fff2ec", sidebarBg: "#fde8e0", sidebarBorder: "rgba(0,0,0,0.07)" },
];

// ─── Utility Functions ────────────────────────────────────────────────────────
const fmtDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
};

function getRepeatLabel(repeat) {
  if (!repeat) return null;
  if (repeat.type === "daily")  return repeat.hour != null ? `毎日 ${repeat.hour}時` : "毎日";
  if (repeat.type === "yearly") return repeat.month != null ? `毎年${repeat.month}月` : "毎年";
  return repeat.type || null;
}

// ─── Login Screen Component ────────────────────────────────────────────────────
function LoginScreen({ onSignUp, onSignIn, isLoading }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (isSignUp) {
        await onSignUp(email, password, displayName);
      } else {
        await onSignIn(email, password);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f0f13', padding: '20px' }}>
      <div style={{ background: '#16161d', padding: '40px', borderRadius: '16px', maxWidth: '400px', width: '100%' }}>
        <h1 style={{ textAlign: 'center', color: '#f0f0f0', marginBottom: '30px', fontSize: '24px' }}>それな！Todo 📋</h1>
        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <input
              type="text"
              placeholder="表示名"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              style={{ width: '100%', padding: '12px', marginBottom: '12px', background: '#1e1e28', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', color: '#f0f0f0' }}
            />
          )}
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '12px', marginBottom: '12px', background: '#1e1e28', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', color: '#f0f0f0' }}
          />
          <input
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '12px', marginBottom: '12px', background: '#1e1e28', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', color: '#f0f0f0' }}
          />
          {error && <div style={{ color: '#f87171', marginBottom: '12px', fontSize: '14px' }}>{error}</div>}
          <button
            type="submit"
            disabled={isLoading}
            style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg,#7c6af7,#a78bfa)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
          >
            {isLoading ? '処理中...' : (isSignUp ? 'サインアップ' : 'ログイン')}
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
            style={{ width: '100%', padding: '12px', marginTop: '12px', background: 'transparent', color: '#a78bfa', border: '1px solid #a78bfa', borderRadius: '8px', cursor: 'pointer' }}
          >
            {isSignUp ? 'ログイン画面へ' : 'サインアップ'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main App Component ────────────────────────────────────────────────────────
export default function TodoApp() {
  console.log("App.jsx loaded");
  // Firebase Auth
  const { user, userProfile, loading: authLoading, signUp, signIn, signOut } = useAuth();
  console.log("useAuth loaded, user:", user);

  // Groups
  const { groups, loading: groupsLoading, createGroup } = useGroups(user?.uid);
  const { addMemberToGroup } = useGroupMembers();

  // Selected Group
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  // Group Tasks
  const { todos: groupTodos, loading: todosLoading, addTodo: addGroupTodo, toggleTodo: toggleGroupTodo, deleteTodo: deleteGroupTodo } = useGroupTodos(selectedGroupId);

  // Notifications
  const { notifications, unreadCount, addNotification, markAsRead, deleteNotification, markAllAsRead } = useNotifications(user?.uid);

  // Activity Feed
  const { addActivity } = useActivityFeed(selectedGroupId);

  // Personal todos
  const [todos, setTodos] = useState([]);
  const [tags, setTags] = useState(DEFAULT_TAGS);
  const [theme, setTheme] = useState("dark");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created");

  // Load personal todos on mount
  useEffect(() => {
    const loadTodos = async () => {
      const saved = await storage.get("todos");
      if (saved) setTodos(saved);
    };
    loadTodos();
  }, []);

  // Save personal todos
  useEffect(() => {
    storage.set("todos", todos);
  }, [todos]);

  const t = THEMES.find(th => th.id === theme) || THEMES[0];
  const isLight = t.isLight;

  if (authLoading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: t.bg }}>ロード中...</div>;
  }

  if (!user) {
    return <LoginScreen onSignUp={signUp} onSignIn={signIn} isLoading={authLoading} />;
  }

  const handleAddGroupTask = async (taskText) => {
    if (!selectedGroupId || !taskText.trim()) return;
    try {
      const taskId = await addGroupTodo(selectedGroupId, taskText, "none", []);
      await addNotification({
        userId: user.uid,
        type: 'todo_created',
        groupId: selectedGroupId,
        message: `「${taskText}」がグループに追加されました`,
        triggeredBy: user.uid,
        triggeredByName: userProfile?.displayName || "ユーザー",
        relatedTodoId: taskId,
        read: false,
        createdAt: new Date(),
      });
      await addActivity({
        userId: user.uid,
        userName: userProfile?.displayName || "ユーザー",
        type: 'todo_created',
        description: `「${taskText}」を作成しました`,
        relatedTodoId: taskId,
        createdAt: new Date(),
      });
    } catch (err) {
      console.error('Error adding group task:', err);
    }
  };

  const handleToggleGroupTask = async (taskId) => {
    if (!selectedGroupId) return;
    try {
      await toggleGroupTodo(selectedGroupId, taskId, user.uid);
      const todo = groupTodos.find(t => t.id === taskId);
      if (todo) {
        await addActivity({
          userId: user.uid,
          userName: userProfile?.displayName || "ユーザー",
          type: 'todo_completed',
          description: `「${todo.text}」を${todo.done ? '完了' : '再開'}しました`,
          relatedTodoId: taskId,
          createdAt: new Date(),
        });
      }
    } catch (err) {
      console.error('Error toggling group task:', err);
    }
  };

  const handleCreateGroup = async (formData) => {
    try {
      console.log('[DEBUG] handleCreateGroup started with:', formData);
      const groupId = await createGroup(formData.name, formData.description || "");
      console.log('[DEBUG] createGroup completed, groupId:', groupId);

      setSelectedGroupId(groupId);
      console.log('[DEBUG] setSelectedGroupId called');

      setIsGroupModalOpen(false);
      console.log('[DEBUG] setIsGroupModalOpen called');

      // Don't await addNotification, just fire and forget
      addNotification({
        userId: user.uid,
        type: 'group_created',
        groupId,
        message: `グループ「${formData.name}」を作成しました`,
        triggeredBy: user.uid,
        triggeredByName: userProfile?.displayName || "ユーザー",
        read: false,
        createdAt: new Date(),
      }).catch(err => console.error('Error adding notification:', err));
      console.log('[DEBUG] addNotification called');
    } catch (err) {
      console.error('Error creating group:', err);
    }
  };

  console.log('[DEBUG] App rendering, isGroupModalOpen:', isGroupModalOpen);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: t.bg, color: t.text, fontFamily: "'Noto Sans JP', sans-serif" }}>
      {/* Header */}
      <header style={{ background: t.headerCard, borderBottom: `1px solid ${t.border}`, padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>それな！Todo 📋</h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <NotificationPanel
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAsRead={markAsRead}
            onDeleteNotification={deleteNotification}
            onMarkAllAsRead={markAllAsRead}
          />
          <span style={{ fontSize: '14px', color: t.sub }}>{userProfile?.displayName || "ユーザー"}</span>
          <button onClick={signOut} style={{ background: 'transparent', border: 'none', color: t.sub, cursor: 'pointer', fontSize: '12px' }}>ログアウト</button>
          <select value={theme} onChange={(e) => setTheme(e.target.value)} style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.text, borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}>
            {THEMES.map(th => <option key={th.id} value={th.id}>{th.emoji} {th.label}</option>)}
          </select>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar - Group Selector */}
        <aside style={{ width: '250px', background: t.sidebarBg, borderRight: `1px solid ${t.sidebarBorder}`, overflowY: 'auto', padding: '16px' }}>
          <div style={{ marginBottom: '16px' }}>
            <button
              onClick={() => setIsGroupModalOpen(true)}
              style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg,#7c6af7,#a78bfa)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
            >
              ＋ グループを作成
            </button>
          </div>
          <div style={{ fontSize: '12px', color: t.sub, marginBottom: '8px', fontWeight: '600' }}>グループ一覧</div>
          {groups.map(group => (
            <button
              key={group.id}
              onClick={() => setSelectedGroupId(group.id)}
              style={{
                width: '100%',
                padding: '10px 12px',
                textAlign: 'left',
                background: selectedGroupId === group.id ? 'rgba(124,106,247,0.2)' : 'transparent',
                border: selectedGroupId === group.id ? '1px solid rgba(124,106,247,0.35)' : '1px solid transparent',
                color: selectedGroupId === group.id ? '#a78bfa' : t.sub,
                borderRadius: '8px',
                marginBottom: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {group.name}
            </button>
          ))}
        </aside>

        {/* Main Area */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedGroupId ? (
            <>
              {/* Group Tasks and Members */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', overflowY: 'auto' }}>
                <h2 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '700' }}>グループタスク</h2>
                <SharedTaskForm onAddTask={handleAddGroupTask} />
                <SharedTaskList
                  todos={groupTodos}
                  loading={todosLoading}
                  onToggleTodo={handleToggleGroupTask}
                  onDeleteTodo={(taskId) => deleteGroupTodo(selectedGroupId, taskId)}
                  currentUserId={user.uid}
                />
                <GroupMemberManager
                  groupId={selectedGroupId}
                  members={groups.find((g) => g.id === selectedGroupId)?.members || {}}
                  onMembersChange={() => {
                    // Trigger a refresh of the groups list if needed
                  }}
                />
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.subDim }}>
              グループを選択してください
            </div>
          )}
        </main>
      </div>

      {/* Group Modal */}
      <GroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        onSubmit={handleCreateGroup}
      />
    </div>
  );
}
