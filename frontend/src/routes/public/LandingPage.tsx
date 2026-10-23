import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { CreditCard, MapPinned, PackageCheck, Zap } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '60px', paddingBottom: '80px' }}>
      {/* Hero Section */}
      <section
        className="landing-hero"
        style={{
          background: 'linear-gradient(135deg, #4B5563 0%, #6B7280 100%)',
          padding: '80px 24px',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-block',
              padding: '6px 16px',
              borderRadius: '20px',
              backgroundColor: 'rgba(255, 255, 255, 0.14)',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '0.85rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '20px',
            }}
          >
            Coastal Kenya On-Demand Logistics
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
              fontWeight: 800,
              color: '#FFFFFF',
              lineHeight: 1.15,
              marginBottom: '24px',
            }}
          >
            Fast, Trusted Deliveries in <br />
            <span style={{ color: '#FFC09A' }}>Kilifi, Malindi & Mombasa</span>
          </h1>
          <p
            style={{
              fontSize: '1.2rem',
              color: '#F3F4F6',
              maxWidth: '680px',
              margin: '0 auto 36px',
              lineHeight: 1.6,
            }}
          >
            Connecting local shopkeepers, restaurants, pharmacies, and senders with verified
            boda-boda and tuk-tuk riders. Transparent fares, secure pickup & delivery PINs, and
            instant M-Pesa payments.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <Button size="lg" onClick={() => navigate('/login?mode=register')}>
              Start Sending Today
            </Button>
            <Button size="lg" variant="secondary" onClick={() => navigate('/pricing')}>
              Check Delivery Rates
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/login?role=rider')}>
              Join as a Rider
            </Button>
          </div>
        </div>
      </section>

      {/* Trust & Stats Bar */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', width: '100%', padding: '0 24px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '24px',
          }}
        >
          <Card>
            <Zap
              size={30}
              aria-hidden="true"
              style={{ marginBottom: 8, color: 'var(--color-brand)' }}
            />
            <div style={{ fontWeight: 800, fontSize: '1.3rem', fontFamily: 'var(--font-heading)' }}>
              15-Second Match
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-muted)', marginTop: '4px' }}>
              Automated spatial dispatch matches the nearest verified boda rider immediately.
            </p>
          </Card>

          <Card>
            <PackageCheck
              size={30}
              aria-hidden="true"
              style={{ marginBottom: 8, color: 'var(--color-brand)' }}
            />
            <div style={{ fontWeight: 800, fontSize: '1.3rem', fontFamily: 'var(--font-heading)' }}>
              Two-Way PIN Proof
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-muted)', marginTop: '4px' }}>
              Pickup PIN confirms collection with the merchant; delivery PIN verifies the recipient.
            </p>
          </Card>

          <Card>
            <CreditCard
              size={30}
              aria-hidden="true"
              style={{ marginBottom: 8, color: 'var(--color-brand)' }}
            />
            <div style={{ fontWeight: 800, fontSize: '1.3rem', fontFamily: 'var(--font-heading)' }}>
              M-Pesa STK & COD
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-muted)', marginTop: '4px' }}>
              Instant Safaricom STK push or tracked cash-on-delivery settled via double-entry
              ledger.
            </p>
          </Card>

          <Card>
            <MapPinned
              size={30}
              aria-hidden="true"
              style={{ marginBottom: 8, color: 'var(--color-brand)' }}
            />
            <div style={{ fontWeight: 800, fontSize: '1.3rem', fontFamily: 'var(--font-heading)' }}>
              Coastal Zones
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-muted)', marginTop: '4px' }}>
              Serving Kilifi town, Malindi, and Greater Mombasa with transparent per-kilometer
              rates.
            </p>
          </Card>
        </div>
      </section>

      {/* Workflow Section */}
      <section style={{ maxWidth: '1000px', margin: '0 auto', width: '100%', padding: '0 24px' }}>
        <h2
          style={{
            textAlign: 'center',
            fontSize: '2rem',
            fontWeight: 800,
            fontFamily: 'var(--font-heading)',
            marginBottom: '40px',
          }}
        >
          How Haraka Works
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '32px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-brand)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
              }}
            >
              1
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Request a Locked Quote</h3>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem' }}>
              Enter pickup and dropoff points to receive a fare quote before booking.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-brand)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
              }}
            >
              2
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Spatial Rider Dispatch</h3>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem' }}>
              Nearby verified riders receive 15-second exclusive offers. Once accepted, the rider
              arrives at pickup.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-brand)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
              }}
            >
              3
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Live Tracking & Delivery PIN</h3>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem' }}>
              Recipient receives SMS tracking link. When the rider arrives, the recipient provides
              their delivery PIN to complete the trip.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
