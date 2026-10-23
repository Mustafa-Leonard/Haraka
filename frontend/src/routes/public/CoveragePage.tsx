import React from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';

export const CoveragePage: React.FC = () => {
  const navigate = useNavigate();

  const zones = [
    {
      name: 'Kilifi Zone',
      tag: 'Launch Base',
      areas: ['Kilifi Town', 'Old Town', 'Bofa Beach', 'Sea Horse', 'Pwani University Corridor', 'Mnarani', 'Kibarani'],
      status: 'Active Fleet',
    },
    {
      name: 'Malindi Zone',
      tag: 'North Coast Hub',
      areas: ['Malindi Town Centre', 'Casuarina', 'Mtangani', 'Malindi Airport', 'Vasco da Gama Corridor', 'Sabaki'],
      status: 'Active Fleet',
    },
    {
      name: 'Mombasa Zone',
      tag: 'Metropolitan Fleet',
      areas: ['Mombasa Island', 'Nyali', 'Bamburi', 'Likoni Ferry Link', 'Changamwe', 'Kizingo', 'Mtwapa Bridge'],
      status: 'Active Fleet',
    },
  ];

  return (
    <div style={{ maxWidth: '960px', margin: '40px auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: '36px' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
          Operating Coverage Areas
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '1.1rem', marginTop: '8px' }}>
          Real-time on-demand delivery available across coastal Kenya. Dynamic service zones allow expansion without software downtime.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        {zones.map((z) => (
          <Card key={z.name} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', backgroundColor: '#FFF0E8', color: 'var(--color-brand)' }}>
                {z.tag}
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#C2410C' }}>
                ● {z.status}
              </span>
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{z.name}</h2>

            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-muted)', marginBottom: '8px' }}>
                Covered Localities:
              </div>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem' }}>
                {z.areas.map((a) => (
                  <li key={a} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: 'var(--color-brand)' }}>•</span> {a}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '32px', textAlign: 'center' }}>
        <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '8px' }}>Expanding to Other Coastal Towns</h3>
        <p style={{ color: 'var(--color-muted)', maxWidth: '600px', margin: '0 auto 20px', fontSize: '0.95rem' }}>
          Are you a merchant or riders' SACCO in Watamu, Diani, or Lamu? Contact operations to request early zone enablement.
        </p>
        <Button onClick={() => navigate('/login?mode=register')}>
          Register Your Business
        </Button>
      </div>
    </div>
  );
};
