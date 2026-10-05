// Serve the real production build, including its CSP, for browser verification.
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'

const directory = resolve('dist')
const headerFile = await readFile(resolve(directory, '_headers'), 'utf8')
const headers = Object.fromEntries(
  headerFile
    .split('\n')
    .filter((line) => line.startsWith('  ') && !line.includes('Cache-Control'))
    .map((line) => {
      const index = line.indexOf(':')
      return [line.slice(0, index).trim(), line.slice(index + 1).trim()]
    }),
)
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
}

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    if (pathname.endsWith('/_headers') || pathname.includes('..') || pathname.includes('\\'))
      throw new Error('Invalid path')
    let file = resolve(directory, `.${pathname}`)
    if (file !== directory && !file.startsWith(directory + sep)) throw new Error('Invalid path')
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html')
    const body = await readFile(file)
    response.writeHead(200, {
      ...headers,
      'Content-Type': types[extname(file)] || 'application/octet-stream',
      'Cache-Control': pathname.includes('/assets/')
        ? 'public, max-age=31536000, immutable'
        : 'no-cache',
    })
    response.end(request.method === 'HEAD' ? undefined : body)
  } catch {
    response.writeHead(404, { ...headers, 'Content-Type': 'text/plain; charset=utf-8' })
    response.end('Not found')
  }
}).listen(Number(process.env.PORT || 4173), '0.0.0.0', () =>
  console.log(`Production build at http://localhost:${process.env.PORT || 4173}`),
)
