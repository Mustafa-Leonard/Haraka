import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LiveDot } from '../../components/ui/LiveDot';
import { StatusPill } from '../../components/ui/StatusPill';

export const AdminFleetMapPage: React.FC = () => {
  const [selectedZone, setSelectedZone] = useState<'KILIFI' | 'MALINDI' | 'MOMBASA'>('KILIFI');

  const fleet = [
    {
      id: 'r-001',
      name: 'Juma Kazungu',
      phone: '+254 722 000 002',
      plate: 'KMDF 123X',
      vehicle: 'BODA',
      status: 'ONLINE',
      zone: 'KILIFI',
      location: 'Kilifi Town Centre (-3.6310, 39.8505)',
      battery: '94%',
    },
    {
      id: 'r-002',
      name: 'Hassan Omar',
      phone: '+254 733 111 222',
      plate: 'KTWA 456Y',
      vehicle: 'TUKTUK',
      status: 'ON_JOB',
      zone: 'KILIFI',
      location: 'Bofa Beach corridor (-3.6150, 39.8610)',
      battery: '82%',
    },
    {
      id: 'r-003',
      name: 'Charo Mwambire',
      phone: '+254 744 333 444',
      plate: 'KMDG 789Z',
      vehicle: 'BODA',
      status: 'ONLINE',
      zone: 'MALINDI',
      location: 'Casuarina Road (-3.2250, 40.1200)',
      battery: '88%',
    },
    {
      id: 'r-004',
      name: 'Ali Bakari',
      phone: '+254 755 555 666',
      plate: 'KMDE 321A',
      vehicle: 'BODA',
      status: 'ONLINE',
      zone: 'MOMBASA',
      location: 'Nyali Cinemax (-4.0320, 39.6890)',
      battery: '91%',
    },
  ];

  const filteredFleet = fleet.filter((r) => r.zone === selectedZone);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
            Live Fleet Operations Map
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem' }}>
            High-frequency GPS tracking of all approved boda and tuk-tuk operators.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <LiveDot isLive={true} label="Live Telemetry" />
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['KILIFI', 'MALINDI', 'MOMBASA'] as const).map((z) => (
              <Button
                key={z}
                size="sm"
                variant={selectedZone === z ? 'primary' : 'secondary'}
                onClick={() => setSelectedZone(z)}
              >
                {z}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Simulated Map Display */}
      <Card style={{ padding: '0', overflow: 'hidden' }}>
        <div
          style={{
            height: '380px',
            backgroundColor: '#E4E0DA',
            background: 'radial-gradient(circle, #EFECE6 10%, #E2DDD5 90%)',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🗺️</div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--color-ink)' }}>
              {selectedZone} Coastal Sector Map
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginTop: '4px' }}>
              Showing {filteredFleet.length} active riders in telemetry coverage
            </p>
          </div>

          {/* Simulated Location Pins */}
          {filteredFleet.map((r, i) => (
            <div
              key={r.id}
              style={{
                position: 'absolute',
                top: `${40 + i * 25}%`,
                left: `${30 + i * 20}%`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: '1.8rem' }}>{r.vehicle === 'BODA' ? '🛵' : '🛺'}</div>
              <div style={{ backgroundColor: 'var(--color-brand)', color: '#fff', padding: '2px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800 }}>
                {r.name} ({r.plate})
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Fleet Roster Table */}
      <Card style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px' }}>
          Active Riders in {selectedZone} ({filteredFleet.length})
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                <th style={{ padding: '12px 10px', fontWeight: 600 }}>RIDER NAME</th>
                <th style={{ padding: '12px 10px', fontWeight: 600 }}>VEHICLE</th>
                <th style={{ padding: '12px 10px', fontWeight: 600 }}>STATUS</th>
                <th style={{ padding: '12px 10px', fontWeight: 600 }}>COORDINATES</th>
                <th style={{ padding: '12px 10px', fontWeight: 600 }}>BATTERY</th>
                <th style={{ padding: '12px 10px', fontWeight: 600, textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredFleet.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '14px 10px', fontWeight: 700 }}>
                    {r.name} <br />
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: 400 }}>{r.phone}</span>
                  </td>
                  <td style={{ padding: '14px 10px' }}>
                    <strong>{r.plate}</strong> ({r.vehicle})
                  </td>
                  <td style={{ padding: '14px 10px' }}>
                    <StatusPill status={r.status} />
                  </td>
                  <td style={{ padding: '14px 10px', fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                    {r.location}
                  </td>
                  <td style={{ padding: '14px 10px', fontWeight: 600 }}>
                    🔋 {r.battery}
                  </td>
                  <td style={{ padding: '14px 10px', textAlign: 'right' }}>
                    <Button size="sm" variant="secondary" onClick={() => alert(`Calling rider ${r.name} at ${r.phone}`)}>
                      📞 Contact
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
