# ClickBari — sito su Eleventy (11ty)

Questo repository contiene il sito clickbari.it ricostruito sullo stack
GitHub + Eleventy (11ty), pronto per il deploy su OVH tramite Git.

## Cosa è cambiato rispetto al sito originale, e cosa no

**Il contenuto visibile è identico al sito attuale** — stesso testo, stessa
struttura, stessi URL (`/index.html`, `/servizi.html`, ecc. — nessun
redirect necessario, nessuna perdita di SEO).

**Cosa è diverso "sotto il cofano":**

- Ogni pagina (`index.html`, `chi-sono.html`, `servizi.html`, ecc.) è ora un
  file dentro `src/`, con un piccolo blocco di configurazione in testa
  (`permalink: ...`) che dice a Eleventy con che nome pubblicare la pagina.
  Il resto del file è identico all'originale.
- **Il blog è diventato "a dati"**: le 12 anteprime "in arrivo" ora vivono in
  `src/_data/blogComingPosts.json` invece che scritte a mano nell'HTML.
  `blog.html` le mostra con un ciclo automatico — se aggiungi o togli una
  voce da quel file JSON, la griglia e i contatori per categoria si
  aggiornano da soli, senza toccare l'HTML.
- **Le pagine principali (chi-sono, servizi, portfolio, ecc.) NON sono state
  unificate in un layout comune**, perché ogni pagina ha CSS personalizzato
  al suo interno (non condiviso 1:1 con le altre). Unificarle forzatamente
  ora avrebbe rischiato di rompere qualcosa senza un beneficio immediato.
  È un miglioramento possibile in futuro, con calma, pagina per pagina.

## Come pubblicare un vero articolo di blog

1. Apri `src/posts/_esempio-articolo.md.example` — mostra la struttura da
   copiare (categoria, data, tempo di lettura, testo in Markdown).
2. Crea un nuovo file dentro `src/posts/`, es. `2026-10-20-titolo-articolo.md`
   (l'estensione deve essere `.md`, non `.example`).
3. Scrivi l'articolo in Markdown nel corpo del file.
4. Fai commit e push — Eleventy genera automaticamente la pagina vera
   all'URL indicato nel campo `permalink` del file.
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

## Deploy su OVH

1. Aggiungi questo repository come sorgente Git nella sezione "Multisito"
   dell'hosting OVH per il dominio clickbari.it.
2. OVH sincronizzerà i file automaticamente ad ogni push — ma se usi la
   sincronizzazione Git diretta di OVH, verifica che punti alla cartella
   `_site/` generata dalla build (serve una GitHub Action che esegua
   `npm run build` e pubblichi `_site/` su un branch dedicato, es. `dist`,
   che OVH sincronizzerà). Senza questo passaggio, OVH sincronizzerebbe i
   file sorgente grezzi invece del sito già compilato.
