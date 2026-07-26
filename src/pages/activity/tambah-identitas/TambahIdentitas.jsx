// focus/src/pages/activity/tambah-identitas/TambahIdentitas.jsx
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
} from '@mui/material';
import {
  Save as SaveIcon,
} from '@mui/icons-material';
import { database, ref, get, child, push, set } from '../../../config/firebase';
import { useAuth } from '../../../context/AuthContext';
import AppBar from '../../../components/surface/app-bar/AppBar';
import Dialog from '../../../components/feedback/dialog/Dialog';
import DatePickers from '../../../components/date-pickers/DatePickers';
import dayjs from 'dayjs';

// 🔥 Import untuk MobileDatePicker
import { MobileDatePicker } from '@mui/x-date-pickers/MobileDatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

// Helper: get week number from date string (DD/MM/YYYY)
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

// 🔥 Opsi untuk field "Aktivitas"
const aktivitasOptions = [
  { label: 'Diseases Survey', value: 'Diseases Survey' },
  { label: 'Diseases Survey - Next 1', value: 'Diseases Survey - Next 1' },
];

const TambahIdentitas = () => {
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
  const [savedDataIdentitasId, setSavedDataIdentitasId] = useState(null);

  // State untuk dialog
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [tempDataIdentitasId, setTempDataIdentitasId] = useState(null);
  const [tempDaftarAktivitasId, setTempDaftarAktivitasId] = useState(null);
  const [tempActivityData, setTempActivityData] = useState(null);
  const [tempPelakuId, setTempPelakuId] = useState(null);
  const [tempStatusName, setTempStatusName] = useState('');

  // Ambil data dari navigation state
  const activityData = location.state?.activity;
  const daftarAktivitasId = location.state?.daftarAktivitasId;
  const navigationState = location.state;
  const lokasiTerpilih = location.state?.lokasiTerpilih;

  useEffect(() => {
    if (!activityData) {
      navigate('/');
      return;
    }
    fetchIdentitasFields();
  }, [activityData]);

  // 🔥 Isi tanggal pengamatan dan week jika ada dari navigationState
  useEffect(() => {
    if (navigationState?.tanggalPengamatan && identitasFields.length > 0) {
      const tanggalField = identitasFields.find(
        f => f.label === 'Tanggal Pengamatan' || f.nama_identitas === 'tanggal_pengamatan'
      );
      if (tanggalField) {
        console.log('🔥 Mengisi tanggal pengamatan dari useEffect:', navigationState.tanggalPengamatan);
        const dateStr = navigationState.tanggalPengamatan;
        // Cek validasi format DD/MM/YYYY
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const year = parseInt(parts[2], 10);
          const date = new Date(year, month, day);
          if (!isNaN(date.getTime())) {
            // Konversi ke YYYY-MM-DD untuk DatePickers
            const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const updates = {
              [tanggalField.id_identitas_aktivitas]: formattedDate,
            };
            // Cari field week dan isi otomatis
            const weekField = identitasFields.find(
              f => f.label === 'Week Pengamatan' || f.nama_identitas === 'week_pengamatan'
            );
            if (weekField) {
              const weekNumber = getWeekNumber(dateStr);
              if (weekNumber) {
                updates[weekField.id_identitas_aktivitas] = String(weekNumber);
                console.log('📅 Week Pengamatan otomatis diisi:', weekNumber);
              }
            }
            setFormValues(prev => ({
              ...prev,
              ...updates,
            }));
          } else {
            console.warn('⚠️ Tanggal tidak valid:', navigationState.tanggalPengamatan);
          }
        }
      }
    }
  }, [navigationState?.tanggalPengamatan, identitasFields]);

  useEffect(() => {
    if (identitasFields.length > 0) {
      const lokasiField = identitasFields.find(field => field.label === 'Lokasi' || field.nama_identitas === 'lokasi');
      if (lokasiField) {
        fetchFilterLokasi();
      }
    }
  }, [identitasFields]);

  useEffect(() => {
    if (lokasiTerpilih && lokasiOptions.length > 0 && identitasFields.length > 0) {
      const lokasiField = identitasFields.find(
        f => f.label === 'Lokasi' || f.nama_identitas === 'lokasi'
      );
      if (lokasiField) {
        const found = lokasiOptions.some(opt => opt.id_lokasi === lokasiTerpilih.id_lokasi);
        if (found) {
          setFormValues(prev => ({
            ...prev,
            [lokasiField.id_identitas_aktivitas]: lokasiTerpilih.id_lokasi,
          }));
        }
      }
    }
  }, [lokasiOptions, lokasiTerpilih, identitasFields]);

  const fetchIdentitasFields = async () => {
    setLoading(true);
    try {
      const dbRef = ref(database);

      const daftarSnapshot = await get(child(dbRef, 'dtb_daftar_aktivitas'));
      const daftarData = daftarSnapshot.val();

      let selectedDaftar = null;
      if (daftarData) {
        const daftarList = Object.values(daftarData);
        if (daftarAktivitasId) {
          selectedDaftar = daftarList.find(
            item => item.id_daftar_aktivitas === daftarAktivitasId && item.is_active === true
          );
        }
        if (!selectedDaftar) {
          selectedDaftar = daftarList.find(
            item => item.aktivitas_id === activityData.id_aktivitas && item.is_active === true
          );
        }
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
          filteredIdentitas.forEach(field => {
            initialValues[field.id_identitas_aktivitas] = '';
          });
          setFormValues(initialValues);
        }
      } else {
        setError('Tidak ada daftar aktivitas yang tersedia untuk aktivitas ini');
      }
    } catch (error) {
      console.error('Error fetching identitas fields:', error);
      setError('Gagal memuat data identitas');
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterLokasi = async () => {
    setLoadingLokasi(true);
    try {
      const dbRef = ref(database);

      const filterSnapshot = await get(child(dbRef, 'dtb_filter_lokasi_aktivitas'));
      const filterData = filterSnapshot.val();

      let jenisTanamanList = [];
      if (filterData) {
        const filterList = Object.values(filterData);
        const activeFilter = filterList.filter(
          item => item.daftar_aktivitas_id === selectedDaftarAktivitas?.id_daftar_aktivitas && item.is_active === true
        );
        jenisTanamanList = activeFilter.map(item => item.jenis_tanaman);
      }

      if (jenisTanamanList.length > 0) {
        const lokasiSnapshot = await get(child(dbRef, 'tb_status_lokasi'));
        const lokasiData = lokasiSnapshot.val();

        if (lokasiData) {
          const lokasiList = Object.values(lokasiData);
          const filteredLokasi = lokasiList.filter(
            item => jenisTanamanList.includes(item.jenis_tanaman) && item.is_active !== false
          );

          const groupedLokasi = {};
          filteredLokasi.forEach(item => {
            const key = `${item.lokasi}|${item.jenis_tanaman}`;
            if (!groupedLokasi[key] || new Date(item.tanggal_mulai_perawatan) > new Date(groupedLokasi[key].tanggal_mulai_perawatan)) {
              groupedLokasi[key] = item;
            }
          });

          const uniqueLokasi = Object.values(groupedLokasi);
          const formattedOptions = uniqueLokasi.map(item => ({
            id_lokasi: item.id_lokasi,
            label: `${item.lokasi}`,
            deskripsi: item.deskripsi,
            lokasi: item.lokasi,
          }));
          setLokasiOptions(formattedOptions);
        }
      }
    } catch (error) {
      console.error('Error fetching filter lokasi:', error);
    } finally {
      setLoadingLokasi(false);
    }
  };

  // ========== FUNGSI UNTUK WORKFLOW APPROVAL ==========
  const getWorkflowApproval = async (daftarAktivitasId) => {
    try {
      const dbRef = ref(database);
      const workflowSnapshot = await get(child(dbRef, 'dtb_workflow_approval'));
      const workflowData = workflowSnapshot.val();
      if (!workflowData) return { workflowId: '', stepId: '' };

      // Cari workflow yang aktif dan sesuai daftar_aktivitas_id
      let workflowId = '';
      for (const key in workflowData) {
        const wf = workflowData[key];
        if (wf.daftar_aktivitas_id === daftarAktivitasId && wf.is_active === true) {
          workflowId = wf.id_workflow_approval;
          break;
        }
      }
      if (!workflowId) return { workflowId: '', stepId: '' };

      // Ambil step pertama (urutan terkecil) yang aktif
      const stepSnapshot = await get(child(dbRef, 'dtb_workflow_approval_steps'));
      const stepData = stepSnapshot.val();
      if (!stepData) return { workflowId, stepId: '' };

      let firstStepId = '';
      let minUrutan = Infinity;
      for (const key in stepData) {
        const step = stepData[key];
        if (step.workflow_approval_id === workflowId && step.is_active === true) {
          if (step.urutan < minUrutan) {
            minUrutan = step.urutan;
            firstStepId = step.id_workflow_approval_steps;
          }
        }
      }
      return { workflowId, stepId: firstStepId };
    } catch (error) {
      console.error('Error fetching workflow approval:', error);
      return { workflowId: '', stepId: '' };
    }
  };
  // ===================================================

  // Fungsi untuk mendapatkan status id dari nama status
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

  const handleInputChange = (fieldId, value) => {
    setFormValues(prev => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleTanggalPengamatanChange = (fieldId, value) => {
    console.log('📅 handleTanggalPengamatanChange called with value:', value);
    // value dari MobileDatePicker adalah dayjs object atau null
    let formattedValue = '';
    let dateStrForWeek = '';
    
    if (value && value.isValid()) {
      // Format ke YYYY-MM-DD untuk disimpan
      formattedValue = value.format('YYYY-MM-DD');
      // Format ke DD/MM/YYYY untuk perhitungan week
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

  const handleNumberChange = (fieldId, value) => {
    const numericValue = value.replace(/[^0-9.-]/g, '');
    handleInputChange(fieldId, numericValue);
  };

  const renderInputField = (field) => {
    const value = formValues[field.id_identitas_aktivitas] || '';
    const isRequired = field.is_required === true;
    const isTanggalPengamatan = field.label === 'Tanggal Pengamatan' || field.nama_identitas === 'tanggal_pengamatan';

    if (isTanggalPengamatan) {
      // 🔥 Gunakan MobileDatePicker dengan slide-up dari bawah
      // Lebar dialog menyesuaikan dengan area konten (max-width: sm)
      // 🔥 Tidak bisa memilih tanggal di masa depan (disableFuture)
      // 🔥 Mencegah close saat klik backdrop (disableCloseOnBackdropClick)
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
              // Hanya izinkan close jika reason adalah 'cancel' atau 'accept'
              // Selain itu (seperti 'backdropClick') akan diabaikan
              if (reason === 'cancel' || reason === 'accept') {
                return;
              }
              // Jika reason adalah 'escape' (tombol ESC), kita biarkan
              if (reason === 'escape') {
                return;
              }
              // Untuk reason lainnya (termasuk backdropClick), kita cegah
              // dengan mengembalikan false
              return false;
            }}
          />
        </LocalizationProvider>
      );
    }

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
            onChange={(e) => handleNumberChange(field.id_identitas_aktivitas, e.target.value)}
            required={isRequired}
            size="medium"
            inputProps={{ inputMode: 'numeric', pattern: '[0-9.-]*' }}
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '4px' } }}
          />
        );
      case 'date':
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

  // ===================== SAVE DATA =====================
  const saveIdentitasData = async () => {
    // Validasi required fields
    const emptyFields = identitasFields.filter(
      field => field.is_required && !formValues[field.id_identitas_aktivitas]
    );

    if (emptyFields.length > 0) {
      setError(`Mohon isi field yang wajib: ${emptyFields.map(f => f.label).join(', ')}`);
      return null;
    }

    try {
      // 🔥 Ambil workflow approval untuk daftar aktivitas ini
      const { workflowId, stepId } = await getWorkflowApproval(selectedDaftarAktivitas?.id_daftar_aktivitas);

      // Get status 'ongoing'
      const statusOngoingId = await getStatusId('ongoing');

      // Cek field Catatan
      const catatanField = identitasFields.find(f => f.label === 'Catatan' || f.nama_identitas === 'catatan');
      let statusId = statusOngoingId;
      if (catatanField) {
        const catatanValue = formValues[catatanField.id_identitas_aktivitas];
        if (catatanValue && catatanValue.trim() !== '') {
          const draftStatusId = await getStatusId('draft');
          if (draftStatusId) {
            statusId = draftStatusId;
          }
        }
      }

      const newDataRef = ref(database, 'dtb_data_identitas_aktivitas');
      const newDataRefPush = push(newDataRef);
      const dataIdentitasId = newDataRefPush.key;

      // === OBJEK DATA BARU (tanpa atasan_id dan catatan_revisi) ===
      const newData = {
        id_data_identitas_aktivitas: dataIdentitasId,
        pelaku_id: userData?.uid || '',
        daftar_aktivitas_id: selectedDaftarAktivitas?.id_daftar_aktivitas || '',
        status_aktivitas_id: statusId,
        // Field baru:
        current_workflow_approval_id: workflowId || '',
        current_workflow_approval_steps_id: stepId || '',
        status_approval: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true,
      };

      await set(newDataRefPush, newData);

      // Simpan nilai identitas ke dtb_data_identitas_values
      const valuesRef = ref(database, 'dtb_data_identitas_values');
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

      return dataIdentitasId;
    } catch (error) {
      console.error('Error saving data:', error);
      throw error;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const dataIdentitasId = await saveIdentitasData();

      if (!dataIdentitasId) {
        setSaving(false);
        return;
      }

      setSavedDataIdentitasId(dataIdentitasId);
      setSuccessMessage('Data identitas berhasil disimpan!');
      setSuccess(true);

      const isItemWajib = selectedDaftarAktivitas?.is_item_wajib || false;

      if (isItemWajib) {
        setTempDataIdentitasId(dataIdentitasId);
        setTempDaftarAktivitasId(selectedDaftarAktivitas?.id_daftar_aktivitas);
        setTempActivityData(activityData);
        setTempPelakuId(userData?.uid);
        setTempStatusName('ongoing');

        setTimeout(() => {
          setShowItemDialog(true);
        }, 500);
      } else {
        setTimeout(() => {
          navigate('/data-identitas', {
            state: {
              daftarAktivitasId: selectedDaftarAktivitas?.id_daftar_aktivitas,
              aktivitasId: activityData?.id_aktivitas,
              title: activityData?.nama_aktivitas,
            }
          });
        }, 1500);
      }

    } catch (error) {
      console.error('Error saving data:', error);
      setError('Gagal menyimpan data identitas');
    } finally {
      setSaving(false);
    }
  };

  // Handler untuk dialog - Ya (lanjut ke Tambah Item)
  const handleDialogConfirm = () => {
    setShowItemDialog(false);
    navigate('/tambah-item', {
      state: {
        dataIdentitasId: tempDataIdentitasId,
        daftarAktivitasId: tempDaftarAktivitasId,
        aktivitasData: tempActivityData,
        pelakuId: tempPelakuId,
        statusName: tempStatusName,
      }
    });
  };

  const handleDialogClose = () => {
    setShowItemDialog(false);
    navigate('/data-identitas', {
      state: {
        daftarAktivitasId: tempDaftarAktivitasId || daftarAktivitasId,
        aktivitasId: tempActivityData?.id_aktivitas || activityData?.id_aktivitas,
        title: tempActivityData?.nama_aktivitas || activityData?.nama_aktivitas,
      }
    });
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
        title="Tambah Identitas"
        showBackButton={true}
        onBackClick={handleBack}
        showLogout={false}
      />

      <Container maxWidth="sm" sx={{ pt: 2, pb: 8, px: 2 }}>
        <Box sx={{ mb:2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Aktivitas {activityData?.nama_aktivitas}
            </Typography>
            <Typography variant="subtitle1" fontWeight="bold">
              {activityData?.inisial} / {selectedDaftarAktivitas?.nama_daftar_aktivitas || 'Daftar aktivitas tidak tersedia'}
            </Typography>
          </Box>
        </Box>

        <Paper sx={{ p: 2, borderRadius: '4px' }}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
            Form Identitas
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

      {identitasFields.length > 0 && (
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
              {saving ? 'Menyimpan...' : 'Simpan Identitas'}
            </Button>
          </Box>
        </Container>
      )}

      <Dialog
        open={showItemDialog}
        onClose={handleDialogClose}
        onConfirm={handleDialogConfirm}
        title="Tambah Item"
        message="Tambah data item sekarang?"
        confirmText="Ya"
        cancelText="Tidak"
        variant="info"
        confirmColor="primary"
      />

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
          {successMessage || 'Data identitas berhasil disimpan!'}
        </Alert>
      </Snackbar>

      {/* 🔥 CSS Animasi untuk slide up */}
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

export default TambahIdentitas;