// focus/src/pages/activity/tambah-identitas/components/fields/OptionAutocomplete.jsx
import React from 'react';
import { Autocomplete, TextField, Typography } from '@mui/material';

const OptionAutocomplete = ({ field, value, isRequired, onChange, options }) => (
  <Autocomplete
    fullWidth
    options={options}
    getOptionLabel={(option) => option.label || ''}
    value={options.find((opt) => opt.value === value) || null}
    onChange={(event, newValue) => {
      onChange(field.id_identitas_aktivitas, newValue ? newValue.value : '');
    }}
    size="medium"
    loading={options.length === 0}
    loadingText="Memuat opsi..."
    noOptionsText="Tidak ada opsi tersedia"
    sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '4px' } }}
    renderInput={(params) => (
      <TextField {...params} label={field.label} required={isRequired} size="medium" />
    )}
    renderOption={(props, option) => (
      <li {...props}>
        <Typography variant="body2">{option.label}</Typography>
      </li>
    )}
    isOptionEqualToValue={(option, val) => option.value === val?.value}
    disablePortal
    clearOnEscape
  />
);

export default OptionAutocomplete;