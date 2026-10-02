// focus/src/pages/activity/tambah-identitas/components/fields/RadioField.jsx
import React from 'react';
import {
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';

const RadioField = ({ field, value, onChange }) => (
  <FormControl component="fieldset" sx={{ mt: 1 }}>
    <FormLabel component="legend">{field.label}</FormLabel>
    <RadioGroup
      value={value}
      onChange={(e) => onChange(field.id_identitas_aktivitas, e.target.value)}
    >
      <FormControlLabel value="option1" control={<Radio />} label="Opsi 1" />
      <FormControlLabel value="option2" control={<Radio />} label="Opsi 2" />
    </RadioGroup>
  </FormControl>
);

export default RadioField;