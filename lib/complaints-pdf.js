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
  const headerHeight = 18;
  const padX = 3;
  const padY = 5;
  let y = doc.y;

  // Hauteur necessaire pour une ligne de donnees : les colonnes de texte
  // reviennent a la ligne, donc on prend la hauteur de la cellule la plus haute
  // (avec un minimum). Permet d'afficher les titres longs en entier.
  function measureRow(cells) {
    doc.fontSize(9).font('Helvetica');
    let max = headerHeight;
    cols.forEach(function (c, i) {
      const text = cells[i] == null ? '' : String(cells[i]);
      const h = doc.heightOfString(text, { width: c.width - padX * 2 }) + padY * 2;
      if (h > max) max = h;
    });
    return max;
  }

  function drawRow(cells, isHeader, rowH) {
    if (isHeader) doc.rect(startX, y, tableWidth, rowH).fill('#0d4f8b');
    let x = startX;
    doc.fontSize(9);
    cols.forEach(function (c, i) {
      doc
        .fillColor(isHeader ? '#ffffff' : '#000000')
        .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
        .text(cells[i] == null ? '' : String(cells[i]), x + padX, y + padY, {
          width: c.width - padX * 2,
          // Les lignes de donnees reviennent a la ligne pour tout montrer ;
          // l'en-tete reste sur une ligne (libelles courts).
          lineBreak: !isHeader,
          ellipsis: isHeader,
        });
      x += c.width;
    });
    y += rowH;
    if (!isHeader) {
      doc.moveTo(startX, y).lineTo(startX + tableWidth, y).strokeColor('#e0e0e0').stroke();
    }
  }

  drawRow(cols.map((c) => c.label), true, headerHeight);
  y += 2;

  if (complaints.length === 0) {
    doc.fillColor('#666666').font('Helvetica-Oblique').fontSize(10)
      .text('Aucune réclamation pour ce filtre.', startX, y + 6);
  } else {
    complaints.forEach(function (c) {
      const cells = [c.ref, c.titre, c.universite || '-', c.statut, c.priorite, formatDate(c.createdAt)];
      const rowH = measureRow(cells);
      // Saut de page si la ligne (desormais de hauteur variable) ne tient plus.
      if (y + rowH > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        y = doc.page.margins.top;
        drawRow(cols.map((col) => col.label), true, headerHeight);
        y += 2;
      }
      drawRow(cells, false, rowH);
    });
  }

  doc.end();
}

module.exports = { generateComplaintsPdf };
