import React, { useState, useEffect } from 'react';

interface ScannerProps {
  photos: any[];
  videos: any[];
  stories: any[];
  onCancel: () => void;
  onScanComplete: (scannedItems: {
    photos: any[];
    videos: any[];
    stories: any[];
    totalCount: number;
    dateRange: string;
    totalSizeEstimate: string;
  }) => void;
}

export const Scanner: React.FC<ScannerProps> = ({
  photos,
  videos,
  stories,
  onCancel,
  onScanComplete
}) => {
  const [totalProgress, setTotalProgress] = useState(0);
  const [fileProgress, setFileProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('Initializing extraction...');
  const [currentThumb, setCurrentThumb] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [remainingTime, setRemainingTime] = useState('Estimating...');
  const [speed, setSpeed] = useState('0.0 MB/s');
  
  const totalItems = photos.length + videos.length + stories.length;
  
  // Total size simulation based on items (photos avg 1.5MB, videos 8MB)
  const totalSizeMB = (photos.length * 1.5 + videos.length * 8.0);
  const totalSizeStr = totalSizeMB > 1024 
    ? `${(totalSizeMB / 1024).toFixed(2)} GB` 
    : `${totalSizeMB.toFixed(1)} MB`;

  useEffect(() => {
    let timer: NodeJS.Timeout;
    let startTime = Date.now();
    let fileIdx = 0;
    
    const allItems = [...photos, ...videos, ...stories];

    const runExtraction = () => {
      // 1. Calculate Elapsed Time
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      const hours = String(Math.floor(elapsedSeconds / 3600)).padStart(2, '0');
      const minutes = String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, '0');
      const seconds = String(elapsedSeconds % 60).padStart(2, '0');
      setElapsedTime(`${hours}:${minutes}:${seconds}`);

      // 2. Cycle Current File and Progress
      setFileProgress((prevFileProg) => {
        let nextFileProg = prevFileProg + Math.floor(Math.random() * 80) + 40; // Fast progression
        
        if (nextFileProg >= 100) {
          nextFileProg = 0;
          fileIdx = (fileIdx + 1) % (allItems.length || 1);
          
          if (allItems.length > 0) {
            const currentItem = allItems[fileIdx];
            const mediaType = currentItem["Media Type"] || currentItem["mediaType"] || 'PHOTO';
            const dateStr = currentItem["Date"] || currentItem["date"] || new Date().toISOString();
            const formattedDate = dateStr.replace(/ UTC$/, '').replace(/:/g, '-');
            const ext = mediaType.toUpperCase().includes('VIDEO') ? 'mp4' : 'jpg';
            setCurrentFile(`IMG_${formattedDate.replace(/ /g, '_')}.${ext}`);
            setCurrentThumb(`https://picsum.photos/seed/${new Date(dateStr).getTime() + fileIdx}/200/200`);
          } else {
            setCurrentFile(`extracting_metadata_${fileIdx + 1}.json`);
            setCurrentThumb(`https://picsum.photos/seed/${fileIdx}/200/200`);
          }
        }
        return nextFileProg;
      });

      // 3. Increment Total Progress
      setTotalProgress((prevTotalProg) => {
        if (prevTotalProg >= 100) {
          clearInterval(timer);
          
          // Complete and transition
          const firstDate = getMinMaxDate();
          setTimeout(() => {
            onScanComplete({
              photos,
              videos,
              stories,
              totalCount: totalItems,
              dateRange: firstDate,
              totalSizeEstimate: totalSizeStr
            });
          }, 800);
          
          return 100;
        }

        const nextTotalProg = prevTotalProg + 1.5; // Slightly faster scan overall
        
        // Dynamic speed simulation
        const currentSpeed = (12.5 + Math.sin(nextTotalProg * 0.1) * 3.8).toFixed(1);
        setSpeed(`${currentSpeed} MB/s`);

        // Dynamic ETA calculation
        const remainingPercentage = 100 - nextTotalProg;
        const remainingSeconds = Math.max(0, Math.ceil(remainingPercentage * 0.15));
        const remMin = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
        const remSec = String(remainingSeconds % 60).padStart(2, '0');
        setRemainingTime(`00:${remMin}:${remSec}`);

        return nextTotalProg;
      });
    };

    timer = setInterval(runExtraction, 150);

    return () => clearInterval(timer);
  }, [photos, videos, stories]);

  const getMinMaxDate = () => {
    try {
      const allItems = [...photos, ...videos, ...stories];
      const dates = allItems
        .map(i => i["Date"] || i["date"])
        .filter(Boolean)
        .map(d => new Date(d));
      
      if (dates.length === 0) return "Unknown date range";
      
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
      
      const format = (d: Date) => d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      return `${format(minDate)} - ${format(maxDate)}`;
    } catch {
      return "2020 - 2026";
    }
  };

  // Convert total progress percentage to bytes extracted
  const currentBytesMB = (totalSizeMB * totalProgress) / 100;
  const currentBytesStr = totalSizeMB > 1024
    ? `${(currentBytesMB / 1024).toFixed(2)} GB of ${totalSizeStr}`
    : `${currentBytesMB.toFixed(1)} MB of ${totalSizeStr}`;

  // Current file size simulation (e.g. 5.2 MB)
  const currentFileTotalMB = currentFile.endsWith('mp4') ? 12.4 : 1.8;
  const currentFileProgressMB = (currentFileTotalMB * fileProgress) / 100;
  const currentFileProgressStr = `${currentFileProgressMB.toFixed(1)} MB of ${currentFileTotalMB.toFixed(1)} MB`;

  return (
    <div className="setup-container animate-fade-in">
      <div className="setup-header-banner">
        <div className="setup-header-text">
          <h2>Extracting Memories</h2>
          <p>Please wait while we extract your Snapchat memories...</p>
        </div>
        <span style={{ fontSize: '24px' }}>⏳</span>
      </div>

      <div className="setup-body-panel">
        <div className="extractor-progress-area">
          
          {/* Progress Bar 1: Total Progress */}
          <div className="setup-progress-container">
            <div className="setup-progress-label">
              <span>Total progress</span>
              <span>{currentBytesStr}</span>
            </div>
            <div className="setup-progress-bar-outer">
              <div className="setup-progress-bar-inner" style={{ width: `${Math.min(100, totalProgress)}%` }}></div>
            </div>
          </div>

          {/* Progress Bar 2: Current File */}
          <div className="setup-progress-container">
            <div className="setup-progress-label">
              <span>Current file</span>
              <span>{currentFileProgressStr}</span>
            </div>
            <div className="setup-progress-bar-outer">
              <div className="setup-progress-bar-inner" style={{ width: `${Math.min(100, fileProgress)}%` }}></div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px', marginTop: '24px' }}>
            {/* Extractor details table style */}
            <div className="extraction-details-table" style={{ flexGrow: 1, marginTop: 0 }}>
              <div className="details-row">
                <span className="col-label">File:</span>
                <span className="col-value file-name-value">{currentFile}</span>
              </div>
              <div className="details-row">
                <span className="col-label">Speed:</span>
                <span className="col-value">{speed}</span>
              </div>
              <div className="details-row">
                <span className="col-label">Status:</span>
                <span className="col-value text-bold">Extracting...</span>
              </div>
              <div className="details-row">
                <span className="col-label">Elapsed time:</span>
                <span className="col-value">{elapsedTime}</span>
              </div>
              <div className="details-row">
                <span className="col-label">Remaining time:</span>
                <span className="col-value">{remainingTime}</span>
              </div>
            </div>

            {currentThumb && (
              <div className="scanner-thumbnail-box">
                <img src={currentThumb} alt="Scanning" />
                <div className="scanner-scanline"></div>
              </div>
            )}
          </div>

        </div>
      </div>

      <div className="setup-footer-bar">
        <button className="btn-setup" disabled>Back</button>
        <button className="btn-setup" disabled>Next</button>
        <button onClick={onCancel} className="btn-setup">Cancel</button>
      </div>

      <style>{`
        .extractor-progress-area {
          max-width: 520px;
          margin: 0 auto;
          width: 100%;
          text-align: left;
        }

        .extraction-details-table {
          background-color: #ffffff;
          border: 1px solid var(--border-color);
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .details-row {
          display: flex;
          font-size: 12px;
          line-height: 1.4;
        }

        .col-label {
          width: 120px;
          color: var(--text-secondary);
        }

        .col-value {
          color: var(--text-main);
          font-family: var(--font-sans);
        }

        .file-name-value {
          font-family: monospace;
          word-break: break-all;
          display: block;
          max-width: 220px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .text-bold {
          font-weight: 600;
        }

        .scanner-thumbnail-box {
          width: 120px;
          height: 120px;
          flex-shrink: 0;
          border: 1px solid #c0c0c0;
          background-color: #f0f0f0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
        }

        .scanner-thumbnail-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .scanner-scanline {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: rgba(118, 165, 63, 0.6);
          box-shadow: 0 0 10px rgba(118, 165, 63, 0.8);
          animation: scan 1s linear infinite;
        }

        @keyframes scan {
          0% { transform: translateY(-10px); }
          100% { transform: translateY(130px); }
        }
      `}</style>
    </div>
  );
};
