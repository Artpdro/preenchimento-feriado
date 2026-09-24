const $ = (id) => document.getElementById(id);
const estado = { aba: 'unico', empresas: [], selecionadoUnico: null, selecionadosLote: new Map(), resultado: null };

function ativarAba(aba) {
  estado.aba = aba;
  $('abaUnico').classList.toggle('ativa', aba === 'unico');
  $('abaLote').classList.toggle('ativa', aba === 'lote');
  $('painelUnico').classList.toggle('oculto', aba !== 'unico');
  $('painelLote').classList.toggle('oculto', aba !== 'lote');
}
$('abaUnico').addEventListener('click', () => ativarAba('unico'));
$('abaLote').addEventListener('click', () => ativarAba('lote'));

async function api(caminho, opcoes) {
  const r = await fetch(caminho, opcoes);
  return { status: r.status, dados: await r.json().catch(() => ({})) };
}
const buscarEmpresas = (t) => api('/api/empresas?q=' + encodeURIComponent(t)).then(({ dados }) => dados.empresas);
const gerar = (ids) => api('/api/gerar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });

async function baixarArquivo(url, nome) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('Falha ao obter o arquivo.');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(await r.blob());
  a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
const visualizar = (url) => window.open(url, '_blank', 'noopener');
const msg = (id, t, ok = false) => { $(id).textContent = t; $(id).classList.toggle('ok', ok); };

function ligarBusca(inputId, cb) {
  let t;
  $(inputId).addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => cb($(inputId).value.trim()), 250); });
}

/* ---------- ABA ÚNICO ---------- */
async function atualizarBuscaUnico(termo) {
  msg('msgUnico', ''); $('resultadoUnico').classList.add('oculto');
  try {
    estado.empresas = await buscarEmpresas(termo);
    renderListaUnico();
    if (!estado.empresas.length) msg('msgUnico', 'Nenhuma empresa encontrada na base de dados.');
  } catch (e) { msg('msgUnico', e.message); }
}
function renderListaUnico() {
  const l = $('listaUnico'); l.innerHTML = '';
  if (!estado.empresas.length) { l.innerHTML = '<div class="lista-vazia">Sem resultados.</div>'; return; }
  for (const e of estado.empresas) {
    const sel = estado.selecionadoUnico?.id === e.id;
    const item = document.createElement('div');
    item.className = 'item-empresa' + (sel ? ' selecionado' : '');
    item.innerHTML = `<span class="check">${sel ? '●' : '○'}</span><div><div class="nome"></div><div class="cnpj"></div></div>`;
    item.querySelector('.nome').textContent = e.nomeFantasia;
    item.querySelector('.cnpj').textContent = 'CNPJ: ' + e.cnpj;
    item.addEventListener('click', () => {
      estado.selecionadoUnico = e; estado.resultado = null;
      $('camposUnico').classList.remove('oculto');
      $('resultadoUnico').classList.add('oculto');
      $('campoEmpresaUnico').textContent = e.nomeFantasia;
      $('campoCnpjUnico').textContent = e.cnpj;
      renderListaUnico();
    });
    l.appendChild(item);
  }
}
$('btnGerarUnico').addEventListener('click', async () => {
  if (!estado.selecionadoUnico) return;
  const b = $('btnGerarUnico'); b.disabled = true; b.textContent = 'GERANDO...';
  msg('msgUnico', '');
  try {
    const { status, dados } = await gerar([estado.selecionadoUnico.id]);
    if (status === 200 && dados.sucesso) {
      estado.resultado = dados;
      $('infoArquivoUnico').textContent = dados.arquivos[0].nomeArquivo;
      $('resultadoUnico').classList.remove('oculto');
    } else msg('msgUnico', dados.mensagem || 'Não foi possível gerar o PDF.');
  } catch { msg('msgUnico', 'Erro de comunicação com o servidor.'); }
  finally { b.disabled = false; b.textContent = 'GERAR PDF'; }
});
$('verUnico').addEventListener('click', () => estado.resultado && visualizar(estado.resultado.arquivos[0].url));
$('baixarUnico').addEventListener('click', () => estado.resultado && baixarArquivo(estado.resultado.arquivos[0].url, estado.resultado.arquivos[0].nomeArquivo).catch(() => msg('msgUnico', 'Falha no download.')));
$('btnNovaUnico').addEventListener('click', () => {
  estado.selecionadoUnico = null; estado.resultado = null;
  $('camposUnico').classList.add('oculto'); $('resultadoUnico').classList.add('oculto');
  $('buscaUnico').value = ''; renderListaUnico();
});

/* ---------- ABA LOTE ---------- */
async function atualizarBuscaLote(termo) {
  msg('msgLote', ''); $('resultadoLote').classList.add('oculto');
  try {
    estado.empresas = await buscarEmpresas(termo);
    renderListaLote();
    if (!estado.empresas.length) msg('msgLote', 'Nenhuma empresa encontrada na base de dados.');
  } catch (e) { msg('msgLote', e.message); }
}
function renderListaLote() {
  const l = $('listaLote'); l.innerHTML = '';
  if (!estado.empresas.length) { l.innerHTML = '<div class="lista-vazia">Sem resultados.</div>'; return; }
  for (const e of estado.empresas) {
    const marcado = estado.selecionadosLote.has(e.id);
    const item = document.createElement('div');
    item.className = 'item-empresa' + (marcado ? ' selecionado' : '');
    item.innerHTML = `<span class="check">${marcado ? '☑' : '☐'}</span><div><div class="nome"></div><div class="cnpj"></div></div>`;
    item.querySelector('.nome').textContent = e.nomeFantasia;
    item.querySelector('.cnpj').textContent = 'CNPJ: ' + e.cnpj;
    item.addEventListener('click', () => {
      marcado ? estado.selecionadosLote.delete(e.id) : estado.selecionadosLote.set(e.id, e);
      renderListaLote(); renderSelecionadosLote();
    });
    l.appendChild(item);
  }
}
function renderSelecionadosLote() {
  const n = estado.selecionadosLote.size;
  $('contadorLote').textContent = n + ' empresa(s) selecionada(s)';
  $('btnLimparLote').classList.toggle('oculto', n === 0);
  $('camposLote').classList.toggle('oculto', n === 0);
  $('btnGerarLote').textContent = n > 0 ? `GERAR DOCUMENTOS (${n})` : 'GERAR DOCUMENTOS';
  const chips = $('selecionadasLote'); chips.innerHTML = '';
  for (const e of estado.selecionadosLote.values()) {
    const c = document.createElement('span');
    c.className = 'chip'; c.textContent = `${e.nomeFantasia} (${e.cnpj})`;
    chips.appendChild(c);
  }
}
$('btnLimparLote').addEventListener('click', () => {
  estado.selecionadosLote.clear(); estado.resultado = null;
  renderListaLote(); renderSelecionadosLote(); $('resultadoLote').classList.add('oculto');
});
$('btnGerarLote').addEventListener('click', async () => {
  const ids = [...estado.selecionadosLote.keys()];
  if (!ids.length) return;
  const b = $('btnGerarLote'); b.disabled = true; b.textContent = 'GERANDO...';
  msg('msgLote', '');
  try {
    const { status, dados } = await gerar(ids);
    if (status === 200 && dados.sucesso) {
      estado.resultado = dados;
      $('seloResultadoLote').textContent = dados.mensagem.toUpperCase();
      const lista = $('listaResultadosLote'); lista.innerHTML = '';
      for (const arq of dados.arquivos) {
        const item = document.createElement('div');
        item.className = 'resultado-item';
        const info = document.createElement('div'); info.className = 'info';
        const b1 = document.createElement('b'); b1.textContent = arq.nomeFantasia;
        info.appendChild(b1);
        info.appendChild(document.createTextNode(` — ${arq.cnpj} — ${arq.nomeArquivo}`));
        const ac = document.createElement('div'); ac.className = 'acoes-mini';
        const v = document.createElement('button'); v.className = 'btn-mini-ver'; v.textContent = 'Visualizar';
        v.addEventListener('click', () => visualizar(arq.url));
        const d = document.createElement('button'); d.className = 'btn-mini-baixar'; d.textContent = 'Baixar';
        d.addEventListener('click', () => baixarArquivo(arq.url, arq.nomeArquivo).catch(() => msg('msgLote', 'Falha no download.')));
        ac.appendChild(v); ac.appendChild(d);
        item.appendChild(info); item.appendChild(ac);
        lista.appendChild(item);
      }
      $('resultadoLote').classList.remove('oculto');
    } else msg('msgLote', dados.mensagem || 'Não foi possível gerar os documentos.');
  } catch { msg('msgLote', 'Erro de comunicação com o servidor.'); }
  finally { b.disabled = false; renderSelecionadosLote(); }
});
$('baixarZipLote').addEventListener('click', () =>
  estado.resultado?.zip && baixarArquivo(estado.resultado.zip.url, estado.resultado.zip.nomeArquivo).catch(() => msg('msgLote', 'Falha no download do ZIP.')));
$('btnNovaLote').addEventListener('click', () => {
  estado.selecionadosLote.clear(); estado.resultado = null;
  $('resultadoLote').classList.add('oculto'); renderSelecionadosLote(); renderListaLote();
});

ligarBusca('buscaUnico', atualizarBuscaUnico);
ligarBusca('buscaLote', atualizarBuscaLote);
atualizarBuscaUnico('');
atualizarBuscaLote('');
ativarAba('unico');