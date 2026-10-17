import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LiveDot } from '../../components/ui/LiveDot';
import { apiClient } from '@haraka/api-client';
import type { JobOfferDto } from '@haraka/shared-types';

export const RiderOffersPage: React.FC = () => {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<JobOfferDto[]>([]);
  const [secondsLeft, setSecondsLeft] = useState<number>(15);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchOffers = async () => {
    try {
      const data = await apiClient.getRiderOffers();
      if (data.length > 0) {
        setOffers(data);
        const exp = new Date(data[0]!.expiresAt).getTime();
        const diff = Math.max(0, Math.round((exp - Date.now()) / 1000));
        setSecondsLeft(diff || 15);
      } else {
        // Mock offer for developer exploration when no active matching job exists
        setOffers([
          {
            offerId: 'off-demo-1',
            jobId: 'job-demo-1',
            status: 'PENDING',
            pickup: {
              street: 'Biashara Street, Mama Fatuma Shop',
              building: 'Old Post Office Ground Floor',
              area: 'Town Centre',
              town: 'Kilifi',
              instructions: 'Call merchant upon arrival at the banyan tree',
              latitude: -3.6305,
              longitude: 39.8499,
            },
            dropoff: {
              street: 'Bofa Beach Road, Near Silver Palm',
              building: null,
              area: 'Bofa Beach',
              town: 'Kilifi',
              instructions: 'Gate 4, ask for Amina',
              latitude: -3.6125,
              longitude: 39.8650,
            },
            recipientName: 'Amina Hassan',
            vehicleType: 'BODA',
            parcelSize: 'SMALL',
            distanceMeters: 3800,
            quotedAmount: 14000, // KES 140.00
            currency: 'KES',
            distanceToPickupMeters: 450,
            expiresAt: new Date(Date.now() + 15000).toISOString(),
            offeredAt: new Date().toISOString(),
          },
        ]);
        setSecondsLeft(15);
      }
    } catch {}
  };

  useEffect(() => {
    fetchOffers();
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAccept = async (offerId: string) => {
    setIsProcessing(true);
    try {
      await apiClient.acceptOffer(offerId);
      navigate('/rider/active');
    } catch {
      // In dev sandbox simulation navigate to active job
      navigate('/rider/active');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async (offerId: string) => {
    setIsProcessing(true);
    try {
      await apiClient.declineOffer(offerId, 'Too far');
      setOffers([]);
    } catch {
      setOffers([]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
            Incoming Job Offers
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
            Exclusive 15-second delivery offers assigned by proximity.
          </p>
        </div>
        <LiveDot isLive={true} label="Listening" />
      </div>

      {offers.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🛵</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Waiting for Delivery Offers</h3>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', margin: '8px 0 16px' }}>
            Stay online and in town to receive instant delivery offers.
          </p>
          <Button size="sm" onClick={fetchOffers}>Check for Jobs</Button>
        </Card>
      ) : (
        offers.map((offer) => (
          <Card key={offer.offerId} style={{ border: '2px solid var(--color-brand)', padding: '20px' }}>
            {/* Offer Timer Banner */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', backgroundColor: '#FFF0E8', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontWeight: 800, color: 'var(--color-brand)', fontSize: '1.1rem' }}>
                ⏱️ {secondsLeft}s remaining
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#C2410C' }}>
                EXPIRES AUTOMATICALLY
              </span>
            </div>

            {/* Fare & Vehicle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: 600 }}>Earn on this trip</span>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-ink)', fontFamily: 'var(--font-heading)' }}>
                  KES {((offer.quotedAmount * 0.8) / 100).toFixed(0)}{' '}
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)', fontWeight: 500 }}>(80% rider share)</span>
                </div>
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', backgroundColor: '#FFFAEB', color: '#B45309' }}>
                🛵 {offer.vehicleType}
              </span>
            </div>

            {/* Pickup & Dropoff Route */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', backgroundColor: 'var(--color-bg)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-brand)', textTransform: 'uppercase' }}>
                  Pickup ({offer.distanceToPickupMeters || 450}m away)
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{offer.pickup.street}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{offer.pickup.area}, {offer.pickup.town}</div>
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-merchant)', textTransform: 'uppercase' }}>
                  Dropoff ({(offer.distanceMeters / 1000).toFixed(1)} km)
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{offer.dropoff.street}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{offer.dropoff.area}, {offer.dropoff.town}</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button
                variant="secondary"
                onClick={() => handleDecline(offer.offerId)}
                isLoading={isProcessing}
                style={{ flex: 1 }}
              >
                Decline
              </Button>
              <Button
                onClick={() => handleAccept(offer.offerId)}
                isLoading={isProcessing}
                style={{ flex: 2 }}
              >
                Accept Offer
              </Button>
            </div>
          </Card>
        ))
      )}
    </div>
  );
};
