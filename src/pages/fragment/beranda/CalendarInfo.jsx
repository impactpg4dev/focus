// focus/src/pages/fragment/beranda/CalendarInfo.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  IconButton,
  Select,
  MenuItem,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  CalendarToday as CalendarTodayIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { database, ref, get, child } from '../../../config/firebase';
import { useAuth } from '../../../context/AuthContext';
import Dialog from '../../../components/feedback/dialog/Dialog';

dayjs.locale('id');

// Nama bulan dalam bahasa Indonesia
const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// Nama hari dalam bahasa Indonesia
const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

// Rentang tahun
const YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) => 2020 + i);

// 🔥 URL API Hari Libur Nasional Indonesia
const HOLIDAY_API_URL = 'https://libur.deno.dev/api';

// 🔥 Mapping status ke warna
const STATUS_COLORS = {
  draft: '#9e9e9e',      // Abu-abu
  ongoing: '#ff9800',    // Oranye
  pending: '#2196f3',    // Biru
  approved: '#4caf50',   // Hijau
  rejected: '#f44336',   // Merah
};

const CalendarInfo = ({ isPengamat }) => {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.month());
  const [selectedYear, setSelectedYear] = useState(currentDate.year());
  const [holidays, setHolidays] = useState([]);
  const [holidayNames, setHolidayNames] = useState({});
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  const [holidayError, setHolidayError] = useState(null);

  // 🔥 State untuk data identitas per tanggal (hanya milik sendiri)
  const [dateStatusMap, setDateStatusMap] = useState({});
  const [loadingStatus, setLoadingStatus] = useState(false);

  // State untuk dialog
  const [dialogPilihanOpen, setDialogPilihanOpen] = useState(false);
  const [dialogDaftarOpen, setDialogDaftarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dialogMode, setDialogMode] = useState(''); // 'buat' atau 'lihat'
  const [daftarAktivitas, setDaftarAktivitas] = useState([]);
  const [loadingAktivitas, setLoadingAktivitas] = useState(false);
  const [userRoleNames, setUserRoleNames] = useState([]);
  const [userRoleIds, setUserRoleIds] = useState([]);

  // 🔥 State untuk dialog informasi libur
  const [holidayInfoOpen, setHolidayInfoOpen] = useState(false);
  const [holidayInfoData, setHolidayInfoData] = useState(null);

  // ============================================================
  // 🔥 FETCH HARI LIBUR NASIONAL DARI API libur.deno.dev
  // ============================================================
  const fetchHolidays = async (year) => {
    setLoadingHolidays(true);
    setHolidayError(null);
    try {
      const response = await fetch(`${HOLIDAY_API_URL}?year=${year}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      let holidayDates = [];
      let holidayNamesMap = {};
      
      if (Array.isArray(data)) {
        data.forEach(item => {
          holidayDates.push(item.date);
          holidayNamesMap[item.date] = {
            name: item.name,
            is_national_holiday: item.is_national_holiday
          };
        });
      }
      
      setHolidays(holidayDates);
      setHolidayNames(holidayNamesMap);
      console.log(`📅 ${year} - ${holidayDates.length} hari libur ditemukan (termasuk cuti bersama)`);
    } catch (error) {
      console.error('Error fetching holidays from API:', error);
      setHolidayError(error.message);
    } finally {
      setLoadingHolidays(false);
    }
  };

  // ============================================================
  // 🔥 FETCH STATUS IDENTITAS PER TANGGAL (HANYA MILIK SENDIRI)
  // ============================================================
  const fetchDateStatusMap = async (year, month) => {
    setLoadingStatus(true);
    try {
      const dbRef = ref(database);
      const uid = userData?.uid || user?.uid;
      
      if (!uid) {
        setLoadingStatus(false);
        return;
      }
      
      // Ambil data identitas aktivitas
      const identitasSnapshot = await get(child(dbRef, 'dtb_data_identitas_aktivitas'));
      const identitasData = identitasSnapshot.val();
      
      // Ambil status aktivitas
      const statusSnapshot = await get(child(dbRef, 'dtb_status_aktivitas'));
      const statusData = statusSnapshot.val();
      
      // Buat map status id -> nama status
      const statusMap = {};
      if (statusData) {
        Object.values(statusData).forEach(status => {
          if (status.is_active !== false) {
            statusMap[status.id_status_aktivitas] = status.nama_status;
          }
        });
      }
      
      // Ambil nilai identitas untuk mendapatkan tanggal pengamatan
      const valuesSnapshot = await get(child(dbRef, 'dtb_data_identitas_values'));
      const valuesData = valuesSnapshot.val();
      
      // Ambil identitas fields untuk mencari field tanggal pengamatan
      const fieldsSnapshot = await get(child(dbRef, 'dtb_identitas_aktivitas'));
      const fieldsData = fieldsSnapshot.val();
      
      // Cari field tanggal pengamatan untuk setiap daftar aktivitas
      const tanggalFieldMap = {};
      if (fieldsData) {
        Object.values(fieldsData).forEach(field => {
          if (field.is_active === true && 
              (field.label === 'Tanggal Pengamatan' || field.nama_identitas === 'tanggal_pengamatan')) {
            if (!tanggalFieldMap[field.daftar_aktivitas_id]) {
              tanggalFieldMap[field.daftar_aktivitas_id] = [];
            }
            tanggalFieldMap[field.daftar_aktivitas_id].push(field.id_identitas_aktivitas);
          }
        });
      }
      
      // Map untuk menyimpan status per tanggal (hanya milik sendiri)
      const statusMapByDate = {};
      
      // Proses setiap data identitas
      if (identitasData) {
        const activeIdentitas = Object.values(identitasData).filter(
          item => item.is_active === true && item.pelaku_id === uid // 🔥 Hanya milik sendiri
        );
        
        for (const item of activeIdentitas) {
          const daftarAktivitasId = item.daftar_aktivitas_id;
          const dataId = item.id_data_identitas_aktivitas;
          const statusName = statusMap[item.status_aktivitas_id] || 'unknown';
          
          // Cari tanggal pengamatan untuk data ini
          const tanggalFieldIds = tanggalFieldMap[daftarAktivitasId] || [];
          
          if (valuesData && tanggalFieldIds.length > 0) {
            const valueItems = Object.values(valuesData).filter(
              v => v.data_identitas_aktivitas_id === dataId && 
                   tanggalFieldIds.includes(v.identitas_aktivitas_id)
            );
            
            for (const val of valueItems) {
              if (val.value_text) {
                // Format tanggal dari DD/MM/YYYY ke YYYY-MM-DD
                const dateParts = val.value_text.split('/');
                if (dateParts.length === 3) {
                  const formattedDate = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
                  
                  // Simpan status dengan prioritas: pending > approved > ongoing > draft > rejected
                  if (!statusMapByDate[formattedDate] || 
                      getStatusPriority(statusName) > getStatusPriority(statusMapByDate[formattedDate])) {
                    statusMapByDate[formattedDate] = statusName;
                  }
                }
              }
            }
          }
        }
      }
      
      setDateStatusMap(statusMapByDate);
      console.log(`📊 Status per tanggal (milik sendiri) ditemukan:`, Object.keys(statusMapByDate).length, 'tanggal');
    } catch (error) {
      console.error('Error fetching date status map:', error);
    } finally {
      setLoadingStatus(false);
    }
  };

  // 🔥 Fungsi prioritas status (semakin tinggi semakin prioritas)
  const getStatusPriority = (statusName) => {
    const priorities = {
      'pending': 5,
      'approved': 4,
      'ongoing': 3,
      'draft': 2,
      'rejected': 1,
    };
    return priorities[statusName] || 0;
  };

  // ============================================================
  // 🔥 FETCH DATA KETIKA BULAN/TAHUN BERUBAH
  // ============================================================
  useEffect(() => {
    fetchDateStatusMap(selectedYear, selectedMonth + 1);
  }, [selectedYear, selectedMonth, userData?.uid]);

  // ============================================================
  // 🔥 FETCH HARI LIBUR KETIKA TAHUN BERUBAH
  // ============================================================
  useEffect(() => {
    fetchHolidays(selectedYear);
  }, [selectedYear]);

  // ============================================================
  // AMBIL ROLE USER
  // ============================================================
  useEffect(() => {
    const fetchUserRoles = async () => {
      try {
        const dbRef = ref(database);
        const uid = userData?.uid || user?.uid;
        if (!uid) return;

        const userRolesSnapshot = await get(child(dbRef, 'user_roles'));
        const userRolesData = userRolesSnapshot.val();
        if (!userRolesData) return;

        const userRoleKeys = Object.keys(userRolesData).filter(
          key => userRolesData[key].uid === uid
        );
        if (userRoleKeys.length === 0) return;

        const roleIds = userRoleKeys.map(key => userRolesData[key].id_role);
        setUserRoleIds(roleIds);
        
        const roleSnapshot = await get(child(dbRef, 'u_role'));
        const roleData = roleSnapshot.val();
        if (!roleData) return;

        const roleNames = [];
        Object.values(roleData).forEach(role => {
          if (roleIds.includes(role.id_role) && role.is_active === true) {
            roleNames.push(role.nama_role);
          }
        });
        setUserRoleNames(roleNames);
      } catch (error) {
        console.error('Error fetching user roles:', error);
      }
    };
    fetchUserRoles();
  }, [userData, user]);

  // ============================================================
  // SINKRONISASI DROPDOWN
  // ============================================================
  useEffect(() => {
    setSelectedMonth(currentDate.month());
    setSelectedYear(currentDate.year());
  }, [currentDate]);

  useEffect(() => {
    const newDate = dayjs().year(selectedYear).month(selectedMonth).date(1);
    if (!newDate.isSame(currentDate, 'month')) {
      setCurrentDate(newDate);
    }
  }, [selectedMonth, selectedYear]);

  // ============================================================
  // NAVIGASI BULAN
  // ============================================================
  const prevMonth = () => {
    setCurrentDate(currentDate.subtract(1, 'month'));
  };

  const nextMonth = () => {
    setCurrentDate(currentDate.add(1, 'month'));
  };

  // ============================================================
  // GENERATE DATA KALENDER
  // ============================================================
  const calendarData = useMemo(() => {
    const startOfMonth = currentDate.startOf('month');
    const endOfMonth = currentDate.endOf('month');
    const startDay = startOfMonth.day();
    const daysInMonth = endOfMonth.date();

    const prevMonthDays = [];
    const prevMonthEnd = startOfMonth.subtract(1, 'day');
    const prevMonthStart = prevMonthEnd.subtract(startDay - 1, 'day');
    for (let i = 0; i < startDay; i++) {
      prevMonthDays.push(prevMonthStart.add(i, 'day'));
    }

    const currentMonthDays = [];
    for (let i = 1; i <= daysInMonth; i++) {
      currentMonthDays.push(dayjs(`${currentDate.year()}-${currentDate.month() + 1}-${i}`));
    }

    const nextMonthDays = [];
    const remainingDays = 42 - (prevMonthDays.length + currentMonthDays.length);
    for (let i = 1; i <= remainingDays; i++) {
      nextMonthDays.push(endOfMonth.add(i, 'day'));
    }

    return [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
  }, [currentDate]);

  // ============================================================
  // 🔥 CEK HARI LIBUR DARI DATA API
  // ============================================================
  const isHoliday = (date) => {
    const dateStr = date.format('YYYY-MM-DD');
    return holidays.includes(dateStr);
  };

  const getHolidayInfo = (date) => {
    const dateStr = date.format('YYYY-MM-DD');
    return holidayNames[dateStr] || null;
  };

  const isSunday = (date) => {
    return date.day() === 0;
  };

  const isToday = (date) => {
    return date.isSame(dayjs(), 'day');
  };

  const isSelected = (date) => {
    return date.isSame(currentDate, 'day');
  };

  // 🔥 Fungsi untuk mendapatkan status pada tanggal tertentu (hanya milik sendiri)
  const getStatusForDate = (date) => {
    const dateStr = date.format('YYYY-MM-DD');
    return dateStatusMap[dateStr] || null;
  };

  // 🔥 Fungsi untuk mendapatkan warna status
  const getStatusColor = (statusName) => {
    return STATUS_COLORS[statusName] || '#9e9e9e';
  };

  // ============================================================
  // HITUNG JUMLAH HARI LIBUR DI BULAN INI
  // ============================================================
  const holidayCount = useMemo(() => {
    const startOfMonth = currentDate.startOf('month');
    const endOfMonth = currentDate.endOf('month');
    let count = 0;
    let current = startOfMonth;
    while (current.isBefore(endOfMonth) || current.isSame(endOfMonth, 'day')) {
      if (isHoliday(current)) {
        count++;
      }
      current = current.add(1, 'day');
    }
    return count;
  }, [currentDate, holidays]);

  // ============================================================
  // AMBIL DAFTAR AKTIVITAS
  // ============================================================
  const fetchDaftarAktivitas = async () => {
    setLoadingAktivitas(true);
    try {
      const dbRef = ref(database);
      const daftarSnapshot = await get(child(dbRef, 'dtb_daftar_aktivitas'));
      const daftarData = daftarSnapshot.val() || {};

      const aktivitasSnapshot = await get(child(dbRef, 'dtb_aktivitas'));
      const aktivitasData = aktivitasSnapshot.val() || {};

      const activeDaftar = Object.values(daftarData).filter(
        item => item.is_active === true && userRoleNames.includes(item.nama_daftar_aktivitas)
      );

      const result = [];
      activeDaftar.forEach(item => {
        const aktivitas = Object.values(aktivitasData).find(
          a => a.id_aktivitas === item.aktivitas_id && a.is_active === true
        );
        if (aktivitas) {
          result.push({
            id_daftar_aktivitas: item.id_daftar_aktivitas,
            id_aktivitas: aktivitas.id_aktivitas,
            nama_aktivitas: aktivitas.nama_aktivitas,
            inisial: aktivitas.inisial,
            nama_daftar_aktivitas: item.nama_daftar_aktivitas,
          });
        }
      });

      setDaftarAktivitas(result);
    } catch (error) {
      console.error('Error fetching daftar aktivitas:', error);
    } finally {
      setLoadingAktivitas(false);
    }
  };

  // ============================================================
  // HANDLER KLIK TANGGAL
  // ============================================================
  const handleDateClick = (date) => {
    const isFutureDate = date.isAfter(dayjs(), 'day');
    const isHolidayDate = isHoliday(date);

    // 🔥 1. Jika tanggal lebih dari hari ini dan libur: tampilkan informasi libur saja
    if (isFutureDate && isHolidayDate) {
      const holidayInfo = getHolidayInfo(date);
      if (holidayInfo) {
        setHolidayInfoData({
          date: date.format('DD MMMM YYYY'),
          name: holidayInfo.name,
          is_national_holiday: holidayInfo.is_national_holiday
        });
        setHolidayInfoOpen(true);
        return;
      }
    }

    // 🔥 2. Jika tanggal lebih dari hari ini (bukan libur): hanya highlight, tidak ada dialog
    if (isFutureDate) {
      setCurrentDate(date);
      return;
    }

    // 🔥 3. Jika tanggal kurang dari atau sama dengan hari ini dan libur: tampilkan Dialog Aksi + Informasi Libur
    if (isHolidayDate) {
      setSelectedDate(date);
      setDialogPilihanOpen(true);
      return;
    }

    // 4. Jika bukan pengamat, tidak ada aksi
    if (!isPengamat) {
      return;
    }

    // 5. Untuk tanggal yang valid (hari ini atau sebelumnya) dan bukan libur
    setSelectedDate(date);
    setDialogPilihanOpen(true);
  };

  // ============================================================
  // HANDLER DIALOG
  // ============================================================
  const handleBuatBaru = () => {
    setDialogPilihanOpen(false);
    setDialogMode('buat');
    fetchDaftarAktivitas();
    setDialogDaftarOpen(true);
  };

  const handleLihatData = () => {
    setDialogPilihanOpen(false);
    setDialogMode('lihat');
    fetchDaftarAktivitas();
    setDialogDaftarOpen(true);
  };

  const handleAktivitasClick = (aktivitas) => {
    setDialogDaftarOpen(false);

    if (dialogMode === 'buat') {
      navigate('/tambah-identitas', {
        state: {
          activity: {
            id_aktivitas: aktivitas.id_aktivitas,
            nama_aktivitas: aktivitas.nama_aktivitas,
            inisial: aktivitas.inisial,
          },
          daftarAktivitasId: aktivitas.id_daftar_aktivitas,
          tanggalPengamatan: selectedDate ? selectedDate.format('DD/MM/YYYY') : null,
        },
      });
    } else if (dialogMode === 'lihat') {
      const formattedDate = selectedDate ? selectedDate.format('DD/MM/YYYY') : null;
      navigate('/data-identitas', {
        state: {
          daftarAktivitasId: aktivitas.id_daftar_aktivitas,
          aktivitasId: aktivitas.id_aktivitas,
          title: aktivitas.nama_aktivitas,
          filterTanggal: formattedDate,
          fromCalendar: true,
        },
      });
    }
  };

  const handleDialogPilihanClose = () => {
    setDialogPilihanOpen(false);
  };

  const handleDialogDaftarClose = () => {
    setDialogDaftarOpen(false);
  };

  // 🔥 Handler untuk dialog informasi libur
  const handleHolidayInfoClose = () => {
    setHolidayInfoOpen(false);
    setHolidayInfoData(null);
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <Box sx={{ width: '100%' }}>
      {/* Header dengan dropdown bulan & tahun */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            variant="standard"
            disableUnderline
            sx={{
              fontSize: '0.875rem',
              fontWeight: 500,
              '& .MuiSelect-select': {
                py: 0,
                px: 0.5,
                display: 'flex',
                alignItems: 'center',
              },
              '& .MuiSelect-icon': {
                position: 'relative',
                marginLeft: 0.5,
                fontSize: '1rem',
              },
            }}
          >
            {MONTH_NAMES.map((name, index) => (
              <MenuItem key={index} value={index}>
                {name}
              </MenuItem>
            ))}
          </Select>

          <Select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            variant="standard"
            disableUnderline
            sx={{
              fontSize: '0.875rem',
              fontWeight: 500,
              '& .MuiSelect-select': {
                py: 0,
                px: 0.5,
                display: 'flex',
                alignItems: 'center',
              },
              '& .MuiSelect-icon': {
                position: 'relative',
                marginLeft: 0.5,
                fontSize: '1rem',
              },
            }}
          >
            {YEAR_OPTIONS.map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </Select>

          {loadingHolidays && (
            <CircularProgress size={16} sx={{ ml: 1 }} />
          )}
          {holidayError && (
            <Typography variant="caption" color="error" sx={{ ml: 1 }}>
              ⚠️ Gagal memuat libur
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
          <IconButton size="small" onClick={prevMonth}>
            <ChevronLeftIcon />
          </IconButton>
          <IconButton size="small" onClick={nextMonth}>
            <ChevronRightIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Grid Kalender */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 0.5,
          mb: 0,
        }}
      >
        {DAY_NAMES.map((name) => (
          <Box
            key={name}
            sx={{
              textAlign: 'center',
              fontWeight: 600,
              fontSize: '0.75rem',
              color: 'text.secondary',
              py: 1,
            }}
          >
            {name}
          </Box>
        ))}

        {calendarData.map((date, index) => {
          const isCurrentMonth = date.month() === currentDate.month();
          const isSundayDate = isSunday(date);
          const isHolidayDate = isHoliday(date);
          const isTodayDate = isToday(date);
          const isSelectedDate = isSelected(date);
          const isFutureDate = date.isAfter(dayjs(), 'day');
          const status = getStatusForDate(date);
          const statusColor = status ? getStatusColor(status) : null;

          let textColor = 'inherit';
          let bgColor = 'transparent';
          let fontWeight = 400;
          let cursor = 'pointer';

          // 🔥 Hari Minggu & Libur → merah (tetap)
          if (isSundayDate || isHolidayDate) {
            textColor = '#d32f2f';
          }

          // Hari di luar bulan ini → abu-abu
          if (!isCurrentMonth) {
            textColor = '#bdbdbd';
            if (isSundayDate || isHolidayDate) {
              textColor = '#ef9a9a';
            }
          }

          // Hari ini → bold
          if (isTodayDate) {
            fontWeight = 700;
          }

          // Dipilih → latar biru, teks putih (override semua)
          if (isSelectedDate) {
            bgColor = 'primary.main';
            textColor = '#ffffff';
          }

          // Jika tanggal lebih besar dari hari ini, cursor default
          if (isFutureDate) {
            cursor = 'default';
          }

          // 🔥 Buat tooltip untuk status (hanya untuk data milik sendiri)
          let tooltipText = '';
          if (status) {
            const statusLabels = {
              draft: 'Draft',
              ongoing: 'Ongoing',
              pending: 'Pending Approval',
              approved: 'Approved',
              rejected: 'Rejected',
            };
            tooltipText = `Status: ${statusLabels[status] || status}`;
          }

          return (
            <Tooltip key={index} title={tooltipText} arrow placement="top">
              <Box
                onClick={() => handleDateClick(date)}
                sx={{
                  height: '30px',
                  width: '30px',
                  margin: '0 auto',
                  aspectRatio: '1/1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem',
                  fontWeight: fontWeight,
                  color: textColor,
                  backgroundColor: bgColor,
                  borderRadius: '50%',
                  cursor: cursor,
                  position: 'relative',
                  transition: 'all 0.2s',
                  '&:hover': {
                    backgroundColor: isSelectedDate ? 'primary.dark' : (isFutureDate ? 'rgba(76, 175, 80, 0.8)' : 'action.hover'),
                  },
                  ...(isHolidayDate && !isSelectedDate && !isFutureDate && {
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      bottom: 2,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      backgroundColor: '#d32f2f',
                    },
                  }),
                  ...(isTodayDate && !isSelectedDate && {
                    border: '2px solid',
                    borderColor: 'primary.main',
                  }),
                }}
              >
                {date.date()}
                {/* 🔥 Tanda titik status di pojok kanan bawah - hanya untuk data milik sendiri */}
                {status && !isSelectedDate && (
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 1,
                      right: 1,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: statusColor,
                      border: '1px solid white',
                    }}
                  />
                )}
                {status && isSelectedDate && (
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 1,
                      right: 1,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: statusColor,
                      border: '1px solid white',
                    }}
                  />
                )}
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      {/* ============================================================ */}
      {/* DIALOG PILIHAN (Buat Baru / Lihat Data) */}
      {/* ============================================================ */}
      <Dialog
        open={dialogPilihanOpen}
        onClose={handleDialogPilihanClose}
        title="Pilih Aksi"
        message={
          selectedDate && isHoliday(selectedDate) ? (
            <>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Tanggal:</strong> {selectedDate.format('DD MMMM YYYY')}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Nama Libur:</strong> {getHolidayInfo(selectedDate)?.name || '-'}
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                <strong>Status:</strong>{' '}
                {getHolidayInfo(selectedDate)?.is_national_holiday ? (
                  <Chip label="Libur Nasional" size="small" color="error" />
                ) : (
                  <Chip label="Cuti Bersama" size="small" color="warning" />
                )}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pilih tindakan yang ingin Anda lakukan:
              </Typography>
            </>
          ) : (
            `Tanggal: ${selectedDate ? selectedDate.format('DD MMMM YYYY') : '-'}`
          )
        }
        variant="info"
        showCloseButton
        hideConfirmButton
        hideCancelButton
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
          <Button
            variant="outlined"
            onClick={handleBuatBaru}
            sx={{
              borderRadius: '4px',
              textTransform: 'none',
              py: 1.5,
              justifyContent: 'center',
            }}
          >
            Buat Baru
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={handleLihatData}
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

      {/* ============================================================ */}
      {/* DIALOG DAFTAR AKTIVITAS */}
      {/* ============================================================ */}
      <Dialog
        open={dialogDaftarOpen}
        onClose={handleDialogDaftarClose}
        title={dialogMode === 'buat' ? 'Pilih Aktivitas untuk Dibuat' : 'Pilih Aktivitas untuk Dilihat'}
        message={dialogMode === 'buat' ? 'Pilih aktivitas yang ingin Anda buat data baru' : 'Pilih aktivitas untuk melihat data'}
        variant="info"
        showCloseButton
        hideConfirmButton
        hideCancelButton
        loading={loadingAktivitas}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
          {loadingAktivitas ? (
            <Typography variant="body2" color="text.secondary" align="center">
              Memuat aktivitas...
            </Typography>
          ) : daftarAktivitas.length === 0 ? (
            <Typography variant="body2" color="text.secondary" align="center">
              Tidak ada aktivitas yang tersedia
            </Typography>
          ) : (
            daftarAktivitas.map((aktivitas) => (
              <Button
                key={aktivitas.id_daftar_aktivitas}
                variant="outlined"
                onClick={() => handleAktivitasClick(aktivitas)}
                sx={{
                  borderRadius: '4px',
                  textTransform: 'none',
                  py: 1.5,
                  justifyContent: 'center',
                  borderColor: 'divider',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'primary.light',
                    color: 'white',
                  },
                }}
              >
                {aktivitas.nama_aktivitas} / {aktivitas.nama_daftar_aktivitas}
              </Button>
            ))
          )}
        </Box>
      </Dialog>

      {/* ============================================================ */}
      {/* 🔥 DIALOG INFORMASI LIBUR */}
      {/* ============================================================ */}
      <Dialog
        open={holidayInfoOpen}
        onClose={handleHolidayInfoClose}
        onConfirm={handleHolidayInfoClose}
        title="📅 Informasi Hari Libur"
        message={
          holidayInfoData ? (
            <>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Tanggal:</strong> {holidayInfoData.date}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Nama Libur:</strong> {holidayInfoData.name}
              </Typography>
              <Typography variant="body1">
                <strong>Status:</strong>{' '}
                {holidayInfoData.is_national_holiday ? (
                  <Chip label="Libur Nasional" size="small" color="error" />
                ) : (
                  <Chip label="Cuti Bersama" size="small" color="warning" />
                )}
              </Typography>
            </>
          ) : 'Informasi libur tidak tersedia'
        }
        variant="info"
        confirmText="Tutup"
        hideCancelButton
        showCloseButton={false}
      />
    </Box>
  );
};

export default CalendarInfo;