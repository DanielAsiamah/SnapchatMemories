import React from 'react';
import { 
  FolderDown, 
  Settings as SettingsIcon, 
  HelpCircle, 
  Award, 
  LogOut, 
  History, 
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { auth } from '../firebase';

interface DashboardProps {
  userEmail: string;
  isPremium: boolean;
  onNavigate: (screen: 'import' | 'settings' | 'help' | 'premium' | 'history') => void;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  userEmail,
  isPremium,
  onNavigate,
  onLogout
}) => {
  const handleLogoutClick = async () => {
    try {
      await auth.signOut();
      onLogout();
    } catch (err) {
      console.error("Sign out failed", err);
    }
  };

  return (
    <div className="dashboard-container animate-fade-in">
      <div className="welcome-banner">
        <div className="welcome-text">
          <h1>Welcome back,</h1>
          <p className="user-email">{userEmail}</p>
        </div>
        <div className="badge-section">
          {isPremium ? (
            <div className="premium-badge animate-pulse">
              <Sparkles size={14} />
              <span>PREMIUM UNLOCKED</span>
            </div>
          ) : (
            <div className="free-badge" onClick={() => onNavigate('premium')}>
              <Award size={14} />
              <span>FREE VERSION (50 Limit)</span>
            </div>
          )}
          <button onClick={handleLogoutClick} className="logout-btn" title="Sign Out">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Main action card */}
        <div className="action-card main-action" onClick={() => onNavigate('import')}>
          <div className="card-icon-container">
            <FolderDown className="card-icon" size={32} />
          </div>
          <div className="card-content">
            <h2>Import Snapchat Data</h2>
            <p>Select your Snapchat ZIP archive or memories_history.json file to scan, preview, and recover your memories.</p>
          </div>
          <div className="card-footer">
            <span>Get Started</span>
            <span className="arrow">→</span>
          </div>
        </div>

        {/* Side action items */}
        <div className="sub-grid">
          <div className="action-card sub-action" onClick={() => onNavigate('history')}>
            <History size={20} className="sub-icon yellow" />
            <div className="sub-content">
              <h3>Recent Exports</h3>
              <p>View folder logs</p>
            </div>
          </div>

          <div className="action-card sub-action" onClick={() => onNavigate('settings')}>
            <SettingsIcon size={20} className="sub-icon blue" />
            <div className="sub-content">
              <h3>Settings</h3>
              <p>Path & UI options</p>
            </div>
          </div>

          <div className="action-card sub-action" onClick={() => onNavigate('help')}>
            <HelpCircle size={20} className="sub-icon green" />
            <div className="sub-content">
              <h3>Help & FAQ</h3>
              <p>Guides & Support</p>
            </div>
          </div>

          <div className="action-card sub-action" onClick={() => onNavigate('premium')}>
            <Award size={20} className="sub-icon premium" />
            <div className="sub-content">
              <h3>License</h3>
              <p>{isPremium ? 'Active License' : 'Upgrade Plan'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-footer-status">
        <CheckCircle2 size={12} className="text-green" />
        <span>All systems operational</span>
      </div>

      <style>{`
        .dashboard-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 32px;
          height: calc(100% - 38px);
          overflow-y: auto;
        }

        .welcome-banner {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 36px;
        }

        .welcome-text h1 {
          font-size: 28px;
          color: var(--text-primary);
          line-height: 1.2;
        }

        .user-email {
          font-size: 14px;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        .badge-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .premium-badge {
          background: linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(255, 252, 0, 0.3));
          border: 1px solid rgba(255, 252, 0, 0.4);
          color: var(--accent-yellow);
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 6px;
          letter-spacing: 0.05em;
        }

        .free-badge {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-light);
          color: var(--text-secondary);
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .free-badge:hover {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-primary);
          border-color: var(--border-hover);
        }

        .logout-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logout-btn:hover {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 24px;
          flex: 1;
        }

        .action-card {
          background: rgba(28, 36, 54, 0.35);
          border: 1px solid var(--border-light);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
        }

        .action-card:hover {
          background: rgba(28, 36, 54, 0.55);
          border-color: var(--border-hover);
          transform: translateY(-2px);
        }

        .main-action {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 32px;
          border-color: rgba(255, 252, 0, 0.1);
        }

        .main-action:hover {
          border-color: rgba(255, 252, 0, 0.35);
          box-shadow: 0 8px 30px rgba(255, 252, 0, 0.05);
        }

        .card-icon-container {
          background: rgba(255, 252, 0, 0.05);
          width: 64px;
          height: 64px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
          border: 1px solid rgba(255, 252, 0, 0.1);
        }

        .card-icon {
          color: var(--accent-yellow);
        }

        .card-content h2 {
          font-size: 22px;
          margin-bottom: 8px;
          color: var(--text-primary);
        }

        .card-content p {
          font-size: 13.5px;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .card-footer {
          margin-top: 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 700;
          font-size: 14px;
          color: var(--accent-yellow);
        }

        .arrow {
          transition: transform 0.2s ease;
        }

        .main-action:hover .arrow {
          transform: translateX(4px);
        }

        /* Subactions */
        .sub-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .sub-action {
          padding: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: flex-start;
        }

        .sub-icon {
          margin-bottom: 12px;
          padding: 8px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-light);
        }

        .sub-icon.yellow { color: var(--accent-yellow); }
        .sub-icon.blue { color: var(--accent-blue); }
        .sub-icon.green { color: #10b981; }
        .sub-icon.premium { color: #f59e0b; }

        .sub-content h3 {
          font-size: 14px;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .sub-content p {
          font-size: 11.5px;
          color: var(--text-muted);
        }

        .dashboard-footer-status {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 24px;
          font-size: 11px;
          color: var(--text-muted);
        }

        .text-green {
          color: #10b981;
        }
      `}</style>
    </div>
  );
};
