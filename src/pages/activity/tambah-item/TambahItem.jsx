// focus/src/pages/activity/tambah-item/TambahItem.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  IconButton,
  CircularProgress,
  Divider,
  Chip,
  Alert,
  Snackbar,
  Card,
  CardContent,
  Autocomplete,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { database, ref, get, child, push, set, update } from '../../../config/firebase';
import { useAuth } from '../../../context/AuthContext';
import AppBar from '../../../components/surface/app-bar/AppBar';
import Dialog from '../../../components/feedback/dialog/Dialog';

// Opsi untuk field Losses
const lossesOptions = [
  { label: 'ABNDN', value: 'ABNDN' },
  { label: 'ABNRL', value: 'ABNRL' },
  { label: 'BD', value: 'BD' },
  { label: 'BNECK', value: 'BNECK' },
  { label: 'BRMXL', value: 'BRMXL' },
  { label: 'BSV', value: 'BSV' },
  { label: 'BT', value: 'BT' },
  { label: 'CMV', value: 'CMV' },
  { label: 'DO', value: 'DO' },
  { label: 'DOF', value: 'DOF' },
  { label: 'HR', value: 'HR' },
  { label: 'LG', value: 'LG' },
  { label: 'MOKO', value: 'MOKO' },
  { label: 'MUTAN', value: 'MUTAN' },
  { label: 'NFL', value: 'NFL' },
  { label: 'OVAG', value: 'OVAG' },
  { label: 'PD', value: 'PD' },
  { label: 'TO', value: 'TO' },
];

// Fungsi untuk mendapatkan warna status (sama seperti di DataIdentitas)
const getStatusColor = (statusName) => {
  if (!statusName) return 'text.primary';
  const lower = statusName.toLowerCase();
  if (lower === 'ongoing' || lower === 'sedang dikerjakan') return 'warning.main';
  if (lower === 'completed' || lower === 'selesai') return 'success.main';
  if (lower === 'draft' || lower === 'draf') return 'text.secondary';
  if (lower === 'pending') return 'info.main';
  if (lower === 'approved') return 'success.main';
  if (lower === 'rejected') return 'error.main';
  return 'text.primary';
};

const TambahItem = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [itemFields, setItemFields] = useState([]);
  const [dataIdentitasId, setDataIdentitasId] = useState(null);
  const [daftarAktivitasId, setDaftarAktivitasId] = useState(null);
  const [activityData, setActivityData] = useState(null);
  const [daftarAktivitasData, setDaftarAktivitasData] = useState(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [identitasValues, setIdentitasValues] = useState({});

  // 🔥 State untuk pelakuId, pelakuName, dan statusName
  const [pelakuId, setPelakuId] = useState(null);
  const [pelakuName, setPelakuName] = useState(''); // <-- tambahan
  const [statusName, setStatusName] = useState('');

  const lokasiMapRef = useRef({});

  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [tempDataIdentitasId, setTempDataIdentitasId] = useState(null);
  const [tempDaftarAktivitasId, setTempDaftarAktivitasId] = useState(null);
  const [tempActivityData, setTempActivityData] = useState(null);
  const [tempDataItemId, setTempDataItemId] = useState(null);

  const navigationState = location.state;

  useEffect(() => {
    const init = async () => {
      if (!navigationState || !navigationState.dataIdentitasId) {
        setError('Data tidak lengkap. Silakan ulangi dari awal.');
        setTimeout(() => navigate('/'), 2000);
        return;
      }

      setDataIdentitasId(navigationState.dataIdentitasId);
      setDaftarAktivitasId(navigationState.daftarAktivitasId);
      setActivityData(navigationState.aktivitasData);

      // 🔥 Ambil pelakuId dan statusName dari navigationState
      const finalPelakuId =
        navigationState.pelakuId ||
        navigationState.identitasValues?.pelakuId ||
        null;
      setPelakuId(finalPelakuId);

      const finalStatusName =
        navigationState.statusName ||
        navigationState.identitasValues?.statusName ||
        '';
      setStatusName(finalStatusName);

      // 🔥 Ambil pelakuName dari navigationState (jika ada) atau fetch dari database
      const pelakuNameFromState = navigationState.pelakuName || '';
      if (pelakuNameFromState) {
        setPelakuName(pelakuNameFromState);
      } else if (finalPelakuId) {
        try {
          const dbRef = ref(database);
          const userSnapshot = await get(child(dbRef, `users/${finalPelakuId}`));
          if (userSnapshot.exists()) {
            setPelakuName(userSnapshot.val().name || finalPelakuId);
          } else {
            setPelakuName(finalPelakuId);
          }
        } catch (err) {
          console.error('Error fetching user name:', err);
          setPelakuName(finalPelakuId);
        }
      }

      if (navigationState.daftarAktivitasData) {
        setDaftarAktivitasData(navigationState.daftarAktivitasData);
      } else {
        await fetchDaftarAktivitas(navigationState.daftarAktivitasId);
      }

      await fetchLokasiAndIdentitas(navigationState.dataIdentitasId);
      await fetchItemFields(navigationState.daftarAktivitasId);
    };
    init();
  }, [navigationState]);

  const fetchLokasiAndIdentitas = async (dataIdentitasId) => {
    try {
      const dbRef = ref(database);

      const lokasiSnapshot = await get(child(dbRef, 'tb_status_lokasi'));
      const lokasiData = lokasiSnapshot.val();
      const lokasiMap = {};
      if (lokasiData) {
        Object.values(lokasiData).forEach(item => {
          if (item.id_lokasi) {
            lokasiMap[item.id_lokasi] = item.lokasi || item.id_lokasi;
          }
        });
      }
      lokasiMapRef.current = lokasiMap;

      const valuesSnapshot = await get(child(dbRef, 'dtb_data_identitas_values'));
      const valuesData = valuesSnapshot.val();
      if (!valuesData) return;

      const valuesList = Object.values(valuesData);
      const filtered = valuesList.filter(
        item => item.data_identitas_aktivitas_id === dataIdentitasId
      );

      const identitasSnapshot = await get(child(dbRef, 'dtb_identitas_aktivitas'));
      const identitasData = identitasSnapshot.val();
      const identitasMap = {};
      if (identitasData) {
        Object.values(identitasData).forEach(field => {
          identitasMap[field.id_identitas_aktivitas] = field;
        });
      }

      const formatted = {};
      filtered.forEach(item => {
        const field = identitasMap[item.identitas_aktivitas_id];
        const label = field?.label || item.identitas_aktivitas_id;
        let value = item.value_text;
        if (field?.nama_identitas === 'lokasi' || field?.label === 'Lokasi') {
          value = lokasiMap[value] || value;
        }
        formatted[label] = value;
      });

      setIdentitasValues(formatted);
    } catch (error) {
      console.error('Error fetching lokasi and identitas data:', error);
    }
  };

  const fetchDaftarAktivitas = async (daftarId) => {
    try {
      const dbRef = ref(database);
      const daftarSnapshot = await get(child(dbRef, 'dtb_daftar_aktivitas'));
      const daftarData = daftarSnapshot.val();
      if (daftarData) {
        const daftarList = Object.values(daftarData);
        const found = daftarList.find(
          item => item.id_daftar_aktivitas === daftarId && item.is_active === true
        );
        if (found) setDaftarAktivitasData(found);
      }
    } catch (error) {
      console.error('Error fetching daftar aktivitas:', error);
    }
  };

  const fetchItemFields = async (daftarId) => {
    setLoading(true);
    setError('');
    try {
      const dbRef = ref(database);
      if (!daftarId) {
        setError('ID daftar aktivitas tidak ditemukan.');
        setItemFields([]);
        setItems([]);
        setLoading(false);
        return;
      }

      const itemSnapshot = await get(child(dbRef, 'dtb_item_aktivitas'));
      const itemData = itemSnapshot.val();
      if (!itemData) {
        setError('Tidak ada data item aktivitas di database');
        setItemFields([]);
        setItems([]);
        setLoading(false);
        return;
      }

      const foundItems = Object.values(itemData)
        .filter(item => item.daftar_aktivitas_id === daftarId && item.is_active === true)
        .sort((a, b) => (a.urutan || 0) - (b.urutan || 0));

      setItemFields(foundItems);
      
      if (foundItems.length > 0) {
        setItems([createEmptyItem(foundItems)]);
      } else {
        setError(`Tidak ada field item untuk daftar_aktivitas_id: "${daftarId}"`);
        setItems([]);
      }
    } catch (error) {
      console.error('Error fetching item fields:', error);
      setError('Gagal memuat data item: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const createEmptyItem = (fields) => {
    const itemValues = {};
    fields.forEach(field => {
      itemValues[field.id_item_aktivitas] = '';
    });
    return {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      values: itemValues,
    };
  };

  const handleItemValueChange = (itemIndex, fieldId, value) => {
    const updatedItems = [...items];
    updatedItems[itemIndex].values[fieldId] = value;
    setItems(updatedItems);
  };

  const handleAddItem = () => {
    if (itemFields.length > 0) {
      setItems([...items, createEmptyItem(itemFields)]);
    }
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) {
      setError('Minimal harus ada satu item');
      return;
    }
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
  };

  const renderItemField = (field, value, index) => {
    const isRequired = field.is_required === true;
    const placeholder = field.placeholder || '';
    const fieldValue = value !== undefined && value !== null ? String(value) : '';
    const isLossesField = field.label === 'Losses' || field.nama_field === 'losses';

    switch (field.tipe_input) {
      case 'text':
        return (
          <TextField
            fullWidth
            label={field.label}
            placeholder={placeholder}
            value={fieldValue}
            onChange={(e) => handleItemValueChange(index, field.id_item_aktivitas, e.target.value)}
            required={isRequired}
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '4px',
                '& fieldset': {
                  borderRadius: '4px',
                },
              },
            }}
          />
        );
      case 'number':
        return (
          <TextField
            fullWidth
            label={field.label}
            type="text"
            inputMode="numeric"
            placeholder={placeholder}
            value={fieldValue}
            onChange={(e) => handleItemValueChange(index, field.id_item_aktivitas, e.target.value)}
            required={isRequired}
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '4px',
                '& fieldset': {
                  borderRadius: '4px',
                },
              },
            }}
          />
        );
      case 'date':
        return (
          <TextField
            fullWidth
            label={field.label}
            type="date"
            value={fieldValue}
            onChange={(e) => handleItemValueChange(index, field.id_item_aktivitas, e.target.value)}
            required={isRequired}
            size="small"
            InputLabelProps={{ shrink: true }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '4px',
                '& fieldset': {
                  borderRadius: '4px',
                },
              },
            }}
          />
        );
      case 'select':
        const selectOptions = isLossesField ? lossesOptions : [
          { label: 'Opsi 1', value: 'option1' },
          { label: 'Opsi 2', value: 'option2' },
          { label: 'Opsi 3', value: 'option3' },
        ];
        return (
          <Autocomplete
            fullWidth
            options={selectOptions}
            getOptionLabel={(option) => option.label || ''}
            value={selectOptions.find(opt => opt.value === fieldValue) || null}
            onChange={(event, newValue) => {
              handleItemValueChange(index, field.id_item_aktivitas, newValue ? newValue.value : '');
            }}
            size="small"
            renderInput={(params) => (
              <TextField
                {...params}
                label={field.label}
                placeholder={placeholder}
                required={isRequired}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '4px',
                    '& fieldset': {
                      borderRadius: '4px',
                    },
                  },
                }}
              />
            )}
            isOptionEqualToValue={(option, val) => option.value === val?.value}
            disablePortal
          />
        );
      default:
        return (
          <TextField
            fullWidth
            label={field.label}
            placeholder={placeholder}
            value={fieldValue}
            onChange={(e) => handleItemValueChange(index, field.id_item_aktivitas, e.target.value)}
            required={isRequired}
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '4px',
                '& fieldset': {
                  borderRadius: '4px',
                },
              },
            }}
          />
        );
    }
  };

  const validateItems = () => {
    let isValid = true;
    let errorMessages = [];
    items.forEach((item, index) => {
      itemFields.forEach(field => {
        if (field.is_required && !item.values[field.id_item_aktivitas]) {
          isValid = false;
          errorMessages.push(`Item ${index + 1}: ${field.label} wajib diisi`);
        }
      });
    });
    if (!isValid) {
      setError(`Mohon lengkapi data yang wajib:\n${errorMessages.join('\n')}`);
    }
    return isValid;
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

  const updateIdentitasStatus = async () => {
    try {
      const dbRef = ref(database);
      const itemSnapshot = await get(child(dbRef, 'dtb_data_item_aktivitas'));
      const itemData = itemSnapshot.val();
      const activeItems = [];
      if (itemData) {
        for (const key in itemData) {
          const item = itemData[key];
          if (item.data_identitas_aktivitas_id === dataIdentitasId && item.is_active === true) {
            activeItems.push({ key, id: item.id_data_item_aktivitas });
          }
        }
      }

      if (activeItems.length === 0) return;

      const detailSnapshot = await get(child(dbRef, 'dtb_data_detail_item_aktivitas'));
      const detailData = detailSnapshot.val();
      const allHasDetail = activeItems.every(item => {
        if (!detailData) return false;
        for (const key in detailData) {
          const detail = detailData[key];
          if (detail.data_item_aktivitas_id === item.id && detail.is_active === true) {
            return true;
          }
        }
        return false;
      });

      let statusName = 'ongoing';
      if (allHasDetail) {
        statusName = 'draft';
      }
      const statusId = await getStatusId(statusName);
      if (!statusId) return;

      const identitasRef = ref(database, `dtb_data_identitas_aktivitas/${dataIdentitasId}`);
      await update(identitasRef, {
        status_aktivitas_id: statusId,
        updated_at: new Date().toISOString(),
      });

      console.log(`✅ Status identitas diubah menjadi ${statusName} (${statusId})`);
    } catch (error) {
      console.error('Error updating identitas status:', error);
    }
  };

  const saveItemData = async () => {
    try {
      const itemDataRef = ref(database, 'dtb_data_item_aktivitas');
      const savedItemIds = [];

      for (const item of items) {
        const newItemRef = push(itemDataRef);
        const dataItemId = newItemRef.key;
        savedItemIds.push(dataItemId);

        const newItemData = {
          id_data_item_aktivitas: dataItemId,
          data_identitas_aktivitas_id: dataIdentitasId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_active: true,
        };
        await set(newItemRef, newItemData);

        const valuesRef = ref(database, 'dtb_data_item_values');
        for (const field of itemFields) {
          const value = item.values[field.id_item_aktivitas];
          if (value) {
            const newValueRef = push(valuesRef);
            const dataItemValueId = newValueRef.key;
            await set(newValueRef, {
              id_data_item_value: dataItemValueId,
              data_item_aktivitas_id: dataItemId,
              item_aktivitas_id: field.id_item_aktivitas,
              value_text: value,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        }
      }

      await updateIdentitasStatus();

      return savedItemIds.length > 0 ? savedItemIds[0] : null;
    } catch (error) {
      console.error('Error saving item data:', error);
      throw error;
    }
  };

  const checkHasDetailItem = async () => {
    try {
      const dbRef = ref(database);
      const detailItemSnapshot = await get(child(dbRef, 'dtb_detail_item_aktivitas'));
      const detailItemData = detailItemSnapshot.val();
      if (!detailItemData) return false;
      const detailList = Object.values(detailItemData);
      return detailList.some(
        item => item.daftar_aktivitas_id === daftarAktivitasId && item.is_active === true
      );
    } catch (error) {
      console.error('Error checking detail item:', error);
      return false;
    }
  };

  const handleSave = async () => {
    if (!validateItems()) return;
    setSaving(true);
    setError('');

    try {
      const dataItemId = await saveItemData();
      setSuccessMessage('Data item berhasil disimpan!');
      setSuccess(true);

      const hasDetailItem = await checkHasDetailItem();
      if (hasDetailItem && dataItemId) {
        setTempDataIdentitasId(dataIdentitasId);
        setTempDaftarAktivitasId(daftarAktivitasId);
        setTempActivityData(activityData);
        setTempDataItemId(dataItemId);
        setTimeout(() => setShowDetailDialog(true), 500);
      } else {
        setTimeout(() => {
          // 🔥 Kembali ke DataItem dengan pelakuId, pelakuName, dan statusName
          navigate('/data-item', {
            state: {
              dataIdentitasId: dataIdentitasId,
              daftarAktivitasId: daftarAktivitasId,
              aktivitasId: activityData?.id_aktivitas,
              identitasValues: identitasValues,
              activityData: activityData,
              daftarAktivitasData: daftarAktivitasData,
              pelakuId: pelakuId,
              pelakuName: pelakuName,
              statusName: statusName,
            }
          });
        }, 1500);
      }
    } catch (error) {
      console.error('Error saving item data:', error);
      setError('Gagal menyimpan data item: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDialogConfirm = () => {
    setShowDetailDialog(false);
    navigate('/tambah-detail-item', {
      state: {
        dataIdentitasId: tempDataIdentitasId,
        daftarAktivitasId: tempDaftarAktivitasId,
        aktivitasData: tempActivityData,
        dataItemId: tempDataItemId,
        identitasValues: identitasValues,
        pelakuId: pelakuId,
        pelakuName: pelakuName,
        statusName: statusName,
      },
    });
  };

  const handleDialogClose = () => {
    setShowDetailDialog(false);
    navigate('/data-item', {
      state: {
        dataIdentitasId: tempDataIdentitasId || dataIdentitasId,
        daftarAktivitasId: tempDaftarAktivitasId || daftarAktivitasId,
        aktivitasId: activityData?.id_aktivitas,
        identitasValues: identitasValues,
        activityData: activityData,
        daftarAktivitasData: daftarAktivitasData,
        pelakuId: pelakuId,
        pelakuName: pelakuName,
        statusName: statusName,
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
        title="Tambah Item"
        showBackButton
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
              {activityData?.inisial} / {daftarAktivitasData?.nama_daftar_aktivitas}
            </Typography>
          </Box>
        </Box>
        
        {/* ========================================================== */}
        {/* DATA IDENTITAS - DENGAN PENAMBAHAN PENGAWAS & STATUS */}
        {/* ========================================================== */}
        {Object.keys(identitasValues).length > 0 && (
          <Paper sx={{ p: 2, mb: 2, borderRadius: '4px', bgcolor: '#A5D6A7' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
              Data Identitas
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1 }}>
              {/* Pengamat */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Pengamat
                </Typography>
                <Typography variant="body2">
                  {pelakuName || '-'}
                </Typography>
              </Box>
              {/* Status */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Status
                </Typography>
                <Typography variant="body2" sx={{ color: getStatusColor(statusName), fontWeight: 500 }}>
                  {statusName || '-'}
                </Typography>
              </Box>
              {/* Field identitas lainnya */}
              {Object.entries(identitasValues).map(([label, value]) => (
                <Box
                  key={label}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    py: 0.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:last-child': { borderBottom: 'none' },
                  }}
                >
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                    {label}
                  </Typography>
                  <Typography variant="body2">{value}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        )}

        <Paper sx={{ p: 2, borderRadius: '4px' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold">
              Data Item / Plot
            </Typography>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={handleAddItem}
              variant="outlined"
              sx={{ borderRadius: '4px', textTransform: 'none' }}
              disabled={itemFields.length === 0}
            >
              Tambah Item
            </Button>
          </Box>
          <Divider sx={{ mb: 2 }} />
          {itemFields.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                Tidak ada field item yang tersedia
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                daftar_aktivitas_id: {daftarAktivitasId || '-'}
              </Typography>
            </Box>
          ) : (
            items.map((item, index) => (
              <Card key={item.id} variant="outlined" sx={{ mb: 2, borderRadius: '4px', boxShadow: 0 }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold" color="primary">
                      Item #{index + 1}
                    </Typography>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveItem(index)}
                      disabled={items.length <= 1}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  {itemFields.map((field) => (
                    <Box key={field.id_item_aktivitas} sx={{ mb: 2 }}>
                      {renderItemField(field, item.values[field.id_item_aktivitas], index)}
                    </Box>
                  ))}
                </CardContent>
              </Card>
            ))
          )}
          {itemFields.length > 0 && items.length > 0 && (
            <Button
              fullWidth
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddItem}
              sx={{ mt: 1, borderRadius: '4px', textTransform: 'none' }}
            >
              Tambah Item Lainnya
            </Button>
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
            disabled={saving || itemFields.length === 0}
            sx={{
              borderRadius: '4px',
              textTransform: 'none',
              fontWeight: 600,
              py: 1.5,
            }}
          >
            {saving ? 'Menyimpan...' : 'Simpan Item'}
          </Button>
        </Box>
      </Container>

      <Dialog
        open={showDetailDialog}
        onClose={handleDialogClose}
        onConfirm={handleDialogConfirm}
        title="Tambah Detail Item"
        message="Tambah data detail item sekarang?"
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
        <Alert severity="success">{successMessage || 'Data item berhasil disimpan!'}</Alert>
      </Snackbar>
    </Box>
  );
};

export default TambahItem;