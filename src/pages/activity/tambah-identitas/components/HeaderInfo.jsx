// focus/src/pages/activity/tambah-identitas/components/HeaderInfo.jsx
import React from 'react';
import { Box, Typography, Chip } from '@mui/material';

const HeaderInfo = ({ activityData, daftarAktivitasName, showEditChip }) => (
  <Box
    sx={{
      mb: 2,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}
  >
    <Box>
      <Typography variant="caption" color="text.secondary">
        Aktivitas {activityData?.nama_aktivitas}
      </Typography>
      <Typography variant="subtitle1" fontWeight="bold">
        {activityData?.inisial} / {daftarAktivitasName}
      </Typography>
    </Box>
    {showEditChip && (
      <Chip label="Mode Edit" size="small" color="warning" sx={{ mt: 1 }} />
    )}
  </Box>
);

export default HeaderInfo;