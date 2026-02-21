import { useState, useEffect } from 'react';
import axios from 'axios';

export default function StatsDashboard() {
  const [stats, setStats] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/stats');
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch stats', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  // מילון שמתרגם את המזהים מהשרת לשמות יפים ולצבעים
  const toolsInfo: Record<string, { title: string; icon: string; color: string }> = {
    pdf: { title: 'כיווץ PDF', icon: '📄', color: '#e74c3c' },
    image: { title: 'כיווץ תמונות', icon: '🖼️', color: '#f39c12' },
    video: { title: 'כיווץ וידאו', icon: '🎬', color: '#2ecc71' },
    audio: { title: 'כיווץ שמע', icon: '🎧', color: '#e91e63' },
    mp4_to_mp3: { title: 'המרה ל-MP3', icon: '🎵', color: '#9b59b6' },
    merge_pdf: { title: 'מיזוג ל-PDF', icon: '📑', color: '#3498db' },
  };

  if (isLoading) return <div style={{ textAlign: 'center', marginTop: '50px', fontSize: '1.5rem' }}>טוען נתונים... ⏳</div>;

  return (
    <div style={{ backgroundColor: 'rgba(255,255,255,0.85)', padding: '40px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', backdropFilter: 'blur(10px)', width: '100%', maxWidth: '900px', margin: '0 auto', direction: 'rtl' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '2px solid #eee', paddingBottom: '20px' }}>
        <h2 style={{ color: '#2c3e50', margin: 0, fontSize: '2rem' }}>📊 נתוני שימוש במערכת</h2>
        <button onClick={() => window.location.href = '/'} style={{ padding: '8px 15px', borderRadius: '8px', border: '1px solid #ccc', backgroundColor: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>
          חזרה לאתר
        </button>
      </div>

      {Object.keys(stats).length === 0 ? (
        <p style={{ textAlign: 'center', fontSize: '1.2rem', color: '#7f8c8d' }}>עדיין אין נתונים במערכת. בצע פעולה ראשונה באפליקציה!</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          {Object.entries(stats).map(([key, data]: [string, any]) => {
            const info = toolsInfo[key] || { title: key, icon: '🔧', color: '#34495e' };
            
            return (
              <div key={key} style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '15px', borderLeft: `6px solid ${info.color}`, boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '2rem' }}>{info.icon}</span>
                  <h3 style={{ margin: 0, color: '#2c3e50', fontSize: '1.2rem' }}>{info.title}</h3>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '10px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.9rem', color: '#7f8c8d', marginBottom: '5px' }}>שימושים היום</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: info.color }}>{data.today}</div>
                  </div>
                  <div style={{ width: '1px', backgroundColor: '#e0e0e0' }}></div> {/* קו הפרדה */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.9rem', color: '#7f8c8d', marginBottom: '5px' }}>סה"כ שימושים</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2c3e50' }}>{data.total}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}