// focus/src/pages/activity/tambah-identitas/hooks/useSaveIdentitas.js
import { useState } from 'react';
import { saveIdentitasData, updateIdentitasData } from '../services/identitasService';
import { FORM_MODE } from '../constants';

export const useSaveIdentitas = ({
  mode = FORM_MODE.CREATE,
  dataIdentitasId,
  identitasFields,
  formValues,
  selectedDaftarAktivitas,
  activityData,
  userData,
  navigate,
  setError,
}) => {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [savedDataIdentitasId, setSavedDataIdentitasId] = useState(null);

  // State untuk dialog (create mode)
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [tempDataIdentitasId, setTempDataIdentitasId] = useState(null);
  const [tempDaftarAktivitasId, setTempDaftarAktivitasId] = useState(null);
  const [tempActivityData, setTempActivityData] = useState(null);
  const [tempPelakuId, setTempPelakuId] = useState(null);
  const [tempStatusName, setTempStatusName] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      if (mode === FORM_MODE.EDIT) {
        // === EDIT MODE ===
        await updateIdentitasData({
          dataIdentitasId,
          identitasFields,
          formValues,
        });
        setSuccessMessage('Data identitas berhasil diperbarui!');
        setSuccess(true);
        setTimeout(() => navigate(-1), 1500);
      } else {
        // === CREATE MODE ===
        const newDataIdentitasId = await saveIdentitasData({
          identitasFields,
          formValues,
          selectedDaftarAktivitas,
          userData,
        });

        setSavedDataIdentitasId(newDataIdentitasId);
        setSuccessMessage('Data identitas berhasil disimpan!');
        setSuccess(true);

        const isItemWajib = selectedDaftarAktivitas?.is_item_wajib || false;

        if (isItemWajib) {
          setTempDataIdentitasId(newDataIdentitasId);
          setTempDaftarAktivitasId(selectedDaftarAktivitas?.id_daftar_aktivitas);
          setTempActivityData(activityData);
          setTempPelakuId(userData?.uid);
          setTempStatusName('ongoing');

          setTimeout(() => {
            setShowItemDialog(true);
          }, 500);
        } else {
          setTimeout(() => {
            navigate('/data-identitas', {
              state: {
                daftarAktivitasId: selectedDaftarAktivitas?.id_daftar_aktivitas,
                aktivitasId: activityData?.id_aktivitas,
                title: activityData?.nama_aktivitas,
              },
            });
          }, 1500);
        }
      }
    } catch (error) {
      console.error('Error saving data:', error);
      if (mode === FORM_MODE.EDIT) {
        setError('Gagal memperbarui data identitas: ' + error.message);
      } else {
        setError(error?.message || 'Gagal menyimpan data identitas');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDialogConfirm = () => {
    setShowItemDialog(false);
    navigate('/tambah-item', {
      state: {
        dataIdentitasId: tempDataIdentitasId,
        daftarAktivitasId: tempDaftarAktivitasId,
        aktivitasData: tempActivityData,
        pelakuId: tempPelakuId,
        statusName: tempStatusName,
      },
    });
  };

  const handleDialogClose = () => {
    setShowItemDialog(false);
    navigate('/data-identitas', {
      state: {
        daftarAktivitasId:
          tempDaftarAktivitasId || selectedDaftarAktivitas?.id_daftar_aktivitas,
        aktivitasId:
          tempActivityData?.id_aktivitas || activityData?.id_aktivitas,
        title: tempActivityData?.nama_aktivitas || activityData?.nama_aktivitas,
      },
    });
  };

  return {
    saving,
    success,
    setSuccess,
    successMessage,
    savedDataIdentitasId,
    showItemDialog,
    handleSave,
    handleDialogConfirm,
    handleDialogClose,
  };
};