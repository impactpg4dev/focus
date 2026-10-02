// focus/src/pages/activity/tambah-identitas/components/fields/NumberField.jsx
import React from 'react';
import { TextField } from '@mui/material';

const NumberField = ({ field, value, isRequired, onChange }) => (
  <TextField
    fullWidth
    label={field.label}
    type="number"
    value={value}
    onChange={(e) => onChange(field.id_identitas_aktivitas, e.target.value)}
    required={isRequired}
    size="medium"
    inputProps={{ inputMode: 'numeric', pattern: '[0-9.-]*' }}
    sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '4px' } }}
  />
);

export default NumberField;