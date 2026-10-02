// focus/src/pages/activity/tambah-identitas/hooks/useIdentitasFields.js
import { useState, useEffect } from 'react';
import {
  fetchDaftarAktivitas,
  fetchIdentitasFields as fetchIdentitasFieldsService,
  fetchOptionValues,
} from '../services/identitasService';
import { isLokasiField, isAktivitasField } from '../utils/fieldUtils';
import { FORM_MODE } from '../constants';

export const useIdentitasFields = ({
  mode = FORM_MODE.CREATE,
  activityData,
  daftarAktivitasId,
  setError,
}) => {
  const [loading, setLoading] = useState(true);
  const [identitasFields, setIdentitasFields] = useState([]);
  const [selectedDaftarAktivitas, setSelectedDaftarAktivitas] = useState(null);
  const [optionsMap, setOptionsMap] = useState({});

  useEffect(() => {
    // Create mode butuh activityData
    if (mode === FORM_MODE.CREATE && !activityData) return;

    const load = async () => {
      setLoading(true);
      try {
        const selectedDaftar = await fetchDaftarAktivitas({
          // Edit mode: activityData di-null-kan agar hanya pakai daftarAktivitasId
          activityData: mode === FORM_MODE.CREATE ? activityData : null,
          daftarAktivitasId,
        });
        setSelectedDaftarAktivitas(selectedDaftar);

        if (!selectedDaftar) {
          if (mode === FORM_MODE.CREATE) {
            setError('Tidak ada daftar aktivitas yang tersedia untuk aktivitas ini');
          } else {
            setError('Daftar aktivitas tidak ditemukan.');
          }
          return;
        }

        const filteredIdentitas = await fetchIdentitasFieldsService(selectedDaftar);
        setIdentitasFields(filteredIdentitas);

        // Ambil opsi untuk semua field select (kecuali yang ditangani khusus)
        const selectFields = filteredIdentitas.filter(
          (f) =>
            f.tipe_input === 'select' &&
            !isLokasiField(f) &&
            !isAktivitasField(f)
        );

        const optionsMapTemp = {};
        for (const field of selectFields) {
          const opts = await fetchOptionValues(field.id_identitas_aktivitas);
          optionsMapTemp[field.id_identitas_aktivitas] = opts;
        }
        setOptionsMap(optionsMapTemp);
      } catch (error) {
        console.error('Error fetching identitas fields:', error);
        setError('Gagal memuat data identitas');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [mode, activityData, daftarAktivitasId, setError]);

  return {
    loading,
    identitasFields,
    selectedDaftarAktivitas,
    optionsMap,
  };
};