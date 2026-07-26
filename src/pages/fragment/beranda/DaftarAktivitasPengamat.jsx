// focus/src/pages/fragment/beranda/DaftarAktivitasPengamat.jsx
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

const STORAGE_KEY = 'focus_selected_activity';

const DaftarAktivitasPengamat = () => {
  const { user, userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tabs, setTabs] = useState([]);
  const [selectedTab, setSelectedTab] = useState(null);
  const [allIdentitas, setAllIdentitas] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [statusCounts, setStatusCounts] = useState({
    ongoing: 0,
    draft: 0,
    pending: 0,
    rejected: 0,
    approved: 0,
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

      // Ambil data identitas untuk semua aktivitas user
      const identitasSnapshot = await get(child(dbRef, 'dtb_data_identitas_aktivitas'));
      const identitasData = identitasSnapshot.val() || {};
      const identitasList = Object.values(identitasData).filter(
        item => item.is_active === true && item.pelaku_id === uid
      );
      setAllIdentitas(identitasList);

      // Ambil status mapping
      const statusSnapshot = await get(child(dbRef, 'dtb_status_aktivitas'));
      const statusData = statusSnapshot.val() || {};
      const sMap = {};
      Object.values(statusData).forEach(item => {
        if (item.is_active !== false) {
          sMap[item.id_status_aktivitas] = item.nama_status;
        }
      });
      setStatusMap(sMap);

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
        setStatusCounts({ ongoing: 0, draft: 0, pending: 0, rejected: 0, approved: 0 });
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
    const counts = { ongoing: 0, draft: 0, pending: 0, rejected: 0, approved: 0 };
    allIdentitas.forEach(item => {
      if (item.daftar_aktivitas_id === daftarId) {
        const statusName = statusMap[item.status_aktivitas_id] || '';
        if (counts.hasOwnProperty(statusName)) {
          counts[statusName] += 1;
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
    { key: 'ongoing', label: 'Ongoing', color: 'warning.main' },
    { key: 'draft', label: 'Draft', color: 'text.secondary' },
    { key: 'pending', label: 'Pending', color: 'info.main' },
    { key: 'rejected', label: 'Rejected', color: 'error.main' },
    { key: 'approved', label: 'Approved', color: 'success.main' },
  ];

  const selectedTabData = tabs.find(tab => tab.id_aktivitas === selectedTab);
  const selectedName = selectedTabData?.nama_aktivitas || '';

  return (
    <Box sx={{ mb: 2, mx: 1 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        Aktivitas {selectedName}
      </Typography>

      {/* Horizontal swipe tanpa scrollbar */}
      <Box
        sx={{
          display: 'flex',
          overflowX: 'auto',
          flexWrap: 'nowrap',
          gap: 1,
          py: 0.5,
          px: 0.5,
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

      {selectedTab && (
        <Box sx={{ mt: 1 }}>
          {/* Horizontal swipe untuk status cards */}
          <Box
            sx={{
              display: 'flex',
              overflowX: 'auto',
              flexWrap: 'nowrap',
              gap: 1,
              py: 0.5,
              px: 0.5,
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': {
                display: 'none',
              },
              WebkitOverflowScrolling: 'touch',
              scrollSnapType: 'x mandatory',
              '& > *': {
                scrollSnapAlign: 'start',
                flexShrink: 0,
                minWidth: '80px',
                flex: '0 0 auto',
              },
            }}
          >
            {statusItems.map((item) => (
              <Box key={item.key} sx={{ minWidth: 80, flex: '0 0 auto' }}>
                <Card
                  sx={{
                    borderRadius: '4px',
                    boxShadow: 1,
                    borderColor: 'divider',
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

export default DaftarAktivitasPengamat;