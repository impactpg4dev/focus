// focus/src/pages/activity/data-item/DataItem.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  CircularProgress,
  Divider,
  Chip,
  Alert,
  Snackbar,
  Card,
  CardContent,
  Button,
  Stack,
  Skeleton,
  IconButton,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Visibility as VisibilityIcon,
  CalendarToday as CalendarIcon,
  EventNote as EventNoteIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { database, ref, get, child, update } from '../../../config/firebase';
import { useAuth } from '../../../context/AuthContext';
import AppBar from '../../../components/surface/app-bar/AppBar';
import Dialog from '../../../components/feedback/dialog/Dialog';

const DataItem = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataItems, setDataItems] = useState([]);
  const [identitasValues, setIdentitasValues] = useState({});
  const [activityData, setActivityData] = useState(null);
  const [daftarAktivitasData, setDaftarAktivitasData] = useState(null);
  const [dataIdentitasId, setDataIdentitasId] = useState(null);
  const [daftarAktivitasId, setDaftarAktivitasId] = useState(null);
  const [aktivitasId, setAktivitasId] = useState(null);
  const [jabatanName, setJabatanName] = useState('');
  const [pelakuId, setPelakuId] = useState(null);
  const [pelakuName, setPelakuName] = useState(''); // <-- tambahan
  const [statusName, setStatusName] = useState('');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const navigationState = location.state;
  const [refreshKey, setRefreshKey] = useState(0);

  // Fungsi untuk mendapatkan warna status (sama seperti di DataIdentitas)
  const getStatusColor = (statusName) => {
    if (!statusName) return 'default';
    const lower = statusName.toLowerCase();
    if (lower === 'ongoing' || lower === 'sedang dikerjakan') return 'warning.main';
    if (lower === 'completed' || lower === 'selesai') return 'success.main';
    if (lower === 'draft' || lower === 'draf') return 'text.secondary';
    if (lower === 'pending') return 'info.main';
    if (lower === 'approved') return 'success.main';
    if (lower === 'rejected') return 'error.main';
    return 'text.primary';
  };

  // Ambil nama jabatan dari database berdasarkan id_jabatan user
  useEffect(() => {
    const fetchJabatan = async () => {
      if (!userData?.id_jabatan) return;
      try {
        const dbRef = ref(database);
        const jabatanRef = child(dbRef, `u_position/${userData.id_jabatan}`);
        const snapshot = await get(jabatanRef);
        if (snapshot.exists()) {
          setJabatanName(snapshot.val().nama_jabatan || '');
        }
      } catch (err) {
        console.error('Error fetching jabatan:', err);
      }
    };
    fetchJabatan();
  }, [userData]);

  useEffect(() => {
    if (!navigationState || !navigationState.dataIdentitasId) {
      setError('Data tidak lengkap.');
      setTimeout(() => navigate(-1), 2000);
      return;
    }
    setDataIdentitasId(navigationState.dataIdentitasId);
    setDaftarAktivitasId(navigationState.daftarAktivitasId);
    setAktivitasId(navigationState.aktivitasId);
    setIdentitasValues(navigationState.identitasValues || {});
    setActivityData(navigationState.activityData);
    setDaftarAktivitasData(navigationState.daftarAktivitasData);

    // Ambil pelakuId
    const pelakuIdFromState = navigationState.pelakuId || null;
    const pelakuIdFromValues = navigationState.identitasValues?.pelakuId || null;
    const finalPelakuId = pelakuIdFromState || pelakuIdFromValues || null;
    setPelakuId(finalPelakuId);

    // Ambil pelakuName
    const pelakuNameFromState = navigationState.pelakuName || '';
    const pelakuNameFromValues = navigationState.identitasValues?.pelakuName || '';
    setPelakuName(pelakuNameFromState || pelakuNameFromValues);

    // Ambil statusName
    const statusFromState = navigationState.statusName || '';
    const statusFromValues = navigationState.identitasValues?.statusName || '';
    setStatusName(statusFromState || statusFromValues);

    // DEBUG (opsional)
    console.log('🔍 DataItem -> pelakuId:', finalPelakuId);
    console.log('🔍 DataItem -> pelakuName:', pelakuNameFromState || pelakuNameFromValues);
    console.log('🔍 DataItem -> statusName:', statusFromState || statusFromValues);

    fetchData();
  }, [navigationState, refreshKey]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && dataIdentitasId) {
        setRefreshKey(prev => prev + 1);
      }
    };

    const handleFocus = () => {
      if (dataIdentitasId) {
        setRefreshKey(prev => prev + 1);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [dataIdentitasId]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const dbRef = ref(database);
      const dataIdentitasId = navigationState.dataIdentitasId;

      const itemSnapshot = await get(child(dbRef, 'dtb_data_item_aktivitas'));
      const itemData = itemSnapshot.val();

      const valuesSnapshot = await get(child(dbRef, 'dtb_data_item_values'));
      const valuesData = valuesSnapshot.val();

      const itemFieldsSnapshot = await get(child(dbRef, 'dtb_item_aktivitas'));
      const itemFieldsData = itemFieldsSnapshot.val();
      const itemFieldsMap = {};
      if (itemFieldsData) {
        Object.values(itemFieldsData).forEach(field => {
          itemFieldsMap[field.id_item_aktivitas] = field;
        });
      }

      const groupedItems = {};
      if (itemData) {
        const itemList = Object.values(itemData);
        const filteredItems = itemList.filter(
          item => item.data_identitas_aktivitas_id === dataIdentitasId && item.is_active === true
        );

        filteredItems.forEach(item => {
          const itemId = item.id_data_item_aktivitas;
          groupedItems[itemId] = {
            id: itemId,
            createdAt: item.created_at,
            values: {},
            fullData: item,
            valueIds: [],
          };
        });

        if (valuesData) {
          const valuesList = Object.values(valuesData);
          filteredItems.forEach(item => {
            const itemId = item.id_data_item_aktivitas;
            const itemValues = valuesList.filter(
              val => val.data_item_aktivitas_id === itemId
            );
            itemValues.forEach(val => {
              const field = itemFieldsMap[val.item_aktivitas_id];
              const label = field?.label || val.item_aktivitas_id;
              groupedItems[itemId].values[label] = val.value_text;
              groupedItems[itemId].valueIds.push(val.id_data_item_value);
            });
          });
        }
      }

      const formattedData = Object.values(groupedItems);
      formattedData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setDataItems(formattedData);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Gagal memuat data item');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/data-identitas', {
      state: {
        daftarAktivitasId: daftarAktivitasId,
        aktivitasId: aktivitasId,
      }
    });
  };

  const handleViewDetail = (data) => {
    navigate('/data-detail-item', {
      state: {
        dataItemId: data.id,
        dataIdentitasId: dataIdentitasId,
        daftarAktivitasId: daftarAktivitasId,
        aktivitasId: aktivitasId,
        identitasValues: identitasValues,
        itemValues: data.values,
        activityData: activityData,
        daftarAktivitasData: daftarAktivitasData,
        pelakuId: pelakuId,
        statusName: statusName,
      }
    });
  };

  const handleTambahItem = () => {
    navigate('/tambah-item', {
      state: {
        dataIdentitasId: dataIdentitasId,
        daftarAktivitasId: daftarAktivitasId,
        aktivitasData: activityData,
        daftarAktivitasData: daftarAktivitasData,
        pelakuId: pelakuId,
        statusName: statusName,
        identitasValues: identitasValues,
      }
    });
  };

  const handleEditItem = (data) => {
    navigate('/edit-item', {
      state: {
        dataIdentitasId: dataIdentitasId,
        daftarAktivitasId: daftarAktivitasId,
        aktivitasData: activityData,
        daftarAktivitasData: daftarAktivitasData,
        pelakuId: pelakuId,
        statusName: statusName,
        identitasValues: identitasValues,
        editData: {
          itemId: data.id,
          values: data.values,
          valueIds: data.valueIds || [],
          fieldLabels: Object.keys(data.values),
        },
      }
    });
  };

  const handleDeleteClick = (data) => {
    setSelectedItemId(data.id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedItemId) return;
    setDeleting(true);
    setError('');

    try {
      const dbRef = ref(database);
      const itemId = selectedItemId;

      const itemSnapshot = await get(child(dbRef, 'dtb_data_item_aktivitas'));
      const itemData = itemSnapshot.val();
      let itemKey = null;
      if (itemData) {
        for (const key in itemData) {
          if (itemData[key].id_data_item_aktivitas === itemId) {
            itemKey = key;
            break;
          }
        }
      }
      if (!itemKey) {
        setError('Data item tidak ditemukan');
        setDeleting(false);
        return;
      }

      await update(ref(database, `dtb_data_item_aktivitas/${itemKey}`), {
        is_active: false,
        updated_at: new Date().toISOString(),
      });

      const detailSnapshot = await get(child(dbRef, 'dtb_data_detail_item_aktivitas'));
      const detailData = detailSnapshot.val();
      if (detailData) {
        const detailKeys = [];
        for (const key in detailData) {
          if (detailData[key].data_item_aktivitas_id === itemId && detailData[key].is_active === true) {
            detailKeys.push(key);
          }
        }
        for (const key of detailKeys) {
          await update(ref(database, `dtb_data_detail_item_aktivitas/${key}`), {
            is_active: false,
            updated_at: new Date().toISOString(),
          });
        }
      }

      setDeleteDialogOpen(false);
      setSelectedItemId(null);
      setSuccessMessage('Data item berhasil dihapus!');
      setSuccess(true);

      await fetchData();

    } catch (error) {
      console.error('Error deleting item:', error);
      setError('Gagal menghapus data item: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setSelectedItemId(null);
  };

  const formatDateShort = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // ============================================================
  // LOGIKA AKSES
  // ============================================================
  const isPengamat = jabatanName === 'Pengamat';
  const isEditable = isPengamat && ['draft', 'ongoing', 'rejected'].includes(statusName);
  const isAddable = isPengamat && ['draft', 'ongoing', 'rejected'].includes(statusName);
  const isOwnData = isPengamat ? pelakuId === userData?.uid : true;

  useEffect(() => {
    if (isPengamat && !pelakuId && !loading) {
      setError('Data identitas tidak memiliki pelaku, silakan periksa data.');
    }
  }, [isPengamat, pelakuId, loading]);

  if (loading) {
    return (
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', pt: 0, pb: 10 }}>
        <AppBar title="Data Item" showBackButton onBackClick={handleBack} showLogout={false} />
        <Container maxWidth="sm" sx={{ pt: 2, pb: 8, px: 2 }}>
          <Paper sx={{ p: 2, mb: 2, borderRadius: '4px' }}>
            <Skeleton variant="text" width="60%" height={24} />
            <Skeleton variant="text" width="40%" height={20} sx={{ mt: 1 }} />
          </Paper>
          {[1, 2, 3].map((i) => (
            <Card key={i} sx={{ mb: 2, borderRadius: '4px' }}>
              <CardContent>
                <Skeleton variant="text" width="70%" height={24} />
                <Skeleton variant="text" width="50%" height={20} sx={{ mt: 1 }} />
                <Skeleton variant="text" width="80%" height={20} sx={{ mt: 1 }} />
              </CardContent>
            </Card>
          ))}
        </Container>
      </Box>
    );
  }

  // Cek akses
  if (isPengamat && !isOwnData) {
    return (
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', pt: 0, pb: 10 }}>
        <AppBar title="Data Item" showBackButton onBackClick={handleBack} showLogout={false} />
        <Container maxWidth="sm" sx={{ pt: 2, pb: 8, px: 2 }}>
          <Paper sx={{ p: 4, borderRadius: '4px', textAlign: 'center' }}>
            <Typography variant="h6" color="error">
              Akses Ditolak
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Anda tidak memiliki akses ke data ini.
            </Typography>
            <Button
              variant="contained"
              onClick={handleBack}
              sx={{ mt: 2, borderRadius: '4px', textTransform: 'none' }}
            >
              Kembali
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', pt: 0, pb: 10 }}>
      <AppBar
        title="Data Item"
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
          <Chip
            label={`${dataItems.length} Item`}
            size="small"
            color="primary"
          />
        </Box>

        {/* ========================================================== */}
        {/* DATA IDENTITAS - DENGAN PENAMBAHAN PENGAWAS & STATUS */}
        {/* ========================================================== */}
        {Object.keys(identitasValues).length > 0 && (
          <Paper sx={{ p: 2, mb: 2, borderRadius: '4px', bgcolor: '#A5D6A7' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                Data Identitas
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
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
              {Object.entries(identitasValues)
                .filter(([key]) => !['id', 'pelakuId', 'pelakuName', 'createdAt', 'status', 'statusName', 'catatanRevisi'].includes(key))
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
          </Paper>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {dataItems.length === 0 ? (
          <Paper sx={{ p: 4, borderRadius: '4px', textAlign: 'center' }}>
            <Box sx={{ py: 2 }}>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                Belum ada data item yang tersimpan
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Silakan buat data item baru terlebih dahulu
              </Typography>
              {isAddable && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleTambahItem}
                  sx={{
                    borderRadius: '4px',
                    textTransform: 'none',
                    px: 3,
                    py: 1,
                  }}
                >
                  Tambah Item
                </Button>
              )}
            </Box>
          </Paper>
        ) : (
          <Stack spacing={2}>
            {dataItems.map((data, index) => {
              const entries = Object.entries(data.values);
              
              return (
                <Card 
                  key={data.id} 
                  sx={{ 
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: 0,
                    '&:hover': {
                      boxShadow: 1,
                    },
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <EventNoteIcon fontSize="small" color="action" />
                        <Typography variant="caption" color="text.secondary">
                          Item #{index + 1}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CalendarIcon fontSize="small" color="action" />
                        <Typography variant="caption" color="text.secondary">
                          {formatDateShort(data.createdAt)}
                        </Typography>
                      </Box>
                    </Box>

                    <Divider sx={{ mb: 1.5 }} />

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {entries.length > 0 ? (
                        entries.map(([key, value]) => (
                          <Box
                            key={key}
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              py: 0.5,
                            }}
                          >
                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                              {key}
                            </Typography>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                maxWidth: '60%', 
                                textAlign: 'right',
                                wordBreak: 'break-word',
                              }}
                            >
                              {value || '-'}
                            </Typography>
                          </Box>
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary" align="center">
                          Tidak ada data
                        </Typography>
                      )}
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<VisibilityIcon />}
                          onClick={() => handleViewDetail(data)}
                          sx={{
                            borderRadius: '4px',
                            textTransform: 'none',
                            fontSize: '0.75rem',
                          }}
                        >
                          Lihat Detail
                        </Button>
                      </Box>
                      {isEditable && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleEditItem(data)}
                            sx={{ 
                              '&:hover': { bgcolor: 'rgba(46, 125, 50, 0.08)' },
                              p: 0.5,
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteClick(data)}
                            sx={{ 
                              '&:hover': { bgcolor: 'rgba(211, 47, 47, 0.08)' },
                              p: 0.5,
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}
      </Container>

      {/* Tombol Tambah Item Fixed di Bawah */}
      {dataItems.length > 0 && isAddable && (
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
              startIcon={<AddIcon />}
              onClick={handleTambahItem}
              sx={{
                borderRadius: '4px',
                textTransform: 'none',
                fontWeight: 600,
                py: 1.5,
              }}
            >
              Tambah Item
            </Button>
          </Box>
        </Container>
      )}

      {/* Dialog konfirmasi hapus */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteDialogClose}
        onConfirm={handleConfirmDelete}
        title="Hapus Data Item"
        message="Apakah Anda yakin ingin menghapus data item ini? Semua data detail item terkait juga akan dihapus."
        confirmText={deleting ? 'Menghapus...' : 'Hapus'}
        cancelText="Batal"
        variant="warning"
        confirmColor="error"
        showCloseButton={false}
        loading={deleting}
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
        autoHideDuration={3000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccess(false)}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DataItem;