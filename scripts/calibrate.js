const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const config = require('../backend/config/pdf.config');

async function main() {
  const doc = await PDFDocument.load(fs.readFileSync(config.PDF_TEMPLATE));
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    for (let x = 0; x <= width; x += 25) {
      page.drawLine({ start: { x, y: 0 }, end: { x, y: height }, thickness: x % 50 === 0 ? 0.7 : 0.2, color: rgb(0.85, 0.2, 0.2) });
      if (x % 50 === 0) page.drawText(String(x), { x: x + 1, y: height - 9, size: 6, font, color: rgb(0.85, 0.2, 0.2) });
    }
    for (let y = 0; y <= height; y += 25) {
      page.drawLine({ start: { x: 0, y }, end: { x: width, y }, thickness: y % 50 === 0 ? 0.7 : 0.2, color: rgb(0.1, 0.35, 0.85) });
      if (y % 50 === 0) page.drawText(String(Math.round(height - y)), { x: 1, y: y - 7, size: 6, font, color: rgb(0.1, 0.35, 0.85) });
    }
  }
  fs.mkdirSync(config.OUTPUT_DIR, { recursive: true });
  const dest = path.join(config.OUTPUT_DIR, 'calibracao.pdf');
  fs.writeFileSync(dest, await doc.save());
  console.log('Grade gerada em:', dest, '(vermelho=X da esquerda; azul=distancia do topo)');
}
main().catch(e => { console.error(e.message); process.exit(1); });