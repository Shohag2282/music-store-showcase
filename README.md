# SoundStore Showcase — Music Store (AI Generated Music)

This is a single-page web application that simulates a music store showcase by generating fake, localized song information on-the-fly from a seed value. 

The application is built with a **React (Vite) Frontend** and a **Node.js (Express) Backend**.

---

## 📂 Project Architecture & Folder Structure

Here is where the core files are located and what they do:

```micro
music-store-showcase1/
├── backend/                  # Node.js + Express Backend
│   ├── locales.json          # External JSON configuration for supported locales (English, German, Ukrainian)
│   ├── server.js             # Main server logic: song metadata generation, Faker seeds, and PRNG logic
│   └── package.json          # Backend dependencies (@faker-js/faker v10, express, cors)
│
└── frontend/                 # React + Vite Frontend
    ├── src/
    │   ├── App.jsx           # Root layout and global state management (locale, seed, likes, viewMode)
    │   ├── App.css           # Styling system & UI aesthetics (Glassmorphism, animations, responsive cards)
    │   ├── main.jsx          # Entry point for React
    │   └── components/       # Reusable React UI Components
    │       ├── ToolBar.jsx      # Horizontal toolbar (Language, Seed input, Random seed, Likes slider, View mode)
    │       ├── TableView.jsx    # Table layout with paginated lists, expandable rows, and synced lyrics
    │       ├── GalleryView.jsx  # Gallery grid card layout with infinite scroll and detail overlay modal
    │       ├── CoverArt.jsx     # Procedural graphic engine (SVG/Canvas) generating 8 visual styles of album art
    │       └── MusicPlayer.jsx  # Procedural audio engine generating reproducible, seed-dependent preview tracks
    ├── index.html            # Main HTML layout
    └── package.json          # Frontend dependencies & build scripts
```

---

## 🛠️ Key Feature Locations & Technical Explanations

If you are grading or editing this project, here is exactly where to find the implementation of specific features:

### 1. Localization & Region-Specific Data
* **Backend Configuration**: [`backend/locales.json`](file:///d:/itransition-tasks/New%20folder/task5/music-store-showcase1/backend/locales.json)
  Contains external, non-hardcoded mappings of locales to their respective Faker locales (e.g. `en`, `de`, `uk`).
* **Faker Integration**: [`backend/server.js`](file:///d:/itransition-tasks/New%20folder/task5/music-store-showcase1/backend/server.js) (lines 18–28)
  Faker instances are pre-initialized for each locale to ensure names, genres, titles, and reviews match the selected region without hardcoding values in code.

### 2. Custom 64-bit Seeds & Deterministic PRNG
* **Toolbar Interface**: [`frontend/src/components/ToolBar.jsx`](file:///d:/itransition-tasks/New%20folder/task5/music-store-showcase1/frontend/src/components/ToolBar.jsx) (lines 68–87)
  Allows typing any custom 64-bit seed value or generating a random 64-bit seed using `Math.random()` integer strings.
* **PRNG Engine**: [`backend/server.js`](file:///d:/itransition-tasks/New%20folder/task5/music-store-showcase1/backend/server.js) (lines 30–38)
  Linear Congruential Generator (LCG) implementation to guarantee that the same seed value generates identical metadata, album art, and music notes.

### 3. Reactive, Probabilistic Likes System
* **Avlanche Scrambler**: [`backend/server.js`](file:///d:/itransition-tasks/New%20folder/task5/music-store-showcase1/backend/server.js) (lines 50–58)
  To ensure uniform likes distribution without linear clustering, we use a MurmurHash3-based `scramble` function on seeds.
* **Probabilistic Likes Calculation**:
  - Client-side: [`frontend/src/components/TableView.jsx`](file:///d:/itransition-tasks/New%20folder/task5/music-store-showcase1/frontend/src/components/TableView.jsx) (lines 29–35) and [`frontend/src/components/GalleryView.jsx`](file:///d:/itransition-tasks/New%20folder/task5/music-store-showcase1/frontend/src/components/GalleryView.jsx) (lines 29–35).
  - Server-side: [`backend/server.js`](file:///d:/itransition-tasks/New%20folder/task5/music-store-showcase1/backend/server.js) (lines 147–152).
  Uses fractional logic. E.g., setting the slider to `3.5` gives each track exactly a 50% chance of getting 3 or 4 likes, keeping titles and covers identical as only like counts update.

### 4. Interactive Display Modes
* **Table View (Paginated)**: [`frontend/src/components/TableView.jsx`](file:///d:/itransition-tasks/New%20folder/task5/music-store-showcase1/frontend/src/components/TableView.jsx)
  Shows songs with pages, collapsible rows, review details, live scrolling lyrics, and procedural cover previews.
* **Gallery View (Infinite Scroll)**: [`frontend/src/components/GalleryView.jsx`](file:///d:/itransition-tasks/New%20folder/task5/music-store-showcase1/frontend/src/components/GalleryView.jsx)
  Uses an `IntersectionObserver` to trigger infinite scrolling pagination. Cards support inline play and a detailed popup overlay.

### 5. Procedural Cover Art & Music Generation
* **Procedural Covers**: [`frontend/src/components/CoverArt.jsx`](file:///d:/itransition-tasks/New%20folder/task5/music-store-showcase1/frontend/src/components/CoverArt.jsx)
  Generates 8 rich canvas-rendered patterns (vinyl, geometric, waves, mosaic, starburst, organic, retro, minimal) with overlays showing correct titles and artists.
* **Audio Synthesizer**: [`frontend/src/components/MusicPlayer.jsx`](file:///d:/itransition-tasks/New%20folder/task5/music-store-showcase1/frontend/src/components/MusicPlayer.jsx)
  Procedurally generates real chords, basslines, and melodies directly in the browser utilizing the Web Audio API. Audio outputs are reproducible and seed-dependent.
* **Scrolling Lyrics**: [`frontend/src/components/MusicPlayer.jsx`](file:///d:/itransition-tasks/New%20folder/task5/music-store-showcase1/frontend/src/components/MusicPlayer.jsx) & [`frontend/src/components/TableView.jsx`](file:///d:/itransition-tasks/New%20folder/task5/music-store-showcase1/frontend/src/components/TableView.jsx)
  Scrolls and highlights lines dynamically synchronized with playback.

---

## 🚀 How to Run the Project

### 1. Running the Backend Server
```bash
cd backend
npm install
node server.js
```
*The server will start running on port `5000` (API endpoint: `http://localhost:5000/api/songs`).*

### 2. Running the Frontend App
```bash
cd frontend
npm install
npm run dev
```
*The React app will be served locally, typically at `http://localhost:5173/`.*
