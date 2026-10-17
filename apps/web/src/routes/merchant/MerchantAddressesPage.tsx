import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { apiClient } from '@haraka/api-client';
import type { AddressDto } from '@haraka/shared-types';

export const MerchantAddressesPage: React.FC = () => {
  const [addresses, setAddresses] = useState<AddressDto[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('Main Shop');
  const [town, setTown] = useState('Kilifi');
  const [area, setArea] = useState('Town Centre');
  const [street, setStreet] = useState('Biashara Street');
  const [instructions, setInstructions] = useState('Near Old Post Office');
  const [isSaving, setIsSaving] = useState(false);

  const fetchAddresses = async () => {
    try {
      const res = await apiClient.getAddresses();
      setAddresses(res);
    } catch {}
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await apiClient.createAddress({
        label,
        town,
        area,
        street,
        instructions,
        isDefault: addresses.length === 0,
      });
      setShowForm(false);
      await fetchAddresses();
    } catch {
      alert('Failed to save address');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
            Saved Business Addresses
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem' }}>
            Store frequent pickup locations for quick one-click booking.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Address'}
        </Button>
      </div>

      {showForm && (
        <Card style={{ padding: '24px', border: '2px solid var(--color-brand)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px' }}>Add New Location</h2>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <Input
              label="Location Label"
              placeholder="e.g. Main Shop / Sea Horse Branch"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
            />
            <Select
              label="Town"
              value={town}
              onChange={(e) => setTown(e.target.value)}
              options={[
                { value: 'Kilifi', label: 'Kilifi' },
                { value: 'Malindi', label: 'Malindi' },
                { value: 'Mombasa', label: 'Mombasa' },
              ]}
            />
            <Input
              label="Neighborhood / Area"
              placeholder="e.g. Bofa / Town Centre"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              required
            />
            <Input
              label="Street / Building"
              placeholder="e.g. Biashara Street, 1st Floor"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              required
            />
            <Input
              label="Driver Instructions / Landmark"
              placeholder="e.g. Opposite the stage"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
            <Button type="submit" isLoading={isSaving} style={{ marginTop: '8px' }}>
              Save Address
            </Button>
          </form>
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {addresses.map((addr) => (
          <Card key={addr.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '1.1rem' }}>{addr.label || 'Branch'}</strong>
              {addr.isDefault && (
                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#FFF0E8', color: 'var(--color-brand)' }}>
                  DEFAULT
                </span>
              )}
            </div>
            <div style={{ fontWeight: 600 }}>{addr.street}</div>
            <div style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>{addr.area}, {addr.town}</div>
            {addr.instructions && (
              <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '4px' }}>
                Note: {addr.instructions}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};
