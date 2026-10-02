// focus/src/pages/activity/tambah-identitas/components/fields/LokasiAutocomplete.jsx
import React from 'react';
import { Autocomplete, Box, TextField, Typography } from '@mui/material';

const LokasiAutocomplete = ({
  field,
  value,
  isRequired,
  onChange,
  lokasiOptions,
  loadingLokasi,
}) => (
  <Autocomplete
    fullWidth
    options={lokasiOptions}
    getOptionLabel={(option) => option.label || ''}
    value={lokasiOptions.find((opt) => opt.id_lokasi === value) || null}
    onChange={(event, newValue) => {
      onChange(field.id_identitas_aktivitas, newValue ? newValue.id_lokasi : '');
    }}
    size="medium"
    loading={loadingLokasi}
    loadingText="Memuat data lokasi..."
    noOptionsText="Tidak ada lokasi yang tersedia"
    sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '4px' } }}
    renderInput={(params) => (
      <TextField {...params} label={field.label} required={isRequired} size="medium" />
    )}
    renderOption={(props, option) => (
      <li {...props}>
        <Box>
          <Typography variant="body2">{option.label}</Typography>
        </Box>
      </li>
    )}
    isOptionEqualToValue={(option, val) => option.id_lokasi === val?.id_lokasi}
    disablePortal
    clearOnEscape
  />
);

export default LokasiAutocomplete;