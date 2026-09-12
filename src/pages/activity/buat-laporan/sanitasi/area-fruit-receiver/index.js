// focus/src/pages/activity/buat-laporan/sanitasi/area-fruit-receiver/index.js
import { ref, get, child } from 'firebase/database';
import { database } from '../../../../../config/firebase';

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

export const generateSanitasiAreaFruitReceiverReport = async (params) => {
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

  // --- 4. Ambil data item & detail untuk mengisi tabel ---
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

  // --- 5. Ambil detail item & values ---
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

  // --- 6. Ambil data group untuk mengelompokkan item ---
  const groupSnapshot = await get(child(dbRef, 'dtb_group_item_aktivitas'));
  const groupData = groupSnapshot.val() || {};
  const groupMap = {};
  Object.values(groupData).forEach(g => {
    if (g.daftar_aktivitas_id === daftarAktivitasId && g.is_active) {
      groupMap[g.id_group_item_aktivitas] = g;
    }
  });

  // --- 7. Susun data per item (termasuk detail) ---
  const activeItems = Object.values(itemData)
    .filter(item => item.data_identitas_aktivitas_id === dataIdentitasId && item.is_active === true);

  const itemValueMap = {};
  Object.values(itemValuesData).forEach(v => {
    if (!itemValueMap[v.data_item_aktivitas_id]) {
      itemValueMap[v.data_item_aktivitas_id] = {};
    }
    const field = itemFieldMap[v.item_aktivitas_id];
    const label = field?.label || v.item_aktivitas_id;
    itemValueMap[v.data_item_aktivitas_id][label] = v.value_text || '-';
  });

  const detailValueMap = {};
  Object.values(detailData)
    .filter(d => d.is_active)
    .forEach(d => {
      const itemId = d.data_item_aktivitas_id;
      if (!detailValueMap[itemId]) detailValueMap[itemId] = [];
      const detailValues = Object.values(detailValuesData)
        .filter(v => v.data_detail_item_aktivitas_id === d.id_data_detail_item_aktivitas);
      const row = {};
      detailValues.forEach(v => {
        const field = detailFieldMap[v.detail_item_aktivitas_id];
        const label = field?.label || v.detail_item_aktivitas_id;
        row[label] = v.value_text || '-';
      });
      detailValueMap[itemId].push(row);
    });

  // --- 8. Bangun data untuk tabel ---
  const tableData = {
    'Area Fruit Receiver': [],
    'Bak Cuci Buah': [],
  };

  // Cari group id untuk masing-masing
  let groupIdFR = null;
  let groupIdBC = null;
  for (const [gid, g] of Object.entries(groupMap)) {
    const label = g.group_label || g.group_name || '';
    if (label.toLowerCase().includes('area fruit receiver') || label.toLowerCase().includes('fruit receiver')) {
      groupIdFR = gid;
    } else if (label.toLowerCase().includes('bak cuci') || label.toLowerCase().includes('cuci buah')) {
      groupIdBC = gid;
    }
  }

  if (!groupIdFR && !groupIdBC) {
    // Masukkan semua item ke Area Fruit Receiver
    activeItems.forEach(item => {
      const itemId = item.id_data_item_aktivitas;
      const itemVals = itemValueMap[itemId] || {};
      const detailRows = detailValueMap[itemId] || [{}];
      const itemLabel = itemVals['Item'] || itemVals['Nama Item'] || itemVals['Deskripsi'] || '-';
      detailRows.forEach(detail => {
        tableData['Area Fruit Receiver'].push({
          no: tableData['Area Fruit Receiver'].length + 1,
          item: itemLabel,
          shift1: detail['Shift 1'] || detail['S1'] || '-',
          shift2: detail['Shift 2'] || detail['S2'] || '-',
        });
      });
      if (detailRows.length === 0) {
        tableData['Area Fruit Receiver'].push({
          no: tableData['Area Fruit Receiver'].length + 1,
          item: itemLabel,
          shift1: '-',
          shift2: '-',
        });
      }
    });
  } else {
    activeItems.forEach(item => {
      const itemId = item.id_data_item_aktivitas;
      const itemVals = itemValueMap[itemId] || {};
      const detailRows = detailValueMap[itemId] || [{}];
      const itemLabel = itemVals['Item'] || itemVals['Nama Item'] || itemVals['Deskripsi'] || '-';
      const fieldId = Object.keys(itemFieldMap).find(k => itemVals[k] !== undefined);
      const groupId = fieldId ? itemFieldMap[fieldId]?.group_item_aktivitas_id : '';
      const targetTable = groupId === groupIdFR ? 'Area Fruit Receiver' : (groupId === groupIdBC ? 'Bak Cuci Buah' : 'Area Fruit Receiver');
      
      detailRows.forEach(detail => {
        tableData[targetTable].push({
          no: tableData[targetTable].length + 1,
          item: itemLabel,
          shift1: detail['Shift 1'] || detail['S1'] || '-',
          shift2: detail['Shift 2'] || detail['S2'] || '-',
        });
      });
      if (detailRows.length === 0) {
        tableData[targetTable].push({
          no: tableData[targetTable].length + 1,
          item: itemLabel,
          shift1: '-',
          shift2: '-',
        });
      }
    });
  }

  // --- 9. Ambil data pengamat, mandor, kepala seksi ---
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

  const positionSnapshot = await get(child(dbRef, 'u_position'));
  const positionData = positionSnapshot.val() || {};
  const positionMap = {};
  Object.values(positionData).forEach(pos => {
    if (pos.id_jabatan) {
      positionMap[pos.id_jabatan] = pos.nama_jabatan || '';
    }
  });

  let mandorId = '';
  let mandorName = '-';
  let signatureMandor = '';
  let kepalaSeksiId = '';
  let kepalaSeksiName = '-';
  let signatureKepalaSeksi = '';

  if (workflowId) {
    const stepsSnapshot = await get(child(dbRef, 'dtb_workflow_approval_steps'));
    const stepsData = stepsSnapshot.val() || {};
    const steps = Object.values(stepsData)
      .filter(step => step.workflow_approval_id === workflowId && step.is_active === true)
      .sort((a, b) => a.urutan - b.urutan);

    if (steps.length > 0) {
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

      let foundMandor = null;
      let foundKepalaSeksi = null;
      for (const uid of allAssignedUserIds) {
        const user = getUserData(uid);
        if (user && user.id_jabatan) {
          const jabatanName = positionMap[user.id_jabatan] || '';
          if (jabatanName.toLowerCase() === 'mandor' && !foundMandor) {
            foundMandor = user;
          } else if (jabatanName.toLowerCase() === 'kepala seksi' && !foundKepalaSeksi) {
            foundKepalaSeksi = user;
          }
        }
      }

      if (foundMandor) {
        mandorId = foundMandor.uid;
        mandorName = foundMandor.name || mandorId;
        signatureMandor = foundMandor.signature || '';
      } else {
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

      if (foundKepalaSeksi) {
        kepalaSeksiId = foundKepalaSeksi.uid;
        kepalaSeksiName = foundKepalaSeksi.name || kepalaSeksiId;
        signatureKepalaSeksi = foundKepalaSeksi.signature || '';
      }
    }
  }

  const userPetugas = getUserData(pelakuId);
  const petugasName = userPetugas?.name || pelakuId || '-';
  const signaturePetugas = userPetugas?.signature || '';

  // --- 10. Siapkan data untuk template ---
  const rawTanggalPengamatan = identitasMap['Tanggal Pengamatan'] || '-';
  const formattedTanggalPengamatan = formatDate(rawTanggalPengamatan);

  const tableRowsFR = tableData['Area Fruit Receiver'] || [];
  const tableRowsBC = tableData['Bak Cuci Buah'] || [];

  let tbodyFR = '';
  tableRowsFR.forEach(row => {
    tbodyFR += `<tr class="value-data-row">
      <td>${row.no}</td>
      <td>${row.item}</td>
      <td>${row.shift1}</td>
      <td>${row.shift2}</td>
    </tr>`;
  });
  if (tableRowsFR.length === 0) {
    tbodyFR = `<tr><td colspan="4" style="text-align:center; color:#999;">Tidak ada data</td></tr>`;
  }

  let tbodyBC = '';
  tableRowsBC.forEach(row => {
    tbodyBC += `<tr class="value-data-row">
      <td>${row.no}</td>
      <td>${row.item}</td>
      <td>${row.shift1}</td>
      <td>${row.shift2}</td>
    </tr>`;
  });
  if (tableRowsBC.length === 0) {
    tbodyBC = `<tr><td colspan="4" style="text-align:center; color:#999;">Tidak ada data</td></tr>`;
  }

  return generateHTML(template, {
    tanggalPengamatan: formattedTanggalPengamatan,
    petugasName,
    mandorName,
    kepalaSeksiName,
    signaturePetugas,
    signatureMandor,
    signatureKepalaSeksi,
    tbodyFR,
    tbodyBC,
  });
};

function generateHTML(template, data) {
  let html = template;

  const baseTag = `<base href="${window.location.origin}/">`;
  html = html.replace('<head>', `<head>${baseTag}`);

  const setElementContent = (id, content) => {
    const regex = new RegExp(`(<[^>]*\\s+id=["']${id}["'][^>]*>)([\\s\\S]*?)(<\\/[^>]+>)`, 'gi');
    html = html.replace(regex, `$1${content}$3`);
  };

  setElementContent('tanggal-aktivitas', data.tanggalPengamatan);

  // Ganti tbody pertama dan kedua
  const tbodyRegex = /<tbody id="data-body">([\s\S]*?)<\/tbody>/g;
  const matches = html.match(tbodyRegex);
  if (matches && matches.length >= 2) {
    html = html.replace(matches[0], `<tbody id="data-body">${data.tbodyFR}</tbody>`);
    html = html.replace(matches[1], `<tbody id="data-body">${data.tbodyBC}</tbody>`);
  } else {
    html = html.replace(/<tbody id="data-body">([\s\S]*?)<\/tbody>/, `<tbody id="data-body">${data.tbodyFR}</tbody>`);
  }

  setElementContent('signature-petugas', data.signaturePetugas ? `<img src="${data.signaturePetugas}" alt="Tanda Tangan" style="max-height:60px; max-width:200px;" />` : 'Tanda tangan tidak tersedia');
  setElementContent('nama-petugas', data.petugasName);

  setElementContent('signature-mandor', data.signatureMandor ? `<img src="${data.signatureMandor}" alt="Tanda Tangan" style="max-height:60px; max-width:200px;" />` : 'Tanda tangan tidak tersedia');
  setElementContent('nama-mandor', data.mandorName);

  setElementContent('signature-kepala-seksi', data.signatureKepalaSeksi ? `<img src="${data.signatureKepalaSeksi}" alt="Tanda Tangan" style="max-height:60px; max-width:200px;" />` : 'Tanda tangan tidak tersedia');
  setElementContent('kepala-seksi', data.kepalaSeksiName);

  return html;
}