import React from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';

export const HowItWorksPage: React.FC = () => {
  const navigate = useNavigate();

  const steps = [
    {
      num: '01',
      title: 'Merchant Books Delivery',
      desc: 'Enter the recipient phone number and delivery addresses. Haraka calculates the route and provides a fare quote before booking.',
    },
    {
      num: '02',
      title: 'Instant Rider Matching',
      desc: 'The dispatch service queries eligible nearby riders. A rider receives an exclusive 15-second delivery offer in the app.',
    },
    {
      num: '03',
      title: 'Pickup PIN Verification',
      desc: 'The rider arrives at the pickup location. The merchant shares a secure 4-digit Pickup PIN, which the rider verifies before taking custody of the parcel.',
    },
    {
      num: '04',
      title: 'Live Tracking SMS',
      desc: 'The recipient receives an SMS notification with an opaque tracking link and can check the delivery status.',
    },
    {
      num: '05',
      title: 'Delivery Confirmation PIN',
      desc: 'Upon arrival, the recipient verbally provides their confidential Delivery PIN. The rider verifies it in the app to confirm delivery.',
    },
  ];

  return (
    <div style={{ maxWidth: '840px', margin: '40px auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: '36px' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
          How Haraka Delivery Works
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '1.1rem', marginTop: '8px' }}>
          Step-by-step transparency with verified custody handoffs at every stage.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {steps.map((s) => (
          <Card key={s.num} style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', padding: '24px' }}>
            <div
              style={{
                fontSize: '1.8rem',
                fontWeight: 800,
                color: 'var(--color-brand)',
                fontFamily: 'var(--font-heading)',
                minWidth: '50px',
              }}
            >
              {s.num}
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '6px' }}>{s.title}</h2>
              <p style={{ color: 'var(--color-muted)', lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <Button size="lg" onClick={() => navigate('/login?mode=register')}>
          Get Started Now
        </Button>
      </div>
    </div>
  );
};
