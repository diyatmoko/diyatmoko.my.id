import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer, loadEnv } from 'vite'

const root = process.cwd()
const env = loadEnv('production', root, '')
const base = env.VITE_BASE_PATH || '/'
const siteUrl = new URL(env.VITE_SITE_URL || 'https://diyatmoko.my.id')
const publicUrl = new URL(base, siteUrl.origin).href
const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  mode: 'production',
})

try {
  const { render } = await server.ssrLoadModule('/src/entry-server.tsx')
  const { profile } = await server.ssrLoadModule('/src/data/content.ts')
  let html = await readFile(resolve(root, 'dist/index.html'), 'utf8')
  if (!html.includes('<!--app-html-->')) throw new Error('Prerender insertion point is missing.')
  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.name,
    url: publicUrl,
    jobTitle: 'Tech Lead, Software Architect & AI Engineer',
    description:
      '13+ years in software engineering. Enterprise systems, AI agents, and cloud engineering.',
    sameAs: [profile.github, ...(profile.linkedin ? [profile.linkedin] : [])],
    knowsAbout: [
      'Software engineering',
      'System architecture',
      'Java',
      '.NET',
      'Python',
      'Artificial intelligence',
    ],
    ...(profile.email ? { email: profile.email } : {}),
  }).replaceAll('<', '\\u003c')
  const hash = createHash('sha256').update(schema).digest('base64')
  const csp = `default-src 'self'; script-src 'self' 'sha256-${hash}'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'`

  html = html
    .replace('<!--app-html-->', render())
    .replaceAll('https://diyatmoko.my.id/og-image.png', new URL('og-image.png', publicUrl).href)
    .replaceAll('https://diyatmoko.my.id/', publicUrl)
    .replace('</head>', `<script type="application/ld+json">${schema}</script>\n  </head>`)
  await writeFile(resolve(root, 'dist/index.html'), html)
  await writeFile(
    resolve(root, 'dist/robots.txt'),
    `User-agent: *\nAllow: /\nSitemap: ${new URL('sitemap.xml', publicUrl).href}\n`,
  )
  await writeFile(
    resolve(root, 'dist/sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${publicUrl.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</loc></url></urlset>\n`,
  )
  const headers = `/*\n  Content-Security-Policy: ${csp}\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Cache-Control: no-cache\n\n${base}assets/*\n  Cache-Control: public, max-age=31536000, immutable\n`
  await writeFile(resolve(root, 'dist/_headers'), headers)
  await mkdir(resolve(root, 'deploy/generated'), { recursive: true })
  const nginx = (await readFile(resolve(root, 'deploy/nginx.conf.template'), 'utf8')).replaceAll(
    '__CSP__',
    csp,
  )
  await writeFile(resolve(root, 'deploy/generated/nginx.conf'), nginx)
  const count = (html.match(/<article/g) || []).length
  if (count !== 3 || !html.includes('Yanuar Diyatmoko'))
    throw new Error('Prerendered content is incomplete.')
  console.log(`Prerendered 3 projects and all sections. Canonical: ${publicUrl}`)
} finally {
  await server.close()
}
