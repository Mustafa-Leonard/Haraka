import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { apiClient } from '@haraka/api-client';
import type { QuoteResponseDto, JobDetailDto } from '@haraka/shared-types';
import {
  Banknote,
  Bike,
  CarFront,
  Clock3,
  Flag,
  MapPin,
  PackageCheck,
  Smartphone,
} from 'lucide-react';

export const NewDeliveryPage: React.FC = () => {
  const navigate = useNavigate();

  // Form State
  const [pickupTown, setPickupTown] = useState('');
  const [pickupArea, setPickupArea] = useState('');
  const [pickupStreet, setPickupStreet] = useState('');
  const [pickupInstructions, setPickupInstructions] = useState('');

  const [dropoffTown, setDropoffTown] = useState('');
  const [pickupLat, setPickupLat] = useState('');
  const [pickupLng, setPickupLng] = useState('');
  const [dropoffLat, setDropoffLat] = useState('');
  const [dropoffLng, setDropoffLng] = useState('');
  const [dropoffArea, setDropoffArea] = useState('');
  const [dropoffStreet, setDropoffStreet] = useState('');
  const [dropoffInstructions, setDropoffInstructions] = useState('');

  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');

  const [vehicleType, setVehicleType] = useState<'BODA' | 'TUKTUK'>('BODA');
  const [zoneSlug, setZoneSlug] = useState('');
  const [parcelSize, setParcelSize] = useState<'SMALL' | 'MEDIUM' | 'LARGE' | 'EXTRA_LARGE'>(
    'SMALL',
  );
  const [paymentMethod, setPaymentMethod] = useState<'MPESA_STK' | 'CASH_ON_DELIVERY'>('MPESA_STK');

  // Quoting & Booking State
  const [quote, setQuote] = useState<QuoteResponseDto | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedJob, setConfirmedJob] = useState<any | null>(null);

  const {
    data: serviceZones = [],
    isLoading: zonesLoading,
    error: zonesError,
  } = useQuery({
    queryKey: ['merchant-service-zones'],
    queryFn: () => apiClient.getActiveServiceZones(),
  });

  useEffect(() => {
    if (!zoneSlug && serviceZones.length > 0) {
      setZoneSlug(serviceZones[0].slug);
      setPickupTown(serviceZones[0].name);
      setDropoffTown(serviceZones[0].name);
    }
  }, [serviceZones, zoneSlug]);

  const handleGetQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneSlug) {
      setError('Select an active service zone before requesting a quote.');
      return;
    }
    const coordinates = [pickupLat, pickupLng, dropoffLat, dropoffLng].map(Number);
    if (
      [pickupLat, pickupLng, dropoffLat, dropoffLng].some((value) => value.trim() === '') ||
      !coordinates.every(Number.isFinite) ||
      coordinates[0] < -90 ||
      coordinates[0] > 90 ||
      coordinates[1] < -180 ||
      coordinates[1] > 180 ||
      coordinates[2] < -90 ||
      coordinates[2] > 90 ||
      coordinates[3] < -180 ||
      coordinates[3] > 180
    ) {
      setError('Enter valid pickup and dropoff latitude and longitude coordinates.');
      return;
    }
    setIsQuoting(true);
    setError(null);
    try {
      const res = await apiClient.getQuote({
        pickupLat: coordinates[0],
        pickupLng: coordinates[1],
        dropoffLat: coordinates[2],
        dropoffLng: coordinates[3],
        vehicleType,
        parcelSize,
        zoneSlug,
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
        pickupLat: Number(pickupLat),
        pickupLng: Number(pickupLng),
        dropoffStreet,
        dropoffArea,
        dropoffTown,
        dropoffInstructions,
        dropoffLat: Number(dropoffLat),
        dropoffLng: Number(dropoffLng),
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
          <PackageCheck
            size={40}
            aria-hidden="true"
            style={{ color: 'var(--color-brand)', marginBottom: '16px' }}
          />
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
            Delivery Booked Successfully!
          </h2>
          <p style={{ color: 'var(--color-muted)', marginTop: '8px' }}>
            Follow the booking status below for assignment and delivery updates.
          </p>

          <div
            style={{
              backgroundColor: 'var(--color-bg)',
              padding: '24px',
              borderRadius: 'var(--radius-lg)',
              margin: '24px 0',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: 'var(--color-muted)', fontWeight: 600 }}>Reference Code:</span>
              <strong style={{ color: 'var(--color-brand)' }}>{confirmedJob.referenceCode}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: 'var(--color-muted)', fontWeight: 600 }}>Recipient:</span>
              <strong>
                {confirmedJob.recipientName} ({confirmedJob.recipientPhone})
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: 'var(--color-muted)', fontWeight: 600 }}>Fare Total:</span>
              <strong>KES {(confirmedJob.quotedAmount / 100).toLocaleString()}</strong>
            </div>

            {/* Secret Pickup PIN Notice */}
            <div
              style={{
                backgroundColor: '#FFF0E8',
                border: '1px solid #FFD4BE',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                marginTop: '16px',
              }}
            >
              <div
                style={{
                  fontSize: '0.85rem',
                  color: '#C2410C',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                Your Pickup Verification PIN:
              </div>
              <div
                style={{
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: 'var(--color-brand)',
                  letterSpacing: '4px',
                  margin: '6px 0',
                }}
              >
                {confirmedJob.pickupPin || 'Sent via SMS'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-ink)' }}>
                Please verbally provide this 4-digit PIN to the rider once they arrive at your
                pickup location to confirm parcel handoff.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Button onClick={() => navigate(`/merchant/jobs/${confirmedJob.id}`)}>
              Track Delivery
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setConfirmedJob(null);
                setQuote(null);
              }}
            >
              Book Another Delivery
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: '840px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
      }}
    >
      <div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
          Book a Delivery
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem' }}>
          Get a transparent price quote locked for 5 minutes and dispatch a verified rider.
        </p>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: '#FEF0F0',
            border: '1px solid #FCA5A5',
            color: '#D64545',
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleGetQuote}
        style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
      >
        {/* Pickup & Dropoff Card */}
        <Card>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '18px' }}>
            1. Route & Addresses
          </h2>
          <Select
            label="Service Zone"
            value={zoneSlug}
            onChange={(e) => {
              const selected = serviceZones.find((zone) => zone.slug === e.target.value);
              setZoneSlug(e.target.value);
              setQuote(null);
              if (selected) {
                setPickupTown(selected.name);
                setDropoffTown(selected.name);
              }
            }}
            options={serviceZones.map((zone) => ({ value: zone.slug, label: zone.name }))}
            disabled={zonesLoading || serviceZones.length === 0}
          />
          {zonesError && (
            <p role="alert" style={{ color: 'var(--color-danger)' }}>
              Service zones could not be loaded. Refresh the page or try again.
            </p>
          )}
          {!zonesLoading && serviceZones.length === 0 && (
            <p role="alert" style={{ color: 'var(--color-danger)' }}>
              No active service zones are available. Contact operations.
            </p>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
            }}
          >
            {/* Pickup */}
            <div
              style={{
                padding: '16px',
                backgroundColor: 'var(--color-bg)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ fontWeight: 700, color: 'var(--color-brand)', marginBottom: '12px' }}>
                <MapPin size={16} aria-hidden="true" /> Pickup Location
              </div>
              <Select
                label="Town"
                value={pickupTown}
                disabled
                options={[{ value: pickupTown, label: pickupTown || 'Select a service zone' }]}
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
              <p style={{ color: 'var(--color-muted)', fontSize: '0.8rem' }}>
                Enter coordinates for the actual pickup point. These determine the route distance
                and quote.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Input
                  label="Pickup Latitude"
                  type="number"
                  min="-90"
                  max="90"
                  step="any"
                  value={pickupLat}
                  onChange={(e) => {
                    setPickupLat(e.target.value);
                    setQuote(null);
                  }}
                  required
                />
                <Input
                  label="Pickup Longitude"
                  type="number"
                  min="-180"
                  max="180"
                  step="any"
                  value={pickupLng}
                  onChange={(e) => {
                    setPickupLng(e.target.value);
                    setQuote(null);
                  }}
                  required
                />
              </div>
            </div>

            {/* Dropoff */}
            <div
              style={{
                padding: '16px',
                backgroundColor: 'var(--color-bg)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div
                style={{ fontWeight: 700, color: 'var(--color-merchant)', marginBottom: '12px' }}
              >
                <Flag size={16} aria-hidden="true" /> Dropoff Location
              </div>
              <Select
                label="Town"
                value={dropoffTown}
                disabled
                options={[{ value: dropoffTown, label: dropoffTown || 'Select a service zone' }]}
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
              <p style={{ color: 'var(--color-muted)', fontSize: '0.8rem' }}>
                Enter coordinates for the actual dropoff point. These determine the route distance
                and quote.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Input
                  label="Dropoff Latitude"
                  type="number"
                  min="-90"
                  max="90"
                  step="any"
                  value={dropoffLat}
                  onChange={(e) => {
                    setDropoffLat(e.target.value);
                    setQuote(null);
                  }}
                  required
                />
                <Input
                  label="Dropoff Longitude"
                  type="number"
                  min="-180"
                  max="180"
                  step="any"
                  value={dropoffLng}
                  onChange={(e) => {
                    setDropoffLng(e.target.value);
                    setQuote(null);
                  }}
                  required
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Recipient Card */}
        <Card>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '18px' }}>
            2. Recipient Information
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
            }}
          >
            <Input
              label="Recipient Full Name"
              placeholder="Recipient full name"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              required
            />
            <Input
              label="Recipient Phone Number"
              placeholder="+254 7XX XXX XXX"
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

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '20px',
            }}
          >
            <div>
              <label
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  display: 'block',
                  marginBottom: '8px',
                }}
              >
                Vehicle Type
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <Button
                  type="button"
                  variant={vehicleType === 'BODA' ? 'primary' : 'secondary'}
                  onClick={() => {
                    setVehicleType('BODA');
                    setQuote(null);
                  }}
                  style={{ flex: 1 }}
                >
                  <Bike size={16} aria-hidden="true" /> Boda-Boda
                </Button>
                <Button
                  type="button"
                  variant={vehicleType === 'TUKTUK' ? 'primary' : 'secondary'}
                  onClick={() => {
                    setVehicleType('TUKTUK');
                    setQuote(null);
                  }}
                  style={{ flex: 1 }}
                >
                  <CarFront size={16} aria-hidden="true" /> Tuk-Tuk
                </Button>
              </div>
            </div>

            <div>
              <Select
                label="Parcel Size"
                value={parcelSize}
                onChange={(e) => {
                  setParcelSize(e.target.value as any);
                  setQuote(null);
                }}
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
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '18px',
            }}
          >
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
              Fare Breakdown (Locked for 5 Minutes)
            </h2>
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '12px',
                backgroundColor: '#FFF0E8',
                color: 'var(--color-brand)',
              }}
            >
              <Clock3 size={14} aria-hidden="true" /> Valid until{' '}
              {new Date(quote.expiresAt).toLocaleTimeString()}
            </span>
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-bg)',
              padding: '20px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
              <span>Service Zone:</span>
              <span>{quote.zoneName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
              <span>Base Fare ({quote.vehicleType}):</span>
              <span>KES {(quote.breakdown.baseFare / 100).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
              <span>
                Distance ({quote.breakdown.distanceKm} km @ {quote.distanceSource}):
              </span>
              <span>KES {(quote.breakdown.distanceFare / 100).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
              <span>Parcel Size Multiplier ({quote.parcelSize}):</span>
              <span>× {quote.parcelMultiplier}</span>
            </div>
            <div
              style={{
                borderTop: '1px solid var(--color-border)',
                paddingTop: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '1.3rem',
                fontWeight: 800,
              }}
            >
              <span>Total Guaranteed Fare:</span>
              <span style={{ color: 'var(--color-brand)' }}>
                KES {(quote.totalAmount / 100).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                fontSize: '0.9rem',
                fontWeight: 700,
                display: 'block',
                marginBottom: '10px',
              }}
            >
              Select Payment Method
            </label>
            <div style={{ display: 'flex', gap: '16px' }}>
              <Button
                type="button"
                variant={paymentMethod === 'MPESA_STK' ? 'primary' : 'secondary'}
                onClick={() => setPaymentMethod('MPESA_STK')}
              >
                <Smartphone size={16} aria-hidden="true" /> M-Pesa STK Push
              </Button>
              <Button
                type="button"
                variant={paymentMethod === 'CASH_ON_DELIVERY' ? 'primary' : 'secondary'}
                onClick={() => setPaymentMethod('CASH_ON_DELIVERY')}
              >
                <Banknote size={16} aria-hidden="true" /> Cash on Delivery (COD)
              </Button>
            </div>
          </div>

          <Button
            size="lg"
            onClick={handleConfirmBooking}
            isLoading={isBooking}
            style={{ width: '100%' }}
          >
            Confirm Booking & Dispatch Rider
          </Button>
        </Card>
      )}
    </div>
  );
};
