import dotenv from 'dotenv';
dotenv.config(); // חייב להיות בהתחלה: טוען את המפתח מקובץ ה-.env
import { exec } from 'child_process';
import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import CloudConvert from 'cloudconvert';
import axios from 'axios';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

// מגדירים ל-fluent-ffmpeg איפה נמצא המנוע שהתקנו
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const app = express();
const PORT = process.env.PORT || 5000;



// --- מערכת סטטיסטיקות פשוטה ---
const statsFilePath = path.join(__dirname, 'stats.json');

function updateStats(toolName: string) {
  try {
    let stats: any = {};
    if (fs.existsSync(statsFilePath)) {
      stats = JSON.parse(fs.readFileSync(statsFilePath, 'utf8'));
    }
    
    const today = new Date().toISOString().split('T')[0]; // מביא את התאריך של היום (YYYY-MM-DD)

    if (!stats[toolName]) {
      stats[toolName] = { total: 0, today: 0, lastDate: today };
    }

    // אם התאריך של היום שונה מהתאריך האחרון שנשמר, נאפס את ספירת "היום"
    if (stats[toolName].lastDate !== today) {
      stats[toolName].today = 0;
      stats[toolName].lastDate = today;
    }

    stats[toolName].total += 1;
    stats[toolName].today += 1;

    fs.writeFileSync(statsFilePath, JSON.stringify(stats, null, 2));
  } catch (error) {
    console.error('שגיאה בעדכון הסטטיסטיקה:', error);
  }
}



// ==========================================
// 1. הגדרות שרת (Middlewares)
// ==========================================
app.use(cors()); // מאפשר ללקוח (React) לדבר עם השרת
app.use(express.json());

// ==========================================
// 2. הגדרת העלאת קבצים (Multer)
// ==========================================
// יצירת תיקיית uploads במידה ואינה קיימת
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    // נותן לקובץ שם ייחודי כדי למנוע דריסת קבצים
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// ==========================================
// 3. אתחול CloudConvert
// ==========================================
// משתמש במפתח שהגדרנו בקובץ הסודי .env
const cloudConvert = new CloudConvert(process.env.CLOUDCONVERT_API_KEY as string);

// ==========================================
// 4. נתיבים (Routes) של השרת
// ==========================================

// בדיקת סטטוס פשוטה
app.get('/api/status', (req: Request, res: Response) => {
  res.json({ message: 'השרת של FileShrink רץ בהצלחה! 🚀', status: 'OK' });
});






// נתיב לשליפת הסטטיסטיקות (עבור דף המנהל)
app.get('/api/stats', (req: Request, res: Response) => {
  try {
    if (fs.existsSync(statsFilePath)) {
      const stats = JSON.parse(fs.readFileSync(statsFilePath, 'utf8'));
      res.json(stats);
    } else {
      res.json({}); // אם עדיין לא נוצר קובץ, נחזיר אובייקט ריק
    }
  } catch (error) {
    res.status(500).json({ error: 'שגיאה בשליפת נתונים.' });
  }
});
// ------------------------------------



// ------------------------------------------
// נתיב כיווץ PDF - מקומי וחינמי עם Ghostscript!
// ------------------------------------------
app.post('/api/compress/pdf', upload.single('file'), (req: Request, res: Response): any => {
  if (!req.file) return res.status(400).json({ error: 'לא נשלח קובץ.' });

  const originalName = req.file.originalname;
  const filePath = req.file.path;
  const quality = req.body.quality || 'medium';

  // Ghostscript עובד עם פרופילים מובנים של איכות
  let gsQuality = '/ebook'; // medium - איכות טובה לקריאה במסך (כ-150 dpi)
  if (quality === 'small') gsQuality = '/screen'; // small - כיווץ מקסימלי, איכות נמוכה (כ-72 dpi)
  if (quality === 'large') gsQuality = '/printer'; // large - כיווץ עדין, איכות גבוהה להדפסה (כ-300 dpi)

  const outputPath = path.join(uploadDir, `compressed-${req.file.filename}.pdf`);

  // הבדל בפקודה בין ווינדוס לשרת אמיתי (לינוקס/מאק)
  const gsCommand = process.platform === 'win32' ? 'gswin64c' : 'gs';

  // הפקודה המדויקת שמפעילה את מנוע ה-PDF ודוחסת את הקובץ
  const command = `${gsCommand} -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=${gsQuality} -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${outputPath}" "${filePath}"`;

  try {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('שגיאה בכיווץ ה-PDF עם Ghostscript:', error);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return res.status(500).json({ error: 'שגיאה בכיווץ. ודא ש-Ghostscript מותקן במחשב.' });
      }

      // הכל עבר בהצלחה!
      updateStats('pdf'); // עדכון לוח הסטטיסטיקות הסודי שלנו
      
      res.download(outputPath, `compressed-${originalName}`, (err) => {
        // ניקיון קבצים
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      });
    });
  } catch (error) {
    console.error('שגיאה כללית במערכת:', error);
    res.status(500).json({ error: 'שגיאה בתהליך.' });
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});



// ------------------------------------------
// נתיב חילוץ שמע (MP4 ל-MP3) - מקומי וחינמי עם FFmpeg!
// ------------------------------------------
app.post('/api/convert/mp4-to-mp3', upload.single('file'), (req: Request, res: Response): any => {
  if (!req.file) return res.status(400).json({ error: 'לא נשלח קובץ.' });

  // שומרים את הנתונים במשתנים כדי למנוע שגיאות TypeScript
  const originalName = req.file.originalname;
  const filePath = req.file.path;

  const quality = req.body.quality || 'medium';
  
  // הגדרת איכות השמע (Bitrate)
  let audioBitrate = '192k'; // בינוני - מומלץ
  if (quality === 'small') audioBitrate = '96k'; // קטן - איכות נמוכה
  if (quality === 'large') audioBitrate = '320k'; // גדול - איכות מקסימלית (אולפן)

  // חילוץ שם הקובץ המקורי ללא הסיומת
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
  const outputPath = path.join(uploadDir, `audio-${req.file.filename}.mp3`);

  try {
    // מפעילים את FFmpeg כדי לחלץ את האודיו
    ffmpeg(filePath)
      .toFormat('mp3') // מגדירים את פורמט היציאה
      .audioBitrate(audioBitrate) // מגדירים את האיכות
      .save(outputPath)
      .on('end', () => {
        // ההמרה הסתיימה בהצלחה!
        updateStats('mp4_to_mp3'); // עדכון הסטטיסטיקות
        
        res.download(outputPath, `${nameWithoutExt}.mp3`, (err) => {
          // ניקיון קבצים מהשרת לאחר השליחה
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        });
      })
      .on('error', (err) => {
        console.error('שגיאה בחילוץ השמע עם FFmpeg:', err);
        res.status(500).json({ error: 'שגיאה בחילוץ השמע.' });
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });
      
  } catch (error) {
    console.error('שגיאה כללית:', error);
    res.status(500).json({ error: 'שגיאה בתהליך.' });
  }
});



// ------------------------------------------
// נתיב כיווץ תמונות (מקומי לחלוטין עם Sharp)
// ------------------------------------------
app.post('/api/compress/image', upload.single('file'), async (req: Request, res: Response): Promise<any> => {
  if (!req.file) return res.status(400).json({ error: 'לא נשלח קובץ.' });

  const quality = req.body.quality || 'medium';
  
  // תרגום ה"איכות" לאחוזים של כיווץ עבור תמונות רגילות (0 עד 100)
  let sharpQuality = 80; 
  if (quality === 'small') sharpQuality = 50; 
  if (quality === 'large') sharpQuality = 95; 

  const outputPath = path.join(uploadDir, `compressed-${req.file.filename}`);

  try {
    // 1. קוראים את הקובץ לתוך הזיכרון (Buffer) כדי שלא יינעל על ידי Windows
    const inputBuffer = fs.readFileSync(req.file.path);
    
    // בודקים איזה סוג קובץ הגיע (כדי שנדע איך לטפל בו)
    const mimetype = req.file.mimetype; 
    
    // 2. מאתחלים את Sharp ואומרים לו לתמוך באנימציה (קריטי עבור GIF)
    let sharpPipeline = sharp(inputBuffer, { animated: true });

    // 3. מפעילים את הכיווץ הנכון *רק* לפי סוג הקובץ הספציפי שהעלינו
    if (mimetype === 'image/jpeg' || mimetype === 'image/jpg') {
      sharpPipeline = sharpPipeline.jpeg({ quality: sharpQuality });
    } 
    else if (mimetype === 'image/png') {
      sharpPipeline = sharpPipeline.png({ quality: sharpQuality });
    } 
    else if (mimetype === 'image/webp') {
      sharpPipeline = sharpPipeline.webp({ quality: sharpQuality });
    } 
    else if (mimetype === 'image/gif') {
      // ב-GIF אי אפשר לשנות "איכות", אז נשנה את כמות הצבעים כדי לחסוך במשקל (מקסימום 256)
      let colors = 256; 
      if (quality === 'medium') colors = 128; 
      if (quality === 'small') colors = 64; 

      sharpPipeline = sharpPipeline.gif({ colors: colors });
    }

    // שומרים את התמונה המכווצת לכונן
    await sharpPipeline.toFile(outputPath);
    
    updateStats('image'); // מעדכן את הסטטיסטיקה עבור כלי כיווץ תמונות

    // 4. שליחת התמונה המכווצת חזרה ללקוח
    res.download(outputPath, `compressed-${req.file.originalname}`, (err) => {
      // ניקיון הקבצים מהשרת
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    });
  } catch (error) {
    console.error('שגיאה בכיווץ התמונה:', error);
    res.status(500).json({ error: 'שגיאה בכיווץ התמונה.' });
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
  }
});



// ------------------------------------------
// נתיב כיווץ וידאו (MP4) - מקומי וחינמי עם FFmpeg!
// ------------------------------------------
app.post('/api/compress/video', upload.single('file'), (req: Request, res: Response): any => {
  if (!req.file) return res.status(400).json({ error: 'לא נשלח קובץ.' });

  // שומרים את הנתונים במשתנים רגילים כדי ש-TypeScript יירגע ולא ישכח אותם
  const originalName = req.file.originalname;
  const filePath = req.file.path;

  const quality = req.body.quality || 'medium';
  
  // הגדרת רמת הכיווץ (CRF - Constant Rate Factor)
  let crfValue = 23; // בינוני
  if (quality === 'small') crfValue = 28; // קטן - כיווץ אגרסיבי
  if (quality === 'large') crfValue = 18; // גדול - איכות גבוהה

  const outputPath = path.join(uploadDir, `compressed-${req.file.filename}.mp4`);

  try {
    // מפעילים את FFmpeg על הקובץ שהועלה
    ffmpeg(filePath)
      .outputOptions([
        '-vcodec libx264', // מקודד וידאו סטנדרטי
        `-crf ${crfValue}`, // רמת הכיווץ שלנו
        '-preset fast' // מהירות העיבוד
      ])
      .save(outputPath)
      .on('end', () => {
        // כשהכיווץ מסתיים בהצלחה, מעדכנים סטטיסטיקה ושולחים ללקוח
        updateStats('video');
        
        res.download(outputPath, `compressed-${originalName}`, (err) => {
          // ניקיון קבצים מהשרת
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        });
      })
      .on('error', (err) => {
        console.error('שגיאה בכיווץ הוידאו עם FFmpeg:', err);
        res.status(500).json({ error: 'שגיאה בכיווץ הוידאו.' });
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });
      
  } catch (error) {
    console.error('שגיאה כללית:', error);
    res.status(500).json({ error: 'שגיאה בתהליך.' });
  }
});



// ------------------------------------------
// נתיב כיווץ שמע (MP3) - מקומי וחינמי עם FFmpeg!
// ------------------------------------------
app.post('/api/compress/audio', upload.single('file'), (req: Request, res: Response): any => {
  if (!req.file) return res.status(400).json({ error: 'לא נשלח קובץ.' });

  // שומרים נתונים במשתנים למניעת שגיאות TypeScript
  const originalName = req.file.originalname;
  const filePath = req.file.path;

  const quality = req.body.quality || 'medium';
  
  // הגדרת קצב הנתונים (Bitrate)
  let audioBitrate = '128k'; // בינוני - איכות טובה לאינטרנט
  if (quality === 'small') audioBitrate = '64k'; // קטן - מתאים בעיקר להקלטות דיבור/פודקאסטים
  if (quality === 'large') audioBitrate = '192k'; // גדול - איכות גבוהה

  const outputPath = path.join(uploadDir, `compressed-${req.file.filename}.mp3`);

  try {
    // מפעילים את FFmpeg כדי לשנות את ה-Bitrate של ה-MP3
    ffmpeg(filePath)
      .audioBitrate(audioBitrate)
      .save(outputPath)
      .on('end', () => {
        // הכיווץ הסתיים בהצלחה!
        updateStats('audio'); // עדכון הסטטיסטיקות של כלי האודיו
        
        res.download(outputPath, `compressed-${originalName}`, (err) => {
          // ניקיון קבצים מהשרת לאחר השליחה
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        });
      })
      .on('error', (err) => {
        console.error('שגיאה בכיווץ האודיו עם FFmpeg:', err);
        res.status(500).json({ error: 'שגיאה בכיווץ האודיו.' });
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });
      
  } catch (error) {
    console.error('שגיאה כללית:', error);
    res.status(500).json({ error: 'שגיאה בתהליך.' });
  }
});



// ------------------------------------------
// נתיב מיזוג קבצים (PDF ותמונות) ל-PDF אחד
// ------------------------------------------
app.post('/api/merge/pdf', upload.array('files', 20), async (req: Request, res: Response): Promise<any> => {
  // מוודאים שקיבלנו מערך של קבצים
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) return res.status(400).json({ error: 'לא נשלחו קבצים.' });

  const outputPath = path.join(uploadDir, `merged-${Date.now()}.pdf`);

  try {
    // יוצרים מסמך PDF חדש וריק
    const mergedPdf = await PDFDocument.create();

    // עוברים על כל הקבצים שהמשתמש העלה, לפי הסדר
    for (const file of files) {
      const fileBuffer = fs.readFileSync(file.path);

      if (file.mimetype === 'application/pdf') {
        // אם זה קובץ PDF - נטען אותו ונעתיק את כל העמודים שלו למסמך החדש
        const pdf = await PDFDocument.load(fileBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      } 
      else if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg' || file.mimetype === 'image/png') {
        // אם זו תמונה - נטמיע אותה וניצור עבורה עמוד חדש בגודל המדויק של התמונה
        let image;
        if (file.mimetype.includes('png')) {
          image = await mergedPdf.embedPng(fileBuffer);
        } else {
          image = await mergedPdf.embedJpg(fileBuffer);
        }
        
        const page = mergedPdf.addPage([image.width, image.height]);
        page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
      }
    }

    // שומרים את מסמך ה-PDF הממוזג לקובץ בכונן
    const pdfBytes = await mergedPdf.save();
    fs.writeFileSync(outputPath, pdfBytes);

    updateStats('merge_pdf'); // מעדכן את הסטטיסטיקה עבור כלי מיזוג PDF

    // שולחים ללקוח חזרה
    res.download(outputPath, 'merged-document.pdf', (err) => {
      // ניקיון: מוחקים את כל קבצי המקור שהועלו
      files.forEach(file => { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); });
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    });

  } catch (error) {
    console.error('שגיאה במיזוג הקבצים:', error);
    res.status(500).json({ error: 'שגיאה במיזוג הקבצים.' });
    files.forEach(file => { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); });
  }
});






// ==========================================
//  הפעלת השרת
// ==========================================
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});






// לא חלק מהשרת אלה פונקציות שהיו בשימוש API חיצוני  וכבר אין צורך בהם, אבל שמרתי אותם כאן למקרה שארצה להחזיר אותם בעתיד או להשתמש בהם כבסיס לפיצ'רים חדשים:
// פונקציה לדוגמה שהייתה בשימוש עם API חיצוני (כמו CloudConvert) להעלאת קובץ ישירות מהשרת שלהם, אבל עכשיו כשאנחנו עושים הכל מקומית עם FFmpeg ו-Sharp, אין לנו צורך בזה יותר.



// ------------------------------------------
// נתיב כיווץ וידאו (MP4) באמצעות CloudConvert
// ------------------------------------------
// app.post('/api/compress/video', upload.single('file'), async (req: Request, res: Response): Promise<any> => {
//   if (!req.file) return res.status(400).json({ error: 'לא נשלח קובץ.' });

//   const quality = req.body.quality || 'medium';
  
//   // הגדרת רמת הכיווץ (CRF - Constant Rate Factor)
//   // ככל שהמספר גבוה יותר, הכיווץ חזק יותר והאיכות יורדת.
//   let crfValue = 23; // בינוני - איזון טוב בין משקל לאיכות
//   if (quality === 'small') crfValue = 28; // קטן - כיווץ אגרסיבי
//   if (quality === 'large') crfValue = 18; // גדול - שמירה על איכות גבוהה מאוד

//   try {
//     let job = await cloudConvert.jobs.create({
//       tasks: {
//         'upload-video': { operation: 'import/upload' },
//         'compress-video': {
//           operation: 'convert',
//           input: 'upload-video',
//           output_format: 'mp4',
//           video_codec: 'x264',
//           crf: crfValue // משתמשים בערך הכיווץ שהגדרנו
//         },
//         'export-video': { operation: 'export/url', input: 'compress-video' }
//       }
//     });

//     const uploadTask = job.tasks.filter(task => task.name === 'upload-video')[0];
//     await cloudConvert.tasks.upload(uploadTask, fs.createReadStream(req.file.path));

//     job = await cloudConvert.jobs.wait(job.id);

//     const exportTask = job.tasks.filter(task => task.name === 'export-video')[0];
//     const fileUrl = exportTask.result?.files?.[0]?.url;
    
//     if (!fileUrl) throw new Error('לא התקבל קישור מ-CloudConvert');

//     const response = await axios({ method: 'get', url: fileUrl, responseType: 'stream' });

//     updateStats('video'); // מעדכן את הסטטיסטיקה עבור כלי כיווץ וידאו

//     res.setHeader('Content-Type', 'video/mp4');
//     response.data.pipe(res);

//     if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
//   } catch (error) {
//     console.error('שגיאה בכיווץ הוידאו:', error);
//     res.status(500).json({ error: 'שגיאה בכיווץ הוידאו.' });
//     if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
//   }
// });




// ------------------------------------------
// נתיב כיווץ שמע (MP3) באמצעות CloudConvert
// ------------------------------------------
// app.post('/api/compress/audio', upload.single('file'), async (req: Request, res: Response): Promise<any> => {
//   if (!req.file) return res.status(400).json({ error: 'לא נשלח קובץ.' });

//   const quality = req.body.quality || 'medium';
  
//   // הגדרת קצב הנתונים (Bitrate)
//   let audioBitrate = 128; // בינוני - איכות טובה לאינטרנט
//   if (quality === 'small') audioBitrate = 64; // קטן - איכות נמוכה (מתאים בעיקר להקלטות דיבור/פודקאסטים)
//   if (quality === 'large') audioBitrate = 192; // גדול - איכות גבוהה (כיווץ עדין)

//   try {
//     let job = await cloudConvert.jobs.create({
//       tasks: {
//         'upload-audio': { operation: 'import/upload' },
//         'compress-audio': {
//           operation: 'convert', // משתמשים בפעולת המרה כדי לשנות את ה-Bitrate
//           input: 'upload-audio',
//           output_format: 'mp3',
//           audio_bitrate: audioBitrate
//         },
//         'export-audio': { operation: 'export/url', input: 'compress-audio' }
//       }
//     });

//     const uploadTask = job.tasks.filter(task => task.name === 'upload-audio')[0];
//     await cloudConvert.tasks.upload(uploadTask, fs.createReadStream(req.file.path));

//     job = await cloudConvert.jobs.wait(job.id);

//     const exportTask = job.tasks.filter(task => task.name === 'export-audio')[0];
//     const fileUrl = exportTask.result?.files?.[0]?.url;
    
//     if (!fileUrl) throw new Error('לא התקבל קישור מ-CloudConvert');

//     updateStats('audio'); // מעדכן את הסטטיסטיקה עבור כלי כיווץ שמע

//     const response = await axios({ method: 'get', url: fileUrl, responseType: 'stream' });

//     res.setHeader('Content-Type', 'audio/mpeg');
//     response.data.pipe(res);

//     if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
//   } catch (error) {
//     console.error('שגיאה בכיווץ האודיו:', error);
//     res.status(500).json({ error: 'שגיאה בכיווץ האודיו.' });
//     if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
//   }
// });





// ------------------------------------------
// נתיב חילוץ שמע (MP4 ל-MP3)
// ------------------------------------------
// app.post('/api/convert/mp4-to-mp3', upload.single('file'), async (req: Request, res: Response): Promise<any> => {
//   if (!req.file) return res.status(400).json({ error: 'לא נשלח קובץ.' });

//   const quality = req.body.quality || 'medium';
  
//   // מתאימים את איכות השמע לפי בחירת המשתמש
//   let audioBitrate = 192; // בינוני
//   if (quality === 'small') audioBitrate = 96; // קטן - איכות נמוכה
//   if (quality === 'large') audioBitrate = 320; // גדול - איכות מקסימלית

//   try {
//     let job = await cloudConvert.jobs.create({
//       tasks: {
//         'upload-my-video': { operation: 'import/upload' },
//         'convert-to-mp3': {
//           operation: 'convert',
//           input: 'upload-my-video',
//           input_format: 'mp4',
//           output_format: 'mp3',
//           audio_bitrate: audioBitrate
//         },
//         'export-my-audio': { operation: 'export/url', input: 'convert-to-mp3' }
//       }
//     });

//     const uploadTask = job.tasks.filter(task => task.name === 'upload-my-video')[0];
//     await cloudConvert.tasks.upload(uploadTask, fs.createReadStream(req.file.path));

//     job = await cloudConvert.jobs.wait(job.id);

//     const exportTask = job.tasks.filter(task => task.name === 'export-my-audio')[0];
//     const fileUrl = exportTask.result?.files?.[0]?.url;
    
//     if (!fileUrl) throw new Error('לא התקבל קישור מ-CloudConvert');

//     updateStats('mp4-to-mp3'); // מעדכן את הסטטיסטיקה עבור כלי המרת MP4 ל-MP3

//     const response = await axios({ method: 'get', url: fileUrl, responseType: 'stream' });

//     res.setHeader('Content-Type', 'audio/mpeg');
//     response.data.pipe(res);

//     // ניקיון
//     if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
//   } catch (error) {
//     console.error('שגיאה בהמרת הוידאו:', error);
//     res.status(500).json({ error: 'שגיאה בהמרה.' });
//     if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
//   }
// });




// // ------------------------------------------
// // נתיב כיווץ PDF
// // ------------------------------------------
// app.post('/api/compress/pdf', upload.single('file'), async (req: Request, res: Response): Promise<any> => {
//   if (!req.file) return res.status(400).json({ error: 'לא נשלח קובץ.' });

//   const quality = req.body.quality || 'medium';
  
//   // מתאימים את הגדרות CloudConvert לפי בחירת המשתמש
// // מגדירים במפורש שהמשתנה יכול להכיל רק אחת משלוש האפשרויות המותרות
//   let profile: "web" | "max" | "print" = "web";
//   if (quality === 'small') profile = "max";
//   if (quality === 'large') profile = "print";

//   try {
//     let job = await cloudConvert.jobs.create({
//       tasks: {
//         'upload-my-file': { operation: 'import/upload' },
//         'compress-my-pdf': {
//           operation: 'optimize',
//           input: 'upload-my-file',
//           input_format: 'pdf',
//           profile: profile
//         },
//         'export-my-file': { operation: 'export/url', input: 'compress-my-pdf' }
//       }
//     });

//     const uploadTask = job.tasks.filter(task => task.name === 'upload-my-file')[0];
//     await cloudConvert.tasks.upload(uploadTask, fs.createReadStream(req.file.path));

//     job = await cloudConvert.jobs.wait(job.id);

//     const exportTask = job.tasks.filter(task => task.name === 'export-my-file')[0];
//     const fileUrl = exportTask.result?.files?.[0]?.url;
    
//     if (!fileUrl) throw new Error('לא התקבל קישור מ-CloudConvert');

//     updateStats('pdf'); // מעדכן את הסטטיסטיקה עבור כלי כיווץ PDF

//     const response = await axios({ method: 'get', url: fileUrl, responseType: 'stream' });

//     res.setHeader('Content-Type', 'application/pdf');
//     response.data.pipe(res);

//     // ניקיון השרת שלנו מקובץ המקור
//     if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
//   } catch (error) {
//     console.error('שגיאה בכיווץ ה-PDF:', error);
//     res.status(500).json({ error: 'שגיאה בכיווץ.' });
//     if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
//   }
// });