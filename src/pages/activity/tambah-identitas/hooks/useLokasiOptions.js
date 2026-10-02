// focus/src/pages/activity/tambah-identitas/hooks/useLokasiOptions.js
import { useState, useEffect } from 'react';
import { fetchFilterLokasi } from '../services/identitasService';
import { getLokasiField } from '../utils/fieldUtils';

export const useLokasiOptions = ({ selectedDaftarAktivitas, identitasFields }) => {
  const [lokasiOptions, setLokasiOptions] = useState([]);
  const [loadingLokasi, setLoadingLokasi] = useState(false);

  useEffect(() => {
    if (identitasFields.length === 0) return;
    const lokasiField = getLokasiField(identitasFields);
    if (!lokasiField) return;

    const load = async () => {
      setLoadingLokasi(true);
      try {
        const opts = await fetchFilterLokasi(selectedDaftarAktivitas);
        setLokasiOptions(opts);
      } catch (error) {
        console.error('Error fetching filter lokasi:', error);
      } finally {
        setLoadingLokasi(false);
      }
    };

    load();
  }, [identitasFields, selectedDaftarAktivitas]);

  return { lokasiOptions, loadingLokasi };
};