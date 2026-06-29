import React from 'react';
import { Minus, Square, X } from 'lucide-react';

interface TitleBarProps {
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  title?: string;
  isPremium?: boolean;
  userEmail?: string;
  onLogout?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  onClose,
  onMinimize,
  onMaximize,
  title = "SnapVault",
  isPremium = false,
  userEmail,
  onLogout
}) => {
  const handleMinimize = async () => {
    if (onMinimize) {
      onMinimize();
    }
  };

  const handleMaximize = async () => {
    if (onMaximize) {
      onMaximize();
    }
  };

  const handleClose = async () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="title-bar" style={{ userSelect: 'none', background: '#ffffff' }}>
      <div className="title-bar-left" style={{ width: '120px' }}></div>
      
      <div className="title-bar-center" style={{ cursor: 'default', flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
        <span className="app-title" style={{ fontWeight: 600 }}>{title}</span>
        {isPremium && (
          <span style={{ 
            backgroundColor: '#000', 
            color: '#fff', 
            fontSize: '10px', 
            fontWeight: 'bold', 
            padding: '2px 6px', 
            borderRadius: '4px',
            letterSpacing: '0.5px'
          }}>
            PRO
          </span>
        )}
      </div>

      {userEmail && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', paddingRight: '20px' }}>
          <span style={{ color: '#888', fontWeight: 500 }}>{userEmail}</span>
          <button 
            onClick={onLogout}
            style={{ 
              background: 'none', border: 'none', color: '#0078d4', cursor: 'pointer', 
              fontSize: '11px', fontWeight: 600, padding: 0 
            }}
          >
            Sign Out
          </button>
        </div>
      )}

      <div className="title-bar-controls" style={{ width: '120px', display: 'flex', justifyContent: 'flex-end', marginRight: '-10px' }}>
        <button onClick={handleMinimize} className="control-btn min-btn" aria-label="Minimize">
          <Minus size={12} />
        </button>
        <button onClick={handleMaximize} className="control-btn max-btn" aria-label="Maximize">
          <Square size={10} />
        </button>
        <button onClick={handleClose} className="control-btn close-btn" aria-label="Close">
          <X size={14} />
        </button>
      </div>
      
      <style>{`
        .title-bar {
          height: 38px;
          background: #ffffff;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          padding: 0 10px;
          user-select: none;
        }
        
        .app-title {
          font-size: 13px;
          font-family: var(--font-sans);
          color: #333333;
        }
        
        .title-bar-controls {
          display: flex;
          align-items: center;
          height: 100%;
        }
        
        .control-btn {
          width: 46px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: #555555;
          cursor: pointer;
          transition: background-color 0.1s, color 0.1s;
          outline: none;
        }
        
        .control-btn:hover {
          background-color: #e5e5e5;
          color: #000000;
        }
        
        .close-btn:hover {
          background-color: #e81123 !important;
          color: #ffffff !important;
        }
      `}</style>
    </div>
  );
};
