// src/utils/emailNotifier.js
import { database, ref, get, child } from '../config/firebase';

const BREVO_API_KEY = import.meta.env.VITE_BREVO_API_KEY;
const SENDER_EMAIL = import.meta.env.VITE_BREVO_SENDER_EMAIL;
const SENDER_NAME = import.meta.env.VITE_BREVO_SENDER_NAME || 'Approval System';
const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

// ============================================================
// Kirim 1 email via Brevo REST API
// ============================================================
const sendBrevoEmail = async ({ to, toName, subject, htmlContent }) => {
  if (!BREVO_API_KEY) {
    throw new Error('VITE_BREVO_API_KEY belum di-set di .env');
  }
  if (!SENDER_EMAIL) {
    throw new Error('VITE_BREVO_SENDER_EMAIL belum di-set di .env');
  }

  const response = await fetch(BREVO_ENDPOINT, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      to: [{ email: to, name: toName || to }],
      subject,
      htmlContent,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Brevo HTTP ${response.status}`);
  }

  return response.json();
};

// ============================================================
// HTML template email approval
// ============================================================
const buildApprovalEmailHTML = ({
  approverName,
  pelakuName,
  namaAktivitas,
  stepName,
  dataValues,
  approvalUrl,
  submittedAt,
}) => {
  const formattedDate = new Date(submittedAt).toLocaleString('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  const dataRows = (dataValues || [])
    .map(
      (d) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-weight:500;width:40%;">
          ${d.label}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#333;">
          ${d.value || '-'}
        </td>
      </tr>`
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
      <div style="max-width:600px;margin:20px auto;background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
        <div style="background:#2e7d32;padding:24px;color:white;text-align:center;">
          <h1 style="margin:0;font-size:20px;">📋 Approval Baru</h1>
          <p style="margin:8px 0 0;opacity:0.9;font-size:14px;">${stepName || 'Menunggu Persetujuan Anda'}</p>
        </div>
        <div style="padding:24px;">
          <p style="margin:0 0 16px;color:#333;">Halo <strong>${approverName}</strong>,</p>
          <p style="margin:0 0 20px;font-size:14px;color:#666;">
            Ada data baru yang <strong>menunggu persetujuan Anda</strong>.
          </p>
          <div style="background:#f1f8e9;padding:12px 16px;border-radius:6px;border-left:4px solid #2e7d32;margin-bottom:20px;">
            <div style="font-size:13px;color:#555;">
              <strong>Dikirim oleh:</strong> ${pelakuName}<br/>
              <strong>Waktu:</strong> ${formattedDate}
            </div>
          </div>
          <div style="margin-bottom:20px;">
            <div style="font-size:12px;color:#999;text-transform:uppercase;margin-bottom:8px;">Aktivitas</div>
            <div style="font-size:16px;font-weight:bold;color:#333;">${namaAktivitas}</div>
          </div>
          <div style="margin-bottom:24px;">
            <div style="font-size:12px;color:#999;text-transform:uppercase;margin-bottom:8px;">Detail Data</div>
            <table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:6px;overflow:hidden;">
              ${dataRows}
            </table>
          </div>
          <div style="text-align:center;margin:32px 0;">
            <a href="${approvalUrl}" style="display:inline-block;background:#2e7d32;color:white;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:bold;">
              Buka Aplikasi & Approve
            </a>
          </div>
          <p style="font-size:12px;color:#999;text-align:center;margin:16px 0 0;">
            Email ini dikirim otomatis. Jangan balas email ini.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// ============================================================
// Kirim notifikasi approval ke semua approver di step tertentu
// ============================================================
export const sendApprovalEmail = async (stepId, options = {}) => {
  if (!stepId) {
    console.warn('⚠️ Tidak ada stepId, skip kirim email');
    return { sent: 0, failed: 0, total: 0 };
  }

  try {
    const dbRef = ref(database);

    // 1. Ambil data step
    const stepSnapshot = await get(
      child(dbRef, `dtb_workflow_approval_steps/${stepId}`)
    );
    const step = stepSnapshot.val();
    if (!step || !step.is_active) {
      console.warn('⚠️ Step tidak valid');
      return { sent: 0, failed: 0, total: 0 };
    }

    // 2. Ambil daftar assigned_user_ids
    let assignedUsers = step.assigned_user_ids || [];
    if (typeof assignedUsers === 'object' && !Array.isArray(assignedUsers)) {
      assignedUsers = Object.values(assignedUsers);
    }
    if (!Array.isArray(assignedUsers) || assignedUsers.length === 0) {
      console.warn('⚠️ Tidak ada approver di step ini');
      return { sent: 0, failed: 0, total: 0 };
    }

    // 3. Ambil info tiap approver (nama + email)
    const approvers = [];
    for (const uid of assignedUsers) {
      const userSnapshot = await get(child(dbRef, `users/${uid}`));
      const user = userSnapshot.val();
      if (user?.email) {
        approvers.push({
          uid,
          name: user.name || 'Approver',
          email: user.email,
        });
      } else {
        console.warn(`⚠️ User ${uid} tidak punya email, skip`);
      }
    }

    if (approvers.length === 0) {
      console.warn('⚠️ Tidak ada approver dengan email valid');
      return { sent: 0, failed: 0, total: 0 };
    }

    // 4. Siapkan konten email
    const submittedAt = new Date().toISOString();
    const approvalUrl = `${APP_URL}/data-identitas`;
    const subject = `📋 Approval Baru: ${options.namaAktivitas || 'Aktivitas'} dari ${options.pelakuName || 'Petugas'}`;

    // 5. Kirim paralel ke semua approver
    const results = await Promise.allSettled(
      approvers.map((approver) =>
        sendBrevoEmail({
          to: approver.email,
          toName: approver.name,
          subject,
          htmlContent: buildApprovalEmailHTML({
            approverName: approver.name,
            pelakuName: options.pelakuName || 'Petugas',
            namaAktivitas: options.namaAktivitas || 'Aktivitas',
            stepName: step.nama_step,
            dataValues: options.dataValues || [],
            approvalUrl,
            submittedAt,
          }),
        })
      )
    );

    let sent = 0;
    let failed = 0;
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        sent++;
        console.log(`✅ Email terkirim ke ${approvers[i].email}`);
      } else {
        failed++;
        console.error(
          `❌ Gagal ke ${approvers[i].email}:`,
          r.reason?.message || r.reason
        );
      }
    });

    return { sent, failed, total: approvers.length };
  } catch (error) {
    console.error('Error sendApprovalEmail:', error);
    return { sent: 0, failed: 0, total: 0, error: error.message };
  }
};