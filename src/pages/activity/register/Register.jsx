// focus\src\pages\activity\register\Register.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Divider,
  Alert,
  IconButton,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Google as GoogleIcon,
} from '@mui/icons-material';
import {
  auth,
  createUserWithEmailAndPassword,
  signInWithPopup,
  googleProvider,
  database,
  ref,
  get,
  set,
  signOut,
  DB_PATHS,
} from '../../../config/firebase';
import { useAuth } from '../../../context/AuthContext';

const Register = () => {
  const navigate = useNavigate();
  const { user, isActive, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  // Fungsi untuk check email di u_email
  const checkEmailInUEmail = async (email) => {
    try {
      const emailRef = ref(database, DB_PATHS.U_EMAIL);
      const snapshot = await get(emailRef);
      const data = snapshot.val();

      console.log('📧 Checking email in u_email:', email);

      if (data) {
        for (const key in data) {
          if (data[key].nama_email === email && data[key].is_active === true) {
            console.log('✅ Email found in u_email!');
            return {
              exists: true,
              data: data[key],
              key: key
            };
          }
        }
      }
      console.log('❌ Email not found in u_email');
      return { exists: false, data: null, key: null };
    } catch (error) {
      console.error('Error checking email:', error);
      return { exists: false, data: null, key: null };
    }
  };

  // Fungsi untuk membuat data user baru di Realtime Database
  const createUserData = async (firebaseUser) => {
    try {
      const userRef = ref(database, `${DB_PATHS.USERS}/${firebaseUser.uid}`);
      
      const newUserData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        avatar: firebaseUser.photoURL || '',
        cover_avatar: '',
        gender: '',
        gmail: firebaseUser.email,
        id_department: '',
        id_jabatan: '',
        id_role: '',
        id_status_pekerjaan: '',
        id_status_tenaga_kerja: '',
        is_online: true,
        last_active: new Date().toISOString(),
        no_wa: '',
        signature: '',
        source: 'firebase',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        synced_at: new Date().toISOString(),
      };

      await set(userRef, newUserData);
      console.log('✅ New user created with UID:', firebaseUser.uid);
      
      return newUserData;
    } catch (error) {
      console.error('❌ Error creating user data:', error);
      throw error;
    }
  };

  // ==================== REGISTER EMAIL/PASSWORD ====================
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Password tidak cocok');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password minimal 6 karakter');
      return;
    }

    setLoading(true);

    try {
      console.log('📝 Step 1: Registering with email:', formData.email);
      
      // STEP 1: Authentication DULU (buat akun di Firebase Auth)
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      
      const firebaseUser = userCredential.user;
      console.log('✅ Step 2: Authentication successful! User UID:', firebaseUser.uid);

      // STEP 2: Cek u_email
      const emailCheck = await checkEmailInUEmail(firebaseUser.email);

      if (!emailCheck.exists) {
        console.log('❌ Email not found in u_email');
        setError('Email tidak terdaftar. Silakan hubungi administrator.');
        // Jangan hapus user, cukup sign out
        await signOut(auth);
        setLoading(false);
        return;
      }

      console.log('✅ Email found in u_email!');

      // STEP 3: Buat data user di Realtime Database
      await createUserData(firebaseUser);

      console.log('✅ Registration complete!');
      
      // STEP 4: Berhasil, user akan diarahkan ke beranda oleh AuthContext
      setLoading(false);

    } catch (err) {
      console.error('❌ Register error:', err);
      
      if (err.code === 'auth/email-already-in-use') {
        setError('Email sudah terdaftar. Silakan login.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Format email tidak valid');
      } else if (err.code === 'auth/weak-password') {
        setError('Password terlalu lemah. Gunakan minimal 6 karakter.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Gagal terhubung ke server. Periksa koneksi internet Anda.');
      } else {
        setError(err.message || 'Gagal mendaftar. Silakan coba lagi.');
      }
      setLoading(false);
    }
  };

  // ==================== REGISTER GOOGLE ====================
  const handleGoogleRegister = async () => {
    setError('');
    setLoading(true);

    try {
      console.log('📝 Step 1: Registering with Google...');
      
      // STEP 1: Authentication dengan Google DULU
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      
      console.log('✅ Step 2: Google authentication successful! Email:', firebaseUser.email);
      console.log('🆔 Firebase Auth UID:', firebaseUser.uid);

      // STEP 2: Cek u_email
      const emailCheck = await checkEmailInUEmail(firebaseUser.email);

      if (!emailCheck.exists) {
        console.log('❌ Email not found in u_email');
        setError('Email tidak terdaftar. Silakan hubungi administrator.');
        await signOut(auth);
        setLoading(false);
        return;
      }

      console.log('✅ Email found in u_email!');

      // STEP 3: Cek apakah data user sudah ada
      const userRef = ref(database, `${DB_PATHS.USERS}/${firebaseUser.uid}`);
      const userSnapshot = await get(userRef);
      const existingUserData = userSnapshot.val();

      if (!existingUserData) {
        console.log('🆕 Creating new user data...');
        await createUserData(firebaseUser);
      } else {
        console.log('👤 User data already exists');
      }

      console.log('✅ Registration complete!');
      setLoading(false);

    } catch (err) {
      console.error('❌ Google register error:', err);
      
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Pendaftaran dibatalkan.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup diblokir. Izinkan popup untuk mendaftar.');
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        setError('Email sudah terdaftar dengan metode lain. Silakan login.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Gagal terhubung ke server. Periksa koneksi internet Anda.');
      } else {
        setError(err.message || 'Gagal mendaftar dengan Google. Silakan coba lagi.');
      }
      setLoading(false);
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

  return (
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 4 }}>
      <Paper elevation={0} sx={{ p: 4, width: '100%', borderRadius: 4, bgcolor: 'background.paper' }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h5" fontWeight="bold" color="primary">
            FOCUS
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Forestry Operations Control Unified System
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleRegister}>
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
            sx={{ mb: 2 }}
            autoComplete="new-password"
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

          <TextField
            fullWidth
            label="Konfirmasi Password"
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            sx={{ mb: 2 }}
            autoComplete="new-password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ mb: 2, py: 1.5 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Daftar'}
          </Button>
        </form>

        <Divider sx={{ my: 2 }}>
          <Typography variant="caption" color="text.secondary">
            ATAU
          </Typography>
        </Divider>

        <Button
          fullWidth
          variant="outlined"
          size="large"
          startIcon={<GoogleIcon />}
          onClick={handleGoogleRegister}
          disabled={loading}
          sx={{ py: 1.5, mb: 2 }}
        >
          Daftar dengan Google
        </Button>

        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Sudah punya akun?{' '}
            <Link to="/login" style={{ textDecoration: 'none' }}>
              <Typography component="span" color="primary" fontWeight={600}>
                Login
              </Typography>
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default Register;