// focus/src/pages/activity/tambah-identitas/components/fields/AktivitasAutocomplete.jsx
import React from 'react';
import { Autocomplete, TextField, Typography } from '@mui/material';
import { aktivitasOptions } from '../../constants';

const AktivitasAutocomplete = ({ field, value, isRequired, onChange }) => (
  <Autocomplete
    fullWidth
    options={aktivitasOptions}
    getOptionLabel={(option) => option.label || ''}
    value={aktivitasOptions.find((opt) => opt.value === value) || null}
    onChange={(event, newValue) => {
      onChange(field.id_identitas_aktivitas, newValue ? newValue.value : '');
    }}
    size="medium"
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

export default AktivitasAutocomplete;