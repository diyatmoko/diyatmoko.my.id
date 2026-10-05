# Yanuar Diyatmoko — Engineering with intent

A personal portfolio built with **React, Vite, TypeScript, and GSAP**. An editorial ivory and forest-green design, an interactive orbital sculpture, and a considered mix of motion and typography.

The public profile is grounded in Yanuar's supplied professional background. Project descriptions distinguish an evolving personal platform, professional areas of practice, and experimental research. No invented employers, performance metrics, testimonials, or contact addresses are published.

## Features

- Responsive layout, verified from 320px to 1440px in English and Indonesian.
- GSAP typography entrance, scroll reveals, orbital motion, and pointer tilt.
- Operating-system reduced-motion support and a persistent pause control.
- Project filters, native accessible dialogs, keyboard navigation, and focus restoration.
- English/Indonesian language selection, persisted locally when storage is available.
- Build-time HTML prerendering, local variable font, canonical metadata, Person structured data, sitemap, and social preview image.
- Strict script CSP, immutable hashed assets, a health endpoint, and deployment headers.
- Non-root Docker + Nginx, GitHub Actions verification, SSH deployment, and automatic recovery.

## Local development

Use **Node.js 24 LTS** and npm. Dependencies are locked in `package-lock.json`.

```bash
npm ci
npm run dev
```

Vite prints the local development URL. To inspect the compiled output:

```bash
npm run build
npm run preview
```

`vite preview` is for local inspection. Use a static host or the supplied Nginx container for production.

## Verification

```bash
npx playwright install --with-deps chromium
npm run check
npm audit --audit-level=high
```

The browser suite tests the **actual production HTML and its CSP**, using `scripts/serve.mjs`. It covers hydration, filters, project dialogs, keyboard behavior, mobile navigation, persisted preferences, five viewport widths in both languages, reduced motion, SEO assets, and automated WCAG A/AA checks.

See [VALIDATION.md](./VALIDATION.md) for the completed checks and their limits.

## Edit your profile

All public copy, project information, technologies, and profile settings live in **`src/data/content.ts`**. English and Indonesian copy are kept together.

- Set `profile.email` to your verified public contact address to turn the main contact button into an email link. Until then, it opens your real GitHub profile.
- Set `profile.linkedin` to your verified profile URL to add a LinkedIn link.
- Add an optimized portrait to `public/images/yanuar.webp` and set `profile.portrait` to `images/yanuar.webp`. It replaces the animated monogram in the About section, inside the existing reveal animation. A square or 4:5 crop of at least 480px works well.
- Update both languages when adding or editing a project. Avoid confidential infrastructure, credentials, or unverified results.
- The project artwork is custom code. The MESTHI interface and research chart are illustrative portfolio visuals, not screenshots or performance claims.

The site is complete without a photo. A supplied headshot can later become a photo treatment or a recognisable illustrated character.

## Deploy

For automated deployment to your VPS, run the one-time interactive setup from your own computer:

```bash
npm run deploy:setup
```

It uses your existing administrator SSH access and GitHub CLI to create a deployment key and configure GitHub environment secrets. Subsequent releases run through **Actions → Portfolio CI & VPS → Run workflow → deploy**. Choose **rollback** to restore the previous successful release. See [VPS_GITHUB_ACTIONS.md](./VPS_GITHUB_ACTIONS.md) for prerequisites, the initial domain/TLS setup, and optional automatic deployments on `main`.

After the first VPS deployment, configure the public Docker Nginx once with `sudo python3 scripts/setup-domain.py`. The helper installs a dedicated HTTP/HTTPS virtual host, requests the domain certificate through Certbot webroot, verifies the served release, and configures certificate renewal. Point the domain DNS to the VPS first; complete any Certbot account prompts in the terminal. Regular releases continue through GitHub Actions.

For a manual Docker build:

```bash
docker compose up -d --build
curl --fail http://127.0.0.1:8080/health.txt
```

Or upload the contents of `dist/` after `npm run build` to a static host. See [DEPLOYMENT.md](./DEPLOYMENT.md) for custom-domain, HTTPS, caching, shared Docker network, and rollout instructions.

Build-time public settings are documented in `.env.example`. The default canonical domain is `https://diyatmoko.my.id`. `VITE_*` values are exposed to the browser; never put secrets in them.

## Project layout

```text
src/
  App.tsx                 Page sections and navigation
  components/             Orbital art, project visuals, and project dialog
  data/content.ts         Public profile, EN/ID copy, and project definitions
  hooks/                  Preferences, dialogs, and GSAP lifecycle
  styles.css              Responsive design system
  fonts.css               Local variable font
  entry-server.tsx        Prerender entry point
scripts/
  prerender.mjs           HTML, SEO, CSP, and deployment generation
  serve.mjs               Production verification server
public/                   Icons, social preview, and health endpoint
deploy/                   Nginx template and shared-network configuration
tests/                    Browser and accessibility checks
```

GSAP contexts and media queries are cleaned up when components unmount or motion preferences change. Continuous orbital animations pause outside the viewport and when the tab is hidden. Scrolling remains native.
