#!/usr/bin/env node
/**
 * Regenerate portfolio preview screenshots.
 *
 * Not part of the build/deploy pipeline on purpose — it needs Playwright's
 * bundled Chromium and sharp, which are too heavy to install on every CI
 * run. Set it up once, locally:
 *
 *   npm install --no-save playwright sharp
 *   npx playwright install chromium
 *   node scripts/screenshots.js                 # all sites below
 *   node scripts/screenshots.js lady-car cappuccinipuglia   # just these
 *
 * Output: src/img/portfolio/<slug>.webp (1200px wide, quality ~80,
 * capped around 120 KB by stepping quality down if needed).
 *
 * --mobile: shoots the first screen on a phone viewport (390×844 @2x)
 * instead, saved as src/img/portfolio/mobile/<slug>.webp (600px wide) —
 * used by the phone mockups in the portfolio hero.
 *   node scripts/screenshots.js --mobile barmobile cappuccinipuglia
 */

const path = require("path");
const fs = require("fs");

const SITES = [
  { slug: "beautybyksenia", url: "https://beautybyksenia.com" },
  { slug: "ktiphairextension", url: "https://ktiphairextension.com" },
  { slug: "remarkafilm", url: "https://remarkafilm.com.ua" },
  { slug: "lady-car", url: "https://lady-car.it" },
  { slug: "salernofitness", url: "https://salernofitness.it" },
  { slug: "cappuccinipuglia", url: "https://cappuccinipuglia.it" },
  { slug: "blackmobiledetailing", url: "https://www.blackmobiledetailing.com" },
  { slug: "barmobile", url: "https://barmobile.it" },
  { slug: "babygreensbari", url: "https://babygreensbari.it" },
  // Add new entries here once a project's site is ready to be reshot —
];

const MOBILE = process.argv.includes("--mobile");
const OUT_DIR = path.join(__dirname, "..", "src", "img", "portfolio", ...(MOBILE ? ["mobile"] : []));
const VIEWPORT = MOBILE ? { width: 390, height: 844 } : { width: 1440, height: 900 };
const SCALE = MOBILE ? 2 : 1;
const TARGET_WIDTH = MOBILE ? 600 : 1200;
const TARGET_QUALITY = MOBILE ? 84 : 80;
const MAX_BYTES = (MOBILE ? 90 : 120) * 1024;

// Common cookie-consent banners, chat widgets and floating buttons that
// would otherwise show up in a "first screen" screenshot. Extend this list
// if a given site uses something not covered here.
const HIDE_CSS = `
  #cookie-banner, .cookie-banner, .cookie-consent, .cookieconsent,
  .cc-window, .cc-banner, #cc-window,
  #onetrust-banner-sdk, #onetrust-consent-sdk, .onetrust-pc-dark-filter,
  .cky-consent-container, .cky-overlay,
  #CybotCookiebotDialog, #CybotCookiebotDialogBodyUnderlay,
  .fc-consent-root, .fc-dialog-overlay,
  #usercentrics-root, [id*="usercentrics"],
  #hs-eu-cookie-confirmation, .hs-cookie-notification-position,
  .klaro, #klaro,
  [class*="cookie-notice"], [id*="cookie-notice"],
  [class*="gdpr"], [id*="gdpr"],
  #crisp-client, .intercom-lightweight-app, #tawkchat-container,
  iframe[title*="chat" i], iframe[title*="messenger" i],
  .elfsight-app, [class*="chat-widget"], [id*="chat-widget"],
  a[href*="wa.me"], a[href*="api.whatsapp.com"],
  [class*="whatsapp-float" i], [class*="whatsapp-button" i],
  [class*="popup" i]:not(body), [class*="newsletter-popup" i],
  [class*="exit-intent" i]
  { display: none !important; visibility: hidden !important; opacity: 0 !important; }
  html, body { scrollbar-width: none !important; }
`;

async function shoot(playwright, slug, url) {
  const launchOpts = { headless: true, args: [] };
  // Optional override for environments where Playwright's own browser
  // download isn't available/matching (e.g. a sandboxed CI image that
  // ships a pinned Chromium build) — point this at that binary instead
  // of running `npx playwright install chromium`.
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) {
    launchOpts.executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;
  }
  // Optional: trust one specific additional CA by its SPKI pin (base64
  // sha256 of the public key) instead of disabling verification outright
  // — needed in sandboxes that MITM outbound TLS for policy inspection
  // with their own CA. Leave unset on a normal machine.
  if (process.env.PLAYWRIGHT_TRUST_SPKI) {
    launchOpts.args.push(
      `--ignore-certificate-errors-spki-list=${process.env.PLAYWRIGHT_TRUST_SPKI}`
    );
  }
  // Optional: route Chromium through an HTTP(S) proxy if one is set in
  // the environment (Playwright doesn't pick HTTPS_PROXY up by itself).
  if (process.env.HTTPS_PROXY) {
    launchOpts.proxy = { server: process.env.HTTPS_PROXY };
  }
  const browser = await playwright.chromium.launch(launchOpts);
  try {
    const page = await browser.newPage({
      viewport: VIEWPORT,
      deviceScaleFactor: SCALE,
      isMobile: MOBILE,
      hasTouch: MOBILE,
    });
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.addStyleTag({ content: HIDE_CSS });
    // Give late animations/preloaders/lazy hero media a moment to settle.
    await page.waitForTimeout(2500);

    const pngPath = path.join(OUT_DIR, `${slug}.tmp.png`);
    await page.screenshot({ path: pngPath, fullPage: false });
    await browser.close();
    return pngPath;
  } catch (err) {
    await browser.close();
    throw err;
  }
}

async function toWebp(sharp, pngPath, slug) {
  const outPath = path.join(OUT_DIR, `${slug}.webp`);
  let quality = TARGET_QUALITY;
  let buffer;
  while (quality >= 40) {
    buffer = await sharp(pngPath)
      .resize({ width: TARGET_WIDTH })
      .webp({ quality })
      .toBuffer();
    if (buffer.length <= MAX_BYTES || quality <= 40) break;
    quality -= 8;
  }
  fs.writeFileSync(outPath, buffer);
  fs.unlinkSync(pngPath);
  console.log(
    `${slug}.webp: quality=${quality}, ${(buffer.length / 1024).toFixed(1)} KB`
  );
}

async function main() {
  let playwright, sharp;
  try {
    playwright = require("playwright");
    sharp = require("sharp");
  } catch (err) {
    console.error(
      "Missing dependency. Run first:\n  npm install --no-save playwright sharp\n  npx playwright install chromium"
    );
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const requested = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const targets = requested.length
    ? SITES.filter((s) => requested.includes(s.slug))
    : SITES;

  if (!targets.length) {
    console.error("No matching site slug(s). Known slugs:", SITES.map((s) => s.slug).join(", "));
    process.exit(1);
  }

  for (const { slug, url } of targets) {
    console.log(`Shooting ${slug} (${url})...`);
    try {
      const pngPath = await shoot(playwright, slug, url);
      await toWebp(sharp, pngPath, slug);
    } catch (err) {
      console.error(`Failed for ${slug}:`, err.message);
    }
  }
}

main();
