import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { apiClient } from '@haraka/api-client';

const VEHICLE_TYPES = ['BODA', 'TUKTUK', 'MINIVAN'] as const;
const PARCEL_SIZES = ['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE'] as const;

export const AdminPricingPage: React.FC = () => {
  const [editId, setEditId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, number | string>>({});
  const [editError, setEditError] = useState('');
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneSlug, setNewZoneSlug] = useState('');
  const [zoneError, setZoneError] = useState('');
  const qc = useQueryClient();

  const { data: rules, isLoading: rulesLoading } = useQuery({
    queryKey: ['admin-pricing-rules'],
    queryFn: () => apiClient.adminGetPricingRules(),
  });

  const { data: zones, isLoading: zonesLoading } = useQuery({
    queryKey: ['admin-service-zones'],
    queryFn: () => apiClient.adminGetServiceZones(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      apiClient.adminUpdatePricingRule(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-pricing-rules'] });
      setEditId(null);
      setEditValues({});
      setEditError('');
    },
    onError: (err: any) => setEditError(err?.response?.data?.message || 'Update failed'),
  });

  const createZoneMutation = useMutation({
    mutationFn: () =>
      apiClient.adminCreateServiceZone({
        name: newZoneName,
        slug: newZoneSlug,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-service-zones'] });
      setNewZoneName('');
      setNewZoneSlug('');
      setZoneError('');
    },
    onError: (err: any) => setZoneError(err?.response?.data?.message || 'Zone creation failed'),
  });

  const startEdit = (rule: any) => {
    setEditId(rule.id);
    setEditValues({
      baseFare: rule.baseFare,
      perKmRate: rule.perKmRate,
      minimumFare: rule.minimumFare,
    });
    setEditError('');
  };

  const saveEdit = () => {
    if (!editId) return;
    const payload: Record<string, unknown> = {};
    if (editValues.baseFare !== undefined) payload.baseFare = Number(editValues.baseFare);
    if (editValues.perKmRate !== undefined) payload.perKmRate = Number(editValues.perKmRate);
    if (editValues.minimumFare !== undefined) payload.minimumFare = Number(editValues.minimumFare);
    updateMutation.mutate({ id: editId, payload });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
          Pricing &amp; Service Zones
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem' }}>
          Manage fare rules per vehicle type. All amounts in KES minor units (1 KES = 100).
        </p>
      </div>

      {/* Pricing Rules */}
      <section>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Active Pricing Rules</h2>
        {rulesLoading && <p style={{ color: 'var(--color-muted)' }}>Loading rules…</p>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {(rules ?? []).map((rule: any) => (
            <Card key={rule.id} style={{ padding: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '3px 12px',
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(255,106,31,0.12)',
                      color: 'var(--color-brand)',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                    }}
                  >
                    {rule.vehicleType}
                  </span>
                  {rule.zoneName && (
                    <span style={{ marginLeft: '8px', fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                      Zone: {rule.zoneName}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>v{rule.version}</span>
              </div>

              {editId === rule.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <Input
                    label="Base Fare (minor units)"
                    type="number"
                    value={editValues.baseFare as number}
                    onChange={(e) => setEditValues((v) => ({ ...v, baseFare: e.target.value }))}
                  />
                  <Input
                    label="Per KM Rate (minor units)"
                    type="number"
                    value={editValues.perKmRate as number}
                    onChange={(e) => setEditValues((v) => ({ ...v, perKmRate: e.target.value }))}
                  />
                  <Input
                    label="Minimum Fare (minor units)"
                    type="number"
                    value={editValues.minimumFare as number}
                    onChange={(e) => setEditValues((v) => ({ ...v, minimumFare: e.target.value }))}
                  />
                  {editError && (
                    <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>{editError}</p>
                  )}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button size="sm" onClick={saveEdit} disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? 'Saving…' : '✓ Save Changes'}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    {[
                      { label: 'Base Fare', value: rule.baseFare },
                      { label: 'Per KM Rate', value: rule.perKmRate },
                      { label: 'Minimum Fare', value: rule.minimumFare },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ color: 'var(--color-muted)' }}>{label}</span>
                        <span style={{ fontWeight: 700 }}>
                          KES {(value / 100).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {rule.parcelMultipliers?.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: 600, marginBottom: '6px' }}>
                        PARCEL MULTIPLIERS
                      </div>
                      {rule.parcelMultipliers.map((pm: any) => (
                        <div key={pm.parcelSize} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span>{pm.parcelSize}</span>
                          <span style={{ fontWeight: 700 }}>×{pm.multiplier}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '12px' }}>
                    Effective: {new Date(rule.effectiveFrom).toLocaleDateString('en-KE')}
                    {rule.effectiveTo ? ` → ${new Date(rule.effectiveTo).toLocaleDateString('en-KE')}` : ' (ongoing)'}
                  </div>

                  <Button size="sm" variant="secondary" onClick={() => startEdit(rule)}>
                    ✏️ Edit Fares
                  </Button>
                </>
              )}
            </Card>
          ))}
        </div>
      </section>

      {/* Service Zones */}
      <section>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Service Zones</h2>

        {zonesLoading && <p style={{ color: 'var(--color-muted)' }}>Loading zones…</p>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {(zones ?? []).map((zone: any) => (
            <Card key={zone.id} style={{ padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{zone.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontFamily: 'monospace' }}>
                    {zone.slug}
                  </div>
                </div>
                <span
                  style={{
                    width: '10px', height: '10px', borderRadius: '50%',
                    backgroundColor: zone.isActive ? 'var(--color-brand)' : '#9CA3AF',
                    flexShrink: 0,
                  }}
                />
              </div>
              {zone.description && (
                <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginTop: '8px' }}>
                  {zone.description}
                </p>
              )}
            </Card>
          ))}
        </div>

        {/* Add zone */}
        <Card style={{ padding: '22px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '14px' }}>Add New Service Zone</h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <Input
              label="Zone Name"
              placeholder="e.g. Watamu"
              value={newZoneName}
              onChange={(e) => setNewZoneName(e.target.value)}
              style={{ flex: '1 1 200px', marginBottom: 0 }}
            />
            <Input
              label="Slug (lowercase-hyphen)"
              placeholder="e.g. watamu"
              value={newZoneSlug}
              onChange={(e) => setNewZoneSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              style={{ flex: '1 1 200px', marginBottom: 0 }}
            />
            <Button
              disabled={!newZoneName.trim() || !newZoneSlug.trim() || createZoneMutation.isPending}
              onClick={() => createZoneMutation.mutate()}
            >
              {createZoneMutation.isPending ? 'Creating…' : '+ Add Zone'}
            </Button>
          </div>
          {zoneError && (
            <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginTop: '8px' }}>{zoneError}</p>
          )}
          <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '10px' }}>
            After creating a zone, configure its pricing rules separately via the admin API or database seed.
          </p>
        </Card>
      </section>
    </div>
  );
};
