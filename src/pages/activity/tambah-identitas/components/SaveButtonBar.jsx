// focus/src/pages/activity/tambah-identitas/components/SaveButtonBar.jsx
import React from 'react';
import { Box, Button, CircularProgress, Container } from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';

const SaveButtonBar = ({ saving, onSave, label = 'Simpan Identitas' }) => (
  <Container
    maxWidth="sm"
    sx={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      px: 0,
      zIndex: 1000,
    }}
  >
    <Box
      sx={{
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: (theme) => theme.palette.background.paper,
        p: 1.5,
      }}
    >
      <Button
        fullWidth
        variant="contained"
        size="large"
        startIcon={
          saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />
        }
        onClick={onSave}
        disabled={saving}
        sx={{
          borderRadius: '4px',
          textTransform: 'none',
          fontWeight: 600,
          py: 1.5,
        }}
      >
        {saving ? 'Menyimpan...' : label}
      </Button>
    </Box>
  </Container>
);

export default SaveButtonBar;