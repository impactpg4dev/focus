// focus/src/pages/fragment/beranda/SearchBar.jsx
import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const SearchBar = () => {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');

  const handleSearch = () => {
    if (searchValue.trim()) {
      navigate('/hasil-pencarian', {
        state: {
          searchQuery: searchValue.trim(),
        },
      });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClear = () => {
    setSearchValue('');
  };

  return (
    <Box sx={{ mb: 2, mx: 1 }}>
      <Paper
        sx={{
          p: '2px 4px',
          display: 'flex',
          alignItems: 'center',
          borderRadius: '4px',
          boxShadow: 1,
        }}
      >
        <IconButton sx={{ p: '10px' }} aria-label="search" disabled>
          <SearchIcon />
        </IconButton>
        <TextField
          fullWidth
          variant="standard"
          placeholder="Cari kode lokasi..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyPress={handleKeyPress}
          InputProps={{
            disableUnderline: true,
            sx: {
              fontSize: '0.875rem',
              py: 1,
            },
          }}
          sx={{
            '& .MuiInputBase-root': {
              '&:before': {
                display: 'none',
              },
              '&:after': {
                display: 'none',
              },
            },
          }}
        />
        {searchValue && (
          <IconButton
            sx={{ p: '10px' }}
            aria-label="clear"
            onClick={handleClear}
          >
            <ClearIcon />
          </IconButton>
        )}
      </Paper>
    </Box>
  );
};

export default SearchBar;