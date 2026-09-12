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
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Visibility as VisibilityIcon,
  CalendarToday as CalendarIcon,
  EventNote as EventNoteIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
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
  const [pelakuId, setPelakuId] = useState(null);
  const [pelakuName, setPelakuName] = useState('');
  const [statusName, setStatusName] = useState('');
  // 🔥 Tambahkan state untuk Status Approval
  const [statusApproval, setStatusApproval] = useState('');

  // State untuk izin dari dtb_daftar_aktivitas
  const [isAllowedByDaftar, setIsAllowedByDaftar] = useState(false);
  const [userRoleIds, setUserRoleIds] = useState([]);
  const [rolesLoaded, setRolesLoaded] = useState(false);

  // State untuk group data
  const [groupData, setGroupData] = useState({});
  const [fieldGroupMap, setFieldGroupMap] = useState({});

  // 🔥 State untuk mengecek apakah ada detail item
  const [hasDetailItem, setHasDetailItem] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const navigationState = location.state;
  const [refreshKey, setRefreshKey] = useState(0);

  // Fungsi untuk mendapatkan warna status
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

  // ===== Ambil role user (ID) =====
  const fetchUserRoles = async () => {
    try {
      const dbRef = ref(database);
      const uid = userData?.uid || user?.uid;
      if (!uid) return [];

      const userRolesSnapshot = await get(child(dbRef, 'user_roles'));
      const userRolesData = userRolesSnapshot.val();
      if (!userRolesData) return [];

      const userRoleKeys = Object.keys(userRolesData).filter(
        key => userRolesData[key].uid === uid
      );
      if (userRoleKeys.length === 0) return [];

      return userRoleKeys.map(key => userRolesData[key].id_role);
    } catch (error) {
      console.error('Error fetching user roles:', error);
      return [];
    }
  };

  // ===== Cek izin berdasarkan posisi dan role (AND) =====
  const checkUserAllowed = (allowedPositions, allowedRoles) => {
    if (!allowedPositions || !allowedRoles) return false;

    let positions = allowedPositions;
    let roles = allowedRoles;
    if (positions && typeof positions === 'object' && !Array.isArray(positions)) {
      positions = Object.values(positions);
    }
    if (roles && typeof roles === 'object' && !Array.isArray(roles)) {
      roles = Object.values(roles);
    }

    positions = Array.isArray(positions) ? positions : [];
    roles = Array.isArray(roles) ? roles : [];

    const positionMatch = userData?.id_jabatan && positions.includes(userData.id_jabatan);
    const roleMatch = userRoleIds.some(roleId => roles.includes(roleId));

    return positionMatch && roleMatch;
  };

  // ===== Ambil data daftar aktivitas untuk cek izin =====
  const fetchDaftarAktivitas = async (daftarId) => {
    try {
      const dbRef = ref(database);
      const daftarSnapshot = await get(child(dbRef, 'dtb_daftar_aktivitas'));
      const daftarData = daftarSnapshot.val();
      if (!daftarData) return null;

      const daftarList = Object.values(daftarData);
      const found = daftarList.find(
        item => item.id_daftar_aktivitas === daftarId && item.is_active === true
      );
      return found || null;
    } catch (error) {
      console.error('Error fetching daftar aktivitas:', error);
      return null;
    }
  };

  // Ambil role user
  useEffect(() => {
    const getRoles = async () => {
      const roleIds = await fetchUserRoles();
      setUserRoleIds(roleIds);
      setRolesLoaded(true);
    };
    getRoles();
  }, [userData]);

  // Cek izin setelah role dan daftar aktivitas id tersedia
  useEffect(() => {
    if (!rolesLoaded || !daftarAktivitasId) return;

    const checkPermission = async () => {
      const daftar = await fetchDaftarAktivitas(daftarAktivitasId);
      if (daftar) {
        const allowed = checkUserAllowed(daftar.allowed_by_position, daftar.allowed_by_role);
        setIsAllowedByDaftar(allowed);
        console.log('🔍 DataItem -> isAllowedByDaftar:', allowed);
      } else {
        setIsAllowedByDaftar(false);
      }
    };
    checkPermission();
  }, [rolesLoaded, daftarAktivitasId, userRoleIds, userData?.id_jabatan]);

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

    // 🔥 Ambil Status Approval dari navigationState
    const statusApprovalFromState = navigationState.statusApproval || '';
    const statusApprovalFromValues = navigationState.identitasValues?.statusApproval || '';
    setStatusApproval(statusApprovalFromState || statusApprovalFromValues);

    fetchData();
  }, [navigationState, refreshKey]);

  // Refresh data saat halaman terlihat
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
      const daftarId = navigationState.daftarAktivitasId;

      // 🔥 Cek apakah ada detail item untuk daftar aktivitas ini
      const detailItemSnapshot = await get(child(dbRef, 'dtb_detail_item_aktivitas'));
      const detailItemData = detailItemSnapshot.val();
      let hasDetail = false;
      if (detailItemData) {
        const detailList = Object.values(detailItemData);
        hasDetail = detailList.some(
          item => item.daftar_aktivitas_id === daftarId && item.is_active === true
        );
      }
      setHasDetailItem(hasDetail);

      // Ambil data group
      const groupSnapshot = await get(child(dbRef, 'dtb_group_item_aktivitas'));
      const groupData = groupSnapshot.val();
      const groupMap = {};
      if (groupData) {
        const groupList = Object.values(groupData);
        const filteredGroups = groupList.filter(
          g => g.daftar_aktivitas_id === daftarId && g.is_active === true
        );
        filteredGroups.forEach(g => {
          groupMap[g.id_group_item_aktivitas] = g;
        });
      }
      setGroupData(groupMap);

      // Ambil field item untuk mapping group_id
      const itemFieldsSnapshot = await get(child(dbRef, 'dtb_item_aktivitas'));
      const itemFieldsData = itemFieldsSnapshot.val();
      const itemFieldsMap = {};
      const fieldGroupMapTemp = {};
      if (itemFieldsData) {
        Object.values(itemFieldsData).forEach(field => {
          itemFieldsMap[field.id_item_aktivitas] = field;
          const groupId = field.group_item_aktivitas_id || '';
          if (groupId) {
            fieldGroupMapTemp[field.id_item_aktivitas] = groupId;
          }
        });
      }
      setFieldGroupMap(fieldGroupMapTemp);

      // Ambil data item
      const itemSnapshot = await get(child(dbRef, 'dtb_data_item_aktivitas'));
      const itemData = itemSnapshot.val();

      const valuesSnapshot = await get(child(dbRef, 'dtb_data_item_values'));
      const valuesData = valuesSnapshot.val();

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
            fieldDetails: {},
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
              const groupId = fieldGroupMapTemp[val.item_aktivitas_id] || '';
              groupedItems[itemId].values[label] = val.value_text;
              groupedItems[itemId].valueIds.push(val.id_data_item_value);
              groupedItems[itemId].fieldDetails[val.item_aktivitas_id] = {
                label,
                groupId,
              };
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
    // Jika tidak ada detail item, beri notifikasi atau langsung kembali
    if (!hasDetailItem) {
      setError('Daftar aktivitas ini tidak memiliki field detail item.');
      return;
    }
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
        statusApproval: statusApproval, // kirim juga
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
        statusApproval: statusApproval,
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
        statusApproval: statusApproval,
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
  // Fungsi untuk mengelompokkan values berdasarkan group
  // ============================================================
  const getGroupedValues = (item) => {
    const entries = Object.entries(item.values);
    const grouped = {};
    const ungrouped = [];

    entries.forEach(([label, value]) => {
      let groupId = '';
      for (const fieldId in item.fieldDetails) {
        if (item.fieldDetails[fieldId].label === label) {
          groupId = item.fieldDetails[fieldId].groupId;
          break;
        }
      }

      if (groupId && groupData[groupId]) {
        if (!grouped[groupId]) grouped[groupId] = [];
        grouped[groupId].push({ label, value });
      } else {
        ungrouped.push({ label, value });
      }
    });

    const sortedGroupIds = Object.keys(grouped).sort((a, b) => {
      return (groupData[a]?.urutan || 0) - (groupData[b]?.urutan || 0);
    });

    return { grouped, ungrouped, sortedGroupIds };
  };

  // ============================================================
  // LOGIKA AKSES (hanya berdasarkan allowed_by_position & allowed_by_role)
  // ============================================================
  const isAllowed = isAllowedByDaftar;
  const isAddable = isAllowed && ['draft', 'ongoing', 'rejected'].includes(statusName);
  const isEditable = isAddable;
  const isOwnData = isAllowed ? pelakuId === userData?.uid : true;

  useEffect(() => {
    if (isAllowed && !pelakuId && !loading) {
      setError('Data identitas tidak memiliki pelaku, silakan periksa data.');
    }
  }, [isAllowed, pelakuId, loading]);

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

  // Cek akses: jika user diizinkan tetapi data bukan miliknya, tolak
  if (isAllowed && !isOwnData) {
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

        {/* DATA IDENTITAS - DENGAN PERBAIKAN */}
        {Object.keys(identitasValues).length > 0 && (
          <Paper sx={{ p: 2, mb: 2, borderRadius: '4px', bgcolor: '#A5D6A7' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                Data Identitas
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Di Buat Oleh
                </Typography>
                <Typography variant="body2">
                  {pelakuName || '-'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Status Aktivitas
                </Typography>
                <Typography variant="body2" sx={{ color: getStatusColor(statusName), fontWeight: 500 }}>
                  {statusName || '-'}
                </Typography>
              </Box>
              {/* 🔥 Status Approval - ditampilkan dengan label yang benar */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Status Approval
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {statusApproval || '-'}
                </Typography>
              </Box>
              {/* 🔥 Field identitas lainnya - kecuali currentStepId, workflowId, statusApproval, dan internal fields */}
              {Object.entries(identitasValues)
                .filter(([key]) => 
                  !['id', 'pelakuId', 'pelakuName', 'createdAt', 'status', 'statusName', 
                    'catatanRevisi', 'currentStepId', 'workflowId', 'statusApproval'].includes(key)
                )
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
              const { grouped, ungrouped, sortedGroupIds } = getGroupedValues(data);
              
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

                    {/* Render ungrouped fields */}
                    {ungrouped.length > 0 && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1.5 }}>
                        {ungrouped.map(({ label, value }) => (
                          <Box
                            key={label}
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              py: 0.5,
                            }}
                          >
                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                              {label}
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
                        ))}
                      </Box>
                    )}

                    {/* Render grouped fields dalam Accordion */}
                    {sortedGroupIds.map(groupId => {
                      const group = groupData[groupId];
                      const fields = grouped[groupId];
                      if (!group || !fields || fields.length === 0) return null;
                      return (
                        <Accordion
                          key={groupId}
                          defaultExpanded={false}
                          sx={{
                            mb: 1.5,
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
                              minHeight: 40,
                            }}
                          >
                            <Typography variant="subtitle2" fontWeight="bold">
                              {group.group_label || group.group_name || 'Group'}
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails sx={{ pt: 1, pb: 1 }}>
                            {fields.map(({ label, value }) => (
                              <Box
                                key={label}
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  py: 0.5,
                                }}
                              >
                                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                                  {label}
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
                            ))}
                          </AccordionDetails>
                        </Accordion>
                      );
                    })}

                    <Divider sx={{ my: 1.5 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {/* 🔥 Tombol Lihat Detail hanya muncul jika ada detail item */}
                        {hasDetailItem && (
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
                        )}
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