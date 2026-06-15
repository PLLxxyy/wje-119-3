import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import Countdown from '../components/Countdown';

interface Project {
  id: number;
  event_id: number;
  name: string;
  distance: number;
  max_participants: number;
  current_count: number;
}

interface EventDetail {
  id: number;
  name: string;
  city: string;
  date: string;
  route_description: string;
  start_point: string;
  end_point: string;
  cutoff_time: string;
  fee: number;
  supplies: string;
  status: string;
  image_url: string;
  registration_deadline: string;
  projects: Project[];
}

interface ResultEntry {
  rank: number;
  bib_number: string;
  username: string;
  finish_time: string;
}

const projectLabels: Record<string, string> = {
  full: '全程马拉松',
  half: '半程马拉松',
  family: '亲子跑',
};

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [results, setResults] = useState<Record<string, ResultEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [activeProjectTab, setActiveProjectTab] = useState<string>('');

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await api.get<{ data: EventDetail }>(`/events/${id}`);
        setEvent(res.data);
        if (res.data.projects.length > 0) {
          setActiveProjectTab(res.data.projects[0].name);
        }
      } catch {
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id, navigate]);

  useEffect(() => {
    const fetchResults = async () => {
      if (event && (event.status === 'finished' || event.status === 'ongoing')) {
        try {
          const res = await api.get<{ data: Record<string, ResultEntry[]> }>(`/events/${id}/results`);
          setResults(res.data);
        } catch {
          // ignore
        }
      }
    };
    fetchResults();
  }, [event, id]);

  if (loading) return <div className="loading">加载中...</div>;
  if (!event) return <div className="loading">赛事不存在</div>;

  const isRegisterable = event.status === 'upcoming' && new Date(event.registration_deadline) > new Date();
  const showResults = (event.status === 'finished' || event.status === 'ongoing') && Object.keys(results).length > 0;

  const hasResults = (projectName: string) => {
    return results[projectName] && results[projectName].length > 0;
  };

  return (
    <div className="main-content">
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: 16,
        padding: '40px 32px',
        color: 'white',
        marginBottom: 32,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: -50,
          right: -50,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'rgba(230,57,70,0.15)',
        }} />
        <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 16, position: 'relative' }}>
          {event.name}
        </h1>
        <div style={{ display: 'flex', gap: 24, fontSize: 16, opacity: 0.9, position: 'relative' }}>
          <span>{event.city}</span>
          <span>{event.date}</span>
          <span>¥{event.fee}</span>
        </div>
        {isRegisterable && (
          <div style={{ marginTop: 16, position: 'relative' }}>
            <Countdown deadline={event.date} />
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <InfoCard title="路线描述" content={event.route_description || '暂无'} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <SmallInfoCard label="起点" value={event.start_point || '待定'} />
          <SmallInfoCard label="终点" value={event.end_point || '待定'} />
          <SmallInfoCard label="关门时间" value={event.cutoff_time || '待定'} />
          <SmallInfoCard label="报名费" value={`¥${event.fee}`} />
        </div>
      </div>

      {event.supplies && (
        <InfoCard title="参赛物资" content={event.supplies} />
      )}

      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16, color: '#1a1a2e' }}>
          选择参赛项目
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {event.projects.map(project => {
            const remaining = project.max_participants - project.current_count;
            const isFull = remaining <= 0;
            const isSelected = selectedProject === project.id;
            return (
              <div
                key={project.id}
                onClick={() => !isFull && setSelectedProject(project.id)}
                style={{
                  background: isSelected ? '#fff5f5' : 'white',
                  border: `2px solid ${isSelected ? '#e63946' : '#eee'}`,
                  borderRadius: 12,
                  padding: 20,
                  cursor: isFull ? 'not-allowed' : 'pointer',
                  opacity: isFull ? 0.6 : 1,
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                  {projectLabels[project.name] || project.name}
                </div>
                <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>
                  {project.distance} 公里
                </div>
                <div style={{ fontSize: 14 }}>
                  <span style={{ color: isFull ? '#e63946' : '#2a9d8f' }}>
                    {isFull ? '已满' : `剩余 ${remaining} 个名额`}
                  </span>
                </div>
                <div style={{
                  marginTop: 8,
                  background: '#f0f0f0',
                  borderRadius: 4,
                  height: 6,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${(project.current_count / project.max_participants) * 100}%`,
                    height: '100%',
                    background: isFull ? '#e63946' : '#2a9d8f',
                    borderRadius: 4,
                    transition: 'width 0.3s',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 32, textAlign: 'center' }}>
        {isRegisterable ? (
          <button
            className="btn btn-primary"
            style={{ padding: '14px 48px', fontSize: 18 }}
            disabled={!selectedProject}
            onClick={() => {
              if (!user) {
                navigate('/login');
                return;
              }
              navigate(`/events/${event.id}/register?project=${selectedProject}`);
            }}
          >
            {user ? '立即报名' : '登录后报名'}
          </button>
        ) : (
          <div style={{ color: '#888', fontSize: 16 }}>
            {event.status === 'finished' ? '赛事已结束' : '报名已截止'}
          </div>
        )}
      </div>

      {showResults && (
        <div style={{ marginTop: 48 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20, color: '#1a1a2e' }}>
            🏆 成绩榜单
          </h2>
          
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {event.projects.map(project => (
              <button
                key={project.name}
                onClick={() => setActiveProjectTab(project.name)}
                style={{
                  padding: '10px 24px',
                  borderRadius: 24,
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: activeProjectTab === project.name ? '#e63946' : '#f0f0f0',
                  color: activeProjectTab === project.name ? 'white' : '#555',
                }}
              >
                {projectLabels[project.name] || project.name}
                {hasResults(project.name) && (
                  <span style={{ marginLeft: 8, opacity: 0.8 }}>
                    ({results[project.name].length}人)
                  </span>
                )}
              </button>
            ))}
          </div>

          {hasResults(activeProjectTab) ? (
            <div style={{
              background: 'white',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                    <th style={thStyle}>排名</th>
                    <th style={thStyle}>参赛号码</th>
                    <th style={thStyle}>姓名</th>
                    <th style={thStyle}>完赛成绩</th>
                  </tr>
                </thead>
                <tbody>
                  {results[activeProjectTab].map((entry, index) => (
                    <tr 
                      key={entry.bib_number} 
                      style={{ 
                        borderBottom: '1px solid #f0f0f0',
                        background: index < 3 ? 'linear-gradient(to right, #fff9f9, #ffffff)' : undefined
                      }}
                    >
                      <td style={tdStyle}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          fontWeight: 700,
                          fontSize: 14,
                          background: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#f0f0f0',
                          color: index < 3 ? '#fff' : '#666',
                        }}>
                          {entry.rank}
                        </span>
                      </td>
                      <td style={tdStyle}><strong>{entry.bib_number}</strong></td>
                      <td style={tdStyle}>{entry.username}</td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: '#e63946', fontSize: 16 }}>
                        {entry.finish_time}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{
              background: 'white',
              borderRadius: 12,
              padding: 48,
              textAlign: 'center',
              color: '#999',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>⏱️</div>
              <div style={{ fontSize: 16 }}>该项目暂无成绩数据，敬请期待</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoCard({ title, content }: { title: string; content: string }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 12,
      padding: 24,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1a1a2e', marginBottom: 12 }}>
        {title}
      </h3>
      <p style={{ color: '#555', fontSize: 15, lineHeight: 1.8 }}>
        {content}
      </p>
    </div>
  );
}

function SmallInfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 12,
      padding: 16,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a2e' }}>{value}</div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '14px 20px',
  textAlign: 'left',
  fontSize: 14,
  fontWeight: 600,
  color: '#555',
};

const tdStyle: React.CSSProperties = {
  padding: '14px 20px',
  fontSize: 14,
  color: '#333',
};
