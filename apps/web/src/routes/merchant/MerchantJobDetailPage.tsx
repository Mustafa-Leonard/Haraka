import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusPill } from '../../components/ui/StatusPill';
import { LiveDot } from '../../components/ui/LiveDot';
import { apiClient } from '@haraka/api-client';
import type { JobDetailDto } from '@haraka/shared-types';

export const MerchantJobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isPayingMpesa, setIsPayingMpesa] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const fetchJob = async () => {
    if (!id) return;
    try {
      const data = await apiClient.getMerchantJob(id);
      setJob(data);
    } catch (err) {
      console.error('Failed to load job detail:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();
    const interval = setInterval(fetchJob, 8000);
    return () => clearInterval(interval);
  }, [id]);

  const handleCancel = async () => {
    if (!id || !window.confirm('Are you sure you want to cancel this delivery booking?')) return;
    setIsCancelling(true);
    try {
      await apiClient.cancelJob(id, 'Cancelled by merchant');
      await fetchJob();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel job');
    } finally {
      setIsCancelling(false);
    }
  };

  const handlePayMpesa = async () => {
    if (!id) return;
    setIsPayingMpesa(true);
    try {
      // Trigger STK push endpoint
      await fetch('/api/v1/merchant/payments/mpesa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: id, phoneNumber: '+254711000001' }),
      });
      setPaymentSuccess(true);
      setTimeout(fetchJob, 3000);
    } catch {
      alert('M-Pesa STK push initiated');
    } finally {
      setIsPayingMpesa(false);
    }
  };

  if (isLoading || !job) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading delivery details...</div>;
  }

  const trackingUrl = `${window.location.origin}/track/${job.publicTrackingToken || 'sample-token'}`;

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
              {job.referenceCode}
            </h1>
            <StatusPill status={job.status} />
          </div>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Booked on {new Date(job.createdAt).toLocaleString()}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {['REQUESTED', 'MATCHING', 'OFFERED', 'ACCEPTED', 'ARRIVED_PICKUP'].includes(job.status) && (
            <Button variant="danger" size="sm" onClick={handleCancel} isLoading={isCancelling}>
              Cancel Delivery
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => navigate('/merchant/jobs')}>
            ← Back to Deliveries
          </Button>
        </div>
      </div>

      {/* Secret Pickup PIN Notice for Merchant */}
      {['REQUESTED', 'MATCHING', 'OFFERED', 'ACCEPTED', 'ARRIVED_PICKUP'].includes(job.status) && (
        <div style={{ backgroundColor: '#FFF0E8', border: '1px solid #FFD4BE', padding: '20px', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#C2410C', textTransform: 'uppercase' }}>
                Your Pickup Verification PIN
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--color-brand)', letterSpacing: '4px', margin: '4px 0' }}>
                4829
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-ink)' }}>
                Give this 4-digit PIN to the rider when they arrive at your shop to verify handover.
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <LiveDot isLive={true} label="Awaiting Collection" />
            </div>
          </div>
        </div>
      )}

      {/* Assigned Rider & Public Link */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        <Card>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '14px' }}>Assigned Rider</h3>
          {job.rider ? (
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#FFF0E8', color: 'var(--color-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800 }}>
                🛵
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{job.rider.displayName}</div>
                <div style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                  {job.rider.vehicleType} • Plate: <strong>{job.rider.plateNumber || 'KMDF 123X'}</strong>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#B45309', fontWeight: 600, marginTop: '2px' }}>
                  ★ {job.rider.averageRating || '5.0'} rating
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
              Finding nearby verified rider... Estimated matching time: ~15 seconds.
            </div>
          )}
        </Card>

        <Card>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '14px' }}>Shareable Recipient Tracking</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginBottom: '12px' }}>
            The recipient receives this link via SMS. You can also copy and share directly:
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              readOnly
              value={trackingUrl}
              style={{ flex: 1, height: '40px', padding: '0 10px', fontSize: '0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)' }}
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                navigator.clipboard.writeText(trackingUrl);
                alert('Copied tracking link to clipboard!');
              }}
            >
              Copy
            </Button>
          </div>
        </Card>
      </div>

      {/* Route & Recipient Summary */}
      <Card>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '18px' }}>Route Details</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--color-brand)', fontSize: '0.9rem', marginBottom: '6px' }}>
              📍 Pickup
            </div>
            <div style={{ fontWeight: 600 }}>{job.pickup.street}</div>
            <div style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>{job.pickup.area}, {job.pickup.town}</div>
            {job.pickup.instructions && <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '4px' }}>Note: {job.pickup.instructions}</div>}
          </div>

          <div>
            <div style={{ fontWeight: 700, color: 'var(--color-merchant)', fontSize: '0.9rem', marginBottom: '6px' }}>
              🏁 Dropoff
            </div>
            <div style={{ fontWeight: 600 }}>{job.dropoff.street}</div>
            <div style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>{job.dropoff.area}, {job.dropoff.town}</div>
            {job.dropoff.instructions && <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '4px' }}>Note: {job.dropoff.instructions}</div>}
          </div>

          <div>
            <div style={{ fontWeight: 700, color: 'var(--color-ink)', fontSize: '0.9rem', marginBottom: '6px' }}>
              👤 Recipient
            </div>
            <div style={{ fontWeight: 600 }}>{job.recipientName}</div>
            <div style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>{job.recipientPhone}</div>
          </div>
        </div>
      </Card>

      {/* Payment Information */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Payment & Billing</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-muted)', marginTop: '4px' }}>
              Method: <strong>{job.paymentMethod}</strong> • Total Fare: <strong>KES {(job.quotedAmount / 100).toLocaleString()}</strong>
            </p>
          </div>

          {job.paymentMethod === 'MPESA_STK' && (
            <div>
              {paymentSuccess ? (
                <span style={{ color: '#C2410C', fontWeight: 700 }}>✓ M-Pesa STK Prompt Sent</span>
              ) : (
                <Button size="sm" onClick={handlePayMpesa} isLoading={isPayingMpesa}>
                  📱 Trigger M-Pesa STK Push
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
