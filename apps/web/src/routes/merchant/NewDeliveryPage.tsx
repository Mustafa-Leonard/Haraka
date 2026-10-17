import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { apiClient } from '@haraka/api-client';
import type { QuoteResponseDto, JobDetailDto } from '@haraka/shared-types';

export const NewDeliveryPage: React.FC = () => {
  const navigate = useNavigate();

  // Form State
  const [pickupTown, setPickupTown] = useState('Kilifi');
  const [pickupArea, setPickupArea] = useState('Town Centre');
  const [pickupStreet, setPickupStreet] = useState('Biashara Street, Old Post Office');
  const [pickupInstructions, setPickupInstructions] = useState('Ground floor spices shop');

  const [dropoffTown, setDropoffTown] = useState('Kilifi');
  const [dropoffArea, setDropoffArea] = useState('Bofa Beach');
  const [dropoffStreet, setDropoffStreet] = useState('Bofa Road, Near Silver Palm');
  const [dropoffInstructions, setDropoffInstructions] = useState('Gate 4, call upon arrival');

  const [recipientName, setRecipientName] = useState('Amina Hassan');
  const [recipientPhone, setRecipientPhone] = useState('+254712345678');

  const [vehicleType, setVehicleType] = useState<'BODA' | 'TUKTUK'>('BODA');
  const [parcelSize, setParcelSize] = useState<'SMALL' | 'MEDIUM' | 'LARGE' | 'EXTRA_LARGE'>('SMALL');
  const [paymentMethod, setPaymentMethod] = useState<'MPESA_STK' | 'CASH_ON_DELIVERY'>('MPESA_STK');

  // Quoting & Booking State
  const [quote, setQuote] = useState<QuoteResponseDto | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedJob, setConfirmedJob] = useState<any | null>(null);

  const handleGetQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsQuoting(true);
    setError(null);
    try {
      // Default coordinates for Kilifi town -> Bofa Beach
      const pickupLat = -3.6305;
      const pickupLng = 39.8499;
      const dropoffLat = -3.6125;
      const dropoffLng = 39.8650;

      const res = await apiClient.getQuote({
        pickupLat,
        pickupLng,
        dropoffLat,
        dropoffLng,
        vehicleType,
        parcelSize,
      });
      setQuote(res);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate fare quote');
    } finally {
      setIsQuoting(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!quote) return;
    setIsBooking(true);
    setError(null);
    try {
      const res = await apiClient.createJob({
        quoteId: quote.quoteId,
        pickupStreet,
        pickupArea,
        pickupTown,
        pickupInstructions,
        pickupLat: -3.6305,
        pickupLng: 39.8499,
        dropoffStreet,
        dropoffArea,
        dropoffTown,
        dropoffInstructions,
        dropoffLat: -3.6125,
        dropoffLng: 39.8650,
        recipientName,
        recipientPhone,
        vehicleType,
        parcelSize,
        paymentMethod,
      });

      setConfirmedJob(res);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to confirm booking');
    } finally {
      setIsBooking(false);
    }
  };

  if (confirmedJob) {
    return (
      <div style={{ maxWidth: '600px', margin: '40px auto' }}>
        <Card style={{ padding: '36px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎉</div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
            Delivery Booked Successfully!
          </h2>
          <p style={{ color: 'var(--color-muted)', marginTop: '8px' }}>
            We are currently finding the nearest available rider in Kilifi.
          </p>

          <div style={{ backgroundColor: 'var(--color-bg)', padding: '24px', borderRadius: 'var(--radius-lg)', margin: '24px 0', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: 'var(--color-muted)', fontWeight: 600 }}>Reference Code:</span>
              <strong style={{ color: 'var(--color-brand)' }}>{confirmedJob.referenceCode}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: 'var(--color-muted)', fontWeight: 600 }}>Recipient:</span>
              <strong>{confirmedJob.recipientName} ({confirmedJob.recipientPhone})</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: 'var(--color-muted)', fontWeight: 600 }}>Fare Total:</span>
              <strong>KES {(confirmedJob.quotedAmount / 100).toLocaleString()}</strong>
            </div>

            {/* Secret Pickup PIN Notice */}
            <div style={{ backgroundColor: '#FFF0E8', border: '1px solid #FFD4BE', padding: '16px', borderRadius: 'var(--radius-md)', marginTop: '16px' }}>
              <div style={{ fontSize: '0.85rem', color: '#C2410C', fontWeight: 700, textTransform: 'uppercase' }}>
                Your Pickup Verification PIN:
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-brand)', letterSpacing: '4px', margin: '6px 0' }}>
                {confirmedJob.pickupPin || '4829'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-ink)' }}>
                Please verbally provide this 4-digit PIN to the rider once they arrive at your pickup location to confirm parcel handoff.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Button onClick={() => navigate(`/merchant/jobs/${confirmedJob.id}`)}>
              Track Delivery
            </Button>
            <Button variant="secondary" onClick={() => { setConfirmedJob(null); setQuote(null); }}>
              Book Another Delivery
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
          Book a Delivery
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem' }}>
          Get a transparent price quote locked for 5 minutes and dispatch a verified rider.
        </p>
      </div>

      {error && (
        <div style={{ backgroundColor: '#FEF0F0', border: '1px solid #FCA5A5', color: '#D64545', padding: '14px', borderRadius: 'var(--radius-md)', fontWeight: 500 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleGetQuote} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Pickup & Dropoff Card */}
        <Card>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '18px' }}>
            1. Route & Addresses
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {/* Pickup */}
            <div style={{ padding: '16px', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-brand)', marginBottom: '12px' }}>
                📍 Pickup Location
              </div>
              <Select
                label="Town"
                value={pickupTown}
                onChange={(e) => setPickupTown(e.target.value)}
                options={[
                  { value: 'Kilifi', label: 'Kilifi Town' },
                  { value: 'Malindi', label: 'Malindi' },
                  { value: 'Mombasa', label: 'Mombasa' },
                ]}
              />
              <Input
                label="Area / Neighborhood"
                value={pickupArea}
                onChange={(e) => setPickupArea(e.target.value)}
                required
              />
              <Input
                label="Street / Building Details"
                value={pickupStreet}
                onChange={(e) => setPickupStreet(e.target.value)}
                required
              />
              <Input
                label="Pickup Instructions"
                value={pickupInstructions}
                onChange={(e) => setPickupInstructions(e.target.value)}
              />
            </div>

            {/* Dropoff */}
            <div style={{ padding: '16px', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-merchant)', marginBottom: '12px' }}>
                🏁 Dropoff Location
              </div>
              <Select
                label="Town"
                value={dropoffTown}
                onChange={(e) => setDropoffTown(e.target.value)}
                options={[
                  { value: 'Kilifi', label: 'Kilifi Town' },
                  { value: 'Malindi', label: 'Malindi' },
                  { value: 'Mombasa', label: 'Mombasa' },
                ]}
              />
              <Input
                label="Area / Neighborhood"
                value={dropoffArea}
                onChange={(e) => setDropoffArea(e.target.value)}
                required
              />
              <Input
                label="Street / Landmark"
                value={dropoffStreet}
                onChange={(e) => setDropoffStreet(e.target.value)}
                required
              />
              <Input
                label="Dropoff Instructions"
                value={dropoffInstructions}
                onChange={(e) => setDropoffInstructions(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Recipient Card */}
        <Card>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '18px' }}>
            2. Recipient Information
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <Input
              label="Recipient Full Name"
              placeholder="e.g. Amina Hassan"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              required
            />
            <Input
              label="Recipient Phone Number"
              placeholder="+254 712 345 678"
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              helperText="The recipient will receive live tracking and delivery PIN via SMS"
              required
            />
          </div>
        </Card>

        {/* Vehicle & Parcel Type */}
        <Card>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '18px' }}>
            3. Vehicle & Parcel
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                Vehicle Type
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <Button
                  type="button"
                  variant={vehicleType === 'BODA' ? 'primary' : 'secondary'}
                  onClick={() => setVehicleType('BODA')}
                  style={{ flex: 1 }}
                >
                  🛵 Boda-Boda
                </Button>
                <Button
                  type="button"
                  variant={vehicleType === 'TUKTUK' ? 'primary' : 'secondary'}
                  onClick={() => setVehicleType('TUKTUK')}
                  style={{ flex: 1 }}
                >
                  🛺 Tuk-Tuk
                </Button>
              </div>
            </div>

            <div>
              <Select
                label="Parcel Size"
                value={parcelSize}
                onChange={(e) => setParcelSize(e.target.value as any)}
                options={[
                  { value: 'SMALL', label: 'Small (< 2kg, Envelope/Phone)' },
                  { value: 'MEDIUM', label: 'Medium (2-10kg, Shoe box/Bag)' },
                  { value: 'LARGE', label: 'Large (10-30kg, Carton/Sack)' },
                  { value: 'EXTRA_LARGE', label: 'Extra Large (30kg+, Heavy)' },
                ]}
              />
            </div>
          </div>

          <Button type="submit" isLoading={isQuoting} style={{ marginTop: '20px' }}>
            Calculate Guaranteed Quote
          </Button>
        </Card>
      </form>

      {/* Quote Preview and Booking Confirmation */}
      {quote && (
        <Card style={{ border: '2px solid var(--color-brand)', padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
              Fare Breakdown (Locked for 5 Minutes)
            </h2>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '4px 10px', borderRadius: '12px', backgroundColor: '#FFF0E8', color: 'var(--color-brand)' }}>
              ⏱️ Valid until {new Date(quote.expiresAt).toLocaleTimeString()}
            </span>
          </div>

          <div style={{ backgroundColor: 'var(--color-bg)', padding: '20px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
              <span>Base Fare ({quote.vehicleType}):</span>
              <span>KES {(quote.breakdown.baseFare / 100).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
              <span>Distance ({quote.breakdown.distanceKm} km @ {quote.distanceSource}):</span>
              <span>KES {(quote.breakdown.distanceFare / 100).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
              <span>Parcel Size Multiplier ({quote.parcelSize}):</span>
              <span>× {quote.parcelMultiplier}</span>
            </div>
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '1.3rem', fontWeight: 800 }}>
              <span>Total Guaranteed Fare:</span>
              <span style={{ color: 'var(--color-brand)' }}>KES {(quote.totalAmount / 100).toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 700, display: 'block', marginBottom: '10px' }}>
              Select Payment Method
            </label>
            <div style={{ display: 'flex', gap: '16px' }}>
              <Button
                type="button"
                variant={paymentMethod === 'MPESA_STK' ? 'primary' : 'secondary'}
                onClick={() => setPaymentMethod('MPESA_STK')}
              >
                📱 M-Pesa STK Push
              </Button>
              <Button
                type="button"
                variant={paymentMethod === 'CASH_ON_DELIVERY' ? 'primary' : 'secondary'}
                onClick={() => setPaymentMethod('CASH_ON_DELIVERY')}
              >
                💵 Cash on Delivery (COD)
              </Button>
            </div>
          </div>

          <Button size="lg" onClick={handleConfirmBooking} isLoading={isBooking} style={{ width: '100%' }}>
            Confirm Booking & Dispatch Rider
          </Button>
        </Card>
      )}
    </div>
  );
};
