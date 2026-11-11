// OAuth proxy tra Decap CMS e GitHub — nessuna dipendenza esterna.
// Da incollare così com'è nell'editor online di Cloudflare Workers.
//
// Variabili d'ambiente del Worker (Settings -> Variables and Secrets):
//   GITHUB_CLIENT_ID      -> Client ID della OAuth App su GitHub (testo)
//   GITHUB_CLIENT_SECRET  -> Client Secret della OAuth App (tipo "Secret", mai in chiaro)
//   ALLOWED_ORIGINS       -> siti autorizzati a usare questo login, separati da virgola
//                            es. "https://clickbari.it,https://cappuccinipuglia.it"
//
// Sicurezza:
// - il token viene consegnato SOLO a una finestra aperta da un sito in ALLOWED_ORIGINS
//   (senza questo controllo qualsiasi sito potrebbe farsi dare il token di chi ha già
//   autorizzato l'app su GitHub);
// - il parametro "state" viene verificato con un cookie, contro il CSRF;
// - scope "public_repo": basta per repository pubblici (per i privati: "repo").

const SCOPE = "public_repo";

function allowedOrigins(env) {
  return (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

function getCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[1]) : null;
}

function page(status, message, origins, payload) {
  // payload: stringa "authorization:github:success:{...}" oppure "...:error:{...}"
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Accesso</title></head>
<body><p>${message}</p>
<script>
(function () {
  var allowed = ${JSON.stringify(origins)};
  var payload = ${JSON.stringify(payload)};
  if (!window.opener) return;
  function receive(e) {
    if (allowed.indexOf(e.origin) === -1) return;
    window.opener.postMessage(payload, e.origin);
    window.removeEventListener("message", receive, false);
  }
  window.addEventListener("message", receive, false);
  allowed.forEach(function (o) { window.opener.postMessage("authorizing:github", o); });
})();
</script></body></html>`;
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      // il cookie "state" serve solo una volta
      "Set-Cookie": "oauth_state=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax",
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origins = allowedOrigins(env);

    if (url.pathname === "/auth") {
      const state = crypto.randomUUID();
      const githubUrl = new URL("https://github.com/login/oauth/authorize");
      githubUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
      githubUrl.searchParams.set("redirect_uri", `${url.origin}/callback`);
      githubUrl.searchParams.set("scope", SCOPE);
      githubUrl.searchParams.set("state", state);
      return new Response(null, {
        status: 302,
        headers: {
          Location: githubUrl.toString(),
          "Set-Cookie": `oauth_state=${state}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
          "Cache-Control": "no-store",
        },
      });
    }

    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const expected = getCookie(request, "oauth_state");

      if (!code || !state || !expected || state !== expected) {
        return page(400, "Accesso non valido o scaduto. Chiudi questa finestra e riprova.", origins,
          "authorization:github:error:" + JSON.stringify({ message: "invalid state" }));
      }

      const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });
      const tokenData = await tokenResponse.json();

      if (tokenData.error || !tokenData.access_token) {
        return page(400, "Errore di accesso. Chiudi questa finestra e riprova.", origins,
          "authorization:github:error:" + JSON.stringify({ message: tokenData.error_description || tokenData.error || "no token" }));
      }

      return page(200, "Accesso eseguito, puoi chiudere questa finestra.", origins,
        "authorization:github:success:" + JSON.stringify({ token: tokenData.access_token, provider: "github" }));
    }

    return new Response("Decap CMS GitHub OAuth proxy — attivo.", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  },
};
