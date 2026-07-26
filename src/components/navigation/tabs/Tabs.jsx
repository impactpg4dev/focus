// focus/src/components/navigation/tabs/Tabs.jsx
import React, { useState } from 'react';
import {
  Box,
  Chip,
  Stack,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';

const Tabs = ({
  tabs = [],
  value,
  onChange,
  variant = 'scrollable',
  color = 'primary',
  size = 'medium',
  sx = {},
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const handleTabClick = (tab, index) => {
    if (onChange) {
      onChange(tab, index);
    }
  };

  const getChipColor = (tab, index) => {
    const isActive = value === tab.id_aktivitas || value === index;
    if (isActive) {
      return color;
    }
    return 'default';
  };

  const getChipVariant = (tab, index) => {
    const isActive = value === tab.id_aktivitas || value === index;
    if (isActive) {
      return 'filled';
    }
    return 'outlined';
  };

  const renderChip = (tab, index) => {
    const isActive = value === tab.id_aktivitas || value === index;
    const isHovered = hoveredIndex === index;

    // Ambil inisial dari data
    const initial = tab.inisial || tab.initial || tab.nama_aktivitas?.[0] || '?';

    return (
      <Chip
        key={tab.id_aktivitas || index}
        label={initial}
        onClick={() => handleTabClick(tab, index)}
        color={getChipColor(tab, index)}
        variant={getChipVariant(tab, index)}
        size={isMobile ? 'small' : size}
        sx={{
          height:'32px',
          px:1,
          marginRight:'4px',
          cursor: 'pointer',
          transition: 'all 0.2s ease-in-out',
          transform: isActive || isHovered ? 'scale(1.05)' : 'scale(1)',
          fontWeight: isActive ? 'bold' : 'normal',
          '&:hover': {
            transform: 'scale(1.08)',
            boxShadow: theme.shadows[2],
          },
          ...(isActive && {
            boxShadow: theme.shadows[2],
          }),
          ...sx,
        }}
      />
    );
  };

  // Jika tidak ada tabs, tampilkan placeholder
  if (!tabs || tabs.length === 0) {
    return (
      <Box
        sx={{
          p: 2,
          borderRadius: 2,
          bgcolor: 'background.paper',
          border: '1px dashed',
          borderColor: 'divider',
          ...sx,
        }}
      >
        <Typography variant="body2" color="text.secondary" align="center">
          Belum ada aktivitas tersedia
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ ...sx }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          overflowX: 'auto',
          overflowY: 'hidden',
          flexWrap: variant === 'fullWidth' ? 'wrap' : 'nowrap',
          justifyContent: variant === 'fullWidth' ? 'center' : 'flex-start',
          py: 1,
          px: 1,
          '&::-webkit-scrollbar': {
            height: 4,
          },
          '&::-webkit-scrollbar-track': {
            bgcolor: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'divider',
            borderRadius: 2,
          },
        }}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {tabs.map((tab, index) => (
          <Box
            key={tab.id_aktivitas || index}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            sx={{
              flexShrink: 0,
            }}
          >
            {renderChip(tab, index)}
          </Box>
        ))}
      </Stack>
    </Box>
  );
};

export default Tabs;