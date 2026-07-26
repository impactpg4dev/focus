// focus/src/pages/fragment/profil/Profil.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  CircularProgress,
  IconButton,
  TextField,
  Button,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Work as WorkIcon,
  Badge as BadgeIcon,
  Business as BusinessIcon,
  Phone as PhoneIcon,
  School as SchoolIcon,
  AssignmentInd as AssignmentIndIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../context/AuthContext';
import { getActiveSession, getSessionHistory, isUserOnline } from '../../../utils/sessionUtils';
import { database, ref, get, set, update } from '../../../config/firebase';

const Profil = () => {
  const { userData } = useAuth();
  const [activeSession, setActiveSession] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  // State untuk menyimpan nama jabatan, departemen, status pekerjaan, dan status tenaga kerja
  const [jabatanName, setJabatanName] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [statusPekerjaanName, setStatusPekerjaanName] = useState('');
  const [statusTenagaKerjaName, setStatusTenagaKerjaName] = useState('');

  // State untuk data dari frtdb_users (hanya untuk status_update dan data yang diajukan)
  const [frtdbData, setFrtdbData] = useState(null);
  const [statusUpdate, setStatusUpdate] = useState('');
  const [loadingFrtdb, setLoadingFrtdb] = useState(false);

  // State untuk edit
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    gender: '',
    gmail: '',
    no_wa: '',
    avatar: '',
    cover_avatar: '',
    signature: '',
  });
  const [fileUploads, setFileUploads] = useState({
    avatar: null,
    cover_avatar: null,
    signature: null,
  });
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  // Ambil data dari frtdb_users (hanya untuk status_update dan data terbaru)
  useEffect(() => {
    const fetchFrtdbData = async () => {
      if (!userData?.uid) return;
      setLoadingFrtdb(true);
      try {
        const frtdbRef = ref(database, `frtdb_users/${userData.uid}`);
        const snapshot = await get(frtdbRef);
        const data = snapshot.val();
        setFrtdbData(data);
        if (data && data.status_update) {
          setStatusUpdate(data.status_update);
        } else {
          setStatusUpdate('');
        }
      } catch (err) {
        console.error('Error fetching frtdb_users:', err);
        setFrtdbData(null);
        setStatusUpdate('');
      } finally {
        setLoadingFrtdb(false);
      }
    };
    fetchFrtdbData();
  }, [userData]);

  // Inisialisasi editForm: default dari userData, atau dari frtdbData jika pending
  useEffect(() => {
    if (!userData) return;
    // Jika status pending, gunakan data dari frtdb (yang sudah berisi nilai terbaru)
    if (statusUpdate === 'pending' && frtdbData) {
      setEditForm({
        name: frtdbData.name || '',
        gender: frtdbData.gender || '',
        gmail: frtdbData.gmail || '',
        no_wa: frtdbData.no_wa || '',
        avatar: frtdbData.avatar || '',
        cover_avatar: frtdbData.cover_avatar || '',
        signature: frtdbData.signature || '',
      });
    } else {
      // Gunakan data dari userData (node users)
      setEditForm({
        name: userData.name || '',
        gender: userData.gender || '',
        gmail: userData.gmail || '',
        no_wa: userData.no_wa || '',
        avatar: userData.avatar || '',
        cover_avatar: userData.cover_avatar || '',
        signature: userData.signature || '',
      });
    }
  }, [userData, statusUpdate, frtdbData]);

  useEffect(() => {
    if (userData?.uid) {
      fetchSessionData();
    }
  }, [userData]);

  // Ambil data jabatan dari u_position
  useEffect(() => {
    if (userData?.id_jabatan) {
      const fetchJabatan = async () => {
        try {
          const jabatanRef = ref(database, `u_position/${userData.id_jabatan}`);
          const snapshot = await get(jabatanRef);
          const data = snapshot.val();
          if (data) {
            setJabatanName(data.nama_jabatan || '');
          } else {
            setJabatanName('');
          }
        } catch (error) {
          console.error('Error fetching jabatan:', error);
          setJabatanName('');
        }
      };
      fetchJabatan();
    } else {
      setJabatanName('');
    }
  }, [userData?.id_jabatan]);

  // Ambil data departemen dari u_department
  useEffect(() => {
    if (userData?.id_department) {
      const fetchDepartment = async () => {
        try {
          const deptRef = ref(database, `u_department/${userData.id_department}`);
          const snapshot = await get(deptRef);
          const data = snapshot.val();
          if (data) {
            setDepartmentName(data.nama_department || '');
          } else {
            setDepartmentName('');
          }
        } catch (error) {
          console.error('Error fetching department:', error);
          setDepartmentName('');
        }
      };
      fetchDepartment();
    } else {
      setDepartmentName('');
    }
  }, [userData?.id_department]);

  // Ambil data status pekerjaan dari u_employment_type
  useEffect(() => {
    if (userData?.id_status_pekerjaan) {
      const fetchStatusPekerjaan = async () => {
        try {
          const statusRef = ref(database, `u_employment_type/${userData.id_status_pekerjaan}`);
          const snapshot = await get(statusRef);
          const data = snapshot.val();
          if (data) {
            setStatusPekerjaanName(data.nama_status_pekerjaan || '');
          } else {
            setStatusPekerjaanName('');
          }
        } catch (error) {
          console.error('Error fetching status pekerjaan:', error);
          setStatusPekerjaanName('');
        }
      };
      fetchStatusPekerjaan();
    } else {
      setStatusPekerjaanName('');
    }
  }, [userData?.id_status_pekerjaan]);

  // Ambil data status tenaga kerja dari u_employment_status
  useEffect(() => {
    if (userData?.id_status_tenaga_kerja) {
      const fetchStatusTenagaKerja = async () => {
        try {
          const statusRef = ref(database, `u_employment_status/${userData.id_status_tenaga_kerja}`);
          const snapshot = await get(statusRef);
          const data = snapshot.val();
          if (data) {
            setStatusTenagaKerjaName(data.nama_status_tenaga_kerja || '');
          } else {
            setStatusTenagaKerjaName('');
          }
        } catch (error) {
          console.error('Error fetching status tenaga kerja:', error);
          setStatusTenagaKerjaName('');
        }
      };
      fetchStatusTenagaKerja();
    } else {
      setStatusTenagaKerjaName('');
    }
  }, [userData?.id_status_tenaga_kerja]);

  const fetchSessionData = async () => {
    setLoading(true);
    try {
      const userId = userData.uid;
      const active = await getActiveSession(userId);
      setActiveSession(active);

      if (active) {
        setIsOnline(isUserOnline(active));
      } else {
        setIsOnline(false);
      }

      const history = await getSessionHistory(userId, 5);
      setSessionHistory(history);
    } catch (error) {
      console.error('Error fetching session data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Update status online setiap 1 menit
  useEffect(() => {
    if (!activeSession) return;
    const interval = setInterval(() => {
      setIsOnline(isUserOnline(activeSession));
    }, 60000);
    return () => clearInterval(interval);
  }, [activeSession]);

  // ==============================
  // FUNGSI UNTUK EDIT PROFIL
  // ==============================

  const handleEditClick = () => {
    setIsEditing(true);
    setEditError('');
    setEditSuccess('');
    // Jika status pending, gunakan data dari frtdbData (yang sudah berisi nilai terbaru)
    if (statusUpdate === 'pending' && frtdbData) {
      setEditForm({
        name: frtdbData.name || '',
        gender: frtdbData.gender || '',
        gmail: frtdbData.gmail || '',
        no_wa: frtdbData.no_wa || '',
        avatar: frtdbData.avatar || '',
        cover_avatar: frtdbData.cover_avatar || '',
        signature: frtdbData.signature || '',
      });
    } else {
      // Gunakan data dari userData
      setEditForm({
        name: userData.name || '',
        gender: userData.gender || '',
        gmail: userData.gmail || '',
        no_wa: userData.no_wa || '',
        avatar: userData.avatar || '',
        cover_avatar: userData.cover_avatar || '',
        signature: userData.signature || '',
      });
    }
    setFileUploads({
      avatar: null,
      cover_avatar: null,
      signature: null,
    });
  };

  const handleEditChange = (field) => (e) => {
    setEditForm({
      ...editForm,
      [field]: e.target.value,
    });
  };

  const handleFileChange = (field) => (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileUploads({
        ...fileUploads,
        [field]: file,
      });
      // Tampilkan preview sementara
      const previewUrl = URL.createObjectURL(file);
      setEditForm({
        ...editForm,
        [field]: previewUrl,
      });
    }
  };

  const uploadToImgbb = async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('key', 'dbde9769a88bb0473595f84241778140');

    try {
      const response = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (result.success) {
        return result.data.url;
      } else {
        throw new Error(result.error?.message || 'Upload gagal');
      }
    } catch (error) {
      console.error('Error uploading to imgbb:', error);
      throw error;
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditError('');
    setEditSuccess('');
  };

  const handleSaveEdit = async () => {
    setEditError('');
    setEditSuccess('');
    setLoading(true);

    try {
      // Upload file jika ada yang baru
      let avatarUrl = editForm.avatar;
      let coverAvatarUrl = editForm.cover_avatar;
      let signatureUrl = editForm.signature;

      if (fileUploads.avatar) {
        avatarUrl = await uploadToImgbb(fileUploads.avatar);
      }
      if (fileUploads.cover_avatar) {
        coverAvatarUrl = await uploadToImgbb(fileUploads.cover_avatar);
      }
      if (fileUploads.signature) {
        signatureUrl = await uploadToImgbb(fileUploads.signature);
      }

      // Siapkan data lengkap seperti di node users, dengan field yang diedit diperbarui
      // Pastikan tidak ada properti statusData, emailData, emailKey
      const updatedData = {
        ...userData,
        name: editForm.name,
        gender: editForm.gender,
        gmail: editForm.gmail,
        no_wa: editForm.no_wa,
        avatar: avatarUrl,
        cover_avatar: coverAvatarUrl,
        signature: signatureUrl,
        updated_at: new Date().toISOString(),
        status_update: 'pending', // tambahkan status pending
      };

      // Hapus properti yang tidak diinginkan (jika ada)
      delete updatedData.statusData;
      delete updatedData.emailData;
      delete updatedData.emailKey;

      // Simpan ke frtdb_users dengan UID sebagai key
      const frtdbRef = ref(database, `frtdb_users/${userData.uid}`);
      await set(frtdbRef, updatedData);

      // Perbarui status_update dan frtdbData lokal
      setStatusUpdate('pending');
      setFrtdbData(updatedData);

      setEditSuccess('Perubahan berhasil disimpan dan menunggu persetujuan admin.');
      setIsEditing(false);
      // Refresh data session (opsional)
      await fetchSessionData();
    } catch (error) {
      console.error('Error saving profile:', error);
      setEditError('Gagal menyimpan perubahan: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Data utama untuk tampilan adalah userData (dari node users)
  const displayData = userData;

  if (!userData && !loadingFrtdb) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ px: 0 }}>
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 1, mt: 1, mx: 1 }}>
        Profil
      </Typography>

      {/* Profile Card */}
      <Paper sx={{ p: 3, mb: 3, mx: 1, borderRadius: '4px', textAlign: 'center', position: 'relative' }}>
        {/* Tombol Edit di pojok kanan atas */}
        {!isEditing && (
          <IconButton
            sx={{ position: 'absolute', top: 8, right: 8 }}
            onClick={handleEditClick}
            color="primary"
          >
            <EditIcon />
          </IconButton>
        )}

        {!isEditing ? (
          // Mode tampilan biasa
          <>
            <Avatar
              src={displayData?.avatar}
              sx={{
                width: 80,
                height: 80,
                mx: 'auto',
                mb: 2,
                border: '3px solid',
                borderColor: 'primary.main',
              }}
            >
              {displayData?.name?.[0] || 'U'}
            </Avatar>
            <Typography variant="h6" fontWeight="bold">
              {displayData?.name || 'User'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {jabatanName || '-'}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 1 }}>
              <Chip
                label={isOnline ? 'Online' : 'Idle'}
                color={isOnline ? 'success' : 'warning'}
                size="small"
              />
              {/* Tampilkan chip status_update jika pending */}
              {statusUpdate === 'pending' && (
                <Chip
                  label="Menunggu Persetujuan"
                  color="warning"
                  size="small"
                  icon={<EditIcon fontSize="small" />}
                />
              )}
            </Box>
          </>
        ) : (
          // Mode Edit
          <Box sx={{ mt: 2, textAlign: 'left' }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Edit profil Anda. Field yang bertanda * wajib diisi. Perubahan akan disimpan dan menunggu persetujuan admin.
            </Alert>
            {editError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {editError}
              </Alert>
            )}
            {editSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {editSuccess}
              </Alert>
            )}

            <TextField
              fullWidth
              label="Nama Lengkap *"
              value={editForm.name}
              onChange={handleEditChange('name')}
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="gender-label">Gender *</InputLabel>
              <Select
                labelId="gender-label"
                value={editForm.gender}
                label="Gender *"
                onChange={handleEditChange('gender')}
              >
                <MenuItem value="Male">Male</MenuItem>
                <MenuItem value="Female">Female</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Gmail Notifikasi"
              value={editForm.gmail}
              onChange={handleEditChange('gmail')}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="No. WhatsApp"
              value={editForm.no_wa}
              onChange={handleEditChange('no_wa')}
              sx={{ mb: 2 }}
            />

            {/* Avatar */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Avatar
              </Typography>
              {editForm.avatar && (
                <Box sx={{ mb: 1 }}>
                  <img src={editForm.avatar} alt="Avatar" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }} />
                </Box>
              )}
              <Button variant="outlined" component="label" size="small">
                Upload Avatar
                <input type="file" accept="image/*" hidden onChange={handleFileChange('avatar')} />
              </Button>
            </Box>

            {/* Cover Avatar */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Cover Avatar
              </Typography>
              {editForm.cover_avatar && (
                <Box sx={{ mb: 1 }}>
                  <img src={editForm.cover_avatar} alt="Cover" style={{ width: '100%', maxHeight: 150, objectFit: 'cover', borderRadius: 4 }} />
                </Box>
              )}
              <Button variant="outlined" component="label" size="small">
                Upload Cover
                <input type="file" accept="image/*" hidden onChange={handleFileChange('cover_avatar')} />
              </Button>
            </Box>

            {/* Signature */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Tanda Tangan
              </Typography>
              {editForm.signature && (
                <Box sx={{ mb: 1 }}>
                  <img src={editForm.signature} alt="Signature" style={{ width: 150, maxHeight: 80, objectFit: 'contain', border: '1px solid #ddd', borderRadius: 4 }} />
                </Box>
              )}
              <Button variant="outlined" component="label" size="small">
                Upload Signature
                <input type="file" accept="image/*" hidden onChange={handleFileChange('signature')} />
              </Button>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveEdit}
                disabled={loading || statusUpdate === 'pending'}
                fullWidth
              >
                {loading ? <CircularProgress size={24} /> : 'Simpan'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={handleCancelEdit}
                disabled={loading}
                fullWidth
              >
                Batal
              </Button>
            </Box>
            {/* Tambahan info jika status pending */}
            {statusUpdate === 'pending' && (
              <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
                ⚠️ Tombol Simpan dinonaktifkan karena perubahan sedang menunggu persetujuan admin.
              </Typography>
            )}
          </Box>
        )}
      </Paper>

      {/* Detail Information - hanya tampil jika tidak dalam mode edit */}
      {!isEditing && (
        <Paper sx={{ mb: 3, mx: 1, borderRadius: '4px' }}>
          <List sx={{ p: 0 }}>
            {/* ID User di paling atas */}
            <ListItem>
              <ListItemIcon>
                <BadgeIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="ID User"
                secondary={displayData?.uid || '-'}
              />
            </ListItem>
            <Divider />

            <ListItem>
              <ListItemIcon>
                <EmailIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Email Login"
                secondary={displayData?.email || '-'}
              />
            </ListItem>
            <Divider />

            {/* Gmail di bawah Email Login */}
            <ListItem>
              <ListItemIcon>
                <EmailIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Gmail Notifikasi"
                secondary={displayData?.gmail || '-'}
              />
            </ListItem>
            <Divider />

            <ListItem>
              <ListItemIcon>
                <WorkIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Jabatan"
                secondary={jabatanName || '-'}
              />
            </ListItem>
            <Divider />

            <ListItem>
              <ListItemIcon>
                <BusinessIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Departemen"
                secondary={departmentName || '-'}
              />
            </ListItem>
            <Divider />

            <ListItem>
              <ListItemIcon>
                <PersonIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Gender"
                secondary={displayData?.gender || 'Not Specified'}
              />
            </ListItem>
            <Divider />

            <ListItem>
              <ListItemIcon>
                <PhoneIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="No. WhatsApp"
                secondary={displayData?.no_wa || '-'}
              />
            </ListItem>
            <Divider />

            <ListItem>
              <ListItemIcon>
                <SchoolIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Status Pekerjaan"
                secondary={statusPekerjaanName || '-'}
              />
            </ListItem>
            <Divider />

            <ListItem>
              <ListItemIcon>
                <AssignmentIndIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Status Tenaga Kerja"
                secondary={statusTenagaKerjaName || '-'}
              />
            </ListItem>
          </List>
        </Paper>
      )}

      {/* Session Info - tetap tampil meskipun edit mode */}
      {activeSession && (
        <Paper sx={{ p: 2, mb: 3, mx: 1, borderRadius: '4px' }}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
            Sesi Aktif
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" color="text.secondary">Login</Typography>
              <Typography variant="caption">{formatDate(activeSession.login_time)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" color="text.secondary">Aktivitas Terakhir</Typography>
              <Typography variant="caption">{formatDate(activeSession.last_activity)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" color="text.secondary">Durasi</Typography>
              <Typography variant="caption">
                {Math.floor((Date.now() - activeSession.login_time) / (1000 * 60 * 60))} jam
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Session History */}
      {sessionHistory.length > 0 && (
        <Paper sx={{ p: 2, mb: 0, mx: 1, borderRadius: '4px' }}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
            Riwayat Login Terakhir
          </Typography>
          {loading ? (
            <CircularProgress size={20} />
          ) : (
            sessionHistory.map((session, index) => (
              <Box key={index} sx={{ py: 0.5, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(session.login_time)}
                  </Typography>
                  <Chip
                    label={session.logout_method === 'manual' ? 'Manual' : 'Timeout'}
                    size="small"
                    color={session.logout_method === 'manual' ? 'primary' : 'warning'}
                    variant="outlined"
                    sx={{ height: 18, fontSize: '0.6rem' }}
                  />
                </Box>
              </Box>
            ))
          )}
        </Paper>
      )}
    </Box>
  );
};

export default Profil;