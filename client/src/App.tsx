import { useState } from 'react';
import PdfCompressor from './components/PdfCompressor';
import Mp4ToMp3 from './components/Mp4ToMp3';
import ImageCompressor from './components/ImageCompressor';
import VideoCompressor from './components/VideoCompressor';
import AudioCompressor from './components/AudioCompressor';
import MergePdf from './components/MergePdf';
import StatsDashboard from './components/StatsDashboard';
import './App.css'; // מייבאים את קובץ העיצוב החדש

function App() {
  const [activeTool, setActiveTool] = useState<'pdf' | 'mp4' | 'image' | 'video' | 'audio' | 'merge' | null>(null);

  // === התוספת החדשה: בדיקת הכתובת הסודית ===
  if (window.location.pathname === '/stats') {
    return (
      <div className="app-container" dir="rtl">
        <StatsDashboard />
      </div>
    );
  }
  // =======================================

  
  return (
    <div className="app-container" dir="rtl">
      <div className="content-wrapper">
        
          {activeTool && (
          <div className="back-button-container">
            <button className="back-button" onClick={() => setActiveTool(null)}>
              ← חזור למסך הראשי
            </button>
          </div>
        )}

        <h1 className="main-title">FileShrink 📦</h1>
        {!activeTool && <p className="sub-title">בחר את הכלי שאתה צריך היום:</p>}

        {!activeTool && (
          <div className="tools-grid">
            
            {/* כרטיסייה 1: המרה ל-MP3 (סגול) */}
            <div className="tool-card card-mp3" onClick={() => setActiveTool('mp4')}>
              <div className="card-icon">🎵</div>
              <h3>המרה ל-MP3</h3>
              <p>חלץ את ערוץ השמע מתוך קובץ וידאו MP4 בקלות ובמהירות.</p>
            </div>

            {/* כרטיסייה 2: כיווץ PDF (אדום) */}
            <div className="tool-card card-pdf" onClick={() => setActiveTool('pdf')}>
              <div className="card-icon">📄</div>
              <h3>כיווץ PDF</h3>
              <p>הקטן את המשקל של קבצי PDF גדולים לשיתוף נוח במייל.</p>
            </div>

            {/* כרטיסייה 3: כיווץ תמונות (כתום) */}
            <div className="tool-card card-image" onClick={() => setActiveTool('image')}>
              <div className="card-icon">🖼️</div>
              <h3>כיווץ תמונות</h3>
              <p>דחוס תמונות JPG, PNG ו-WebP מבלי לאבד את האיכות.</p>
            </div>

            {/* כרטיסייה 4: כיווץ וידאו (ירוק) */}
            <div className="tool-card card-video" onClick={() => setActiveTool('video')}>
              <div className="card-icon">🎬</div>
              <h3>כיווץ וידאו</h3>
              <p>הקטן משמעותית נפח של סרטוני MP4 כדי לחסוך מקום.</p>
            </div>

             {/* כרטיסייה 5: מיזוג ל-PDF (כחול) */}
             <div className="tool-card card-merge" onClick={() => setActiveTool('merge')}>
              <div className="card-icon">📑</div>
              <h3>מיזוג ל-PDF</h3>
              <p>חבר מספר קבצי PDF ותמונות למסמך אחד שלם ומסודר.</p>
            </div>

            {/* כרטיסייה 6: כיווץ שמע (ורוד) */}
            <div className="tool-card card-audio" onClick={() => setActiveTool('audio')}>
              <div className="card-icon">🎧</div>
              <h3>כיווץ שמע</h3>
              <p>הקטן את גודלם של קבצי MP3 להאזנה ושיתוף קלים יותר.</p>
            </div>

          </div>
        )}

        {/* אזור טעינת הקומפוננטות (נשאר ללא שינוי) */}
        <div style={{ marginTop: '30px' }}>
          {activeTool === 'pdf' && <PdfCompressor />}
          {activeTool === 'mp4' && <Mp4ToMp3 />}
          {activeTool === 'image' && <ImageCompressor />}
          {activeTool === 'video' && <VideoCompressor />}
          {activeTool === 'audio' && <AudioCompressor />}
          {activeTool === 'merge' && <MergePdf />}
        </div>

      </div>
    </div>
  );
}

export default App;