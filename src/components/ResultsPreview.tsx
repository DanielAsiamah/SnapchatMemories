import React, { useState } from 'react';
import { 
  Lock
} from 'lucide-react';

interface ResultsPreviewProps {
  photos: any[];
  videos: any[];
  stories: any[];
  dateRange: string;
  totalSizeEstimate: string;
  isPremium: boolean;
  onBack: () => void;
  onUpgradeClick: () => void;
  onProceedToExport: () => void;
}

export const ResultsPreview: React.FC<ResultsPreviewProps> = ({
  photos,
  videos,
  stories,
  dateRange,
  totalSizeEstimate,
  isPremium,
  onBack,
  onUpgradeClick,
  onProceedToExport
}) => {
  const [filter, setFilter] = useState<'all' | 'photos' | 'videos'>('all');
  
  const totalCount = photos.length + videos.length + stories.length;
  const freeLimit = 50;
  const isLimitReached = !isPremium && totalCount > freeLimit;
  const limitCount = isPremium ? totalCount : Math.min(totalCount, freeLimit);

  const allItems = [
    ...photos.map(p => ({ ...p, calculatedType: 'PHOTO' })),
    ...videos.map(v => ({ ...v, calculatedType: 'VIDEO' })),
    ...stories.map(s => ({ ...s, calculatedType: 'STORY' }))
  ].sort((a, b) => {
    const dateA = new Date(a["Date"] || a["date"] || 0).getTime();
    const dateB = new Date(b["Date"] || b["date"] || 0).getTime();
    return dateB - dateA;
  });

  const displayedItems = allItems.slice(0, 12);

  const getImageSource = (item: any) => {
    if (item.calculatedType === 'VIDEO') {
      return 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=150&auto=format&fit=crop';
    }
    return item["Download Link"] || item["Media Download Url"] || '';
  };

  const getFriendlyDate = (dateStr: string) => {
    if (!dateStr) return 'Unknown Date';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="setup-container animate-fade-in">
      <div className="setup-header-banner">
        <div className="setup-header-text">
          <h2>{totalCount.toLocaleString()} memories found</h2>
          <p>Scan complete. Review detected media statistics and details below.</p>
        </div>
        <span style={{ fontSize: '24px' }}>📊</span>
      </div>

      <div className="setup-body-panel preview-panel-body-layout">
        
        {/* Statistics Grid */}
        <div className="scan-summary-classic-row">
          <div className="classic-sum-item">
            <span>Photos:</span>
            <strong>{photos.length}</strong>
          </div>
          <div className="classic-sum-item">
            <span>Videos:</span>
            <strong>{videos.length}</strong>
          </div>
          <div className="classic-sum-item">
            <span>Size:</span>
            <strong>{totalSizeEstimate}</strong>
          </div>
          <div className="classic-sum-item full-width-item">
            <span>Date coverage:</span>
            <strong>{dateRange}</strong>
          </div>
        </div>

        {/* Thumbnail Preview Area */}
        <div className="preview-columns-classic">
          <div className="preview-list-column">
            <div className="classic-preview-header">
              <span>Preview (First 12 items)</span>
              <div className="classic-filter-group">
                <button 
                  onClick={() => setFilter('all')} 
                  className={`btn-setup filter-btn-classic ${filter === 'all' ? 'active' : ''}`}
                >
                  All
                </button>
                <button 
                  onClick={() => setFilter('photos')} 
                  className={`btn-setup filter-btn-classic ${filter === 'photos' ? 'active' : ''}`}
                >
                  Photos
                </button>
                <button 
                  onClick={() => setFilter('videos')} 
                  className={`btn-setup filter-btn-classic ${filter === 'videos' ? 'active' : ''}`}
                >
                  Videos
                </button>
              </div>
            </div>

            <div className="classic-photo-grid">
              {displayedItems
                .filter(item => {
                  if (filter === 'photos') return item.calculatedType === 'PHOTO';
                  if (filter === 'videos') return item.calculatedType === 'VIDEO';
                  return true;
                })
                .map((item, idx) => (
                  <div key={idx} className="classic-grid-item">
                    <img 
                      src={getImageSource(item)} 
                      alt="Thumbnail" 
                    />
                    <div className="classic-grid-item-meta">
                      <span>{getFriendlyDate(item["Date"] || item["date"])}</span>
                      <span className="type-label-classic">{item.calculatedType === 'VIDEO' ? 'VIDEO' : 'IMAGE'}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Limit panel or prompt */}
          <div className="preview-action-column">
            {isLimitReached ? (
              <div className="saas-lock-alert-card">
                <div className="alert-header-saas">
                  <Lock size={18} />
                  <span>Free Limit Reached!</span>
                </div>
                <p>
                  We found <strong>{totalCount.toLocaleString()}</strong> amazing memories! However, free accounts are limited to exporting 50 items.
                </p>
                <button onClick={onUpgradeClick} className="btn-setup main-action-btn w-full mt-4">
                  Unlock Pro
                </button>
                <p style={{ fontSize: '11px', textAlign: 'center', marginTop: '12px', color: '#666' }}>
                  Or click Next to export your first 50.
                </p>
              </div>
            ) : (
              <div className="saas-ready-alert-card">
                <p>
                  You are ready to write <strong>{limitCount}</strong> memories to your computer.
                </p>
                {!isPremium && (
                  <p className="free-limit-disclaimer">
                    Free mode exports first 50 memories only.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      <div className="setup-footer-bar">
        <button onClick={onBack} className="btn-setup btn-secondary-outline">Back</button>
        <button 
          onClick={onProceedToExport} 
          className="btn-setup" 
          disabled={totalCount === 0}
        >
          Next
        </button>
        <button className="btn-setup">Cancel</button>
      </div>

      <style>{`
        .preview-panel-body-layout {
          display: flex;
          flex-direction: column;
          gap: 16px;
          text-align: left;
        }

        .scan-summary-classic-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          background-color: #ffffff;
          border: 1px solid var(--border-color);
          padding: 8px 12px;
        }

        .classic-sum-item {
          display: flex;
          flex-direction: column;
          font-size: 11.5px;
        }

        .classic-sum-item span {
          color: var(--text-secondary);
        }

        .full-width-item {
          grid-column: span 3;
          border-top: 1px solid #f0f0f0;
          padding-top: 4px;
          margin-top: 4px;
        }

        .preview-columns-classic {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 12px;
          flex-grow: 1;
        }

        .preview-list-column {
          display: flex;
          flex-direction: column;
          background-color: #ffffff;
          border: 1px solid var(--border-color);
          padding: 10px;
        }

        .classic-preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .classic-filter-group {
          display: flex;
          gap: 2px;
        }

        .filter-btn-classic {
          min-width: 48px;
          height: 18px;
          font-size: 10px;
          padding: 0 4px;
        }

        .filter-btn-classic.active {
          background-color: #e5f1fb;
          border-color: #0078d7;
        }

        .classic-photo-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          max-height: 160px;
          overflow-y: auto;
        }

        .classic-grid-item {
          display: flex;
          gap: 6px;
          border: 1px solid #f0f0f0;
          padding: 4px;
        }

        .classic-grid-item img {
          width: 36px;
          height: 36px;
          object-fit: cover;
        }

        .classic-grid-item-meta {
          display: flex;
          flex-direction: column;
          font-size: 10px;
          justify-content: center;
        }

        .type-label-classic {
          font-weight: 600;
          color: var(--text-secondary);
        }

        /* Action column */
        .preview-action-column {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .saas-lock-alert-card {
          background-color: #fcf9e8;
          border: 1px solid #f2e399;
          padding: 16px;
          border-radius: 12px;
          font-size: 13.5px;
          color: #5c5322;
        }

        .alert-header-saas {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 800;
          font-size: 15px;
          color: #947e11;
          margin-bottom: 8px;
        }

        .saas-ready-alert-card {
          background-color: #f0fdf4;
          border: 1px solid #bbf7d0;
          padding: 16px;
          border-radius: 12px;
          font-size: 13px;
          color: #166534;
        }

        .free-limit-disclaimer {
          font-size: 12px;
          color: #15803d;
          margin-top: 8px;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};
