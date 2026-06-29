import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, collection, addDoc, onSnapshot, setDoc, getDocs, getDoc } from 'firebase/firestore';
import { RefreshCw, Check } from 'lucide-react';

interface PremiumScreenProps {
  userId?: string;
  checkoutOnly?: boolean;
  onRequireAuth?: () => void;
  onBack: () => void;
  onPlanSelected: (premium: boolean) => void;
}

export const PremiumScreen: React.FC<PremiumScreenProps> = ({
  userId = '',
  checkoutOnly = false,
  onRequireAuth,
  onBack,
  onPlanSelected
}) => {
  const [checkoutMode, setCheckoutMode] = useState(checkoutOnly);
  const [loading, setLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState('');

  useEffect(() => {
    setCheckoutMode(checkoutOnly);
  }, [checkoutOnly]);

  // Securely listen for the official Stripe Extension to create an active subscription
  useEffect(() => {
    if (checkoutMode && userId) {
      console.log("Listening for Stripe extension payment/subscription confirmation...");
      const subsRef = collection(db, 'customers', userId, 'subscriptions');
      const unsub = onSnapshot(subsRef, (snap) => {
        snap.forEach((docSnap) => {
          const status = docSnap.data().status;
          if (status === 'active' || status === 'trialing') {
            console.log("Subscription confirmed via official extension!");
            setLoading(false);
            onPlanSelected(true);
          }
        });
      });
      
      // Keep checking payments just in case it's a one-time mode
      const paymentsRef = collection(db, 'customers', userId, 'payments');
      const unsubPayments = onSnapshot(paymentsRef, (snap) => {
        snap.forEach((docSnap) => {
          const status = docSnap.data().status;
          if (status === 'succeeded') {
            console.log("One-time payment confirmed via official extension!");
            setLoading(false);
            onPlanSelected(true);
          }
        });
      });
      // Listen to custom webhook updates in users collection!
      const userRef = doc(db, 'users', userId);
      const unsubUser = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists() && docSnap.data().isPremium === true) {
          onPlanSelected(true);
        }
      });

      return () => {
        unsub();
        unsubPayments();
        unsubUser();
      };
    }
  }, [userId, checkoutMode, onPlanSelected]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
  };

  if (checkoutMode) {
    return (
      <div className="tb-premium-container animate-fade-in">
        <div className="tb-premium-header">
          <h2>Complete Payment</h2>
          <p>Please complete your secure checkout in the browser window that just opened.</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1, flexDirection: 'column', gap: '20px' }}>
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '400px', lineHeight: '1.5' }}>
            We have redirected you to our secure Stripe checkout. Once you have finished paying, click the button below to verify your account and unlock Pro access.
          </p>
          
          <button 
            className="btn-setup" 
            style={{ opacity: 0.8 }}
            disabled={true}
          >
            <RefreshCw size={16} className="spinner" style={{ marginRight: '8px' }} /> 
            Waiting for payment confirmation...
          </button>

          <button
            onClick={async () => {
              setLoading(true);
              try {
                // Check subscriptions
                const subsRef = collection(db, 'customers', userId, 'subscriptions');
                const snap = await getDocs(subsRef);
                let isPro = false;
                snap.forEach(docSnap => {
                  const status = docSnap.data().status;
                  if (status === 'active' || status === 'trialing') isPro = true;
                });
                
                // Fallback for one-time payments
                const paymentsRef = collection(db, 'customers', userId, 'payments');
                const paySnap = await getDocs(paymentsRef);
                paySnap.forEach(docSnap => {
                  if (docSnap.data().status === 'succeeded') isPro = true;
                });
                
                // Check custom users document where the webhook writes!
                const userRef = doc(db, 'users', userId);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists() && userSnap.data().isPremium === true) {
                  isPro = true;
                }

                if (isPro) {
                  onPlanSelected(true);
                } else {
                  alert("Payment not active yet. Please wait a moment or try again.");
                }
              } catch (e) {
                console.error("Error refreshing status", e);
                alert("Failed to check status.");
              } finally {
                setLoading(false);
              }
            }}
            className="btn-setup btn-secondary-outline"
            style={{ marginTop: '10px' }}
          >
            Refresh Status
          </button>

          {checkoutUrl && (
            <button 
              onClick={(e) => {
                e.preventDefault();
                const a = document.createElement('a');
                a.href = checkoutUrl;
                a.target = '_blank';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }} 
              className="tb-text-link-btn" 
              style={{ marginTop: '15px' }}
            >
              Click here to open Stripe Checkout (if it didn't pop up)
            </button>
          )}

          <p style={{ marginTop: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
            Having trouble? Contact <a href="mailto:supr3ltd@gmail.com" style={{ color: 'var(--text-muted)' }}>supr3ltd@gmail.com</a>
          </p>
        </div>

        <div style={{ marginTop: '40px', display: 'flex', gap: '16px' }}>
          <button onClick={() => setCheckoutMode(false)} className="btn-setup btn-secondary-outline">Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="tb-premium-container animate-fade-in">
      <div className="tb-premium-header">
        <h2>Choose Your Plan</h2>
        <p>Free allows 50 memories. Upgrade to Pro for unlimited.</p>
      </div>

      <div className="tb-pricing-grid">
        
        {/* Free Card */}
        <div className="windows-plan-card">
          <h3 className="plan-title">Free</h3>
          <div className="plan-divider"></div>
          <div className="plan-price">£0</div>
          <ul className="plan-benefits">
            <li><Check size={16} /> Export up to 50 memories</li>
            <li><Check size={16} /> Basic support</li>
          </ul>
          <div style={{ flexGrow: 1 }}></div>
          <button onClick={() => onPlanSelected(false)} className="btn-setup btn-secondary-outline plan-btn">
            {userId ? "Continue on Free Plan" : "Use free version"}
          </button>
        </div>

        {/* Pro Card */}
        <div className="windows-plan-card pro-card">
          <h3 className="plan-title" style={{ color: 'var(--accent-primary)' }}>Pro</h3>
          <div className="plan-divider"></div>
          <div className="plan-price">
            £2.99<br/><span className="price-sub">one-time payment</span>
          </div>
          <ul className="plan-benefits">
            <li><Check size={16} /> Unlimited memories</li>
            <li><Check size={16} /> Keep metadata</li>
            <li><Check size={16} /> Organise by date</li>
            <li><Check size={16} /> Priority support</li>
          </ul>
            <button onClick={async () => {
              if (!userId) {
                if (onRequireAuth) onRequireAuth();
                return;
              }
              try {
                setCheckoutMode(true);
                
                // Directly open the Payment Link with the user ID attached!
                const paymentLink = `https://buy.stripe.com/6oU8wP77p5xl9xEa9McAo01?client_reference_id=${userId}`;
                setCheckoutUrl(paymentLink);
                
                // Bulletproof way to open external links in Electron:
                const a = document.createElement('a');
                a.href = paymentLink;
                a.target = '_blank';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

              } catch (error: any) {
                console.error("Failed to start checkout:", error);
                alert(`Checkout failed: ${error.message}`);
                setCheckoutMode(false);
              }
            }} className="btn-setup plan-btn">
              Unlock Pro
            </button>
          </div>
        </div>

      <div style={{ marginTop: '40px' }}>
        <button onClick={onBack} className="btn-setup btn-secondary-outline">← Back</button>
      </div>
    </div>
  );
};
