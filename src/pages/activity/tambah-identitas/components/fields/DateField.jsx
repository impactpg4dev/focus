// focus/src/pages/activity/tambah-identitas/components/fields/DateField.jsx
import React from 'react';
import dayjs from 'dayjs';
import { MobileDatePicker } from '@mui/x-date-pickers/MobileDatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

const DateField = ({ field, value, isRequired, onChange }) => {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <MobileDatePicker
        label={field.label}
        value={value ? dayjs(value) : null}
        onChange={(newValue) => onChange(field.id_identitas_aktivitas, newValue, field)}
        format="DD/MM/YYYY"
        disableFuture
        slotProps={{
          textField: {
            fullWidth: true,
            required: isRequired,
            size: 'medium',
            sx: { mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '4px' } },
          },
          dialog: {
            sx: {
              '& .MuiDialog-paper': {
                margin: '0 auto',
                width: '100%',
                maxWidth: '548px',
                maxHeight: '80vh',
                borderRadius: '12px 12px 0 0',
                position: 'fixed',
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                animation: 'slideUp 0.3s ease-out',
                overflow: 'hidden',
              },
              '& .MuiDialog-container': {
                alignItems: 'flex-end',
                justifyContent: 'center',
              },
              '& .MuiBackdrop-root': {
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
              },
              '& .MuiDialog-root': {
                '& .MuiBackdrop-root': {
                  pointerEvents: 'none',
                },
              },
            },
          },
          toolbar: {
            sx: {
              backgroundColor: (theme) => theme.palette.primary.main,
              color: 'white',
              '& .MuiTypography-root': { color: 'white' },
            },
          },
          actionBar: {
            sx: {
              padding: '8px 16px',
              borderTop: '1px solid',
              borderColor: 'divider',
            },
          },
        }}
        closeOnSelect={false}
        views={['year', 'month', 'day']}
        onClose={(reason) => {
          if (reason === 'cancel' || reason === 'accept') return;
          if (reason === 'escape') return;
          return false;
        }}
      />
    </LocalizationProvider>
  );
};

export default DateField;