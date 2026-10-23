import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../services/auth.store';
import { apiClient } from '@haraka/api-client';
import { getStaffHomePath, STAFF_PORTAL_ROLES, type StaffPortalRole } from '@haraka/shared-types';

const staffRoleLabels: Record<StaffPortalRole, string> = {
  ADMIN: 'Administrator',
  SUPER_ADMIN: 'Super administrator',
  DISPATCHER: 'Dispatcher',
  SUPPORT: 'Customer support',
  FINANCE: 'Finance',
  VERIFICATION_OFFICER: 'Verification officer',
};

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<StaffPortalRole>('ADMIN');
  const [code, setCode] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [enrollment, setEnrollment] = useState<{
    secret: string;
    qrCodeDataUrl: string;
  } | null>(null);
  const [step, setStep] = useState<'PASSWORD' | 'SETUP' | 'TOTP'>('PASSWORD');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiClient.loginWithPassword(phone, password, selectedRole);
      if (!result.mfaRequired) {
        if (!result.user.roles.includes(selectedRole)) {
          apiClient.clearToken();
          setError('This portal is restricted to authorized staff accounts.');
          return;
        }

        setAuth(result.user, result.accessToken);
        const destination =
          (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ||
          getStaffHomePath(result.user.roles);
        navigate(destination, { replace: true });
        return;
      }

      setChallengeToken(result.challengeToken);
      if (result.setupRequired) {
        const setup = await apiClient.beginStaffMfaEnrollment(result.challengeToken);
        setEnrollment(setup);
        setStep('SETUP');
        setInfoMessage(
          'Scan the QR code in an authenticator app, then enter its current 6-digit code.',
        );
      } else {
        setStep('TOTP');
        setInfoMessage('Enter the current code from your authenticator app.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Phone number or password is incorrect.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.completeStaffMfa(challengeToken, code);
      if (!res.user.roles.includes(selectedRole)) {
        apiClient.clearToken();
        setError('Your account does not have the selected staff role.');
        return;
      }

      setAuth(res.user, res.accessToken);
      const destination =
        (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ||
        getStaffHomePath(res.user.roles);
      navigate(destination, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired authenticator code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0F172A', // Secure dark slate background
        padding: '20px',
      }}
    >
      <div style={{ maxWidth: '440px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
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
          <h1
            style={{
              fontSize: '1.6rem',
              fontWeight: 800,
              fontFamily: 'var(--font-heading)',
              color: '#F8FAFC',
            }}
          >
            Haraka Dispatch Operations
          </h1>
          <div
            style={{
              display: 'inline-block',
              marginTop: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '2px 10px',
              borderRadius: '999px',
              backgroundColor: 'rgba(255,106,31,0.2)',
              color: 'var(--color-brand)',
              letterSpacing: '0.05em',
            }}
          >
            RESTRICTED ACCESS PORTAL
          </div>
        </div>

        <Card
          style={{
            padding: '32px 28px',
            backgroundColor: '#1E293B',
            borderColor: '#334155',
            color: '#F1F5F9',
          }}
        >
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC' }}>
              {step === 'PASSWORD'
                ? 'Staff sign in'
                : step === 'SETUP'
                  ? 'Set Up Authenticator MFA'
                  : 'Verify Authenticator MFA'}
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '0.85rem', marginTop: '4px' }}>
              {step === 'PASSWORD'
                ? 'Sign in with your staff phone number and password.'
                : step === 'SETUP'
                  ? 'Authenticator MFA is mandatory for staff accounts.'
                  : 'Enter the current code from your registered authenticator.'}
            </p>
          </div>

          {error && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #EF4444',
                color: '#FCA5A5',
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
                backgroundColor: 'rgba(255, 106, 31, 0.15)',
                border: '1px solid var(--color-brand)',
                color: '#FED7AA',
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

          {step === 'PASSWORD' ? (
            <form
              onSubmit={handlePasswordLogin}
              style={{ display: 'flex', flexDirection: 'column' }}
            >
              <Input
                label="Staff phone number"
                placeholder="+254 7XX XXX XXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                required
              />
              <label
                htmlFor="staff-role"
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#CBD5E1',
                  marginBottom: '6px',
                }}
              >
                Staff role
              </label>
              <select
                id="staff-role"
                value={selectedRole}
                onChange={(event) => setSelectedRole(event.target.value as StaffPortalRole)}
                style={{
                  width: '100%',
                  padding: '12px',
                  marginBottom: '16px',
                  border: '1px solid #475569',
                  borderRadius: 'var(--radius-md)',
                  background: '#0F172A',
                  color: '#F8FAFC',
                  font: 'inherit',
                }}
              >
                {STAFF_PORTAL_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {staffRoleLabels[role]}
                  </option>
                ))}
              </select>
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <Button type="submit" isLoading={isLoading} style={{ marginTop: '8px' }}>
                Continue
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyTotp} style={{ display: 'flex', flexDirection: 'column' }}>
              {step === 'SETUP' && enrollment && (
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <img
                    src={enrollment.qrCodeDataUrl}
                    alt="Authenticator enrollment QR code"
                    style={{ width: '200px', height: '200px', background: '#fff', padding: '8px' }}
                  />
                  <p style={{ color: '#CBD5E1', fontSize: '0.8rem', marginTop: '12px' }}>
                    If scanning is unavailable, enter this secret manually:
                  </p>
                  <code style={{ color: '#FED7AA', wordBreak: 'break-all' }}>
                    {enrollment.secret}
                  </code>
                </div>
              )}
              <Input
                label="6-Digit Authenticator Code"
                placeholder="Enter current code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                maxLength={6}
                required
              />
              <Button type="submit" isLoading={isLoading} style={{ marginTop: '8px' }}>
                {step === 'SETUP' ? 'Enable MFA & Sign In' : 'Verify & Enter Operations Center'}
              </Button>
            </form>
          )}
        </Card>

        <p
          style={{
            textAlign: 'center',
            color: '#64748B',
            fontSize: '0.75rem',
            marginTop: '20px',
          }}
        >
          All access attempts are recorded in immutable security audit logs.
        </p>
      </div>
    </div>
  );
};
