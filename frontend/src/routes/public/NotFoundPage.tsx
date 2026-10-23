import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <main
      style={{
        minHeight: '70vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        background: 'var(--color-bg)',
      }}
    >
      <Card style={{ width: 'min(100%, 480px)', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-brand)', fontWeight: 700, margin: 0 }}>404</p>
        <h1 style={{ margin: '8px 0', fontFamily: 'var(--font-heading)' }}>Page not found</h1>
        <p style={{ color: 'var(--color-muted)', margin: '0 0 20px' }}>
          This address does not match a page in Haraka. Check the link or return to the home page.
        </p>
        <Button onClick={() => navigate('/')}>Return home</Button>
      </Card>
    </main>
  );
};
