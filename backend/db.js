let DatabaseSync;
try { ({ DatabaseSync } = require('node:sqlite')); }
catch {
  console.error(' [ERRO] Node.js sem "node:sqlite". Use Node >= 22.5 (atual: ' + process.version + ')');
  process.exit(1);
}
const fs = require('fs'), path = require('path');
const DB_DIR = path.join(__dirname, '..', 'database');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DB_DIR, 'empresas.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS empresas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cnpj TEXT NOT NULL UNIQUE,
    nome_fantasia TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_empresas_cnpj ON empresas(cnpj);
  CREATE INDEX IF NOT EXISTS idx_empresas_nome ON empresas(nome_fantasia);
`);
module.exports = db;