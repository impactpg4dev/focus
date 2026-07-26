// focus/src/pages/fragment/beranda/DaftarAktivitasMandor.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import { database, ref, get, child } from '../../../config/firebase';
import { useAuth } from '../../../context/AuthContext';

const STORAGE_KEY = 'focus_selected_activity_mandor';

const DaftarAktivitasMandor = () => {
  const { user, userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tabs, setTabs] = useState([]);
  const [selectedTab, setSelectedTab] = useState(null);
  const [allIdentitas, setAllIdentitas] = useState([]);
  const [mandorStepId, setMandorStepId] = useState(null);
  const [mandorAssignedUsers, setMandorAssignedUsers] = useState([]);
  const [mandorLogsMap, setMandorLogsMap] = useState({});
  const [statusCounts, setStatusCounts] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  useEffect(() => {
    fetchActivities();
  }, []);

  // Restore selected activity dari sessionStorage setelah tabs dimuat
  useEffect(() => {
    if (!loading && tabs.length > 0) {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved && tabs.some(tab => tab.id_aktivitas === saved)) {
        const found = tabs.find(tab => tab.id_aktivitas === saved);
        if (found) {
          handleSelectActivity(found);
        } else {
          handleSelectActivity(tabs[0]);
        }
      } else {
        handleSelectActivity(tabs[0]);
      }
    }
  }, [loading, tabs]);

  // Fallback: jika selectedTab null dan tabs tersedia, pilih tabs[0]
  useEffect(() => {
    if (!loading && tabs.length > 0 && !selectedTab) {
      handleSelectActivity(tabs[0]);
    }
  }, [loading, tabs, selectedTab]);

  const fetchUserRoles = async (uid) => {
    try {
      const dbRef = ref(database);
      if (!uid) return [];

      const userRolesSnapshot = await get(child(dbRef, 'user_roles'));
      const userRolesData = userRolesSnapshot.val();
      if (!userRolesData) return [];

      const userRoleKeys = Object.keys(userRolesData).filter(
        key => userRolesData[key].uid === uid
      );

      if (userRoleKeys.length === 0) return [];

      const roleIds = userRoleKeys.map(key => userRolesData[key].id_role);
      const roleSnapshot = await get(child(dbRef, 'u_role'));
      const roleData = roleSnapshot.val();
      if (!roleData) return [];

      const userRoleNames = [];
      Object.values(roleData).forEach(role => {
        if (roleIds.includes(role.id_role) && role.is_active === true) {
          userRoleNames.push(role.nama_role);
        }
      });

      return userRoleNames;
    } catch (error) {
      console.error('Error fetching user roles:', error);
      return [];
    }
  };

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const dbRef = ref(database);
      const uid = userData?.uid || user?.uid;
      if (!uid) {
        setTabs([]);
        setLoading(false);
        return;
      }

      const userRoleNames = await fetchUserRoles(uid);
      if (userRoleNames.length === 0) {
        setTabs([]);
        setLoading(false);
        return;
      }

      // Ambil daftar aktivitas dari dtb_daftar_aktivitas
      const daftarSnapshot = await get(child(dbRef, 'dtb_daftar_aktivitas'));
      const daftarData = daftarSnapshot.val() || {};

      // Filter berdasarkan role dan is_active
      const activeDaftar = Object.values(daftarData).filter(
        item => item.is_active === true && userRoleNames.includes(item.nama_daftar_aktivitas)
      );

      // Buat daftar unik berdasarkan nama_daftar_aktivitas
      const uniqueMap = {};
      activeDaftar.forEach(item => {
        if (!uniqueMap[item.nama_daftar_aktivitas]) {
          uniqueMap[item.nama_daftar_aktivitas] = {
            id_aktivitas: item.id_daftar_aktivitas,
            nama_aktivitas: item.nama_daftar_aktivitas,
            inisial: item.nama_daftar_aktivitas,
          };
        }
      });

      const tabList = Object.values(uniqueMap);
      setTabs(tabList);

      // Ambil SEMUA data identitas yang aktif (tidak hanya milik user)
      const identitasSnapshot = await get(child(dbRef, 'dtb_data_identitas_aktivitas'));
      const identitasData = identitasSnapshot.val() || {};
      const identitasList = Object.values(identitasData).filter(
        item => item.is_active === true
      );
      setAllIdentitas(identitasList);

      // Cari step "Approval Mandor" yang aktif
      const stepsSnapshot = await get(child(dbRef, 'dtb_workflow_approval_steps'));
      const stepsData = stepsSnapshot.val() || {};
      let stepId = null;
      let assignedUsers = [];
      Object.values(stepsData).forEach(step => {
        if (
          step.is_active !== false &&
          step.nama_step &&
          step.nama_step.toLowerCase() === 'approval mandor'
        ) {
          stepId = step.id_workflow_approval_steps;
          let users = step.assigned_user_ids;
          if (users && typeof users === 'object' && !Array.isArray(users)) {
            users = Object.values(users);
          } else if (typeof users === 'string') {
            users = [users];
          } else if (!Array.isArray(users)) {
            users = [];
          }
          assignedUsers = users;
        }
      });
      setMandorStepId(stepId);
      setMandorAssignedUsers(assignedUsers);

      // Ambil log approval untuk step "Approval Mandor" dan assigned_to_user_id = uid
      const logSnapshot = await get(child(dbRef, 'dtb_workflow_log_data_approval'));
      const logData = logSnapshot.val() || {};
      const logMap = {};
      Object.values(logData).forEach(log => {
        if (log.workflow_step_id === stepId && log.assigned_to_user_id === uid) {
          const dataId = log.data_identitas_aktivitas_id;
          if (!logMap[dataId] || new Date(log.created_at) > new Date(logMap[dataId].created_at)) {
            logMap[dataId] = log;
          }
        }
      });
      setMandorLogsMap(logMap);

      // 🔥 Set default selectedTab ke tab pertama jika ada
      if (tabList.length > 0) {
        const defaultTab = tabList[0];
        setSelectedTab(defaultTab.id_aktivitas);
        const counts = computeStatusCounts(defaultTab.id_aktivitas);
        setStatusCounts(counts);
        try {
          sessionStorage.setItem(STORAGE_KEY, defaultTab.id_aktivitas);
        } catch (e) {
          console.error('Error saving to sessionStorage:', e);
        }
      } else {
        setSelectedTab(null);
        setStatusCounts({ pending: 0, approved: 0, rejected: 0 });
      }

    } catch (error) {
      console.error('Error fetching user activities:', error);
      setTabs([]);
    } finally {
      setLoading(false);
    }
  };

  // Fungsi untuk menghitung status berdasarkan daftar_aktivitas_id
  const computeStatusCounts = (daftarId) => {
    const counts = { pending: 0, approved: 0, rejected: 0 };
    const uid = userData?.uid || user?.uid;

    allIdentitas.forEach(item => {
      if (item.daftar_aktivitas_id === daftarId) {
        const log = mandorLogsMap[item.id_data_identitas_aktivitas];

        if (log) {
          if (log.status === 'approved') {
            counts.approved += 1;
          } else if (log.status === 'rejected') {
            counts.rejected += 1;
          }
        } else {
          const currentStepId = item.current_workflow_approval_steps_id;
          if (currentStepId === mandorStepId && mandorAssignedUsers.includes(uid)) {
            counts.pending += 1;
          }
        }
      }
    });

    return counts;
  };

  const handleSelectActivity = (tab) => {
    setSelectedTab(tab.id_aktivitas);
    const daftarId = tab.id_aktivitas;
    if (daftarId) {
      const counts = computeStatusCounts(daftarId);
      setStatusCounts(counts);
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, tab.id_aktivitas);
    } catch (e) {
      console.error('Error saving to sessionStorage:', e);
    }
  };

  const handleChipClick = (tab) => {
    if (selectedTab !== tab.id_aktivitas) {
      handleSelectActivity(tab);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (tabs.length === 0) {
    return null;
  }

  const statusItems = [
    { key: 'pending', label: 'Pending', color: 'info.main' },
    { key: 'approved', label: 'Approved', color: 'success.main' },
    { key: 'rejected', label: 'Rejected', color: 'error.main' },
  ];

  const selectedTabData = tabs.find(tab => tab.id_aktivitas === selectedTab);
  const selectedName = selectedTabData?.nama_aktivitas || '';

  return (
    <Box sx={{ mb: 2, mx: 1 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        Aktivitas {selectedName}
      </Typography>

      {/* Chip untuk memilih aktivitas - horizontal scroll (swipe) */}
      <Box
        sx={{
          display: 'flex',
          overflowX: 'auto',
          flexWrap: 'nowrap',
          gap: 1,
          py: 0.5,
          px: 0.5,
          mx: '-4px',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
          WebkitOverflowScrolling: 'touch',
          scrollSnapType: 'x mandatory',
          '& > *': {
            scrollSnapAlign: 'start',
            flexShrink: 0,
          },
        }}
      >
        {tabs.map((tab) => {
          const isActive = selectedTab === tab.id_aktivitas;
          return (
            <Chip
              key={tab.id_aktivitas}
              label={tab.nama_aktivitas}
              onClick={() => handleChipClick(tab)}
              color="primary"
              variant={isActive ? 'filled' : 'outlined'}
              sx={{
                boxShadow: 1,
                borderRadius: '18px',
                px: '9px',
                height: '36px',
                '& .MuiChip-label': {
                  fontWeight: 500,
                  fontSize: '0.75rem',
                },
                ...(isActive && {
                  backgroundColor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                }),
                ...(!isActive && {
                  '&:hover': {
                    backgroundColor: 'primary.light',
                    color: 'white',
                  },
                }),
              }}
            />
          );
        })}
      </Box>

      {/* 3 Card Status dengan justify-content: space-between */}
      {selectedTab && (
        <Box sx={{ mt: 1 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            {statusItems.map((item) => (
              <Box key={item.key} sx={{ flex: 1, minWidth: 0 }}>
                <Card
                  sx={{
                    borderRadius: '4px',
                    boxShadow: 1,
                    borderColor: 'divider',
                    height: '100%',
                  }}
                >
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ color: item.color }}>
                      {statusCounts[item.key] || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.label}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default DaftarAktivitasMandor;