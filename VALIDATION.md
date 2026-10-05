# Validation record

Frontend verified on 2 October 2026 against the production build and again through GitHub Actions on 5 October 2026. VPS deployment succeeded on 5 October 2026; public-domain setup is a separate one-time step.

| Check                                            | Result                                                                                                     |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| ESLint, including React hook rules               | Passed; zero warnings                                                                                      |
| Strict TypeScript compilation                    | Passed                                                                                                     |
| Vite production build and prerender              | Passed; all sections and 3 project summaries present in HTML                                               |
| Dependency audit                                 | 0 reported vulnerabilities                                                                                 |
| Chromium browser suite                           | 24 tests passed                                                                                            |
| Responsive EN/ID layouts                         | Passed at 320, 390, 768, 1024, and 1440 px                                                                 |
| Hydration and asset loading under production CSP | Passed; no browser errors or blocked assets                                                                |
| Project filters and focus controls               | Passed                                                                                                     |
| Dialog focus trap, Escape, and focus restoration | Passed                                                                                                     |
| Mobile menu and desktop resize                   | Passed                                                                                                     |
| Language and motion persistence                  | Passed                                                                                                     |
| OS reduced motion, including changes while open  | Passed                                                                                                     |
| Content without JavaScript                       | Passed                                                                                                     |
| Automated WCAG A/AA checks                       | Passed on desktop, mobile, and the project dialog                                                          |
| SEO assets, caching headers, and health endpoint | Passed                                                                                                     |
| Deployment transaction and rollback simulation   | 20 tests passed against the real Bash scripts with mocked Docker/HTTP/SSH/GitHub boundaries                |
| Shared Nginx configuration failure handling      | 16 Python tests passed, including rollback, duplicate hosts, real certificate checks, and release identity |
| Deployment shell scripts                         | Bash syntax checks passed                                                                                  |
| Workflow and VPS Compose files                   | YAML parse, job dependencies, main gate, environment, and action SHA pins checked                          |

The verified client bundle is approximately **128 kB gzipped**, with approximately **7 kB gzipped CSS** and a **25 kB local variable font**. Static project artwork is rendered from code; no third-party font, tracking, or image requests are required.

## Practical limits

- Automated accessibility checks supplement manual review; they are not a conformance certification.
- The executed browser suite used Chromium. Firefox, Safari, and physical-device testing are not claimed.
- Docker is unavailable in the local authoring environment. The real runtime container and SSH deployment passed in GitHub Actions run **37282727548**, for commit **823240a2713572eb9588f7349b87b397cd8ae697**. Its deployment log confirmed a healthy portfolio container and the expected release identity.
- The rollout simulation covers successful releases, automatic/manual recovery, checksums, commit labels, saved port/network settings, interrupted recovery, setup secret handling, SSH host verification, AI secret aliases, and release mismatch recovery. Real deployment complements these simulations.
- The container CI job also exercises the public domain helper against a separate Nginx container: HTTP routing, HTTPS with an explicitly trusted test certificate, rejection before a certificate exists, ACME routing, release identity, and an unrelated virtual host. Its certificate is an isolated CI fixture, not a publicly issued certificate.
- Public DNS, real certificate issuance, the public virtual host, and the renewal timer must be activated on the VPS with **scripts/setup-domain.py**. An origin health check alone does not establish that the domain is publicly correct.
- The contact CTA points to the verified GitHub profile. Public email and LinkedIn links are enabled only when the owner supplies them.
- The MESTHI interface artwork is a design illustration. The research chart is not a trading performance claim.

For repeatable checks and live deployment verification, follow [DEPLOYMENT.md](./DEPLOYMENT.md).
