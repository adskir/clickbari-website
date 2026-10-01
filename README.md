# ClickBari — sito su Eleventy (11ty)

Questo repository contiene il sito **clickbari.it**, generato con Eleventy
(11ty) e pubblicato su hosting OVH.

## URL e dominio

- Gli URL sono **puliti, senza `.html`** (es. `/servizi/`, `/portfolio/`,
  `/blog/...`). Ogni pagina sorgente in `src/` ha un blocco di
  configurazione in testa (`permalink: nome/index.html`) che dice a
  Eleventy con che URL pubblicarla.
- Il dominio canonico è **`https://clickbari.it`** (senza `www`). Il base
  URL è definito in un solo punto, `src/_data/site.json`, usato da tutte
  le pagine per `canonical`, `og:url`, lo schema JSON-LD e la sitemap.
  Non ci sono redirect configurati (niente `.htaccess`): se cambi il
  dominio, aggiorna solo `site.json` e la costante `SITE_URL` in
  `.eleventy.js`.

## Struttura

- **Il blog è "a dati"**: le anteprime "in arrivo" vivono in
  `src/_data/blogComingPosts.json`. `blog.html` le mostra insieme agli
  articoli realmente pubblicati (presi dalla collection `posts`), con
  contatori per categoria calcolati solo sugli articoli pubblicati (una
  categoria senza articoli pubblicati mostra "In arrivo" invece di "0
  articoli").
- **Le pagine principali** (chi-sono, servizi, portfolio, ecc.) non sono
  unificate in un layout comune, perché ognuna ha CSS personalizzato al
  suo interno. Il layout condiviso (`src/_includes/post.njk`) esiste solo
  per gli articoli del blog.
- **`src/sitemap.njk`** genera `sitemap.xml` automaticamente: le pagine
  principali sono elencate nel template, mentre ogni articolo pubblicato
  in `src/posts/` ci finisce da solo tramite la collection `posts` — non
  serve aggiornarla a mano. Le anteprime "in arrivo" non ci compaiono
  (non hanno una pagina reale).

## Come pubblicare un vero articolo di blog

1. Apri `src/posts/_esempio-articolo.md.example` — mostra la struttura da
   copiare (categoria, data, tempo di lettura, testo in Markdown). Il
   layout supporta anche un campo `faq` opzionale nel front-matter (lista
   di `{q, a}`) per generare una sezione FAQ con dati strutturati — vedi
   `src/posts/2026-10-15-quanto-costa-un-sito-web-a-bari.md` come esempio.
2. Crea un nuovo file dentro `src/posts/`, es. `2026-10-20-titolo-articolo.md`
   (l'estensione deve essere `.md`, non `.example`).
3. Scrivi l'articolo in Markdown nel corpo del file.
4. Fai commit e push — Eleventy genera automaticamente la pagina vera
   all'URL indicato nel campo `permalink` del file, la aggiunge alla
   griglia di `/blog/` e alla sitemap.
5. Aggiorna manualmente `src/_data/blogComingPosts.json` togliendo la voce
   "in arrivo" corrispondente, se l'articolo pubblicato la sostituisce.

Con Decap CMS collegato (passo successivo, non ancora incluso in questo
repository) questo stesso flusso si farà da un'interfaccia visuale, senza
scrivere Markdown a mano.

## Comandi

```bash
npm install
npm run build   # genera il sito in _site/
npm run serve   # anteprima locale con ricaricamento automatico
```

## Deploy

1. Push su `main` → una GitHub Action (`.github/workflows/build.yml`)
   installa le dipendenze, esegue `npm run build` e pubblica il
   contenuto di `_site/` sul branch `dist` (deploy incrementale, non
   forzato, così OVH può sempre fare un pull normale).
2. L'hosting OVH (sezione "Multisito") è collegato via Git al branch
   `dist` di questo repository, con un webhook che avvisa OVH ad ogni
   push su `dist` e sincronizza i file pubblicati.
