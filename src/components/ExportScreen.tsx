import React, { useState } from 'react';
import JSZip from 'jszip';
import confetti from 'canvas-confetti';
// @ts-ignore
import * as piexif from 'piexifjs';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
interface ExportScreenProps {
  userId: string;
  photos: any[];
  videos: any[];
  stories: any[];
  rawZip?: JSZip;
  isPremium: boolean;
  onBack: () => void;
  onNavigateHome: () => void;
  onUpgradeClick?: () => void;
}

export const ExportScreen: React.FC<ExportScreenProps> = ({
  userId,
  photos,
  videos,
  stories,
  rawZip,
  isPremium,
  onBack,
  onNavigateHome,
  onUpgradeClick
}) => {
  const [exportState, setExportState] = useState<'config' | 'processing' | 'complete'>('config');
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing files...');
  const [currentThumb, setCurrentThumb] = useState<string | null>(null);
  const [exportFolder, setExportFolder] = useState('C:\\Users\\Daniel\\Documents\\SnapVault\\Memories');
  const [errorMsg, setErrorMsg] = useState('');
  const [skippedCount, setSkippedCount] = useState(0);
  
  const allItems = [...photos, ...videos, ...stories];
  const limitCount = isPremium ? allItems.length : Math.min(allItems.length, 50);

  const triggerConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const handleStartExport = async () => {
    setExportState('processing');
    setProgress(0);
    setErrorMsg('');
    setSkippedCount(0);

    const injectExif = async (blob: Blob, dateObj: Date): Promise<string> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const dataUrl = e.target?.result as string;
            const exifObj: any = { "0th": {}, "Exif": {}, "GPS": {} };
            
            const formattedExifDate = `${dateObj.getFullYear()}:${String(dateObj.getMonth()+1).padStart(2, '0')}:${String(dateObj.getDate()).padStart(2, '0')} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}:${String(dateObj.getSeconds()).padStart(2, '0')}`;
            
            exifObj["Exif"][piexif.ExifIFD.DateTimeOriginal] = formattedExifDate;
            exifObj["Exif"][piexif.ExifIFD.DateTimeDigitized] = formattedExifDate;
            
            const exifBytes = piexif.dump(exifObj);
            const newDataUrl = piexif.insert(exifBytes, dataUrl);
            resolve(newDataUrl.split(',')[1]);
          } catch (err) {
            resolve((e.target?.result as string).split(',')[1]);
          }
        };
        reader.readAsDataURL(blob);
      });
    };

    try {
      const outputZip = new JSZip();
      const itemsToExport = allItems.slice(0, limitCount);
      
      setStatusText("Reading export records...");
      await new Promise(r => setTimeout(r, 600));

      for (let i = 0; i < itemsToExport.length; i++) {
        const item = itemsToExport[i];
        const dateStr = item["Date"] || item["date"] || new Date().toISOString();
        const mediaType = String(item["Media Type"] || item["mediaType"] || 'PHOTO').toUpperCase();
        
        const dateObj = new Date(dateStr);
        const year = dateObj.getFullYear().toString();
        const monthNames = ["01-Jan", "02-Feb", "03-Mar", "04-Apr", "05-May", "06-Jun", "07-Jul", "08-Aug", "09-Sep", "10-Oct", "11-Nov", "12-Dec"];
        const month = monthNames[dateObj.getMonth()];
        
        const formattedDate = dateStr.replace(/ UTC$/, '').replace(/:/g, '-');
        const extension = mediaType.includes('VIDEO') ? 'mp4' : 'jpg';
        
        // Organize by Year/Month
        const safeFormattedDate = formattedDate.replace(/[^a-zA-Z0-9-_\s]/g, '-');
        let finalPath = '';
        if (extension === 'mp4') {
          // Smart naming for Google Photos to infer date from filename
          finalPath = `Memories/${year}/${month}/VID_${safeFormattedDate}.${extension}`;
        } else {
          finalPath = `Memories/${year}/${month}/IMG_${safeFormattedDate}.${extension}`;
        }

        let fileProcessed = false;
        
        // Strategy 1: Check if they uploaded the full ZIP containing the media folder
        if (rawZip) {
          const searchName = `memory_${i + 1}`;
          let zipFileKey = Object.keys(rawZip.files).find(key => 
            key.toLowerCase().includes(searchName) || key.toLowerCase().includes(formattedDate)
          );

          if (zipFileKey) {
            setStatusText(`Extracting ${zipFileKey.split('/').pop()}...`);
            const blob = await rawZip.files[zipFileKey].async('blob');
            if (extension === 'jpg') {
              const base64Data = await injectExif(blob, dateObj);
              outputZip.file(finalPath, base64Data, { base64: true });
            } else {
              outputZip.file(finalPath, blob);
            }
            fileProcessed = true;
          }
        }

        // Strategy 2: Attempt to download from the AWS URL provided in the JSON
        if (!fileProcessed) {
          let downloadUrl = item["Download Link"] || item["Media Download Url"];
          if (downloadUrl) {
            try {
              // Bypass CORS on localhost using the Vite proxy we just set up
              if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                if (downloadUrl.startsWith('https://app.snapchat.com')) {
                  downloadUrl = downloadUrl.replace('https://app.snapchat.com', '/snapchat-proxy');
                }
              }

              setStatusText(`Downloading memory #${i + 1} from cloud...`);
              const response = await fetch(downloadUrl, { method: 'GET' });
              if (response.ok) {
                const buffer = await response.arrayBuffer();
                const blob = new Blob([buffer]);
                if (extension === 'jpg') {
                  const base64Data = await injectExif(blob, dateObj);
                  outputZip.file(finalPath, base64Data, { base64: true });
                  setCurrentThumb(URL.createObjectURL(blob));
                } else {
                  outputZip.file(finalPath, blob);
                  // Use a generic video placeholder
                  setCurrentThumb('https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=200&auto=format&fit=crop'); 
                }
                fileProcessed = true;
              } else {
                console.warn(`Cloud download failed with status: ${response.status}`);
              }
            } catch (err) {
              console.warn("Failed to download from URL:", err);
            }
          }
        }

        // Strategy 3: Clean Fallback
        if (!fileProcessed) {
          setSkippedCount(prev => prev + 1);
        }

        setProgress(Math.round(((i + 1) / itemsToExport.length) * 100));
        await new Promise(r => setTimeout(r, 100));
      }

      if (Object.keys(outputZip.files).length === 0) {
        throw new Error("All download links failed. Your Snapchat links have expired (they only last 7 days). Please request a new export from Snapchat, or upload your uncompressed Snapchat data folder instead.");
      }

      setStatusText("Finalizing ZIP archive compression...");
      const content = await outputZip.generateAsync({ type: "blob" }, (metadata) => {
        setProgress(Math.min(99, 90 + Math.round(metadata.percent / 10)));
      });

      const element = document.createElement("a");
      element.href = URL.createObjectURL(content);
      element.download = `SnapVault_Memories_Export.zip`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      // Firestore log
      try {
        if (userId) {
          await addDoc(collection(db, 'users', userId, 'exports'), {
            timestamp: new Date().toISOString(),
            itemsCount: itemsToExport.length,
            isPremiumUsed: isPremium,
            fileName: element.download
          });
        }
      } catch (fErr) {
        console.error(fErr);
      }

      setExportState('complete');
      triggerConfetti();

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to package memories.");
      setExportState('config');
    }
  };

  const handleBrowseSimulated = () => {
    // Simulated folder selector
    const newPath = prompt("Select Destination Folder:", exportFolder);
    if (newPath) {
      setExportFolder(newPath);
    }
  };

  return (
    <div className="setup-container animate-fade-in">
      
      {exportState === 'config' && (
        <>
          <div className="setup-header-banner">
            <div className="setup-header-text">
              <h2>Choose Save Location</h2>
              <p>Select where you want to save your extracted memories.</p>
            </div>
            <span style={{ fontSize: '24px' }}>💾</span>
          </div>

          <div className="setup-body-panel">
            <div className="location-selection-box">
              <div className="location-input-group">
                <input 
                  type="text" 
                  value={exportFolder} 
                  onChange={(e) => setExportFolder(e.target.value)} 
                  className="setup-input location-text-input"
                />
                <button onClick={handleBrowseSimulated} className="btn-setup browse-folder-btn">Browse...</button>
              </div>

              <div className="what-happens-next-card">
                <p className="whats-next-title">What happens next?</p>
                <ul className="whats-next-list">
                  <li>✓ Your memories will be organised by date.</li>
                  <li>✓ Filenames and timestamps will be preserved.</li>
                  <li>✓ You can access your memories offline.</li>
                </ul>
              </div>

              {!isPremium && (
                <div style={{ marginTop: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '16px', backgroundColor: '#fff' }}>
                  <p style={{ margin: 0, fontSize: '13px', color: '#555' }}>
                    <strong>Guest Limit:</strong><br />
                    {limitCount} / {allItems.length} memories
                  </p>
                  <div style={{ margin: '16px 0', borderBottom: '1px solid #eee' }}></div>
                  <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#555' }}>
                    Unlock Pro to export<br />
                    all {allItems.length} memories.
                  </p>
                  <button onClick={onUpgradeClick} className="btn-setup" style={{ backgroundColor: 'var(--accent-green)', width: '100%' }}>
                    Upgrade to Pro
                  </button>
                </div>
              )}

              {errorMsg && (
                <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#991B1B' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>Export Failed</h4>
                  <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5' }}>{errorMsg}</p>
                </div>
              )}
            </div>
          </div>

          <div className="setup-footer-bar">
            <button onClick={onBack} className="btn-setup">Back</button>
            <button onClick={handleStartExport} className="btn-setup">
              {errorMsg ? 'Retry Export' : 'Start Export'}
            </button>
            <button className="btn-setup" disabled>Cancel</button>
          </div>
        </>
      )}

      {exportState === 'processing' && (
        <>
          <div className="setup-header-banner">
            <div className="setup-header-text">
              <h2>Saving Memories</h2>
              <p>Writing organized files to target path...</p>
            </div>
            <span style={{ fontSize: '24px' }}>⏳</span>
          </div>

          <div className="setup-body-panel">
            <div className="exporter-progress-area" style={{ maxWidth: '440px', margin: '0 auto', width: '100%', textAlign: 'left' }}>
              <div className="setup-progress-container">
                <div className="setup-progress-label">
                  <span>Exporting files</span>
                  <span>{progress}%</span>
                </div>
                <div className="setup-progress-bar-outer">
                  <div className="setup-progress-bar-inner" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
              
              <div className="export-status-log-text">
                <p>Status: {statusText}</p>
              </div>

              {currentThumb && (
                <div style={{ marginTop: '24px', textAlign: 'center' }}>
                  <img 
                    src={currentThumb} 
                    alt="processing preview" 
                    style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #e0e0e0', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
                  />
                  <p style={{ fontSize: '11px', color: '#888', marginTop: '8px' }}>Processing Image...</p>
                </div>
              )}
            </div>
          </div>

          <div className="setup-footer-bar">
            <button className="btn-setup" disabled>Back</button>
            <button className="btn-setup" disabled>Next</button>
            <button className="btn-setup" disabled>Cancel</button>
          </div>
        </>
      )}

      {exportState === 'complete' && (
        <>
          <div className="setup-header-banner">
            <div className="setup-header-text">
              <h2>Export Complete</h2>
              <p>Your memories are ready.</p>
            </div>
            <span style={{ fontSize: '24px' }}>✓</span>
          </div>

          <div className="setup-body-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div className="export-success-badge-area">
              <div className="success-circle-check-classic">
                <span className="success-check-tick-classic">L</span>
              </div>
              <h3>Export Complete!</h3>
              <p className="success-details-sub">Your memories have been saved successfully.</p>
              
              {skippedCount > 0 && (
                <div style={{ backgroundColor: '#fffbe6', border: '1px solid #ffe58f', padding: '12px', borderRadius: '6px', fontSize: '12.5px', color: '#d48806', textAlign: 'left', maxWidth: '400px', margin: '0 auto 16px auto' }}>
                  <strong>⚠ {skippedCount} memories skipped</strong>
                  <p style={{ marginTop: '4px', lineHeight: '1.4' }}>These items could not be downloaded because their Snapchat cloud links have expired. Please request a fresh data export from Snapchat to retrieve them.</p>
                </div>
              )}
              
              <div className="location-complete-card">
                <span>Location:</span>
                <p className="location-complete-path">{exportFolder}</p>
              </div>
            </div>

            <div className="complete-button-box-row">
              <button onClick={() => alert("Simulating opening folder path")} className="btn-setup complete-row-btn">Open Folder</button>
              <button onClick={onNavigateHome} className="btn-setup complete-row-btn">Close</button>
            </div>

            <div className="wizard-corner-safety-popup">
              <span>💡 Your memories are safe and private. You can now access them anytime.</span>
            </div>
          </div>

          <div className="setup-footer-bar">
            <button className="btn-setup" disabled>Back</button>
            <button className="btn-setup" disabled>Next</button>
            <button onClick={onNavigateHome} className="btn-setup">Close</button>
          </div>
        </>
      )}

      <style>{`
        .location-selection-box {
          max-width: 460px;
          margin: 0 auto;
          width: 100%;
          text-align: left;
        }

        .location-input-group {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
        }

        .location-text-input {
          flex-grow: 1;
        }

        .browse-folder-btn {
          width: 80px;
        }

        .what-happens-next-card {
          background-color: #ffffff;
          border: 1px solid var(--border-color);
          padding: 16px;
          border-radius: 4px;
          margin-bottom: 16px;
        }

        .whats-next-title {
          font-weight: 600;
          font-size: 13px;
          margin-bottom: 10px;
          color: var(--text-main);
        }

        .whats-next-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 12px;
          color: var(--text-secondary);
        }

        .export-limit-warning-banner {
          font-size: 11px;
          color: #854d0e;
          background-color: #fef9c3;
          border: 1px solid #fef08a;
          padding: 8px 12px;
          border-radius: 4px;
        }

        .export-status-log-text {
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 8px;
        }

        /* Success screen styles */
        .export-success-badge-area {
          text-align: center;
          margin-bottom: 24px;
        }

        .success-circle-check-classic {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: 3px solid var(--accent-green);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          transform: rotate(45deg);
        }

        .success-check-tick-classic {
          font-family: Arial;
          font-size: 32px;
          color: var(--accent-green);
          font-weight: bold;
          transform: scaleX(-1) rotate(180deg) translate(-2px, 8px);
        }

        .export-success-badge-area h3 {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-main);
          margin-bottom: 6px;
        }

        .success-details-sub {
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 16px;
        }

        .location-complete-card {
          background-color: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          padding: 10px 14px;
          text-align: left;
          max-width: 400px;
          font-size: 12.5px;
        }

        .location-complete-card span {
          color: var(--text-secondary);
          display: block;
          margin-bottom: 2px;
        }

        .location-complete-path {
          font-weight: 600;
          color: var(--text-main);
          word-break: break-all;
        }

        .complete-button-box-row {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-bottom: 20px;
        }

        .complete-row-btn {
          min-width: 100px;
          height: 26px;
        }

        .wizard-corner-safety-popup {
          font-size: 11px;
          color: var(--text-secondary);
          background-color: #fcfcfc;
          border: 1px solid var(--border-color);
          padding: 8px 16px;
          border-radius: 20px;
        }
      `}</style>
    </div>
  );
};
