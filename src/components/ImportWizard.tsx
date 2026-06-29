import React, { useState, useRef } from 'react';
import JSZip from 'jszip';

interface ImportWizardProps {
  onBack: () => void;
  onImportComplete: (data: {
    fileName: string;
    fileSize: number;
    photos: any[];
    videos: any[];
    stories: any[];
    rawZip?: JSZip;
  }) => void;
}

export const ImportWizard: React.FC<ImportWizardProps> = ({ onBack, onImportComplete }) => {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [stats, setStats] = useState<{
    fileName: string;
    fileSize: number;
    photosCount: number;
    videosCount: number;
    storiesCount: number;
    photos: any[];
    videos: any[];
    stories: any[];
    rawZip?: JSZip;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseMemoriesJson = (jsonText: string, fileName: string, fileSize: number, zipInstance?: JSZip) => {
    try {
      const data = JSON.parse(jsonText);
      const memories = data["Saved Media"] || data["Saved Memories"] || data["memories"] || [];
      
      const photos: any[] = [];
      const videos: any[] = [];
      const stories: any[] = [];

      memories.forEach((item: any) => {
        const type = String(item["Media Type"] || item["mediaType"] || '').toUpperCase();
        if (type.includes('VIDEO')) {
          videos.push(item);
        } else if (type.includes('STORY') || item["Story"] || item["story"]) {
          stories.push(item);
        } else {
          photos.push(item);
        }
      });

      setStats({
        fileName,
        fileSize,
        photosCount: photos.length,
        videosCount: videos.length,
        storiesCount: stories.length,
        photos,
        videos,
        stories,
        rawZip: zipInstance
      });
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError("Failed to parse memories_history.json. Please ensure this is a valid Snapchat export file.");
    }
  };

  const processFile = async (file: File) => {
    setLoading(true);
    setError('');
    setSuccess(false);
    setStats(null);

    const name = file.name.toLowerCase();
    
    try {
      if (name.endsWith('.json')) {
        const text = await file.text();
        parseMemoriesJson(text, file.name, file.size);
      } else if (name.endsWith('.zip')) {
        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(file);
        
        let jsonFileKey = Object.keys(loadedZip.files).find(key => 
          key.endsWith('memories_history.json')
        );

        if (!jsonFileKey) {
          setError("Could not find 'memories_history.json' inside the ZIP file. Please check if this is the original Snapchat export.");
          setLoading(false);
          return;
        }

        const jsonContent = await loadedZip.files[jsonFileKey].async('text');
        parseMemoriesJson(jsonContent, file.name, file.size, loadedZip);
      } else {
        setError("Invalid file type. Please upload a Snapchat export ZIP or memories_history.json.");
      }
    } catch (err) {
      console.error(err);
      setError("Error processing file. Ensure it is not corrupted.");
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleProceed = () => {
    if (stats) {
      onImportComplete({
        fileName: stats.fileName,
        fileSize: stats.fileSize,
        photos: stats.photos,
        videos: stats.videos,
        stories: stats.stories,
        rawZip: stats.rawZip
      });
    }
  };

  return (
    <div className="setup-container">
      <div className="setup-header-banner">
        <div className="setup-header-text">
          <h2>Upload Your Snapchat Data</h2>
          <p>Upload your downloaded data here.</p>
        </div>
        <span style={{ fontSize: '24px' }}>📁</span>
      </div>

      <div className="setup-body-panel">
        <div 
          className={`classic-dropzone ${dragActive ? 'drag-active' : ''} ${loading ? 'loading' : ''}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <input 
            ref={fileInputRef}
            type="file" 
            className="hidden-file-input" 
            accept=".zip,.json" 
            onChange={handleFileChange}
          />
          
          {loading ? (
            <div className="wizard-spinner-state">
              <span className="spinner-icon">⏳</span>
              <p>Analyzing Snapchat archive...</p>
            </div>
          ) : success && stats ? (
            <div className="wizard-success-state">
              <span className="success-icon">✓</span>
              <h4>Snapchat export detected</h4>
              <p className="wizard-file-details">
                {stats.fileName} ({ (stats.fileSize / (1024 * 1024)).toFixed(1) } MB)
              </p>
              <div className="extracted-counts-mini">
                <span>Photos: <strong>{stats.photosCount}</strong></span>
                <span>Videos: <strong>{stats.videosCount}</strong></span>
                <span>Stories: <strong>{stats.storiesCount}</strong></span>
              </div>
            </div>
          ) : (
            <div className="wizard-upload-prompt" onClick={onButtonClick}>
              <span className="upload-arrow-icon">📤</span>
              <p className="drag-label">Drag and drop your file here</p>
              <p className="or-label">or</p>
              <button type="button" className="btn-setup browse-files-btn">Browse Files</button>
            </div>
          )}
        </div>

        {error && (
          <div className="wizard-error-msg">
            <span>⚠ {error}</span>
          </div>
        )}

        <div className="wizard-instructions-footer">
          <p className="label-bold">Accepted files:</p>
          <ul>
            <li>• memories_history.json</li>
            <li>• Snapchat data folder (uncompressed ZIP)</li>
          </ul>
          
          <div className="privacy-alert-wizard">
            <span>🔒 Your data is 100% private. We never upload anything.</span>
          </div>
        </div>
      </div>

      <div className="setup-footer-bar">
        <button onClick={onBack} className="btn-setup">Back</button>
        <button 
          onClick={handleProceed} 
          className="btn-setup" 
          disabled={!success}
        >
          Next
        </button>
        <button className="btn-setup">Cancel</button>
      </div>

      <style>{`
        .classic-dropzone {
          border: 1px dashed #7a7a7a;
          background-color: #ffffff;
          padding: 24px;
          text-align: center;
          cursor: pointer;
          min-height: 140px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
          transition: background-color 0.15s;
        }

        .classic-dropzone.drag-active {
          background-color: #e5f1fb;
          border-color: #0078d7;
        }

        .hidden-file-input {
          display: none;
        }

        .wizard-upload-prompt {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }

        .upload-arrow-icon {
          font-size: 28px;
        }

        .drag-label {
          font-size: 13px;
          color: #000000;
        }

        .or-label {
          font-size: 11px;
          color: #606060;
        }

        .browse-files-btn {
          width: 100px;
        }

        .wizard-spinner-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .spinner-icon {
          font-size: 24px;
        }

        .wizard-success-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .success-icon {
          font-size: 24px;
          color: var(--accent-green);
          font-weight: bold;
        }

        .wizard-success-state h4 {
          font-size: 13px;
          font-weight: 600;
          color: var(--accent-green);
        }

        .wizard-file-details {
          font-size: 11px;
          color: var(--text-secondary);
        }

        .extracted-counts-mini {
          display: flex;
          gap: 12px;
          font-size: 11px;
          color: var(--text-secondary);
          margin-top: 6px;
          background-color: #f7f7f7;
          padding: 4px 8px;
          border: 1px solid var(--border-color);
        }

        .wizard-error-msg {
          font-size: 12px;
          color: #991b1b;
          text-align: left;
          margin-bottom: 8px;
        }

        .wizard-instructions-footer {
          text-align: left;
          font-size: 11px;
          color: var(--text-secondary);
        }

        .label-bold {
          font-weight: 600;
          color: var(--text-main);
          margin-bottom: 4px;
        }

        .wizard-instructions-footer ul {
          list-style: none;
          margin-bottom: 12px;
          padding-left: 4px;
        }

        .privacy-alert-wizard {
          color: #2b7a2b;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};
