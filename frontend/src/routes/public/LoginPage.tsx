import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../services/auth.store';
import { apiClient } from '@haraka/api-client';
import type { CustomerPortalRole } from '@haraka/shared-types';

type PageMode = 'LOGIN' | 'REGISTER' | 'FORGOT' | 'RESET_EMAIL_PASSWORD' | 'VERIFY_EMAIL';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuth } = useAuthStore();
  const queryMode = searchParams.get('mode');
  const [mode, setMode] = useState<PageMode>(
    queryMode === 'register'
      ? 'REGISTER'
      : queryMode === 'reset-password'
        ? 'RESET_EMAIL_PASSWORD'
        : queryMode === 'verify-email'
          ? 'VERIFY_EMAIL'
          : 'LOGIN',
  );
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<CustomerPortalRole>('MERCHANT');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const [resetMethod, setResetMethod] = useState<'phone' | 'email'>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const runAction = async (action: () => Promise<void>) => {
    setIsLoading(true);
    setError(null);
    setInfoMessage(null);
    try {
      await action();
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'The request could not be completed. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();
    return runAction(async () => {
      const result = await apiClient.loginWithPassword(identifier, password, selectedRole);
      if (result.mfaRequired) {
        navigate('/admin/login', {
          state: {
            challengeToken: result.challengeToken,
            setupRequired: result.setupRequired,
          },
        });
        return;
      }
      setAuth(result.user, result.accessToken);
      navigate(selectedRole === 'RIDER' ? '/rider' : '/merchant');
    });
  };

  const handleRegister = (event: React.FormEvent) => {
    event.preventDefault();
    return runAction(async () => {
      await apiClient.register({
        fullName,
        phone,
        role: selectedRole,
        password,
        confirmPassword,
      });
      const result = await apiClient.loginWithPassword(phone, password, selectedRole);
      if (result.mfaRequired) {
        throw new Error('Staff accounts must sign in through the operations portal.');
      }
      setAuth(result.user, result.accessToken);
      navigate(selectedRole === 'RIDER' ? '/rider' : '/merchant');
    });
  };

  const handlePhoneResetRequest = () =>
    runAction(async () => {
      const result = await apiClient.requestPhonePasswordReset(phone);
      setResetCodeSent(true);
      setInfoMessage(result.message);
    });

  const handlePhonePasswordReset = (event: React.FormEvent) => {
    event.preventDefault();
    return runAction(async () => {
      const result = await apiClient.resetPasswordWithPhone(phone, confirmationCode, password);
      setMode('LOGIN');
      setIdentifier(phone);
      setPassword('');
      setConfirmPassword('');
      setConfirmationCode('');
      setResetCodeSent(false);
      setInfoMessage(result.message);
    });
  };

  const handleEmailPasswordResetRequest = (event: React.FormEvent) => {
    event.preventDefault();
    return runAction(async () => {
      const result = await apiClient.requestEmailPasswordReset(email);
      setInfoMessage(result.message);
    });
  };

  const handleEmailPasswordReset = (event: React.FormEvent) => {
    event.preventDefault();
    return runAction(async () => {
      const token = searchParams.get('token');
      if (!token) throw new Error('This password reset link is invalid or expired.');
      const result = await apiClient.resetPasswordWithEmail(token, password);
      setMode('LOGIN');
      setPassword('');
      setInfoMessage(result.message);
    });
  };

  const handleEmailVerification = () =>
    runAction(async () => {
      const token = searchParams.get('token');
      if (!token) throw new Error('This email verification link is invalid or expired.');
      const result = await apiClient.verifyEmail(token);
      setMode('LOGIN');
      setInfoMessage(result.message);
    });

  const title = {
    LOGIN: 'Sign in to Haraka',
    REGISTER: 'Create your account',
    FORGOT: 'Recover your password',
    RESET_EMAIL_PASSWORD: 'Set a new password',
    VERIFY_EMAIL: 'Verify your email',
  }[mode];

  return (
    <div style={{ maxWidth: '440px', margin: '60px auto', padding: '0 20px' }}>
      <Card style={{ padding: '36px 28px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            aria-hidden="true"
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
            {title}
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginTop: '6px' }}>
            {mode === 'LOGIN' && 'Use your phone number and password.'}
            {mode === 'REGISTER' && 'Register with your phone number and password.'}
            {mode === 'FORGOT' && 'Reset access using your phone by SMS or your verified email.'}
            {mode === 'RESET_EMAIL_PASSWORD' && 'Choose a new password for your Haraka account.'}
            {mode === 'VERIFY_EMAIL' &&
              'Confirm that you can access the email address on your account.'}
          </p>
        </div>

        {error && (
          <div role="alert" style={messageStyle('error')}>
            {error}
          </div>
        )}
        {infoMessage && (
          <div role="status" style={messageStyle('info')}>
            {infoMessage}
          </div>
        )}

        {mode === 'LOGIN' && (
          <form onSubmit={handleLogin} style={formStyle}>
            <label htmlFor="login-role" style={fieldLabelStyle}>
              Sign in as
            </label>
            <select
              id="login-role"
              value={selectedRole}
              onChange={(event) =>
                setSelectedRole(event.target.value === 'RIDER' ? 'RIDER' : 'MERCHANT')
              }
              style={selectStyle}
              required
            >
              <option value="MERCHANT">Merchant</option>
              <option value="RIDER">Rider</option>
            </select>
            <Input
              label="Phone number"
              placeholder="+254 7XX XXX XXX"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              autoComplete="tel"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
            <Button type="submit" isLoading={isLoading} style={{ marginTop: '8px' }}>
              Sign In
            </Button>
            <button
              type="button"
              onClick={() => {
                setMode('FORGOT');
                setResetCodeSent(false);
              }}
              style={linkButtonStyle}
            >
              Forgot password?
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('REGISTER');
                setError(null);
                setInfoMessage(null);
              }}
              style={linkButtonStyle}
            >
              Create an account
            </button>
          </form>
        )}

        {mode === 'REGISTER' && (
          <form onSubmit={handleRegister} style={formStyle}>
            <label htmlFor="register-role" style={fieldLabelStyle}>
              Create account as
            </label>
            <select
              id="register-role"
              value={selectedRole}
              onChange={(event) =>
                setSelectedRole(event.target.value === 'RIDER' ? 'RIDER' : 'MERCHANT')
              }
              style={selectStyle}
              required
            >
              <option value="MERCHANT">Merchant</option>
              <option value="RIDER">Rider</option>
            </select>
            <Input
              label="Full name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              autoComplete="name"
              minLength={2}
              maxLength={100}
              required
            />
            <Input
              label="Kenyan mobile number"
              placeholder="07XX XXX XXX or +254 7XX XXX XXX"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              autoComplete="tel"
              required
            />
            <Input
              label="Password (at least 8 characters)"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
            />
            <Input
              label="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
            />
            <Button type="submit" isLoading={isLoading} style={{ marginTop: '8px' }}>
              Create Account
            </Button>
            <button type="button" onClick={() => setMode('LOGIN')} style={linkButtonStyle}>
              Already registered? Sign in
            </button>
          </form>
        )}

        {mode === 'FORGOT' && (
          <div style={formStyle}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
              <Button
                type="button"
                variant={resetMethod === 'phone' ? 'primary' : 'outline'}
                onClick={() => {
                  setResetMethod('phone');
                  setResetCodeSent(false);
                }}
              >
                Phone SMS
              </Button>
              <Button
                type="button"
                variant={resetMethod === 'email' ? 'primary' : 'outline'}
                onClick={() => setResetMethod('email')}
              >
                Email link
              </Button>
            </div>
            {resetMethod === 'phone' &&
              (resetCodeSent ? (
                <form onSubmit={handlePhonePasswordReset} style={formStyle}>
                  <Input
                    label="Kenyan mobile number"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    required
                  />
                  <Input
                    label="SMS code"
                    value={confirmationCode}
                    onChange={(event) => setConfirmationCode(event.target.value)}
                    inputMode="numeric"
                    maxLength={6}
                    required
                  />
                  <Input
                    label="New password (at least 8 characters)"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={8}
                    maxLength={128}
                    required
                  />
                  <Button type="submit" isLoading={isLoading}>
                    Reset Password
                  </Button>
                  <button type="button" onClick={handlePhoneResetRequest} style={linkButtonStyle}>
                    Resend code
                  </button>
                </form>
              ) : (
                <>
                  <Input
                    label="Kenyan mobile number"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    required
                  />
                  <Button type="button" isLoading={isLoading} onClick={handlePhoneResetRequest}>
                    Send Password Reset Code
                  </Button>
                </>
              ))}
            {resetMethod === 'email' && (
              <form onSubmit={handleEmailPasswordResetRequest} style={formStyle}>
                <Input
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
                <Button type="submit" isLoading={isLoading}>
                  Send Reset Link
                </Button>
              </form>
            )}
            <button
              type="button"
              onClick={() => {
                setMode('LOGIN');
                setResetCodeSent(false);
              }}
              style={linkButtonStyle}
            >
              Return to sign in
            </button>
          </div>
        )}

        {mode === 'RESET_EMAIL_PASSWORD' && (
          <form onSubmit={handleEmailPasswordReset} style={formStyle}>
            <Input
              label="New password (at least 8 characters)"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
            />
            <Button type="submit" isLoading={isLoading}>
              Reset Password
            </Button>
          </form>
        )}

        {mode === 'VERIFY_EMAIL' && (
          <div style={formStyle}>
            <Button type="button" isLoading={isLoading} onClick={handleEmailVerification}>
              Verify Email Address
            </Button>
          </div>
        )}

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <a
            href="/admin/login"
            style={{ fontSize: '0.8rem', color: 'var(--color-muted)', textDecoration: 'none' }}
          >
            Authorized operations staff? <strong>Admin sign-in</strong>
          </a>
        </div>
      </Card>
    </div>
  );
};

const formStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column' };
const fieldLabelStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  fontWeight: 600,
  color: 'var(--color-ink)',
  marginBottom: '6px',
};
const selectStyle: React.CSSProperties = {
  minHeight: '44px',
  padding: '0 14px',
  marginBottom: '14px',
  fontSize: '1rem',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--color-input-bg)',
  color: 'var(--color-ink)',
  border: '1px solid var(--color-input-border)',
};
const linkButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--color-muted)',
  fontSize: '0.85rem',
  cursor: 'pointer',
  marginTop: '14px',
  textDecoration: 'underline',
};
const messageStyle = (type: 'error' | 'info'): React.CSSProperties => ({
  backgroundColor: type === 'error' ? '#FEF0F0' : '#FFF0E8',
  border: `1px solid ${type === 'error' ? '#FCA5A5' : '#FFD4BE'}`,
  color: type === 'error' ? '#D64545' : 'var(--color-brand)',
  padding: '12px',
  borderRadius: 'var(--radius-md)',
  fontSize: '0.85rem',
  marginBottom: '18px',
  fontWeight: 500,
});
