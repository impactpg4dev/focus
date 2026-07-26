// focus/src/pages/activity/buat-laporan/diseases-survey/index.js
import { ref, get, child } from 'firebase/database';
import { database } from '../../../../config/firebase';

/**
 * Menghitung daftar minggu untuk header tabel
 * @param {number} weekPengamatan - Minggu pengamatan (1-52)
 * @param {number} count - Jumlah minggu yang dibutuhkan (default 18)
 * @returns {string[]} Array of week numbers in format "WK {number}"
 */
const generateWeekHeaders = (weekPengamatan, count = 18) => {
  const weeks = [];
  let currentWeek = parseInt(weekPengamatan) || 1;
  
  for (let i = 0; i < count; i++) {
    let weekNum = currentWeek - i;
    if (weekNum <= 0) {
      weekNum = 52 + weekNum;
    }
    weeks.push(`WK ${weekNum}`);
  }
  return weeks;
};

/**
 * Format tanggal dari YYYY-MM-DD ke DD-MM-YYYY
 */
const formatDate = (dateString) => {
  if (!dateString || dateString === '-') return '-';
  try {
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) return dateString;
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}-${month}-${year}`;
    }
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    }
    return dateString;
  } catch (e) {
    return dateString;
  }
};

export const generateDiseasesSurveyReport = async (params) => {
  const { dataIdentitasId, daftarAktivitasId, activityData, template, identitasValues } = params;

  if (!template) {
    throw new Error('Template HTML tidak disediakan.');
  }

  const dbRef = ref(database);

  // --- 1. Ambil data lokasi untuk mapping ID -> nama lokasi ---
  const lokasiSnapshot = await get(child(dbRef, 'tb_status_lokasi'));
  const lokasiData = lokasiSnapshot.val() || {};
  const lokasiMap = {};
  Object.values(lokasiData).forEach(item => {
    if (item.id_lokasi) {
      lokasiMap[item.id_lokasi] = item.lokasi || item.id_lokasi;
    }
  });

  // --- 2. Inisialisasi identitasMap dengan identitasValues dari navigation state ---
  const identitasMap = {};
  if (identitasValues) {
    const internalFields = ['id', 'pelakuId', 'pelakuName', 'createdAt', 'status', 'statusName', 'catatanRevisi'];
    for (const [key, value] of Object.entries(identitasValues)) {
      if (!internalFields.includes(key)) {
        identitasMap[key] = value;
      }
    }
  }

  // --- 3. Ambil identitas values dari database (timpa atau tambahkan) ---
  const valuesSnapshot = await get(child(dbRef, 'dtb_data_identitas_values'));
  const valuesData = valuesSnapshot.val() || {};
  if (valuesData) {
    const identitasSnapshot = await get(child(dbRef, 'dtb_identitas_aktivitas'));
    const identitasFields = identitasSnapshot.val() || {};
    const fieldMap = {};
    Object.values(identitasFields).forEach(f => {
      fieldMap[f.id_identitas_aktivitas] = f;
    });
    Object.values(valuesData)
      .filter(v => v.data_identitas_aktivitas_id === dataIdentitasId)
      .forEach(v => {
        const field = fieldMap[v.identitas_aktivitas_id];
        const label = field?.label || v.identitas_aktivitas_id;
        let value = v.value_text;
        if (field?.nama_identitas === 'lokasi' || field?.label === 'Lokasi') {
          value = lokasiMap[value] || value;
        }
        identitasMap[label] = value;
      });
  }

  // --- 4. Ambil data item (untuk Plot, Ancakan, Losses) ---
  const itemSnapshot = await get(child(dbRef, 'dtb_data_item_aktivitas'));
  const itemData = itemSnapshot.val() || {};
  
  const itemValuesSnapshot = await get(child(dbRef, 'dtb_data_item_values'));
  const itemValuesData = itemValuesSnapshot.val() || {};
  
  const itemFieldsSnapshot = await get(child(dbRef, 'dtb_item_aktivitas'));
  const itemFieldsData = itemFieldsSnapshot.val() || {};
  const itemFieldMap = {};
  Object.values(itemFieldsData).forEach(f => {
    itemFieldMap[f.id_item_aktivitas] = f;
  });

  // --- 5. Ambil detail item & values (untuk Unshooting, 0-17, NR, Total) ---
  const detailSnapshot = await get(child(dbRef, 'dtb_data_detail_item_aktivitas'));
  const detailData = detailSnapshot.val() || {};
  
  const detailFieldsSnapshot = await get(child(dbRef, 'dtb_detail_item_aktivitas'));
  const detailFieldsData = detailFieldsSnapshot.val() || {};
  const detailFieldMap = {};
  Object.values(detailFieldsData).forEach(f => {
    detailFieldMap[f.id_detail_item_aktivitas] = f;
  });
  
  const detailValuesSnapshot = await get(child(dbRef, 'dtb_data_detail_item_values'));
  const detailValuesData = detailValuesSnapshot.val() || {};

  // --- 6. Susun data per baris (per data_item_aktivitas dan per detail) ---
  const rows = [];
  
  // Filter item yang aktif dan sesuai dengan dataIdentitasId
  const activeItems = Object.values(itemData)
    .filter(item => item.data_identitas_aktivitas_id === dataIdentitasId && item.is_active === true);
  
  for (const item of activeItems) {
    const itemId = item.id_data_item_aktivitas;
    
    // Ambil nilai item (Plot, Ancakan, Losses)
    const itemVals = Object.values(itemValuesData)
      .filter(v => v.data_item_aktivitas_id === itemId);
    
    const baseRow = {};
    itemVals.forEach(v => {
      const field = itemFieldMap[v.item_aktivitas_id];
      const label = field?.label || v.item_aktivitas_id;
      baseRow[label] = v.value_text || '-';
    });
    
    // Ambil semua detail untuk item ini
    const details = Object.values(detailData)
      .filter(d => d.data_item_aktivitas_id === itemId && d.is_active === true);
    
    // Jika tidak ada detail, buat satu baris dengan nilai '-' untuk semua kolom detail
    if (details.length === 0) {
      const rowData = { ...baseRow };
      const detailLabels = ['Unshooting', '0','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','No Ribbon','Total'];
      detailLabels.forEach(label => { rowData[label] = '-'; });
      rows.push(rowData);
    } else {
      // Untuk setiap detail, buat satu baris
      for (const detail of details) {
        const detailId = detail.id_data_detail_item_aktivitas;
        const detailVals = Object.values(detailValuesData)
          .filter(v => v.data_detail_item_aktivitas_id === detailId);
        
        const rowData = { ...baseRow };
        detailVals.forEach(v => {
          const field = detailFieldMap[v.detail_item_aktivitas_id];
          const label = field?.label || v.detail_item_aktivitas_id;
          rowData[label] = v.value_text || '-';
        });
        // Pastikan semua kolom detail ada, set '-' jika tidak
        const detailLabels = ['Unshooting', '0','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','No Ribbon','Total'];
        detailLabels.forEach(label => {
          if (!rowData[label] || rowData[label] === '') rowData[label] = '-';
        });
        rows.push(rowData);
      }
    }
  }

  // --- 6.5 Tambahkan baris total untuk kelompok Losses yang sama ---
  // Kelompokkan berdasarkan nilai Losses
  const groupedByLosses = {};
  rows.forEach(row => {
    const losses = row['Losses'] || '-';
    if (!groupedByLosses[losses]) groupedByLosses[losses] = [];
    groupedByLosses[losses].push(row);
  });

  // Kolom numerik yang akan dijumlahkan (dari Unshooting sampai Total)
  const numericColumns = ['Unshooting', '0','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','No Ribbon','Total'];
  const finalRows = [];

  for (const [losses, groupRows] of Object.entries(groupedByLosses)) {
    // Tambahkan semua baris asli dari grup
    groupRows.forEach(row => finalRows.push(row));

    // Jika grup memiliki lebih dari 1 baris, tambahkan baris total
    if (groupRows.length > 1) {
      const totalRow = {
        'Plot': 'Total',
        'Ancakan': '',
        'Losses': losses,
      };
      numericColumns.forEach(col => {
        let sum = 0;
        groupRows.forEach(row => {
          const val = row[col];
          if (val !== undefined && val !== null && val !== '-') {
            const num = parseFloat(val);
            if (!isNaN(num)) sum += num;
          }
        });
        totalRow[col] = sum.toString();
      });
      finalRows.push(totalRow);
    }
  }

  // Ganti rows dengan finalRows yang sudah ditambah baris total
  rows.splice(0, rows.length, ...finalRows);

  // ================================================================
  // --- 7. Ambil data pengamat dan mandor (termasuk signature) ---
  // ================================================================
  
  // --- 7a. Ambil data identitas utama untuk pelaku_id dan workflow_id ---
  const identitasUtamaSnapshot = await get(child(dbRef, 'dtb_data_identitas_aktivitas'));
  const identitasUtamaData = identitasUtamaSnapshot.val() || {};
  let pelakuId = '';
  let workflowId = '';
  for (const key in identitasUtamaData) {
    if (identitasUtamaData[key].id_data_identitas_aktivitas === dataIdentitasId) {
      pelakuId = identitasUtamaData[key].pelaku_id || '';
      workflowId = identitasUtamaData[key].current_workflow_approval_id || '';
      break;
    }
  }
  if (!pelakuId && identitasValues && identitasValues.pelakuId) {
    pelakuId = identitasValues.pelakuId;
  }

  // --- 7b. Ambil semua user untuk mapping ---
  const usersSnapshot = await get(child(dbRef, 'users'));
  const usersData = usersSnapshot.val() || {};
  const getUserData = (uid) => {
    if (!uid) return null;
    for (const key in usersData) {
      if (usersData[key].uid === uid) {
        return usersData[key];
      }
    }
    return null;
  };

  // --- 7c. Cari mandor dari workflow approval steps ---
  let mandorId = '';
  let mandorName = '-';
  let signatureMandor = '';

  if (workflowId) {
    // Ambil semua step aktif dari workflow ini
    const stepsSnapshot = await get(child(dbRef, 'dtb_workflow_approval_steps'));
    const stepsData = stepsSnapshot.val() || {};
    const steps = Object.values(stepsData)
      .filter(step => step.workflow_approval_id === workflowId && step.is_active === true)
      .sort((a, b) => a.urutan - b.urutan);

    if (steps.length > 0) {
      // Kumpulkan semua assigned_user_ids dari semua step
      const allAssignedUserIds = new Set();
      for (const step of steps) {
        let assignedUsers = step.assigned_user_ids;
        if (assignedUsers && typeof assignedUsers === 'object' && !Array.isArray(assignedUsers)) {
          assignedUsers = Object.values(assignedUsers);
        }
        if (Array.isArray(assignedUsers)) {
          assignedUsers.forEach(uid => allAssignedUserIds.add(uid));
        }
      }

      // Ambil data posisi untuk mapping id_jabatan -> nama_jabatan
      const positionSnapshot = await get(child(dbRef, 'u_position'));
      const positionData = positionSnapshot.val() || {};
      const positionMap = {};
      Object.values(positionData).forEach(pos => {
        if (pos.id_jabatan) {
          positionMap[pos.id_jabatan] = pos.nama_jabatan || '';
        }
      });

      // Cari user dengan jabatan "Mandor" (case insensitive)
      let foundMandor = null;
      for (const uid of allAssignedUserIds) {
        const user = getUserData(uid);
        if (user && user.id_jabatan) {
          const jabatanName = positionMap[user.id_jabatan] || '';
          if (jabatanName.toLowerCase() === 'mandor') {
            foundMandor = user;
            break;
          }
        }
      }

      if (foundMandor) {
        mandorId = foundMandor.uid;
        mandorName = foundMandor.name || mandorId;
        signatureMandor = foundMandor.signature || '';
      } else {
        // Fallback: ambil user dari step pertama
        const firstStep = steps[0];
        let assignedUsers = firstStep.assigned_user_ids;
        if (assignedUsers && typeof assignedUsers === 'object' && !Array.isArray(assignedUsers)) {
          assignedUsers = Object.values(assignedUsers);
        }
        if (Array.isArray(assignedUsers) && assignedUsers.length > 0) {
          const uid = assignedUsers[0];
          const user = getUserData(uid);
          if (user) {
            mandorId = uid;
            mandorName = user.name || uid;
            signatureMandor = user.signature || '';
          }
        }
      }
    }
  }

  // --- 7d. Ambil data pengamat (pelaku) ---
  const userPengamat = getUserData(pelakuId);
  const pengamatName = userPengamat?.name || pelakuId || '-';
  const signaturePengamat = userPengamat?.signature || '';

  // --- 8. Siapkan data untuk template ---
  const rawTanggalPengamatan = identitasMap['Tanggal Pengamatan'] || '-';
  const formattedTanggalPengamatan = formatDate(rawTanggalPengamatan);
  
  const weekPengamatan = identitasMap['Week Pengamatan'] || '1';
  const weekHeaders = generateWeekHeaders(weekPengamatan, 18);

  const data = {
    blok: identitasMap['Lokasi'] || '-',
    aktivitas: identitasMap['Aktivitas'] || activityData?.nama_aktivitas || '-',
    tanggalPengamatan: formattedTanggalPengamatan,
    weekPengamatan: weekPengamatan,
    pengamat: pengamatName,
    mandor: mandorName,
    namaPengamat: pengamatName,
    namaMandor: mandorName,
    rows: rows,
    weekHeaders: weekHeaders,
    jtbde: '-',
    jtbdet: '-',
    jmml: '-',
    jmmlt: '-',
    par: '-',
    part: '-',
    signaturePengamat,
    signatureMandor,
  };

  // --- 9. Generate HTML ---
  return generateHTML(template, data);
};

/**
 * Fungsi untuk mengganti placeholder di template HTML
 */
function generateHTML(template, data) {
  let html = template;

  // --- Tambahkan <base> tag di head agar semua URL relatif (gambar) di-resolve terhadap origin aplikasi ---
  const baseTag = `<base href="${window.location.origin}/">`;
  html = html.replace('<head>', `<head>${baseTag}`);

  const setElementContent = (id, content) => {
    const regex = new RegExp(`(<[^>]*\\s+id=["']${id}["'][^>]*>)([\\s\\S]*?)(<\\/[^>]+>)`, 'gi');
    html = html.replace(regex, `$1${content}$3`);
  };

  setElementContent('blok', data.blok);
  setElementContent('aktivitas', data.aktivitas);
  setElementContent('tanggal-pengamatan', data.tanggalPengamatan);
  setElementContent('week-pengamatan', data.weekPengamatan);
  setElementContent('pengamat', data.pengamat);
  setElementContent('mandor', data.mandor);
  setElementContent('nama-pengamat', data.namaPengamat);
  setElementContent('nama-mandor', data.namaMandor);

  // --- Tanda tangan ---
  const setSignatureContent = (id, signatureUrl) => {
    let content = '';
    if (signatureUrl && signatureUrl.trim() !== '') {
      content = `<img src="${signatureUrl}" alt="Tanda Tangan" style="max-height:60px; max-width:200px;" />`;
    } else {
      content = 'Tanda tangan tidak tersedia';
    }
    setElementContent(id, content);
  };
  setSignatureContent('signature-pengamat', data.signaturePengamat);
  setSignatureContent('signature-mandor', data.signatureMandor);

  // --- Ganti header WK... di tabel ---
  let wkReplacementIndex = 0;
  html = html.replace(/WK\.\.\./g, function() {
    if (wkReplacementIndex < data.weekHeaders.length) {
      return data.weekHeaders[wkReplacementIndex++];
    }
    return 'WK...';
  });

  // --- Tabel rows ---
  const columns = ['Plot', 'Ancakan', 'Losses', 'Unshooting', '0','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','No Ribbon','Total'];
  let tbodyRows = '';
  data.rows.forEach(row => {
    const isTotal = row['Plot'] === 'Total';
    let rowHtml = `<tr  class="value-data-row"${isTotal ? ' style="background-color:#f7f7f7;"' : ''}>`;
    columns.forEach(col => {
      const value = row[col] !== undefined && row[col] !== null ? row[col] : '-';
      rowHtml += `<td>${value}</td>`;
    });
    rowHtml += '</tr>';
    tbodyRows += rowHtml;
  });
  html = html.replace(/<tbody id="data-body">([\s\S]*?)<\/tbody>/, `<tbody id="data-body">${tbodyRows}</tbody>`);

  // --- Statistik ---
  const statIds = ['jtbde', 'jtbdet', 'jmml', 'jmmlt', 'par', 'part'];
  statIds.forEach(id => {
    const value = data[id] || '-';
    const regex = new RegExp(`(<td[^>]*id=["']${id}["'][^>]*>)([\\s\\S]*?)(<\\/td>)`, 'gi');
    html = html.replace(regex, `$1${value}$3`);
  });

  return html;
}