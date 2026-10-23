import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LiveDot } from '../../components/ui/LiveDot';
import { apiClient } from '@haraka/api-client';
import type { JobOfferDto } from '@haraka/shared-types';
import { Banknote, Bike, Flag, MapPin } from 'lucide-react';

export const RiderOffersPage: React.FC = () => {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<JobOfferDto[]>([]);
  const [secondsLeft, setSecondsLeft] = useState<number>(15);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchOffers = async () => {
    try {
      const data = await apiClient.getRiderOffers();
      setErrorMessage(null);
      if (data && data.length > 0) {
        setOffers(data);
        const exp = new Date(data[0]!.expiresAt).getTime();
        const diff = Math.max(0, Math.round((exp - Date.now()) / 1000));
        setSecondsLeft(diff || 15);
      } else {
        setOffers([]);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load delivery offers.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
    const interval = setInterval(fetchOffers, 5000); // Check for dispatched orders every 5s
    return () => clearInterval(interval);
  }, []);

  // 15-second expiration countdown
  useEffect(() => {
    if (offers.length === 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          fetchOffers();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [offers]);

  const handleAccept = async (offerId: string) => {
    setIsProcessing(true);
    try {
      await apiClient.acceptOffer(offerId);
      navigate('/rider/active');
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Offer has expired or was assigned to another rider.',
      );
      await fetchOffers();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async (offerId: string) => {
    setIsProcessing(true);
    try {
      await apiClient.declineOffer(offerId, 'Rider declined delivery request');
      await fetchOffers();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to decline this offer.');
      await fetchOffers();
    } finally {
      setIsProcessing(false);
    }
  };

  const activeOffer = offers[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
            Available Orders
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
            Real-time delivery requests dispatched to your location.
          </p>
        </div>
        <LiveDot isLive={true} label="Listening" />
      </div>

      {isLoading && (
        <Card style={{ padding: '30px', textAlign: 'center', color: 'var(--color-muted)' }}>
          Checking dispatch queue…
        </Card>
      )}
      {errorMessage && (
        <p role="alert" style={{ color: 'var(--color-error)' }}>
          {errorMessage}
        </p>
      )}

      {!isLoading && !activeOffer ? (
        <Card style={{ padding: '48px 24px', textAlign: 'center' }}>
          <Bike
            size={40}
            aria-hidden="true"
            style={{ marginBottom: 12, color: 'var(--color-brand)' }}
          />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>No Pending Offers</h2>
          <p
            style={{
              color: 'var(--color-muted)',
              fontSize: '0.9rem',
              maxWidth: '340px',
              margin: '8px auto 20px',
            }}
          >
            You are online and eligible. Keep your status active; incoming delivery offers will
            alert you here automatically.
          </p>
          <Button size="sm" variant="secondary" onClick={fetchOffers}>
            Refresh Queue
          </Button>
        </Card>
      ) : activeOffer ? (
        <Card style={{ padding: '24px', border: '2px solid var(--color-brand)' }}>
          {/* Timed countdown bar */}
          <div style={{ marginBottom: '16px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.85rem',
                fontWeight: 800,
                marginBottom: '6px',
              }}
            >
              <span style={{ color: 'var(--color-brand)' }}>Acceptance Countdown</span>
              <span
                style={{ color: secondsLeft <= 5 ? 'var(--color-danger)' : 'var(--color-ink)' }}
              >
                {secondsLeft}s remaining
              </span>
            </div>
            <div
              style={{
                height: '8px',
                backgroundColor: 'var(--color-border)',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${(secondsLeft / 15) * 100}%`,
                  backgroundColor: secondsLeft <= 5 ? '#EF4444' : 'var(--color-brand)',
                  transition: 'width 1s linear, background-color 0.3s',
                }}
              />
            </div>
          </div>

          {/* Earnings callout */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#FFF0E8',
              padding: '16px 20px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '20px',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '0.8rem',
                  color: '#C2410C',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                Customer delivery price
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-brand)' }}>
                KES{' '}
                {(activeOffer.quotedAmount / 100).toLocaleString('en-KE', {
                  minimumFractionDigits: 2,
                })}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8rem', color: '#C2410C', fontWeight: 700 }}>DISTANCE</div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                {(activeOffer.distanceMeters / 1000).toFixed(1)} km
              </div>
            </div>
          </div>

          {/* Route Details from Database */}
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}
          >
            <div style={{ display: 'flex', gap: '12px' }}>
              <MapPin size={20} aria-hidden="true" style={{ color: 'var(--color-brand)' }} />
              <div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--color-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  PICKUP LOCATION
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  {activeOffer.pickup.street}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                  {activeOffer.pickup.area}, {activeOffer.pickup.town}
                </div>
                {activeOffer.pickup.instructions && (
                  <div style={{ fontSize: '0.8rem', color: '#B45309', marginTop: '2px' }}>
                    Note: {activeOffer.pickup.instructions}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <Flag size={20} aria-hidden="true" style={{ color: 'var(--color-brand)' }} />
              <div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--color-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  DROPOFF RECIPIENT
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  {activeOffer.recipientName}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                  {activeOffer.dropoff.street}, {activeOffer.dropoff.town}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Button
              variant="secondary"
              disabled={isProcessing}
              onClick={() => handleDecline(activeOffer.offerId)}
            >
              Decline
            </Button>
            <Button
              disabled={isProcessing || secondsLeft === 0}
              isLoading={isProcessing}
              onClick={() => handleAccept(activeOffer.offerId)}
            >
              ✓ Accept Delivery
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
};
