// focus/src/pages/activity/tambah-identitas/components/fields/TextField.jsx
import React from 'react';
import { TextField as MuiTextField } from '@mui/material';

const TextField = ({ field, value, isRequired, onChange }) => (
  <MuiTextField
    fullWidth
    label={field.label}
    value={value}
    onChange={(e) => onChange(field.id_identitas_aktivitas, e.target.value)}
    required={isRequired}
    size="medium"
    sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '4px' } }}
  />
);

export default TextField;