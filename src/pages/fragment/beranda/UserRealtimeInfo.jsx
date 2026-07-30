import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  CircularProgress,
  Tooltip,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  Wifi as WifiIcon,
  SignalCellularAlt as CellularIcon,
  LocationOn as LocationIcon,
  Computer as ComputerIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as OnlineIcon,
  Cancel as OfflineIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../context/AuthContext';
import { getIP, getCombinedLocation, getConnectionType } from '../../../utils/sessionUtils';

const UserRealtimeInfo = () => {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [ip, setIp] = useState(null);
  const [location, setLocation] = useState(null);
  const [connectionType, setConnectionType] = useState('unknown');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [expanded, setExpanded] = useState(false);

  // Ambil data realtime
  const fetchRealtimeData = async () => {
    try {
      const ipAddress = await getIP();
      setIp(ipAddress);

      const loc = await getCombinedLocation(ipAddress);
      setLocation(loc);

      const conn = getConnectionType();
      setConnectionType(conn);
    } catch (error) {
      console.error('Error fetching realtime data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealtimeData();

    // Refresh setiap 30 detik
    const interval = setInterval(() => {
      fetchRealtimeData();
    }, 30000);

    // Update status online/offline
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleExpand = () => setExpanded(!expanded);

  if (!userData) return null;

  const getNetworkLabel = () => {
    if (connectionType === 'wifi') return 'WiFi';
    if (connectionType === 'cellular') return 'Cellular';
    return connectionType.toUpperCase() || 'Unknown';
  };

  const getSignalIcon = () => {
    if (!isOnline) return <OfflineIcon color="error" />;
    if (connectionType === 'wifi') return <WifiIcon color="success" />;
    return <CellularIcon color="primary" />;
  };

  return (
    <Paper
      sx={{
        p: 1.5,
        mb: 2,
        mx: 1,
        borderRadius: '4px',
        backgroundColor: isOnline ? 'background.paper' : '#fff3e0',
        border: isOnline ? '1px solid' : '1px solid',
        borderColor: isOnline ? 'divider' : 'error.light',
        transition: 'all 0.3s',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Tooltip title={isOnline ? 'Online' : 'Offline'}>
            <Chip
              icon={isOnline ? <OnlineIcon fontSize="small" /> : <OfflineIcon fontSize="small" />}
              label={isOnline ? 'Online' : 'Offline'}
              color={isOnline ? 'success' : 'error'}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 500 }}
            />
          </Tooltip>

          {loading ? (
            <CircularProgress size={20} />
          ) : (
            <>
              <Tooltip title="IP Address">
                <Chip
                  icon={<ComputerIcon fontSize="small" />}
                  label={ip || '-'}
                  size="small"
                  variant="outlined"
                />
              </Tooltip>

              <Tooltip title="Koneksi">
                <Chip
                  icon={getSignalIcon()}
                  label={getNetworkLabel()}
                  size="small"
                  variant="outlined"
                />
              </Tooltip>

              {location && location.lat && location.lon && (
                <Tooltip title={`Koordinat: ${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`}>
                  <Chip
                    icon={<LocationIcon fontSize="small" />}
                    label={`${location.city || '-'}, ${location.country || '-'}`}
                    size="small"
                    variant="outlined"
                  />
                </Tooltip>
              )}
            </>
          )}
        </Box>

        <IconButton size="small" onClick={toggleExpand}>
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            <strong>Detail Informasi:</strong>
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary">IP Address:</Typography>
            <Typography variant="caption">{ip || '-'}</Typography>

            <Typography variant="caption" color="text.secondary">Kota:</Typography>
            <Typography variant="caption">{location?.city || '-'}</Typography>

            <Typography variant="caption" color="text.secondary">Negara:</Typography>
            <Typography variant="caption">{location?.country || '-'}</Typography>

            <Typography variant="caption" color="text.secondary">Latitude:</Typography>
            <Typography variant="caption">{location?.lat ? location.lat.toFixed(4) : '-'}</Typography>

            <Typography variant="caption" color="text.secondary">Longitude:</Typography>
            <Typography variant="caption">{location?.lon ? location.lon.toFixed(4) : '-'}</Typography>

            <Typography variant="caption" color="text.secondary">Akurasi:</Typography>
            <Typography variant="caption">
              {location?.accuracy ? `${Math.round(location.accuracy)} m` : '-'}
            </Typography>

            <Typography variant="caption" color="text.secondary">Sumber Lokasi:</Typography>
            <Typography variant="caption">{location?.source || '-'}</Typography>

            <Typography variant="caption" color="text.secondary">ISP:</Typography>
            <Typography variant="caption">{location?.isp || '-'}</Typography>
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default UserRealtimeInfo;