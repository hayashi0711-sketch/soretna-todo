import React, { useState } from 'react';

export const SharedTaskForm = ({
  selectedGroupId,
  onAddTask,
  isLoading = false,
  tags = [],
}) => {
  const [taskText, setTaskText] = useState('');
  const [priority, setPriority] = useState('medium');
  const [selectedTags, setSelectedTags] = useState([]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!taskText.trim()) {
      alert('タスク内容を入力してください');
      return;
    }
    if (!selectedGroupId) {
      alert('グループを選択してください');
      return;
    }

    onAddTask({
      text: taskText.trim(),
      priority,
      tags: selectedTags,
    });

    // フォームをリセット
    setTaskText('');
    setPriority('medium');
    setSelectedTags([]);
  };

  const getPriorityColor = (p) => {
    switch (p) {
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

  const getPriorityLabel = (p) => {
    switch (p) {
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
    <form onSubmit={handleSubmit} style={{
      backgroundColor: '#f9f9f9',
      border: '1px solid #eee',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '16px',
    }}>
      <div style={{ marginBottom: '12px' }}>
        <label style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: '600',
          color: '#666',
          marginBottom: '6px',
          textTransform: 'uppercase',
        }}>
          タスク内容
        </label>
        <input
          type="text"
          value={taskText}
          onChange={(e) => setTaskText(e.target.value)}
          placeholder="新しいタスクを入力..."
          disabled={!selectedGroupId}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '14px',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
            opacity: !selectedGroupId ? 0.5 : 1,
            cursor: !selectedGroupId ? 'not-allowed' : 'text',
          }}
        />
        {!selectedGroupId && (
          <div style={{
            marginTop: '6px',
            fontSize: '12px',
            color: '#FF6B6B',
          }}>
            💡 グループを選択して共有タスクを作成します
          </div>
        )}
      </div>

      {/* 優先度 */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: '600',
          color: '#666',
          marginBottom: '6px',
          textTransform: 'uppercase',
        }}>
          優先度
        </label>
        <div style={{ display: 'flex', gap: '6px' }}>
          {['high', 'medium', 'low'].map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              disabled={!selectedGroupId}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: priority === p ? getPriorityColor(p) : '#fff',
                color: priority === p ? '#fff' : '#333',
                border: `1px solid ${getPriorityColor(p)}`,
                borderRadius: '4px',
                cursor: !selectedGroupId ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                opacity: !selectedGroupId ? 0.5 : 1,
              }}
            >
              {getPriorityLabel(p)}優先度
            </button>
          ))}
        </div>
      </div>

      {/* タグ選択 */}
      {tags.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: '600',
            color: '#666',
            marginBottom: '6px',
            textTransform: 'uppercase',
          }}>
            タグ
          </label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {tags.map(tag => (
              <button
                key={tag.id}
                type="button"
                onClick={() => {
                  setSelectedTags(
                    selectedTags.includes(tag.id)
                      ? selectedTags.filter(id => id !== tag.id)
                      : [...selectedTags, tag.id]
                  );
                }}
                disabled={!selectedGroupId}
                style={{
                  padding: '6px 12px',
                  backgroundColor: selectedTags.includes(tag.id) ? tag.color : '#fff',
                  color: selectedTags.includes(tag.id) ? '#fff' : tag.color,
                  border: `1px solid ${tag.color}`,
                  borderRadius: '20px',
                  cursor: !selectedGroupId ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontWeight: '500',
                  opacity: !selectedGroupId ? 0.5 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 送信ボタン */}
      <button
        type="submit"
        disabled={isLoading || !selectedGroupId || !taskText.trim()}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: '#2196F3',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: (isLoading || !selectedGroupId || !taskText.trim()) ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: '600',
          opacity: (isLoading || !selectedGroupId || !taskText.trim()) ? 0.6 : 1,
          transition: 'all 0.2s',
        }}
      >
        {isLoading ? '追加中...' : '共有タスクを追加'}
      </button>
    </form>
  );
};
