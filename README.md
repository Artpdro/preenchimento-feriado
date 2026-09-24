# Sistema de Preenchimento de PDF por CNPJ

Sistema web simples (sem login) para preencher automaticamente um documento PDF
modelo — campos **Empresa** (Nome Fantasia) e **CNPJ** — a partir de uma base de
empresas importada previamente de um arquivo Excel.

## Como funciona

1. O Excel com as empresas é importado **uma única vez** para um banco SQLite.
2. O usuário digita um CNPJ na tela.
3. O sistema valida, consulta a base e exibe o Nome Fantasia.
4. Ao clicar em **GERAR PDF**, o texto é sobreposto no PDF modelo original
   (stamping) nas coordenadas configuradas — o documento original não é alterado.

## Estrutura de pastas

```
/
├── backend/
│   ├── config/pdf.config.js   <- COORDENADAS DOS CAMPOS (edite só aqui)
│   ├── routes/api.js          <- rotas /api/buscar e /api/gerar
│   ├── services/pdfService.js <- preenchimento do PDF (pdf-lib)
│   ├── utils/cnpj.js          <- validação/normalização/formatação de CNPJ
│   ├── db.js                  <- SQLite (empresas.db)
│   └── server.js              <- servidor Express
├── frontend/                  <- tela única (HTML/CSS/JS, sem build)
├── scripts/
│   ├── import-excel.js        <- importa o Excel para o banco
│   └── calibrate.js           <- gera grade de coordenadas para calibrar
├── templates/
│   └── modelo.pdf             <- O PDF MODELO (substitua pelo seu PDF real)
├── uploads/
│   └── empresas.xlsx          <- O EXCEL com a base de empresas
├── database/                  <- banco SQLite (gerado automaticamente)
├── output/                    <- PDFs gerados + calibracao.pdf
├── package.json
└── README.md
```

## Instalação

Pré-requisito: **Node.js 22.5 ou superior** (https://nodejs.org) — o banco de dados usa o SQLite embutido do Node (`node:sqlite`), então **não há nada a compilar**; o `npm install` baixa apenas JavaScript puro. Funciona em qualquer pasta, inclusive com espaços no caminho.

```bash
# 1) Instalar dependências
npm install

# 2) Colocar o Excel na pasta uploads/ (nome sugerido: empresas.xlsx)
#    A 1ª linha deve ter os cabeçalhos, ex.:
#      CNPJ              | Nome Fantasia
#      00.000.000/0001-00| Empresa Exemplo LTDA
#    (maiúsculas/minúsculas e acentos são aceitos)

# 3) Importar o Excel para o banco
npm run import
#    ou, informando outro caminho:
npm run import -- /caminho/outro-arquivo.xlsx

# 4) Colocar o PDF modelo em:  templates/modelo.pdf

# 5) Iniciar o sistema
npm start
#    Acesse: http://localhost:3000
```

## Ajustar as coordenadas dos campos no PDF (IMPORTANTE)

As coordenadas ficam centralizadas em **`backend/config/pdf.config.js`** — você
NÃO precisa alterar nenhum outro arquivo.

```bash
npm run calibrate
```
Isso gera `output/calibracao.pdf`: uma cópia do modelo com uma grade numerada
(linhas vermelhas = coordenada X a partir da esquerda; linhas azuis =
distância a partir do topo). Abra esse arquivo, veja onde cada campo começa e
ajuste `x` e `yFromTop` no `pdf.config.js`. Reinicie o servidor (`Ctrl+C` e
`npm start`) para aplicar.

Configuração atual (exemplo):

```js
FIELDS: {
  empresa: { page: 1, x: 150, yFromTop: 200, fontSize: 11, minFontSize: 7, maxWidth: 380 },
  cnpj:    { page: 1, x: 150, yFromTop: 230, fontSize: 11, minFontSize: 8, maxWidth: 200 }
}
```

- `x` = distância da margem esquerda (pt)
- `yFromTop` = distância do TOPO da página (pt) — ou use `y` medido a partir de baixo
- `maxWidth` = largura máxima do campo; se o texto for maior, a fonte reduz
  automaticamente até `minFontSize`

## Publicar em um servidor

Qualquer VPS com Node.js serve. Exemplo com PM2 (recomendado):

```bash
npm install -g pm2
pm2 start backend/server.js --name preenchimento-pdf
pm2 save && pm2 startup     # reinicia sozinho se o servidor cair
```

E, na frente, um nginx como proxy reverso + HTTPS:

```nginx
server {
    listen 80;
    server_name seu-dominio.com.br;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

(HTTPS gratuito com Certbot: `sudo certbot --nginx -d seu-dominio.com.br`)

Outras opções: Railway, Render, VPS com Docker etc. — basta garantir que as
pastas `templates/`, `database/` e `output/` existam e o processo tenha
permissão de escrita nelas.

## Segurança e privacidade

- Sem login por solicitação: a tela exige apenas o CNPJ.
- Não existe rota pública de "listar empresas" — só consulta por CNPJ exato.
- O Excel (`uploads/`) e o banco (`database/`) **nunca** são servidos pelo Express.
- O PDF modelo (`templates/`) não é servido — apenas os PDFs já preenchidos.
- Download restrito a arquivos com nome `notificacao_XX.XXX.XXX/XXXX-XX.pdf`
  (proteção contra path traversal).
- Todas as queries usam parâmetros (sem SQL injection).
- CNPJ validado (14 dígitos) antes de qualquer consulta.
- Para uso na internet, recomenda-se HTTPS (ver acima) e, se desejar,
  `helmet` + rate limiting (`express-rate-limit`) como camadas extras.

## Teste rápido

O projeto já vem com dados de exemplo:

- `uploads/empresas_exemplo.xlsx` — 5 empresas fictícias
- `templates/modelo.pdf` — modelo de exemplo com os campos "Empresa:" e "CNPJ:"

```bash
npm run import -- uploads/empresas_exemplo.xlsx
npm start
```
Depois busque o CNPJ `12.345.678/0001-90` (empresa fictícia) e gere o PDF.

## Solução de problemas

| Problema | Solução |
|---|---|
| "Empresa não encontrada" | Confira se o CNPJ está na planilha e se a importação rodou sem erros |
| "PDF modelo não encontrado" | Verifique se `templates/modelo.pdf` existe |
| Texto fora do lugar | Rode `npm run calibrate` e ajuste `pdf.config.js` |
| Texto sobre o rótulo | Aumente `x` para começar depois do texto "Empresa:" |
| Texto grande demais | Reduza `fontSize` inicial ou aumente `maxWidth` |
| Porta ocupada | `PORT=8080 npm start` |
| `No such built-in module: node:sqlite` | Seu Node é antigo (< 22.5). Atualize o Node.js |
| Erro de compilação (`node-gyp`, `make`) | Use a versão 1.1.0 do pacote: ela não tem dependências nativas |

## Observação importante sobre o PDF real

Este pacote foi entregue com um **modelo de exemplo**. Para usar o seu
documento real, substitua `templates/modelo.pdf` e calibre as coordenadas
(`npm run calibrate`). Se quiser, envie o PDF real para que as coordenadas
sejam medidas e ajustadas no `pdf.config.js` antes da implantação.
