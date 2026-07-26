// focus/src/pages/activity/edit-identitas/EditIdentitas.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
  Snackbar,
  Autocomplete,
  Chip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { database, ref, get, child, push, set, update, remove } from '../../../config/firebase';
import { useAuth } from '../../../context/AuthContext';
import AppBar from '../../../components/surface/app-bar/AppBar';
import dayjs from 'dayjs';

// 🔥 Import untuk MobileDatePicker
import { MobileDatePicker } from '@mui/x-date-pickers/MobileDatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

// 🔥 Opsi untuk field "Aktivitas"
const aktivitasOptions = [
  { label: 'Diseases Survey', value: 'Diseases Survey' },
  { label: 'Diseases Survey - Next 1', value: 'Diseases Survey - Next 1' },
];

// 🔥 Helper: get week number from date string (DD/MM/YYYY) - SAMA PERSIS dengan TambahIdentitas
const getWeekNumber = (dateString) => {
  if (!dateString) return '';
  const parts = dateString.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    const startOfYear = new Date(year, 0, 1);
    const diff = (date - startOfYear) / 86400000;
    return Math.ceil((diff + startOfYear.getDay() + 1) / 7);
  }
  return '';
};

const EditIdentitas = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [identitasFields, setIdentitasFields] = useState([]);
  const [formValues, setFormValues] = useState({});
  const [selectedDaftarAktivitas, setSelectedDaftarAktivitas] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [lokasiOptions, setLokasiOptions] = useState([]);
  const [loadingLokasi, setLoadingLokasi] = useState(false);
  const [activityData, setActivityData] = useState(null);
  const [daftarAktivitasData, setDaftarAktivitasData] = useState(null);
  const [dataIdentitasId, setDataIdentitasId] = useState(null);

  const navigationState = location.state;

  useEffect(() => {
    if (!navigationState || !navigationState.dataIdentitasId) {
      setError('Data tidak lengkap. Silakan ulangi dari awal.');
      setTimeout(() => navigate('/'), 2000);
      return;
    }

    setDataIdentitasId(navigationState.dataIdentitasId);
    setActivityData(navigationState.activityData);
    setDaftarAktivitasData(navigationState.daftarAktivitasData);

    const identitasValues = navigationState.identitasValues || {};
    fetchIdentitasFields(navigationState.daftarAktivitasId, identitasValues);
  }, [navigationState]);

  // Mapping nilai lokasi dari label ke ID setelah lokasiOptions tersedia
  useEffect(() => {
    if (lokasiOptions.length > 0 && identitasFields.length > 0) {
      const lokasiField = identitasFields.find(f => f.label === 'Lokasi' || f.nama_identitas === 'lokasi');
      if (lokasiField) {
        const currentValue = formValues[lokasiField.id_identitas_aktivitas] || '';
        if (!currentValue) return;

        const normalize = (str) => str?.toLowerCase().trim() || '';

        // Cek apakah currentValue adalah ID (ada di lokasiOptions)
        const isId = lokasiOptions.some(opt => opt.id_lokasi === currentValue);
        if (isId) return; // Sudah ID, tidak perlu mapping

        // Coba mapping dari label ke ID
        const matchedOption = lokasiOptions.find(opt => 
          normalize(opt.label) === normalize(currentValue) ||
          normalize(opt.lokasi) === normalize(currentValue)
        );
        if (matchedOption) {
          setFormValues(prev => ({
            ...prev,
            [lokasiField.id_identitas_aktivitas]: matchedOption.id_lokasi
          }));
        }
      }
    }
  }, [lokasiOptions, identitasFields, formValues]);

  const fetchIdentitasFields = async (daftarAktivitasId, existingValuesParam) => {
    setLoading(true);
    setError('');
    try {
      const dbRef = ref(database);

      const daftarSnapshot = await get(child(dbRef, 'dtb_daftar_aktivitas'));
      const daftarData = daftarSnapshot.val();
      let selectedDaftar = null;
      if (daftarData) {
        const daftarList = Object.values(daftarData);
        selectedDaftar = daftarList.find(
          item => item.id_daftar_aktivitas === daftarAktivitasId && item.is_active === true
        );
        setSelectedDaftarAktivitas(selectedDaftar);
      }

      if (selectedDaftar) {
        const identitasSnapshot = await get(child(dbRef, 'dtb_identitas_aktivitas'));
        const identitasData = identitasSnapshot.val();

        if (identitasData) {
          const identitasList = Object.values(identitasData);
          const filteredIdentitas = identitasList
            .filter(item => item.daftar_aktivitas_id === selectedDaftar.id_daftar_aktivitas && item.is_active === true)
            .sort((a, b) => (a.urutan || 0) - (b.urutan || 0));

          setIdentitasFields(filteredIdentitas);

          const initialValues = {};
          const normalize = (str) => str?.toLowerCase().trim() || '';

          const filteredExisting = Object.keys(existingValuesParam)
            .filter(key => !['id', 'pelakuId', 'createdAt', 'status', 'updatedAt', 'atasan_id', 'catatan_revisi', 'is_active'].includes(key))
            .reduce((obj, key) => {
              obj[key] = existingValuesParam[key];
              return obj;
            }, {});

          console.log('🔍 Filtered Existing Values:', filteredExisting);

          filteredIdentitas.forEach(field => {
            let value = '';
            const matchedKey = Object.keys(filteredExisting).find(
              key => normalize(key) === normalize(field.label) ||
                     normalize(key) === normalize(field.nama_identitas)
            );
            if (matchedKey) {
              value = filteredExisting[matchedKey] || '';
            }
            initialValues[field.id_identitas_aktivitas] = value;
          });

          console.log('🔍 Initial Values yang akan diset:', initialValues);
          setFormValues(initialValues);
        }

        // 🔥 Segera ambil opsi lokasi setelah daftar aktivitas ditemukan
        await fetchFilterLokasi(selectedDaftar.id_daftar_aktivitas);
      } else {
        setError('Daftar aktivitas tidak ditemukan.');
      }
    } catch (error) {
      console.error('Error fetching identitas fields:', error);
      setError('Gagal memuat data identitas');
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterLokasi = async (daftarAktivitasId) => {
    setLoadingLokasi(true);
    try {
      const dbRef = ref(database);
      const filterSnapshot = await get(child(dbRef, 'dtb_filter_lokasi_aktivitas'));
      const filterData = filterSnapshot.val();

      let jenisTanamanList = [];
      if (filterData) {
        const filterList = Object.values(filterData);
        const activeFilter = filterList.filter(
          item => item.daftar_aktivitas_id === daftarAktivitasId && item.is_active === true
        );
        jenisTanamanList = activeFilter.map(item => item.jenis_tanaman);
      }

      console.log('🔍 Jenis Tanaman List:', jenisTanamanList);

      if (jenisTanamanList.length > 0) {
        const lokasiSnapshot = await get(child(dbRef, 'tb_status_lokasi'));
        const lokasiData = lokasiSnapshot.val();

        if (lokasiData) {
          const lokasiList = Object.values(lokasiData);
          const filteredLokasi = lokasiList.filter(
            item => jenisTanamanList.includes(item.jenis_tanaman) && item.is_active !== false
          );

          // 🔥 Kelompokkan lokasi berdasarkan (lokasi + jenis_tanaman) dan ambil yang tanggal_mulai_perawatan terbaru
          const groupedLokasi = {};
          filteredLokasi.forEach(item => {
            const key = `${item.lokasi}|${item.jenis_tanaman}`;
            if (!groupedLokasi[key] || new Date(item.tanggal_mulai_perawatan) > new Date(groupedLokasi[key].tanggal_mulai_perawatan)) {
              groupedLokasi[key] = item;
            }
          });

          // Konversi hasil grouping ke array untuk opsi
          const uniqueLokasi = Object.values(groupedLokasi);

          const formattedOptions = uniqueLokasi.map(item => ({
            id_lokasi: item.id_lokasi,
            label: `${item.lokasi}`,
            deskripsi: item.deskripsi,
            lokasi: item.lokasi,
          }));
          console.log('🔍 Lokasi Options (grouped):', formattedOptions);
          setLokasiOptions(formattedOptions);
        }
      } else {
        console.warn('Tidak ada filter lokasi untuk daftar aktivitas ini.');
      }
    } catch (error) {
      console.error('Error fetching filter lokasi:', error);
    } finally {
      setLoadingLokasi(false);
    }
  };

  const handleInputChange = (fieldId, value) => {
    setFormValues(prev => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  // 🔥 Handler khusus untuk Tanggal Pengamatan: update Week Pengamatan otomatis
  const handleTanggalPengamatanChange = (fieldId, value) => {
    console.log('📅 handleTanggalPengamatanChange called with value:', value);
    // value dari MobileDatePicker adalah dayjs object atau null
    let formattedValue = '';
    let dateStrForWeek = '';
    
    if (value && value.isValid()) {
      // Format ke YYYY-MM-DD untuk disimpan
      formattedValue = value.format('YYYY-MM-DD');
      // Format ke DD/MM/YYYY untuk perhitungan week (sesuai dengan getWeekNumber)
      dateStrForWeek = value.format('DD/MM/YYYY');
    }

    setFormValues(prev => {
      const newValues = { ...prev, [fieldId]: formattedValue };
      const weekField = identitasFields.find(
        f => f.label === 'Week Pengamatan' || f.nama_identitas === 'week_pengamatan'
      );
      if (weekField && dateStrForWeek) {
        const weekNumber = getWeekNumber(dateStrForWeek);
        if (weekNumber) {
          newValues[weekField.id_identitas_aktivitas] = String(weekNumber);
          console.log('✅ Week Pengamatan diisi:', weekNumber);
        } else {
          newValues[weekField.id_identitas_aktivitas] = '';
        }
      } else if (weekField) {
        newValues[weekField.id_identitas_aktivitas] = '';
      }
      return newValues;
    });
  };

  const renderInputField = (field) => {
    const value = formValues[field.id_identitas_aktivitas] || '';
    const isRequired = field.is_required === true;
    const isTanggalPengamatan = field.label === 'Tanggal Pengamatan' || field.nama_identitas === 'tanggal_pengamatan';

    // 🔥 Jika field adalah Tanggal Pengamatan, gunakan MobileDatePicker seperti di TambahIdentitas
    if (isTanggalPengamatan) {
      return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <MobileDatePicker
            label={field.label}
            value={value ? dayjs(value) : null}
            onChange={(newValue) => handleTanggalPengamatanChange(field.id_identitas_aktivitas, newValue)}
            format="DD/MM/YYYY"
            disableFuture // 🔥 Mencegah pemilihan tanggal di masa depan
            slotProps={{
              textField: {
                fullWidth: true,
                required: isRequired,
                size: 'medium',
                sx: { 
                  mt: 1, 
                  '& .MuiOutlinedInput-root': { borderRadius: '4px' } 
                }
              },
              dialog: {
                sx: {
                  '& .MuiDialog-paper': {
                    margin: '0 auto',
                    width: '100%',
                    maxWidth: '548px',
                    maxHeight: '80vh',
                    borderRadius: '12px 12px 0 0',
                    position: 'fixed',
                    bottom: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    animation: 'slideUp 0.3s ease-out',
                    overflow: 'hidden',
                  },
                  '& .MuiDialog-container': {
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                  },
                  '& .MuiBackdrop-root': {
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  },
                  // 🔥 Mencegah close saat klik backdrop
                  '& .MuiDialog-root': {
                    '& .MuiBackdrop-root': {
                      pointerEvents: 'none', // Mencegah klik pada backdrop
                    }
                  }
                }
              },
              toolbar: {
                sx: {
                  backgroundColor: (theme) => theme.palette.primary.main,
                  color: 'white',
                  '& .MuiTypography-root': {
                    color: 'white',
                  },
                }
              },
              actionBar: {
                sx: {
                  padding: '8px 16px',
                  borderTop: '1px solid',
                  borderColor: 'divider',
                }
              }
            }}
            closeOnSelect={false}
            views={['year', 'month', 'day']}
            // 🔥 Mencegah close saat klik backdrop
            onClose={(reason) => {
              if (reason === 'cancel' || reason === 'accept') {
                return;
              }
              if (reason === 'escape') {
                return;
              }
              return false;
            }}
          />
        </LocalizationProvider>
      );
    }

    // Untuk field selain Tanggal Pengamatan, gunakan render biasa
    const onChangeHandler = handleInputChange;

    switch (field.tipe_input) {
      case 'text':
        return (
          <TextField
            fullWidth
            label={field.label}
            value={value}
            onChange={(e) => onChangeHandler(field.id_identitas_aktivitas, e.target.value)}
            required={isRequired}
            size="medium"
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '4px' } }}
          />
        );
      case 'number':
        return (
          <TextField
            fullWidth
            label={field.label}
            type="number"
            value={value}
            onChange={(e) => handleInputChange(field.id_identitas_aktivitas, e.target.value)}
            required={isRequired}
            size="medium"
            inputProps={{ inputMode: 'numeric', pattern: '[0-9.-]*' }}
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '4px' } }}
          />
        );
      case 'date':
        // Untuk case 'date' lainnya, tetap gunakan TextField type date
        return (
          <TextField
            fullWidth
            label={field.label}
            type="date"
            value={value}
            onChange={(e) => onChangeHandler(field.id_identitas_aktivitas, e.target.value)}
            required={isRequired}
            size="medium"
            InputLabelProps={{ shrink: true }}
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '4px' } }}
          />
        );
      case 'select':
        const isLokasiField = field.label === 'Lokasi' || field.nama_identitas === 'lokasi';
        const isAktivitasField = field.label === 'Aktivitas' || field.nama_identitas === 'aktivitas';

        // 🔥 Jika field adalah Aktivitas, gunakan opsi khusus
        if (isAktivitasField) {
          return (
            <Autocomplete
              fullWidth
              options={aktivitasOptions}
              getOptionLabel={(option) => option.label || ''}
              value={aktivitasOptions.find(opt => opt.value === value) || null}
              onChange={(event, newValue) => {
                handleInputChange(field.id_identitas_aktivitas, newValue ? newValue.value : '');
              }}
              size="medium"
              sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '4px' } }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={field.label}
                  required={isRequired}
                  size="medium"
                />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  <Typography variant="body2">{option.label}</Typography>
                </li>
              )}
              isOptionEqualToValue={(option, val) => option.value === val?.value}
              disablePortal
              clearOnEscape
            />
          );
        }

        // Field Lokasi
        if (isLokasiField) {
          return (
            <Autocomplete
              fullWidth
              options={lokasiOptions}
              getOptionLabel={(option) => option.label || ''}
              value={lokasiOptions.find(opt => opt.id_lokasi === value) || null}
              onChange={(event, newValue) => {
                handleInputChange(field.id_identitas_aktivitas, newValue ? newValue.id_lokasi : '');
              }}
              size="medium"
              loading={loadingLokasi}
              loadingText="Memuat data lokasi..."
              noOptionsText="Tidak ada lokasi yang tersedia"
              sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '4px' } }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={field.label}
                  required={isRequired}
                  size="medium"
                />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  <Box>
                    <Typography variant="body2">{option.label}</Typography>
                  </Box>
                </li>
              )}
              isOptionEqualToValue={(option, val) => option.id_lokasi === val?.id_lokasi}
              disablePortal
              clearOnEscape
            />
          );
        }

        // Select biasa (fallback)
        const selectOptions = [
          { label: 'Opsi 1', value: 'option1' },
          { label: 'Opsi 2', value: 'option2' },
          { label: 'Opsi 3', value: 'option3' },
        ];
        return (
          <Autocomplete
            fullWidth
            options={selectOptions}
            getOptionLabel={(option) => option.label || ''}
            value={selectOptions.find(opt => opt.value === value) || null}
            onChange={(event, newValue) => {
              handleInputChange(field.id_identitas_aktivitas, newValue ? newValue.value : '');
            }}
            size="medium"
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '4px' } }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={field.label}
                required={isRequired}
                size="medium"
              />
            )}
            isOptionEqualToValue={(option, val) => option.value === val?.value}
            disablePortal
            clearOnEscape
          />
        );
      case 'radio':
        return (
          <FormControl component="fieldset" sx={{ mt: 1 }}>
            <FormLabel component="legend">{field.label}</FormLabel>
            <RadioGroup
              value={value}
              onChange={(e) => handleInputChange(field.id_identitas_aktivitas, e.target.value)}
            >
              <FormControlLabel value="option1" control={<Radio />} label="Opsi 1" />
              <FormControlLabel value="option2" control={<Radio />} label="Opsi 2" />
            </RadioGroup>
          </FormControl>
        );
      default:
        return (
          <TextField
            fullWidth
            label={field.label}
            value={value}
            onChange={(e) => onChangeHandler(field.id_identitas_aktivitas, e.target.value)}
            required={isRequired}
            size="medium"
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '4px' } }}
          />
        );
    }
  };

  const getStatusId = async (statusName) => {
    try {
      const dbRef = ref(database);
      const statusSnapshot = await get(child(dbRef, 'dtb_status_aktivitas'));
      const statusData = statusSnapshot.val();
      if (!statusData) return '';
      for (const key in statusData) {
        if (statusData[key].nama_status === statusName) {
          return statusData[key].id_status_aktivitas;
        }
      }
      return '';
    } catch (error) {
      console.error('Error getting status id:', error);
      return '';
    }
  };

  const saveEditedIdentitas = async () => {
    const emptyFields = identitasFields.filter(
      field => field.is_required && !formValues[field.id_identitas_aktivitas]
    );
    if (emptyFields.length > 0) {
      setError(`Mohon isi field yang wajib: ${emptyFields.map(f => f.label).join(', ')}`);
      return;
    }

    try {
      const identitasRef = ref(database, `dtb_data_identitas_aktivitas/${dataIdentitasId}`);
      // Update timestamp
      await update(identitasRef, {
        updated_at: new Date().toISOString(),
      });

      // 🔥 Cek field Catatan
      const catatanField = identitasFields.find(f => f.label === 'Catatan' || f.nama_identitas === 'catatan');
      if (catatanField) {
        const catatanValue = formValues[catatanField.id_identitas_aktivitas];
        if (catatanValue && catatanValue.trim() !== '') {
          const draftStatusId = await getStatusId('draft');
          if (draftStatusId) {
            await update(identitasRef, {
              status_aktivitas_id: draftStatusId,
              updated_at: new Date().toISOString(),
            });
          }
        }
      }

      const valuesRef = ref(database, 'dtb_data_identitas_values');
      const valuesSnapshot = await get(valuesRef);
      const valuesData = valuesSnapshot.val();
      if (valuesData) {
        for (const key in valuesData) {
          if (valuesData[key].data_identitas_aktivitas_id === dataIdentitasId) {
            await remove(ref(database, `dtb_data_identitas_values/${key}`));
          }
        }
      }

      // 🔥 Simpan nilai baru dengan format DD/MM/YYYY untuk tanggal pengamatan
      for (const field of identitasFields) {
        const value = formValues[field.id_identitas_aktivitas];
        if (value) {
          let valueText = value;
          // Jika field adalah tanggal pengamatan dan value dalam format YYYY-MM-DD, ubah ke DD/MM/YYYY
          const isTanggal = field.label === 'Tanggal Pengamatan' || field.nama_identitas === 'tanggal_pengamatan';
          if (isTanggal && typeof value === 'string' && value.includes('-')) {
            const parts = value.split('-');
            if (parts.length === 3) {
              valueText = `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
          }
          if (typeof valueText === 'string' && valueText.trim() !== '') {
            const newValueRef = push(valuesRef);
            const dataIdentitasValueId = newValueRef.key;
            await set(newValueRef, {
              id_data_identitas_value: dataIdentitasValueId,
              data_identitas_aktivitas_id: dataIdentitasId,
              identitas_aktivitas_id: field.id_identitas_aktivitas,
              value_text: valueText,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        }
      }

      // 🔥 PERBAIKAN: Hapus bagian yang mengubah status ke draft secara otomatis.
      // Status hanya akan berubah melalui proses penambahan item/detail (TambahItem, TambahDetailItem).
      // Jika ingin tetap mengikuti aturan, bisa dilakukan pengecekan, tetapi untuk edit identitas
      // sebaiknya status tetap seperti sebelumnya.

    } catch (error) {
      console.error('Error saving edited identitas:', error);
      throw error;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await saveEditedIdentitas();
      setSuccessMessage('Data identitas berhasil diperbarui!');
      setSuccess(true);
      setTimeout(() => navigate(-1), 1500);
    } catch (error) {
      console.error('Error updating identitas:', error);
      setError('Gagal memperbarui data identitas: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', pt: 0, pb: 10 }}>
      <AppBar
        title="Edit Identitas"
        showBackButton
        onBackClick={handleBack}
        showLogout={false}
      />
      <Container maxWidth="sm" sx={{ pt: 2, pb: 8, px: 2 }}>
        {/* Header Info */}
        <Box sx={{ mb:2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Aktivitas {activityData?.nama_aktivitas}
            </Typography>
            <Typography variant="subtitle1" fontWeight="bold">
              {activityData?.inisial} / {daftarAktivitasData?.nama_daftar_aktivitas}
            </Typography>
          </Box>
          <Chip label="Mode Edit" size="small" color="warning" sx={{ mt: 1 }} />
        </Box>

        <Paper sx={{ p: 2, borderRadius: '4px' }}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
            Edit Form Identitas
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {identitasFields.length === 0 ? (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
              Tidak ada field identitas yang tersedia
            </Typography>
          ) : (
            identitasFields.map((field) => (
              <Box key={field.id_identitas_aktivitas} sx={{ mb: 2 }}>
                {renderInputField(field)}
              </Box>
            ))
          )}
        </Paper>
      </Container>

      <Container
        maxWidth="sm"
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          px: 0,
          zIndex: 1000,
        }}
      >
        <Box
          sx={{
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: (theme) => theme.palette.background.paper,
            p: 1.5,
          }}
        >
          <Button
            fullWidth
            variant="contained"
            size="large"
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving}
            sx={{
              borderRadius: '4px',
              textTransform: 'none',
              fontWeight: 600,
              py: 1.5,
            }}
          >
            {saving ? 'Menyimpan...' : 'Perbarui Identitas'}
          </Button>
        </Box>
      </Container>

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
        <Alert severity="success">{successMessage}</Alert>
      </Snackbar>

      {/* 🔥 CSS Animasi untuk slide up (sama seperti di TambahIdentitas) */}
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

export default EditIdentitas;