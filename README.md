# STONEHEIR — Real Estate Intelligence Platform

Site completo + painel interno da Stoneheir.

## Estrutura

```
stoneheir-site/
├── index.html          ← Página HTML principal
├── package.json        ← Dependências e scripts
├── vite.config.js      ← Configuração do Vite
├── src/
│   ├── main.jsx        ← Entry point (inclui polyfill de storage)
│   └── App.jsx         ← Aplicação completa (público + painel)
└── README.md           ← Este arquivo
```

## Rodar localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173`

## Build para produção

```bash
npm run build
```

Gera a pasta `dist/` com os arquivos otimizados.

---

## 🚀 Opções de Deploy (da mais fácil para a mais avançada)

### Opção 1: Vercel (RECOMENDADA — Gratuita)

1. Crie conta em [vercel.com](https://vercel.com)
2. Instale a CLI: `npm i -g vercel`
3. Na pasta do projeto, rode: `vercel`
4. Siga as instruções (aceite os defaults)
5. Pronto! Seu site estará em `stoneheir.vercel.app`

**Para domínio próprio:** No dashboard da Vercel → Settings → Domains → adicione `stoneheir.com.br`

### Opção 2: Netlify (Gratuita)

1. Rode `npm run build`
2. Acesse [app.netlify.com/drop](https://app.netlify.com/drop)
3. Arraste a pasta `dist/` para o navegador
4. Pronto! Ganha URL tipo `stoneheir.netlify.app`

### Opção 3: GitHub Pages (Gratuita)

1. Crie repositório no GitHub
2. Push do código
3. Configure GitHub Actions para build automático
4. Acesse em `seuuser.github.io/stoneheir-site`

### Opção 4: Hostinger / HostGator / Locaweb

1. Rode `npm run build`
2. Faça upload da pasta `dist/` via FTP no diretório `public_html`
3. Pronto! Funciona como site estático

---

## Domínio Personalizado

Para usar `stoneheir.com.br`:

1. Registre o domínio no Registro.br (~R$ 40/ano)
2. No painel do Registro.br, aponte o DNS para o serviço escolhido:
   - **Vercel:** Adicione CNAME `cname.vercel-dns.com`
   - **Netlify:** Adicione CNAME do seu site Netlify
3. No painel do hosting, adicione o domínio personalizado
4. HTTPS é automático em Vercel/Netlify

---

## Credenciais de Acesso ao Painel

O login aceita qualquer email + senha com 4+ caracteres.
Para produção, substitua por autenticação real (Supabase, Firebase Auth, etc.)

---

## Tecnologias

- **React 18** — Interface
- **Vite 5** — Build tool
- **localStorage** — Persistência (substituir por banco em produção)
- **Google Fonts** — Playfair Display, Source Serif 4, JetBrains Mono

---

*STONEHEIR — Real Estate Intelligence*
*Uma empresa do ecossistema Realty Concierge*
