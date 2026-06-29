import React, { useEffect } from 'react';
import { CheckCircle } from 'lucide-react';

interface SuccessScreenProps {
  onContinue: () => void;
}

export const SuccessScreen: React.FC<SuccessScreenProps> = ({ onContinue }) => {
  useEffect(() => {
    // Optional: trigger confetti or a sound effect here in the future
  }, []);

  return (
    <div className="tb-auth-container animate-fade-in" style={{ justifyContent: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="tb-centered-card" style={{ maxWidth: '450px', textAlign: 'center', padding: '48px 32px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <CheckCircle size={64} color="#B7410E" strokeWidth={1.5} />
        </div>
        
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#222', marginBottom: '16px' }}>
          Payment Successful!
        </h2>
        
        <p style={{ fontSize: '15px', color: '#555', lineHeight: '1.6', marginBottom: '32px' }}>
          Thank you so much for your purchase! 
          <br /><br />
          <strong>SnapVault Pro</strong> has been permanently unlocked on your account. You can now download unlimited memories and preserve all original dates and metadata.
        </p>

        <button 
          onClick={onContinue} 
          className="btn-setup plan-btn" 
          style={{ width: '100%', padding: '14px', fontSize: '16px', fontWeight: '600' }}
        >
          Start Uploading Your Memories
        </button>

      </div>
    </div>
  );
};
