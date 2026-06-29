import React, { useState } from 'react';
import { X, ShieldCheck, Moon, Globe, HardDrive, RefreshCw } from 'lucide-react';

interface SettingsProps {
  isPremium: boolean;
  onClose: () => void;
  onUpgradeClick: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  isPremium,
  onClose,
  onUpgradeClick
}) => {
  const [theme, setTheme] = useState('dark');
  const [language, setLanguage] = useState('en');
  const [exportFolder, setExportFolder] = useState('Downloads/SnapMemories');
  const [updateStatus, setUpdateStatus] = useState('App is up to date (v1.0.0)');
  const [checkingUpdates, setCheckingUpdates] = useState(false);

  const checkUpdates = () => {
    setCheckingUpdates(true);
    setUpdateStatus('Checking for updates...');
    setTimeout(() => {
      setCheckingUpdates(false);
      setUpdateStatus('No updates available (v1.0.0 is the latest version)');
    }, 1500);
  };

  return (
    <div className="overlay-backdrop animate-fade-in">
      <div className="overlay-window">
        <div className="overlay-header">
          <h3>Settings</h3>
          <button onClick={onClose} className="close-overlay-btn"><X size={16} /></button>
        </div>

        <div className="overlay-body">
          <div className="settings-section">
            <h4><Moon size={14} className="sec-icon" /> Appearance</h4>
            <div className="form-group">
              <label htmlFor="theme-select">Theme Style</label>
              <select 
                id="theme-select"
                value={theme} 
                onChange={(e) => setTheme(e.target.value)}
                className="input-field select-field"
              >
                <option value="dark">Windows 11 Dark Mode (Recommended)</option>
                <option value="amoled">Obsidian AMOLED</option>
                <option value="light" disabled>Light Mode (Coming Soon)</option>
              </select>
            </div>
          </div>

          <div className="settings-section">
            <h4><HardDrive size={14} className="sec-icon" /> Storage & Files</h4>
            <div className="form-group">
              <label htmlFor="folder-select">Default Export Path</label>
              <div className="path-input-group">
                <input 
                  id="folder-select"
                  type="text" 
                  value={exportFolder} 
                  onChange={(e) => setExportFolder(e.target.value)}
                  className="input-field" 
                />
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h4><Globe size={14} className="sec-icon" /> Language & Regional</h4>
            <div className="form-group">
              <label htmlFor="lang-select">Application Language</label>
              <select 
                id="lang-select"
                value={language} 
                onChange={(e) => setLanguage(e.target.value)}
                className="input-field select-field"
              >
                <option value="en">English (UK/US)</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="es">Español</option>
              </select>
            </div>
          </div>

          <div className="settings-section">
            <h4><ShieldCheck size={14} className="sec-icon" /> About & Updates</h4>
            <div className="update-status-row">
              <div className="status-label">
                <span>{updateStatus}</span>
              </div>
              <button 
                onClick={checkUpdates} 
                className="btn btn-secondary btn-sm"
                disabled={checkingUpdates}
              >
                {checkingUpdates ? <RefreshCw size={12} className="spinner" /> : 'Check Updates'}
              </button>
            </div>

            <div className="about-branding">
              <h5>SnapMemories Windows Client</h5>
              <p>Version 1.0.0 • Developed with React + Tauri</p>
              <div className="license-status-display">
                <span>License: <strong>{isPremium ? 'PRO ACTIVATED' : 'FREE VERSION'}</strong></span>
                {!isPremium && (
                  <button onClick={() => { onClose(); onUpgradeClick(); }} className="btn-upgrade-text">
                    Upgrade to Premium
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .overlay-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          backdrop-filter: blur(4px);
        }

        .overlay-window {
          width: 520px;
          background: var(--bg-dark);
          border: 1px solid var(--border-light);
          border-radius: 12px;
          box-shadow: var(--win-shadow);
          overflow: hidden;
          animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .overlay-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-light);
          background: rgba(12, 15, 23, 0.4);
        }

        .overlay-header h3 {
          font-size: 15px;
          color: var(--text-primary);
        }

        .close-overlay-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.15s ease;
        }

        .close-overlay-btn:hover {
          background-color: rgba(255, 255, 255, 0.08);
          color: var(--text-primary);
        }

        .overlay-body {
          padding: 24px;
          max-height: 480px;
          overflow-y: auto;
          text-align: left;
        }

        .settings-section {
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border-light);
          padding-bottom: 16px;
        }

        .settings-section:last-child {
          border-bottom: none;
          padding-bottom: 0;
          margin-bottom: 0;
        }

        .settings-section h4 {
          font-size: 13.5px;
          color: var(--text-primary);
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .sec-icon {
          color: var(--text-muted);
        }

        .select-field {
          background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E");
          background-position: right 10px center;
          background-repeat: no-repeat;
          background-size: 18px;
          padding-right: 32px;
          -webkit-appearance: none;
          appearance: none;
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 12px;
        }

        .update-status-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-light);
          padding: 8px 12px;
          border-radius: 6px;
          margin-bottom: 16px;
        }

        .status-label {
          font-size: 12.5px;
          color: var(--text-secondary);
        }

        .about-branding {
          background: rgba(0, 0, 0, 0.15);
          padding: 16px;
          border-radius: 8px;
          border: 1px solid var(--border-light);
        }

        .about-branding h5 {
          font-size: 13px;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .about-branding p {
          font-size: 11.5px;
          color: var(--text-muted);
          margin-bottom: 12px;
        }

        .license-status-display {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          border-top: 1px solid var(--border-light);
          padding-top: 10px;
        }

        .btn-upgrade-text {
          background: transparent;
          border: none;
          color: var(--accent-yellow);
          font-weight: 700;
          cursor: pointer;
          font-size: 12px;
        }

        .btn-upgrade-text:hover {
          text-decoration: underline;
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
