import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

export default function MergePdf() {
  // הפעם אנחנו שומרים מערך של קבצים!
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [baseFileName, setBaseFileName] = useState<string>('merged-document');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      // מוסיפים את הקבצים החדשים לאלו שכבר קיימים ברשימה
      setFiles((prevFiles) => [...prevFiles, ...acceptedFiles]);
      setStatus('');
      setDownloadUrl(null);
    }
  }, []);

  // שימו לב: הורדנו את maxFiles, כדי לאפשר בחירה מרובה!
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 
      'application/pdf': ['.pdf'], 
      'image/jpeg': ['.jpg', '.jpeg'], 
      'image/png': ['.png'] 
    } 
  });

  // פונקציה להסרת קובץ ספציפי מהרשימה במידה והמשתמש התחרט
  const removeFile = (indexToRemove: number) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };

  const handleMerge = async () => {
    if (files.length === 0) return;

    const formData = new FormData();
    // בגלל שיש לנו כמה קבצים, אנחנו עושים לולאה ומצרפים את כולם תחת השם 'files'
    files.forEach((file) => {
      formData.append('files', file);
    });

    try {
      setIsLoading(true);
      setStatus(`ממזג ${files.length} קבצים למסמך אחד... ⏳`);

      const response = await axios.post(`https://fileshrink-app.onrender.com/api/merge/pdf`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      setDownloadUrl(url);

      setStatus('הקבצים מוזגו בהצלחה! 🎉');
    } catch (error) {
      console.error(error);
      setStatus(`שגיאה במיזוג 😢 (בדוק את הטרמינל)`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setDownloadUrl(null);
    setStatus('');
    setBaseFileName('merged-document');
  };

return (
    <div style={{ backgroundColor: 'rgba(255,255,255,0.7)', padding: '30px', borderRadius: '15px', boxShadow: '0 8px 32px rgba(0,0,0,0.05)', border: '1px solid rgba(255,255,255,0.4)' }}>
      <h2 style={{ color: '#e83e8c', marginBottom: '20px' }}>מיזוג ל-PDF אחד 📑</h2>
      
      {!downloadUrl ? (
        <>
          <div 
            {...getRootProps()} 
            style={{
              border: `2px dashed ${isDragActive ? '#28a745' : '#e83e8c'}`,
              borderRadius: '15px', padding: '40px', cursor: 'pointer',
              backgroundColor: isDragActive ? 'rgba(40, 167, 69, 0.1)' : 'rgba(232, 62, 140, 0.05)',
              transition: 'all 0.3s ease'
            }}
          >
            <input {...getInputProps()} />
            <p style={{ color: '#333', margin: 0, fontWeight: 'bold', fontSize: '1.1rem' }}>
              גרור לכאן קבצי PDF, JPG או PNG (אפשר לבחור כמה ביחד)
            </p>
          </div>

          {/* === אזור רשימת הקבצים והמיזוג === */}
          {files.length > 0 && (
            <div className="action-area">
              <p style={{ fontWeight: 'bold', width: '100%', textAlign: 'right', color: '#2c3e50', marginBottom: '10px' }}>סדר הקבצים למיזוג:</p>
              
              <ul style={{ listStyleType: 'none', padding: 0, width: '100%' }}>
                {files.map((file, index) => (
                  <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '12px 15px', marginBottom: '8px', borderRadius: '10px', border: '1px solid #e0e0e0', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
                    <span style={{ fontWeight: '500', color: '#444' }}>{index + 1}. {file.name}</span>
                    <button 
                      onClick={() => removeFile(index)} 
                      style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', padding: '0 10px' }}
                      title="הסר קובץ"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
              
              <button 
                className="primary-action-btn" 
                onClick={handleMerge} 
                disabled={isLoading || files.length < 2} 
                style={{ backgroundColor: '#e83e8c', width: '100%', marginTop: '15px' }}
              >
                {isLoading ? 'ממזג...' : files.length < 2 ? 'בחר לפחות 2 קבצים' : 'מזג עכשיו ל-PDF'}
              </button>
            </div>
          )}
        </>
      ) : (
        /* === אזור ההורדה של הקובץ המוכן === */
        <div className="action-area" style={{ backgroundColor: 'rgba(40, 167, 69, 0.1)', border: '1px solid rgba(40, 167, 69, 0.3)' }}>
          <h3 style={{ color: '#155724', marginBottom: '15px' }}>מסמך ה-PDF הממוזג מוכן! 🎉</h3>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%', marginBottom: '20px' }}>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#555', direction: 'ltr' }}>.pdf</span>
            <input 
              type="text" 
              className="elegant-select"
              value={baseFileName} 
              onChange={(e) => setBaseFileName(e.target.value)}
              style={{ width: '200px', minWidth: 'auto', direction: 'ltr', textAlign: 'right' }}
            />
            <label style={{ fontWeight: 'bold', color: '#155724' }}>:שם הקובץ</label>
          </div>

          <a href={downloadUrl} download={`${baseFileName}.pdf`} style={{ textDecoration: 'none', width: '100%' }}>
            <button className="primary-action-btn" style={{ backgroundColor: '#28a745', width: '100%', maxWidth: '300px', marginBottom: '15px' }}>
              ⬇️ הורד מסמך ממוזג
            </button>
          </a>
          
          <button className="back-button" onClick={handleReset} style={{ marginTop: '10px' }}>
            🔄 צור מיזוג חדש
          </button>
        </div>
      )}

      {status && !downloadUrl && <p style={{ marginTop: '20px', fontWeight: 'bold', fontSize: '1.1rem', color: status.includes('שגיאה') ? '#dc3545' : '#28a745' }}>{status}</p>}
    </div>
  );
}