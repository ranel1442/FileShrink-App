# 📦 FileShrink - Ultimate Free File Compressor & Converter

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![FFmpeg](https://img.shields.io/badge/FFmpeg-007808?style=for-the-badge&logo=FFmpeg&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)

**FileShrink** is a powerful, full-stack web application designed to compress and convert various types of files (PDF, Images, Video, Audio) completely free of charge. 

Unlike many other services that rely on paid third-party APIs with strict quotas, FileShrink is built to be **100% independent**. It processes heavy media files using robust, open-source engines running directly on the backend.

## 🚀 Live Demo
* **Frontend:** Deployed on [Vercel](https://vercel.com/)
* **Backend:** Deployed as a Docker container on [Render](https://render.com/)

---

## ✨ Features

1. **📄 PDF Compression**: Uses `Ghostscript` to significantly reduce PDF file sizes while maintaining readability.
2. **🖼️ Image Compression**: Uses `Sharp` to compress JPEG, PNG, WEBP, and even animated GIFs efficiently.
3. **🎬 Video Compression**: Uses `FFmpeg` to compress MP4 videos.
4. **🎧 Audio Compression**: Uses `FFmpeg` to reduce MP3 bitrates.
5. **🎵 MP4 to MP3 Extraction**: Quickly extracts the audio track from video files.
6. **📊 Secret Analytics Dashboard**: A hidden `/stats` route that displays real-time usage statistics tracked via a custom JSON store.

---

## 🛠️ Tech Stack

### Frontend (`/client`)
* **React + Vite**: For a lightning-fast development experience.
* **TypeScript**: For strict typing and fewer runtime errors.
* **React Dropzone**: For a smooth drag-and-drop file upload experience.
* **Axios**: For API requests.
* **UI/UX**: Custom CSS with a modern, responsive, "glassmorphism" design.

### Backend (`/server`)
* **Node.js & Express**: Handling API routing and file streams.
* **TypeScript**: Type-safe backend architecture.
* **Multer**: For handling `multipart/form-data` and temporary file storage.
* **FFmpeg (`fluent-ffmpeg`)**: For robust video and audio processing.
* **Ghostscript (`child_process`)**: For native PDF compression.
* **Sharp**: For high-performance image processing.
* **Docker**: Containerized environment to ensure Ghostscript and FFmpeg are available in production.

---

## 💻 Running Locally

### Prerequisites
* Node.js installed
* **FFmpeg** installed on your machine and added to PATH.
* **Ghostscript** installed on your machine and added to PATH.

### Installation

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/ranel1442/FileShrink-App.git](https://github.com/ranel1442/FileShrink-App.git)
   cd FileShrink-App