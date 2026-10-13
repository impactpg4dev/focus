// focus/src/utils/permissionUtils.js

/**
 * Cek apakah error dari Firebase Realtime Database adalah permission denied.
 * Firebase Realtime Database mengembalikan error dengan kode ini saat rules menolak.
 */
export const isPermissionDenied = (error) => {
  if (!error) return false;
  const msg = String(error.message || '').toLowerCase();
  return (
    error.code === 'PERMISSION_DENIED' ||
    msg.includes('permission_denied') ||
    msg.includes('permission denied')
  );
};

/**
 * Ubah error Realtime Database menjadi pesan yang human readable.
 * @param {Error} error
 * @param {string} fallback - pesan default jika bukan permission error
 * @returns {string}
 */
export const getFriendlyError = (error, fallback = 'Terjadi kesalahan. Silakan coba lagi.') => {
  if (!error) return fallback;

  if (isPermissionDenied(error)) {
    return 'Anda tidak memiliki izin untuk melakukan operasi ini. Hubungi administrator jika menurut Anda ini sebuah kesalahan.';
  }

  if (error.code === 'auth/network-request-failed') {
    return 'Koneksi ke server terputus. Periksa jaringan internet Anda.';
  }
  if (error.code === 'auth/too-many-requests') {
    return 'Terlalu banyak permintaan. Coba lagi beberapa saat.';
  }

  return error.message || fallback;
};

/**
 * Ubah error Firebase Auth menjadi pesan yang ramah untuk pengguna.
 * Digunakan di Login, Register, dan ForgotPassword.
 * @param {Error} err
 * @param {string} fallback
 * @returns {string}
 */
export const getAuthFriendlyError = (
  err,
  fallback = 'Terjadi kesalahan. Silakan coba lagi.'
) => {
  if (!err) return fallback;

  const code = err.code || '';
  switch (code) {
    // ---- Login ----
    case 'auth/user-not-found':
      return 'Email belum terdaftar. Silakan periksa kembali atau hubungi administrator.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email atau password salah.';
    case 'auth/invalid-email':
      return 'Format email tidak valid.';
    case 'auth/missing-email':
      return 'Email wajib diisi.';
    case 'auth/user-disabled':
      return 'Akun Anda dinonaktifkan. Hubungi administrator.';

    // ---- Register ----
    case 'auth/email-already-in-use':
      return 'Email sudah terdaftar. Silakan login.';
    case 'auth/weak-password':
      return 'Password terlalu lemah. Gunakan minimal 6 karakter.';
    case 'auth/operation-not-allowed':
      return 'Metode pendaftaran ini tidak diizinkan. Hubungi administrator.';

    // ---- Google Sign-In ----
    case 'auth/popup-closed-by-user':
      return 'Proses dibatalkan sebelum selesai.';
    case 'auth/popup-blocked':
      return 'Popup diblokir oleh browser. Izinkan popup untuk melanjutkan.';
    case 'auth/cancelled-popup-request':
      return 'Permintaan popup dibatalkan.';
    case 'auth/account-exists-with-different-credential':
      return 'Email sudah terdaftar dengan metode login lain. Silakan gunakan metode tersebut.';

    // ---- Umum ----
    case 'auth/network-request-failed':
      return 'Koneksi ke server terputus. Periksa jaringan internet Anda.';
    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan. Coba lagi beberapa saat.';
    case 'auth/internal-error':
      return 'Terjadi kesalahan internal. Coba beberapa saat lagi.';

    default:
      return err.message || fallback;
  }
};