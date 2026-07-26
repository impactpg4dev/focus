// focus\src\pages\activity\forgot-password\ForgotPassword.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import { auth, sendPasswordResetEmail } from '../../../config/firebase';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
      setEmail('');
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        setError('Email tidak terdaftar');
      } else {
        setError(err.message || 'Gagal mengirim email reset password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 4 }}>
      <Paper elevation={0} sx={{ p: 4, width: '100%', borderRadius: 4, bgcolor: 'background.paper' }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h5" fontWeight="bold" color="primary">
            FOCUS
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Reset Password
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
            Email reset password telah dikirim. Silakan cek inbox Anda.
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Masukkan email Anda untuk menerima link reset password.
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            sx={{ mb: 2 }}
            autoComplete="email"
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ mb: 2, py: 1.5 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Kirim Link Reset'}
          </Button>
        </form>

        <Box sx={{ textAlign: 'center' }}>
          <Link to="/login" style={{ textDecoration: 'none' }}>
            <Typography variant="body2" color="primary" fontWeight={600}>
              Kembali ke Login
            </Typography>
          </Link>
        </Box>
      </Paper>
    </Container>
  );
};

export default ForgotPassword;