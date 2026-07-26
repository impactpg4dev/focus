// focus/src/pages/main/Main.jsx
import React, { useState, useEffect } from 'react';
import { Box, Container, CircularProgress } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import AppBar from '../../components/surface/app-bar/AppBar';
import BottomNavigation from '../../components/navigation/bottom-navigation/BottomNavigation';
import useInactivityTimeout from '../../hooks/useInactivityTimeout';

// Fragments
import Beranda from '../fragment/beranda/Beranda';
import Aktivitas from '../fragment/aktivitas/Aktivitas';
import Notifikasi from '../fragment/notifikasi/Notifikasi';
import Profil from '../fragment/profil/Profil';

// Key untuk sessionStorage
const STORAGE_KEY = 'bottom_nav_value';

const Main = () => {
  const { userData, loading: authLoading } = useAuth();
  
  // 🔥 Aktivasi inactivity timeout
  useInactivityTimeout();

  // Ambil nilai dari sessionStorage saat pertama kali render
  const getInitialNavValue = () => {
    try {
      const savedValue = sessionStorage.getItem(STORAGE_KEY);
      if (savedValue !== null) {
        const parsedValue = parseInt(savedValue, 10);
        // Validasi nilai hanya 0-3
        if (parsedValue >= 0 && parsedValue <= 3) {
          return parsedValue;
        }
      }
      return 0; // Default ke Beranda
    } catch (error) {
      console.error('Error reading from sessionStorage:', error);
      return 0;
    }
  };

  const [navValue, setNavValue] = useState(getInitialNavValue);

  // Simpan ke sessionStorage setiap kali navValue berubah
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, navValue.toString());
    } catch (error) {
      console.error('Error writing to sessionStorage:', error);
    }
  }, [navValue]);

  const handleNavChange = (event, newValue) => {
    setNavValue(newValue);
  };

  // Render content based on navigation
  const renderContent = () => {
    switch (navValue) {
      case 0:
        return <Beranda />;
      case 1:
        return <Aktivitas />;
      case 2:
        return <Notifikasi />;
      case 3:
        return <Profil />;
      default:
        return <Beranda />;
    }
  };

  if (authLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  {/* badgeCounts={{ aktivitas: 5, notifikasi: 3 }} */}
  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', pt: 0 }}>
      <AppBar title="FOCUS" showBackButton={false} showLogout={true} />
      <Container maxWidth="sm" sx={{ pt: 1, pb: 10, px: 1 }}>
        {renderContent()}
      </Container>
      <BottomNavigation 
        value={navValue} 
        onChange={handleNavChange}
        
      />
    </Box>
  );
};

export default Main;