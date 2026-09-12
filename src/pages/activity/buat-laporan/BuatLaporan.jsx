// focus/src/pages/activity/buat-laporan/BuatLaporan.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  CircularProgress,
  Alert,
  Snackbar,
  Button,
  IconButton,
  Typography,
  Popover,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  RestartAlt,
  Print,
  Download,
  PictureAsPdf,
  Image,
} from '@mui/icons-material';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import AppBar from '../../../components/surface/app-bar/AppBar';

// Import generator
import { generateDiseasesSurveyReport } from './diseases-survey';
import { generateSanitasiAreaFruitReceiverReport } from './sanitasi/area-fruit-receiver';

// Mapping template file name to actual file
// Gunakan key yang sama dengan nama aktivitas yang dikirim dari navigasi
const templateFileMap = {
  'Diseases Survey': 'diseases_survey.html',
  'Pengamatan': 'diseases_survey.html',
  'Area Fruit Receiver': 'sanitasi_area_fruit_receiver.html', // key harus sesuai dengan activityData.nama_aktivitas
  'Sanitasi PH': 'sanitasi_area_fruit_receiver.html', // fallback jika ada
};

const generatorMap = {
  'Diseases Survey': generateDiseasesSurveyReport,
  'Pengamatan': generateDiseasesSurveyReport,
  'Area Fruit Receiver': generateSanitasiAreaFruitReceiverReport,
  'Sanitasi PH': generateSanitasiAreaFruitReceiverReport,
};

// Helper untuk format timestamp
const getTimestamp = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}_${hh}${min}${ss}`;
};

const BuatLaporan = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [scale, setScale] = useState(1);
  const iframeRef = useRef(null);

  const [anchorEl, setAnchorEl] = useState(null);
  const openPopover = Boolean(anchorEl);

  const navigationState = location.state || {};
  const {
    dataIdentitasId,
    daftarAktivitasId,
    activityData,
    identitasValues,
  } = navigationState;

  useEffect(() => {
    if (!dataIdentitasId || !daftarAktivitasId || !activityData) {
      setError('Data tidak lengkap.');
      setTimeout(() => navigate(-1), 2000);
      return;
    }
    generateReport();
  }, [dataIdentitasId, daftarAktivitasId, activityData]);

  const generateReport = async () => {
    setLoading(true);
    setError('');
    try {
      // --- Logging untuk debug ---
      console.log('=== BuatLaporan: generateReport ===');
      console.log('activityData:', activityData);
      
      let activityKey = activityData.nama_aktivitas;
      console.log('activityKey:', activityKey);
      
      // Cari generator berdasarkan activityKey atau inisial
      let generator = generatorMap[activityKey];
      if (!generator && activityData.inisial) {
        generator = generatorMap[activityData.inisial];
        console.log('Menggunakan generator berdasarkan inisial:', activityData.inisial);
      }
      if (!generator) {
        throw new Error(`Generator untuk aktivitas "${activityKey}" belum tersedia.`);
      }

      // Cari template file name
      let templateKey = activityKey;
      if (!templateFileMap[templateKey] && activityData.inisial) {
        templateKey = activityData.inisial;
        console.log('Menggunakan templateKey berdasarkan inisial:', templateKey);
      }
      const templateFileName = templateFileMap[templateKey];
      console.log('templateFileName:', templateFileName);
      
      if (!templateFileName) {
        throw new Error(`Template untuk aktivitas "${templateKey}" belum didukung.`);
      }

      // Muat template dari public/assets
      let template;
      try {
        const response = await fetch(`/assets/${templateFileName}`);
        console.log('Fetch response status:', response.status);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        }
        template = await response.text();
        console.log('Template loaded, length:', template.length);
      } catch (err) {
        throw new Error(`Gagal memuat template file: ${templateFileName} - ${err.message}`);
      }

      // Jalankan generator
      const html = await generator({
        dataIdentitasId,
        daftarAktivitasId,
        activityData,
        identitasValues,
        template,
      });
      console.log('HTML generated, length:', html.length);

      // Tambahkan CSS print agar tidak terpotong 2 halaman
      const printStyles = `
        <style>
          @page {
            size: landscape;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
          }
          .container {
            width: 1123px;
            height: auto;
            min-width: 1123px;
            min-height: 794px;
            padding: 40px;
            box-sizing: border-box;
            overflow: hidden;
            page-break-after: avoid;
            page-break-inside: avoid;
          }
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
            .container {
              width: 100%;
              height: 100%;
              min-width: 100%;
              min-height: 100%;
              padding: 40px;
              box-sizing: border-box;
              overflow: hidden;
              page-break-after: avoid;
              page-break-inside: avoid;
            }
          }
        </style>
      `;

      const modifiedHtml = html.replace('</head>', `${printStyles}</head>`);

      setHtmlContent(modifiedHtml);
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Gagal membuat laporan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => navigate(-1);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 2.0));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.3));
  const handleResetZoom = () => setScale(0.7);

  const handlePrint = () => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow.print();
    }
  };

  const handleDownloadClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClosePopover = () => {
    setAnchorEl(null);
  };

  // Fungsi capture yang lebih robust
  const captureIframe = async () => {
    if (!iframeRef.current) return null;
    const iframe = iframeRef.current;
    // Tunggu iframe selesai load
    await new Promise((resolve) => {
      if (iframe.contentDocument.readyState === 'complete') {
        resolve();
      } else {
        iframe.addEventListener('load', resolve);
      }
    });

    const doc = iframe.contentDocument;
    const container = doc.querySelector('.container');
    if (!container) {
      // Fallback: capture body
      const body = doc.body;
      const canvas = await html2canvas(body, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: body.scrollWidth,
        height: body.scrollHeight,
      });
      return canvas;
    }

    // Capture container dengan ukuran sebenarnya
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      width: container.scrollWidth,
      height: container.scrollHeight,
    });
    return canvas;
  };

  // Download PDF
  const handleDownloadPDF = async () => {
    handleClosePopover();
    try {
      const canvas = await captureIframe();
      if (!canvas) return;
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      const timestamp = getTimestamp();
      pdf.save(`report_area_fruit_receiver_${timestamp}.pdf`);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      setError('Gagal mengunduh PDF: ' + err.message);
    }
  };

  // Download Gambar
  const handleDownloadImage = async () => {
    handleClosePopover();
    try {
      const canvas = await captureIframe();
      if (!canvas) return;
      const link = document.createElement('a');
      const timestamp = getTimestamp();
      link.download = `report_area_fruit_receiver_${timestamp}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Error downloading image:', err);
      setError('Gagal mengunduh gambar: ' + err.message);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar title="Buat Laporan" showBackButton onBackClick={handleBack} showLogout={false} />

      <Container maxWidth="sm" sx={{ px: 0 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          p: 1,
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        <IconButton onClick={handleZoomOut} size="small" title="Zoom Out">
          <ZoomOut />
        </IconButton>
        <Typography variant="body2" sx={{ minWidth: 60, textAlign: 'center' }}>
          {Math.round(scale * 100)}%
        </Typography>
        <IconButton onClick={handleZoomIn} size="small" title="Zoom In">
          <ZoomIn />
        </IconButton>
        <IconButton onClick={handleResetZoom} size="small" title="Reset Zoom">
          <RestartAlt />
        </IconButton>
        <Button variant="contained" size="small" startIcon={<Print />} onClick={handlePrint} sx={{ ml: 2 }}>
          Cetak
        </Button>
        <Button variant="outlined" size="small" startIcon={<Download />} onClick={handleDownloadClick} sx={{ ml: 1 }}>
          Download
        </Button>
      </Box>
      </Container>
      

      <Popover
        open={openPopover}
        anchorEl={anchorEl}
        onClose={handleClosePopover}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <List dense>
          <ListItem button onClick={handleDownloadPDF}>
            <ListItemIcon><PictureAsPdf /></ListItemIcon>
            <ListItemText primary="Download PDF" />
          </ListItem>
          <ListItem button onClick={handleDownloadImage}>
            <ListItemIcon><Image /></ListItemIcon>
            <ListItemText primary="Download Gambar (PNG)" />
          </ListItem>
        </List>
      </Popover>

      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 2,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          bgcolor: '#f5f5f5',
        }}
      >
        {error ? (
          <Container maxWidth="sm" sx={{ mt: 4 }}>
            <Alert severity="error">{error}</Alert>
          </Container>
        ) : (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start',
            }}
          >
            <Box
              sx={{
                width: '1000px',
                height: '100%',
                transform: `scale(${scale})`,
                transformOrigin: 'top center',
                transition: 'transform 0.2s ease',
                bgcolor: 'white',
                boxShadow: 0,
                borderRadius: 1,
                overflow: 'hidden',
              }}
            >
              <iframe
                ref={iframeRef}
                srcDoc={htmlContent}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  overflow: 'auto',
                }}
                title="Laporan"
              />
            </Box>
          </Box>
        )}
      </Box>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
      </Snackbar>
    </Box>
  );
};

export default BuatLaporan;