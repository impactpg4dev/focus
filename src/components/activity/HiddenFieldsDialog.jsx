// focus/src/components/activity/HiddenFieldsDialog.jsx
import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from '@mui/material';

/**
 * Dialog pengaturan tampilan panel info.
 * Uncheck = sembunyikan field dari panel hijau.
 *
 * Props:
 *  - open
 *  - onClose()
 *  - onSave(newHiddenFieldIds: string[])
 *  - identitasInfoFields: [{ id, label }]
 *  - itemInfoFields:      [{ id, label }]
 *  - hiddenFieldIds:      string[]
 */
const HiddenFieldsDialog = ({
  open,
  onClose,
  onSave,
  identitasInfoFields = [],
  itemInfoFields = [],
  hiddenFieldIds = [],
}) => {
  const [tempHidden, setTempHidden] = useState([]);

  useEffect(() => {
    if (open) setTempHidden([...hiddenFieldIds]);
  }, [open, hiddenFieldIds]);

  const toggle = (id) => {
    setTempHidden(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSave = () => onSave(tempHidden);

  const hasFields = identitasInfoFields.length > 0 || itemInfoFields.length > 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="subtitle1" fontWeight="bold">
          Pengaturan Tampilan
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Uncheck untuk menyembunyikan field dari panel info
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {identitasInfoFields.length > 0 && (
          <>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 1, mb: 0.5, fontWeight: 600 }}
            >
              Data Identitas
            </Typography>
            <FormGroup>
              {identitasInfoFields.map(field => (
                <FormControlLabel
                  key={field.id}
                  control={
                    <Checkbox
                      size="small"
                      checked={!tempHidden.includes(field.id)}
                      onChange={() => toggle(field.id)}
                    />
                  }
                  label={<Typography variant="body2">{field.label}</Typography>}
                />
              ))}
            </FormGroup>
          </>
        )}

        {itemInfoFields.length > 0 && (
          <>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 2, mb: 0.5, fontWeight: 600 }}
            >
              Data Item
            </Typography>
            <FormGroup>
              {itemInfoFields.map(field => (
                <FormControlLabel
                  key={field.id}
                  control={
                    <Checkbox
                      size="small"
                      checked={!tempHidden.includes(field.id)}
                      onChange={() => toggle(field.id)}
                    />
                  }
                  label={<Typography variant="body2">{field.label}</Typography>}
                />
              ))}
            </FormGroup>
          </>
        )}

        {!hasFields && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ py: 2, textAlign: 'center' }}
          >
            Tidak ada field yang bisa diatur
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>
          Batal
        </Button>
        <Button onClick={handleSave} variant="contained" sx={{ textTransform: 'none' }}>
          Simpan
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default HiddenFieldsDialog;