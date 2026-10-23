import React, { useEffect } from 'react';
import { useAuthStore } from '../services/auth.store';
import { useThemeStore } from '../services/theme.store';
import { AppRouter } from './router';

const App: React.FC = () => {
  const { theme } = useThemeStore();

  // Apply theme class to document root
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
  }, [theme]);

  return <AppRouter />;
};

export default App;
