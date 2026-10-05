import { useEffect, useRef, useState } from 'react'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  GitBranch,
  Menu,
  Pause,
  Play,
  X,
} from 'lucide-react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { copy, profile, projects } from './data/content'
import type { Category, Language, Project } from './data/content'
import { usePreferences } from './hooks/usePreferences'
import { useNativeDialog } from './hooks/useNativeDialog'
import { useScrollMotion } from './hooks/useScrollMotion'
import Orbit from './components/Orbit'
import ProjectArtwork from './components/ProjectArtwork'
import ProjectDialog from './components/ProjectDialog'

const categories: readonly Category[] = ['all', 'platform', 'enterprise', 'experiment']
const toolkit = [
  'Java / Spring Boot',
  '.NET',
  'Python',
  'React / TypeScript',
  'AWS / Cloud',
  'AI / LLM',
]

function Brand() {
  return (
    <span className="brand">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path
          d="M14 1L16.9 10.9L27 14L16.9 17.1L14 27L11.1 17.1L1 14L11.1 10.9L14 1Z"
          fill="currentColor"
        />
      </svg>
      <span>
        diyatmoko<span className="brand-dot">.</span>
      </span>
    </span>
  )
}

function Header({ preferences }: { preferences: ReturnType<typeof usePreferences> }) {
  const { language, changeLanguage, motionEnabled, reducedMotion, toggleMotion } = preferences
  const text = copy[language]
  const [menuOpen, setMenuOpen] = useState(false)
  const menu = useNativeDialog(menuOpen)
  const menuToggle = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const query = window.matchMedia('(min-width: 900px)')
    const onResize = () => {
      if (query.matches) setMenuOpen(false)
    }
    query.addEventListener('change', onResize)
    return () => query.removeEventListener('change', onResize)
  }, [])

  return (
    <header className="header">
      <div className="header-inner shell">
        <a href="#top" className="brand-link" aria-label="Yanuar Diyatmoko — home">
          <Brand />
        </a>
        <nav
          className="desktop-nav"
          aria-label={language === 'en' ? 'Main navigation' : 'Navigasi utama'}
        >
          <a href="#work">{text.nav.work}</a>
          <a href="#about">{text.nav.about}</a>
          <a href="#approach">{text.nav.approach}</a>
        </nav>
        <div className="header-actions">
          <button
            className="language-button"
            type="button"
            onClick={() => changeLanguage(language === 'en' ? 'id' : 'en')}
            aria-label={language === 'en' ? 'Switch to Indonesian' : 'Switch to English'}
          >
            {language.toUpperCase()}
            <span aria-hidden="true"> / {language === 'en' ? 'ID' : 'EN'}</span>
          </button>
          <button
            className="icon-button motion-button"
            type="button"
            aria-label={
              reducedMotion ? text.motionReduced : motionEnabled ? text.motionOff : text.motionOn
            }
            title={
              reducedMotion ? text.motionReduced : motionEnabled ? text.motionOff : text.motionOn
            }
            disabled={reducedMotion}
            aria-pressed={!motionEnabled}
            onClick={toggleMotion}
          >
            {motionEnabled ? (
              <Pause size={16} aria-hidden="true" />
            ) : (
              <Play size={16} aria-hidden="true" />
            )}
          </button>
          <a href="#contact" className="header-contact">
            {text.nav.contact}
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
          <button
            ref={menuToggle}
            className="icon-button menu-toggle"
            type="button"
            aria-label={text.menu}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={23} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="scroll-progress" aria-hidden="true" />
      {menuOpen && (
        <dialog
          id="mobile-navigation"
          className="mobile-navigation"
          ref={menu}
          aria-label={language === 'en' ? 'Navigation' : 'Navigasi'}
          onClose={() => setMenuOpen(false)}
        >
          <div className="mobile-menu-heading">
            <Brand />
            <button
              className="icon-button"
              aria-label={text.closeMenu}
              type="button"
              onClick={() => menu.current?.close()}
            >
              <X size={26} aria-hidden="true" />
            </button>
          </div>
          <nav>
            {(['work', 'about', 'approach', 'contact'] as const).map((item, index) => (
              <a
                key={item}
                href={`#${item}`}
                onClick={() => {
                  menu.current?.close()
                  window.setTimeout(
                    () => document.getElementById(item)?.focus({ preventScroll: true }),
                    0,
                  )
                }}
              >
                <span>0{index + 1}</span>
                {text.nav[item]}
                <ArrowUpRight size={27} aria-hidden="true" />
              </a>
            ))}
          </nav>
          <span className="mobile-menu-footer">YANUAR DIYATMOKO / INDONESIA</span>
        </dialog>
      )}
    </header>
  )
}

function Work({
  language,
  motionEnabled,
  onSelect,
}: {
  language: Language
  motionEnabled: boolean
  onSelect: (project: Project) => void
}) {
  const text = copy[language].work
  const [category, setCategory] = useState<Category>('all')
  const visibleProjects = projects.filter(
    (project) => category === 'all' || project.category === category,
  )
  const scope = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (!motionEnabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      gsap.from('.project-card', {
        y: 24,
        opacity: 0,
        duration: 0.55,
        stagger: 0.08,
        ease: 'power2.out',
        scrollTrigger: { trigger: '.project-grid', start: 'top 92%', once: true },
      })
    },
    { scope, dependencies: [category, motionEnabled], revertOnUpdate: true },
  )

  return (
    <section
      className="work section shell"
      id="work"
      tabIndex={-1}
      aria-labelledby="work-title"
      ref={scope}
    >
      <div className="section-heading reveal">
        <div>
          <p className="eyebrow">{text.label}</p>
          <h2 id="work-title">{text.title}</h2>
        </div>
        <p className="section-description">{text.description}</p>
      </div>
      <div className="work-toolbar">
        <div
          className="project-filters"
          role="group"
          aria-label={language === 'en' ? 'Filter projects' : 'Filter proyek'}
        >
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              className={category === item ? 'is-active' : ''}
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
            >
              {text.filters[item]}
            </button>
          ))}
        </div>
        <span className="project-count" role="status">
          0{visibleProjects.length} {text.count}
        </span>
      </div>
      <div className={`project-grid ${category !== 'all' ? 'is-filtered' : ''}`}>
        {visibleProjects.map((project) => (
          <article
            key={project.id}
            className={`project-card project-${project.id}`}
            aria-labelledby={`project-${project.id}-title`}
          >
            <button
              className="project-art-button"
              type="button"
              onClick={() => onSelect(project)}
              aria-label={`${text.view}: ${project.name}`}
            >
              <ProjectArtwork id={project.id} />
              <span className="art-open">
                <ArrowUpRight size={25} aria-hidden="true" />
              </span>
            </button>
            <div className="project-content">
              <div className="project-meta">
                <span>
                  {project.number} / {project.name}
                </span>
                <span className="project-category">{text.filters[project.category]}</span>
              </div>
              <h3 id={`project-${project.id}-title`}>{project.title[language]}</h3>
              <p>{project.description[language]}</p>
              <div className="project-card-footer">
                <span className="project-stack">{project.stack.slice(0, 3).join(' / ')}</span>
                <button
                  className="project-link"
                  type="button"
                  onClick={() => onSelect(project)}
                  aria-label={`${text.view}: ${project.name}`}
                >
                  {text.view}
                  <ArrowUpRight size={19} aria-hidden="true" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function About({ language, motionEnabled }: { language: Language; motionEnabled: boolean }) {
  const text = copy[language].about
  const badge = useRef<HTMLDivElement>(null)
  useGSAP(
    () => {
      const media = gsap.matchMedia()
      media.add('(prefers-reduced-motion: no-preference)', () => {
        if (!motionEnabled) return
        const rotation = gsap.to('.badge-type', {
          rotation: 360,
          svgOrigin: '130 130',
          duration: 70,
          repeat: -1,
          ease: 'none',
        })
        const visibility = ScrollTrigger.create({
          trigger: badge.current,
          start: 'top bottom',
          end: 'bottom top',
          onToggle: (self) => (self.isActive ? rotation.play() : rotation.pause()),
        })
        const onVisibility = () =>
          !document.hidden && visibility.isActive ? rotation.play() : rotation.pause()
        document.addEventListener('visibilitychange', onVisibility)
        onVisibility()
        return () => document.removeEventListener('visibilitychange', onVisibility)
      })
      return () => media.revert()
    },
    { scope: badge, dependencies: [motionEnabled], revertOnUpdate: true },
  )

  return (
    <section className="about section" id="about" tabIndex={-1} aria-labelledby="about-title">
      <div className="shell about-grid">
        <div className="about-left">
          <p className="eyebrow reveal">{text.label}</p>
          <h2 id="about-title" className="reveal">
            {text.line1}
            <br />
            <span>{text.line2}</span>
          </h2>
          <div className="about-identity reveal" ref={badge}>
            {profile.portrait ? (
              <img
                className="portrait"
                src={`${import.meta.env.BASE_URL}${profile.portrait}`}
                alt={profile.name}
                width="240"
                height="240"
                loading="lazy"
              />
            ) : (
              <svg className="identity-badge" viewBox="0 0 260 260" fill="none" aria-hidden="true">
                <defs>
                  <path
                    id="identity-circle"
                    d="M130,130m-104,0a104,104 0 1,1 208,0a104,104 0 1,1-208,0"
                  />
                </defs>
                <circle cx="130" cy="130" r="81" fill="#c5f16b" />
                <text
                  x="126"
                  y="147"
                  textAnchor="middle"
                  fontSize="68"
                  fontWeight="800"
                  letterSpacing="-7"
                  fill="#15251b"
                >
                  yd.
                </text>
                <g className="badge-type">
                  <text fill="#b2bfb1" fontSize="11" letterSpacing="3">
                    <textPath href="#identity-circle">
                      {text.badge} {text.badge}
                    </textPath>
                  </text>
                </g>
                <circle cx="130" cy="130" r="126" stroke="#476049" strokeWidth="0.5" />
              </svg>
            )}
            <div>
              <span className="about-name">
                Yanuar
                <br />
                Diyatmoko.
              </span>
              <span className="about-location">
                <span className="status-dot" />
                {text.location}
              </span>
            </div>
          </div>
        </div>
        <div className="about-right">
          <div className="about-prose reveal">
            <p>{text.paragraph1}</p>
            <p>{text.paragraph2}</p>
          </div>
          <p className="about-note reveal">
            <ArrowDownRight size={23} aria-hidden="true" />
            {text.note}
          </p>
          <div className="toolkit reveal">
            <p className="eyebrow">{text.tools}</p>
            <ul>
              {toolkit.map((tool) => (
                <li key={tool}>
                  {tool}
                  <span aria-hidden="true">↗</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

function Approach({ language }: { language: Language }) {
  const text = copy[language].approach
  return (
    <section
      className="approach section shell"
      id="approach"
      tabIndex={-1}
      aria-labelledby="approach-title"
    >
      <div className="approach-intro reveal">
        <p className="eyebrow">{text.label}</p>
        <h2 id="approach-title">
          {text.line1}
          <br />
          {text.line2}
        </h2>
        <p className="section-description">{text.description}</p>
      </div>
      <div className="approach-grid">
        <div className="approach-note">
          <span className="eyebrow">{text.small}</span>
          <p>{text.note}</p>
          <svg viewBox="0 0 310 180" fill="none" aria-hidden="true">
            <path
              d="M20 146H80C134 146 66 51 117 51C168 51 92 125 153 125H254"
              stroke="#2d4d2b"
              strokeWidth="2"
            />
            <path d="M238 109L255 125L238 141" stroke="#2d4d2b" strokeWidth="2" />
            <circle cx="20" cy="146" r="6" fill="#2d4d2b" />
            <path d="M283 31V65M266 48H300" stroke="#2d4d2b" strokeWidth="2" />
          </svg>
          <span className="approach-note-bottom">THINK → BUILD → LEARN</span>
        </div>
        <ol className="approach-steps">
          {text.steps.map((step, index) => (
            <li key={index} className="reveal">
              <span className="step-number">0{index + 1}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
              <ArrowUpRight size={22} aria-hidden="true" />
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Contact({ language }: { language: Language }) {
  const text = copy[language].contact
  const emailConfigured = Boolean(profile.email.trim())
  return (
    <section className="contact section" id="contact" tabIndex={-1} aria-labelledby="contact-title">
      <div className="shell">
        <div className="contact-top reveal">
          <p className="eyebrow">{text.label}</p>
          <span className="contact-role">ARCHITECTURE / ENGINEERING / AI</span>
        </div>
        <div className="contact-grid">
          <div className="reveal">
            <h2 id="contact-title">
              {text.line1}
              <br />
              {text.line2}
              <span className="contact-dot">*</span>
            </h2>
            <p className="contact-tagline">{text.tagline}</p>
          </div>
          <div className="contact-right reveal">
            <div className="contact-arrow" aria-hidden="true">
              <ArrowUpRight strokeWidth={1.1} />
            </div>
            <p>{text.description}</p>
            <a
              className="button button-dark contact-button"
              href={emailConfigured ? `mailto:${profile.email}` : profile.github}
              target={emailConfigured ? undefined : '_blank'}
              rel={emailConfigured ? undefined : 'noopener noreferrer'}
            >
              {emailConfigured ? text.email : text.github}
              <ArrowUpRight size={20} aria-hidden="true" />
            </a>
            <span className="contact-link-note">
              {emailConfigured ? profile.email : text.linkNote}
            </span>
          </div>
        </div>
        <footer className="footer">
          <span>© {profile.year} Yanuar Diyatmoko</span>
          <div className="footer-links">
            <a
              href={profile.github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Yanuar Diyatmoko on GitHub"
            >
              <GitBranch size={16} aria-hidden="true" />
              GitHub
              <ArrowUpRight size={13} aria-hidden="true" />
            </a>
            {profile.linkedin && (
              <a href={profile.linkedin} target="_blank" rel="noopener noreferrer">
                LinkedIn
                <ArrowUpRight size={13} aria-hidden="true" />
              </a>
            )}
          </div>
          <a className="back-to-top" href="#top">
            {text.back}
            <ArrowUp size={17} aria-hidden="true" />
          </a>
        </footer>
      </div>
    </section>
  )
}

export default function App() {
  const preferences = usePreferences()
  const { language, motionEnabled } = preferences
  const text = copy[language]
  const scope = useScrollMotion(motionEnabled)
  const [project, setProject] = useState<Project | null>(null)
  return (
    <div className="portfolio" ref={scope} data-motion={motionEnabled ? 'on' : 'off'}>
      <a className="skip-link" href="#main-content">
        {text.skip}
      </a>
      <Header preferences={preferences} />
      <main id="main-content" tabIndex={-1}>
        <section className="hero shell" id="top" aria-labelledby="hero-title">
          <div className="hero-intro">
            <p className="eyebrow hero-eyebrow">
              <span className="status-dot" />
              {text.hero.eyebrow}
            </p>
            <span className="hero-index">PORTFOLIO / {profile.year}</span>
          </div>
          <div className="hero-grid">
            <div className="hero-text">
              <h1 id="hero-title" aria-label={`${text.hero.line1} ${text.hero.line2}`}>
                <span className="hero-line">
                  <span className="hero-line-inner">{text.hero.line1}</span>
                </span>
                <span className="hero-line">
                  <span className="hero-line-inner hero-line-accent">{text.hero.line2}</span>
                </span>
              </h1>
              <div className="hero-copy">
                <p className="hero-introduction">{text.hero.intro}</p>
                <p>{text.hero.description}</p>
              </div>
              <div className="hero-actions">
                <a className="button button-dark" href="#work">
                  {text.hero.primary}
                  <ArrowDownRight size={21} aria-hidden="true" />
                </a>
                <a className="text-link" href="#about">
                  {text.hero.secondary}
                  <ArrowRight size={17} aria-hidden="true" />
                </a>
              </div>
            </div>
            <Orbit language={language} motionEnabled={motionEnabled} />
          </div>
          <div className="hero-bottom">
            <div className="hero-experience">
              <span>
                13<span className="experience-plus">+</span>
              </span>
              <span>{text.hero.experience}</span>
            </div>
            <div className="hero-location">
              <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
                <circle cx="8.5" cy="8.5" r="7" stroke="currentColor" />
                <ellipse cx="8.5" cy="8.5" rx="3" ry="7" stroke="currentColor" />
                <path d="M1.5 8.5H15.5" stroke="currentColor" />
              </svg>
              {text.hero.based}
              <span className="location-time">UTC+7</span>
            </div>
            <a className="hero-scroll" href="#work" aria-label={text.hero.primary}>
              <span>{text.hero.mindset}</span>
              <ArrowDownRight size={26} aria-hidden="true" />
            </a>
          </div>
        </section>
        <Work language={language} motionEnabled={motionEnabled} onSelect={setProject} />
        <About language={language} motionEnabled={motionEnabled} />
        <Approach language={language} />
        <Contact language={language} />
      </main>
      <ProjectDialog project={project} language={language} onClose={() => setProject(null)} />
    </div>
  )
}
