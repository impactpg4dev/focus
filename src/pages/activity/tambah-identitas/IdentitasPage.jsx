// focus/src/pages/activity/tambah-identitas/IdentitasPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Container, CircularProgress, Alert, Snackbar } from '@mui/material';
import { useAuth } from '../../../context/AuthContext';
import AppBar from '../../../components/surface/app-bar/AppBar';
import { useIdentitasFields } from './hooks/useIdentitasFields';
import { useLokasiOptions } from './hooks/useLokasiOptions';
import { useTambahIdentitasForm } from './hooks/useTambahIdentitasForm';
import { useSaveIdentitas } from './hooks/useSaveIdentitas';
import HeaderInfo from './components/HeaderInfo';
import IdentitasForm from './components/IdentitasForm';
import SaveButtonBar from './components/SaveButtonBar';
import TambahItemDialog from './components/TambahItemDialog';
import { FORM_MODE } from './constants';

const IdentitasPage = ({ mode = FORM_MODE.CREATE }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useAuth();

  const [error, setError] = useState('');
  const navigationState = location.state;

  const isEdit = mode === FORM_MODE.EDIT;

  // Ambil data dari navigation state berdasarkan mode
  const activityData = isEdit
    ? navigationState?.activityData
    : navigationState?.activity;
  const daftarAktivitasId = navigationState?.daftarAktivitasId;
  const daftarAktivitasData = isEdit
    ? navigationState?.daftarAktivitasData
    : null;
  const lokasiTerpilih = !isEdit ? navigationState?.lokasiTerpilih : null;
  const dataIdentitasId = isEdit ? navigationState?.dataIdentitasId : null;

  // Stabilkan existingValues agar tidak memicu loop di hook form
  const existingValues = useMemo(() => {
    if (!isEdit) return null;
    return navigationState?.identitasValues || {};
  }, [isEdit, navigationState?.identitasValues]);

  // Validasi navigasi
  useEffect(() => {
    if (!isEdit && !activityData) {
      navigate('/');
      return;
    }
    if (isEdit && (!navigationState || !navigationState.dataIdentitasId)) {
      setError('Data tidak lengkap. Silakan ulangi dari awal.');
      setTimeout(() => navigate('/'), 2000);
    }
  }, [isEdit, activityData, navigationState, navigate]);

  const { loading, identitasFields, selectedDaftarAktivitas, optionsMap } =
    useIdentitasFields({
      mode,
      activityData,
      daftarAktivitasId,
      setError,
    });

  const { lokasiOptions, loadingLokasi } = useLokasiOptions({
    selectedDaftarAktivitas,
    identitasFields,
  });

  const {
    formValues,
    handleInputChange,
    handleDateChange,
    handleNumberChange,
  } = useTambahIdentitasForm({
    mode,
    identitasFields,
    navigationState,
    lokasiTerpilih,
    lokasiOptions,
    existingValues,
  });

  const {
    saving,
    success,
    setSuccess,
    successMessage,
    showItemDialog,
    handleSave,
    handleDialogConfirm,
    handleDialogClose,
  } = useSaveIdentitas({
    mode,
    dataIdentitasId,
    identitasFields,
    formValues,
    selectedDaftarAktivitas,
    activityData,
    userData,
    navigate,
    setError,
  });

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
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

  // Teks yang berbeda antar mode
  const appBarTitle = isEdit ? 'Edit Identitas' : 'Tambah Identitas';
  const formTitle = isEdit ? 'Edit Form Identitas' : 'Form Identitas';
  const buttonLabel = isEdit ? 'Perbarui Identitas' : 'Simpan Identitas';
  const fallbackSuccessMessage = isEdit
    ? 'Data identitas berhasil diperbarui!'
    : 'Data identitas berhasil disimpan!';

  // Header daftar aktivitas: edit pakai nav state, create pakai hasil fetch + fallback
  const daftarAktivitasName = isEdit
    ? daftarAktivitasData?.nama_daftar_aktivitas
    : selectedDaftarAktivitas?.nama_daftar_aktivitas ||
      'Daftar aktivitas tidak tersedia';

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', pt: 0, pb: 10 }}>
      <AppBar
        title={appBarTitle}
        showBackButton={true}
        onBackClick={handleBack}
        showLogout={false}
      />

      <Container maxWidth="sm" sx={{ pt: 2, pb: 8, px: 2 }}>
        <HeaderInfo
          activityData={activityData}
          daftarAktivitasName={daftarAktivitasName}
          showEditChip={isEdit}
        />

        <IdentitasForm
          title={formTitle}
          identitasFields={identitasFields}
          formValues={formValues}
          optionsMap={optionsMap}
          lokasiOptions={lokasiOptions}
          loadingLokasi={loadingLokasi}
          onInputChange={handleInputChange}
          onDateChange={handleDateChange}
          onNumberChange={handleNumberChange}
        />
      </Container>

      {/* Create: hanya tampil jika fields ada. Edit: selalu tampil */}
      {(isEdit || identitasFields.length > 0) && (
        <SaveButtonBar saving={saving} onSave={handleSave} label={buttonLabel} />
      )}

      {/* Dialog hanya untuk create mode */}
      {!isEdit && (
        <TambahItemDialog
          open={showItemDialog}
          onClose={handleDialogClose}
          onConfirm={handleDialogConfirm}
        />
      )}

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={success}
        autoHideDuration={1500}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success">
          {successMessage || fallbackSuccessMessage}
        </Alert>
      </Snackbar>

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateX(-50%) translateY(100%);
          }
          to {
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </Box>
  );
};

export default IdentitasPage;