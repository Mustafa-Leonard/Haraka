import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusPill } from '../../components/ui/StatusPill';
import { apiClient } from '@haraka/api-client';
import type { JobDetailDto } from '@haraka/shared-types';
import { Bike, CheckCircle2, Flag, MapPin } from 'lucide-react';

export const RiderActiveJobPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeJob, setActiveJob] = useState<JobDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pickupPin, setPickupPin] = useState('');
  const [deliveryPin, setDeliveryPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchActiveJob = async () => {
    try {
      const job = await apiClient.getRiderActiveJob();
      setActiveJob(job);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load your active delivery.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveJob();
  }, []);

  const handleArrivePickup = async () => {
    if (!activeJob) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const updated = await apiClient.riderArrivePickup(activeJob.id);
      setActiveJob(updated);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to update arrival at pickup location');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyPickupPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJob) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const updated = await apiClient.riderVerifyPickup(activeJob.id, pickupPin);
      setActiveJob(updated);
      setPickupPin('');
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message ||
          'Incorrect pickup PIN. Please ask merchant for the 4-digit code.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArriveDropoff = async () => {
    if (!activeJob) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const updated = await apiClient.riderArriveDropoff(activeJob.id);
      setActiveJob(updated);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Failed to confirm arrival at delivery address',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyDeliveryPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJob) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const updated = await apiClient.riderVerifyDelivery(activeJob.id, deliveryPin);
      setActiveJob(updated);
      setDeliveryPin('');
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message ||
          'Incorrect delivery PIN. Please ask recipient for their SMS PIN.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-muted)' }}>
        Loading active delivery status…
      </div>
    );
  }

  if (!activeJob) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
          Active Delivery
        </h1>
        {loadError && (
          <p role="alert" style={{ color: 'var(--color-error)' }}>
            {loadError}
          </p>
        )}
        <Card style={{ padding: '48px 24px', textAlign: 'center' }}>
          <Bike
            size={40}
            aria-hidden="true"
            style={{ marginBottom: 12, color: 'var(--color-brand)' }}
          />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>No Active Delivery Job</h2>
          <p
            style={{
              color: 'var(--color-muted)',
              fontSize: '0.9rem',
              maxWidth: '340px',
              margin: '8px auto 20px',
            }}
          >
            You do not currently have an accepted delivery in progress. Check available orders to
            accept a dispatch.
          </p>
          <Button onClick={() => navigate('/rider/offers')}>View Available Orders</Button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: 600 }}>
            Active Delivery
          </span>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
            {activeJob.referenceCode}
          </h1>
        </div>
        <StatusPill status={activeJob.status} />
      </div>

      {errorMessage && (
        <div
          style={{
            backgroundColor: '#FEF0F0',
            border: '1px solid #FCA5A5',
            color: '#D64545',
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            fontWeight: 500,
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* Payout & Route Card */}
      <Card style={{ padding: '20px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--color-muted)',
                textTransform: 'uppercase',
              }}
            >
              Customer delivery price
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-brand)' }}>
              KES{' '}
              {(activeJob.quotedAmount / 100).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--color-muted)' }}>
            Payment: <strong>{activeJob.paymentMethod.replace(/_/g, ' ')}</strong>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid var(--color-border)',
            paddingTop: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted)' }}>
              PICKUP FROM
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{activeJob.pickup.street}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
              {activeJob.pickup.area}, {activeJob.pickup.town}
            </div>
            {activeJob.pickup.instructions && (
              <div style={{ fontSize: '0.8rem', color: '#B45309', marginTop: '2px' }}>
                Instructions: {activeJob.pickup.instructions}
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted)' }}>
              DELIVER TO
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
              {activeJob.recipientName} ({activeJob.recipientPhone})
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
              {activeJob.dropoff.street}, {activeJob.dropoff.town}
            </div>
          </div>
        </div>
      </Card>

      {/* Sequential Handover & Delivery Verification Steps */}
      {activeJob.status === 'ACCEPTED' && (
        <Card style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '8px' }}>
            Step 1: Ride to Pickup Location
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-muted)', marginBottom: '16px' }}>
            Head to {activeJob.pickup.street}. Confirm your arrival once at the merchant’s shop.
          </p>
          <Button isLoading={isSubmitting} onClick={handleArrivePickup}>
            <MapPin size={16} aria-hidden="true" /> I Have Arrived at Pickup
          </Button>
        </Card>
      )}

      {activeJob.status === 'ARRIVED_PICKUP' && (
        <Card style={{ padding: '24px', border: '2px solid var(--color-brand)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '8px' }}>
            Step 2: Collect Parcel & Verify PIN
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-muted)', marginBottom: '16px' }}>
            Ask the merchant for their 4-digit pickup verification PIN before collecting the
            package.
          </p>
          <form
            onSubmit={handleVerifyPickupPin}
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            <Input
              label="4-Digit Pickup PIN"
              placeholder="Enter 4-digit PIN"
              value={pickupPin}
              onChange={(e) => setPickupPin(e.target.value)}
              maxLength={6}
              required
            />
            <Button type="submit" isLoading={isSubmitting} style={{ marginTop: '8px' }}>
              <CheckCircle2 size={16} aria-hidden="true" /> Verify PIN & Confirm Collection
            </Button>
          </form>
        </Card>
      )}

      {activeJob.status === 'PICKED_UP' && (
        <Card style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '8px' }}>
            Step 3: Transport to Recipient
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-muted)', marginBottom: '16px' }}>
            Navigate towards {activeJob.dropoff.street}, {activeJob.dropoff.town}. When at
            destination, confirm arrival.
          </p>
          <Button isLoading={isSubmitting} onClick={handleArriveDropoff}>
            <Flag size={16} aria-hidden="true" /> I Have Arrived at Delivery Address
          </Button>
        </Card>
      )}

      {activeJob.status === 'ARRIVED_DROPOFF' && (
        <Card style={{ padding: '24px', border: '2px solid var(--color-brand)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '8px' }}>
            Step 4: Verify Delivery PIN
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-muted)', marginBottom: '16px' }}>
            Hand parcel to {activeJob.recipientName} and enter the 4-digit delivery PIN sent to
            their phone via SMS.
          </p>
          <form
            onSubmit={handleVerifyDeliveryPin}
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            <Input
              label="Recipient's Delivery PIN"
              placeholder="Enter 4-digit PIN"
              value={deliveryPin}
              onChange={(e) => setDeliveryPin(e.target.value)}
              maxLength={6}
              required
            />
            <Button type="submit" isLoading={isSubmitting} style={{ marginTop: '8px' }}>
              <CheckCircle2 size={16} aria-hidden="true" /> Verify & Complete Delivery
            </Button>
          </form>
        </Card>
      )}

      {activeJob.status === 'DELIVERED' && (
        <Card style={{ padding: '36px', textAlign: 'center' }}>
          <CheckCircle2
            size={40}
            aria-hidden="true"
            style={{ color: 'var(--color-brand)', marginBottom: '8px' }}
          />
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Delivery Completed!</h2>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', margin: '8px 0 20px' }}>
            The delivery is complete. Rider earnings are shown after the corresponding amount is
            posted to your ledger.
          </p>
          <Button onClick={() => navigate('/rider/offers')}>Back to Available Orders</Button>
        </Card>
      )}
    </div>
  );
};
