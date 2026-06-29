import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import confetti from 'canvas-confetti';
// @ts-ignore
import * as piexif from 'piexifjs';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

// Detect if we're running inside Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

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
  const [statusText, setStatusText] = useState('Initializing...');
  const [currentThumb, setCurrentThumb] = useState<string | null>(null);
  const [exportFolder, setExportFolder] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [skippedCount, setSkippedCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [exportMode, setExportMode] = useState<'folder' | 'zip'>('zip');

  const allItems = [...photos, ...videos, ...stories];
  const limitCount = isPremium ? allItems.length : Math.min(allItems.length, 50);

  useEffect(() => {
    // Load default path from Electron or use generic placeholder
    const loadDefaultPath = async () => {
      if (isElectron) {
        const defaultPath = await (window as any).electronAPI.getDefaultPath();
        setExportFolder(defaultPath);
        setExportMode('folder'); // Desktop app: save to real folder
      } else {
        setExportFolder('Downloads/SnapVault_Memories_Export.zip');
        setExportMode('zip'); // Web: download as ZIP
      }
    };
    loadDefaultPath();
  }, []);

  const triggerConfetti = () => {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
  };

  const handleBrowseFolder = async () => {
    if (isElectron) {
      const chosen = await (window as any).electronAPI.pickFolder();
      if (chosen) setExportFolder(chosen);
    } else {
      const newPath = prompt('Save location:', exportFolder);
      if (newPath) setExportFolder(newPath);
    }
  };

  const injectExif = async (blob: Blob, dateObj: Date): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const dataUrl = e.target?.result as string;
          const exifObj: any = { '0th': {}, 'Exif': {}, 'GPS': {} };
          const pad = (n: number) => String(n).padStart(2, '0');
          const formattedExifDate = `${dateObj.getFullYear()}:${pad(dateObj.getMonth()+1)}:${pad(dateObj.getDate())} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}:${pad(dateObj.getSeconds())}`;
          exifObj['Exif'][piexif.ExifIFD.DateTimeOriginal] = formattedExifDate;
          exifObj['Exif'][piexif.ExifIFD.DateTimeDigitized] = formattedExifDate;
          const exifBytes = piexif.dump(exifObj);
          const newDataUrl = piexif.insert(exifBytes, dataUrl);
          resolve(newDataUrl.split(',')[1]);
        } catch {
          resolve((e.target?.result as string).split(',')[1]);
        }
      };
      reader.readAsDataURL(blob);
    });
  };

  const getFilePath = (item: any, index: number) => {
    const dateStr = item['Date'] || item['date'] || new Date().toISOString();
    const mediaType = String(item['Media Type'] || item['mediaType'] || 'PHOTO').toUpperCase();
    const dateObj = new Date(dateStr);
    const year = dateObj.getFullYear().toString();
    const monthNames = ['01-Jan','02-Feb','03-Mar','04-Apr','05-May','06-Jun','07-Jul','08-Aug','09-Sep','10-Oct','11-Nov','12-Dec'];
    const month = monthNames[dateObj.getMonth()];
    const formattedDate = dateStr.replace(/ UTC$/, '').replace(/:/g, '-').replace(/[^a-zA-Z0-9-_\s]/g, '-');
    const ext = mediaType.includes('VIDEO') ? 'mp4' : 'jpg';
    const prefix = ext === 'mp4' ? 'VID' : 'IMG';
    return { 
      relativePath: `${year}/${month}/${prefix}_${formattedDate}.${ext}`,
      dateObj,
      ext,
      dateStr
    };
  };

  const handleStartExport = async () => {
    setExportState('processing');
    setProgress(0);
    setErrorMsg('');
    setSkippedCount(0);
    setSavedCount(0);

    const itemsToExport = allItems.slice(0, limitCount);

    try {
      // ── ELECTRON MODE: Save directly to real folders ──────────────────────
      if (isElectron && exportMode === 'folder') {
        setStatusText('Creating folder structure...');
        let saved = 0;
        let skipped = 0;

        for (let i = 0; i < itemsToExport.length; i++) {
          const item = itemsToExport[i];
          const { relativePath, dateObj, ext } = getFilePath(item, 0);

          setCurrentThumb(`https://picsum.photos/seed/${dateObj.getTime() + i}/300/300`);
          setStatusText(`Saving ${relativePath.split('/').pop()}...`);

          let fileData: string | null = null;

          // Try rawZip first
          if (rawZip) {
            const formattedDate = (item['Date'] || '').replace(/ UTC$/, '').replace(/:/g, '-');
            const zipFileKey = Object.keys(rawZip.files).find(key =>
              key.toLowerCase().includes(formattedDate.toLowerCase()) ||
              key.toLowerCase().includes(`memory_${i + 1}`)
            );
            if (zipFileKey) {
              const blob = await rawZip.files[zipFileKey].async('blob');
              if (ext === 'jpg') {
                fileData = await injectExif(blob, dateObj);
              } else {
                const arr = await rawZip.files[zipFileKey].async('uint8array');
                fileData = Buffer.from(arr).toString('base64');
              }
            }
          }

          // Try download URL
          if (!fileData) {
            const downloadUrl = item['Download Link'] || item['Media Download Url'];
            if (downloadUrl) {
              try {
                const response = await fetch(downloadUrl);
                if (response.ok) {
                  const blob = await response.blob();
                  if (ext === 'jpg') {
                    fileData = await injectExif(blob, dateObj);
                  } else {
                    const arr = new Uint8Array(await blob.arrayBuffer());
                    fileData = Buffer.from(arr).toString('base64');
                  }
                }
              } catch { /* skip */ }
            }
          }

          if (fileData) {
            const result = await (window as any).electronAPI.saveFile({
              folderPath: exportFolder,
              relativePath,
              base64Data: fileData
            });
            if (result.success) {
              saved++;
              setSavedCount(saved);
            } else {
              skipped++;
              setSkippedCount(skipped);
            }
          } else {
            skipped++;
            setSkippedCount(skipped);
          }

          setProgress(Math.round(((i + 1) / itemsToExport.length) * 100));
          await new Promise(r => setTimeout(r, 80));
        }

        if (saved === 0 && skipped > 0) {
          throw new Error('No files could be saved. Download links may have expired — request a fresh export from Snapchat.');
        }

      } else {
        // ── WEB MODE: Bundle as ZIP and download ────────────────────────────
        const outputZip = new JSZip();
        let skipped = 0;

        setStatusText('Reading export records...');
        await new Promise(r => setTimeout(r, 400));

        for (let i = 0; i < itemsToExport.length; i++) {
          const item = itemsToExport[i];
          const { relativePath, dateObj, ext } = getFilePath(item, 0);
          const finalPath = `Memories/${relativePath}`;
          let fileProcessed = false;

          if (rawZip) {
            const formattedDate = (item['Date'] || '').replace(/ UTC$/, '').replace(/:/g, '-');
            const zipFileKey = Object.keys(rawZip.files).find(key =>
              key.toLowerCase().includes(formattedDate.toLowerCase()) ||
              key.toLowerCase().includes(`memory_${i + 1}`)
            );
            if (zipFileKey) {
              setStatusText(`Extracting ${zipFileKey.split('/').pop()}...`);
              const blob = await rawZip.files[zipFileKey].async('blob');
              if (ext === 'jpg') {
                const base64Data = await injectExif(blob, dateObj);
                outputZip.file(finalPath, base64Data, { base64: true });
              } else {
                outputZip.file(finalPath, blob);
              }
              fileProcessed = true;
            }
          }

          if (!fileProcessed) {
            const downloadUrl = item['Download Link'] || item['Media Download Url'];
            if (downloadUrl) {
              try {
                const response = await fetch(downloadUrl);
                if (response.ok) {
                  const blob = await response.blob();
                  if (ext === 'jpg') {
                    const base64Data = await injectExif(blob, dateObj);
                    outputZip.file(finalPath, base64Data, { base64: true });
                  } else {
                    outputZip.file(finalPath, blob);
                  }
                  fileProcessed = true;
                }
              } catch { /* skip */ }
            }
          }

          if (!fileProcessed) {
            skipped++;
            setSkippedCount(skipped);
          }

          setCurrentThumb(`https://picsum.photos/seed/${dateObj.getTime() + i}/300/300`);
          setProgress(Math.round(((i + 1) / itemsToExport.length) * 100));
          await new Promise(r => setTimeout(r, 150));
        }

        setStatusText('Compressing ZIP archive...');
        const content = await outputZip.generateAsync({ type: 'blob' }, (meta) => {
          setProgress(Math.min(99, 90 + Math.round(meta.percent / 10)));
        });

        const element = document.createElement('a');
        element.href = URL.createObjectURL(content);
        element.download = 'SnapVault_Memories_Export.zip';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        setSavedCount(itemsToExport.length - skipped);
      }

      // Log to Firestore
      try {
        if (userId) {
          await addDoc(collection(db, 'users', userId, 'exports'), {
            timestamp: new Date().toISOString(),
            itemsCount: limitCount,
            isPremiumUsed: isPremium,
            mode: isElectron ? 'desktop-folder' : 'web-zip'
          });
        }
      } catch { /* non-fatal */ }

      setExportState('complete');
      triggerConfetti();

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Export failed. Please try again.');
      setExportState('config');
    }
  };

  const handleOpenFolder = async () => {
    if (isElectron) {
      await (window as any).electronAPI.openFolder(exportFolder);
    } else {
      alert('Your memories were saved to your Downloads folder as SnapVault_Memories_Export.zip');
    }
  };

  return (
    <div className="setup-container animate-fade-in">

      {exportState === 'config' && (
        <>
          <div className="setup-header-banner">
            <div className="setup-header-text">
              <h2>Choose Save Location</h2>
              <p>{isElectron ? 'Files will be saved directly to a folder on your computer, organised by date.' : 'Your memories will be downloaded as an organised ZIP file.'}</p>
            </div>
            <span style={{ fontSize: '24px' }}>💾</span>
          </div>

          <div className="setup-body-panel">
            <div style={{ maxWidth: '460px', margin: '0 auto', width: '100%', textAlign: 'left' }}>

              {isElectron && (
                <div style={{ marginBottom: '20px' }}>
                  <p style={{ fontSize: '12px', color: '#555', fontWeight: 600, marginBottom: '8px' }}>Save location:</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={exportFolder}
                      onChange={(e) => setExportFolder(e.target.value)}
                      className="setup-input"
                      style={{ fontSize: '12px' }}
                    />
                    <button onClick={handleBrowseFolder} className="btn-setup btn-secondary-outline" style={{ minWidth: '80px', height: '44px', fontSize: '13px' }}>
                      Browse...
                    </button>
                  </div>
                </div>
              )}

              <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <p style={{ fontWeight: 700, fontSize: '13px', marginBottom: '10px' }}>📁 How your files will be organised:</p>
                <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#555', lineHeight: '2', backgroundColor: '#f9f9f9', padding: '12px', borderRadius: '6px' }}>
                  {isElectron ? exportFolder : 'Memories/'}<br/>
                  &nbsp;&nbsp;├── 2022/<br/>
                  &nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;├── 01-Jan/<br/>
                  &nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;├── IMG_2022-01-14-15-30-00.jpg<br/>
                  &nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;└── VID_2022-01-20-09-00-00.mp4<br/>
                  &nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;└── 06-Jun/<br/>
                  &nbsp;&nbsp;└── 2023/<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── 05-May/
                </div>
              </div>

              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <p style={{ fontSize: '12.5px', color: '#166534' }}>
                  ✓ Original dates preserved &nbsp;|&nbsp; ✓ Organised by Year/Month &nbsp;|&nbsp; ✓ Ready for Google Photos
                </p>
              </div>

              {!isPremium && (
                <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '16px', backgroundColor: '#fff' }}>
                  <p style={{ fontSize: '13px', color: '#555', marginBottom: '12px' }}>
                    <strong>Free limit:</strong> exporting {limitCount} of {allItems.length} memories.
                  </p>
                  <button onClick={onUpgradeClick} className="btn-setup" style={{ width: '100%' }}>
                    Unlock all {allItems.length} memories — £2.99
                  </button>
                </div>
              )}

              {errorMsg && (
                <div style={{ fontSize: '12px', color: '#991b1b', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px', padding: '10px', marginTop: '12px' }}>
                  ⚠ {errorMsg}
                </div>
              )}
            </div>
          </div>

          <div className="setup-footer-bar">
            <button onClick={onBack} className="btn-setup btn-secondary-outline">Back</button>
            <button onClick={handleStartExport} className="btn-setup">
              {isElectron ? '💾 Save to Folder' : '⬇ Download ZIP'}
            </button>
            <button className="btn-setup btn-secondary-outline" disabled>Cancel</button>
          </div>
        </>
      )}

      {exportState === 'processing' && (
        <>
          <div className="setup-header-banner">
            <div className="setup-header-text">
              <h2>{isElectron ? 'Saving Memories to Folder' : 'Packaging Memories'}</h2>
              <p>{statusText}</p>
            </div>
            <span style={{ fontSize: '24px' }}>⏳</span>
          </div>

          <div className="setup-body-panel">
            <div style={{ maxWidth: '440px', margin: '0 auto', width: '100%', textAlign: 'left' }}>
              <div className="setup-progress-container">
                <div className="setup-progress-label">
                  <span>{isElectron ? `Saved ${savedCount} files` : 'Packaging files'}</span>
                  <span>{progress}%</span>
                </div>
                <div className="setup-progress-bar-outer">
                  <div className="setup-progress-bar-inner" style={{ width: `${progress}%` }}></div>
                </div>
              </div>

              {skippedCount > 0 && (
                <p style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                  ⚠ {skippedCount} memories skipped (expired links)
                </p>
              )}

              <p style={{ fontSize: '12px', color: '#666', marginTop: '12px' }}>{statusText}</p>

              {currentThumb && (
                <div style={{ marginTop: '24px', textAlign: 'center' }}>
                  <img src={currentThumb} alt="processing" style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #e0e0e0' }} />
                  <p style={{ fontSize: '11px', color: '#888', marginTop: '8px' }}>Processing...</p>
                </div>
              )}
            </div>
          </div>

          <div className="setup-footer-bar">
            <button className="btn-setup btn-secondary-outline" disabled>Back</button>
            <button className="btn-setup" disabled>Next</button>
            <button className="btn-setup btn-secondary-outline" disabled>Cancel</button>
          </div>
        </>
      )}

      {exportState === 'complete' && (
        <>
          <div className="setup-header-banner">
            <div className="setup-header-text">
              <h2>Export Complete! 🎉</h2>
              <p>Your memories have been saved successfully.</p>
            </div>
            <span style={{ fontSize: '24px' }}>✅</span>
          </div>

          <div className="setup-body-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '56px', marginBottom: '12px' }}>🎉</div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>
                {savedCount} memories saved!
              </h3>
              <p style={{ fontSize: '13px', color: '#555' }}>
                {isElectron ? `Saved to: ${exportFolder}` : 'Check your Downloads folder for SnapVault_Memories_Export.zip'}
              </p>
            </div>

            {skippedCount > 0 && (
              <div style={{ backgroundColor: '#fffbe6', border: '1px solid #ffe58f', padding: '12px', borderRadius: '6px', fontSize: '12.5px', color: '#d48806', maxWidth: '400px', textAlign: 'left' }}>
                <strong>⚠ {skippedCount} memories skipped</strong>
                <p style={{ marginTop: '4px', lineHeight: '1.4' }}>These items' Snapchat cloud links have expired. Request a fresh data export from Snapchat to retrieve them.</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              {isElectron && (
                <button onClick={handleOpenFolder} className="btn-setup">
                  📁 Open Folder
                </button>
              )}
              <button onClick={onNavigateHome} className="btn-setup btn-secondary-outline">
                Done
              </button>
            </div>

            <p style={{ fontSize: '11px', color: '#888', textAlign: 'center', maxWidth: '360px', lineHeight: '1.5' }}>
              💡 Your files are organised by Year → Month and ready to import into Google Photos or iCloud.
            </p>
          </div>

          <div className="setup-footer-bar">
            <button className="btn-setup btn-secondary-outline" disabled>Back</button>
            <button className="btn-setup btn-secondary-outline" disabled>Next</button>
            <button onClick={onNavigateHome} className="btn-setup">Close</button>
          </div>
        </>
      )}
    </div>
  );
};
