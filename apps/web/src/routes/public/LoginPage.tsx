import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../services/auth.store';
import { apiClient } from '@haraka/api-client';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuth } = useAuthStore();

  const [phone, setPhone] = useState('+254711000001');
  const [code, setCode] = useState('123456');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.requestOtp(phone);
      setInfoMessage(res.message || 'OTP code sent via SMS.');
      setStep('OTP');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to request verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.verifyOtp(phone, code);
      setAuth(res.user, res.accessToken);

      // Redirect based on user role
      if (res.user.roles.includes('MERCHANT')) {
        navigate('/merchant');
      } else if (res.user.roles.includes('RIDER')) {
        navigate('/rider');
      } else if (res.user.roles.includes('ADMIN') || res.user.roles.includes('DISPATCHER')) {
        navigate('/admin');
      } else {
        navigate('/merchant');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired OTP code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (demoPhone: string) => {
    setPhone(demoPhone);
    setCode('123456');
    setStep('OTP');
  };

  return (
    <div style={{ maxWidth: '440px', margin: '60px auto', padding: '0 20px' }}>
      <Card style={{ padding: '36px 28px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: 'var(--color-brand)',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '24px',
              fontFamily: 'var(--font-heading)',
              transform: 'rotate(-8deg)',
              marginBottom: '12px',
            }}
          >
            H
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
            {step === 'PHONE' ? 'Sign In to Haraka' : 'Enter Verification Code'}
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginTop: '6px' }}>
            {step === 'PHONE'
              ? 'Enter your Kenyan mobile number (+254) to receive a secure OTP code'
              : `Code sent to ${phone}`}
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: '#FEF0F0',
              border: '1px solid #FCA5A5',
              color: '#D64545',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              marginBottom: '18px',
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}

        {infoMessage && !error && (
          <div
            style={{
              backgroundColor: '#FFF0E8',
              border: '1px solid #FFD4BE',
              color: 'var(--color-brand)',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              marginBottom: '18px',
              fontWeight: 500,
            }}
          >
            {infoMessage}
          </div>
        )}

        {step === 'PHONE' ? (
          <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column' }}>
            <Input
              label="Kenyan Mobile Number"
              placeholder="+254 712 345 678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              helperText="Format: 07XXXXXXXX or +254XXXXXXXXX"
              required
            />
            <Button type="submit" isLoading={isLoading} style={{ marginTop: '8px' }}>
              Send Verification Code
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column' }}>
            <Input
              label="6-Digit Verification Code"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              helperText="In development sandbox mode, use: 123456"
              maxLength={6}
              required
            />
            <Button type="submit" isLoading={isLoading} style={{ marginTop: '8px' }}>
              Verify & Sign In
            </Button>
            <button
              type="button"
              onClick={() => setStep('PHONE')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-muted)',
                fontSize: '0.85rem',
                cursor: 'pointer',
                marginTop: '14px',
                textDecoration: 'underline',
              }}
            >
              Change phone number
            </button>
          </form>
        )}

        {/* Demo Fast Logins for Pair Programming / Review */}
        <div style={{ marginTop: '32px', borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', marginBottom: '12px', textAlign: 'center' }}>
            🧪 Quick Demo Accounts (Dev Sandbox)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleQuickLogin('+254711000001')}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                textAlign: 'left',
              }}
            >
              <span>🏪 <strong>Mama Fatuma</strong> (Merchant)</span>
              <span style={{ color: 'var(--color-muted)' }}>+254 711 000 001</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('+254722000002')}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                textAlign: 'left',
              }}
            >
              <span>🛵 <strong>Juma Kazungu</strong> (Boda Rider)</span>
              <span style={{ color: 'var(--color-muted)' }}>+254 722 000 002</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('+254700000000')}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                textAlign: 'left',
              }}
            >
              <span>⚡ <strong>Operations Lead</strong> (Admin/Dispatch)</span>
              <span style={{ color: 'var(--color-muted)' }}>+254 700 000 000</span>
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};
