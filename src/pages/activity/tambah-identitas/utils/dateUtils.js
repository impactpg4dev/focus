// focus/src/pages/activity/tambah-identitas/utils/dateUtils.js

// Helper: get week number from date string (DD/MM/YYYY)
export const getWeekNumber = (dateString) => {
  if (!dateString) return '';
  const parts = dateString.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    const startOfYear = new Date(year, 0, 1);
    const diff = (date - startOfYear) / 86400000;
    return Math.ceil((diff + startOfYear.getDay() + 1) / 7);
  }
  return '';
};

// Helper: konversi DD/MM/YYYY ke YYYY-MM-DD
export const convertDateToYYYYMMDD = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  return dateStr;
};

// Helper: konversi YYYY-MM-DD ke DD/MM/YYYY
export const convertYYYYMMDDToDDMMYYYY = (value) => {
  if (typeof value === 'string' && value.includes('-')) {
    const parts = value.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  return value;
};