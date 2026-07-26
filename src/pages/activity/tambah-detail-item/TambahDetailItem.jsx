// focus/src/pages/activity/tambah-detail-item/TambahDetailItem.jsx
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { database, ref, get, child, push, set, update } from '../../../config/firebase';
import { useAuth } from '../../../context/AuthContext';
import AppBar from '../../../components/surface/app-bar/AppBar';

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

// 🔥 Internal fields yang tidak ditampilkan sebagai identitas
// Tambahkan 'catatanRevisi' untuk menyembunyikan catatan revisi
const internalFields = [
  'id', 'pelakuId', 'pelakuName', 'createdAt', 'status', 'statusName',
  'updatedAt', 'atasan_id', 'catatan_revisi', 'catatanRevisi', 'is_active'
];

// 🔥 Fungsi untuk mendapatkan warna status
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

// ============================================================
// 🔥 FUNGSI UTILITAS UNTUK KALKULASI
// ============================================================

const calculateFieldValue = (field, itemValues, allFields) => {
  if (!field.is_calculation) {
    return itemValues[field.id_detail_item_aktivitas] || '';
  }

  const formula = field.calculation_formula || '';
  if (!formula) return '';

  const depends = field.depends_on_fields ? field.depends_on_fields.split(',').map(id => id.trim()) : [];
  if (depends.length === 0) return '';

  const valueMap = {};
  depends.forEach(depId => {
    const depField = allFields.find(f => f.id_detail_item_aktivitas === depId);
    if (depField) {
      const val = itemValues[depId] || 0;
      const key = depField.nama_field || depField.label || depId;
      valueMap[key] = val;
    }
  });

  let expression = formula;
  for (const [key, val] of Object.entries(valueMap)) {
    const regex = new RegExp(`\\b${key}\\b`, 'g');
    expression = expression.replace(regex, `(${val})`);
  }

  const sanitized = expression.replace(/[^0-9+\-*/.() ]/g, '');
  if (!sanitized) return '';

  try {
    const result = Function(`"use strict"; return (${sanitized})`)();
    return isNaN(result) ? '' : String(result);
  } catch (e) {
    console.warn('Error calculating field:', field.label, e);
    return '';
  }
};

const recalculateItem = (item, allFields) => {
  const newValues = { ...item.values };
  const calcFields = allFields.filter(f => f.is_calculation === true);
  calcFields.forEach(field => {
    const result = calculateFieldValue(field, newValues, allFields);
    newValues[field.id_detail_item_aktivitas] = result;
  });
  return { ...item, values: newValues };
};

// ============================================================
// KOMPONEN UTAMA
// ============================================================

const TambahDetailItem = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detailItemFields, setDetailItemFields] = useState([]);
  const [groupedFields, setGroupedFields] = useState({});
  const [dataIdentitasId, setDataIdentitasId] = useState(null);
  const [daftarAktivitasId, setDaftarAktivitasId] = useState(null);
  const [activityData, setActivityData] = useState(null);
  const [daftarAktivitasData, setDaftarAktivitasData] = useState(null);
  const [dataItemId, setDataItemId] = useState(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [groupData, setGroupData] = useState({});
  const [identitasValues, setIdentitasValues] = useState({});
  const [itemValues, setItemValues] = useState({});

  // 🔥 State untuk pelakuId, pelakuName, dan statusName
  const [pelakuId, setPelakuId] = useState(null);
  const [pelakuName, setPelakuName] = useState('');
  const [statusName, setStatusName] = useState('');

  const lokasiMapRef = useRef({});

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
      setDataItemId(navigationState.dataItemId);

      // 🔥 Ambil pelakuId, pelakuName, dan statusName
      const finalPelakuId =
        navigationState.pelakuId ||
        navigationState.identitasValues?.pelakuId ||
        null;
      setPelakuId(finalPelakuId);

      const pelakuNameFromState = navigationState.pelakuName || '';
      const pelakuNameFromValues = navigationState.identitasValues?.pelakuName || '';
      setPelakuName(pelakuNameFromState || pelakuNameFromValues);

      const finalStatusName =
        navigationState.statusName ||
        navigationState.identitasValues?.statusName ||
        '';
      setStatusName(finalStatusName);

      if (navigationState.daftarAktivitasData) {
        setDaftarAktivitasData(navigationState.daftarAktivitasData);
      } else {
        await fetchDaftarAktivitas(navigationState.daftarAktivitasId);
      }

      if (navigationState.identitasValues) {
        setIdentitasValues(navigationState.identitasValues);
      } else {
        await fetchLokasiAndIdentitas(navigationState.dataIdentitasId);
      }

      if (navigationState.dataItemId) {
        await fetchItemData(navigationState.dataItemId);
      }

      await fetchDetailItemFields(navigationState.daftarAktivitasId);
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

  const fetchItemData = async (dataItemId) => {
    try {
      const dbRef = ref(database);
      const valuesSnapshot = await get(child(dbRef, 'dtb_data_item_values'));
      const valuesData = valuesSnapshot.val();
      if (!valuesData) return;

      const valuesList = Object.values(valuesData);
      const filtered = valuesList.filter(
        item => item.data_item_aktivitas_id === dataItemId
      );

      const itemSnapshot = await get(child(dbRef, 'dtb_item_aktivitas'));
      const itemData = itemSnapshot.val();
      const itemMap = {};
      if (itemData) {
        Object.values(itemData).forEach(field => {
          itemMap[field.id_item_aktivitas] = field.label;
        });
      }

      const formatted = {};
      filtered.forEach(item => {
        const label = itemMap[item.item_aktivitas_id] || item.item_aktivitas_id;
        formatted[label] = item.value_text;
      });
      setItemValues(formatted);
    } catch (error) {
      console.error('Error fetching item data:', error);
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

  const fetchDetailItemFields = async (daftarId) => {
    setLoading(true);
    setError('');
    try {
      const dbRef = ref(database);
      if (!daftarId) {
        setError('ID daftar aktivitas tidak ditemukan.');
        setLoading(false);
        return;
      }

      const detailSnapshot = await get(child(dbRef, 'dtb_detail_item_aktivitas'));
      const detailData = detailSnapshot.val();
      if (!detailData) {
        setError('Tidak ada data detail item di database');
        setLoading(false);
        return;
      }

      const foundDetails = Object.values(detailData)
        .filter(item => item.daftar_aktivitas_id === daftarId && item.is_active === true)
        .sort((a, b) => (a.urutan || 0) - (b.urutan || 0));

      setDetailItemFields(foundDetails);

      const groupSnapshot = await get(child(dbRef, 'dtb_group_detail_item_aktivitas'));
      const groupData = groupSnapshot.val();
      if (groupData) {
        const groupList = Object.values(groupData);
        const filteredGroups = groupList.filter(
          g => g.daftar_aktivitas_id === daftarId && g.is_active === true
        );
        const groupMap = {};
        filteredGroups.forEach(g => {
          groupMap[g.id_group_detail_item_aktivitas] = g;
        });
        setGroupData(groupMap);
      }

      const grouped = {};
      const ungrouped = [];
      foundDetails.forEach(field => {
        if (field.group_id && field.group_id !== '') {
          if (!grouped[field.group_id]) grouped[field.group_id] = [];
          grouped[field.group_id].push(field);
        } else {
          ungrouped.push(field);
        }
      });
      Object.keys(grouped).forEach(key => {
        grouped[key].sort((a, b) => (a.urutan || 0) - (b.urutan || 0));
      });
      setGroupedFields(grouped);

      if (foundDetails.length > 0) {
        const newItem = createEmptyItem(foundDetails);
        const recalculatedItem = recalculateItem(newItem, foundDetails);
        setItems([recalculatedItem]);
      } else {
        setError(`Tidak ada field detail item untuk daftar_aktivitas_id: "${daftarId}"`);
        setItems([]);
      }
    } catch (error) {
      console.error('Error fetching detail item fields:', error);
      setError('Gagal memuat data detail item: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const createEmptyItem = (fields) => {
    const itemValues = {};
    fields.forEach(field => {
      itemValues[field.id_detail_item_aktivitas] = '';
    });
    return {
      id: `detail_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      values: itemValues,
    };
  };

  const handleItemValueChange = (itemIndex, fieldId, value) => {
    const updatedItems = [...items];
    updatedItems[itemIndex].values[fieldId] = value;

    const recalculatedItem = recalculateItem(updatedItems[itemIndex], detailItemFields);
    updatedItems[itemIndex] = recalculatedItem;

    setItems(updatedItems);
  };

  const handleAddItem = () => {
    if (detailItemFields.length > 0) {
      const newItem = createEmptyItem(detailItemFields);
      const recalculatedItem = recalculateItem(newItem, detailItemFields);
      setItems([...items, recalculatedItem]);
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

  const renderField = (field, value, index) => {
    const isRequired = field.is_required === true;
    const placeholder = field.placeholder || '';
    const isLossesField = field.label === 'Losses' || field.nama_field === 'losses';
    const isCalculation = field.is_calculation === true;

    // 🔥 Style untuk label agar sesuai dengan warna AppBar (primary.main)
    const labelSx = {
      '& .MuiInputLabel-root': {
        color: 'primary.main',
      },
      '& .MuiInputLabel-root.Mui-focused': {
        color: 'primary.main',
      },
    };

    if (isCalculation) {
      return (
        <TextField
          fullWidth
          label={field.label}
          value={value || ''}
          disabled
          variant="filled"
          size="small"
          InputProps={{
            disableUnderline: true,
          }}
          sx={{
            '& .MuiFilledInput-root': {
              bgcolor: '#f5f5f5',
              borderRadius: '4px',
              '& fieldset': { borderRadius: '4px' },
            },
            '& .MuiInputLabel-root': { color: 'text.secondary' },
          }}
        />
      );
    }

    switch (field.tipe_input) {
      case 'text':
        return (
          <TextField
            fullWidth
            label={field.label}
            placeholder={placeholder}
            value={value || ''}
            onChange={(e) => handleItemValueChange(index, field.id_detail_item_aktivitas, e.target.value)}
            required={isRequired}
            size="small"
            sx={{
              ...labelSx,
              '& .MuiOutlinedInput-root': {
                borderRadius: '4px',
                '& fieldset': { borderRadius: '4px' },
              },
            }}
          />
        );
      case 'number':
        return (
          <TextField
            fullWidth
            label={field.label}
            type="number"
            placeholder={placeholder}
            value={value || ''}
            onChange={(e) => handleItemValueChange(index, field.id_detail_item_aktivitas, e.target.value)}
            required={isRequired}
            size="small"
            sx={{
              ...labelSx,
              '& .MuiOutlinedInput-root': {
                borderRadius: '4px',
                '& fieldset': { borderRadius: '4px' },
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
            value={value || ''}
            onChange={(e) => handleItemValueChange(index, field.id_detail_item_aktivitas, e.target.value)}
            required={isRequired}
            size="small"
            InputLabelProps={{ shrink: true }}
            sx={{
              ...labelSx,
              '& .MuiOutlinedInput-root': {
                borderRadius: '4px',
                '& fieldset': { borderRadius: '4px' },
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
            value={selectOptions.find(opt => opt.value === value) || null}
            onChange={(event, newValue) => {
              handleItemValueChange(index, field.id_detail_item_aktivitas, newValue ? newValue.value : '');
            }}
            size="small"
            renderInput={(params) => (
              <TextField
                {...params}
                label={field.label}
                placeholder={placeholder}
                required={isRequired}
                sx={{
                  ...labelSx,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '4px',
                    '& fieldset': { borderRadius: '4px' },
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
            value={value || ''}
            onChange={(e) => handleItemValueChange(index, field.id_detail_item_aktivitas, e.target.value)}
            required={isRequired}
            size="small"
            sx={{
              ...labelSx,
              '& .MuiOutlinedInput-root': {
                borderRadius: '4px',
                '& fieldset': { borderRadius: '4px' },
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
      detailItemFields.forEach(field => {
        if (field.is_calculation) return;
        if (field.is_required && !item.values[field.id_detail_item_aktivitas]) {
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

  const handleSave = async () => {
    if (!validateItems()) return;
    if (!dataItemId) {
      setError('ID item tidak ditemukan. Silakan ulangi dari awal.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const finalItems = items.map(item => recalculateItem(item, detailItemFields));

      const detailDataRef = ref(database, 'dtb_data_detail_item_aktivitas');
      for (const item of finalItems) {
        const newItemRef = push(detailDataRef);
        const dataDetailItemId = newItemRef.key;
        const newItemData = {
          id_data_detail_item_aktivitas: dataDetailItemId,
          data_item_aktivitas_id: dataItemId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_active: true,
        };
        await set(newItemRef, newItemData);

        const valuesRef = ref(database, 'dtb_data_detail_item_values');
        for (const field of detailItemFields) {
          const value = item.values[field.id_detail_item_aktivitas];
          if (value) {
            const newValueRef = push(valuesRef);
            const dataDetailItemValueId = newValueRef.key;
            await set(newValueRef, {
              id_data_detail_item_value: dataDetailItemValueId,
              data_detail_item_aktivitas_id: dataDetailItemId,
              detail_item_aktivitas_id: field.id_detail_item_aktivitas,
              value_text: value,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        }
      }

      await updateIdentitasStatus();

      setSuccessMessage('Data detail item berhasil disimpan!');
      setSuccess(true);

      setTimeout(() => {
        navigate('/data-item', {
          state: {
            dataIdentitasId: dataIdentitasId,
            daftarAktivitasId: daftarAktivitasId,
            aktivitasId: navigationState.aktivitasId || activityData?.id_aktivitas,
            identitasValues: identitasValues,
            activityData: activityData,
            daftarAktivitasData: daftarAktivitasData,
            pelakuId: pelakuId,
            pelakuName: pelakuName,
            statusName: statusName,
          }
        });
      }, 1500);
    } catch (error) {
      console.error('Error saving detail item data:', error);
      setError('Gagal menyimpan data detail item: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const renderGroupedFields = (item, index) => {
    const renderItems = [];

    const ungroupedFields = detailItemFields.filter(f => !f.group_id || f.group_id === '');
    ungroupedFields.forEach(field => {
      renderItems.push({
        type: 'field',
        id: field.id_detail_item_aktivitas,
        urutan: field.urutan || 0,
        field: field,
        data: item.values[field.id_detail_item_aktivitas],
      });
    });

    const groupIds = Object.keys(groupedFields);
    groupIds.forEach(groupId => {
      const group = groupData[groupId];
      const fields = groupedFields[groupId];
      if (!group || !fields || fields.length === 0) return;
      renderItems.push({
        type: 'group',
        id: groupId,
        urutan: group.urutan || 0,
        group: group,
        fields: fields,
      });
    });

    renderItems.sort((a, b) => a.urutan - b.urutan);

    return (
      <Box>
        {renderItems.map((itemData) => {
          if (itemData.type === 'field') {
            const field = itemData.field;
            const value = itemData.data;
            return (
              <Box key={field.id_detail_item_aktivitas} sx={{ mb: 2 }}>
                {renderField(field, value, index)}
              </Box>
            );
          } else if (itemData.type === 'group') {
            const group = itemData.group;
            const fields = itemData.fields;
            return (
              <Accordion
                key={group.id_group_detail_item_aktivitas}
                defaultExpanded
                sx={{
                  mb: 2,
                  borderRadius: '4px !important',
                  '&:before': { display: 'none' },
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px',
                    '& .MuiAccordionSummary-content': { alignItems: 'center' },
                  }}
                >
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {group.group_label || group.group_name}
                    </Typography>
                    {group.deskripsi && (
                      <Typography variant="caption" color="text.secondary">
                        {group.deskripsi}
                      </Typography>
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 2 }}>
                  {fields.map((field) => (
                    <Box key={field.id_detail_item_aktivitas} sx={{ mb: 2 }}>
                      {renderField(field, item.values[field.id_detail_item_aktivitas], index)}
                    </Box>
                  ))}
                </AccordionDetails>
              </Accordion>
            );
          }
          return null;
        })}
      </Box>
    );
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
        title="Tambah Detail Item"
        showBackButton
        onBackClick={handleBack}
        showLogout={false}
      />
      <Container maxWidth="sm" sx={{ pt: 1, pb: 8, px: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Aktivitas {activityData?.nama_aktivitas}
        </Typography>
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2}}>
          {activityData?.inisial} / {daftarAktivitasData?.nama_daftar_aktivitas}
        </Typography>

        {/* ========================================================== */}
        {/* DATA IDENTITAS - DENGAN PENAMBAHAN PENGAWAS & STATUS */}
        {/* ========================================================== */}
        {(Object.keys(identitasValues).length > 0 || Object.keys(itemValues).length > 0) && (
          <Paper sx={{ p: 2, mb: 2, borderRadius: '4px', bgcolor: '#A5D6A7' }}>
            {Object.keys(identitasValues).length > 0 && (
              <>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  Data Identitas
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {/* 🔥 Pengamat */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      Pengamat
                    </Typography>
                    <Typography variant="body2">
                      {pelakuName || '-'}
                    </Typography>
                  </Box>
                  {/* 🔥 Status */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      Status
                    </Typography>
                    <Typography variant="body2" sx={{ color: getStatusColor(statusName), fontWeight: 500 }}>
                      {statusName || '-'}
                    </Typography>
                  </Box>
                  {/* Field identitas lainnya - catatanRevisi dan catatan_revisi sudah difilter */}
                  {Object.entries(identitasValues)
                    .filter(([key]) => !internalFields.includes(key))
                    .map(([label, value]) => (
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
              </>
            )}

            {Object.keys(identitasValues).length > 0 && Object.keys(itemValues).length > 0 && (
              <Divider sx={{ my: 1.5 }} />
            )}

            {Object.keys(itemValues).length > 0 && (
              <>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  Data Item
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {Object.entries(itemValues).map(([label, value]) => (
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
              </>
            )}
          </Paper>
        )}

        <Paper sx={{ p: 2, borderRadius: '4px' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold">
              Data Detail Item
            </Typography>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={handleAddItem}
              variant="outlined"
              sx={{ borderRadius: '4px', textTransform: 'none' }}
              disabled={detailItemFields.length === 0}
            >
              Tambah Item
            </Button>
          </Box>
          <Divider sx={{ mb: 2 }} />
          {detailItemFields.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                Tidak ada field detail item yang tersedia
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
                      Detail Item #{index + 1}
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
                  {renderGroupedFields(item, index)}
                </CardContent>
              </Card>
            ))
          )}
          {detailItemFields.length > 0 && items.length > 0 && (
            <Button
              fullWidth
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddItem}
              sx={{ mt: 1, borderRadius: '4px', textTransform: 'none' }}
            >
              Tambah Detail Item Lainnya
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
            disabled={saving || detailItemFields.length === 0}
            sx={{
              borderRadius: '4px',
              textTransform: 'none',
              fontWeight: 600,
              py: 1.5,
            }}
          >
            {saving ? 'Menyimpan...' : 'Simpan Detail Item'}
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
        <Alert severity="success">{successMessage || 'Data detail item berhasil disimpan!'}</Alert>
      </Snackbar>
    </Box>
  );
};

export default TambahDetailItem;