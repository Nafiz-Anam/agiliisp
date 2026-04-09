import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { sendSuccess } from '../utils/apiResponse';
import reportService from '../services/report.service';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

const getRevenueReport = catchAsync(async (req: Request, res: Response) => {
  const { startDate, endDate, granularity } = req.query as any;
  const data = await reportService.getRevenueReport(startDate, endDate, granularity);
  return sendSuccess(res, { report: data }, 'Revenue report retrieved', undefined, (req as any).requestId);
});

const getCollectionReport = catchAsync(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query as any;
  const data = await reportService.getCollectionReport(startDate, endDate);
  return sendSuccess(res, { report: data }, 'Collection report retrieved', undefined, (req as any).requestId);
});

const getAgingReport = catchAsync(async (req: Request, res: Response) => {
  const data = await reportService.getAgingReport();
  return sendSuccess(res, { report: data }, 'Aging report retrieved', undefined, (req as any).requestId);
});

const getCustomerRevenueReport = catchAsync(async (req: Request, res: Response) => {
  const result: any = await reportService.getCustomerRevenueReport(req.query as any);
  return sendSuccess(
    res,
    { report: result.data },
    'Customer revenue report retrieved',
    undefined,
    (req as any).requestId,
    {
      page: result.meta.page,
      limit: result.meta.limit,
      totalPages: result.meta.totalPages,
      totalResults: result.meta.total,
      hasNext: result.meta.page < result.meta.totalPages,
      hasPrev: result.meta.page > 1,
    }
  );
});

const exportReport = catchAsync(async (req: Request, res: Response) => {
  const { type, format } = req.params;
  const { startDate, endDate, granularity } = req.query as any;

  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), 0, 1).toISOString();
  const defaultEnd = now.toISOString();
  const start = startDate || defaultStart;
  const end = endDate || defaultEnd;

  if (format === 'csv') {
    let csvContent = '';
    let filename = '';

    if (type === 'revenue') {
      const data = await reportService.getRevenueReport(start, end, granularity || 'monthly');
      csvContent = 'Period,Revenue,Payment Count\n' +
        data.map(r => `"${new Date(r.period).toLocaleDateString()}",${r.totalRevenue},${r.paymentCount}`).join('\n');
      filename = 'revenue-report';
    } else if (type === 'collection') {
      const data = await reportService.getCollectionReport(start, end);
      csvContent = 'Period,Total Invoiced,Total Collected,Collection Rate %\n' +
        data.collectionTrend.map(r => `"${new Date(r.period).toLocaleDateString()}",${r.totalInvoiced},${r.totalCollected},${r.rate}`).join('\n');
      filename = 'collection-report';
    } else if (type === 'aging') {
      const data = await reportService.getAgingReport();
      csvContent = 'Invoice #,Customer,Total Amount,Balance Due,Due Date,Days Overdue,Status\n' +
        data.invoices.map(r => `"${r.invoiceNumber}","${r.customer?.fullName || ''}",${r.totalAmount},${r.balanceDue},"${new Date(r.dueDate).toLocaleDateString()}",${r.daysOverdue},${r.status}`).join('\n');
      filename = 'aging-report';
    } else if (type === 'customer-revenue') {
      const data = await reportService.getCustomerRevenueReport({ limit: 1000, startDate: start, endDate: end });
      csvContent = 'Customer,Username,Total Paid,Invoice Count,Outstanding\n' +
        data.data.map(r => `"${r.fullName}","${r.username}",${r.totalPaid},${r.invoiceCount},${r.outstanding}`).join('\n');
      filename = 'customer-revenue-report';
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}-${Date.now()}.csv`);
    return res.send(csvContent);
  }

  // PDF export
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 20;

  const addTitle = (title: string) => {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${new Date().toLocaleString()} | Period: ${new Date(start).toLocaleDateString()} - ${new Date(end).toLocaleDateString()}`, margin, y);
    doc.setTextColor(0, 0, 0);
    y += 10;
  };

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const addTableHeader = (headers: string[], colWidths: number[]) => {
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, pageW - margin * 2, 7, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    let x = margin + 2;
    headers.forEach((h, i) => {
      doc.text(h, x, y + 5);
      x += colWidths[i];
    });
    y += 10;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
  };

  let filename = '';

  if (type === 'revenue') {
    const data = await reportService.getRevenueReport(start, end, granularity || 'monthly');
    addTitle('Revenue Report');
    addTableHeader(['Period', 'Revenue', 'Payments'], [60, 50, 40]);
    data.forEach(r => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(new Date(r.period).toLocaleDateString(), margin + 2, y);
      doc.text(fmt(r.totalRevenue), margin + 62, y);
      doc.text(String(r.paymentCount), margin + 112, y);
      y += 6;
    });
    filename = 'revenue-report';
  } else if (type === 'collection') {
    const data = await reportService.getCollectionReport(start, end);
    addTitle('Collection Report');
    addTableHeader(['Period', 'Invoiced', 'Collected', 'Rate'], [45, 40, 40, 30]);
    data.collectionTrend.forEach(r => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(new Date(r.period).toLocaleDateString(), margin + 2, y);
      doc.text(fmt(r.totalInvoiced), margin + 47, y);
      doc.text(fmt(r.totalCollected), margin + 87, y);
      doc.text(`${r.rate}%`, margin + 127, y);
      y += 6;
    });
    filename = 'collection-report';
  } else if (type === 'aging') {
    const data = await reportService.getAgingReport();
    addTitle('Outstanding / Aging Report');

    // Summary
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Outstanding: ${fmt(data.totalOutstanding)} (${data.totalCount} invoices)`, margin, y);
    y += 8;

    Object.entries(data.buckets).forEach(([bucket, info]) => {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`${bucket} days: ${info.count} invoices — ${fmt(info.total)}`, margin + 4, y);
      y += 5;
    });
    y += 6;

    addTableHeader(['Invoice #', 'Customer', 'Balance Due', 'Days'], [45, 55, 40, 30]);
    data.invoices.forEach(r => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(r.invoiceNumber, margin + 2, y);
      doc.text(r.customer?.fullName || '—', margin + 47, y);
      doc.text(fmt(r.balanceDue), margin + 102, y);
      doc.text(String(r.daysOverdue), margin + 142, y);
      y += 6;
    });
    filename = 'aging-report';
  } else if (type === 'customer-revenue') {
    const data = await reportService.getCustomerRevenueReport({ limit: 200, startDate: start, endDate: end });
    addTitle('Customer Revenue Report');
    addTableHeader(['Customer', 'Invoices', 'Total Paid', 'Outstanding'], [55, 30, 40, 40]);
    data.data.forEach(r => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(r.fullName || '—', margin + 2, y);
      doc.text(String(r.invoiceCount), margin + 57, y);
      doc.text(fmt(r.totalPaid), margin + 87, y);
      doc.text(fmt(r.outstanding), margin + 127, y);
      y += 6;
    });
    filename = 'customer-revenue-report';
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}-${Date.now()}.pdf`);
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  res.send(pdfBuffer);
});

export default { getRevenueReport, getCollectionReport, getAgingReport, getCustomerRevenueReport, exportReport };
