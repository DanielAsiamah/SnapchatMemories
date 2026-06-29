import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { RefreshCw, Check } from 'lucide-react';

interface AuthScreenProps {
  onAuthenticated: (userId: string, email: string, isNewUser?: boolean) => void;
  onGuestContinue?: () => void;
  onSignInClick?: () => void;
  onProCheckout?: () => void;
  initialStep?: 'welcome' | 'login' | 'register' | 'forgot' | 'verify';
  isLoggedIn?: boolean;
  isPro?: boolean;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ 
  onAuthenticated,
  onGuestContinue,
  onSignInClick,
  onProCheckout,
  initialStep = 'welcome',
  isLoggedIn = false,
  isPro = false
}) => {
  const [step, setStep] = useState<'welcome' | 'login' | 'register' | 'forgot' | 'verify'>(initialStep);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const getFriendlyError = (err: any, fallback: string) => {
    if (!err || !err.code) return fallback;
    switch (err.code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
        return 'Incorrect email or password.';
      case 'auth/user-not-found':
        return 'No account found with this email.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Your password must be at least 6 characters long.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later.';
      default:
        return fallback;
    }
  };
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    setStep(initialStep);
  }, [initialStep]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.emailVerified) {
        onAuthenticated(user.uid, user.email || '');
      }
    });
    return () => unsubscribe();
  }, [onAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      if (!userCredential.user.emailVerified) {
        setStep('verify');
        return;
      }
      
      onAuthenticated(userCredential.user.uid, userCredential.user.email || '', false);
    } catch (err: any) {
      setError(getFriendlyError(err, 'Login failed. Please check your details.'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        createdAt: new Date().toISOString(),
        isPremium: false
      });

      await sendEmailVerification(user);
      setStep('verify');
    } catch (err: any) {
      setError(getFriendlyError(err, 'Failed to create account.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setInfo('Password reset email sent.');
      setTimeout(() => setStep('login'), 3000);
    } catch (err: any) {
      setError(getFriendlyError(err, 'Failed to send reset email.'));
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Welcome Step
  if (step === 'welcome') {
    return (
      <div className="tb-auth-container tb-welcome-layout animate-fade-in">
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '12px' }}>Choose how you'd like to continue.</h2>
          <p style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>Select an option below to get started with SnapVault.</p>
        </div>

        <div className="auth-options-grid">
          
          {/* Guest Flow Option */}
          <div className="auth-option-card">
            <button onClick={() => onGuestContinue?.()} className="btn-setup btn-secondary-outline tb-wide-btn" style={{ marginBottom: '24px' }}>
              Continue as Guest
            </button>
            <div style={{ textAlign: 'left', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', flexGrow: 1 }}>
              <strong style={{ color: 'var(--text-main)', fontSize: '16px', display: 'block', marginBottom: '12px' }}>Free version</strong>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Check size={16} color="var(--text-muted)" />
                  <span>Export up to 50 memories</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Check size={16} color="var(--text-muted)" />
                  <span>Local processing</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Check size={16} color="var(--text-muted)" />
                  <span>No account required</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Returning / Pro Option */}
          <div className="auth-option-card" style={{ borderColor: 'rgba(255, 252, 0, 0.3)', background: 'linear-gradient(180deg, rgba(255, 252, 0, 0.04) 0%, rgba(0,0,0,0) 100%)' }}>
            <button 
              onClick={() => {
                if (isLoggedIn && isPro) {
                  onGuestContinue?.(); // Triggers route to main app in App.tsx
                } else if (isLoggedIn && !isPro) {
                  onProCheckout?.(); // Route to paywall
                } else {
                  setStep('login'); // Directly change local state to fix the back button bug
                }
              }} 
              className="btn-setup tb-wide-btn" 
              style={{ marginBottom: '24px' }}
            >
              {isLoggedIn ? (isPro ? "Continue" : "Continue to Pro checkout") : "Sign in to unlock unlimited"}
            </button>
            <div style={{ textAlign: 'left', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', flexGrow: 1 }}>
              <strong style={{ color: 'var(--text-main)', fontSize: '16px', display: 'block', marginBottom: '12px' }}>Pro version</strong>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Check size={16} color="var(--accent-primary)" />
                  <span><strong style={{ color: 'var(--accent-text-on-primary)', backgroundColor: 'var(--accent-primary)', padding: '2px 6px', borderRadius: '4px' }}>Unlimited</strong> memories downloaded</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Check size={16} color="var(--accent-primary)" />
                  <span>Preserve original dates & metadata</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Check size={16} color="var(--accent-primary)" />
                  <span>Restore your lifetime licence</span>
                </li>
              </ul>
            </div>
          </div>

        </div>
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div className="tb-auth-container animate-fade-in">
        <div className="tb-centered-card">
          <h3>Verify your email</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '15px', lineHeight: '1.5' }}>
            We've sent a verification link to <strong style={{ color: 'var(--text-main)' }}>{email || auth.currentUser?.email}</strong>. 
            Please click the link to activate your account.
          </p>
          
          {error && <div className="tb-alert error">{error}</div>}
          {info && <div className="tb-alert success">{info}</div>}
          
          <button 
            onClick={async () => {
              setLoading(true);
              setError('');
              setInfo('');
              try {
                await auth.currentUser?.reload();
                if (auth.currentUser?.emailVerified) {
                  onAuthenticated(auth.currentUser.uid, auth.currentUser.email || '', false);
                } else {
                  setError('Email is not verified yet. Please check your inbox.');
                }
              } catch (e) {
                setError('Failed to check status.');
              } finally {
                setLoading(false);
              }
            }} 
            className="btn-setup tb-wide-btn" 
            disabled={loading}
            style={{ marginBottom: '16px' }}
          >
            {loading ? <RefreshCw size={16} className="spinner" /> : "I've verified my email"}
          </button>

          <button 
            type="button"
            onClick={async () => {
              try {
                if (auth.currentUser) {
                  await sendEmailVerification(auth.currentUser);
                  setInfo('Verification email sent again!');
                }
              } catch (e: any) {
                if (e.code === 'auth/too-many-requests') {
                  setError('Please wait a minute before requesting another email.');
                } else {
                  setError('Failed to resend email.');
                }
              }
            }}
            className="tb-text-link-btn"
          >
            Resend Email
          </button>

          <div style={{ marginTop: '24px' }}>
            <button type="button" onClick={() => { auth.signOut(); setStep('welcome'); }} className="tb-text-link-btn">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Steps 2: Login, Register, Forgot Forms (TunnelBear Centered Layout)
  return (
    <div className="tb-auth-container animate-fade-in">
      <div className="tb-centered-card">

        <div style={{ width: '100%', textAlign: 'left', marginBottom: '8px' }}>
          <button type="button" onClick={() => setStep('welcome')} className="tb-text-link-btn" style={{ fontSize: '13px', color: '#888' }}>
            ← Back
          </button>
        </div>

        <h3>
          {step === 'login' && 'Sign in to continue'}
          {step === 'register' && 'Create a free account'}
          {step === 'forgot' && 'Reset your password'}
        </h3>

        {error && <div className="tb-alert error">{error}</div>}
        {info && <div className="tb-alert success">{info}</div>}

        <form onSubmit={
          step === 'login' ? handleLogin :
          step === 'register' ? handleRegister :
          handleResetPassword
        } className="tb-centered-form w-full">
          
          <div className="setup-form-group">
            <input 
              type="email" 
              className="setup-input tb-input"
              placeholder="Email Address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {step !== 'forgot' && (
            <div className="setup-form-group">
              <input 
                type="password" 
                className="setup-input tb-input"
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          )}

          {step === 'login' && (
            <div className="tb-form-extra-row">
              <label className="setup-checkbox-row">
                <input 
                  type="checkbox" 
                  checked={rememberMe} 
                  onChange={(e) => setRememberMe(e.target.checked)} 
                />
                <span>Remember me</span>
              </label>
              <button 
                type="button" 
                onClick={() => setStep('forgot')} 
                className="tb-text-link-btn"
              >
                Forgot password?
              </button>
            </div>
          )}

          <button type="submit" className="btn-setup tb-wide-btn mt-4" disabled={loading}>
            {loading ? (
              <RefreshCw size={12} className="spinner" />
            ) : (
              <span>
                {step === 'login' && 'Log in'}
                {step === 'register' && 'Create a free account'}
                {step === 'forgot' && 'Reset password'}
              </span>
            )}
          </button>
        </form>

        <div className="tb-form-footer-switch">
          {step === 'login' && (
            <button type="button" onClick={() => setStep('register')} className="tb-text-link-btn">
              Don't have an account? <strong className="tb-accent-text">Sign up</strong>
            </button>
          )}
          {step === 'register' && (
            <button type="button" onClick={() => setStep('login')} className="tb-text-link-btn">
              Already have an account? <strong className="tb-accent-text">Log in</strong>
            </button>
          )}
          {step === 'forgot' && (
            <button type="button" onClick={() => setStep('login')} className="tb-text-link-btn">
              Back to <strong className="tb-accent-text">Log in</strong>
            </button>
          )}
        </div>
      </div>

    </div>
  );
};
