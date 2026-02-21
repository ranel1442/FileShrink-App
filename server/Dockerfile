# משתמשים במערכת הפעלה לינוקס קלה שכוללת את Node.js
FROM node:18-bullseye-slim

# התקנת התוכנות החיצוניות שלנו על השרת (Ghostscript ו-FFmpeg)
RUN apt-get update && apt-get install -y ghostscript ffmpeg

# הגדרת תיקיית העבודה בתוך השרת
WORKDIR /app

# העתקת קבצי הגדרות החבילות והתקנתן
COPY package*.json ./
RUN npm install

# העתקת כל שאר הקוד שלנו לשרת
COPY . .

# חשיפת הפורט שעליו השרת רץ
EXPOSE 5000

# הפקודה שמפעילה את השרת
CMD ["npm", "run", "dev"]