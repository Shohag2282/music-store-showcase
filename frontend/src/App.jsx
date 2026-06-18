import React, { useState } from 'react';
import ToolBar from './components/ToolBar';
import TableView from './components/TableView';
import GalleryView from './components/GalleryView';
import './App.css';

// root component — holds global state and renders the layout
function App() {
  const [locale, setLocale] = useState('en');
  const [seed, setSeed] = useState('1234567890123456789');
  const [likes, setLikes] = useState(3.7);
  const [viewMode, setViewMode] = useState('table');

  return (
    <div className="app-root">
      {/* top header with logo and toolbar */}
      <div className="top-header">
        <div className="header-brand">
          <div className="brand-logo">♫</div>
          <div className="brand-text">
            <div className="brand-title">Music Store Showcase</div>
          </div>
        </div>

        <ToolBar
          locale={locale} setLocale={setLocale}
          seed={seed} setSeed={setSeed}
          likes={likes} setLikes={setLikes}
          viewMode={viewMode} setViewMode={setViewMode}
        />
      </div>

      {/* main content area */}
      <div className="main-content">
        {viewMode === 'table' ? (
          <div className="fullscreen-table">
            <TableView locale={locale} seed={seed} likes={likes} />
          </div>
        ) : (
          <div className="fullscreen-gallery">
            <div className="gallery-sidebar-header" style={{ marginBottom: '20px', fontSize: '18px' }}>
              Gallery View (Infinite Scroll)
            </div>
            <GalleryView locale={locale} seed={seed} likes={likes} isSidebar={false} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;