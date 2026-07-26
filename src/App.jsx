// focus/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { HelmetProvider } from 'react-helmet-async';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

// Pages
import Login from './pages/activity/login/Login';
//import Register from './pages/activity/register/Register';
import ForgotPassword from './pages/activity/forgot-password/ForgotPassword';
import Main from './pages/main/Main';
import DataIdentitas from './pages/activity/data-identitas/DataIdentitas';
import TambahIdentitas from './pages/activity/tambah-identitas/TambahIdentitas';
import EditIdentitas from './pages/activity/edit-identitas/EditIdentitas';

import DataItem from './pages/activity/data-item/DataItem';
import TambahItem from './pages/activity/tambah-item/TambahItem';
import EditItem from './pages/activity/edit-item/EditItem';

import DataDetailItem from './pages/activity/data-detail-item/DataDetailItem';
import TambahDetailItem from './pages/activity/tambah-detail-item/TambahDetailItem';
import EditDetailItem from './pages/activity/edit-detail-item/EditDetailItem';

import BuatLaporan from './pages/activity/buat-laporan/BuatLaporan';
import HasilPencarian from './pages/activity/hasil-pencarian/HasilPencarian';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import useInactivityTimeout from './hooks/useInactivityTimeout';

// 🔥 Komponen wrapper untuk aktivasi timeout di semua halaman
const TimeoutWrapper = ({ children }) => {
  useInactivityTimeout();
  return children;
};

const theme = createTheme({
  palette: {
    primary: {
      main: '#2E7D32',
      light: '#4CAF50',
      dark: '#1B5E20',
    },
    secondary: {
      main: '#FF6F00',
      light: '#FFA726',
      dark: '#E65100',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: '4px',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
  },
});

function App() {
  return (
    <HelmetProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <AuthProvider>
            <Router>
              <TimeoutWrapper>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/login" element={<Login />} />
                  {/*<Route path="/register" element={<Register />} />*/}
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  
                  {/* Protected Routes */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Main />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/tambah-identitas"
                    element={
                      <ProtectedRoute>
                        <TambahIdentitas />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/tambah-item"
                    element={
                      <ProtectedRoute>
                        <TambahItem />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/edit-item"
                    element={
                      <ProtectedRoute>
                        <EditItem />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/tambah-detail-item"
                    element={
                      <ProtectedRoute>
                        <TambahDetailItem />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/edit-detail-item"
                    element={
                      <ProtectedRoute>
                        <EditDetailItem />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/data-identitas"
                    element={
                      <ProtectedRoute>
                        <DataIdentitas />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/edit-identitas"
                    element={
                      <ProtectedRoute>
                        <EditIdentitas />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/data-item"
                    element={
                      <ProtectedRoute>
                        <DataItem />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/data-detail-item"
                    element={
                      <ProtectedRoute>
                        <DataDetailItem />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/buat-laporan"
                    element={
                      <ProtectedRoute>
                        <BuatLaporan  />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/hasil-pencarian"
                    element={
                      <ProtectedRoute>
                        <HasilPencarian />
                      </ProtectedRoute>
                    }
                  />
                  
                  {/* Fallback Route */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </TimeoutWrapper>
            </Router>
          </AuthProvider>
        </LocalizationProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;