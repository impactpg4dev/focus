// focus/src/pages/activity/data-identitas/DataIdentitas.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Divider,
  Chip,
  Alert,
  Snackbar,
  Card,
  CardContent,
  Button,
  IconButton,
  Stack,
  Skeleton,
  Checkbox,
  TextField,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Visibility as VisibilityIcon,
  CalendarToday as CalendarIcon,
  EventNote as EventNoteIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { database, ref, get, child, update, push, set } from '../../../config/firebase';
import { useAuth } from '../../../context/AuthContext';
import AppBar from '../../../components/surface/app-bar/AppBar';
import Dialog from '../../../components/feedback/dialog/Dialog';

const DataIdentitas = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataIdentitas, setDataIdentitas] = useState([]);
  const [daftarAktivitasData, setDaftarAktivitasData] = useState(null);
  const [activityData, setActivityData] = useState(null);
  const [jabatanName, setJabatanName] = useState('');
  const [userRoleIds, setUserRoleIds] = useState([]);
  const [workflowStepsMap, setWorkflowStepsMap] = useState({});
  const [workflowApprovalsMap, setWorkflowApprovalsMap] = useState({});

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDataId, setSelectedDataId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [selectedIds, setSelectedIds] = useState([]);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectNote, setRejectNote] = useState('');

  const navigationState = location.state;

  // ============================================================
  // 1. Ambil Role ID user
  // ============================================================
  const fetchUserRoleIds = async () => {
    try {
      const dbRef = ref(database);
      const uid = userData?.uid;
      if (!uid) return [];

      const userRolesSnapshot = await get(child(dbRef, 'user_roles'));
      const userRolesData = userRolesSnapshot.val();
      if (!userRolesData) return [];

      const roleIds = Object.keys(userRolesData)
        .filter(key => userRolesData[key].uid === uid)
        .map(key => userRolesData[key].id_role);

      return roleIds;
    } catch (error) {
      console.error('Error fetching user roles:', error);
      return [];
    }
  };

  // ============================================================
  // 2. Fungsi pengecekan izin kirim (AND - posisi + role)
  // ============================================================
  const isUserAllowedToSend = () => {
    if (!daftarAktivitasData) return false;

    let allowedPositions = daftarAktivitasData.allowed_by_position;
    let allowedRoles = daftarAktivitasData.allowed_by_role;

    if (allowedPositions && typeof allowedPositions === 'object' && !Array.isArray(allowedPositions)) {
      allowedPositions = Object.values(allowedPositions);
    }
    if (allowedRoles && typeof allowedRoles === 'object' && !Array.isArray(allowedRoles)) {
      allowedRoles = Object.values(allowedRoles);
    }

    allowedPositions = Array.isArray(allowedPositions) ? allowedPositions : [];
    allowedRoles = Array.isArray(allowedRoles) ? allowedRoles : [];

    const positionMatch = userData?.id_jabatan && allowedPositions.includes(userData.id_jabatan);
    const roleMatch = userRoleIds.some(roleId => allowedRoles.includes(roleId));

    return positionMatch && roleMatch;
  };

  // ============================================================
  // 3. Helper Approval (baru, tanpa dtb_aktivitas_approval_workflow)
  // ============================================================
  const getWorkflowApproval = async (daftarAktivitasId) => {
    try {
      const dbRef = ref(database);
      const workflowSnapshot = await get(child(dbRef, 'dtb_workflow_approval'));
      const workflowData = workflowSnapshot.val();
      if (!workflowData) return null;
      for (const key in workflowData) {
        const wf = workflowData[key];
        if (wf.daftar_aktivitas_id === daftarAktivitasId && wf.is_active === true) {
          return wf;
        }
      }
      return null;
    } catch (error) {
      console.error('Error fetching workflow approval:', error);
      return null;
    }
  };

  // ============================================================
  // 4. Log approval (dtb_workflow_log_data_approval)
  // ============================================================
  const logApprovalHistory = async (
    dataIdentitasId,
    action,
    beforeStatus,
    afterStatus,
    note,
    userId,
    userName,
    roleName,
    {
      workflowStepId = '',
      workflowId = '',
      urutan = 0,
      namaStep = '',
      assignedToUserId = '',
      statusApproval = '',
    } = {}
  ) => {
    try {
      const historyRef = push(ref(database, 'dtb_workflow_log_data_approval'));
      const historyId = historyRef.key;
      const historyData = {
        id_workflow_log_data_approval: historyId,
        action: action,
        status_before: beforeStatus,
        status_after: afterStatus,
        created_at: new Date().toISOString(),
        created_by: userId,
        created_by_name: userName,
        created_by_role: roleName,
        data_identitas_aktivitas_id: dataIdentitasId,
        workflow_step_id: workflowStepId,
        workflow_id: workflowId,
        urutan: urutan,
        nama_step: namaStep,
        assigned_to_user_id: assignedToUserId,
        status: statusApproval,
        catatan: note || '',
      };
      await set(historyRef, historyData);
      return historyId;
    } catch (error) {
      console.error('Error logging approval history:', error);
      return null;
    }
  };

  // ============================================================
  // 5. Helper: cari step berikutnya berdasarkan urutan
  // ============================================================
  const getNextStepId = (workflowApprovalId, currentUrutan) => {
    if (!workflowApprovalId || !currentUrutan) return null;
    let nextStepId = null;
    let minUrutan = Infinity;
    for (const stepId in workflowStepsMap) {
      const step = workflowStepsMap[stepId];
      if (
        step.workflow_approval_id === workflowApprovalId &&
        step.is_active === true &&
        step.urutan > currentUrutan &&
        step.urutan < minUrutan
      ) {
        minUrutan = step.urutan;
        nextStepId = step.id_workflow_approval_steps;
      }
    }
    return nextStepId;
  };

  // ============================================================
  // 6. Fungsi approve/reject (dengan status_aktivitas_id = approved dan status_approval diisi)
  // ============================================================
  const processApproval = async (
    dataIdentitasId,
    newStatus,
    userId,
    userName,
    roleName,
    note,
    currentStepId
  ) => {
    try {
      const dbRef = ref(database);
      const identitasSnapshot = await get(child(dbRef, `dtb_data_identitas_aktivitas`));
      const identitasData = identitasSnapshot.val();
      let dataKey = null;
      let currentWorkflowId = '';
      let currentStepIdData = '';
      for (const key in identitasData) {
        if (identitasData[key].id_data_identitas_aktivitas === dataIdentitasId) {
          dataKey = key;
          currentWorkflowId = identitasData[key].current_workflow_approval_id || '';
          currentStepIdData = identitasData[key].current_workflow_approval_steps_id || '';
          break;
        }
      }
      if (!dataKey) return null;

      // Ambil detail step dari currentStepId
      const currentStep = workflowStepsMap[currentStepId];
      const stepWorkflowId = currentStep?.workflow_approval_id || '';
      const stepUrutan = currentStep?.urutan || 0;
      const stepNama = currentStep?.nama_step || '';
      const assignedUsers = currentStep?.assigned_user_ids || [];
      const assignedToUser = Array.isArray(assignedUsers) ? assignedUsers[0] || '' : '';

      const actionType = newStatus === 'approved' ? 'approve' : 'reject';

      // Log approve/reject
      await logApprovalHistory(
        dataIdentitasId,
        actionType,
        'pending',
        newStatus,
        note,
        userId,
        userName,
        roleName,
        {
          workflowStepId: currentStepId,
          workflowId: stepWorkflowId,
          urutan: stepUrutan,
          namaStep: stepNama,
          assignedToUserId: assignedToUser,
          statusApproval: newStatus,
        }
      );

      let nextStepId = null;
      let finalStatus = newStatus;
      let statusApprovalText = '';

      if (newStatus === 'approved') {
        const nextId = getNextStepId(stepWorkflowId, stepUrutan);
        if (nextId) {
          nextStepId = nextId;
          // Ada step berikutnya: status_aktivitas_id = approved, status_approval = "Menunggu {nama_step_berikutnya}"
          finalStatus = 'approved';
          const nextStep = workflowStepsMap[nextId];
          const nextStepName = nextStep?.nama_step || 'Approval berikutnya';
          statusApprovalText = `Menunggu ${nextStepName}`;
          // Update current_workflow_approval_steps_id ke step berikutnya
          await update(ref(database, `dtb_data_identitas_aktivitas/${dataKey}`), {
            current_workflow_approval_steps_id: nextId,
            updated_at: new Date().toISOString(),
          });
        } else {
          // Tidak ada step berikutnya: status_aktivitas_id = approved, status_approval = "Approved"
          finalStatus = 'approved';
          statusApprovalText = 'Approved';
          await update(ref(database, `dtb_data_identitas_aktivitas/${dataKey}`), {
            current_workflow_approval_steps_id: '',
            updated_at: new Date().toISOString(),
          });
        }
      } else {
        // Rejected: status_aktivitas_id = rejected, status_approval = "Rejected"
        finalStatus = 'rejected';
        statusApprovalText = 'Rejected';
        await update(ref(database, `dtb_data_identitas_aktivitas/${dataKey}`), {
          current_workflow_approval_steps_id: '',
          updated_at: new Date().toISOString(),
        });
      }

      // Update status data
      const statusId = await getStatusId(finalStatus);
      await update(ref(database, `dtb_data_identitas_aktivitas/${dataKey}`), {
        status_aktivitas_id: statusId,
        status_approval: statusApprovalText,
        updated_at: new Date().toISOString(),
      });

      return { hasNextLevel: !!nextStepId, nextStepId: nextStepId, finalStatus: finalStatus };
    } catch (error) {
      console.error('Error in processApproval:', error);
      return null;
    }
  };

  // ============================================================
  // 7. Ambil data utama
  // ============================================================
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
    if (!navigationState || !navigationState.daftarAktivitasId) {
      setError('Data tidak lengkap.');
      setTimeout(() => navigate('/'), 2000);
      return;
    }
    fetchData();
  }, [navigationState]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    setSelectedIds([]);
    try {
      const dbRef = ref(database);

      const roleIds = await fetchUserRoleIds();
      setUserRoleIds(roleIds);

      // Ambil semua workflow steps
      const stepsSnapshot = await get(child(dbRef, 'dtb_workflow_approval_steps'));
      const stepsData = stepsSnapshot.val();
      const stepsMap = {};
      if (stepsData) {
        Object.values(stepsData).forEach(step => {
          stepsMap[step.id_workflow_approval_steps] = step;
        });
      }
      setWorkflowStepsMap(stepsMap);

      // Ambil semua workflow approval
      const workflowSnapshot = await get(child(dbRef, 'dtb_workflow_approval'));
      const workflowData = workflowSnapshot.val();
      const workflowMap = {};
      if (workflowData) {
        Object.values(workflowData).forEach(wf => {
          workflowMap[wf.id_workflow_approval] = wf;
        });
      }
      setWorkflowApprovalsMap(workflowMap);

      // Ambil daftar aktivitas
      const daftarSnapshot = await get(child(dbRef, 'dtb_daftar_aktivitas'));
      const daftarData = daftarSnapshot.val();
      if (daftarData) {
        const daftarList = Object.values(daftarData);
        const found = daftarList.find(
          item => item.id_daftar_aktivitas === navigationState.daftarAktivitasId && item.is_active === true
        );
        setDaftarAktivitasData(found);
      }

      // Ambil aktivitas
      const aktivitasSnapshot = await get(child(dbRef, 'dtb_aktivitas'));
      const aktivitasData = aktivitasSnapshot.val();
      if (aktivitasData) {
        const aktivitasList = Object.values(aktivitasData);
        const found = aktivitasList.find(
          item => item.id_aktivitas === navigationState.aktivitasId && item.is_active === true
        );
        setActivityData(found);
      }

      // Ambil values identitas
      const valuesSnapshot = await get(child(dbRef, 'dtb_data_identitas_values'));
      const valuesData = valuesSnapshot.val();

      // Ambil identitas fields
      const identitasSnapshot = await get(child(dbRef, 'dtb_identitas_aktivitas'));
      const identitasData = identitasSnapshot.val();
      const identitasMap = {};
      if (identitasData) {
        Object.values(identitasData).forEach(field => {
          identitasMap[field.id_identitas_aktivitas] = field;
        });
      }

      // Ambil lokasi
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

      // Ambil status
      const statusSnapshot = await get(child(dbRef, 'dtb_status_aktivitas'));
      const statusData = statusSnapshot.val();
      const statusMap = {};
      if (statusData) {
        Object.values(statusData).forEach(item => {
          if (item.is_active !== false) {
            statusMap[item.id_status_aktivitas] = item.nama_status;
          }
        });
      }

      // Ambil users
      const usersSnapshot = await get(child(dbRef, 'users'));
      const usersData = usersSnapshot.val();
      const userMap = {};
      if (usersData) {
        Object.values(usersData).forEach(user => {
          if (user.uid) {
            userMap[user.uid] = user.name || user.uid;
          }
        });
      }

      // Group values
      const groupedData = {};
      if (valuesData) {
        const valuesList = Object.values(valuesData);
        const identitasFieldIds = Object.keys(identitasMap).filter(
          key => identitasMap[key].daftar_aktivitas_id === navigationState.daftarAktivitasId
        );

        const filteredValues = valuesList.filter(
          item => identitasFieldIds.includes(item.identitas_aktivitas_id)
        );

        filteredValues.forEach(item => {
          const key = item.data_identitas_aktivitas_id;
          if (!groupedData[key]) {
            groupedData[key] = {};
          }
          const field = identitasMap[item.identitas_aktivitas_id];
          const label = field?.label || item.identitas_aktivitas_id;
          let value = item.value_text;
          if (field?.nama_identitas === 'lokasi' || field?.label === 'Lokasi') {
            value = lokasiMap[value] || value;
          }
          groupedData[key][label] = value;
        });
      }

      // Ambil data identitas utama
      const identitasUtamaSnapshot = await get(child(dbRef, 'dtb_data_identitas_aktivitas'));
      const identitasUtamaData = identitasUtamaSnapshot.val();

      // 🔥 Ambil filter tanggal dari navigationState
    const filterTanggal = navigationState?.filterTanggal;
    const fromCalendar = navigationState?.fromCalendar || false;

    console.log('📅 Filter tanggal dari calendar:', filterTanggal);

      const formattedData = Object.keys(groupedData).map(key => {
        const values = groupedData[key];
        let pelakuId = '';
        let createdAt = '';
        let statusId = '';
        let catatanRevisi = '';
        let currentStepId = '';
        let workflowId = '';
        let statusApprovalText = '';
        if (identitasUtamaData && identitasUtamaData[key]) {
          pelakuId = identitasUtamaData[key].pelaku_id || '';
          createdAt = identitasUtamaData[key].created_at || '';
          statusId = identitasUtamaData[key].status_aktivitas_id || '';
          catatanRevisi = identitasUtamaData[key].catatan_revisi || '';
          currentStepId = identitasUtamaData[key].current_workflow_approval_steps_id || '';
          workflowId = identitasUtamaData[key].current_workflow_approval_id || '';
          statusApprovalText = identitasUtamaData[key].status_approval || '';
        }
        const pelakuName = userMap[pelakuId] || pelakuId || '-';
        return {
          id: key,
          pelakuId,
          pelakuName,
          createdAt,
          status: statusId,
          statusName: statusMap[statusId] || 'Unknown',
          catatanRevisi,
          currentStepId,
          workflowId,
          statusApproval: statusApprovalText,
          ...values,
        };
      }).filter(item => {
        if (!identitasUtamaData) return false;
        const identitasKey = Object.keys(identitasUtamaData).find(
          key => identitasUtamaData[key].id_data_identitas_aktivitas === item.id
        );
        if (!identitasKey) return false;
        return identitasUtamaData[identitasKey].is_active === true;
      });

      // 🔥 Jika ada filter tanggal, filter data berdasarkan tanggal pengamatan
    let filteredByDate = formattedData;
    if (filterTanggal && fromCalendar) {
      // Cari field tanggal pengamatan di identitas
      const tanggalField = identitasData ? Object.values(identitasData).find(
        field => field.daftar_aktivitas_id === navigationState.daftarAktivitasId && 
                (field.label === 'Tanggal Pengamatan' || field.nama_identitas === 'tanggal_pengamatan')
      ) : null;

      if (tanggalField) {
        const tanggalFieldId = tanggalField.id_identitas_aktivitas;
        // Cari label field tanggal pengamatan
        const tanggalLabel = tanggalField.label || 'Tanggal Pengamatan';
        
        filteredByDate = formattedData.filter(item => {
          // Ambil nilai tanggal pengamatan dari data
          const tanggalValue = item[tanggalLabel];
          return tanggalValue === filterTanggal;
        });
        
        console.log(`📊 Data setelah filter tanggal ${filterTanggal}:`, filteredByDate.length, 'item ditemukan');
      } else {
        console.warn('⚠️ Field Tanggal Pengamatan tidak ditemukan untuk daftar aktivitas ini');
      }
    }

    // ============================================================
      // 🔥 TAMBAHAN: Filter berdasarkan lokasi jika dari hasil pencarian
      // ============================================================
      let finalFilteredData = filteredByDate;
      if (navigationState?.filterLokasi && navigationState?.fromSearch) {
        // Cari label lokasi dari filterLokasi menggunakan lokasiMap
        const lokasiLabel = lokasiMap[navigationState.filterLokasi];
        if (lokasiLabel) {
          // Filter data berdasarkan properti "Lokasi" yang sudah diisi dengan label
          finalFilteredData = finalFilteredData.filter(item => item['Lokasi'] === lokasiLabel);
          console.log(`📍 Data setelah filter lokasi "${lokasiLabel}":`, finalFilteredData.length, 'item ditemukan');
        } else {
          console.warn('⚠️ Lokasi dengan id', navigationState.filterLokasi, 'tidak ditemukan di lokasiMap');
        }
      }

    filteredByDate.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    finalFilteredData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setDataIdentitas(finalFilteredData);

    //setDataIdentitas(filteredByDate);

    

    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Gagal memuat data identitas');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // 8. Helper pengecekan approver berdasarkan step
  // ============================================================
  const isUserApproverForData = (data) => {
    if (!data.currentStepId) return false;
    const step = workflowStepsMap[data.currentStepId];
    if (!step || !step.is_active) return false;

    let assignedUsers = step.assigned_user_ids;
    if (assignedUsers && typeof assignedUsers === 'object' && !Array.isArray(assignedUsers)) {
      assignedUsers = Object.values(assignedUsers);
    }
    if (!Array.isArray(assignedUsers)) assignedUsers = [];

    return assignedUsers.includes(userData?.uid);
  };

  const isApprovalButtonsVisible = (stepId) => {
    if (!stepId) return false;
    const step = workflowStepsMap[stepId];
    if (!step || !step.is_active) return false;
    return step.is_approved === true && step.is_rejected === true;
  };

  // ============================================================
  // 9. Handler
  // ============================================================
  const handleBack = () => {
    navigate('/');
  };

  const handleTambahIdentitas = () => {
    navigate('/tambah-identitas', {
      state: {
        activity: activityData || {
          id_aktivitas: navigationState.aktivitasId,
          nama_aktivitas: navigationState.title || 'Aktivitas',
        },
        daftarAktivitasId: navigationState.daftarAktivitasId,
      },
    });
  };

  const handleEditItem = (data) => {
    navigate('/edit-identitas', {
      state: {
        dataIdentitasId: data.id,
        daftarAktivitasId: navigationState.daftarAktivitasId,
        aktivitasId: navigationState.aktivitasId,
        identitasValues: data,
        activityData: activityData,
        daftarAktivitasData: daftarAktivitasData,
      },
    });
  };

  const handleViewDetail = (data) => {
    navigate('/data-item', {
      state: {
        dataIdentitasId: data.id,
        daftarAktivitasId: navigationState.daftarAktivitasId,
        aktivitasId: navigationState.aktivitasId,
        identitasValues: data,
        activityData: activityData,
        daftarAktivitasData: daftarAktivitasData,
        pelakuId: data.pelakuId,
        pelakuName: data.pelakuName,
      },
    });
  };

  const handleDeleteClick = (data) => {
    setSelectedDataId(data.id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedDataId) return;
    setDeleting(true);
    setError('');

    try {
      const dbRef = ref(database);
      const identitasId = selectedDataId;

      const identitasSnapshot = await get(child(dbRef, 'dtb_data_identitas_aktivitas'));
      const identitasData = identitasSnapshot.val();
      let identitasKey = null;
      if (identitasData) {
        for (const key in identitasData) {
          if (identitasData[key].id_data_identitas_aktivitas === identitasId) {
            identitasKey = key;
            break;
          }
        }
      }
      if (!identitasKey) {
        setError('Data identitas tidak ditemukan');
        setDeleting(false);
        return;
      }

      await update(ref(database, `dtb_data_identitas_aktivitas/${identitasKey}`), {
        is_active: false,
        updated_at: new Date().toISOString(),
      });

      const itemSnapshot = await get(child(dbRef, 'dtb_data_item_aktivitas'));
      const itemData = itemSnapshot.val();
      const itemKeys = [];
      if (itemData) {
        for (const key in itemData) {
          if (itemData[key].data_identitas_aktivitas_id === identitasId && itemData[key].is_active === true) {
            itemKeys.push({ key, id: itemData[key].id_data_item_aktivitas });
          }
        }
      }

      for (const item of itemKeys) {
        await update(ref(database, `dtb_data_item_aktivitas/${item.key}`), {
          is_active: false,
          updated_at: new Date().toISOString(),
        });

        const detailSnapshot = await get(child(dbRef, 'dtb_data_detail_item_aktivitas'));
        const detailData = detailSnapshot.val();
        if (detailData) {
          const detailKeys = [];
          for (const key in detailData) {
            if (detailData[key].data_item_aktivitas_id === item.id && detailData[key].is_active === true) {
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
      }

      setDeleteDialogOpen(false);
      setSelectedDataId(null);
      setSuccessMessage('Data identitas dan semua data terkait berhasil dihapus!');
      setSuccess(true);

      await fetchData();
    } catch (error) {
      console.error('Error deleting identitas:', error);
      setError('Gagal menghapus data identitas: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setSelectedDataId(null);
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

  const handleAddReport = (data) => {
    navigate('/buat-laporan', {
      state: {
        dataIdentitasId: data.id,
        daftarAktivitasId: navigationState.daftarAktivitasId,
        aktivitasId: navigationState.aktivitasId,
        identitasValues: data,
        activityData: activityData,
        daftarAktivitasData: daftarAktivitasData,
      }
    });
  };

  // ============================================================
  // 10. FUNGSI UNTUK AKSI MASSAL
  // ============================================================

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

  const handleCheckboxChange = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const eligibleIds = eligibleData.map(item => item.id);
    if (selectedIds.length === eligibleIds.length && eligibleIds.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(eligibleIds);
    }
  };

  const handleOpenActionDialog = (type) => {
    setActionType(type);
    if (type === 'rejected') {
      setRejectNote('');
    }
    setActionDialogOpen(true);
  };

  const handleConfirmAction = async () => {
    setActionLoading(true);
    setError('');
    try {
      const targetStatusMap = {
        kirim: 'pending',
        rejected: 'rejected',
        approved: 'approved',
      };
      const statusName = targetStatusMap[actionType];
      if (!statusName) throw new Error('Aksi tidak dikenali');

      const dbRef = ref(database);
      const updates = {};
      const userId = userData?.uid || '';
      const userName = userData?.name || 'User';
      const roleName = jabatanName || '';

      for (const id of selectedIds) {
        const currentItem = dataIdentitas.find(item => item.id === id);
        if (!currentItem) continue;
        const beforeStatus = currentItem.statusName || '';

        const identitasSnapshot = await get(child(dbRef, 'dtb_data_identitas_aktivitas'));
        const identitasData = identitasSnapshot.val();
        let key = null;
        if (identitasData) {
          for (const k in identitasData) {
            if (identitasData[k].id_data_identitas_aktivitas === id) {
              key = k;
              break;
            }
          }
        }
        if (!key) continue;

        let finalStatusId = null;

        if (actionType === 'kirim') {
          const workflow = await getWorkflowApproval(navigationState.daftarAktivitasId);
          let workflowId = workflow?.id_workflow_approval || '';
          let firstStepId = '';
          let firstStepName = 'Approval';
          if (workflow) {
            const steps = Object.values(workflowStepsMap).filter(
              step => step.workflow_approval_id === workflowId && step.is_active === true
            );
            steps.sort((a, b) => a.urutan - b.urutan);
            if (steps.length > 0) {
              firstStepId = steps[0].id_workflow_approval_steps;
              firstStepName = steps[0].nama_step || 'Approval';
            }
          }

          // Log kirim
          await logApprovalHistory(
            id,
            actionType,
            beforeStatus,
            'pending',
            '',
            userId,
            userName,
            roleName,
            {
              workflowStepId: '',
              workflowId: '',
              urutan: 0,
              namaStep: '',
              assignedToUserId: '',
              statusApproval: '',
            }
          );

          // Update data identitas: status pending, set workflow_id, current_step, dan status_approval
          updates[`dtb_data_identitas_aktivitas/${key}/status_aktivitas_id`] = await getStatusId('pending');
          if (workflowId) {
            updates[`dtb_data_identitas_aktivitas/${key}/current_workflow_approval_id`] = workflowId;
          }
          if (firstStepId) {
            updates[`dtb_data_identitas_aktivitas/${key}/current_workflow_approval_steps_id`] = firstStepId;
            updates[`dtb_data_identitas_aktivitas/${key}/status_approval`] = `Menunggu ${firstStepName}`;
          } else {
            updates[`dtb_data_identitas_aktivitas/${key}/status_approval`] = 'Menunggu Approval';
          }
          updates[`dtb_data_identitas_aktivitas/${key}/updated_at`] = new Date().toISOString();

          finalStatusId = await getStatusId('pending');
        } else if (actionType === 'approved') {
          const result = await processApproval(
            id,
            'approved',
            userId,
            userName,
            roleName,
            '',
            currentItem.currentStepId
          );
          finalStatusId = await getStatusId('approved');
          // status dan current step sudah diupdate di processApproval
        } else if (actionType === 'rejected') {
          const result = await processApproval(
            id,
            'rejected',
            userId,
            userName,
            roleName,
            rejectNote,
            currentItem.currentStepId
          );
          finalStatusId = await getStatusId('rejected');
          if (rejectNote) {
            updates[`dtb_data_identitas_aktivitas/${key}/catatan_revisi`] = rejectNote;
          }
          updates[`dtb_data_identitas_aktivitas/${key}/updated_at`] = new Date().toISOString();
        }

        if (!finalStatusId) {
          console.error('finalStatusId kosong, gunakan statusId default');
          finalStatusId = await getStatusId(statusName);
        }

        updates[`dtb_data_identitas_aktivitas/${key}/status_aktivitas_id`] = finalStatusId;
        updates[`dtb_data_identitas_aktivitas/${key}/updated_at`] = new Date().toISOString();
      }

      if (Object.keys(updates).length > 0) {
        await update(ref(database), updates);
      }

      setActionDialogOpen(false);
      setSuccessMessage(`Berhasil mengubah status ${selectedIds.length} data`);
      setSuccess(true);
      setSelectedIds([]);
      await fetchData();
    } catch (err) {
      console.error('Error executing action:', err);
      setError('Gagal melakukan aksi: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleActionDialogClose = () => {
    setActionDialogOpen(false);
    setActionType('');
    setRejectNote('');
  };

  // ============================================================
  // 11. RENDER
  // ============================================================

  if (loading) {
    return (
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', pt: 0, pb: 10 }}>
        <AppBar title="Data Identitas" showBackButton onBackClick={handleBack} showLogout={false} />
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

  const canSend = isUserAllowedToSend();

  // ---------- Filter data ----------
  // 1. Data milik sendiri (semua status)
  const ownData = dataIdentitas.filter(item => 
    item.pelakuId === userData?.uid && 
    item.is_active !== false
  );

  // Data approval hanya untuk status pending atau approved (bukan draft)
  const approvalData = dataIdentitas.filter(item => 
    item.currentStepId && 
    (item.statusName === 'pending' || item.statusName === 'approved')
  );

  // Gabungkan, hindari duplikasi
  const mergedMap = new Map();
  [...ownData, ...approvalData].forEach(item => {
    if (!mergedMap.has(item.id)) {
      mergedMap.set(item.id, item);
    }
  });
  let filteredData = Array.from(mergedMap.values());

  // ---------- Eligible data (untuk dicentang) ----------
  const eligibleData = filteredData.filter(item => {
    // User dapat memilih data milik sendiri yang status draft/rejected (jika dia punya izin kirim)
    if (canSend && item.pelakuId === userData?.uid && 
        (item.statusName === 'draft' || item.statusName === 'rejected')) {
      return true;
    }
    // Atau data yang memiliki currentStepId, user adalah approver dan step approval aktif
    if (item.currentStepId && 
        isUserApproverForData(item) && 
        isApprovalButtonsVisible(item.currentStepId)) {
      return true;
    }
    return false;
  });

  const selectedCount = selectedIds.length;
  const totalEligible = eligibleData.length;
  const allSelected = selectedCount === totalEligible && totalEligible > 0;
  const selectAllLabel = allSelected ? `Batal (${selectedCount})` : `Pilih Semua (${selectedCount})`;

  const isApproverForSelected = selectedIds.some(id => {
    const data = dataIdentitas.find(item => item.id === id);
    return data && 
           data.currentStepId && 
           isUserApproverForData(data) && 
           isApprovalButtonsVisible(data.currentStepId);
  });

  const showApprovalButtons = selectedIds.some(id => {
    const data = dataIdentitas.find(item => item.id === id);
    if (!data) return false;
    return data.currentStepId && isApprovalButtonsVisible(data.currentStepId);
  });

  // ==================== RENDER UI ====================
  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', pt: 0, pb: 10 }}>
      <AppBar
        title="Data Identitas"
        showBackButton
        onBackClick={handleBack}
        showLogout={false}
      />

      <Container maxWidth="sm" sx={{ pt: 2, pb: 8, px: 2 }}>
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Aktivitas {activityData?.nama_aktivitas}
            </Typography>
            <Typography variant="subtitle1" fontWeight="bold">
              {activityData?.inisial} / {daftarAktivitasData?.nama_daftar_aktivitas}
            </Typography>
          </Box>
          <Chip
            label={`${filteredData.length} Data`}
            size="small"
            color="primary"
          />
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {filteredData.length === 0 ? (
          <Paper sx={{ p: 4, borderRadius: '4px', textAlign: 'center' }}>
            <Box sx={{ py: 2 }}>
              <Typography variant="body1" color="text.secondary">
                Tidak ada data identitas yang tersedia
              </Typography>
              {canSend && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleTambahIdentitas}
                  sx={{
                    borderRadius: '4px',
                    textTransform: 'none',
                    mt: 2,
                    px: 3,
                    py: 1,
                  }}
                >
                  Tambah Identitas
                </Button>
              )}
            </Box>
          </Paper>
        ) : (
          <Stack spacing={2}>
            {filteredData.map((data, index) => {
              const entries = Object.entries(data).filter(
                ([key]) => !['id', 'pelakuId', 'pelakuName', 'createdAt', 'status', 'statusName', 'catatanRevisi', 'currentStepId', 'workflowId', 'statusApproval'].includes(key)
              );
              const isDraft = data.statusName === 'draft';
              const isOngoing = data.statusName === 'ongoing';
              const isPending = data.statusName === 'pending';
              const isApproved = data.statusName === 'approved';
              const isRejected = data.statusName === 'rejected';

              const isChecked = selectedIds.includes(data.id);
              const showCheckbox = eligibleData.some(el => el.id === data.id);

              const showAdd = canSend && isApproved && data.pelakuId === userData?.uid;
              const showEditDelete = canSend && (isDraft || isOngoing || isRejected) && data.pelakuId === userData?.uid;

              let statusColor = 'text.primary';
              if (isDraft) statusColor = 'text.secondary';
              else if (isOngoing) statusColor = 'warning.main';
              else if (isPending) statusColor = 'info.main';
              else if (isApproved) statusColor = 'success.main';
              else if (isRejected) statusColor = 'error.main';

              // Tentukan warna untuk Status Approval
              let approvalStatusColor = 'text.secondary';
              const approvalText = data.statusApproval || '';
              if (approvalText.toLowerCase() === 'approved') {
                approvalStatusColor = 'success.main';
              } else if (approvalText.toLowerCase() === 'rejected') {
                approvalStatusColor = 'error.main';
              } else if (approvalText.toLowerCase().startsWith('menunggu')) {
                approvalStatusColor = 'warning.main';
              }

              return (
                <Card
                  key={data.id}
                  sx={{
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: isRejected ? 'error.main' : 'divider',
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
                          #{index + 1}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarIcon fontSize="small" color="action" />
                        <Typography variant="caption" color="text.secondary">
                          {formatDateShort(data.createdAt)}
                        </Typography>
                      </Box>
                    </Box>

                    <Divider sx={{ mb: 1.5 }} />

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          py: 0.5,
                        }}
                      >
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                          Pengamat
                        </Typography>
                        <Typography variant="body2">
                          {data.pelakuName || '-'}
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          py: 0.5,
                        }}
                      >
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                          Status Aktivitas
                        </Typography>
                        <Typography variant="body2" sx={{ color: statusColor, fontWeight: 500 }}>
                          {data.statusName || 'Unknown'}
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          py: 0.5,
                        }}
                      >
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                          Status Approval
                        </Typography>
                        <Typography variant="body2" sx={{ color: approvalStatusColor, fontWeight: 500 }}>
                          {data.statusApproval || '-'}
                        </Typography>
                      </Box>

                      {entries.map(([key, value]) => (
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
                      ))}
                      {isRejected && data.catatanRevisi && (
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            py: 0.5,
                            bgcolor: 'error.light',
                            px: 1,
                            borderRadius: 1,
                          }}
                        >
                          <Typography variant="body2" color="error.dark" sx={{ fontWeight: 500 }}>
                            Catatan Revisi:
                          </Typography>
                          <Typography variant="body2" color="error.dark" sx={{ maxWidth: '60%', textAlign: 'right' }}>
                            {data.catatanRevisi}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<VisibilityIcon />}
                          onClick={() => handleViewDetail(data)}
                          sx={{ borderRadius: '4px', textTransform: 'none', fontSize: '0.75rem' }}
                        >
                          Lihat Detail
                        </Button>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {showAdd && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={() => handleAddReport(data)}
                            sx={{ borderRadius: '4px', textTransform: 'none', fontSize: '0.75rem' }}
                          >
                            Buat Laporan
                          </Button>
                        )}

                        {showEditDelete && (
                          <>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleEditItem(data)}
                              sx={{ '&:hover': { bgcolor: 'rgba(46, 125, 50, 0.08)' }, p: 0.5 }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteClick(data)}
                              sx={{ '&:hover': { bgcolor: 'rgba(211, 47, 47, 0.08)' }, p: 0.5 }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </>
                        )}
                        {showCheckbox && (
                          <Checkbox
                            size="small"
                            checked={isChecked}
                            onChange={() => handleCheckboxChange(data.id)}
                            sx={{ p: 0.5 }}
                          />
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}
      </Container>

      {/* ==================== FOOTER ==================== */}
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
          {canSend && selectedIds.length === 0 && (
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={handleTambahIdentitas}
              sx={{
                borderRadius: '4px',
                textTransform: 'none',
                fontWeight: 600,
                py: 1.5,
              }}
            >
              Tambah Identitas
            </Button>
          )}

          {canSend && selectedIds.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                fullWidth
                variant="outlined"
                size="large"
                onClick={handleSelectAll}
                sx={{
                  borderRadius: '4px',
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1.5,
                  flex: 1,
                }}
              >
                {selectAllLabel}
              </Button>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                size="large"
                onClick={() => handleOpenActionDialog('kirim')}
                sx={{
                  borderRadius: '4px',
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1.5,
                  flex: 1,
                }}
              >
                Kirim
              </Button>
            </Box>
          )}

          {!canSend && isApproverForSelected && showApprovalButtons && selectedIds.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                fullWidth
                variant="outlined"
                size="large"
                onClick={handleSelectAll}
                sx={{
                  borderRadius: '4px',
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1.5,
                  flex: 1,
                }}
              >
                {selectAllLabel}
              </Button>
              <Button
                fullWidth
                variant="contained"
                color="error"
                size="large"
                onClick={() => handleOpenActionDialog('rejected')}
                sx={{
                  borderRadius: '4px',
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1.5,
                  flex: 1,
                }}
              >
                Rejected
              </Button>
              <Button
                fullWidth
                variant="contained"
                color="success"
                size="large"
                onClick={() => handleOpenActionDialog('approved')}
                sx={{
                  borderRadius: '4px',
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1.5,
                  flex: 1,
                }}
              >
                Approved
              </Button>
            </Box>
          )}

          {!canSend && !(isApproverForSelected && showApprovalButtons) && (
            <Typography variant="body2" color="text.secondary" align="center">
              Anda tidak memiliki akses untuk mengelola data ini
            </Typography>
          )}
        </Box>
      </Container>

      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteDialogClose}
        onConfirm={handleConfirmDelete}
        title="Hapus Data Identitas"
        message="Apakah Anda yakin ingin menghapus data identitas ini? Semua data item dan detail item terkait juga akan dihapus secara permanen."
        confirmText={deleting ? 'Menghapus...' : 'Hapus'}
        cancelText="Batal"
        variant="warning"
        confirmColor="error"
        showCloseButton={false}
        loading={deleting}
      />

      <Dialog
        open={actionDialogOpen}
        onClose={handleActionDialogClose}
        onConfirm={handleConfirmAction}
        title="Konfirmasi Aksi"
        message={
          actionType === 'rejected' 
            ? 'Anda akan menolak data. Berikan alasan penolakan (opsional):' 
            : `Anda akan mengubah status ${selectedIds.length} data menjadi "${actionType}". Lanjutkan?`
        }
        confirmText={actionLoading ? 'Memproses...' : 'Ya, Lanjutkan'}
        cancelText="Batal"
        variant={actionType === 'rejected' ? 'warning' : 'info'}
        confirmColor={actionType === 'rejected' ? 'error' : 'primary'}
        showCloseButton={false}
        loading={actionLoading}
      >
        {actionType === 'rejected' && (
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Alasan Penolakan"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            sx={{ mt: 1 }}
          />
        )}
      </Dialog>

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

export default DataIdentitas;