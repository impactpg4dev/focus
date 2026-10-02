// focus/src/pages/activity/tambah-identitas/utils/fieldUtils.js

export const isLokasiField = (field) =>
  field.label === 'Lokasi' || field.nama_identitas === 'lokasi';

export const isAktivitasField = (field) =>
  field.label === 'Aktivitas' || field.nama_identitas === 'aktivitas';

export const isTanggalPengamatanField = (field) =>
  field.label === 'Tanggal Pengamatan' || field.nama_identitas === 'tanggal_pengamatan';

export const isWeekPengamatanField = (field) =>
  field.label === 'Week Pengamatan' || field.nama_identitas === 'week_pengamatan';

export const isCatatanField = (field) =>
  field.label === 'Catatan' || field.nama_identitas === 'catatan';

export const isDateField = (field) => field.tipe_input === 'date';

export const getTanggalPengamatanField = (fields) =>
  fields.find(isTanggalPengamatanField);

export const getWeekPengamatanField = (fields) =>
  fields.find(isWeekPengamatanField);

export const getLokasiField = (fields) => fields.find(isLokasiField);

export const getCatatanField = (fields) => fields.find(isCatatanField);