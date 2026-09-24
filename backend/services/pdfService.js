const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const config = require('../config/pdf.config');

async function renderizarPdf({ nomeFantasia, cnpjFormatado }) {
  if (!fs.existsSync(config.PDF_TEMPLATE))
    throw Object.assign(new Error('PDF modelo nao encontrado em: ' + config.PDF_TEMPLATE), { status: 500 });

  const doc = await PDFDocument.load(fs.readFileSync(config.PDF_TEMPLATE));
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const valores = { empresa: nomeFantasia, cnpj: cnpjFormatado };

  for (const [campo, valor] of Object.entries(valores)) {
    const f = config.FIELDS[campo];
    if (!f) continue;
    const idx = (f.page || 1) - 1;
    if (idx < 0 || idx >= doc.getPageCount())
      throw new Error(`Campo "${campo}": pagina ${f.page} invalida.`);
    const page = doc.getPage(idx);
    const { height } = page.getSize();
    const y = f.yFromTop != null ? height - f.yFromTop : f.y;
    let size = f.fontSize || 11;
    const texto = String(valor);
    while (size > (f.minFontSize || 6) && font.widthOfTextAtSize(texto, size) > (f.maxWidth || Infinity)) size -= 0.5;
    page.drawText(texto, { x: f.x, y, size, font, color: rgb(0, 0, 0) });
  }
  return Buffer.from(await doc.save());
}

async function gerarPdfEmpresa(empresa) {
  const bytes = await renderizarPdf({ nomeFantasia: empresa.nome_fantasia, cnpjFormatado: empresa.cnpj_formatado });
  const nomeArquivo = `notificacao_${empresa.cnpj}.pdf`; // só dígitos, sem barras
  fs.mkdirSync(config.OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(config.OUTPUT_DIR, nomeArquivo), bytes);
  return nomeArquivo;
}
module.exports = { renderizarPdf, gerarPdfEmpresa };