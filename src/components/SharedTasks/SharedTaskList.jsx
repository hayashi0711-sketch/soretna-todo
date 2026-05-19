import React from 'react';

export const SharedTaskList = ({
  todos,
  loading,
  onToggleTodo,
  onDeleteTodo,
  currentUserId,
}) => {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return '#FF6B6B';
      case 'medium':
        return '#FFA500';
      case 'low':
        return '#4CAF50';
      default:
        return '#999';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'high':
        return '高';
      case 'medium':
        return '中';
      case 'low':
        return '低';
      default:
        return 'なし';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return `今日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `明日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else {
      return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '32px',
        color: '#999',
      }}>
        読み込み中...
      </div>
    );
  }

  if (todos.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '32px',
        color: '#999',
        fontSize: '14px',
      }}>
        共有タスクはまだありません
      </div>
    );
  }

  // 完了・未完了でグループ分け
  const incompleteTodos = todos.filter(t => !t.done);
  const completedTodos = todos.filter(t => t.done);

  return (
    <div>
      {/* 未完了タスク */}
      {incompleteTodos.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            fontSize: '12px',
            fontWeight: '600',
            color: '#666',
            textTransform: 'uppercase',
            marginBottom: '8px',
            paddingLeft: '4px',
          }}>
            進行中 ({incompleteTodos.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {incompleteTodos.map(todo => (
              <TaskItem
                key={todo.id}
                todo={todo}
                onToggle={onToggleTodo}
                onDelete={onDeleteTodo}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        </div>
      )}

      {/* 完了タスク */}
      {completedTodos.length > 0 && (
        <div>
          <div style={{
            fontSize: '12px',
            fontWeight: '600',
            color: '#999',
            textTransform: 'uppercase',
            marginBottom: '8px',
            paddingLeft: '4px',
          }}>
            完了 ({completedTodos.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {completedTodos.map(todo => (
              <TaskItem
                key={todo.id}
                todo={todo}
                onToggle={onToggleTodo}
                onDelete={onDeleteTodo}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const TaskItem = ({ todo, onToggle, onDelete, currentUserId }) => {
  const handleToggle = () => {
    onToggle(todo.id);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return '#FF6B6B';
      case 'medium':
        return '#FFA500';
      case 'low':
        return '#4CAF50';
      default:
        return '#999';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'high':
        return '高';
      case 'medium':
        return '中';
      case 'low':
        return '低';
      default:
        return 'なし';
    }
  };

  return (
    <div
      onClick={handleToggle}
      style={{
        padding: '12px',
        backgroundColor: todo.done ? '#f0f0f0' : '#fff',
        border: `1px solid ${todo.done ? '#ddd' : '#e0e0e0'}`,
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        opacity: todo.done ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = todo.done ? '#f5f5f5' : '#fafafa';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = todo.done ? '#f0f0f0' : '#fff';
      }}
    >
      {/* チェックボックス */}
      <input
        type="checkbox"
        checked={todo.done}
        onChange={handleToggle}
        style={{
          marginTop: '2px',
          cursor: 'pointer',
          width: '18px',
          height: '18px',
          accentColor: '#2196F3',
        }}
      />

      {/* タスク内容 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '14px',
          fontWeight: '500',
          color: todo.done ? '#999' : '#333',
          textDecoration: todo.done ? 'line-through' : 'none',
          wordBreak: 'break-word',
          marginBottom: todo.description ? '4px' : '0',
        }}>
          {todo.text}
        </div>

        {todo.description && (
          <div style={{
            fontSize: '12px',
            color: '#666',
            marginBottom: '6px',
            wordBreak: 'break-word',
          }}>
            {todo.description}
          </div>
        )}

        {/* メタデータ */}
        <div style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          fontSize: '11px',
          color: '#666',
        }}>
          {/* 優先度 */}
          {todo.priority && (
            <span style={{
              padding: '2px 6px',
              backgroundColor: getPriorityColor(todo.priority),
              color: '#fff',
              borderRadius: '3px',
              fontSize: '10px',
              fontWeight: '500',
            }}>
              {getPriorityLabel(todo.priority)}
            </span>
          )}

          {/* 締め切り */}
          {todo.deadline && (
            <span style={{
              padding: '2px 6px',
              backgroundColor: '#f5f5f5',
              borderRadius: '3px',
            }}>
              📅 {new Date(todo.deadline.toDate()).toLocaleDateString('ja-JP')}
            </span>
          )}

          {/* 作成者 */}
          <span style={{
            padding: '2px 6px',
            backgroundColor: '#f5f5f5',
            borderRadius: '3px',
          }}>
            👤 {todo.createdBy === currentUserId ? 'あなた' : '他のメンバー'}
          </span>

          {/* 完了日時 */}
          {todo.completedAt && (
            <span style={{
              padding: '2px 6px',
              backgroundColor: '#e8f5e9',
              borderRadius: '3px',
              color: '#2e7d32',
            }}>
              ✓ {new Date(todo.completedAt.toDate()).toLocaleDateString('ja-JP')}
            </span>
          )}
        </div>

        {/* タグ */}
        {todo.tags && todo.tags.length > 0 && (
          <div style={{
            display: 'flex',
            gap: '4px',
            marginTop: '6px',
            flexWrap: 'wrap',
          }}>
            {todo.tags.map(tag => (
              <span
                key={tag}
                style={{
                  fontSize: '11px',
                  padding: '2px 6px',
                  backgroundColor: '#e3f2fd',
                  color: '#1976d2',
                  borderRadius: '3px',
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 削除ボタン */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (confirm('このタスクを削除しますか?')) {
            onDelete(todo.id);
          }
        }}
        style={{
          backgroundColor: '#fff',
          border: '1px solid #ddd',
          borderRadius: '4px',
          padding: '4px 8px',
          cursor: 'pointer',
          fontSize: '12px',
          color: '#666',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#FF6B6B';
          e.currentTarget.style.color = '#fff';
          e.currentTarget.style.borderColor = '#FF6B6B';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#fff';
          e.currentTarget.style.color = '#666';
          e.currentTarget.style.borderColor = '#ddd';
        }}
      >
        削除
      </button>
    </div>
  );
};
