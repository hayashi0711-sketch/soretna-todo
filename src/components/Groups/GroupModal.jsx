import React, { useState, useEffect } from 'react';

const EMOJI_PRESETS = ['👥', '👨‍👩‍👧‍👦', '👪', '🏠', '❤️', '⭐', '🎯', '📋', '🎨', '🚀'];

export const GroupModal = ({ isOpen, onClose, onSubmit, initialGroup = null, isLoading = false }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    emoji: '👥',
  });

  useEffect(() => {
    if (initialGroup) {
      setFormData({
        name: initialGroup.name || '',
        description: initialGroup.description || '',
        emoji: initialGroup.emoji || '👥',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        emoji: '👥',
      });
    }
  }, [initialGroup, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('グループ名を入力してください');
      return;
    }
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
      }}>
        <div style={{
          fontSize: '20px',
          fontWeight: '700',
          marginBottom: '20px',
        }}>
          {initialGroup ? 'グループを編集' : 'グループを作成'}
        </div>

        <form onSubmit={handleSubmit}>
          {/* グループ名 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '6px',
              color: '#333',
            }}>
              グループ名 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例: 我が家"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* 説明 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '6px',
              color: '#333',
            }}>
              説明
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="このグループについての説明"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                minHeight: '80px',
                resize: 'vertical',
              }}
            />
          </div>

          {/* 絵文字選択 */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px',
              color: '#333',
            }}>
              アイコン
            </label>
            <div style={{
              display: 'flex',
              gap: '6px',
              flexWrap: 'wrap',
            }}>
              {EMOJI_PRESETS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setFormData({ ...formData, emoji })}
                  style={{
                    width: '40px',
                    height: '40px',
                    fontSize: '24px',
                    border: formData.emoji === emoji ? '2px solid #2196F3' : '1px solid #ddd',
                    borderRadius: '6px',
                    backgroundColor: formData.emoji === emoji ? '#e3f2fd' : '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* ボタン */}
          <div style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'flex-end',
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              style={{
                padding: '10px 20px',
                backgroundColor: '#f5f5f5',
                color: '#333',
                border: '1px solid #ddd',
                borderRadius: '6px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                padding: '10px 20px',
                backgroundColor: '#4CAF50',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {isLoading ? '処理中...' : initialGroup ? '更新' : '作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
