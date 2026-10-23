import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { StatusPill } from '../../components/ui/StatusPill';
import { LiveDot } from '../../components/ui/LiveDot';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { apiClient } from '@haraka/api-client';
import type { PublicTrackingDto } from '@haraka/shared-types';
import { Bike, CircleAlert, MapPin, Smartphone, Star } from 'lucide-react';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';

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
  const [actionError, setActionError] = useState<string | null>(null);

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
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to submit the issue report.');
    }
  };

  const handleRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      await apiClient.submitPublicRating(token, score, ratingComment);
      setRatingSubmitted(true);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to submit the rating.');
    }
  };

  if (isLoading) {
    return (
      <div
        style={{ maxWidth: '640px', margin: '60px auto', padding: '0 20px', textAlign: 'center' }}
      >
        <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--color-muted)' }}>
          Loading live tracking data...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ maxWidth: '640px', margin: '60px auto', padding: '0 20px' }}>
        <Card style={{ textAlign: 'center', padding: '40px 24px' }}>
          <MapPin
            size={40}
            aria-hidden="true"
            style={{ marginBottom: 12, color: 'var(--color-brand)' }}
          />
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
    <div
      style={{
        maxWidth: '720px',
        margin: '30px auto',
        padding: '0 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      {/* Header Banner */}
      <Card
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)', fontWeight: 600 }}>
            Tracking Reference
          </div>
          <div
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-ink)',
            }}
          >
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
        <Smartphone size={26} aria-hidden="true" style={{ color: 'var(--color-brand)' }} />
        <div>
          <div style={{ fontWeight: 800, color: '#C2410C', fontSize: '0.95rem' }}>
            Verification Instructions
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--color-ink)', marginTop: '2px' }}>
            Your confidential <strong>Delivery PIN</strong> was sent directly to your phone via SMS.
            Please provide this PIN verbally to the rider upon arrival.
          </div>
        </div>
      </div>

      <Card style={{ padding: '0', overflow: 'hidden' }}>
        {data.lastLocation ? (
          <MapContainer
            center={[data.lastLocation.latitude, data.lastLocation.longitude]}
            zoom={14}
            scrollWheelZoom={false}
            style={{ height: 240, width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <CircleMarker
              center={[data.lastLocation.latitude, data.lastLocation.longitude]}
              radius={9}
              pathOptions={{ color: '#FF6A1F', fillColor: '#FF6A1F', fillOpacity: 0.9 }}
            >
              <Popup>{data.riderName ?? 'Assigned rider'}</Popup>
            </CircleMarker>
          </MapContainer>
        ) : (
          <div
            style={{
              height: 160,
              display: 'grid',
              placeItems: 'center',
              color: 'var(--color-muted)',
            }}
          >
            <span>
              <MapPin size={18} aria-hidden="true" /> Rider GPS location is not currently available.
            </span>
          </div>
        )}

        <div
          style={{
            padding: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: 600 }}>
              Destination
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>
              {data.dropoff.area}, {data.dropoff.town}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: 600 }}>
              Vehicle Plate
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-brand)' }}>
              {data.riderVehiclePlate || 'Not assigned'}
            </div>
          </div>
        </div>
      </Card>

      {/* Delivery Progress Timeline */}
      <Card>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '20px' }}>
          Delivery Progress
        </h3>
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
                  <strong style={{ fontSize: '0.95rem' }}>
                    {step.toStatus.replace(/_/g, ' ')}
                  </strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                    {new Date(step.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {step.reason && (
                  <div
                    style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginTop: '2px' }}
                  >
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
          <CircleAlert size={16} aria-hidden="true" /> Report an Issue
        </Button>
        {data.status === 'DELIVERED' || data.status === 'COMPLETED' ? (
          <Button onClick={() => setRatingSubmitted(false)}>
            <Star size={16} aria-hidden="true" /> Rate Delivery
          </Button>
        ) : null}
      </div>
      {actionError && (
        <p role="alert" style={{ color: 'var(--color-error)' }}>
          {actionError}
        </p>
      )}

      {/* Report Issue Modal/Panel */}
      {showReport && (
        <Card style={{ border: '1px solid var(--color-error)' }}>
          <h4
            style={{
              fontSize: '1.1rem',
              fontWeight: 800,
              color: 'var(--color-error)',
              marginBottom: '14px',
            }}
          >
            Report a Problem with Delivery {data.referenceCode}
          </h4>
          {reportSuccess ? (
            <p style={{ color: 'var(--color-ink)', fontWeight: 600 }}>
              ✓ Issue reported successfully. Haraka operations has been alerted.
            </p>
          ) : (
            <form
              onSubmit={handleReport}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <div>
                <label
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    display: 'block',
                    marginBottom: '6px',
                  }}
                >
                  Category
                </label>
                <select
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                  style={{
                    width: '100%',
                    height: '44px',
                    borderRadius: 'var(--radius-md)',
                    padding: '0 12px',
                  }}
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
                <Button type="button" variant="secondary" onClick={() => setShowReport(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="danger">
                  Submit Report
                </Button>
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
          <form
            onSubmit={handleRating}
            style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
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
                  <Star
                    size={22}
                    aria-hidden="true"
                    fill={star <= score ? 'currentColor' : 'none'}
                  />
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
