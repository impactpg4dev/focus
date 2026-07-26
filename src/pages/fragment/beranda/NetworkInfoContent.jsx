// focus/src/pages/fragment/beranda/NetworkInfoContent.jsx
import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Divider,
} from '@mui/material';
import {
  NetworkCheck as NetworkIcon,
  Timer as TimerIcon,
  SignalCellularAlt as CellularIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  Wifi as WifiIcon,
} from '@mui/icons-material';

// Komponen widget bersih tanpa border/shadow
const NetworkMetric = ({ icon, label, value, color = 'text.primary', children }) => (
  <Box
    sx={{
      p: 0,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: 'background.paper',
      borderRadius: 1,
    }}
  >
    <Box sx={{ color: `${color}.main`, mb: 0.5 }}>
      {icon}
    </Box>
    <Typography variant="body2" fontWeight="500" sx={{textAlign: 'center', width: '100%' }}>
      {label}
    </Typography>
    <Box sx={{textAlign: 'center', width: '100%' }}>
      {children || (
        <Typography variant="caption" color="text.secondary">
          {value || '-'}
        </Typography>
      )}
    </Box>
  </Box>
);

const NetworkInfoContent = ({
  networkInfo,
  signalBars,
  isp,
  getNetworkTypeLabel,
  getSignalColor,
}) => {
  const { isOnline, downlink, rtt, saveData, uplink } = networkInfo;

  // Format ISP: jika 'Tidak diketahui' tampilkan '-'
  const displayIsp = isp === 'Tidak diketahui' ? '-' : isp;

  return (
    <Box>
      {/* CSS Grid: selalu 4 kolom per baris */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 1,
        }}
      >
        {/* Status Koneksi */}
        <NetworkMetric
          icon={<NetworkIcon fontSize="medium" color={isOnline ? 'success' : 'error'} />}
          label="Status"
        >
          <Chip
            label={isOnline ? 'Online' : 'Offline'}
            color={isOnline ? 'success' : 'error'}
            size="small"
            sx={{ fontWeight: 600, fontSize: '0.7rem' }}
          />
        </NetworkMetric>

        {/* Internet Service Provider (ISP) */}
        <NetworkMetric
          icon={<CellularIcon fontSize="medium" color="primary" />}
          label="ISP"
          value={displayIsp}
        />

        {/* Tipe Jaringan */}
        <NetworkMetric
          icon={<WifiIcon fontSize="medium" color="primary" />}
          label="Jaringan"
          value={getNetworkTypeLabel()}
        />

        {/* Kekuatan Sinyal - custom dengan bar di atas label */}
        <Box
          sx={{
            p: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.paper',
            borderRadius: 1,
          }}
        >
          {/* Bar Sinyal (ditempatkan di atas label) */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-end', height: 24 }}>
              {[1, 2, 3, 4, 5].map((bar) => (
                <Box
                  key={bar}
                  sx={{
                    width: 6,
                    height: bar * 3.5,
                    bgcolor: bar <= signalBars ? getSignalColor() : '#e0e0e0',
                    mr: 0.4,
                    borderRadius: 1,
                    transition: 'background-color 0.3s',
                  }}
                />
              ))}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
              {signalBars}/5
            </Typography>
          </Box>

          {/* Label di bawah bar */}
          <Typography variant="caption" color="text.secondary" align="center" sx={{ fontWeight: 500 }}>
            Kekuatan<br/>Sinyal
          </Typography>
        </Box>

        {/* Kecepatan Unduh */}
        <NetworkMetric
          icon={<ArrowDownIcon fontSize="medium" color="success" />}
          label="Download"
          value={downlink !== null ? `${downlink} Mbps` : '-'}
          color="success"
        />

        {/* Kecepatan Upload */}
        <NetworkMetric
          icon={<ArrowUpIcon fontSize="medium" color="primary" />}
          label="Upload"
          value={uplink !== null ? `${uplink} Mbps` : '-'}
          color="info"
        />

        {/* Latency (RTT) */}
        <NetworkMetric
          icon={<TimerIcon fontSize="medium" color="primary" />}
          label="Latency"
          value={rtt !== null ? `${rtt} ms` : '-'}
          color="warning"
        />

        {/* Mode Hemat Data */}
        <NetworkMetric
          icon={<NetworkIcon fontSize="medium" color="primary" />}
          label="Hemat Data"
          value={saveData ? 'Aktif' : '-'}
          color={saveData ? 'success' : 'text.secondary'}
        />
      </Box>
    </Box>
  );
};

export default NetworkInfoContent;