import { jsPDF } from 'jspdf';

// Built-in Helvetica only covers WinAnsi: replace characters it cannot render
const clean = (s: unknown) => String(s ?? '—')
  .replace(/[→⟶]/g, '->').replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
  .replace(/×/g, 'x').replace(/–|—/g, '-').replace(/®|™/g, '');

const BRAND: [number, number, number] = [37, 99, 235];
const MARGIN = 16;

export interface ReportSection {
  title: string;
  paragraphs?: string[];
  metrics?: { label: string; value: string }[];
  table?: { columns: string[]; widths: number[]; rows: string[][] };
}

/** Builds a branded A4 PDF from plain sections and triggers the download. */
export function downloadReport(opts: { title: string; organization: string; audience: string; sections: ReportSection[]; filename: string }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - MARGIN * 2;
  let y = 0;

  const header = () => {
    doc.setFillColor(...BRAND);
    doc.rect(0, 0, pageW, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...BRAND);
    doc.text('CGEF PLATFORM', MARGIN, 10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    doc.text(clean(`${opts.organization} - ${opts.title}`), pageW - MARGIN, 10, { align: 'right' });
    y = 18;
  };
  const ensure = (h: number) => { if (y + h > pageH - 15) { doc.addPage(); header(); } };

  header();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(20);
  doc.text(clean(opts.title), MARGIN, y + 6);
  y += 13;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text(clean(`${opts.organization}  |  Generated ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}  |  Audience: ${opts.audience}`), MARGIN, y);
  y += 4;
  doc.setDrawColor(220);
  doc.line(MARGIN, y, pageW - MARGIN, y);
  y += 8;

  opts.sections.forEach((section, si) => {
    ensure(16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...BRAND);
    doc.text(clean(`${si + 1}. ${section.title}`), MARGIN, y);
    y += 7;

    if (section.metrics?.length) {
      const cols = Math.min(4, section.metrics.length);
      const boxW = (contentW - (cols - 1) * 3) / cols;
      section.metrics.forEach((m, i) => {
        const col = i % cols;
        if (col === 0) ensure(18);
        const x = MARGIN + col * (boxW + 3);
        doc.setFillColor(243, 246, 252);
        doc.roundedRect(x, y, boxW, 15, 1.5, 1.5, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100);
        doc.text(clean(m.label), x + 3, y + 5);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(20);
        doc.text(clean(m.value), x + 3, y + 12);
        if (col === cols - 1 || i === section.metrics!.length - 1) y += 18;
      });
    }

    section.paragraphs?.forEach((p) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(50);
      const lines = doc.splitTextToSize(clean(p), contentW) as string[];
      lines.forEach((line) => { ensure(5); doc.text(line, MARGIN, y); y += 4.6; });
      y += 2;
    });

    if (section.table) {
      const { columns, widths, rows } = section.table;
      const scale = contentW / widths.reduce((a, b) => a + b, 0);
      const w = widths.map((x) => x * scale);
      const drawHead = () => {
        ensure(8);
        doc.setFillColor(...BRAND);
        doc.rect(MARGIN, y, contentW, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(255);
        let x = MARGIN;
        columns.forEach((c, i) => { doc.text(clean(c), x + 2, y + 4.8); x += w[i]; });
        y += 7;
      };
      drawHead();
      doc.setFont('helvetica', 'normal');
      rows.forEach((row, ri) => {
        const cells = row.map((c, i) => doc.splitTextToSize(clean(c), w[i] - 4) as string[]);
        const h = Math.max(...cells.map((c) => c.length)) * 3.8 + 3;
        if (y + h > pageH - 15) { doc.addPage(); header(); drawHead(); doc.setFont('helvetica', 'normal'); }
        if (ri % 2 === 1) { doc.setFillColor(248, 250, 253); doc.rect(MARGIN, y, contentW, h, 'F'); }
        doc.setFontSize(8);
        doc.setTextColor(40);
        let x = MARGIN;
        cells.forEach((lines, i) => { doc.text(lines, x + 2, y + 4.2); x += w[i]; });
        y += h;
      });
      if (!rows.length) {
        doc.setFontSize(8.5);
        doc.setTextColor(120);
        doc.text('No data.', MARGIN + 2, y + 5);
        y += 8;
      }
      y += 4;
    }
    y += 3;
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(140);
    doc.text(`CONFIDENTIAL  |  Page ${i} / ${pages}`, pageW / 2, pageH - 8, { align: 'center' });
  }
  doc.save(opts.filename);
}
