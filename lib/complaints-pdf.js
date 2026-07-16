const PDFDocument = require('pdfkit');

function formatDate(d) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Genere un PDF listant les reclamations et le diffuse directement dans la reponse HTTP.
function generateComplaintsPdf(res, { complaints, statutFilter }) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="reclamations-ureport.pdf"');
  doc.pipe(res);

  // En-tete
  doc.fontSize(18).fillColor('#0d4f8b').text('U-Report');
  doc.fontSize(13).fillColor('#000000').text('Rapport des réclamations');
  doc.moveDown(0.3);
  doc.fontSize(9).fillColor('#666666')
    .text('Généré le ' + new Date().toLocaleString('fr-FR'))
    .text('Filtre statut : ' + (statutFilter || 'Tous'))
    .text('Total : ' + complaints.length + ' réclamation(s)');
  doc.moveDown(0.8);

  const cols = [
    { label: 'Réf.', width: 55 },
    { label: 'Titre', width: 150 },
    { label: 'Université', width: 110 },
    { label: 'Statut', width: 70 },
    { label: 'Priorité', width: 55 },
    { label: 'Date', width: 75 },
  ];
  const tableWidth = cols.reduce((s, c) => s + c.width, 0);
  const startX = doc.page.margins.left;
  const rowHeight = 18;
  let y = doc.y;

  function drawRow(cells, isHeader) {
    if (isHeader) doc.rect(startX, y, tableWidth, rowHeight).fill('#0d4f8b');
    let x = startX;
    doc.fontSize(9);
    cols.forEach(function (c, i) {
      doc
        .fillColor(isHeader ? '#ffffff' : '#000000')
        .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
        .text(cells[i] == null ? '' : String(cells[i]), x + 3, y + 5, {
          width: c.width - 6,
          height: rowHeight - 4,
          ellipsis: true,
          lineBreak: false,
        });
      x += c.width;
    });
    y += rowHeight;
    if (!isHeader) {
      doc.moveTo(startX, y).lineTo(startX + tableWidth, y).strokeColor('#e0e0e0').stroke();
    }
  }

  drawRow(cols.map((c) => c.label), true);
  y += 2;

  if (complaints.length === 0) {
    doc.fillColor('#666666').font('Helvetica-Oblique').fontSize(10)
      .text('Aucune réclamation pour ce filtre.', startX, y + 6);
  } else {
    complaints.forEach(function (c) {
      if (y > doc.page.height - doc.page.margins.bottom - rowHeight) {
        doc.addPage();
        y = doc.page.margins.top;
        drawRow(cols.map((col) => col.label), true);
        y += 2;
      }
      drawRow([c.ref, c.titre, c.universite || '-', c.statut, c.priorite, formatDate(c.createdAt)], false);
    });
  }

  doc.end();
}

module.exports = { generateComplaintsPdf };
