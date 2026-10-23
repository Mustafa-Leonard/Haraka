import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { LiveDot } from '../../components/ui/LiveDot';
import { StatusPill } from '../../components/ui/StatusPill';
import { apiClient } from '@haraka/api-client';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import type { AdminFleetRiderDto } from '@haraka/shared-types';

export const AdminFleetMapPage: React.FC = () => {
  const { data: fleet = [], isLoading, error } = useQuery({
    queryKey: ['admin-fleet-telemetry'],
    queryFn: () => apiClient.adminGetFleet(),
    refetchInterval: 10000, // Poll telemetry every 10s
  });
  const mappedFleet = fleet.filter(
    (rider): rider is AdminFleetRiderDto & { lat: number; lng: number } =>
      rider.lat !== null && rider.lng !== null,
  );
  const mapCenter: [number, number] = mappedFleet.length > 0
    ? [mappedFleet[0]!.lat, mappedFleet[0]!.lng]
    : [-3.6305, 39.8499];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
            Live Fleet Operations Map
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem' }}>
            Real-time GPS telemetry from approved boda and tuk-tuk riders stored in PostgreSQL/PostGIS.
          </p>
        </div>

        <LiveDot isLive={!error} label={error ? 'Unavailable' : 'Refreshes every 10s'} />
      </div>

      {isLoading && <p style={{ color: 'var(--color-muted)' }}>Querying PostGIS fleet locations…</p>}
      {error && <p style={{ color: 'var(--color-danger)' }}>Failed to load fleet coordinates from database.</p>}

      <Card style={{ padding: '0', overflow: 'hidden' }}>
        <MapContainer center={mapCenter} zoom={12} scrollWheelZoom={false} style={{ height: 380, width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {mappedFleet.map((rider) => (
            <CircleMarker
              key={rider.id}
              center={[rider.lat, rider.lng]}
              radius={8}
              pathOptions={{ color: '#FF6A1F', fillColor: '#FF6A1F', fillOpacity: 0.9 }}
            >
              <Popup>
                <strong>{rider.name ?? 'Unnamed rider'}</strong>
                <br />
                {rider.vehicle ?? 'Vehicle not assigned'}
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
        {mappedFleet.length === 0 && !isLoading && !error && (
          <p style={{ padding: 16, color: 'var(--color-muted)' }}>
            No online riders currently have a GPS location.
          </p>
        )}
      </Card>

      {/* Database Fleet Roster Table */}
      <Card style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
            Fleet Telemetry Roster ({fleet.length})
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
            Data source: PostgreSQL / PostGIS 16
          </span>
        </div>

        {fleet.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px', color: 'var(--color-muted)' }}>
            No riders currently broadcasting GPS coordinates. Approved riders appear here upon going Online in their PWA.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                  <th style={{ padding: '12px 10px', fontWeight: 600 }}>RIDER NAME</th>
                  <th style={{ padding: '12px 10px', fontWeight: 600 }}>PHONE</th>
                  <th style={{ padding: '12px 10px', fontWeight: 600 }}>VEHICLE</th>
                  <th style={{ padding: '12px 10px', fontWeight: 600 }}>STATUS</th>
                  <th style={{ padding: '12px 10px', fontWeight: 600 }}>LATITUDE / LONGITUDE</th>
                </tr>
              </thead>
              <tbody>
                {fleet.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '14px 10px', fontWeight: 700 }}>
                      {r.name || 'Unnamed Rider'}
                    </td>
                    <td style={{ padding: '14px 10px', color: 'var(--color-muted)' }}>
                      {r.phone || '—'}
                    </td>
                    <td style={{ padding: '14px 10px' }}>
                      {r.vehicle || '—'}
                    </td>
                    <td style={{ padding: '14px 10px' }}>
                      <StatusPill status={r.status} />
                    </td>
                    <td style={{ padding: '14px 10px', fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--color-muted)' }}>
                      {r.lat === null || r.lng === null ? 'No GPS fix' : `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
