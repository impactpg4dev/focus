// focus/src/pages/fragment/beranda/FeatureInfo.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  Wifi as WifiIcon,
  MoreVert as MoreVertIcon,
  WbSunny as WbSunnyIcon,
  CalendarToday as CalendarTodayIcon,
  NetworkCheck as NetworkIcon,
} from '@mui/icons-material';
import NetworkInfoContent from './NetworkInfoContent';
import WeatherInfo from './WeatherInfo';
import CalendarInfo from './CalendarInfo';

// ============================================================
// KOMPONEN UTAMA FeatureInfo
// ============================================================
const FeatureInfo = ({
  networkInfo,
  signalBars,
  isp,
  getNetworkTypeLabel,
  getSignalColor,
  isPengamat, // <-- tambahan
}) => {
  const STORAGE_KEY = 'focus_feature_info_selected';

  // 🔥 Ambil nilai dari sessionStorage saat pertama kali render
  const getInitialFeature = () => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved && ['network', 'weather', 'calendar'].includes(saved)) {
        return saved;
      }
    } catch (e) {
      console.error('Error reading from sessionStorage:', e);
    }
    return 'network';
  };

  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedFeature, setSelectedFeature] = useState(getInitialFeature);

  const open = Boolean(anchorEl);

  // 🔥 Simpan ke sessionStorage setiap kali selectedFeature berubah
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, selectedFeature);
    } catch (e) {
      console.error('Error saving to sessionStorage:', e);
    }
  }, [selectedFeature]);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleFeatureSelect = (feature) => {
    setSelectedFeature(feature);
    handleMenuClose();
  };

  // 🔥 Pilih ikon berdasarkan fitur yang dipilih
  const getHeaderIcon = () => {
    switch (selectedFeature) {
      case 'network':
        return <WifiIcon sx={{ width: '18px' }} />;
      case 'weather':
        return <WbSunnyIcon sx={{ width: '18px' }} />;
      case 'calendar':
        return <CalendarTodayIcon sx={{ width: '18px' }} />;
      default:
        return <WifiIcon sx={{ width: '18px' }} />;
    }
  };

  // Render konten berdasarkan pilihan
  const renderContent = () => {
    switch (selectedFeature) {
      case 'network':
        return (
          <NetworkInfoContent
            networkInfo={networkInfo}
            signalBars={signalBars}
            isp={isp}
            getNetworkTypeLabel={getNetworkTypeLabel}
            getSignalColor={getSignalColor}
          />
        );
      case 'weather':
        return <WeatherInfo />;
      case 'calendar':
        return <CalendarInfo isPengamat={isPengamat} />;
      default:
        return null;
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 2, mx: 1, borderRadius: '4px' }}>
      {/* Header dengan judul dan icon more vert */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}
          >
            {getHeaderIcon()}
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Informasi
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedFeature === 'network' && 'Status dan kualitas jaringan saat ini'}
              {selectedFeature === 'weather' && 'Informasi cuaca terkini'}
              {selectedFeature === 'calendar' && 'Jadwal dan kegiatan'}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={handleMenuOpen}>
          <MoreVertIcon />
        </IconButton>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Konten dinamis */}
      {renderContent()}

      {/* Menu Popover */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem
          onClick={() => handleFeatureSelect('network')}
          selected={selectedFeature === 'network'}
          sx={{
            ...(selectedFeature === 'network' && {
              bgcolor: 'primary.light',
              color: 'primary.main',
              '& .MuiListItemIcon-root': { color: 'primary.main' },
            }),
          }}
        >
          <NetworkIcon fontSize="small" sx={{ mr: 1 }} />
          Informasi Jaringan
        </MenuItem>
        <MenuItem
          onClick={() => handleFeatureSelect('weather')}
          selected={selectedFeature === 'weather'}
          sx={{
            ...(selectedFeature === 'weather' && {
              bgcolor: 'primary.light',
              color: 'primary.main',
              '& .MuiListItemIcon-root': { color: 'primary.main' },
            }),
          }}
        >
          <WbSunnyIcon fontSize="small" sx={{ mr: 1 }} />
          Informasi Cuaca
        </MenuItem>
        <MenuItem
          onClick={() => handleFeatureSelect('calendar')}
          selected={selectedFeature === 'calendar'}
          sx={{
            ...(selectedFeature === 'calendar' && {
              bgcolor: 'primary.light',
              color: 'primary.main',
              '& .MuiListItemIcon-root': { color: 'primary.main' },
            }),
          }}
        >
          <CalendarTodayIcon fontSize="small" sx={{ mr: 1 }} />
          Calender
        </MenuItem>
      </Menu>
    </Paper>
  );
};

export default FeatureInfo;