// focus/src/pages/activity/tambah-identitas/components/TambahItemDialog.jsx
import React from 'react';
import Dialog from '../../../../components/feedback/dialog/Dialog';

const TambahItemDialog = ({ open, onClose, onConfirm }) => (
  <Dialog
    open={open}
    onClose={onClose}
    onConfirm={onConfirm}
    title="Tambah Item"
    message="Tambah data item sekarang?"
    confirmText="Ya"
    cancelText="Tidak"
    variant="info"
    confirmColor="primary"
  />
);

export default TambahItemDialog;