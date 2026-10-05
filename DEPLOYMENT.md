# Production deployment

The application is a static, prerendered portfolio. It needs no database, API keys, or application server. Choose a static host or the supplied Docker + Nginx runtime.

For automated VPS deployment with GitHub Actions, use [VPS_GITHUB_ACTIONS.md](./VPS_GITHUB_ACTIONS.md). The interactive setup configures SSH and GitHub secrets once; the workflow then ships a verified runtime image, supports manual or automatic deployment, and restores the previous release on an unsuccessful rollout. The manual options below remain available.

## Build configuration

```bash
npm ci
VITE_SITE_URL=https://diyatmoko.my.id npm run build
```

- `VITE_SITE_URL`: public site origin, used for canonical metadata and SEO URLs.
- `VITE_BASE_PATH`: base path with leading and trailing slashes. Default `/` is appropriate for `diyatmoko.my.id`.

For a project-path static host, such as GitHub Pages without a custom domain:

```bash
VITE_SITE_URL=https://diyatmoko.github.io \
VITE_BASE_PATH=/diyatmoko.my.id/ npm run build
```

The Docker configuration serves the site at `/`; use the default base path with Docker. All these values are build-time settings, so rebuild after changing them.

## Option A: static hosting

1. Build with `npm run build`.
2. Publish the **contents** of `dist/`, preserving `assets/` and all generated SEO files.
3. Point the chosen domain to the host and enable HTTPS.
4. Set the canonical domain using `VITE_SITE_URL` and rebuild if it differs from the default.
5. Check `/health.txt`, the homepage, project dialogs, and browser console on the deployed domain.

Cloudflare Pages and Netlify understand the generated `dist/_headers`. On another host, apply its header rules using that host's configuration. The generated CSP includes a hash for the Person JSON-LD block; regenerate the headers whenever rebuilding the site. Do not edit the compiled HTML by hand after the build.

Cache the homepage with `no-cache`. Files under `assets/` have content hashes and use `public, max-age=31536000, immutable`. Keep unhashed icons and SEO files revalidatable. An unknown route returns 404; navigation uses real section anchors rather than client-side routes.

## Option B: Docker + Nginx

From the repository root on a Docker Compose host:

```bash
docker compose up -d --build
docker compose ps
curl --fail http://127.0.0.1:8080/health.txt
docker compose exec -T portfolio nginx -t
docker compose exec -T portfolio id -u
```

The expected user ID is `101`. The runtime listens on port `8080`, runs with a read-only filesystem and a writable `/tmp`, drops Linux capabilities, and includes a health check. The host port is bound to `127.0.0.1` for use behind a public reverse proxy.

To use another domain:

```bash
VITE_SITE_URL=https://your-domain.example docker compose up -d --build
```

### Public Nginx on the host

Point your domain's DNS to the server, then configure your existing HTTPS Nginx virtual host to proxy to the local portfolio container:

```nginx
location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Serve `diyatmoko.my.id` over HTTPS with a valid certificate. Redirect HTTP and any `www` alias to the canonical HTTPS domain. Provision the certificate through your existing ACME/Let's Encrypt workflow before enabling a TLS virtual host that references it. Test your public Nginx configuration before reloading it. Do not replace unrelated MESTHI virtual hosts.

### Public Nginx in another Docker container

`127.0.0.1` inside the public Nginx container refers to that container. Connect both containers to a shared Docker network instead.

Use the name of a network already attached to your public Nginx:

```bash
docker network ls
PORTFOLIO_PROXY_NETWORK=your-existing-network \
docker compose -f compose.yaml -f deploy/compose.proxy.yaml up -d --build
```

In that Nginx virtual host, replace the upstream line with:

```nginx
resolver 127.0.0.11 valid=5s ipv6=off;
set $portfolio_upstream diyatmoko-portfolio:8080;
proxy_pass http://$portfolio_upstream;
```

The shared-network override gives this service the unique alias `diyatmoko-portfolio`. The loopback host binding can remain in place; the public Nginx reaches the service through the shared network. Docker DNS resolution follows changes in the upstream container's IP after recreation.

## Release verification

Before deploying a changed build:

```bash
npm ci
npx playwright install --with-deps chromium
npm run check
npm audit --audit-level=high
```

After deployment:

```bash
curl --fail --head https://diyatmoko.my.id/
curl --fail https://diyatmoko.my.id/health.txt
curl --fail https://diyatmoko.my.id/robots.txt
```

Also verify the live browser page at a desktop and mobile width, both languages, project details, keyboard focus, and the motion control. A successful health check alone does not prove the full page is working.

GitHub Actions verifies source quality, browser behavior, dependency audit, rollout recovery, and a container smoke test. It uploads `portfolio-dist` after the static checks pass. Deployment is manual by default through the workflow's `deploy` operation. A push to `main` deploys automatically only when the repository variable `VPS_AUTO_DEPLOY` is explicitly set to `true`; see [VPS_GITHUB_ACTIONS.md](./VPS_GITHUB_ACTIONS.md).

## Rollback

Keep the previous static build or a tagged runtime image before rollout. For static hosting, restore the prior complete build and its matching headers. For Docker, keep a previous image tag, update the service's image to it, and run `docker compose up -d --no-build`. Do not mix a new HTML file with old asset files or CSP headers.
