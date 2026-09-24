const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const db = require('../backend/db');
const { apenasDigitos, cnpjValido } = require('../backend/utils/cnpj');

const norm = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const val = (v) => v == null ? '' : typeof v === 'object'
  ? (v.text ?? v.result ?? (v.richText ? v.richText.map(t => t.text).join('') : ''))
  : String(v);

async function importar(arquivo) {
  if (!fs.existsSync(arquivo)) { console.error('Arquivo nao encontrado:', arquivo); process.exit(1); }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(arquivo);
  const ws = wb.worksheets[0];
  let colCnpj = null, colNome = null;
  ws.getRow(1).eachCell((cell, col) => {
    const h = norm(val(cell.value));
    if (h === 'cnpj' || h.startsWith('cnpj')) colCnpj = col;
    if (['nomefantasia', 'fantasia', 'nome', 'razaosocial'].includes(h)) colNome = col;
  });
  if (!colCnpj || !colNome) { console.error('Colunas "CNPJ" e "Nome Fantasia" nao encontradas na 1a linha.'); process.exit(1); }

  const upsert = db.prepare(`INSERT INTO empresas (cnpj, nome_fantasia) VALUES (?, ?)
    ON CONFLICT(cnpj) DO UPDATE SET nome_fantasia = excluded.nome_fantasia`);
  const existe = db.prepare('SELECT id FROM empresas WHERE cnpj = ?');
  let novas = 0, atual = 0, ignoradas = 0;

  ws.eachRow((row, n) => {
    if (n === 1) return;
    const cnpj = apenasDigitos(val(row.getCell(colCnpj).value));
    const nome = val(row.getCell(colNome).value).trim();
    if (!cnpjValido(cnpj) || !nome) { ignoradas++; return; }
    existe.get(cnpj) ? atual++ : novas++;
    upsert.run(cnpj, nome);
  });
  const total = db.prepare('SELECT COUNT(*) n FROM empresas').get().n;
  console.log(`\nImportacao concluida: ${novas} novas, ${atual} atualizadas, ${ignoradas} ignoradas. Total na base: ${total}\n`);
}
importar(process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, '..', 'uploads', 'empresas.xlsx'))
  .catch(e => { console.error('Erro:', e.message); process.exit(1); });