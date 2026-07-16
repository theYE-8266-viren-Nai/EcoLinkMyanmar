const SWAGGER_UI_VERSION = "5.32.8";

const swaggerDocument = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>EcoLink AI Scanner API</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@${SWAGGER_UI_VERSION}/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@${SWAGGER_UI_VERSION}/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: "/api/openapi",
        dom_id: "#swagger-ui",
        deepLinking: true,
        displayRequestDuration: true,
        persistAuthorization: false,
        tryItOutEnabled: true
      });
    </script>
  </body>
</html>`;

export function GET() {
  return new Response(swaggerDocument, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Security-Policy": [
        "default-src 'none'",
        "connect-src 'self'",
        "img-src 'self' data:",
        "script-src 'unsafe-inline' https://unpkg.com",
        "style-src 'unsafe-inline' https://unpkg.com",
      ].join("; "),
      "Content-Type": "text/html; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
