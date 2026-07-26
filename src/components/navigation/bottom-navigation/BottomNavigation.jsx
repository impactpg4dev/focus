// focus/src/components/navigation/bottom-navigation/BottomNavigation.jsx
import React from 'react';
import { BottomNavigation as MuiBottomNavigation, BottomNavigationAction, Badge, Container } from '@mui/material';
import {
  Home as HomeIcon,
  Assignment as AssignmentIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
} from '@mui/icons-material';

const BottomNavigation = ({ value, onChange, badgeCounts = {} }) => {
  const { aktivitas = 0, notifikasi = 0 } = badgeCounts;

  return (
    <Container 
      maxWidth="sm" 
      sx={{ 
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        px: 0,
        zIndex: 1000,
      }}
    >
      <MuiBottomNavigation
        value={value}
        onChange={onChange}
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          borderRadius: 0,
        }}
      >
        <BottomNavigationAction label="Beranda" icon={<HomeIcon />} />
        <BottomNavigationAction
          label="Aktivitas"
          icon={
            <Badge badgeContent={aktivitas} color="error">
              <AssignmentIcon />
            </Badge>
          }
        />
        <BottomNavigationAction
          label="Notifikasi"
          icon={
            <Badge badgeContent={notifikasi} color="error">
              <NotificationsIcon />
            </Badge>
          }
        />
        <BottomNavigationAction label="Profil" icon={<PersonIcon />} />
      </MuiBottomNavigation>
    </Container>
  );
};

export default BottomNavigation;