import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { Response } from 'express';
import prisma from '../client';

/**
 * Export user data to PDF
 * @param {Array} users - Array of user objects
 * @param {Response} res - Express response object
 */
export const exportUsersToPDF = async (users: any[], res: Response) => {
  const doc = new jsPDF();

  // Add title
  doc.setFontSize(20);
  doc.text('Users Report', 14, 20);

  // Add timestamp
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
  doc.text(`Total Users: ${users.length}`, 14, 40);

  // Add table headers
  doc.setFontSize(12);
  const headers = ['Name', 'Email', 'Phone', 'Country', 'State', 'City', 'Role', 'Status'];
  let yPosition = 50;

  headers.forEach((header, index) => {
    doc.text(header, 14 + index * 25, yPosition);
  });

  // Add user data
  doc.setFontSize(10);
  yPosition += 10;

  users.forEach(user => {
    if (yPosition > 270) {
      doc.addPage();
      yPosition = 20;
    }

    const rowData = [
      user.name || 'N/A',
      user.email || 'N/A',
      user.phone || 'N/A',
      user.country || 'N/A',
      user.state || 'N/A',
      user.city || 'N/A',
      user.role || 'N/A',
      user.isActive ? 'Active' : 'Inactive',
    ];

    rowData.forEach((data, colIndex) => {
      doc.text(String(data), 14 + colIndex * 25, yPosition);
    });

    yPosition += 8;
  });

  // Set response headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=users-${Date.now()}.pdf`);

  // Send PDF
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  res.send(pdfBuffer);
};

/**
 * Export user data to Excel
 * @param {Array} users - Array of user objects
 * @param {Response} res - Express response object
 */
export const exportUsersToExcel = async (users: any[], res: Response) => {
  // Prepare data for Excel
  const excelData = users.map(user => ({
    Name: user.name || 'N/A',
    Email: user.email || 'N/A',
    Phone: user.phone || 'N/A',
    PhoneCode: user.phoneCode || 'N/A',
    Country: user.country || 'N/A',
    State: user.state || 'N/A',
    City: user.city || 'N/A',
    Address: user.address || 'N/A',
    ProfilePicture: user.profilePicture || 'N/A',
    DateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : 'N/A',
    Gender: user.gender || 'N/A',
    Role: user.role || 'N/A',
    IsEmailVerified: user.isEmailVerified ? 'Yes' : 'No',
    IsActive: user.isActive ? 'Active' : 'Inactive',
    IsLocked: user.isLocked ? 'Yes' : 'No',
    TwoFactorEnabled: user.twoFactorEnabled ? 'Yes' : 'No',
    LastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never',
    CreatedAt: user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A',
    UpdatedAt: user.updatedAt ? new Date(user.updatedAt).toLocaleString() : 'N/A',
  }));

  // Create workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelData);

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Users');

  // Generate buffer
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

  // Set response headers
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename=users-${Date.now()}.xlsx`);

  // Send Excel file
  res.send(excelBuffer);
};

/**
 * Generate CSV data for users
 * @param {Array} users - Array of user objects
 * @returns {string} CSV string
 */
export const generateUsersCSV = (users: any[]): string => {
  const headers = [
    'Name',
    'Email',
    'Phone',
    'PhoneCode',
    'Country',
    'State',
    'City',
    'Address',
    'ProfilePicture',
    'DateOfBirth',
    'Gender',
    'Role',
    'IsEmailVerified',
    'IsActive',
    'IsLocked',
    'TwoFactorEnabled',
    'LastLoginAt',
    'CreatedAt',
    'UpdatedAt',
  ];

  const csvRows = [headers.join(',')];

  users.forEach(user => {
    const row = [
      `"${(user.name || 'N/A').replace(/"/g, '""')}"`,
      `"${(user.email || 'N/A').replace(/"/g, '""')}"`,
      `"${(user.phone || 'N/A').replace(/"/g, '""')}"`,
      `"${(user.phoneCode || 'N/A').replace(/"/g, '""')}"`,
      `"${(user.country || 'N/A').replace(/"/g, '""')}"`,
      `"${(user.state || 'N/A').replace(/"/g, '""')}"`,
      `"${(user.city || 'N/A').replace(/"/g, '""')}"`,
      `"${(user.address || 'N/A').replace(/"/g, '""')}"`,
      `"${(user.profilePicture || 'N/A').replace(/"/g, '""')}"`,
      `"${user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : 'N/A'}"`,
      `"${(user.gender || 'N/A').replace(/"/g, '""')}"`,
      `"${(user.role || 'N/A').replace(/"/g, '""')}"`,
      `"${user.isEmailVerified ? 'Yes' : 'No'}"`,
      `"${user.isActive ? 'Active' : 'Inactive'}"`,
      `"${user.isLocked ? 'Yes' : 'No'}"`,
      `"${user.twoFactorEnabled ? 'Yes' : 'No'}"`,
      `"${user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}"`,
      `"${user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}"`,
      `"${user.updatedAt ? new Date(user.updatedAt).toLocaleString() : 'N/A'}"`,
    ];
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
};

/**
 * Generate a professional PDF invoice
 * @param invoice - Full invoice object with items, customer, payments
 * @param res - Express response object
 */
export const generateInvoicePDF = async (invoice: any, res: Response) => {
  // Fetch company settings
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: ['companyName', 'companyAddress', 'companyPhone', 'companyEmail'] } },
  });
  const cfg: Record<string, string> = {};
  settings.forEach((s: any) => {
    cfg[s.key] = s.value;
  });

  const companyName = cfg.companyName || 'AgiloISP';
  const companyAddress = cfg.companyAddress || '';
  const companyPhone = cfg.companyPhone || '';
  const companyEmail = cfg.companyEmail || '';

  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 20;

  // ── Company Header ──
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, margin, y);
  y += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (companyAddress) {
    doc.text(companyAddress, margin, y);
    y += 4;
  }
  if (companyPhone) {
    doc.text(`Phone: ${companyPhone}`, margin, y);
    y += 4;
  }
  if (companyEmail) {
    doc.text(`Email: ${companyEmail}`, margin, y);
    y += 4;
  }

  // ── Invoice Title (right side) ──
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageW - margin, 20, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`#${invoice.invoiceNumber}`, pageW - margin, 28, { align: 'right' });

  // ── Status badge ──
  const statusColors: Record<string, [number, number, number]> = {
    PAID: [16, 185, 129],
    SENT: [59, 130, 246],
    OVERDUE: [239, 68, 68],
    DRAFT: [148, 163, 184],
    PARTIALLY_PAID: [245, 158, 11],
    CANCELLED: [148, 163, 184],
  };
  const sc = statusColors[invoice.status] || [148, 163, 184];
  doc.setFontSize(9);
  doc.setTextColor(sc[0], sc[1], sc[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.status.replace(/_/g, ' '), pageW - margin, 34, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  y = Math.max(y, 42) + 4;

  // ── Divider ──
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // ── Bill To + Invoice Details (two columns) ──
  const col2X = pageW / 2 + 10;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('BILL TO', margin, y);
  doc.text('INVOICE DETAILS', col2X, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  const cust = invoice.customer;
  if (cust) {
    doc.setFont('helvetica', 'bold');
    doc.text(cust.fullName || '—', margin, y);
    doc.setFont('helvetica', 'normal');
    if (cust.email) {
      y += 5;
      doc.text(cust.email, margin, y);
    }
    if (cust.phone) {
      y += 5;
      doc.text(cust.phone, margin, y);
    }
    if (cust.address) {
      y += 5;
      doc.text(cust.address, margin, y);
    }
    const cityLine = [cust.city, cust.state, cust.zipCode].filter(Boolean).join(', ');
    if (cityLine) {
      y += 5;
      doc.text(cityLine, margin, y);
    }
  }

  // Right column: invoice details
  let dy = y - (cust ? 20 : 0);
  if (dy < 0) dy = y - 20;
  const detailStartY = y - 20;
  const fmtDate = (d: any) =>
    d
      ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      : '—';

  const details = [
    ['Invoice Date:', fmtDate(invoice.invoiceDate)],
    ['Due Date:', fmtDate(invoice.dueDate)],
    ['Paid Date:', invoice.paidDate ? fmtDate(invoice.paidDate) : '—'],
  ];
  let ddy = detailStartY;
  details.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(label, col2X, ddy);
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.text(val, col2X + 30, ddy);
    ddy += 6;
  });

  y += 14;

  // ── Items Table ──
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, pageW - margin * 2, 8, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  const colDesc = margin + 2;
  const colQty = pageW - margin - 80;
  const colUnit = pageW - margin - 50;
  const colTotal = pageW - margin - 2;
  doc.text('DESCRIPTION', colDesc, y + 5.5);
  doc.text('QTY', colQty, y + 5.5, { align: 'right' });
  doc.text('UNIT PRICE', colUnit, y + 5.5, { align: 'right' });
  doc.text('TOTAL', colTotal, y + 5.5, { align: 'right' });
  y += 12;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);

  const fmt = (n: number) =>
    `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  (invoice.items || []).forEach((item: any) => {
    if (y > 265) {
      doc.addPage();
      y = 20;
    }
    doc.text(item.description || '—', colDesc, y);
    doc.text(String(item.quantity), colQty, y, { align: 'right' });
    doc.text(fmt(item.unitPrice), colUnit, y, { align: 'right' });
    doc.text(fmt(item.totalPrice), colTotal, y, { align: 'right' });
    y += 7;
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y - 2, pageW - margin, y - 2);
  });

  y += 4;

  // ── Totals ──
  const totalsX = pageW - margin - 60;
  const totalsValX = pageW - margin - 2;
  const totals = [
    ['Subtotal:', fmt(invoice.subtotal)],
    ['Tax:', fmt(invoice.taxAmount || 0)],
    ['Discount:', invoice.discountAmount > 0 ? `-${fmt(invoice.discountAmount)}` : fmt(0)],
  ];
  totals.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(label, totalsX, y);
    doc.setTextColor(30, 41, 59);
    doc.text(val, totalsValX, y, { align: 'right' });
    y += 6;
  });

  // Total line
  doc.setDrawColor(226, 232, 240);
  doc.line(totalsX - 5, y - 2, pageW - margin, y - 2);
  y += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Total:', totalsX, y);
  doc.text(fmt(invoice.totalAmount), totalsValX, y, { align: 'right' });
  y += 7;

  // Paid & Balance Due
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(16, 185, 129);
  doc.text('Paid:', totalsX, y);
  doc.text(fmt(invoice.paidAmount || 0), totalsValX, y, { align: 'right' });
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  const balDue = Number(invoice.balanceDue || 0);
  doc.setTextColor(balDue > 0 ? 239 : 16, balDue > 0 ? 68 : 185, balDue > 0 ? 68 : 129);
  doc.text('Balance Due:', totalsX, y);
  doc.text(fmt(balDue), totalsValX, y, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  y += 10;

  // ── Payment History ──
  if (invoice.payments && invoice.payments.length > 0) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Payment History', margin, y);
    y += 6;

    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, pageW - margin * 2, 7, 'F');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('DATE', margin + 2, y + 5);
    doc.text('METHOD', margin + 45, y + 5);
    doc.text('REFERENCE', margin + 90, y + 5);
    doc.text('AMOUNT', pageW - margin - 2, y + 5, { align: 'right' });
    y += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    invoice.payments.forEach((p: any) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(fmtDate(p.paymentDate), margin + 2, y);
      doc.text((p.paymentMethod || '').replace(/_/g, ' '), margin + 45, y);
      doc.text(p.referenceNumber || '—', margin + 90, y);
      doc.text(fmt(Number(p.amount)), pageW - margin - 2, y, { align: 'right' });
      y += 6;
    });
    y += 4;
  }

  // ── Notes / Terms / Footer ──
  if (invoice.notes || invoice.terms || invoice.footer) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageW - margin, y);
    y += 6;
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);

    if (invoice.notes) {
      doc.setFont('helvetica', 'bold');
      doc.text('Notes:', margin, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      const noteLines = doc.splitTextToSize(invoice.notes, pageW - margin * 2);
      doc.text(noteLines, margin, y);
      y += noteLines.length * 4 + 4;
    }
    if (invoice.terms) {
      doc.setFont('helvetica', 'bold');
      doc.text('Terms:', margin, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      const termLines = doc.splitTextToSize(invoice.terms, pageW - margin * 2);
      doc.text(termLines, margin, y);
      y += termLines.length * 4 + 4;
    }
    if (invoice.footer) {
      doc.setFont('helvetica', 'italic');
      doc.text(invoice.footer, pageW / 2, y, { align: 'center' });
    }
  }

  // ── Footer line ──
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated on ${new Date().toLocaleString()}`, pageW / 2, pageH - 10, {
    align: 'center',
  });

  // Send
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`);
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  res.send(pdfBuffer);
};

export default {
  exportUsersToPDF,
  exportUsersToExcel,
  generateUsersCSV,
  generateInvoicePDF,
};
