// focus/src/components/navigation/tabs/Tabs.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Chip,
  Typography,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';

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

  // State untuk swipe offset
  const [offset, setOffset] = useState(0);
  const containerRef = useRef(null);
  const wrapperRef = useRef(null);
  const [maxOffset, setMaxOffset] = useState(0);
  const touchRef = useRef({ startX: 0, currentX: 0, isDragging: false, currentOffset: 0 });

  // Hitung max offset berdasarkan lebar container dan wrapper
  useEffect(() => {
    const updateMaxOffset = () => {
      if (containerRef.current && wrapperRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const wrapperWidth = wrapperRef.current.scrollWidth;
        const max = Math.max(0, wrapperWidth - containerWidth);
        setMaxOffset(max);
        // Jika offset melebihi max, reset ke max
        setOffset((prev) => Math.min(prev, max));
      }
    };

    updateMaxOffset();
    window.addEventListener('resize', updateMaxOffset);

    return () => {
      window.removeEventListener('resize', updateMaxOffset);
    };
  }, [tabs]);

  // Reset offset saat tabs berubah (misal tab baru muncul)
  useEffect(() => {
    setOffset(0);
    touchRef.current.currentOffset = 0;
  }, [tabs]);

  const handleTabClick = (tab, index) => {
    if (onChange) {
      onChange(tab, index);
    }
  };

  const getChipColor = (tab, index) => {
    const isActive = value === tab.id_aktivitas || value === index;
    return isActive ? color : 'default';
  };

  const getChipVariant = (tab, index) => {
    const isActive = value === tab.id_aktivitas || value === index;
    return isActive ? 'filled' : 'outlined';
  };

  const renderChip = (tab, index) => {
    const isActive = value === tab.id_aktivitas || value === index;
    const isHovered = hoveredIndex === index;
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
          height: '32px',
          px: 1,
          marginRight: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s ease-in-out',
          transform: isActive || isHovered ? 'scale(1.05)' : 'scale(1)',
          fontWeight: isActive ? 'bold' : 'normal',
          flexShrink: 0,
          '&:hover': {
            transform: 'scale(1.08)',
            boxShadow: theme.shadows[2],
          },
          ...(isActive && {
            boxShadow: theme.shadows[2],
          }),
        }}
      />
    );
  };

  // ===== SWIPE HANDLERS =====
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    touchRef.current.startX = touch.clientX;
    touchRef.current.currentX = touch.clientX;
    touchRef.current.isDragging = true;
  };

  const handleTouchMove = (e) => {
    if (!touchRef.current.isDragging) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchRef.current.startX;
    const currentOffset = touchRef.current.currentOffset || 0;
    let newOffset = currentOffset - deltaX;
    newOffset = Math.max(0, Math.min(maxOffset, newOffset));
    setOffset(newOffset);
    touchRef.current.currentX = touch.clientX;
    e.preventDefault();
  };

  const handleTouchEnd = () => {
    if (!touchRef.current.isDragging) return;
    touchRef.current.isDragging = false;
    touchRef.current.currentOffset = offset;
  };

  // Pasang event listener untuk swipe
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        handleTouchStart(e);
      }
    };
    const onTouchMove = (e) => {
      if (e.touches.length === 1) {
        handleTouchMove(e);
      }
    };
    const onTouchEnd = (e) => {
      handleTouchEnd();
    };

    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd);

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
    };
  }, [maxOffset]);

  // ===== NAVIGASI PANAH =====
  const handleScrollLeft = () => {
    const step = containerRef.current ? containerRef.current.offsetWidth * 0.6 : 100;
    const newOffset = Math.max(0, offset - step);
    setOffset(newOffset);
    touchRef.current.currentOffset = newOffset;
  };

  const handleScrollRight = () => {
    const step = containerRef.current ? containerRef.current.offsetWidth * 0.6 : 100;
    const newOffset = Math.min(maxOffset, offset + step);
    setOffset(newOffset);
    touchRef.current.currentOffset = newOffset;
  };

  // Jika tidak ada tabs
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
      <Box
        ref={containerRef}
        sx={{
          overflow: 'hidden',
          position: 'relative',
          touchAction: 'none', // Nonaktifkan scroll default untuk swipe
        }}
      >
        <Box
          ref={wrapperRef}
          sx={{
            display: 'flex',
            flexWrap: 'nowrap',
            alignItems: 'center',
            py: 1,
            px: 1,
            transform: `translateX(-${offset}px)`,
            transition: touchRef.current.isDragging ? 'none' : 'transform 0.3s ease',
          }}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {tabs.map((tab, index) => (
            <Box
              key={tab.id_aktivitas || index}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              sx={{ flexShrink: 0 }}
            >
              {renderChip(tab, index)}
            </Box>
          ))}
        </Box>

        {/* Tombol navigasi kiri */}
        {maxOffset > 0 && offset > 0 && (
          <IconButton
            size="small"
            onClick={handleScrollLeft}
            sx={{
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              bgcolor: 'rgba(255,255,255,0.85)',
              boxShadow: 1,
              borderRadius: '50%',
              width: 32,
              height: 32,
              zIndex: 2,
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.95)',
                boxShadow: 2,
              },
              display: { xs: 'none', sm: 'flex' }, // hanya tampil di web (non-mobile)
            }}
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
        )}

        {/* Tombol navigasi kanan */}
        {maxOffset > 0 && offset < maxOffset && (
          <IconButton
            size="small"
            onClick={handleScrollRight}
            sx={{
              position: 'absolute',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              bgcolor: 'rgba(255,255,255,0.85)',
              boxShadow: 1,
              borderRadius: '50%',
              width: 32,
              height: 32,
              zIndex: 2,
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.95)',
                boxShadow: 2,
              },
              display: { xs: 'none', sm: 'flex' }, // hanya tampil di web
            }}
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
    </Box>
  );
};

export default Tabs;