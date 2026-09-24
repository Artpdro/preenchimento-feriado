const express = require('express');
const db = require('../db');
const { apenasDigitos, formatarCnpj } = require('../utils/cnpj');
const { gerarPdfEmpresa } = require('../services/pdfService');
const { gerarLote } = require('../services/loteService');
const router = express.Router();
const LIMITE = 100;

const publica = (e) => ({ id: e.id, nomeFantasia: e.nome_fantasia, cnpj: formatarCnpj(e.cnpj) });

// GET /api/empresas?q=...  (busca por CNPJ com/sem pontuação ou por nome)
router.get('/empresas', (req, res) => {
  const q = String(req.query.q || '').trim();
  const d = apenasDigitos(q);
  let linhas;
  if (!q) {
    linhas = db.prepare('SELECT * FROM empresas ORDER BY nome_fantasia LIMIT ?').all(LIMITE);
  } else if (d.length >= 3) {
    linhas = db.prepare('SELECT * FROM empresas WHERE cnpj LIKE ? OR nome_fantasia LIKE ? ORDER BY nome_fantasia LIMIT ?')
      .all(d + '%', `%${q}%`, LIMITE);
  } else {
    linhas = db.prepare('SELECT * FROM empresas WHERE nome_fantasia LIKE ? ORDER BY nome_fantasia LIMIT ?')
      .all(`%${q}%`, LIMITE);
  }
  res.json({ sucesso: true, total: linhas.length, empresas: linhas.map(publica) });
});

// POST /api/gerar  { "ids": [1, 2, 3] } — dados SEMPRE lidos do banco
router.post('/gerar', async (req, res, next) => {
  try {
    const ids = [...new Set((req.body?.ids || []).map(Number).filter(n => Number.isInteger(n) && n > 0))];
    if (!ids.length) return res.status(400).json({ sucesso: false, mensagem: 'Selecione ao menos uma empresa.' });
    if (ids.length > 200) return res.status(400).json({ sucesso: false, mensagem: 'Limite de 200 empresas por lote.' });

    const empresas = [], perdidos = [];
    for (const id of ids) {
      const e = db.prepare('SELECT * FROM empresas WHERE id = ?').get(id);
      e ? empresas.push({ ...e, cnpj_formatado: formatarCnpj(e.cnpj) }) : perdidos.push(id);
    }
    if (!empresas.length) return res.status(404).json({ sucesso: false, mensagem: 'Nenhuma empresa encontrada para os ids informados.' });

    const aviso = perdidos.length ? `Ids nao encontrados e ignorados: ${perdidos.join(', ')}` : null;
    const arquivosDe = (lista) => lista.map(({ nomeArquivo, empresa }) => ({
      id: empresa.id, nomeFantasia: empresa.nome_fantasia, cnpj: formatarCnpj(empresa.cnpj),
      nomeArquivo, url: '/output/' + nomeArquivo
    }));

    if (empresas.length === 1) {
      const empresa = empresas[0];
      const nomeArquivo = await gerarPdfEmpresa(empresa);
      return res.json({
        sucesso: true, mensagem: 'PDF gerado com sucesso.', modo: 'unico', aviso,
        arquivos: [{ id: empresa.id, nomeFantasia: empresa.nome_fantasia, cnpj: formatarCnpj(empresa.cnpj), nomeArquivo, url: '/output/' + nomeArquivo }]
      });
    }
    const { nomeZip, pdfs } = await gerarLote(empresas);
    res.json({
      sucesso: true, mensagem: `${pdfs.length} documentos gerados com sucesso.`, modo: 'lote', aviso,
      arquivos: arquivosDe(pdfs),
      zip: { nomeArquivo: nomeZip, url: '/output/' + nomeZip }
    });
  } catch (err) { next(err); }
});

router.get('/health', (req, res) => res.json({ ok: true }));
module.exports = router;