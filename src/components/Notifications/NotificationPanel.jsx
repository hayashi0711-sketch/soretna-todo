import React, { useState } from 'react';

export const NotificationPanel = ({
  notifications,
  loading,
  unreadCount,
  onMarkAsRead,
  onDeleteNotification,
  onMarkAllAsRead,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'todo_created':
        return '✨';
      case 'todo_completed':
        return '✓';
      case 'todo_updated':
        return '📝';
      case 'member_joined':
        return '👋';
      case 'group_created':
        return '👥';
      default:
        return '📢';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'todo_created':
        return '#2196F3';
      case 'todo_completed':
        return '#4CAF50';
      case 'todo_updated':
        return '#FF9800';
      case 'member_joined':
        return '#9C27B0';
      case 'group_created':
        return '#F44336';
      default:
        return '#666';
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* 通知ベルアイコン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          backgroundColor: '#fff',
          border: '1px solid #ddd',
          borderRadius: '6px',
          padding: '8px 12px',
          cursor: 'pointer',
          fontSize: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f5f5f5';
          e.currentTarget.style.borderColor = '#999';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#fff';
          e.currentTarget.style.borderColor = '#ddd';
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-6px',
              right: '-6px',
              backgroundColor: '#FF6B6B',
              color: '#fff',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: '700',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* 通知パネル */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            backgroundColor: '#fff',
            border: '1px solid #ddd',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            width: '360px',
            maxHeight: '400px',
            overflowY: 'auto',
            zIndex: 1000,
          }}
        >
          {/* ヘッダー */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f9f9f9',
            }}
          >
            <div style={{ fontWeight: '600', fontSize: '14px', color: '#333' }}>
              通知 {unreadCount > 0 && `(${unreadCount})`}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => {
                  onMarkAllAsRead();
                }}
                style={{
                  fontSize: '12px',
                  color: '#2196F3',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '500',
                  padding: '4px 8px',
                }}
              >
                すべて既読
              </button>
            )}
          </div>

          {/* 通知リスト */}
          {loading ? (
            <div
              style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: '#999',
                fontSize: '14px',
              }}
            >
              読み込み中...
            </div>
          ) : notifications.length === 0 ? (
            <div
              style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: '#999',
                fontSize: '14px',
              }}
            >
              通知はありません
            </div>
          ) : (
            <div>
              {notifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={onMarkAsRead}
                  onDelete={onDeleteNotification}
                  getIcon={getNotificationIcon}
                  getColor={getNotificationColor}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* パネル外クリックでクローズ */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
          }}
        />
      )}
    </div>
  );
};

const NotificationItem = ({ notification, onMarkAsRead, onDelete, getIcon, getColor }) => {
  const handleMarkAsRead = (e) => {
    e.stopPropagation();
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(notification.id);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '今';
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;
    return date.toLocaleDateString('ja-JP');
  };

  return (
    <div
      onClick={handleMarkAsRead}
      style={{
        padding: '12px 16px',
        borderBottom: '1px solid #f0f0f0',
        backgroundColor: notification.read ? '#fff' : '#e3f2fd',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        gap: '12px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = notification.read ? '#f5f5f5' : '#bbdefb';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = notification.read ? '#fff' : '#e3f2fd';
      }}
    >
      {/* アイコン */}
      <div
        style={{
          fontSize: '20px',
          minWidth: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {getIcon(notification.type)}
      </div>

      {/* メッセージ */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: notification.read ? '400' : '600',
            color: '#333',
            marginBottom: '4px',
            wordBreak: 'break-word',
          }}
        >
          {notification.message}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: '#666',
          }}
        >
          {formatTime(notification.createdAt)}
          {notification.triggeredByName && ` • ${notification.triggeredByName}`}
        </div>
      </div>

      {/* 未読インジケータ */}
      {!notification.read && (
        <div
          style={{
            width: '8px',
            height: '8px',
            backgroundColor: '#2196F3',
            borderRadius: '50%',
            marginTop: '4px',
            minWidth: '8px',
          }}
        />
      )}

      {/* 削除ボタン */}
      <button
        onClick={handleDelete}
        style={{
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '4px',
          fontSize: '12px',
          color: '#999',
          transition: 'all 0.2s',
          minWidth: '24px',
          textAlign: 'center',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#FF6B6B';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#999';
        }}
      >
        ✕
      </button>
    </div>
  );
};
