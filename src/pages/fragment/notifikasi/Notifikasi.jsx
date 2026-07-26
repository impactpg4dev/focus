// focus/src/pages/fragment/notifikasi/Notifikasi.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  CircularProgress,
  Divider,
  Chip,
} from '@mui/material';
import {
  NotificationsActive as NotificationsActiveIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

const Notifikasi = () => {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      setNotifications([
        {
          id: 1,
          title: 'Aktivitas menunggu approval',
          message: 'Pengamatan Tanaman - Plot A1 membutuhkan approval Anda',
          time: '10 menit lalu',
          type: 'warning',
          isRead: false,
        },
        {
          id: 2,
          title: 'Aktivitas disetujui',
          message: 'Stock Opname - Gudang Pusat telah disetujui oleh Mandor',
          time: '1 jam lalu',
          type: 'success',
          isRead: false,
        },
        {
          id: 3,
          title: 'Aktivitas ditolak',
          message: 'Pengamatan Hama - Plot B2 ditolak dengan catatan revisi',
          time: '2 jam lalu',
          type: 'error',
          isRead: true,
        },
        {
          id: 4,
          title: 'Aktivitas baru dibuat',
          message: 'Pemupukan - Plot C1 telah dibuat oleh Pengamat',
          time: '3 jam lalu',
          type: 'info',
          isRead: true,
        },
      ]);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'success':
        return <CheckCircleIcon color="success" />;
      case 'error':
        return <NotificationsActiveIcon color="error" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  const getStatusChip = (isRead) => {
    return isRead ? (
      <Chip size="small" label="Dibaca" variant="outlined" />
    ) : (
      <Chip size="small" color="primary" label="Baru" />
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ px: 0 }}>
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 1, mt: 1, mx: 1 }}>
        Notifikasi
      </Typography>

      <Paper sx={{ p: 3, mb: 3, mx: 1, borderRadius: '4px', textAlign: 'center', position: 'relative' }}>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
          Sistem notifikasi dalam tahap pengembangan 
        </Typography>
      </Paper>
    </Box>
  );
};

export default Notifikasi;