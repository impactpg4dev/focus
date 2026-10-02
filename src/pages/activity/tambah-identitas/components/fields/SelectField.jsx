// focus/src/pages/activity/tambah-identitas/components/fields/SelectField.jsx
import React from 'react';
import { isLokasiField, isAktivitasField } from '../../utils/fieldUtils';
import AktivitasAutocomplete from './AktivitasAutocomplete';
import LokasiAutocomplete from './LokasiAutocomplete';
import OptionAutocomplete from './OptionAutocomplete';

const SelectField = ({
  field,
  value,
  isRequired,
  onChange,
  optionsMap,
  lokasiOptions,
  loadingLokasi,
}) => {
  if (isAktivitasField(field)) {
    return (
      <AktivitasAutocomplete
        field={field}
        value={value}
        isRequired={isRequired}
        onChange={onChange}
      />
    );
  }

  if (isLokasiField(field)) {
    return (
      <LokasiAutocomplete
        field={field}
        value={value}
        isRequired={isRequired}
        onChange={onChange}
        lokasiOptions={lokasiOptions}
        loadingLokasi={loadingLokasi}
      />
    );
  }

  const fieldOptions = optionsMap[field.id_identitas_aktivitas] || [];
  return (
    <OptionAutocomplete
      field={field}
      value={value}
      isRequired={isRequired}
      onChange={onChange}
      options={fieldOptions}
    />
  );
};

export default SelectField;