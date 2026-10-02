// focus/src/pages/activity/tambah-identitas/components/DynamicField.jsx
import React from 'react';
import { isDateField } from '../utils/fieldUtils';
import DateField from './fields/DateField';
import TextField from './fields/TextField';
import NumberField from './fields/NumberField';
import RadioField from './fields/RadioField';
import SelectField from './fields/SelectField';

const DynamicField = ({
  field,
  value,
  optionsMap,
  lokasiOptions,
  loadingLokasi,
  onInputChange,
  onDateChange,
  onNumberChange,
}) => {
  const isRequired = field.is_required === true;

  // 🔥 Gunakan tipe_input date untuk semua field tanggal
  if (isDateField(field)) {
    return (
      <DateField
        field={field}
        value={value}
        isRequired={isRequired}
        onChange={onDateChange}
      />
    );
  }

  switch (field.tipe_input) {
    case 'text':
      return (
        <TextField
          field={field}
          value={value}
          isRequired={isRequired}
          onChange={onInputChange}
        />
      );
    case 'number':
      return (
        <NumberField
          field={field}
          value={value}
          isRequired={isRequired}
          onChange={onNumberChange}
        />
      );
    case 'select':
      return (
        <SelectField
          field={field}
          value={value}
          isRequired={isRequired}
          onChange={onInputChange}
          optionsMap={optionsMap}
          lokasiOptions={lokasiOptions}
          loadingLokasi={loadingLokasi}
        />
      );
    case 'radio':
      return (
        <RadioField
          field={field}
          value={value}
          onChange={onInputChange}
        />
      );
    default:
      return (
        <TextField
          field={field}
          value={value}
          isRequired={isRequired}
          onChange={onInputChange}
        />
      );
  }
};

export default DynamicField;