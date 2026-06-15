import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client';

interface RegistrationRecord {
  id: number;
  username: string;
  email: string;
  user_phone: string;
  project_name: string;
  distance: number;
  bib_number: string;
  payment_status: string;
  emergency_contact: string;
  emergency_phone: string;
  finish_time: string;
  created_at: string;
}

const projectLabels: Record<string, string> = {
  full: '全程马拉松',
  half: '半程马拉松',
  family: '亲子跑',
};

export default function Registrations() {
  const { id } = useParams<{ id: string }>();
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventName, setEventName] = useState('');
  const [eventStatus, setEventStatus] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTime, setEditTime] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      const [regRes, eventRes] = await Promise.all([
        api.get<{ data: RegistrationRecord[] }>(`/admin/events/${id}/registrations`),
        api.get<{ data: { name: string; status: string } }>(`/events/${id}`),
      ]);
      setRegistrations(regRes.data);
      setEventName(eventRes.data.name);
      setEventStatus(eventRes.data.status);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleExport = async () => {
    try {
      const res = await api.get<{ data: RegistrationRecord[] }>(`/admin/events/${id}/export`);
      const rows = res.data;
      const headers = ['参赛号码', '姓名', '邮箱', '电话', '项目', '距离', '紧急联系人', '紧急电话', '支付状态', '完赛成绩'];
      const csvContent = [
        headers.join(','),
        ...rows.map(r => [
          r.bib_number, r.username, r.email, r.user_phone,
          projectLabels[r.project_name] || r.project_name, r.distance,
          r.emergency_contact, r.emergency_phone,
          r.payment_status === 'paid' ? '已支付' : '待支付',
          r.finish_time || '',
        ].join(','))
      ].join('\n');

      const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${eventName}_选手名单.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('导出失败');
    }
  };

  const handleEditResult = (reg: RegistrationRecord) => {
    setEditingId(reg.id);
    setEditTime(reg.finish_time || '');
  };

  const handleSaveResult = async (regId: number) => {
    setSavingId(regId);
    try {
      await api.put(`/admin/registrations/${regId}/result`, { finish_time: editTime });
      setEditingId(null);
      setEditTime('');
      await fetchData();
      alert('成绩更新成功，公开榜单已自动刷新');
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSavingId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTime('');
  };

  if (loading) return <div className="loading">加载中...</div>;

  const paidCount = registrations.filter(r => r.payment_status === 'paid').length;
  const finishedCount = registrations.filter(r => r.finish_time).length;

  return (
    <div className="main-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Link to="/admin" style={{ color: '#457b9d', fontSize: 14 }}>&#8592; 返回后台</Link>
          <h1 className="page-title" style={{ marginTop: 8 }}>{eventName} - 成绩录入</h1>
        </div>
        <button className="btn btn-secondary" onClick={handleExport}>
          导出名单
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16,
        marginBottom: 24,
      }}>
        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 14, color: '#888' }}>总报名</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a2e' }}>{registrations.length}</div>
        </div>
        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 14, color: '#888' }}>已支付</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#2a9d8f' }}>{paidCount}</div>
        </div>
        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 14, color: '#888' }}>已录入成绩</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#457b9d' }}>{finishedCount}</div>
        </div>
        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 14, color: '#888' }}>赛事状态</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: eventStatus === 'finished' ? '#e63946' : '#f4a261' }}>
            {eventStatus === 'upcoming' ? '即将开赛' : eventStatus === 'finished' ? '已结束' : '进行中'}
          </div>
        </div>
      </div>

      <div style={{
        background: 'white',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              <th style={thStyle}>参赛号码</th>
              <th style={thStyle}>姓名</th>
              <th style={thStyle}>项目</th>
              <th style={thStyle}>电话</th>
              <th style={thStyle}>完赛成绩</th>
              <th style={thStyle}>操作</th>
            </tr>
          </thead>
          <tbody>
            {registrations.map(reg => (
              <tr key={reg.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={tdStyle}><strong>{reg.bib_number}</strong></td>
                <td style={tdStyle}>{reg.username}</td>
                <td style={tdStyle}>{projectLabels[reg.project_name] || reg.project_name}</td>
                <td style={tdStyle}>{reg.user_phone}</td>
                <td style={tdStyle}>
                  {editingId === reg.id ? (
                    <input
                      type="text"
                      placeholder="如：2:35:42"
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                      style={{
                        padding: '6px 10px',
                        border: '1px solid #ddd',
                        borderRadius: 6,
                        fontSize: 14,
                        width: 120,
                      }}
                    />
                  ) : (
                    <span style={{
                      color: reg.finish_time ? '#1a1a2e' : '#999',
                      fontWeight: reg.finish_time ? 600 : 400,
                    }}>
                      {reg.finish_time || '未录入'}
                    </span>
                  )}
                </td>
                <td style={tdStyle}>
                  {editingId === reg.id ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleSaveResult(reg.id)}
                        disabled={savingId === reg.id}
                        style={{ padding: '4px 12px', fontSize: 13 }}
                      >
                        {savingId === reg.id ? '保存中...' : '保存'}
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={handleCancelEdit}
                        style={{ padding: '4px 12px', fontSize: 13 }}
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleEditResult(reg)}
                      style={{ padding: '4px 12px', fontSize: 13 }}
                    >
                      {reg.finish_time ? '修改' : '录入'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {registrations.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
            暂无报名记录
          </div>
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: 14,
  fontWeight: 600,
  color: '#555',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: 14,
  color: '#333',
};
