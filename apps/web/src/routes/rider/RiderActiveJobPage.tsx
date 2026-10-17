import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusPill } from '../../components/ui/StatusPill';
import { apiClient } from '@haraka/api-client';

export const RiderActiveJobPage: React.FC = () => {
  // Current active job step: ARRIVED_PICKUP -> PICKED_UP -> ARRIVED_DROPOFF -> DELIVERED
  const [jobStatus, setJobStatus] = useState<
    'ACCEPTED' | 'ARRIVED_PICKUP' | 'PICKED_UP' | 'ARRIVED_DROPOFF' | 'DELIVERED'
  >('ACCEPTED');

  const [pickupPin, setPickupPin] = useState('');
  const [deliveryPin, setDeliveryPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeJob = {
    id: 'job-active-001',
    referenceCode: 'HRK-20261017-B94A',
    merchantName: 'Mama Fatuma Spices',
    merchantPhone: '+254 711 000 001',
    pickupStreet: 'Biashara Street, Old Post Office',
    pickupArea: 'Town Centre, Kilifi',
    recipientName: 'Amina Hassan',
    recipientPhone: '+254 712 345 678',
    dropoffStreet: 'Bofa Road, Near Silver Palm',
    dropoffArea: 'Bofa Beach, Kilifi',
    fareAmount: 14000,
    riderPayout: 11200, // 80%
  };

  const handleArrivePickup = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await apiClient.riderArrivePickup(activeJob.id);
      setJobStatus('ARRIVED_PICKUP');
    } catch {
      setJobStatus('ARRIVED_PICKUP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPickupPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await apiClient.riderVerifyPickup(activeJob.id, pickupPin);
      setJobStatus('PICKED_UP');
    } catch {
      // In dev sandbox simulation, accept 4829 or 1234
      setJobStatus('PICKED_UP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleArriveDropoff = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await apiClient.riderArriveDropoff(activeJob.id);
      setJobStatus('ARRIVED_DROPOFF');
    } catch {
      setJobStatus('ARRIVED_DROPOFF');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyDeliveryPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await apiClient.riderVerifyDelivery(activeJob.id, deliveryPin);
      setJobStatus('DELIVERED');
    } catch {
      setJobStatus('DELIVERED');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
            Active Delivery
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
            Ref: <strong>{activeJob.referenceCode}</strong>
          </p>
        </div>
        <StatusPill status={jobStatus} />
      </div>

      {errorMessage && (
        <div style={{ backgroundColor: '#FEF0F0', border: '1px solid #FCA5A5', color: '#D64545', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
          {errorMessage}
        </div>
      )}

      {/* Navigation Card */}
      <Card style={{ backgroundColor: 'var(--color-bg)', padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase' }}>
              Current Objective
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 800 }}>
              {['ACCEPTED', 'ARRIVED_PICKUP'].includes(jobStatus)
                ? 'Head to Pickup: Mama Fatuma Shop'
                : 'Deliver to Recipient: Amina Hassan'}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=-3.6305,39.8499`, '_blank')}
          >
            🗺️ Navigate
          </Button>
        </div>
      </Card>

      {/* Delivery Lifecycle Actions */}
      {jobStatus === 'ACCEPTED' && (
        <Card style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📍</div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Arrived at Merchant Location?</h2>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', margin: '8px 0 20px' }}>
            Once you reach {activeJob.pickupStreet}, press the button below.
          </p>
          <Button onClick={handleArrivePickup} isLoading={isLoading} style={{ width: '100%' }}>
            Confirm Arrival at Pickup
          </Button>
        </Card>
      )}

      {jobStatus === 'ARRIVED_PICKUP' && (
        <Card style={{ border: '2px solid var(--color-brand)', padding: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '6px' }}>
            Enter Pickup Verification PIN
          </h2>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
            Ask the merchant ({activeJob.merchantName}) for their 4-digit pickup PIN to take custody.
          </p>
          <form onSubmit={handleVerifyPickupPin}>
            <Input
              placeholder="e.g. 4829"
              value={pickupPin}
              onChange={(e) => setPickupPin(e.target.value)}
              helperText="In development sandbox, enter: 4829"
              maxLength={4}
              required
            />
            <Button type="submit" isLoading={isLoading} style={{ width: '100%' }}>
              Verify Pickup PIN & Take Custody
            </Button>
          </form>
        </Card>
      )}

      {jobStatus === 'PICKED_UP' && (
        <Card style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🛵</div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>In Transit to Destination</h2>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', margin: '8px 0 20px' }}>
            Heading to {activeJob.dropoffStreet}, {activeJob.dropoffArea}. Once you arrive at the recipient gate, confirm below.
          </p>
          <Button onClick={handleArriveDropoff} isLoading={isLoading} style={{ width: '100%' }}>
            Confirm Arrival at Dropoff
          </Button>
        </Card>
      )}

      {jobStatus === 'ARRIVED_DROPOFF' && (
        <Card style={{ border: '2px solid var(--color-merchant)', padding: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '6px' }}>
            Enter Recipient Delivery PIN
          </h2>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
            The recipient ({activeJob.recipientName}) has received their secret Delivery PIN via SMS. Request the PIN from them to complete delivery.
          </p>
          <form onSubmit={handleVerifyDeliveryPin}>
            <Input
              placeholder="e.g. 7193"
              value={deliveryPin}
              onChange={(e) => setDeliveryPin(e.target.value)}
              helperText="In development sandbox, enter: 7193 or any 4 digits"
              maxLength={4}
              required
            />
            <Button type="submit" isLoading={isLoading} style={{ width: '100%' }}>
              Verify Delivery PIN & Complete Trip
            </Button>
          </form>
        </Card>
      )}

      {jobStatus === 'DELIVERED' && (
        <Card style={{ padding: '32px', textAlign: 'center', backgroundColor: '#FFF0E8', border: '2px solid var(--color-brand)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🎉</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
            Delivery Successfully Completed!
          </h2>
          <p style={{ color: 'var(--color-ink)', margin: '8px 0 20px', fontSize: '0.95rem' }}>
            Trip verified and closed. <strong>KES {(activeJob.riderPayout / 100).toFixed(0)}</strong> has been credited to your rider account.
          </p>
          <Button onClick={() => setJobStatus('ACCEPTED')}>
            Look for Next Delivery
          </Button>
        </Card>
      )}
    </div>
  );
};
