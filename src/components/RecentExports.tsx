import React, { useState, useEffect } from 'react';
import { X, History, FileCheck, RefreshCw } from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';

interface RecentExportsProps {
  userId: string;
  onClose: () => void;
}

interface ExportLog {
  id: string;
  timestamp: string;
  itemsCount: number;
  fileName: string;
  isPremiumUsed: boolean;
}

export const RecentExports: React.FC<RecentExportsProps> = ({ userId, onClose }) => {
  const [logs, setLogs] = useState<ExportLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!userId) return;
      try {
        const exportsRef = collection(db, 'users', userId, 'exports');
        const q = query(exportsRef, orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const fetchedLogs: ExportLog[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          fetchedLogs.push({
            id: doc.id,
            timestamp: data.timestamp || new Date().toISOString(),
            itemsCount: data.itemsCount || 0,
            fileName: data.fileName || 'SnapMemories_Export.zip',
            isPremiumUsed: !!data.isPremiumUsed
          });
        });
        
        setLogs(fetchedLogs);
      } catch (err) {
        console.error("Error loading export history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [userId]);

  const getFriendlyTime = (timeStr: string) => {
    try {
      const d = new Date(timeStr);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeStr;
    }
  };

  return (
    <div className="overlay-backdrop animate-fade-in">
      <div className="overlay-window">
        <div className="overlay-header">
          <h3>Recent Exports Log</h3>
          <button onClick={onClose} className="close-overlay-btn"><X size={16} /></button>
        </div>

        <div className="overlay-body">
          {loading ? (
            <div className="history-loader">
              <RefreshCw size={24} className="spinner text-yellow" />
              <span>Fetching logs from Firestore...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="empty-history">
              <History size={36} className="text-muted" />
              <h4>No Exports Found</h4>
              <p>Your export records will appear here after you process your Snapchat ZIP archives.</p>
            </div>
          ) : (
            <div className="logs-list">
              {logs.map((log) => (
                <div key={log.id} className="log-item-card">
                  <div className="log-icon-col">
                    <FileCheck size={18} className="text-green" />
                  </div>
                  <div className="log-main-col">
                    <h4>{log.fileName}</h4>
                    <p className="log-date">{getFriendlyTime(log.timestamp)}</p>
                  </div>
                  <div className="log-badge-col">
                    <span className="log-count">{log.itemsCount} items</span>
                    {log.isPremiumUsed && <span className="premium-log-tag">Pro</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
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
          max-height: 400px;
          overflow-y: auto;
          text-align: left;
        }

        .history-loader {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 48px 0;
          font-size: 13px;
          color: var(--text-secondary);
        }

        .empty-history {
          text-align: center;
          padding: 48px 24px;
        }

        .empty-history h4 {
          font-size: 15px;
          margin: 12px 0 4px;
          color: var(--text-primary);
        }

        .empty-history p {
          font-size: 12.5px;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .logs-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .log-item-card {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-light);
          border-radius: 8px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .log-icon-col {
          display: flex;
          align-items: center;
        }

        .text-green {
          color: #10b981;
        }

        .log-main-col {
          flex-grow: 1;
        }

        .log-main-col h4 {
          font-size: 13px;
          color: var(--text-primary);
          margin-bottom: 2px;
          word-break: break-all;
        }

        .log-date {
          font-size: 11px;
          color: var(--text-muted);
        }

        .log-badge-col {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
        }

        .log-count {
          font-size: 11px;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .premium-log-tag {
          font-size: 8px;
          font-weight: 700;
          background: rgba(255, 252, 0, 0.15);
          color: var(--accent-yellow);
          padding: 1px 4px;
          border-radius: 3px;
          border: 1px solid rgba(255, 252, 0, 0.3);
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
