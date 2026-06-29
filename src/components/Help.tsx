import React, { useState } from 'react';
import { X, Play, HelpCircle, Mail, MessageSquare, AlertCircle } from 'lucide-react';

interface HelpProps {
  onClose: () => void;
}

export const Help: React.FC<HelpProps> = ({ onClose }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [supportMsg, setSupportMsg] = useState('');
  const [sent, setSent] = useState(false);

  const faqs = [
    {
      q: "Where do I get my Snapchat data archive?",
      a: "Log in to Snapchat account portal in your browser, go to 'My Data', request data export selecting 'Memories', and wait for Snapchat to email you the ZIP file link."
    },
    {
      q: "How does filename restoration work?",
      a: "Snapchat exports name files as hash codes. SnapMemories parses your history metadata and restores original filenames based on creation dates (e.g. 2023-05-16 18-32-01.jpg)."
    },
    {
      q: "Why are my CDN links expiring?",
      a: "Snapchat's direct media download links inside your JSON history are temporary and expire after a few days. SnapMemories extracts the cached file references from your ZIP first to prevent losing them."
    },
    {
      q: "Are my photos uploaded to any servers?",
      a: "No! All processing, parsing, renaming, and organization happens client-side directly on your computer inside this client container. Your photos never leave your device."
    }
  ];

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setSupportMsg('');
    }, 3000);
  };

  return (
    <div className="overlay-backdrop animate-fade-in">
      <div className="overlay-window">
        <div className="overlay-header">
          <h3>Help & Support Portal</h3>
          <button onClick={onClose} className="close-overlay-btn"><X size={16} /></button>
        </div>

        <div className="overlay-body">
          {/* Video Tutorial Card */}
          <div className="video-card">
            <div className="video-thumbnail">
              <img 
                src="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=500&auto=format&fit=crop&q=60" 
                alt="Video thumbnail" 
              />
              <div className="video-overlay">
                <div className="play-button-ring">
                  <Play size={24} className="play-icon" />
                </div>
                <span>Watch Recovery Tutorial (3 mins)</span>
              </div>
            </div>
          </div>

          {/* FAQs section */}
          <div className="faq-section">
            <h4><HelpCircle size={14} className="sec-icon" /> Frequently Asked Questions</h4>
            <div className="faq-list">
              {faqs.map((faq, idx) => (
                <div key={idx} className="faq-item">
                  <button 
                    onClick={() => setActiveFaq(activeFaq === idx ? null : idx)} 
                    className="faq-question"
                  >
                    <span>{faq.q}</span>
                    <span className="faq-arrow">{activeFaq === idx ? '▼' : '▶'}</span>
                  </button>
                  {activeFaq === idx && (
                    <div className="faq-answer">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Support Ticket Section */}
          <div className="support-section">
            <h4><Mail size={14} className="sec-icon" /> Contact Customer Support</h4>
            {!sent ? (
              <form onSubmit={handleSupportSubmit} className="support-form">
                <div className="form-group">
                  <label htmlFor="support-text">How can we help you today?</label>
                  <textarea 
                    id="support-text"
                    value={supportMsg} 
                    onChange={(e) => setSupportMsg(e.target.value)} 
                    className="input-field textarea-field"
                    placeholder="Describe your issue or questions about snapchat recovery..."
                    rows={3}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-secondary btn-sm gap-2">
                  <MessageSquare size={12} />
                  <span>Send Ticket</span>
                </button>
              </form>
            ) : (
              <div className="support-sent-alert">
                <AlertCircle size={14} />
                <span>Support request submitted! We will respond within 24 hours.</span>
              </div>
            )}
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

        /* Video tutorial card */
        .video-card {
          margin-bottom: 24px;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid var(--border-light);
          position: relative;
        }

        .video-thumbnail {
          height: 120px;
          position: relative;
          cursor: pointer;
        }

        .video-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.6;
        }

        .video-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: rgba(0,0,0,0.3);
          font-size: 12.5px;
          font-weight: 600;
          color: #fff;
        }

        .play-button-ring {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255, 252, 0, 0.15);
          border: 1px solid var(--accent-yellow);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 15px rgba(255, 252, 0, 0.2);
          transition: all 0.2s ease;
        }

        .video-thumbnail:hover .play-button-ring {
          transform: scale(1.1);
          background-color: var(--accent-yellow);
        }

        .video-thumbnail:hover .play-icon {
          color: #000;
        }

        .play-icon {
          color: var(--accent-yellow);
        }

        /* FAQs styling */
        .faq-section {
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border-light);
          padding-bottom: 16px;
        }

        .faq-section h4, .support-section h4 {
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

        .faq-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .faq-item {
          border: 1px solid var(--border-light);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.01);
          overflow: hidden;
        }

        .faq-question {
          width: 100%;
          background: transparent;
          border: none;
          padding: 10px 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          text-align: left;
        }

        .faq-question:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .faq-arrow {
          font-size: 9px;
          color: var(--text-muted);
        }

        .faq-answer {
          padding: 10px 14px;
          border-top: 1px solid var(--border-light);
          background: rgba(0,0,0,0.1);
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        /* Support area */
        .support-section {
          padding-bottom: 0px;
        }

        .textarea-field {
          resize: none;
        }

        .support-sent-alert {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.2);
          color: #86efac;
          padding: 10px 14px;
          border-radius: 6px;
          font-size: 12.5px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
