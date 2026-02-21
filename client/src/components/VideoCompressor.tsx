import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

export default function VideoCompressor() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [quality, setQuality] = useState<string>('medium');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [baseFileName, setBaseFileName] = useState<string>('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setStatus('');
      setDownloadUrl(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    maxFiles: 1,
    accept: { 'video/mp4': ['.mp4'] } 
  });

  const handleCompress = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('quality', quality);

    try {
      setIsLoading(true);
      setStatus(`מכווץ את הוידאו... ⏳ (זה עשוי לקחת כמה דקות לקבצים גדולים)`);

      const response = await axios.post(`https://fileshrink-app.onrender.com/api/compress/video`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob',
      });

      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      setBaseFileName(`compressed-${nameWithoutExt}`);

      const url = window.URL.createObjectURL(new Blob([response.data]));
      setDownloadUrl(url);

      setStatus('הוידאו כווץ בהצלחה! 🎉');
    } catch (error) {
      console.error(error);
      setStatus(`שגיאה בכיווץ 😢 (בדוק את הטרמינל)`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setDownloadUrl(null);
    setStatus('');
    setBaseFileName('');
  };

return (
    <div style={{ backgroundColor: 'rgba(255,255,255,0.7)', padding: '30px', borderRadius: '15px', boxShadow: '0 8px 32px rgba(0,0,0,0.05)', border: '1px solid rgba(255,255,255,0.4)' }}>
      <h2 style={{ color: '#6f42c1', marginBottom: '20px' }}>כיווץ וידאו (MP4) 🎬</h2>
      
      {!downloadUrl ? (
        <>
          <div 
            {...getRootProps()} 
            style={{
              border: `2px dashed ${isDragActive ? '#28a745' : '#6f42c1'}`,
              borderRadius: '15px', padding: '40px', cursor: 'pointer',
              backgroundColor: isDragActive ? 'rgba(40, 167, 69, 0.1)' : 'rgba(111, 66, 193, 0.05)',
              transition: 'all 0.3s ease'
            }}
          >
            <input {...getInputProps()} />
            <p style={{ color: '#333', margin: 0, fontWeight: 'bold', fontSize: '1.1rem' }}>
              גרור לכאן קובץ וידאו (MP4), או לחץ לבחירה
            </p>
          </div>

          {/* === אזור בחירת האיכות והכיווץ === */}
          {file && (
            <div className="action-area">
              <div className="file-name-display">
                🎬 קובץ: {file.name}
              </div>
              
              <div className="quality-select-wrapper">
                <label>רמת כיווץ:</label>
                <select 
                  className="elegant-select"
                  value={quality} 
                  onChange={(e) => setQuality(e.target.value)}
                >
                  <option value="large">גדול (פחות כיווץ, איכות גבוהה)</option>
                  <option value="medium">בינוני (איזון מושלם - מומלץ)</option>
                  <option value="small">קטן (כיווץ אגרסיבי, עלול להוריד מאיכות התמונה)</option>
                </select>
              </div>

              <button 
                className="primary-action-btn" 
                onClick={handleCompress} 
                disabled={isLoading} 
                style={{ backgroundColor: '#6f42c1' }}
              >
                {isLoading ? 'מכווץ וידאו...' : 'כווץ עכשיו'}
              </button>
            </div>
          )}
        </>
      ) : (
        /* === אזור ההורדה של הוידאו המוכן === */
        <div className="action-area" style={{ backgroundColor: 'rgba(40, 167, 69, 0.1)', border: '1px solid rgba(40, 167, 69, 0.3)' }}>
          <h3 style={{ color: '#155724', marginBottom: '15px' }}>הוידאו המכווץ מוכן! 🎉</h3>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%', marginBottom: '20px' }}>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#555', direction: 'ltr' }}>.mp4</span>
            <input 
              type="text" 
              className="elegant-select"
              value={baseFileName} 
              onChange={(e) => setBaseFileName(e.target.value)}
              style={{ width: '200px', minWidth: 'auto', direction: 'ltr', textAlign: 'right' }}
            />
            <label style={{ fontWeight: 'bold', color: '#155724' }}>:שם הקובץ</label>
          </div>

          <a href={downloadUrl} download={`${baseFileName}.mp4`} style={{ textDecoration: 'none', width: '100%' }}>
            <button className="primary-action-btn" style={{ backgroundColor: '#28a745', width: '100%', maxWidth: '300px', marginBottom: '15px' }}>
              ⬇️ הורד וידאו
            </button>
          </a>
          
          <button className="back-button" onClick={handleReset} style={{ marginTop: '10px' }}>
            🔄 כווץ וידאו נוסף
          </button>
        </div>
      )}

      {status && !downloadUrl && <p style={{ marginTop: '20px', fontWeight: 'bold', fontSize: '1.1rem', color: status.includes('שגיאה') ? '#dc3545' : '#28a745' }}>{status}</p>}
    </div>
  );
}