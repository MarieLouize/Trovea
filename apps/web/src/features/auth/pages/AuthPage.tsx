import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { m, AnimatePresence } from '@/lib/motion';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth.store';
import { useUIStore } from '@/lib/store/ui.store';
import styles from './AuthPage.module.css';

type AuthMode = 'idle' | 'email' | 'sent';

const GoogleIcon = () => (
  <svg className={styles.googleLogo} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

export default function AuthPage() {
  const navigate = useNavigate();
  const { addToast } = useUIStore();
  const { signInWithGoogle, signInWithMagicLink, isLoading: authLoading } = useAuthStore();
  
  const [mode, setMode] = useState<AuthMode>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cardReady, setCardReady] = useState(false);

  // Simulate initial entry animation
  useEffect(() => {
    const timer = setTimeout(() => setCardReady(true), 400);
    return () => clearTimeout(timer);
  }, []);

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    setError(null);
    const { error: authError } = await signInWithGoogle();
    if (authError) {
      setError(authError);
      addToast(authError, 'error');
      setSubmitting(false);
    }
    // Google redirect happens here, so usually we don't setSubmitting(false) 
    // unless there's an error.
  };

  const handleSendMagicLink = async () => {
    if (!email || submitting) return;
    
    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setSubmitting(true);
    setError(null);
    
    const { error: authError } = await signInWithMagicLink(email);
    
    if (authError) {
      setError(authError);
      addToast(authError, 'error');
    } else {
      setMode('sent');
      addToast('Magic link sent to your inbox', 'success');
    }
    setSubmitting(false);
  };

  const resetToIdle = () => {
    setMode('idle');
    setEmail('');
    setError(null);
  };

  return (
    <div className={styles.root}>
      <div className={styles.watermark} aria-hidden="true">TROVÉA</div>

      <AnimatePresence mode="wait">
        {!cardReady ? (
          <m.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.skeletonCard}
          />
        ) : (
          <m.div
            key="card"
            className={styles.card}
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <div className={styles.cardInner}>
              <div className={styles.cardHeader}>
                <div className={styles.logo}>
                  Trov<span className={styles.logoApostrophe}>é</span>a
                </div>
                <p className={styles.tagline}>The Curator's OS</p>
              </div>

              <AnimatePresence mode="wait">
                {mode === 'idle' && (
                  <m.div 
                    key="idle" 
                    className={styles.idleSection}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <h2 className={styles.inboxHeading}>Welcome back</h2>
                    <p className={styles.tagline} style={{ marginBottom: '24px' }}>
                      Sign in to your merchant dashboard
                    </p>

                    <button
                      className={styles.googleBtn}
                      onClick={handleGoogleSignIn}
                      disabled={submitting || authLoading}
                    >
                      <GoogleIcon />
                      Continue with Google
                    </button>

                    <div className={styles.authDivider}>
                      <div className={styles.authDividerLine} />
                      <span className={styles.authDividerText}>or</span>
                      <div className={styles.authDividerLine} />
                    </div>

                    <button
                      className={styles.magicLinkTrigger}
                      onClick={() => setMode('email')}
                      disabled={submitting || authLoading}
                    >
                      <Mail size={14} />
                      Continue with Email
                    </button>
                  </m.div>
                )}

                {mode === 'email' && (
                  <m.div 
                    key="email" 
                    className={styles.inboxSection}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <button className={styles.backBtn} onClick={resetToIdle}>
                      <ArrowLeft size={12} /> Back
                    </button>

                    <h2 className={styles.inboxHeading}>Magic Link</h2>
                    <p className={styles.tagline} style={{ marginBottom: '24px' }}>
                      We'll send a secure login link to your email
                    </p>

                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel} htmlFor="email-input">
                        Email Address
                      </label>
                      <input
                        id="email-input"
                        className={styles.emailInput}
                        type="email"
                        placeholder="curator@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMagicLink()}
                        autoFocus
                        autoComplete="email"
                        disabled={submitting || authLoading}
                      />
                      {error && <p className={styles.errorText}>{error}</p>}
                    </div>

                    <button
                      className={styles.sendBtn}
                      onClick={handleSendMagicLink}
                      disabled={!email || submitting || authLoading}
                    >
                      {submitting ? (
                        <>
                          <span className={styles.spinner} />
                          Sending Link…
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
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <div className={styles.sentIconWrap}>
                      <CheckCircle size={32} color="var(--color-fg)" />
                    </div>
                    <h2 className={styles.sentTitle}>Link Sent</h2>
                    <p className={styles.sentBody}>
                      Check your inbox at <span className={styles.sentEmail}>{email}</span> and click the link to sign in.
                    </p>
                    <button className={styles.sentBackBtn} onClick={resetToIdle}>
                      <ArrowLeft size={12} /> Back to Sign In
                    </button>
                  </m.div>
                )}
              </AnimatePresence>

              <div className={styles.cardFooter}>
                <p className={styles.footerText}>
                  Secure login powered by Supabase<br />
                  By continuing you agree to Trovéa's Terms
                </p>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
