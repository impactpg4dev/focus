// focus/src/components/date-pickers/DatePickers.jsx
import React from 'react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { InputAdornment } from '@mui/material';
import { CalendarToday as CalendarTodayIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import 'dayjs/locale/id';

const DatePickers = ({
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  ...props
}) => {
  const maxDate = dayjs();

  // Gunakan locale Indonesia hanya untuk komponen ini
  const localeText = {
    okButtonLabel: 'OK',
    cancelButtonLabel: 'Batal',
    toolbarTitle: 'Pilih Tanggal',
  };

  return (
    <DatePicker
      label={label}
      value={value ? dayjs(value) : null}
      onChange={(newValue) => {
        onChange(newValue ? newValue.format('YYYY-MM-DD') : '');
      }}
      maxDate={maxDate}
      disabled={disabled}
      format="DD/MM/YYYY"
      localeText={localeText}
      slotProps={{
        textField: {
          required,
          fullWidth: true,
          size: 'medium',
          sx: {
            mt: 1,
            '& .MuiOutlinedInput-root': {
              borderRadius: '4px',
            },
          },
          InputProps: {
            endAdornment: (
              <InputAdornment position="end">
                <CalendarTodayIcon />
              </InputAdornment>
            ),
          },
        },
      }}
      {...props}
    />
  );
};

export default DatePickers;