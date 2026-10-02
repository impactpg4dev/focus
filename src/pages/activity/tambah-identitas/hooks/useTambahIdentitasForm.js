// focus/src/pages/activity/tambah-identitas/hooks/useTambahIdentitasForm.js
import { useState, useEffect } from 'react';
import {
  getWeekNumber,
  convertDateToYYYYMMDD,
} from '../utils/dateUtils';
import {
  getTanggalPengamatanField,
  getWeekPengamatanField,
  getLokasiField,
  isTanggalPengamatanField,
} from '../utils/fieldUtils';
import { FORM_MODE } from '../constants';

const EXCLUDED_EXISTING_KEYS = [
  'id',
  'pelakuId',
  'createdAt',
  'status',
  'updatedAt',
  'atasan_id',
  'catatan_revisi',
  'is_active',
];

export const useTambahIdentitasForm = ({
  mode = FORM_MODE.CREATE,
  identitasFields,
  navigationState,
  lokasiTerpilih,
  lokasiOptions,
  existingValues,
}) => {
  const [formValues, setFormValues] = useState({});

  // Inisialisasi form values
  useEffect(() => {
    if (identitasFields.length === 0) return;

    if (mode === FORM_MODE.EDIT && existingValues) {
      // === EDIT MODE: init dari existing values ===
      const normalize = (str) => str?.toLowerCase().trim() || '';

      const filteredExisting = Object.keys(existingValues)
        .filter((key) => !EXCLUDED_EXISTING_KEYS.includes(key))
        .reduce((obj, key) => {
          obj[key] = existingValues[key];
          return obj;
        }, {});

      const initialValues = {};
      identitasFields.forEach((field) => {
        let value = '';
        const matchedKey = Object.keys(filteredExisting).find(
          (key) =>
            normalize(key) === normalize(field.label) ||
            normalize(key) === normalize(field.nama_identitas)
        );
        if (matchedKey) {
          value = filteredExisting[matchedKey] || '';
        }
        // Konversi tanggal (semua field tipe date)
        const isDate =
          field.tipe_input === 'date' || isTanggalPengamatanField(field);
        if (isDate && value) {
          value = convertDateToYYYYMMDD(value);
        }
        initialValues[field.id_identitas_aktivitas] = value;
      });

      setFormValues(initialValues);
    } else {
      // === CREATE MODE: init empty ===
      const initialValues = {};
      identitasFields.forEach((field) => {
        initialValues[field.id_identitas_aktivitas] = '';
      });
      setFormValues(initialValues);
    }
  }, [identitasFields, mode, existingValues]);

  // CREATE MODE: isi tanggal pengamatan dan week dari navigationState
  useEffect(() => {
    if (mode !== FORM_MODE.CREATE) return;
    if (navigationState?.tanggalPengamatan && identitasFields.length > 0) {
      const tanggalField = getTanggalPengamatanField(identitasFields);
      if (tanggalField) {
        const dateStr = navigationState.tanggalPengamatan; // format DD/MM/YYYY
        const formattedDate = convertDateToYYYYMMDD(dateStr);
        if (formattedDate) {
          const updates = {
            [tanggalField.id_identitas_aktivitas]: formattedDate,
          };
          const weekField = getWeekPengamatanField(identitasFields);
          if (weekField) {
            const weekNumber = getWeekNumber(dateStr);
            if (weekNumber) {
              updates[weekField.id_identitas_aktivitas] = String(weekNumber);
            }
          }
          setFormValues((prev) => ({ ...prev, ...updates }));
        }
      }
    }
  }, [mode, navigationState?.tanggalPengamatan, identitasFields]);

  // CREATE MODE: isi lokasi terpilih dari navigation
  useEffect(() => {
    if (mode !== FORM_MODE.CREATE) return;
    if (lokasiTerpilih && lokasiOptions.length > 0 && identitasFields.length > 0) {
      const lokasiField = getLokasiField(identitasFields);
      if (lokasiField) {
        const found = lokasiOptions.some(
          (opt) => opt.id_lokasi === lokasiTerpilih.id_lokasi
        );
        if (found) {
          setFormValues((prev) => ({
            ...prev,
            [lokasiField.id_identitas_aktivitas]: lokasiTerpilih.id_lokasi,
          }));
        }
      }
    }
  }, [mode, lokasiOptions, lokasiTerpilih, identitasFields]);

  // EDIT MODE: mapping nilai lokasi dari label ke ID setelah lokasiOptions tersedia
  useEffect(() => {
    if (mode !== FORM_MODE.EDIT) return;
    if (lokasiOptions.length > 0 && identitasFields.length > 0) {
      const lokasiField = getLokasiField(identitasFields);
      if (!lokasiField) return;

      const currentValue = formValues[lokasiField.id_identitas_aktivitas] || '';
      if (!currentValue) return;

      const normalize = (str) => str?.toLowerCase().trim() || '';
      const isId = lokasiOptions.some((opt) => opt.id_lokasi === currentValue);
      if (isId) return;

      const matchedOption = lokasiOptions.find(
        (opt) =>
          normalize(opt.label) === normalize(currentValue) ||
          normalize(opt.lokasi) === normalize(currentValue)
      );
      if (matchedOption) {
        setFormValues((prev) => ({
          ...prev,
          [lokasiField.id_identitas_aktivitas]: matchedOption.id_lokasi,
        }));
      }
    }
  }, [mode, lokasiOptions, identitasFields, formValues]);

  const handleInputChange = (fieldId, value) => {
    setFormValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  // 🔥 Handler untuk semua field date
  const handleDateChange = (fieldId, value, field) => {
    let formattedValue = '';
    let dateStrForWeek = '';
    if (value && value.isValid()) {
      formattedValue = value.format('YYYY-MM-DD');
      dateStrForWeek = value.format('DD/MM/YYYY');
    }

    setFormValues((prev) => {
      const newValues = { ...prev, [fieldId]: formattedValue };

      // Jika field ini adalah tanggal pengamatan, update Week Pengamatan otomatis
      if (isTanggalPengamatanField(field)) {
        const weekField = getWeekPengamatanField(identitasFields);
        if (weekField && dateStrForWeek) {
          const weekNumber = getWeekNumber(dateStrForWeek);
          if (weekNumber) {
            newValues[weekField.id_identitas_aktivitas] = String(weekNumber);
          } else {
            newValues[weekField.id_identitas_aktivitas] = '';
          }
        } else if (weekField) {
          newValues[weekField.id_identitas_aktivitas] = '';
        }
      }

      return newValues;
    });
  };

  const handleNumberChange = (fieldId, value) => {
    const numericValue = value.replace(/[^0-9.-]/g, '');
    handleInputChange(fieldId, numericValue);
  };

  return {
    formValues,
    handleInputChange,
    handleDateChange,
    handleNumberChange,
  };
};