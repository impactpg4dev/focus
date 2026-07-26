// focus/src/pages/activity/data-detail-item/DataDetailItem.jsx
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
  Stack,
  Skeleton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  IconButton,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ExpandMore as ExpandMoreIcon,
  CalendarToday as CalendarIcon,
  EventNote as EventNoteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { database, ref, get, child, update } from '../../../config/firebase';
import { useAuth } from '../../../context/AuthContext';
import AppBar from '../../../components/surface/app-bar/AppBar';
import Dialog from '../../../components/feedback/dialog/Dialog';

// 🔥 Internal fields yang tidak ditampilkan sebagai identitas
// Tambahkan 'catatanRevisi' (tanpa underscore) untuk menyembunyikan catatan revisi
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

const DataDetailItem = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailItems, setDetailItems] = useState([]);
  const [detailItemFields, setDetailItemFields] = useState([]);
  const [groupedFields, setGroupedFields] = useState({});
  const [groupData, setGroupData] = useState({});
  const [identitasValues, setIdentitasValues] = useState({});
  const [itemValues, setItemValues] = useState({});
  const [activityData, setActivityData] = useState(null);
  const [daftarAktivitasData, setDaftarAktivitasData] = useState(null);
  const [dataItemId, setDataItemId] = useState(null);
  const [dataIdentitasId, setDataIdentitasId] = useState(null);
  const [daftarAktivitasId, setDaftarAktivitasId] = useState(null);
  const [aktivitasId, setAktivitasId] = useState(null);
  const [jabatanName, setJabatanName] = useState('');
  const [pelakuId, setPelakuId] = useState(null);
  const [pelakuName, setPelakuName] = useState('');
  const [statusName, setStatusName] = useState('');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDetailId, setSelectedDetailId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const navigationState = location.state;

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
    if (!navigationState || !navigationState.dataItemId) {
      setError('Data tidak lengkap.');
      setTimeout(() => navigate('/'), 2000);
      return;
    }
    setDataItemId(navigationState.dataItemId);
    setDataIdentitasId(navigationState.dataIdentitasId);
    setDaftarAktivitasId(navigationState.daftarAktivitasId);
    setAktivitasId(navigationState.aktivitasId);
    setIdentitasValues(navigationState.identitasValues || {});
    setItemValues(navigationState.itemValues || {});
    setActivityData(navigationState.activityData || null);
    setDaftarAktivitasData(navigationState.daftarAktivitasData || null);

    // 🔥 Ambil pelakuId, pelakuName, dan statusName dari navigationState
    const pelakuIdFromState = navigationState.pelakuId || null;
    const pelakuIdFromValues = navigationState.identitasValues?.pelakuId || null;
    const finalPelakuId = pelakuIdFromState || pelakuIdFromValues || null;
    setPelakuId(finalPelakuId);

    const pelakuNameFromState = navigationState.pelakuName || '';
    const pelakuNameFromValues = navigationState.identitasValues?.pelakuName || '';
    setPelakuName(pelakuNameFromState || pelakuNameFromValues);

    const statusFromState = navigationState.statusName || '';
    const statusFromValues = navigationState.identitasValues?.statusName || '';
    setStatusName(statusFromState || statusFromValues);

    fetchData();
  }, [navigationState]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const dbRef = ref(database);
      const dataItemId = navigationState.dataItemId;
      const daftarId = navigationState.daftarAktivitasId;

      // Ambil field detail item untuk urutan dan mapping
      const detailFieldsSnapshot = await get(child(dbRef, 'dtb_detail_item_aktivitas'));
      const detailFieldsData = detailFieldsSnapshot.val();
      let allFields = [];
      const detailFieldsMap = {};
      if (detailFieldsData) {
        allFields = Object.values(detailFieldsData)
          .filter(f => f.daftar_aktivitas_id === daftarId && f.is_active === true)
          .sort((a, b) => (a.urutan || 0) - (b.urutan || 0));
        Object.values(detailFieldsData).forEach(field => {
          if (field.daftar_aktivitas_id === daftarId && field.is_active === true) {
            detailFieldsMap[field.id_detail_item_aktivitas] = field;
          }
        });
      }
      setDetailItemFields(allFields);

      // Ambil data group
      const groupSnapshot = await get(child(dbRef, 'dtb_group_detail_item_aktivitas'));
      const groupData = groupSnapshot.val();
      const groupMap = {};
      if (groupData) {
        Object.values(groupData).forEach(g => {
          groupMap[g.id_group_detail_item_aktivitas] = g;
        });
      }
      setGroupData(groupMap);

      // Ambil data detail item
      const detailSnapshot = await get(child(dbRef, 'dtb_data_detail_item_aktivitas'));
      const detailData = detailSnapshot.val();

      // Ambil data detail item values
      const valuesSnapshot = await get(child(dbRef, 'dtb_data_detail_item_values'));
      const valuesData = valuesSnapshot.val();

      // Filter detail item berdasarkan data_item_aktivitas_id dan is_active === true
      const groupedItems = {};
      if (detailData) {
        const detailList = Object.values(detailData);
        const filteredDetails = detailList.filter(
          item => item.data_item_aktivitas_id === dataItemId && item.is_active === true
        );

        filteredDetails.forEach(item => {
          const detailId = item.id_data_detail_item_aktivitas;
          groupedItems[detailId] = {
            id: detailId,
            createdAt: item.created_at,
            values: {},
          };
        });

        // Ambil values untuk setiap detail item
        if (valuesData) {
          const valuesList = Object.values(valuesData);
          filteredDetails.forEach(item => {
            const detailId = item.id_data_detail_item_aktivitas;
            const detailValues = valuesList.filter(
              val => val.data_detail_item_aktivitas_id === detailId
            );
            detailValues.forEach(val => {
              const field = detailFieldsMap[val.detail_item_aktivitas_id];
              const label = field?.label || val.detail_item_aktivitas_id;
              groupedItems[detailId].values[label] = val.value_text;
            });
          });
        }
      }

      // Format untuk ditampilkan
      const formattedItems = Object.values(groupedItems).map(item => ({
        id: item.id,
        createdAt: item.createdAt,
        values: item.values,
      }));
      formattedItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setDetailItems(formattedItems);

    } catch (error) {
      console.error('Error fetching detail item data:', error);
      setError('Gagal memuat data detail item');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/data-item', {
      state: {
        dataIdentitasId: dataIdentitasId,
        daftarAktivitasId: daftarAktivitasId,
        aktivitasId: aktivitasId,
        identitasValues: identitasValues,
        activityData: activityData,
        daftarAktivitasData: daftarAktivitasData,
        pelakuId: pelakuId,
        pelakuName: pelakuName,
        statusName: statusName,
      }
    });
  };

  const handleEdit = () => {
    const detailItemsData = detailItems.map(item => ({
      id: item.id,
      values: item.values,
    }));

    navigate('/edit-detail-item', {
      state: {
        dataIdentitasId: dataIdentitasId,
        daftarAktivitasId: daftarAktivitasId,
        aktivitasId: aktivitasId,
        dataItemId: dataItemId,
        identitasValues: identitasValues,
        itemValues: itemValues,
        activityData: activityData,
        daftarAktivitasData: daftarAktivitasData,
        pelakuId: pelakuId,
        pelakuName: pelakuName,
        statusName: statusName,
        editData: {
          detailItems: detailItemsData,
        },
      },
    });
  };

  const handleTambahDetailItem = () => {
    navigate('/tambah-detail-item', {
      state: {
        dataIdentitasId: dataIdentitasId,
        daftarAktivitasId: daftarAktivitasId,
        aktivitasData: activityData,
        daftarAktivitasData: daftarAktivitasData,
        dataItemId: dataItemId,
        identitasValues: identitasValues,
        pelakuId: pelakuId,
        pelakuName: pelakuName,
        statusName: statusName,
      },
    });
  };

  // Handler untuk delete
  const handleDeleteClick = (detailId) => {
    setSelectedDetailId(detailId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedDetailId) return;
    setDeleting(true);
    setError('');
    try {
      const dbRef = ref(database);
      // Cari key dari dtb_data_detail_item_aktivitas berdasarkan id_data_detail_item_aktivitas
      const detailSnapshot = await get(child(dbRef, 'dtb_data_detail_item_aktivitas'));
      const detailData = detailSnapshot.val();
      let detailKey = null;
      if (detailData) {
        for (const key in detailData) {
          if (detailData[key].id_data_detail_item_aktivitas === selectedDetailId) {
            detailKey = key;
            break;
          }
        }
      }
      if (!detailKey) {
        setError('Data detail item tidak ditemukan.');
        setDeleting(false);
        setDeleteDialogOpen(false);
        return;
      }
      // Soft delete: set is_active = false
      await update(ref(database, `dtb_data_detail_item_aktivitas/${detailKey}`), {
        is_active: false,
        updated_at: new Date().toISOString(),
      });

      setDeleteDialogOpen(false);
      setSelectedDetailId(null);
      setSuccessMessage('Data detail item berhasil dihapus!');
      setSuccess(true);

      // Refresh data
      await fetchData();

    } catch (error) {
      console.error('Error deleting detail item:', error);
      setError('Gagal menghapus data detail item: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setSelectedDetailId(null);
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

  // 🔥 LOGIKA AKSES
  const isPengamat = jabatanName === 'Pengamat';
  const isEditable = isPengamat && ['draft', 'ongoing', 'rejected'].includes(statusName);
  const isAddable = isPengamat && ['draft', 'ongoing', 'rejected'].includes(statusName);
  const isOwnData = isPengamat ? pelakuId === userData?.uid : true;

  // 🔥 Fungsi untuk merender satu item dengan group sesuai urutan
  const renderGroupedFieldsForItem = (item, index) => {
    const renderItems = [];

    const ungroupedFields = detailItemFields.filter(f => !f.group_id || f.group_id === '');
    ungroupedFields.forEach(field => {
      renderItems.push({
        type: 'field',
        id: field.id_detail_item_aktivitas,
        urutan: field.urutan || 0,
        field: field,
      });
    });

    const groupIds = Object.keys(groupData);
    groupIds.forEach(groupId => {
      const group = groupData[groupId];
      const fields = detailItemFields.filter(f => f.group_id === groupId);
      if (!group || fields.length === 0) return;
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
            const value = item.values[field.label] || '-';
            return (
              <Box key={field.id_detail_item_aktivitas} sx={{ mb: 1 }}>
                <Box
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
                    {field.label}
                  </Typography>
                  <Typography variant="body2">{value}</Typography>
                </Box>
              </Box>
            );
          } else if (itemData.type === 'group') {
            const group = itemData.group;
            const fields = itemData.fields;
            return (
              <Accordion
                key={group.id_group_detail_item_aktivitas}
                defaultExpanded={false}
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
                  {fields.map((field) => {
                    const value = item.values[field.label] || '-';
                    return (
                      <Box key={field.id_detail_item_aktivitas} sx={{ mb: 2 }}>
                        <Box
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
                            {field.label}
                          </Typography>
                          <Typography variant="body2">{value}</Typography>
                        </Box>
                      </Box>
                    );
                  })}
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
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', pt: 0, pb: 10 }}>
        <AppBar title="Data Detail Item" showBackButton onBackClick={handleBack} showLogout={false} />
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

  // 🔥 CEK AKSES: Jika Pengamat dan data bukan milik sendiri
  if (isPengamat && !isOwnData) {
    return (
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', pt: 0, pb: 10 }}>
        <AppBar title="Data Detail Item" showBackButton onBackClick={handleBack} showLogout={false} />
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
        title="Data Detail Item"
        showBackButton
        onBackClick={handleBack}
        showLogout={false}
      />
      
      <Container maxWidth="sm" sx={{ pt: 2, pb: 8, px: 2 }}>
        {/* Header Info - Aktivitas */}
        <Box sx={{ mb:2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Aktivitas {activityData?.nama_aktivitas || 'Aktivitas tidak tersedia'}
            </Typography>
            <Typography variant="subtitle1" fontWeight="bold">
              {activityData?.inisial || ''} / {daftarAktivitasData?.nama_daftar_aktivitas || ''}
            </Typography>
          </Box>
          <Chip
            label={`${detailItems.length} Item`}
            size="small"
            color="primary"
          />
        </Box>

        {/* ========================================================== */}
        {/* DATA IDENTITAS - DENGAN PENAMBAHAN PENGAWAS & STATUS */}
        {/* ========================================================== */}
        {(Object.keys(identitasValues).length > 0 || Object.keys(itemValues).length > 0) && (
          <Paper sx={{ p: 2, mb: 2, borderRadius: '4px', bgcolor: '#A5D6A7' }}>
            {/* Data Identitas */}
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
                  {/* Field identitas lainnya - catatanRevisi dan catatan_revisi sudah difilter oleh internalFields */}
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

            {/* Pemisah jika kedua data ada */}
            {Object.keys(identitasValues).length > 0 && Object.keys(itemValues).length > 0 && (
              <Divider sx={{ my: 1.5 }} />
            )}

            {/* Data Item */}
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

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Detail Item List */}
        <Paper sx={{ p: 2, borderRadius: '4px' }}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
            Data Detail Item
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {detailItems.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                Belum ada data detail item yang tersimpan
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Silakan buat data detail item baru terlebih dahulu
              </Typography>
              {/* Tombol Tambah Detail Item hanya muncul jika isAddable true */}
              {isAddable && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleTambahDetailItem}
                  sx={{
                    borderRadius: '4px',
                    textTransform: 'none',
                    mt: 2,
                    px: 3,
                    py: 1,
                  }}
                >
                  Tambah Data Detail Item
                </Button>
              )}
            </Box>
          ) : (
            <Stack spacing={2}>
              {detailItems.map((item, index) => (
                <Card key={item.id} variant="outlined" sx={{ mb: 2, borderRadius: '4px', boxShadow: 0 }}>
                  <CardContent sx={{ p: 2 }}>
                    {/* Header Card dengan Delete Icon */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" color="primary">
                        Detail Item #{index + 1}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{lineHeight:0}}>
                          {formatDateShort(item.createdAt)}
                        </Typography>
                        {isEditable && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteClick(item.id)}
                            sx={{ '&:hover': { bgcolor: 'rgba(211, 47, 47, 0.08)' }, p: 0.5 }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </Box>
                    <Divider sx={{ mb: 1.5 }} />
                    {renderGroupedFieldsForItem(item, index)}
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Paper>
      </Container>

      {/* Tombol Fixed di Bawah */}
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
            display: 'flex',
            flexDirection: 'row',
            gap: 1,
          }}
        >
          {detailItems.length > 0 && isAddable && (
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={handleTambahDetailItem}
              sx={{
                borderRadius: '4px',
                textTransform: 'none',
                fontWeight: 600,
                py: 1.5,
                flex: 1,
              }}
            >
              Tambah Detail Item
            </Button>
          )}

          {detailItems.length > 0 && isEditable && (
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<EditIcon />}
              onClick={handleEdit}
              sx={{
                borderRadius: '4px',
                textTransform: 'none',
                fontWeight: 600,
                py: 1.5,
                flex: 1,
              }}
            >
              Edit Detail Item
            </Button>
          )}
        </Box>
      </Container>

      {/* Dialog Konfirmasi Delete */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteDialogClose}
        onConfirm={handleConfirmDelete}
        title="Hapus Data Detail Item"
        message="Apakah Anda yakin ingin menghapus data detail item ini? Tindakan ini tidak dapat dibatalkan."
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

export default DataDetailItem;