import { useState, useEffect, useRef } from 'react';
import { TitleBar } from './components/TitleBar';
import { AuthScreen } from './components/AuthScreen';
import { ImportWizard } from './components/ImportWizard';
import { Scanner } from './components/Scanner';
import { ResultsPreview } from './components/ResultsPreview';
import { PremiumScreen } from './components/PremiumScreen';
import { ExportScreen } from './components/ExportScreen';
import { db, auth } from './firebase';
import { doc, collection, getDocs, onSnapshot, setDoc } from 'firebase/firestore';
import JSZip from 'jszip';
import { SuccessScreen } from './components/SuccessScreen';

type Screen = 'auth' | 'premium' | 'payment' | 'import' | 'scanner' | 'preview' | 'export' | 'success';

function App() {
  const [userId, setUserId] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [screen, setScreen] = useState<Screen>('auth');
  const [authStep, setAuthStep] = useState<'welcome' | 'login' | 'register'>('welcome');
  
  // New Global Auth State
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [authRefreshTrigger, setAuthRefreshTrigger] = useState(0);

  // Loaded archives stats
  const [photos, setPhotos] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<string>('');
  const [totalSize, setTotalSize] = useState<string>('0 MB');
  const [rawZip, setRawZip] = useState<JSZip | undefined>(undefined);

  const [pendingAction, setPendingAction] = useState<'checkout' | null>(null);
  const [premiumMode, setPremiumMode] = useState<'features' | 'checkout'>('features');

  // Sync auth and license status
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      console.log("[Auth Guard] Auth state changed. User:", user?.email, "Verified:", user?.emailVerified);
      if (user && user.emailVerified) {
        setUserId(user.uid);
        setUserEmail(user.email || '');
        setIsLoggedIn(true);
        setIsGuest(false);
        setCheckingSubscription(true);
        
        let handledSuccess = false;
        if (window.location.search.includes('success=true')) {
          await setDoc(doc(db, 'users', user.uid), { isPremium: true }, { merge: true });
          window.history.replaceState({}, document.title, window.location.pathname);
          setScreen('success');
          handledSuccess = true;
        }

        let stripeExtensionPro = false;
        let webhookPro = false;

        const checkAndApplyPro = (hasPremium: boolean) => {
          console.log(`[Auth Guard] isPro calculated as: ${hasPremium}`);
          setIsPro(hasPremium);
          setIsPremium(hasPremium);
          setCheckingSubscription(false);
          setLoadingAuth(false);
          
          if (!handledSuccess) {
            setScreen(prev => {
              console.log(`[Auth Guard] Current route: ${prev}. User is logged in.`);
              if (prev === 'auth' || prev === 'premium' || prev === 'payment') {
                return hasPremium ? 'import' : 'premium';
              }
              return prev;
            });
          }
        };

        // 1. Listen to users/{userId} for custom webhook updates
        const userRef = doc(db, 'users', user.uid);
        const unsubscribeUser = onSnapshot(userRef, (userSnap) => {
          webhookPro = userSnap.exists() && userSnap.data()?.isPremium === true;
          checkAndApplyPro(stripeExtensionPro || webhookPro);
        });

        // 2. Listen to Firestore Stripe Extension subscriptions & one-time payments
        const subsRef = collection(db, 'customers', user.uid, 'subscriptions');
        const unsubscribeSub = onSnapshot(subsRef, (snap) => {
          let hasPremium = false;
          snap.forEach((docSnap) => {
            const status = docSnap.data().status;
            console.log(`[Auth Guard] Found subscription status: ${status}`);
            if (status === 'active' || status === 'trialing') {
              hasPremium = true;
            }
          });
          
          if (!hasPremium) {
             // Fallback check for one-time payments
             const payRef = collection(db, 'customers', user.uid, 'payments');
             getDocs(payRef).then(paySnap => {
               let hasPay = false;
               paySnap.forEach(docSnap => {
                 if (docSnap.data().status === 'succeeded') hasPay = true;
               });
               stripeExtensionPro = hasPay;
               checkAndApplyPro(stripeExtensionPro || webhookPro);
             });
          } else {
            stripeExtensionPro = true;
            checkAndApplyPro(stripeExtensionPro || webhookPro);
          }
        });

        return () => {
          unsubscribeUser();
          unsubscribeSub();
        };
      } else {
        console.log("[Auth Guard] No verified user found. Resetting state.");
        setUserId('');
        setUserEmail('');
        setIsPremium(false);
        setIsLoggedIn(false);
        setIsPro(false);
        setCheckingSubscription(false);
        setLoadingAuth(false);
        
        setScreen(prev => {
          // If they were on a protected screen and are not a guest, kick them to auth
          if ((prev === 'import' || prev === 'scanner' || prev === 'preview' || prev === 'export' || prev === 'payment') && !isGuest) {
            return 'auth';
          }
          return prev;
        });
      }
    });

    return () => unsubscribe();
  }, [isGuest, authRefreshTrigger]);

  const handleGuestContinue = () => {
    setIsGuest(true);
    setScreen('import');
  };

  const handleRequireAuth = () => {
    setAuthStep('register');
    setScreen('auth');
  };

  const handleAuthenticated = async (uid: string, email: string, isNewUser?: boolean) => {
    console.log("[Auth Guard] Authenticated called from AuthScreen. Forcing state refresh...");
    setAuthRefreshTrigger(prev => prev + 1);
  };

  const handlePlanSelected = (premium: boolean) => {
    // This is called from the PremiumScreen
    if (premium) {
      setIsPremium(true);
      setScreen(photos.length > 0 ? 'preview' : 'import');
    } else {
      setScreen(photos.length > 0 ? 'preview' : 'import');
    }
  };

  const handlePaymentComplete = (premium: boolean) => {
    setIsPremium(premium);
    setScreen('import');
  };

  const handleImportComplete = (data: {
    fileName: string;
    fileSize: number;
    photos: any[];
    videos: any[];
    stories: any[];
    rawZip?: JSZip;
  }) => {
    setPhotos(data.photos);
    setVideos(data.videos);
    setStories(data.stories);
    setRawZip(data.rawZip);
    setScreen('scanner');
  };

  const handleScanComplete = (scannedData: {
    photos: any[];
    videos: any[];
    stories: any[];
    totalCount: number;
    dateRange: string;
    totalSizeEstimate: string;
  }) => {
    setDateRange(scannedData.dateRange);
    setTotalSize(scannedData.totalSizeEstimate);
    setScreen('preview');
  };

  const handleUpgradeClick = () => {
    setPremiumMode('features');
    setScreen('premium');
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out? Any unsaved exports will be cleared.")) {
      auth.signOut();
      setScreen('auth');
      setAuthStep('welcome');
      setPhotos([]);
      setVideos([]);
      setStories([]);
      setRawZip(undefined);
      setIsGuest(false);
    }
  };

  if (loadingAuth) {
    return (
      <div className="app-window" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-main)' }}>
        <div style={{ color: 'var(--text-main)', fontSize: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div className="spinner" style={{ width: '24px', height: '24px', border: '3px solid var(--accent-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <div>Checking session...</div>
        </div>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="app-window">
      {/* TitleBar controls */}
      <TitleBar 
        title={screen === 'auth' ? 'SnapVault Setup' : screen === 'premium' ? 'SnapVault Pricing' : 'SnapVault'} 
        isPremium={isPremium}
        userEmail={userEmail}
        onLogout={userEmail ? handleLogout : undefined}
        onClose={() => {
          if (confirm("Are you sure you want to exit SnapVault Setup?")) {
            handleLogout();
          }
        }} 
      />

      {/* Screen Router */}
      <div className="main-content-area" style={{ flexGrow: 1, position: 'relative', overflow: 'hidden' }}>
        {screen === 'auth' && (
          <AuthScreen 
            onAuthenticated={handleAuthenticated} 
            onGuestContinue={handleGuestContinue}
            onSignInClick={() => setAuthStep('login')}
            onProCheckout={() => setScreen('premium')}
            initialStep={authStep}
            isLoggedIn={isLoggedIn}
            isPro={isPro}
          />
        )}

        {screen === 'premium' && (
          <PremiumScreen 
            userId={userId}
            checkoutOnly={false}
            onRequireAuth={handleRequireAuth}
            onBack={() => setScreen('preview')}
            onPlanSelected={handlePlanSelected}
          />
        )}

        {screen === 'payment' && (
          <PremiumScreen 
            userId={userId}
            checkoutOnly={true}
            onBack={() => setScreen('premium')}
            onPlanSelected={handlePaymentComplete}
          />
        )}

        {screen === 'import' && (
          <ImportWizard 
            onBack={handleLogout}
            onImportComplete={handleImportComplete}
          />
        )}

        {screen === 'scanner' && (
          <Scanner 
            photos={photos}
            videos={videos}
            stories={stories}
            onCancel={() => setScreen('import')}
            onScanComplete={handleScanComplete}
          />
        )}

        {screen === 'preview' && (
          <ResultsPreview 
            photos={photos}
            videos={videos}
            stories={stories}
            dateRange={dateRange}
            totalSizeEstimate={totalSize}
            isPremium={isPremium}
            onBack={() => setScreen('import')}
            onUpgradeClick={handleUpgradeClick}
            onProceedToExport={() => setScreen('export')}
          />
        )}

        {screen === 'export' && (
          <ExportScreen 
            userId={userId}
            photos={photos}
            videos={videos}
            stories={stories}
            rawZip={rawZip}
            isPremium={isPremium}
            onBack={() => setScreen('preview')}
            onNavigateHome={() => setScreen('auth')}
            onUpgradeClick={handleUpgradeClick}
          />
        )}

        {screen === 'success' && (
          <SuccessScreen 
            onContinue={() => setScreen('import')}
          />
        )}
      </div>
    </div>
  );
}

export default App;
