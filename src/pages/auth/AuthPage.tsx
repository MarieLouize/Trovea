import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { m, AnimatePresence } from '@/lib/motion';
import { MessageSquare, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth.store';
import { useUIStore } from '@/lib/store/ui.store';
import styles from './AuthPage.module.css';

type AuthMode = 'idle' | 'pending' | 'sent';

export default function AuthPage() {
  const navigate = useNavigate();
  const { addToast } = useUIStore();
  const { signInWithOTP, verifyOTP, isLoading: authLoading } = useAuthStore();
  
  const [mode, setMode] = useState<AuthMode>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cardReady, setCardReady] = useState(false);

  // Simulate initial entry animation
  useEffect(() => {
    const timer = setTimeout(() => setCardReady(true), 400);
    return () => clearTimeout(timer);
  }, []);

  const handleSendOTP = async () => {
    if (!phone || submitting) return;
    
    // Basic phone validation (could be more robust for Nigerian formats)
    if (phone.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setSubmitting(true);
    setError(null);
    
    const { error: authError } = await signInWithOTP(phone);
    
    if (authError) {
      setError(authError);
      addToast(authError, 'error');
    } else {
      setMode('pending');
      addToast('OTP sent via WhatsApp/SMS', 'success');
    }
    setSubmitting(false);
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || submitting) return;

    setSubmitting(true);
    setError(null);
    
    const { error: verifyError } = await verifyOTP(phone, otpCode);
    
    if (verifyError) {
      setError('Invalid code — please try again');
      addToast('Invalid verification code', 'error');
    } else {
      setMode('sent');
      addToast('Successfully signed in', 'success');
      // Small delay to show success state before navigating
      setTimeout(() => navigate('/dashboard'), 1200);
    }
    setSubmitting(false);
  };

  const resetToIdle = () => {
    setMode('idle');
    setOtpCode('');
    setError(null);
  };

  return (
    <div className={styles.root}>
      <div className={styles.watermark} aria-hidden="true">TROVE'A</div>

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
                  Trove<span className={styles.logoApostrophe}>'</span>a
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
                      Sign in with your phone number via WhatsApp
                    </p>

                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel} htmlFor="phone-input">
                        Phone Number
                      </label>
                      <input
                        id="phone-input"
                        className={styles.emailInput}
                        type="tel"
                        placeholder="0801 234 5678"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                        autoFocus
                        autoComplete="tel"
                        disabled={submitting || authLoading}
                      />
                      {error && <p className={styles.errorText}>{error}</p>}
                    </div>

                    <button
                      className={styles.googleBtn}
                      onClick={handleSendOTP}
                      disabled={!phone || submitting || authLoading}
                      style={{ background: 'var(--color-fg)', color: 'var(--color-bg)' }}
                    >
                      {submitting ? (
                        <>
                          <span className={styles.spinner} style={{ borderColor: 'var(--color-bg)', borderTopColor: 'transparent' }} />
                          Sending Code…
                        </>
                      ) : (
                        <>
                          <MessageSquare size={16} style={{ marginRight: '8px' }} />
                          Get Login Code
                        </>
                      )}
                    </button>
                  </m.div>
                )}

                {mode === 'pending' && (
                  <m.div 
                    key="pending" 
                    className={styles.inboxSection}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <button className={styles.backBtn} onClick={resetToIdle}>
                      <ArrowLeft size={12} /> Back
                    </button>

                    <h2 className={styles.inboxHeading}>Enter Code</h2>
                    <p className={styles.tagline} style={{ marginBottom: '24px' }}>
                      We sent a 6-digit code to {phone}
                    </p>

                    <div className={styles.fieldGroup}>
                      <input
                        id="otp-input"
                        className={styles.emailInput}
                        type="text"
                        pattern="[0-9]*"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="000000"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                        onKeyDown={(e) => e.key === 'Enter' && handleVerifyOTP()}
                        autoFocus
                        style={{ textAlign: 'center', letterSpacing: '0.5em', fontSize: '20px' }}
                        disabled={submitting || authLoading}
                      />
                      {error && <p className={styles.errorText}>{error}</p>}
                    </div>

                    <button
                      className={styles.sendBtn}
                      onClick={handleVerifyOTP}
                      disabled={otpCode.length < 6 || submitting || authLoading}
                    >
                      {submitting ? (
                        <>
                          <span className={styles.spinner} />
                          Verifying…
                        </>
                      ) : (
                        'Verify & Sign In'
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
                      <CheckCircle size={32} color="var(--color-success)" />
                    </div>
                    <h2 className={styles.sentTitle}>Authenticated</h2>
                    <p className={styles.sentBody}>
                      Setting up your workspace...
                    </p>
                  </m.div>
                )}
              </AnimatePresence>

              <div className={styles.cardFooter}>
                <p className={styles.footerText}>
                  Secure login powered by Supabase<br />
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
