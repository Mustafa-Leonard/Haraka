import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { StatusPill } from '../../components/ui/StatusPill';
import { LiveDot } from '../../components/ui/LiveDot';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { apiClient } from '@haraka/api-client';
import type { PublicTrackingDto } from '@haraka/shared-types';

export const TrackingPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PublicTrackingDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Problem reporting modal state
  const [showReport, setShowReport] = useState(false);
  const [reportCategory, setReportCategory] = useState('late_delivery');
  const [reportDesc, setReportDesc] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);

  // Rating state
  const [score, setScore] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const fetchTracking = async () => {
    if (!token) return;
    try {
      const res = await apiClient.getPublicTracking(token);
      setData(res);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Tracking link invalid or expired');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();
    const interval = setInterval(fetchTracking, 10000); // Poll every 10s as fallback
    return () => clearInterval(interval);
  }, [token]);

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      await apiClient.reportPublicIssue(token, reportCategory, reportDesc);
      setReportSuccess(true);
    } catch {}
  };

  const handleRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      await apiClient.submitPublicRating(token, score, ratingComment);
      setRatingSubmitted(true);
    } catch {}
  };

  if (isLoading) {
    return (
      <div style={{ maxWidth: '640px', margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--color-muted)' }}>Loading live tracking data...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ maxWidth: '640px', margin: '60px auto', padding: '0 20px' }}>
        <Card style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🔍</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Tracking Record Not Found</h2>
          <p style={{ color: 'var(--color-muted)', margin: '12px 0 24px' }}>
            {error || 'This delivery link has expired or the tracking code is invalid.'}
          </p>
          <Button onClick={() => window.location.reload()}>Refresh</Button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '720px', margin: '30px auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <Card style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)', fontWeight: 600 }}>Tracking Reference</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--color-ink)' }}>
            {data.referenceCode}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <LiveDot isLive={true} label="Live GPS" />
          <StatusPill status={data.status} />
        </div>
      </Card>

      {/* Security Alert: Do not reveal delivery PIN on tracking page */}
      <div
        style={{
          backgroundColor: '#FFF0E8',
          border: '1px solid #FFD4BE',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}
      >
        <span style={{ fontSize: '1.6rem' }}>📱</span>
        <div>
          <div style={{ fontWeight: 800, color: '#C2410C', fontSize: '0.95rem' }}>
            Verification Instructions
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--color-ink)', marginTop: '2px' }}>
            Your confidential <strong>Delivery PIN</strong> was sent directly to your phone via SMS. Please provide this PIN verbally to the rider upon arrival.
          </div>
        </div>
      </div>

      {/* Simulated Restricted Live Map */}
      <Card style={{ padding: '0', overflow: 'hidden' }}>
        <div
          style={{
            height: '240px',
            backgroundColor: '#E4E0DA',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle, #EFECE6 10%, #E2DDD5 90%)',
          }}
        >
          {/* Simulated Map Markers */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div style={{ fontSize: '2.5rem', animation: 'bounce 2s infinite' }}>🛵</div>
            <div style={{ backgroundColor: 'var(--color-brand)', color: '#fff', padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800 }}>
              {data.riderName || 'Rider in transit'}
            </div>
            {data.lastLocation && (
              <span style={{ fontSize: '0.75rem', color: '#68717C' }}>
                GPS: {data.lastLocation.latitude.toFixed(4)}, {data.lastLocation.longitude.toFixed(4)}
              </span>
            )}
          </div>
        </div>

        <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: 600 }}>Destination</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{data.dropoff.area}, {data.dropoff.town}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: 600 }}>Vehicle Plate</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-brand)' }}>
              {data.riderVehiclePlate || 'KMDF 123X'}
            </div>
          </div>
        </div>
      </Card>

      {/* Delivery Progress Timeline */}
      <Card>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '20px' }}>Delivery Progress</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {(data.stateHistory || []).map((step, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-brand)',
                  marginTop: '5px',
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: '0.95rem' }}>{step.toStatus.replace(/_/g, ' ')}</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                    {new Date(step.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {step.reason && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginTop: '2px' }}>
                    {step.reason}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Actions: Report Problem or Rate Delivery */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
        <Button variant="secondary" onClick={() => setShowReport(!showReport)}>
          ⚠️ Report an Issue
        </Button>
        {data.status === 'DELIVERED' || data.status === 'COMPLETED' ? (
          <Button onClick={() => setRatingSubmitted(false)}>
            ⭐ Rate Delivery
          </Button>
        ) : null}
      </div>

      {/* Report Issue Modal/Panel */}
      {showReport && (
        <Card style={{ border: '1px solid var(--color-error)' }}>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-error)', marginBottom: '14px' }}>
            Report a Problem with Delivery {data.referenceCode}
          </h4>
          {reportSuccess ? (
            <p style={{ color: 'var(--color-ink)', fontWeight: 600 }}>
              ✓ Issue reported successfully. Haraka operations has been alerted.
            </p>
          ) : (
            <form onSubmit={handleReport} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Category</label>
                <select
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                  style={{ width: '100%', height: '44px', borderRadius: 'var(--radius-md)', padding: '0 12px' }}
                >
                  <option value="late_delivery">Late Delivery / Delay</option>
                  <option value="damaged_item">Damaged Parcel</option>
                  <option value="unprofessional_rider">Rider Conduct Issue</option>
                  <option value="wrong_location">Wrong Dropoff Location</option>
                </select>
              </div>
              <Input
                label="Details"
                placeholder="Describe what occurred..."
                value={reportDesc}
                onChange={(e) => setReportDesc(e.target.value)}
                required
              />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <Button type="button" variant="secondary" onClick={() => setShowReport(false)}>Cancel</Button>
                <Button type="submit" variant="danger">Submit Report</Button>
              </div>
            </form>
          )}
        </Card>
      )}

      {/* Rating Card */}
      {(data.status === 'DELIVERED' || data.status === 'COMPLETED') && !ratingSubmitted && (
        <Card>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '12px' }}>
            How was your delivery with {data.riderName || 'the rider'}?
          </h4>
          <form onSubmit={handleRating} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setScore(star)}
                  style={{
                    fontSize: '1.6rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: star <= score ? '#F5B301' : 'var(--color-border)',
                  }}
                >
                  ★
                </button>
              ))}
            </div>
            <Input
              placeholder="Leave an optional review comment..."
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
            />
            <Button type="submit">Submit Rating</Button>
          </form>
        </Card>
      )}
    </div>
  );
};
