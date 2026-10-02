// focus/src/pages/activity/tambah-identitas/components/IdentitasForm.jsx
import React from 'react';
import { Box, Paper, Typography, Divider } from '@mui/material';
import DynamicField from './DynamicField';

const IdentitasForm = ({
  title = 'Form Identitas',
  identitasFields,
  formValues,
  optionsMap,
  lokasiOptions,
  loadingLokasi,
  onInputChange,
  onDateChange,
  onNumberChange,
}) => {
  return (
    <Paper sx={{ p: 2, borderRadius: '4px' }}>
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Divider sx={{ mb: 2 }} />

      {identitasFields.length === 0 ? (
        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
          sx={{ py: 3 }}
        >
          Tidak ada field identitas yang tersedia
        </Typography>
      ) : (
        identitasFields.map((field) => (
          <Box key={field.id_identitas_aktivitas} sx={{ mb: 2 }}>
            <DynamicField
              field={field}
              value={formValues[field.id_identitas_aktivitas] || ''}
              optionsMap={optionsMap}
              lokasiOptions={lokasiOptions}
              loadingLokasi={loadingLokasi}
              onInputChange={onInputChange}
              onDateChange={onDateChange}
              onNumberChange={onNumberChange}
            />
          </Box>
        ))
      )}
    </Paper>
  );
};

export default IdentitasForm;