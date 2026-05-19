import React, { useState } from 'react';
import { useGroupMembers } from '@/hooks/useGroupMembers';

export const GroupMemberManager = ({ groupId, members = {}, onMembersChange }) => {
  const { addMemberToGroup, removeMemberFromGroup, updateMemberRoleInGroup } = useGroupMembers();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ userId: '', displayName: '', role: 'member' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [memberToDelete, setMemberToDelete] = useState(null);

  const handleAddMember = async () => {
    if (!formData.userId.trim() || !formData.displayName.trim()) {
      setError('ユーザーIDと表示名は必須です');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await addMemberToGroup(groupId, formData.userId, formData.displayName, formData.role);
      setFormData({ userId: '', displayName: '', role: 'member' });
      setShowAddForm(false);
      onMembersChange?.();
    } catch (err) {
      setError('メンバーの追加に失敗しました: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = (userId) => {
    setMemberToDelete(userId);
  };

  const confirmRemoveMember = async () => {
    if (!memberToDelete) return;

    setLoading(true);
    setError(null);

    try {
      await removeMemberFromGroup(groupId, memberToDelete);
      setMemberToDelete(null);
      onMembersChange?.();
    } catch (err) {
      setError('メンバーの削除に失敗しました: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelRemoveMember = () => {
    setMemberToDelete(null);
  };

  const handleRoleChange = async (userId, newRole) => {
    setLoading(true);
    setError(null);

    try {
      await updateMemberRoleInGroup(groupId, userId, newRole);
      onMembersChange?.();
    } catch (err) {
      setError('ロールの更新に失敗しました: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const memberList = Object.entries(members || {}).map(([userId, memberData]) => ({
    userId,
    ...memberData,
  }));

  return (
    <div style={{ padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '8px', marginTop: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, color: '#333' }}>グループメンバー ({memberList.length})</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            padding: '6px 12px',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: '#2196F3',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          {showAddForm ? 'キャンセル' : 'メンバー追加'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '8px', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '4px', marginBottom: '12px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {memberToDelete && (
        <div style={{ padding: '12px', backgroundColor: '#fff3e0', color: '#e65100', borderRadius: '4px', marginBottom: '12px', border: '1px solid #ffe0b2' }}>
          <div style={{ marginBottom: '8px', fontSize: '14px' }}>メンバーを削除しますか？</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={confirmRemoveMember}
              disabled={loading}
              style={{
                flex: 1,
                padding: '6px 12px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: '#d32f2f',
                color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                fontSize: '14px',
              }}
            >
              {loading ? '削除中...' : '削除'}
            </button>
            <button
              onClick={cancelRemoveMember}
              disabled={loading}
              style={{
                flex: 1,
                padding: '6px 12px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                backgroundColor: '#f5f5f5',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                fontSize: '14px',
              }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {showAddForm && (
        <div style={{ padding: '12px', backgroundColor: '#fff', borderRadius: '4px', marginBottom: '12px', border: '1px solid #ddd' }}>
          <input
            type="text"
            placeholder="ユーザーID（メールアドレス推奨）"
            value={formData.userId}
            onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
            style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box' }}
          />
          <input
            type="text"
            placeholder="表示名"
            value={formData.displayName}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box' }}
          />
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box' }}
          >
            <option value="member">メンバー</option>
            <option value="viewer">ビューアー</option>
          </select>
          <button
            onClick={handleAddMember}
            disabled={loading}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: '#4CAF50',
              color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? '追加中...' : '追加'}
          </button>
        </div>
      )}

      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {memberList.length === 0 ? (
          <p style={{ color: '#999', fontSize: '14px', margin: 0 }}>メンバーがいません</p>
        ) : (
          memberList.map((member) => (
            <div
              key={member.userId}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px',
                backgroundColor: '#fff',
                borderBottom: '1px solid #eee',
              }}
            >
              <div>
                <div style={{ fontWeight: '600', color: '#333' }}>{member.displayName}</div>
                <div style={{ fontSize: '12px', color: '#999' }}>{member.userId}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member.userId, e.target.value)}
                  disabled={loading}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  <option value="member">メンバー</option>
                  <option value="admin">管理者</option>
                  <option value="viewer">ビューアー</option>
                </select>
                <button
                  onClick={() => handleRemoveMember(member.userId)}
                  disabled={loading}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    backgroundColor: '#f5f5f5',
                    color: '#d32f2f',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  削除
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
