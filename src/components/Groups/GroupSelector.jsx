import React, { useState } from 'react';

export const GroupSelector = ({ groups, selectedGroupId, onSelectGroup, onCreateGroup, onOpenSettings }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px',
      backgroundColor: '#f5f5f5',
      borderRadius: '8px',
      marginBottom: '16px',
    }}>
      {/* グループセレクタボタン */}
      <div style={{ position: 'relative', flex: 1 }}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          style={{
            width: '100%',
            padding: '8px 12px',
            backgroundColor: '#fff',
            border: '1px solid #ddd',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#333',
          }}
        >
          <span style={{ fontSize: '18px' }}>
            {selectedGroup?.emoji || '👥'}
          </span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {selectedGroup?.name || 'グループを選択'}
          </span>
          <span style={{ fontSize: '12px', color: '#999' }}>▼</span>
        </button>

        {/* ドロップダウンメニュー */}
        {isDropdownOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: '#fff',
            border: '1px solid #ddd',
            borderRadius: '6px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            zIndex: 1000,
            marginTop: '4px',
            maxHeight: '300px',
            overflowY: 'auto',
          }}>
            {groups.map(group => (
              <div
                key={group.id}
                onClick={() => {
                  onSelectGroup(group.id);
                  setIsDropdownOpen(false);
                }}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: selectedGroupId === group.id ? '#e3f2fd' : '#fff',
                  borderBottom: '1px solid #f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  ':hover': {
                    backgroundColor: '#f5f5f5',
                  }
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = selectedGroupId === group.id ? '#e3f2fd' : '#fff';
                }}
              >
                <span style={{ fontSize: '16px' }}>{group.emoji || '👥'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', fontSize: '14px' }}>{group.name}</div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                    {group.members ? Object.keys(group.members).length : 0} メンバー
                  </div>
                </div>
              </div>
            ))}

            {groups.length === 0 && (
              <div style={{
                padding: '12px',
                textAlign: 'center',
                color: '#999',
                fontSize: '14px',
              }}>
                グループがありません
              </div>
            )}
          </div>
        )}
      </div>

      {/* 新規作成ボタン */}
      <button
        onClick={onCreateGroup}
        style={{
          padding: '8px 12px',
          backgroundColor: '#4CAF50',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: '500',
          whiteSpace: 'nowrap',
        }}
      >
        + 新規作成
      </button>

      {/* 設定ボタン */}
      {selectedGroup && (
        <button
          onClick={() => onOpenSettings(selectedGroup.id)}
          style={{
            padding: '8px 12px',
            backgroundColor: '#2196F3',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500',
            whiteSpace: 'nowrap',
          }}
        >
          ⚙️ 設定
        </button>
      )}
    </div>
  );
};
