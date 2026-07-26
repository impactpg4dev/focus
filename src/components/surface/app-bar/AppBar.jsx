// focus/src/components/surface/app-bar/AppBar.jsx
import React, { useState } from 'react';
import { 
  AppBar as MuiAppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Container,
  Box,
} from '@mui/material';
import { 
  Logout as LogoutIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { auth, signOut } from '../../../config/firebase';
import { logoutSession } from '../../../utils/sessionUtils';
import Dialog from '../../feedback/dialog/Dialog';

const AppBar = ({ 
  title = 'FOCUS', 
  showBackButton = false,
  onBackClick,
  showLogout = true,
}) => {
  const navigate = useNavigate();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogoutClick = () => {
    setLogoutDialogOpen(true);
  };

  const handleLogoutCancel = () => {
    setLogoutDialogOpen(false);
  };

  const handleLogoutConfirm = async () => {
    setLoading(true);
    try {
      const sessionId = localStorage.getItem('focus_session_id');
      if (sessionId) {
        await logoutSession(sessionId, 'manual');
        localStorage.removeItem('focus_session_id');
      }
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setLoading(false);
      setLogoutDialogOpen(false);
    }
  };

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      navigate(-1);
    }
  };

  return (
    <>
      <Box sx={{ height: 64, flexShrink: 0 }} /> {/* Spacer untuk fixed AppBar */}
      <Box sx={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        display: 'flex',
        justifyContent: 'center',
      }}>
        <Container maxWidth="sm" sx={{ px: 0 }}>
          <MuiAppBar 
            position="static" 
            elevation={2}
            sx={{ 
              bgcolor: 'primary.main',
              width: '100%',
              borderRadius: 0,
            }}
          >
            <Toolbar sx={{ px: 1 }}>
              {showBackButton ? (
                <IconButton 
                  color="inherit" 
                  onClick={handleBackClick}
                  sx={{ mr: 1 }}
                >
                  <ArrowBackIcon />
                </IconButton>
              ) : null}
              <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold', ml:1 }}>
                {title}
              </Typography>
              {showLogout && (
                <IconButton color="inherit" onClick={handleLogoutClick}>
                  <LogoutIcon />
                </IconButton>
              )}
            </Toolbar>
          </MuiAppBar>
        </Container>
      </Box>

      {/* Logout Confirmation Dialog with Slide Animation */}
      <Dialog
        open={logoutDialogOpen}
        onClose={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
        title="Konfirmasi Logout"
        message="Apakah Anda yakin ingin keluar dari aplikasi?"
        variant="warning"
        confirmText="Logout"
        cancelText="Batal"
        confirmColor="error"
        loading={loading}
      />
    </>
  );
};

export default AppBar;