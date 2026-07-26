// focus/src/pages/activity/login/Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  IconButton,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import {
  auth,
  signInWithEmailAndPassword,
  database,
  ref,
  get,
  DB_PATHS,
} from '../../../config/firebase';
import { useAuth } from '../../../context/AuthContext';
import {
  getDeviceInfo,
  getIP,
  getLocationFromIP,      // fallback
  getCombinedLocation,    // <-- baru: menggabungkan IP + browser geolocation
  getConnectionType,
  saveDeviceInfo,
  saveNetworkInfo,
  saveLocationInfo,
  createSession,
} from '../../../utils/sessionUtils';

const Login = () => {
  const navigate = useNavigate();
  const { user, isActive, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && isActive) {
      navigate('/', { replace: true });
    }
  }, [user, isActive, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const checkEmailInUEmail = async (email) => {
    try {
      const emailRef = ref(database, DB_PATHS.U_EMAIL);
      const snapshot = await get(emailRef);
      const data = snapshot.val();

      if (data) {
        for (const key in data) {
          if (data[key].nama_email === email && data[key].is_active === true) {
            return {
              exists: true,
              data: data[key],
              key: key
            };
          }
        }
      }
      return { exists: false, data: null, key: null };
    } catch (error) {
      console.error('Error checking email:', error);
      return { exists: false, data: null, key: null };
    }
  };

  const findUserByEmail = async (email) => {
    try {
      const usersRef = ref(database, DB_PATHS.USERS);
      const snapshot = await get(usersRef);
      const data = snapshot.val();
      if (data) {
        for (const key in data) {
          if (data[key].email === email) {
            return {
              exists: true,
              userData: data[key],
              key: key
            };
          }
        }
      }
      return { exists: false, userData: null, key: null };
    } catch (error) {
      console.error('Error finding user by email:', error);
      return { exists: false, userData: null, key: null };
    }
  };

  const checkEmploymentStatus = async (id_status_tenaga_kerja) => {
    try {
      if (!id_status_tenaga_kerja) {
        return { isActive: false, data: null };
      }
      const statusRef = ref(database, `${DB_PATHS.U_EMPLOYMENT_STATUS}/${id_status_tenaga_kerja}`);
      const snapshot = await get(statusRef);
      const data = snapshot.val();
      if (data && data.nama_status_tenaga_kerja === 'Aktif') {
        return { isActive: true, data };
      }
      return { isActive: false, data: null };
    } catch (error) {
      console.error('Error checking employment status:', error);
      return { isActive: false, data: null };
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Autentikasi ke Firebase
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const firebaseUser = userCredential.user;

      // 2. Cek email di u_email
      const emailCheck = await checkEmailInUEmail(firebaseUser.email);
      if (!emailCheck.exists) {
        setError('Email tidak terdaftar. Silakan hubungi administrator.');
        await auth.signOut();
        setLoading(false);
        return;
      }

      // 3. Cari user di node users berdasarkan email
      const userSearch = await findUserByEmail(firebaseUser.email);
      if (!userSearch.exists) {
        setError('User tidak ditemukan di sistem.');
        await auth.signOut();
        setLoading(false);
        return;
      }

      const userDataFromDb = userSearch.userData;

      // 4. Cek status tenaga kerja
      let isUserActive = false;
      if (userDataFromDb.id_status_tenaga_kerja) {
        const statusCheck = await checkEmploymentStatus(userDataFromDb.id_status_tenaga_kerja);
        isUserActive = statusCheck.isActive;
      }

      if (!isUserActive) {
        setError('Akun Anda tidak aktif. Silakan hubungi administrator.');
        await auth.signOut();
        setLoading(false);
        return;
      }

      // 5. Berhasil login, buat session online
      try {
        const userId = userDataFromDb.uid || userDataFromDb.id || firebaseUser.uid;
        const deviceInfo = getDeviceInfo();
        const ip = await getIP();

        // --- PERUBAHAN UTAMA DI SINI ---
        // Gunakan getCombinedLocation untuk mendapatkan lat, lon, accuracy dari browser
        // dan fallback ke IP jika geolocation ditolak / tidak tersedia
        let locationData;
        try {
          locationData = await getCombinedLocation(ip);
          console.log('📍 Location with accuracy:', locationData);
        } catch (locErr) {
          console.warn('Gagal mendapatkan lokasi gabungan, fallback ke IP:', locErr);
          locationData = await getLocationFromIP(ip);
          // Pastikan accuracy tetap null
          locationData.accuracy = null;
        }

        const connectionType = getConnectionType();

        // Simpan device, network, location
        const deviceId = await saveDeviceInfo(userId, deviceInfo);
        const networkId = await saveNetworkInfo(userId, ip, locationData.isp, connectionType);
        const locationId = await saveLocationInfo(userId, locationData); // otomatis menyimpan lat, lon, accuracy

        // Buat session
        const sessionId = await createSession(userId, deviceId, networkId, locationId);

        // Simpan sessionId di localStorage untuk referensi
        localStorage.setItem('focus_session_id', sessionId);

        console.log('✅ Session created:', sessionId);
        console.log('✅ Location data saved with lat:', locationData.lat, 'lon:', locationData.lon, 'accuracy:', locationData.accuracy);
      } catch (err) {
        console.error('Error creating session:', err);
        // Jangan gagalkan login jika session gagal dibuat
      }

      setLoading(false);

    } catch (err) {
      console.error('Login error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Email atau password salah');
      } else if (err.code === 'auth/invalid-email') {
        setError('Format email tidak valid');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Terlalu banyak percobaan. Coba lagi nanti.');
      } else {
        setError(err.message || 'Gagal login. Silakan coba lagi.');
      }
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 4 }}>
      <Paper elevation={0} sx={{ p: 4, width: '100%', borderRadius: 4, bgcolor: 'background.paper' }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h5" fontWeight="bold" color="primary">
            FOCUS
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Field Operations Control Unified System
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleLogin}>
          <TextField
            fullWidth
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            sx={{ mb: 2 }}
            autoComplete="email"
          />

          <TextField
            fullWidth
            label="Password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleChange}
            required
            sx={{ mb: 1 }}
            autoComplete="current-password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Box sx={{ textAlign: 'right', mb: 2 }}>
            <Link to="/forgot-password" style={{ textDecoration: 'none' }}>
              <Typography variant="caption" color="primary" sx={{ fontWeight: 500 }}>
                Lupa Password?
              </Typography>
            </Link>
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ mb: 2, py: 1.5 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Login'}
          </Button>
        </form>
      </Paper>
    </Container>
  );
};

export default Login;

