// focus/src/components/feedback/dialog/Dialog.jsx
import React from 'react';
import {
  Dialog as MuiDialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Slide,
} from '@mui/material';
import {
  Close as CloseIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

// Slide transition from bottom
const SlideTransition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const Dialog = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  variant = 'warning',
  icon,
  confirmColor = 'primary',
  cancelColor = 'inherit',
  fullWidth = true,
  maxWidth = 'xs',
  showCloseButton = true,
  hideConfirmButton = false,
  hideCancelButton = false,
  loading = false,
  children,
}) => {
  const getIcon = () => {
    if (icon) return icon;
    
    switch (variant) {
      case 'warning':
        return <WarningIcon color="warning" sx={{ fontSize: 48 }} />;
      case 'error':
        return <ErrorIcon color="error" sx={{ fontSize: 48 }} />;
      case 'success':
        return <CheckCircleIcon color="success" sx={{ fontSize: 48 }} />;
      case 'info':
      default:
        return <InfoIcon color="info" sx={{ fontSize: 48 }} />;
    }
  };

  return (
    <MuiDialog
      open={open}
      onClose={onClose}
      fullWidth={fullWidth}
      maxWidth={maxWidth}
      slots={{
        transition: SlideTransition,
      }}
      keepMounted
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 1,
          m: 2,
          width: '100%',
        },
      }}
      sx={{
        '& .MuiDialog-container': {
          alignItems: 'flex-end',
        },
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getIcon()}
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
          </Box>
          {showCloseButton && (
            <IconButton
              aria-label="close"
              onClick={onClose}
              sx={{
                color: 'text.secondary',
              }}
            >
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {message && (
          <DialogContentText sx={{ color: 'text.primary', mb: 1 }}>
            {message}
          </DialogContentText>
        )}
        {children}
      </DialogContent>
      
      <DialogActions sx={{ p: 2, pt: 1, gap: 1 }}>
        {!hideCancelButton && (
          <Button
            onClick={onClose}
            variant="outlined"
            color={cancelColor}
            disabled={loading}
            sx={{ borderRadius: 2, textTransform: 'none', flex: 1 }}
          >
            {cancelText}
          </Button>
        )}
        {!hideConfirmButton && onConfirm && (
          <Button
            onClick={onConfirm}
            variant="contained"
            color={confirmColor}
            disabled={loading}
            sx={{ borderRadius: 2, textTransform: 'none', flex: 1 }}
          >
            {loading ? 'Memproses...' : confirmText}
          </Button>
        )}
      </DialogActions>
    </MuiDialog>
  );
};

export default Dialog;