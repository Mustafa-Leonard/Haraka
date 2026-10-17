import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';

export const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const [distanceKm, setDistanceKm] = useState(5);
  const [vehicle, setVehicle] = useState<'BODA' | 'TUKTUK'>('BODA');

  const bodaFare = 100 + distanceKm * 40;
  const tuktukFare = 200 + distanceKm * 60;
  const currentEstimate = vehicle === 'BODA' ? bodaFare : tuktukFare;

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--color-ink)' }}>
          Transparent Coastal Delivery Rates
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '1.1rem', marginTop: '8px' }}>
          No hidden fees or surge pricing surprises. All fares are calculated in integer KES and locked for 5 minutes during booking.
        </p>
      </div>

      {/* Vehicle Rate Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        <Card style={{ borderTop: '4px solid var(--color-brand)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🛵</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Boda-Boda</h2>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-brand)', margin: '16px 0', fontFamily: 'var(--font-heading)' }}>
            KES 100 <span style={{ fontSize: '1rem', color: 'var(--color-muted)', fontWeight: 500 }}>base fare</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.95rem', color: 'var(--color-ink)' }}>
            <li>✓ <strong>KES 40</strong> per kilometer</li>
            <li>✓ Best for envelopes, parcels up to 10kg</li>
            <li>✓ Quickest urban transit in Kilifi, Malindi & Mombasa</li>
            <li>✓ Includes SMS live tracking & delivery PIN</li>
          </ul>
        </Card>

        <Card style={{ borderTop: '4px solid var(--color-merchant)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🛺</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Tuk-Tuk</h2>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-merchant)', margin: '16px 0', fontFamily: 'var(--font-heading)' }}>
            KES 200 <span style={{ fontSize: '1rem', color: 'var(--color-muted)', fontWeight: 500 }}>base fare</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.95rem', color: 'var(--color-ink)' }}>
            <li>✓ <strong>KES 60</strong> per kilometer</li>
            <li>✓ Enclosed cargo up to 50kg (bulky boxes, sacks)</li>
            <li>✓ Weather-protected transit</li>
            <li>✓ Includes SMS live tracking & delivery PIN</li>
          </ul>
        </Card>
      </div>

      {/* Interactive Estimator */}
      <Card style={{ padding: '32px' }}>
        <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '20px' }}>
          Interactive Fare Estimator
        </h3>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <Button
            size="sm"
            variant={vehicle === 'BODA' ? 'primary' : 'secondary'}
            onClick={() => setVehicle('BODA')}
          >
            🛵 Boda-Boda
          </Button>
          <Button
            size="sm"
            variant={vehicle === 'TUKTUK' ? 'primary' : 'secondary'}
            onClick={() => setVehicle('TUKTUK')}
          >
            🛺 Tuk-Tuk
          </Button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
            <span>Estimated Distance:</span>
            <span style={{ color: 'var(--color-brand)', fontWeight: 800 }}>{distanceKm} km</span>
          </div>
          <input
            type="range"
            min={1}
            max={30}
            value={distanceKm}
            onChange={(e) => setDistanceKm(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--color-brand)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-muted)' }}>
            <span>1 km</span>
            <span>15 km</span>
            <span>30 km</span>
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--color-bg)', padding: '20px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)', fontWeight: 600 }}>Guaranteed Estimate</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-ink)', fontFamily: 'var(--font-heading)' }}>
              KES {currentEstimate.toLocaleString()}
            </div>
          </div>
          <Button onClick={() => navigate('/login?mode=register')}>
            Send Parcel at this Rate
          </Button>
        </div>
      </Card>
    </div>
  );
};
