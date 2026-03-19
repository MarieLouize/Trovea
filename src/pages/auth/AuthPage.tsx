import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { m, AnimatePresence } from '@/lib/motion';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { useGuideStore } from '@/lib/store/guide.store';
import { useUIStore } from '@/lib/store/ui.store';
import GuideMarker from '@/components/primitives/GuideMarker/GuideMarker';
import styles from './AuthPage.module.css';

type AuthMode = 'idle' | 'inbox' | 'sent';
type LoadingMethod = 'google' | 'magic-link' | null;

const PAGE_GUIDES = ['auth-google', 'auth-magic-link', 'auth-sent-state'];

export default function AuthPage() {
  const navigate = useNavigate();
  const { addToast } = useUIStore();
  const { allComplete } = useGuideStore();
  const [mode, setMode] = useState<AuthMode>('idle');
  const [loading, setLoading] = useState<LoadingMethod>(null);
  const [email, setEmail] = useState('');
  const [cardReady, setCardReady] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);

  // Simulate session check on mount
  useEffect(() => {
    const timer = setTimeout(() => setCardReady(true), 800);
    return () => clearTimeout(timer);
  }, []);

  // Show completion message when all guides are done
  useEffect(() => {
    if (allComplete(PAGE_GUIDES)) {
      setShowCompletion(true);
      const timer = setTimeout(() => setShowCompletion(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [allComplete(PAGE_GUIDES)]);

  const handleGoogle = async () => {
    if (loading) return;
    setLoading('google');
    
    try {
      // Simulate async
      await new Promise((resolve) => setTimeout(resolve, 1400));
      addToast('Successfully signed in with Google', 'success');
      navigate('/onboarding/select-role');
    } catch (error) {
      addToast('Failed to sign in with Google', 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleMagicLink = async () => {
    if (!email.trim() || loading) return;
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      addToast('Please enter a valid email address', 'error');
      return;
    }

    setLoading('magic-link');
    
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      addToast('Magic link sent to your email', 'success');
      setMode('sent');
    } catch (error) {
      addToast('Failed to send magic link', 'error');
    } finally {
      setLoading(null);
    }
  };

  const resetToIdle = () => {
    setMode('idle');
    setEmail('');
  };

  return (
    <div className={styles.root}>
      {/* Page Completion Toast */}
      <AnimatePresence>
        {showCompletion && (
          <m.div
            className={styles.pageCompletion}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <span aria-hidden="true">✦</span> All auth features explored
          </m.div>
        )}
      </AnimatePresence>

      <div className={styles.watermark} aria-hidden="true">TROVE'A</div>

      <AnimatePresence mode="wait">
        {!cardReady ? (
          // Loading shimmer placeholder
          <m.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.skeletonCard}
            aria-label="Loading authentication"
          />
        ) : (
          <m.div
            key="card"
            className={styles.card}
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <div className={styles.cardInner}>
              {/* Header with Guide Marker */}
              <div className={styles.cardHeader}>
                <div className={styles.logo}>
                  Trove<span className={styles.logoApostrophe}>'</span>a
                </div>
                <p className={styles.tagline}>The Curator's OS</p>
              </div>

              {/* Animated state panels */}
              <AnimatePresence mode="wait">
                {mode === 'idle' && (
                  <m.div 
                    key="idle" 
                    className={styles.idleSection}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                  >
                    {/* Google Sign In with Guide Marker */}
                    <div className={styles.guideWrapper}>
                      <button
                        className={styles.googleBtn}
                        onClick={handleGoogle}
                        disabled={loading !== null}
                        aria-label="Continue with Google"
                      >
                        {loading === 'google' ? (
                          <>
                            <span className={`${styles.spinner} ${styles.spinnerDark}`} aria-hidden="true" />
                            Signing in…
                          </>
                        ) : (
                          <>
                            <svg className={styles.googleLogo} viewBox="0 0 24 24" aria-hidden="true">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Continue with Google
                          </>
                        )}
                      </button>
                      <GuideMarker
                        id="auth-google"
                        prompt="Sign in with your Google account to access Trove'a"
                        reward="Quick access to your merchant dashboard"
                        xp={10}
                      />
                    </div>

                    <div className={styles.authDivider} aria-hidden="true">
                      <div className={styles.authDividerLine} />
                      <span className={styles.authDividerText}>or</span>
                      <div className={styles.authDividerLine} />
                    </div>

                    {/* Magic link trigger with Guide Marker */}
                    <div className={styles.guideWrapper}>
                      <button
                        className={styles.magicLinkTrigger}
                        onClick={() => setMode('inbox')}
                        disabled={loading !== null}
                        aria-label="Continue with email magic link"
                      >
                        <Mail size={14} aria-hidden="true" />
                        Continue with Email
                      </button>
                      <GuideMarker
                        id="auth-magic-link"
                        prompt="Use email magic link for passwordless access"
                        reward="Secure sign-in without remembering passwords"
                        xp={10}
                      />
                    </div>
                  </m.div>
                )}

                {mode === 'inbox' && (
                  <m.div 
                    key="inbox" 
                    className={styles.inboxSection}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                  >
                    <button className={styles.backBtn} onClick={resetToIdle} aria-label="Go back">
                      <ArrowLeft size={12} aria-hidden="true" />
                      Back
                    </button>

                    <h2 className={styles.inboxHeading}>Enter your email</h2>

                    <div>
                      <label className={styles.fieldLabel} htmlFor="email-input">
                        Email Address
                      </label>
                      <input
                        id="email-input"
                        className={styles.emailInput}
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleMagicLink();
                        }}
                        autoFocus
                        autoComplete="email"
                        aria-required="true"
                        aria-label="Your email address"
                        disabled={loading !== null}
                      />
                    </div>

                    <button
                      className={styles.sendBtn}
                      onClick={handleMagicLink}
                      disabled={!email.trim() || loading !== null}
                      aria-label="Send magic link"
                    >
                      {loading === 'magic-link' ? (
                        <>
                          <span className={styles.spinner} aria-hidden="true" />
                          Sending…
                        </>
                      ) : (
                        'Send Magic Link'
                      )}
                    </button>
                  </m.div>
                )}

                {mode === 'sent' && (
                  <m.div 
                    key="sent" 
                    className={styles.sentState}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className={styles.sentIconWrap} aria-hidden="true">
                      <CheckCircle size={24} />
                    </div>
                    <h2 className={styles.sentTitle}>Check your inbox</h2>
                    <p className={styles.sentBody}>
                      We sent a sign-in link to{' '}
                      <span className={styles.sentEmail}>{email}</span>.
                      <br />
                      It expires in 10 minutes.
                    </p>
                    <button className={styles.sentBackBtn} onClick={resetToIdle} aria-label="Use a different email">
                      <ArrowLeft size={12} aria-hidden="true" />
                      Use a different email
                    </button>

                    {/* Guide marker for sent state */}
                    <div className={styles.guideWrapper}>
                      <GuideMarker
                        id="auth-sent-state"
                        prompt="Check your email and click the magic link to sign in"
                        reward="Passwordless access to your merchant account"
                        xp={15}
                      />
                    </div>
                  </m.div>
                )}
              </AnimatePresence>

              {/* Footer */}
              <div className={styles.cardFooter}>
                <p className={styles.footerText}>
                  Merchant accounts only<br />
                  By continuing you agree to Trove'a's Terms
                </p>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}