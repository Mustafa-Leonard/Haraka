import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../services/auth.store';

export const MerchantSettingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [businessName, setBusinessName] = useState('Mama Fatuma Spices & Sundries');
  const [businessType, setBusinessType] = useState('Grocery & Retail');
  const [description, setDescription] = useState('Kilifi town wholesale and retail');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
          Merchant Business Settings
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem' }}>
          Configure your business profile, default vehicle preferences, and notification rules.
        </p>
      </div>

      <Card style={{ padding: '28px' }}>
        {saved && (
          <div style={{ backgroundColor: '#FFF0E8', border: '1px solid #FFD4BE', color: '#C2410C', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontWeight: 600 }}>
            ✓ Business profile settings updated successfully.
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input
            label="Business Trading Name"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
          />
          <Input
            label="Business Category"
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
          />
          <Input
            label="Business Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Input
            label="Merchant Contact Phone"
            value={user?.phone || '+254 711 000 001'}
            disabled
            helperText="Primary phone used for authentication and OTP security."
          />
          <Button type="submit" style={{ marginTop: '8px' }}>
            Save Settings
          </Button>
        </form>
      </Card>
    </div>
  );
};
