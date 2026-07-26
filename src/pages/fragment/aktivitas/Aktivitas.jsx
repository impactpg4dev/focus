// focus/src/pages/fragment/aktivitas/Aktivitas.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  CircularProgress,
  Divider,
  IconButton,
  Button
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import Tabs from '../../../components/navigation/tabs/Tabs';
import Dialog from '../../../components/feedback/dialog/Dialog';
import { database, ref, get, child } from '../../../config/firebase';
import { useAuth } from '../../../context/AuthContext';

const STORAGE_KEY = 'focus_selected_tab';

const Aktivitas = () => {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [tabs, setTabs] = useState([]);
  const [selectedTab, setSelectedTab] = useState(null);
  const [daftarAktivitas, setDaftarAktivitas] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [userRoleNames, setUserRoleNames] = useState([]);
  const [userRoleIds, setUserRoleIds] = useState([]);

  const [showMenuDialog, setShowMenuDialog] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  // ===== Ambil role user (ID + Nama) =====
  const fetchUserRoles = async () => {
    try {
      const dbRef = ref(database);
      const uid = userData?.uid || user?.uid;
      if (!uid) {
        console.warn('UID tidak ditemukan');
        return { roleIds: [], roleNames: [] };
      }

      const userRolesSnapshot = await get(child(dbRef, 'user_roles'));
      const userRolesData = userRolesSnapshot.val();
      if (!userRolesData) return { roleIds: [], roleNames: [] };

      const userRoleKeys = Object.keys(userRolesData).filter(
        key => userRolesData[key].uid === uid
      );
      if (userRoleKeys.length === 0) return { roleIds: [], roleNames: [] };

      const roleIds = userRoleKeys.map(key => userRolesData[key].id_role);

      const roleSnapshot = await get(child(dbRef, 'u_role'));
      const roleData = roleSnapshot.val();
      if (!roleData) return { roleIds, roleNames: [] };

      const roleNames = [];
      Object.values(roleData).forEach(role => {
        if (roleIds.includes(role.id_role) && role.is_active === true) {
          roleNames.push(role.nama_role);
        }
      });

      console.log('🔍 User Role IDs:', roleIds);
      console.log('🔍 User Role Names:', roleNames);
      return { roleIds, roleNames };
    } catch (error) {
      console.error('Error fetching user roles:', error);
      return { roleIds: [], roleNames: [] };
    }
  };

  // ===== Fungsi pengecekan izin membuat (AND) =====
  const isUserAllowedToCreate = (daftarAktivitasId) => {
    const daftarItem = daftarAktivitas.find(
      item => item.id_daftar_aktivitas === daftarAktivitasId
    );
    if (!daftarItem) return false;

    // Ambil allowed_by_position dan allowed_by_role (bisa object)
    let allowedPositions = daftarItem.allowed_by_position;
    let allowedRoles = daftarItem.allowed_by_role;

    // Konversi ke array jika masih object
    if (allowedPositions && typeof allowedPositions === 'object' && !Array.isArray(allowedPositions)) {
      allowedPositions = Object.values(allowedPositions);
    }
    if (allowedRoles && typeof allowedRoles === 'object' && !Array.isArray(allowedRoles)) {
      allowedRoles = Object.values(allowedRoles);
    }

    allowedPositions = Array.isArray(allowedPositions) ? allowedPositions : [];
    allowedRoles = Array.isArray(allowedRoles) ? allowedRoles : [];

    // Cek posisi
    const positionMatch = userData?.id_jabatan && allowedPositions.includes(userData.id_jabatan);
    // Cek role (setidaknya satu role cocok)
    const roleMatch = userRoleIds.some(roleId => allowedRoles.includes(roleId));

    // HARUS KEDUANYA COCOK (AND)
    return positionMatch && roleMatch;
  };

  // ===== Ambil data utama =====
  const fetchData = async () => {
    setLoading(true);
    try {
      const dbRef = ref(database);

      const { roleIds, roleNames } = await fetchUserRoles();
      setUserRoleIds(roleIds);
      setUserRoleNames(roleNames);

      const aktivitasSnapshot = await get(child(dbRef, 'dtb_aktivitas'));
      const aktivitasData = aktivitasSnapshot.val();

      const daftarSnapshot = await get(child(dbRef, 'dtb_daftar_aktivitas'));
      const daftarData = daftarSnapshot.val();

      let activeAktivitas = [];
      let activeDaftar = [];

      if (aktivitasData) {
        const aktivitasList = Object.values(aktivitasData);
        activeAktivitas = aktivitasList.filter(item => item.is_active === true);
        setTabs(activeAktivitas);
      }

      if (daftarData) {
        const daftarList = Object.values(daftarData);
        if (roleNames.length === 0) {
          activeDaftar = [];
          console.log('⚠️ User tidak memiliki role, daftar aktivitas disembunyikan.');
        } else {
          activeDaftar = daftarList.filter(
            item => item.is_active === true && roleNames.includes(item.nama_daftar_aktivitas)
          );
          console.log('✅ Daftar aktivitas yang sesuai role:', activeDaftar.map(d => d.nama_daftar_aktivitas));
        }
        setDaftarAktivitas(activeDaftar);
      }

      // Penentuan tab terpilih
      let savedTabId = null;
      try {
        savedTabId = sessionStorage.getItem(STORAGE_KEY);
      } catch (error) {
        console.error('Error reading sessionStorage:', error);
      }

      let selectedTabId = null;
      const validTabIds = activeAktivitas
        .filter(aktivitas =>
          activeDaftar.some(daftar => daftar.aktivitas_id === aktivitas.id_aktivitas)
        )
        .map(aktivitas => aktivitas.id_aktivitas);

      if (savedTabId && validTabIds.includes(savedTabId)) {
        selectedTabId = savedTabId;
      } else if (validTabIds.length > 0) {
        selectedTabId = validTabIds[0];
      }

      if (selectedTabId) {
        setSelectedTab(selectedTabId);
        try {
          sessionStorage.setItem(STORAGE_KEY, selectedTabId);
        } catch (error) {
          console.error('Error saving sessionStorage:', error);
        }
        const filtered = activeDaftar.filter(
          item => item.aktivitas_id === selectedTabId && item.is_active === true
        );
        const formatted = filtered.map((item, index) => ({
          id: item.id_daftar_aktivitas || index,
          title: item.nama_daftar_aktivitas || 'Tidak ada nama',
          updatedAt: item.updated_at || item.created_at,
          aktivitasId: item.aktivitas_id,
          daftarAktivitasId: item.id_daftar_aktivitas,
        }));
        setActivities(formatted);
      } else {
        setActivities([]);
      }

      setIsInitialLoad(false);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterActivitiesByTab = (aktivitasId) => {
    const filtered = daftarAktivitas.filter(
      item => item.aktivitas_id === aktivitasId && item.is_active === true
    );
    const formatted = filtered.map((item, index) => ({
      id: item.id_daftar_aktivitas || index,
      title: item.nama_daftar_aktivitas || 'Tidak ada nama',
      updatedAt: item.updated_at || item.created_at,
      aktivitasId: item.aktivitas_id,
      daftarAktivitasId: item.id_daftar_aktivitas,
    }));
    setActivities(formatted);
  };

  useEffect(() => {
    if (selectedTab && daftarAktivitas.length > 0 && !isInitialLoad) {
      filterActivitiesByTab(selectedTab);
      try {
        sessionStorage.setItem(STORAGE_KEY, selectedTab);
      } catch (error) {
        console.error('Error saving sessionStorage:', error);
      }
    }
  }, [selectedTab, daftarAktivitas]);

  const handleTabChange = (tab) => {
    setSelectedTab(tab.id_aktivitas);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return `Update Terakhir : ${date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })}`;
  };

  const handleItemClick = (activity) => {
    setSelectedActivity(activity);
    setShowMenuDialog(true);
  };

  const handleDialogBuatBaru = () => {
    setShowMenuDialog(false);
    const aktivitasData = tabs.find(tab => tab.id_aktivitas === selectedActivity.aktivitasId);
    navigate('/tambah-identitas', {
      state: {
        activity: aktivitasData || {
          id_aktivitas: selectedActivity.aktivitasId,
          nama_aktivitas: selectedActivity.title,
        },
        daftarAktivitasId: selectedActivity.daftarAktivitasId,
      },
    });
  };

  const handleDialogLihatData = () => {
    setShowMenuDialog(false);
    navigate('/data-identitas', {
      state: {
        daftarAktivitasId: selectedActivity.daftarAktivitasId,
        aktivitasId: selectedActivity.aktivitasId,
        title: selectedActivity.title,
      },
    });
  };

  const handleDialogClose = () => {
    setShowMenuDialog(false);
    setSelectedActivity(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ px: 0 }}>
      <Tabs
        tabs={tabs}
        value={selectedTab}
        onChange={handleTabChange}
        color="primary"
        size="large"
        sx={{ mb: 0 }}
      />

      <Typography variant="h6" fontWeight="bold" sx={{ mb: 1, mt: 1, mx: 1 }}>
        Daftar Aktivitas
      </Typography>

      <Paper sx={{ borderRadius: '4px', mx: 1 }}>
        <List sx={{ p: 0 }}>
          {userRoleNames.length === 0 ? (
            <ListItem>
              <ListItemText
                primary="Tidak ada akses aktivitas"
                secondary="Anda tidak memiliki role yang terdaftar. Silakan hubungi administrator."
              />
            </ListItem>
          ) : activities.length === 0 ? (
            <ListItem>
              <ListItemText
                primary="Tidak ada daftar aktivitas"
                secondary="Belum ada daftar aktivitas yang sesuai dengan role Anda"
              />
            </ListItem>
          ) : (
            activities.map((activity, index) => (
              <React.Fragment key={activity.id}>
                <ListItem
                  sx={{
                    py: 2,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  onClick={() => handleItemClick(activity)}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.light' }}>
                      <AssignmentIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight="500">
                        {activity.title}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(activity.updatedAt)}
                      </Typography>
                    }
                  />
                  <IconButton edge="end" size="small" sx={{ color: 'text.secondary' }}>
                    <ChevronRightIcon />
                  </IconButton>
                </ListItem>
                {index < activities.length - 1 && <Divider />}
              </React.Fragment>
            ))
          )}
        </List>
      </Paper>

      <Dialog
        open={showMenuDialog}
        onClose={handleDialogClose}
        title="Pilih Aksi"
        message="Pilih tindakan yang ingin Anda lakukan untuk aktivitas ini"
        variant="info"
        showCloseButton
        hideConfirmButton
        hideCancelButton
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
          {/* Tombol Buat Baru hanya jika position DAN role cocok */}
          {selectedActivity && isUserAllowedToCreate(selectedActivity.daftarAktivitasId) && (
            <Button
              variant="outlined"
              onClick={handleDialogBuatBaru}
              sx={{
                borderRadius: '4px',
                textTransform: 'none',
                py: 1.5,
                justifyContent: 'center',
              }}
            >
              Buat Baru
            </Button>
          )}
          <Button
            variant="outlined"
            color="secondary"
            onClick={handleDialogLihatData}
            sx={{
              borderRadius: '4px',
              textTransform: 'none',
              py: 1.5,
              justifyContent: 'center',
            }}
          >
            Lihat Data
          </Button>
        </Box>
      </Dialog>
    </Box>
  );
};

export default Aktivitas;