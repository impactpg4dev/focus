// focus/src/pages/fragment/beranda/Beranda.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Avatar,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '../../../context/AuthContext';
import { database, ref, get } from '../../../config/firebase';
import UserRealtimeInfo from './UserRealtimeInfo';
import UserLocationInfo from './UserLocationInfo';
import SearchBar from './SearchBar';
import FeatureInfo from './FeatureInfo';
import DaftarAktivitasPengamat from './DaftarAktivitasPengamat';
import DaftarAktivitasMandor from './DaftarAktivitasMandor';
import DaftarAktivitasSectionHead from './DaftarAktivitasSectionHead';

const Beranda = () => {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);

  // State untuk informasi jaringan
  const [networkInfo, setNetworkInfo] = useState({
    isOnline: navigator.onLine,
    type: 'unknown',
    effectiveType: 'unknown',
    downlink: null,
    rtt: null,
    saveData: false,
    uplink: null,
  });
  const [signalBars, setSignalBars] = useState(0);
  const [isp, setIsp] = useState('Tidak diketahui');

  // State untuk jabatan
  const [jabatanName, setJabatanName] = useState('');

  // State untuk menentukan apakah user adalah Pengamat, Mandor, atau Section Head
  const [isPengamat, setIsPengamat] = useState(false);
  const [isMandor, setIsMandor] = useState(false);
  const [isSectionHead, setIsSectionHead] = useState(false);

  // Ambil data jabatan dari u_position
  useEffect(() => {
    if (userData?.id_jabatan) {
      const fetchJabatan = async () => {
        try {
          const jabatanRef = ref(database, `u_position/${userData.id_jabatan}`);
          const snapshot = await get(jabatanRef);
          const data = snapshot.val();
          if (data) {
            const name = data.nama_jabatan || '';
            setJabatanName(name);
            // Cek jabatan (case-insensitive)
            const lowerName = name.toLowerCase();
            setIsPengamat(lowerName === 'pengamat');
            setIsMandor(lowerName === 'mandor');
            setIsSectionHead(lowerName === 'section head');
          } else {
            setJabatanName('');
            setIsPengamat(false);
            setIsMandor(false);
            setIsSectionHead(false);
          }
        } catch (error) {
          console.error('Error fetching jabatan:', error);
          setJabatanName('');
          setIsPengamat(false);
          setIsMandor(false);
          setIsSectionHead(false);
        }
      };
      fetchJabatan();
    } else {
      setJabatanName('');
      setIsPengamat(false);
      setIsMandor(false);
      setIsSectionHead(false);
    }
  }, [userData?.id_jabatan]);

  // Fungsi untuk mendapatkan ucapan greeting berdasarkan waktu
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'Selamat Pagi';
    if (hour >= 11 && hour < 15) return 'Selamat Siang';
    if (hour >= 15 && hour < 18) return 'Selamat Sore';
    if (hour >= 18 && hour < 22) return 'Selamat Malam';
    return 'Waktunya Tidur';
  };

  // Update network info dari navigator.connection
  useEffect(() => {
    const updateNetworkInfo = () => {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (connection) {
        setNetworkInfo((prev) => ({
          ...prev,
          type: connection.type || 'unknown',
          effectiveType: connection.effectiveType || 'unknown',
          downlink: connection.downlink || null,
          rtt: connection.rtt || null,
          saveData: connection.saveData || false,
          uplink: connection.uplink || null,
        }));
        const downlink = connection.downlink;
        let bars = 0;
        if (downlink !== null && downlink !== undefined) {
          if (downlink >= 20) bars = 5;
          else if (downlink >= 10) bars = 4;
          else if (downlink >= 5) bars = 3;
          else if (downlink >= 1) bars = 2;
          else if (downlink > 0) bars = 1;
          else bars = 0;
        } else {
          const eff = connection.effectiveType;
          if (eff === '5g') bars = 5;
          else if (eff === '4g') bars = 4;
          else if (eff === '3g') bars = 3;
          else if (eff === '2g') bars = 2;
          else if (eff === 'slow-2g') bars = 1;
          else bars = 0;
        }
        setSignalBars(bars);
      }
    };

    updateNetworkInfo();

    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      connection.addEventListener('change', updateNetworkInfo);
      return () => {
        connection.removeEventListener('change', updateNetworkInfo);
      };
    }
  }, []);

  // Event listener untuk online/offline
  useEffect(() => {
    const handleOnline = () => setNetworkInfo((prev) => ({ ...prev, isOnline: true }));
    const handleOffline = () => setNetworkInfo((prev) => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Dummy fetch stats (bisa dihapus atau diganti dengan data nyata nanti)
  useEffect(() => {
    // Simulasi loading selesai
    setLoading(false);
  }, []);

  // Fungsi untuk mendapatkan label tipe jaringan
  const getNetworkTypeLabel = () => {
    const { type, effectiveType } = networkInfo;
    if (type === 'wifi') return 'WiFi';
    if (type === 'cellular') {
      if (effectiveType === '5g') return '5G';
      if (effectiveType === '4g') return '4G/LTE';
      if (effectiveType === '3g') return '3G';
      if (effectiveType === '2g') return '2G';
      if (effectiveType === 'slow-2g') return '2G (Slow)';
      return 'Cellular';
    }
    if (type === 'ethernet') return 'Ethernet';
    if (type === 'bluetooth') return 'Bluetooth';
    if (type === 'none') return 'Tidak Ada Koneksi';
    return effectiveType ? effectiveType.toUpperCase() : 'Tidak Diketahui';
  };

  // Warna indikator signal bars
  const getSignalColor = () => {
    if (!networkInfo.isOnline) return 'error.main';
    if (signalBars >= 4) return 'success.main';
    if (signalBars >= 3) return 'warning.main';
    if (signalBars >= 2) return 'warning.light';
    return 'error.main';
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
      {/* User Profile Card */}
      <Paper sx={{ p: 0, mb: 2, mx: 1, borderRadius: '4px', background: 'transparent', boxShadow: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            src={userData?.avatar}
            sx={{ width: 56, height: 56, border: '2px solid', borderColor: 'primary.main' }}
          >
            {userData?.name?.[0] || 'U'}
          </Avatar>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              {getGreeting()} {userData?.name || 'User'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {jabatanName || '-'}
            </Typography>
          </Box>
        </Box>
      </Paper>

      <UserLocationInfo />
      <SearchBar />

      {/* ========== INFORMASI JARINGAN ========== */}
      <FeatureInfo
        networkInfo={networkInfo}
        signalBars={signalBars}
        isp={isp}
        getNetworkTypeLabel={getNetworkTypeLabel}
        getSignalColor={getSignalColor}
        isPengamat={isPengamat}
      />
      

      {/* ========== DAFTAR AKTIVITAS BERDASARKAN JABATAN ========== */}
      {/* Hanya tampilkan sesuai jabatan */}
      {isPengamat && <DaftarAktivitasPengamat />}
      {isMandor && <DaftarAktivitasMandor />}
      {isSectionHead && <DaftarAktivitasSectionHead />}

      {/* Aktivitas Terbaru - Sementara sebagai placeholder 
      <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
        Aktivitas Terbaru
      </Typography>

      <Paper sx={{ p: 2, borderRadius: 3, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="body2" fontWeight="500">
              Pengamatan Tanaman - Plot A1
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Hari ini, 14:30
            </Typography>
          </Box>
          <Box
            sx={{
              bgcolor: 'warning.light',
              color: 'warning.dark',
              px: 1.5,
              py: 0.5,
              borderRadius: 2,
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            Pending
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 2, borderRadius: 3, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="body2" fontWeight="500">
              Stock Opname - Gudang Pusat
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Kemarin, 09:15
            </Typography>
          </Box>
          <Box
            sx={{
              bgcolor: 'success.light',
              color: 'success.dark',
              px: 1.5,
              py: 0.5,
              borderRadius: 2,
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            Approved
          </Box>
        </Box>
      </Paper>
      */}
    </Box>
  );
};

export default Beranda;