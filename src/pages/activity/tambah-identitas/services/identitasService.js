// focus/src/pages/activity/tambah-identitas/services/identitasService.js
import { database, ref, get, child, push, set, update, remove } from '../../../../config/firebase';
import {
  isLokasiField,
  isAktivitasField,
  isTanggalPengamatanField,
  getCatatanField,
} from '../utils/fieldUtils';
import { convertYYYYMMDDToDDMMYYYY } from '../utils/dateUtils';

// 🔥 Ambil opsi dari dtb_option_values berdasarkan identitas_aktivitas_id
export const fetchOptionValues = async (identitasAktivitasId) => {
  try {
    const dbRef = ref(database);
    const snapshot = await get(child(dbRef, 'dtb_option_values'));
    if (!snapshot.exists()) return [];

    const data = snapshot.val();
    const options = [];
    for (const key in data) {
      const item = data[key];
      const id = item.identitas_aktivitas_id;
      const isMatch = Array.isArray(id)
        ? id.includes(identitasAktivitasId)
        : id === identitasAktivitasId;
      if (isMatch && item.is_active !== false) {
        options.push({
          label: item.option_label,
          value: item.option_value,
          urutan: item.urutan || 0,
        });
      }
    }
    options.sort((a, b) => (a.urutan || 0) - (b.urutan || 0));
    return options;
  } catch (error) {
    console.error('Error fetching option values:', error);
    return [];
  }
};

// 🔥 Cek assignment user
export const checkUserAssignment = async (daftarAktivitasId, uid) => {
  try {
    const dbRef = ref(database);
    const snapshot = await get(child(dbRef, 'dtb_workflow_approval_assignment'));
    if (!snapshot.exists()) return false;

    const data = snapshot.val();
    for (const key in data) {
      const item = data[key];
      if (
        item.daftar_aktivitas_id === daftarAktivitasId &&
        item.uid === uid &&
        item.is_active !== false
      ) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error checking assignment:', error);
    return false;
  }
};

// Ambil status id dari nama status
export const getStatusId = async (statusName) => {
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

// Fetch daftar aktivitas (activityData optional — untuk mode edit)
export const fetchDaftarAktivitas = async ({ activityData, daftarAktivitasId }) => {
  const dbRef = ref(database);
  const daftarSnapshot = await get(child(dbRef, 'dtb_daftar_aktivitas'));
  const daftarData = daftarSnapshot.val();

  let selectedDaftar = null;
  if (daftarData) {
    const daftarList = Object.values(daftarData);
    if (daftarAktivitasId) {
      selectedDaftar = daftarList.find(
        (item) =>
          item.id_daftar_aktivitas === daftarAktivitasId && item.is_active === true
      );
    }
    if (!selectedDaftar && activityData) {
      selectedDaftar = daftarList.find(
        (item) => item.aktivitas_id === activityData.id_aktivitas && item.is_active === true
      );
    }
  }
  return selectedDaftar;
};

export const fetchIdentitasFields = async (selectedDaftar) => {
  const dbRef = ref(database);
  const identitasSnapshot = await get(child(dbRef, 'dtb_identitas_aktivitas'));
  const identitasData = identitasSnapshot.val();

  if (!identitasData) return [];

  const identitasList = Object.values(identitasData);
  return identitasList
    .filter(
      (item) =>
        item.daftar_aktivitas_id === selectedDaftar.id_daftar_aktivitas &&
        item.is_active === true
    )
    .sort((a, b) => (a.urutan || 0) - (b.urutan || 0));
};

export const fetchFilterLokasi = async (selectedDaftarAktivitas) => {
  const dbRef = ref(database);
  const filterSnapshot = await get(child(dbRef, 'dtb_filter_lokasi_aktivitas'));
  const filterData = filterSnapshot.val();

  let jenisTanamanList = [];
  if (filterData) {
    const filterList = Object.values(filterData);
    const activeFilter = filterList.filter(
      (item) =>
        item.daftar_aktivitas_id === selectedDaftarAktivitas?.id_daftar_aktivitas &&
        item.is_active === true
    );
    jenisTanamanList = activeFilter.map((item) => item.jenis_tanaman);
  }

  if (jenisTanamanList.length === 0) return [];

  const lokasiSnapshot = await get(child(dbRef, 'tb_status_lokasi'));
  const lokasiData = lokasiSnapshot.val();
  if (!lokasiData) return [];

  const lokasiList = Object.values(lokasiData);
  const filteredLokasi = lokasiList.filter(
    (item) =>
      jenisTanamanList.includes(item.jenis_tanaman) && item.is_active !== false
  );

  const groupedLokasi = {};
  filteredLokasi.forEach((item) => {
    const key = `${item.lokasi}|${item.jenis_tanaman}`;
    if (
      !groupedLokasi[key] ||
      new Date(item.tanggal_mulai_perawatan) >
        new Date(groupedLokasi[key].tanggal_mulai_perawatan)
    ) {
      groupedLokasi[key] = item;
    }
  });

  const uniqueLokasi = Object.values(groupedLokasi);
  return uniqueLokasi.map((item) => ({
    id_lokasi: item.id_lokasi,
    label: `${item.lokasi}`,
    deskripsi: item.deskripsi,
    lokasi: item.lokasi,
  }));
};

// ===================== SAVE (CREATE) =====================
export const saveIdentitasData = async ({
  identitasFields,
  formValues,
  selectedDaftarAktivitas,
  userData,
}) => {
  const emptyFields = identitasFields.filter(
    (field) => field.is_required && !formValues[field.id_identitas_aktivitas]
  );
  if (emptyFields.length > 0) {
    throw new Error(
      `Mohon isi field yang wajib: ${emptyFields.map((f) => f.label).join(', ')}`
    );
  }

  const uid = userData?.uid || '';
  if (!uid) {
    throw new Error('User tidak terautentikasi.');
  }

  const daftarId = selectedDaftarAktivitas?.id_daftar_aktivitas;
  if (!daftarId) {
    throw new Error('Daftar aktivitas tidak ditemukan.');
  }

  const hasAssignment = await checkUserAssignment(daftarId, uid);
  if (!hasAssignment) {
    throw new Error(
      'Anda tidak memiliki penugasan untuk membuat data pada daftar aktivitas ini.'
    );
  }

  const statusOngoingId = await getStatusId('ongoing');
  const catatanField = getCatatanField(identitasFields);
  let statusId = statusOngoingId;
  if (catatanField) {
    const catatanValue = formValues[catatanField.id_identitas_aktivitas];
    if (catatanValue && catatanValue.trim() !== '') {
      const draftStatusId = await getStatusId('draft');
      if (draftStatusId) statusId = draftStatusId;
    }
  }

  const newDataRef = ref(database, 'dtb_data_identitas_aktivitas');
  const newDataRefPush = push(newDataRef);
  const dataIdentitasId = newDataRefPush.key;

  const newData = {
    id_data_identitas_aktivitas: dataIdentitasId,
    pelaku_id: uid,
    daftar_aktivitas_id: daftarId,
    status_aktivitas_id: statusId,
    current_workflow_approval_id: '',
    current_workflow_approval_steps_id: '',
    status_approval: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_active: true,
  };

  await set(newDataRefPush, newData);

  const valuesRef = ref(database, 'dtb_data_identitas_values');
  for (const field of identitasFields) {
    const value = formValues[field.id_identitas_aktivitas];
    if (value) {
      let valueText = value;
      const isDate = field.tipe_input === 'date' || isTanggalPengamatanField(field);
      if (isDate && typeof value === 'string' && value.includes('-')) {
        valueText = convertYYYYMMDDToDDMMYYYY(value);
      }
      if (typeof valueText === 'string' && valueText.trim() !== '') {
        const newValueRef = push(valuesRef);
        const dataIdentitasValueId = newValueRef.key;
        await set(newValueRef, {
          id_data_identitas_value: dataIdentitasValueId,
          data_identitas_aktivitas_id: dataIdentitasId,
          identitas_aktivitas_id: field.id_identitas_aktivitas,
          value_text: valueText,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }
  }

  return dataIdentitasId;
};

// ===================== UPDATE (EDIT) =====================
export const updateIdentitasData = async ({
  dataIdentitasId,
  identitasFields,
  formValues,
}) => {
  const emptyFields = identitasFields.filter(
    (field) => field.is_required && !formValues[field.id_identitas_aktivitas]
  );
  if (emptyFields.length > 0) {
    throw new Error(
      `Mohon isi field yang wajib: ${emptyFields.map((f) => f.label).join(', ')}`
    );
  }

  const identitasRef = ref(database, `dtb_data_identitas_aktivitas/${dataIdentitasId}`);
  await update(identitasRef, { updated_at: new Date().toISOString() });

  // Cek field Catatan → status draft
  const catatanField = getCatatanField(identitasFields);
  if (catatanField) {
    const catatanValue = formValues[catatanField.id_identitas_aktivitas];
    if (catatanValue && catatanValue.trim() !== '') {
      const draftStatusId = await getStatusId('draft');
      if (draftStatusId) {
        await update(identitasRef, {
          status_aktivitas_id: draftStatusId,
          updated_at: new Date().toISOString(),
        });
      }
    }
  }

  // Hapus nilai lama
  const valuesRef = ref(database, 'dtb_data_identitas_values');
  const valuesSnapshot = await get(valuesRef);
  const valuesData = valuesSnapshot.val();
  if (valuesData) {
    for (const key in valuesData) {
      if (valuesData[key].data_identitas_aktivitas_id === dataIdentitasId) {
        await remove(ref(database, `dtb_data_identitas_values/${key}`));
      }
    }
  }

  // Simpan nilai baru
  for (const field of identitasFields) {
    const value = formValues[field.id_identitas_aktivitas];
    if (value) {
      let valueText = value;
      const isDate = field.tipe_input === 'date' || isTanggalPengamatanField(field);
      if (isDate && typeof value === 'string' && value.includes('-')) {
        valueText = convertYYYYMMDDToDDMMYYYY(value);
      }
      if (typeof valueText === 'string' && valueText.trim() !== '') {
        const newValueRef = push(valuesRef);
        const dataIdentitasValueId = newValueRef.key;
        await set(newValueRef, {
          id_data_identitas_value: dataIdentitasValueId,
          data_identitas_aktivitas_id: dataIdentitasId,
          identitas_aktivitas_id: field.id_identitas_aktivitas,
          value_text: valueText,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }
  }

  return dataIdentitasId;
};

// Ekspor helper (biar konsisten)
export { isLokasiField, isAktivitasField };