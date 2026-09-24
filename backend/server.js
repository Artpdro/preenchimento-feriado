const path = require('path');
const express = require('express');
const apiRoutes = require('./routes/api');
const config = require('./config/pdf.config');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.use(express.json({ limit: '50kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

app.use('/api', apiRoutes);

/* Arquivos gerados — nomes SEM barras (corrige o bug de download/visualizar) */
const NOME_VALIDO = /^(notificacao_\d{14}\.pdf|notificacoes_\d{14}\.zip)$/;
app.get('/output/:nome', (req, res) => {
  const nome = req.params.nome;
  if (!NOME_VALIDO.test(nome)) return res.status(404).send('Arquivo nao encontrado.');
  const caminho = path.join(config.OUTPUT_DIR, nome);
  if (nome.endsWith('.zip')) {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${nome}"`);
    return res.sendFile(caminho);
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${nome}"`); // abre no navegador
  res.sendFile(caminho);
});

app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.use((req, res) => res.status(404).json({ erro: 'Rota nao encontrada.' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({ sucesso: false, mensagem: status === 500 ? 'Erro interno do servidor.' : err.message });
});

app.listen(PORT, () => console.log(`Sistema no ar: http://localhost:${PORT}`));