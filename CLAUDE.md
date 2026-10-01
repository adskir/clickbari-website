# ClickBari — regole del progetto

Sito **clickbari.it**, statico, generato con Eleventy (11ty) e pubblicato su
hosting OVH. Queste note sono per chi (umano o Claude) lavora su questo
repository in una sessione futura — leggerle prima di toccare build, deploy
o la struttura del portfolio.

## Stack

- **Eleventy (11ty) 2.x**, sorgenti in `src/`, output in `_site/`.
- `htmlTemplateEngine`/`markdownTemplateEngine`: `njk` (Nunjucks). Ogni
  pagina `.html` dentro `src/` è a tutti gli effetti un template Nunjucks
  con front-matter (`permalink: nome/index.html`), non solo markup statico.
- **Nessun framework CSS/JS** — ogni pagina ha il proprio `<style>` inline.
  Le pagine NON condividono un layout comune (ognuna ha CSS personalizzato);
  l'unico layout condiviso è `src/_includes/post.njk`, usato dagli articoli
  del blog. **`src/post.njk`** (alla radice di `src/`, fuori da
  `_includes/`) è un duplicato tenuto sincronizzato a mano con
  `_includes/post.njk` — se modifichi uno, applica la stessa modifica
  all'altro (diff dei due file deve restare vuoto). Ha `permalink: false`
  per non generare una pagina orfana.
- **URL puliti, senza `.html`** (`/servizi/`, `/portfolio/`, ecc.), dominio
  canonico **senza `www`**: `https://clickbari.it`. Il base URL è definito
  in un solo punto, `src/_data/site.json` (uso nei template: `{{ site.url }}`)
  e nella costante `SITE_URL` in cima a `.eleventy.js` (usata dai filtri
  `absoluteUrl`/`articleJsonLd`). Se cambia il dominio, aggiorna entrambi.
  **Non aggiungere redirect/`.htaccess`** — non fanno parte di questo setup.
- Tutti i link interni, `src`/`href` di loghi e favicon devono essere
  **assoluti** (`/logo-icon.png`, non `logo-icon.png`) — su qualunque pagina
  diversa dalla home un path relativo si risolve nella sottocartella
  sbagliata e rompe silenziosamente l'immagine.
- `src/sitemap.njk` genera `sitemap.xml` automaticamente: le pagine
  principali sono elencate nel template, gli articoli pubblicati in
  `src/posts/` ci finiscono da soli tramite `collections.posts`. Le
  anteprime "in arrivo" del blog (`src/_data/blogComingPosts.json`) non ci
  compaiono: non hanno una pagina reale.
- Variabili CSS condivise (ripetute nel `:root` di ogni pagina, non in un
  file CSS unico): `--radius-lg:18px` (card/modali/blocchi),
  `--radius-md:10px` (bottoni/filtri/campi form), `--radius-sm:6px` (tag).
  Nuovi elementi arrotondati vanno su una di queste variabili, non su un
  valore fisso in px.

## Deploy

```
push su main → GitHub Action (.github/workflows/build.yml)
  → npm install && npm run build
  → pubblica _site/ sul branch "dist" (deploy incrementale, mai force_orphan:
    un push che riscrive la storia di "dist" rompe il pull lato OVH)
→ OVH (Hosting → Multisito) è collegato via Git al branch "dist"
  → un webhook GitHub → OVH avvisa ad ogni push su "dist" e sincronizza
```

- **Mai** rimettere `force_orphan: true` in `build.yml` — è la causa
  originale per cui il Git deploy su OVH restava bloccato su "Errore".
- Il webhook è configurato sul repository GitHub
  (`Settings → Webhooks`, URL `https://webhooks-webhosting.eu.ovhapis.com/...`,
  evento *push*). Se un deploy non arriva a OVH nonostante la Action sia
  verde, controlla prima lì (Recent Deliveries) prima di sospettare il
  codice.
- Workflow di lavoro concordato con il proprietario del sito: push diretto
  su `main` dopo ogni modifica richiesta in chat, senza passare da PR —
  deploy automatico nel giro di qualche minuto. Nessuna conferma
  supplementare richiesta prima del push, a meno che la modifica non sia
  distruttiva o incerta (in quel caso chiedere prima).

## Struttura del portfolio (`src/portfolio.html`)

- Griglia card (`.progetti-grid` → `.p-card`): 3 colonne desktop, 2 a
  `≤1024px`, 1 a `≤768px`. Tutte le card hanno la stessa altezza
  (`.p-card-desc` è clampata a 3 righe); niente card "featured"/più larga.
- Ogni card: `id` = slug del progetto, `data-tags` = valori filtrabili
  separati da spazio. I filtri attivi sono `sito-web`, `google-ads`,
  `in-corso` (bottoni in `.filtri`); altri valori (es. `seo`) possono stare
  in `data-tags` per coerenza/futuro ma non hanno un bottone filtro oggi.
- **Card con sito pubblicato**: `.p-card-visual` contiene un `<img>` verso
  `/img/portfolio/<slug>.webp` (1200×750, `width`/`height` espliciti,
  `decoding="async"`, `loading="eager"` solo per le prime 3 card sopra la
  piega, `loading="lazy"` per le altre).
- **Card "in arrivo"** (sito non ancora pronto da mostrare): niente
  `<img>` — `.p-card-visual.p-card-visual-placeholder` con un
  `.placeholder-name` (nome progetto in Bebas Neue) e un badge
  `.coming-badge` "In arrivo" in alto a destra. Stato attuale (ottobre
  2026): Black Mobile Detailing (Toronto, car detailing — manca ancora
  l'URL del sito, per cui la card non ha link "Visita il sito"), Baby
  Greens Bari (e-commerce di microgreens, babygreensbari.it, tag "In
  corso"), Bar Mobile (barmobile.it, tag "In corso").
- Per sostituire un placeholder con lo screenshot reale: aggiungi la voce
  in `scripts/screenshots.js` (`SITES`), esegui lo script, poi nel markup
  sostituisci `.p-card-visual-placeholder`/`.placeholder-name`/
  `.coming-badge` con l'`<img>` nello stesso formato delle altre card
  (vedi sopra) e togli il tag "In corso" se non più pertinente.

## `scripts/screenshots.js`

Genera gli screenshot del primo schermo (1440×900, solo viewport, non
full-page) dei siti in portfolio, nasconde cookie-banner/chat-widget/
pulsanti WhatsApp comuni via CSS prima dello scatto, e salva un WebP
ottimizzato (1200px di larghezza, qualità ~80, ridotta a scalare fino a
restare sotto ~120 KB) in `src/img/portfolio/<slug>.webp`.

**Non è collegato a `npm install`/alla build** di proposito — scaricherebbe
Playwright + il suo Chromium ad ogni deploy. Setup una tantum, in locale:

```bash
npm install --no-save playwright sharp
npx playwright install chromium
node scripts/screenshots.js                              # tutti i siti
node scripts/screenshots.js lady-car cappuccinipuglia     # solo questi
```

Due variabili d'ambiente opzionali, utili solo in ambienti sandboxati che
non hanno un normale accesso di rete/Chromium (non servono su una macchina
normale):
- `PLAYWRIGHT_CHROMIUM_PATH` — path a un Chromium già installato, se
  `npx playwright install` non è disponibile.
- `PLAYWRIGHT_TRUST_SPKI` — fa fidare Chromium di UNA CA aggiuntiva
  specifica (via `--ignore-certificate-errors-spki-list`, non disabilita
  la verifica TLS in generale) — serve se la sandbox intercetta il TLS di
  Chromium con una propria CA per ispezione.

## Cose note ma non (ancora) sistemate

- `src/README.md` (dentro `src/`, diverso dal `README.md` alla radice)
  viene compilato da Eleventy come una pagina vera a `/README/` — è un
  file caricato per errore in passato, non dovrebbe esistere come
  contenuto del sito pubblicato.
- `src/package.json`, `src/package-lock.json`, `src/config.yml`,
  `src/build.yml`, `src/blogComingPosts.json` sono doppioni (stessa
  origine dell'upload sbagliato di `src/README.md`) e non vengono
  pubblicati da Eleventy (non hanno `permalink`/non sono formati di
  template riconosciuti) — innocui ma da ripulire prima o poi.
- `/admin` (Decap CMS) non è ancora collegato a un OAuth provider:
  l'interfaccia visuale per scrivere articoli non funziona finché quel
  passaggio non viene fatto.
