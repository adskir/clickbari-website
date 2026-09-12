// OAuth proxy tra Decap CMS e GitHub — nessuna dipendenza esterna.
// Da incollare così com'è nell'editor online di Cloudflare Workers.
//
// Richiede due variabili d'ambiente configurate nel Worker (Settings -> Variables):
//   GITHUB_CLIENT_ID     -> Client ID della tua OAuth App su GitHub
//   GITHUB_CLIENT_SECRET -> Client Secret della tua OAuth App su GitHub (da salvare come "Secret", non testo in chiaro)

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/auth") {
      const state = crypto.randomUUID();
      const redirectUri = `${url.origin}/callback`;
      const githubUrl = new URL("https://github.com/login/oauth/authorize");
      githubUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
      githubUrl.searchParams.set("redirect_uri", redirectUri);
      githubUrl.searchParams.set("scope", "repo,user");
      githubUrl.searchParams.set("state", state);
      return Response.redirect(githubUrl.toString(), 302);
    }

    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");

      const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code: code,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        return new Response(`Errore OAuth: ${tokenData.error_description || tokenData.error}`, {
          status: 400,
        });
      }

      const content = { token: tokenData.access_token, provider: "github" };

      const html = `
<!DOCTYPE html>
<html>
<body>
<script>
(function() {
  function receiveMessage(message) {
    window.opener.postMessage(
      'authorization:github:success:${JSON.stringify(content).replace(/'/g, "\\'")}',
      message.origin
    );
    window.removeEventListener("message", receiveMessage, false);
  }
  window.addEventListener("message", receiveMessage, false);
  window.opener.postMessage("authorizing:github", "*");
})();
</script>
</body>
</html>`;

      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    }

    return new Response("Decap CMS GitHub OAuth proxy — attivo.", { status: 200 });
  },
};
