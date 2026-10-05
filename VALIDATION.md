# Validation record

Frontend verified on 2 October 2026 against the production build. Deployment automation updated and verified on 3 October 2026.

| Check                                            | Result                                                                                      |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| ESLint, including React hook rules               | Passed; zero warnings                                                                       |
| Strict TypeScript compilation                    | Passed                                                                                      |
| Vite production build and prerender              | Passed; all sections and 3 project summaries present in HTML                                |
| Dependency audit                                 | 0 reported vulnerabilities                                                                  |
| Chromium browser suite                           | 24 tests passed                                                                             |
| Responsive EN/ID layouts                         | Passed at 320, 390, 768, 1024, and 1440 px                                                  |
| Hydration and asset loading under production CSP | Passed; no browser errors or blocked assets                                                 |
| Project filters and focus controls               | Passed                                                                                      |
| Dialog focus trap, Escape, and focus restoration | Passed                                                                                      |
| Mobile menu and desktop resize                   | Passed                                                                                      |
| Language and motion persistence                  | Passed                                                                                      |
| OS reduced motion, including changes while open  | Passed                                                                                      |
| Content without JavaScript                       | Passed                                                                                      |
| Automated WCAG A/AA checks                       | Passed on desktop, mobile, and the project dialog                                           |
| SEO assets, caching headers, and health endpoint | Passed                                                                                      |
| Deployment transaction and rollback simulation   | 20 tests passed against the real Bash scripts with mocked Docker/HTTP/SSH/GitHub boundaries |
| Deployment shell scripts                         | Bash syntax checks passed                                                                   |
| Workflow and VPS Compose files                   | YAML parse, job dependencies, main gate, environment, and action SHA pins checked           |

The verified client bundle is approximately **128 kB gzipped**, with approximately **7 kB gzipped CSS** and a **25 kB local variable font**. Static project artwork is rendered from code; no third-party font, tracking, or image requests are required.

## Practical limits

- Automated accessibility checks supplement manual review; they are not a conformance certification.
- The executed browser suite used Chromium. Firefox, Safari, and physical-device testing are not claimed.
- The Docker runtime and GitHub Actions workflow are supplied. Docker is not available in the authoring environment, so a local container build/run was not executed. The workflow includes a separate container smoke job for a Docker-equipped runner.
- The rollout tests exercise successful releases, automatic/manual recovery, checksums, commit labels, saved port/network settings, interrupted deployment recovery, setup secret handling, SSH host verification, AI deployment secret aliases, and release identity mismatch recovery. Docker, GitHub CLI, and SSH boundaries are simulated; real VPS connectivity and public DNS/TLS have not been tested here.
- No domain, DNS, TLS certificate, or live production server was changed during this implementation.
- The contact CTA points to the verified GitHub profile. Public email and LinkedIn links are enabled only when the owner supplies them.
- The MESTHI interface artwork is a design illustration. The research chart is not a trading performance claim.

For repeatable checks and live deployment verification, follow [DEPLOYMENT.md](./DEPLOYMENT.md).
