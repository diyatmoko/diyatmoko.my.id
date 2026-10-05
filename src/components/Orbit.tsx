import { useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { copy } from '../data/content'
import type { Language } from '../data/content'

export default function Orbit({
  language,
  motionEnabled,
}: {
  language: Language
  motionEnabled: boolean
}) {
  const scope = useRef<HTMLElement>(null)
  const [mode, setMode] = useState(0)
  const text = copy[language].hero

  useGSAP(
    () => {
      const media = gsap.matchMedia()
      media.add(
        {
          allow: '(prefers-reduced-motion: no-preference)',
          pointer: '(hover: hover) and (pointer: fine)',
        },
        (context) => {
          if (!motionEnabled || !context.conditions?.allow) return
          const loops = [
            gsap.to('.orbit-shell', {
              rotation: 360,
              svgOrigin: '280 280',
              duration: 70,
              repeat: -1,
              ease: 'none',
            }),
            gsap.to('.orbit-satellites', {
              rotation: -360,
              svgOrigin: '280 280',
              duration: 44,
              repeat: -1,
              ease: 'none',
            }),
            gsap.to('.orbit-core', {
              y: -10,
              duration: 3.2,
              yoyo: true,
              repeat: -1,
              ease: 'sine.inOut',
            }),
          ]
          const figure = scope.current
          if (!figure) return
          const visibility = ScrollTrigger.create({
            trigger: figure,
            start: 'top bottom',
            end: 'bottom top',
            onToggle: (self) =>
              loops.forEach((loop) =>
                self.isActive && !document.hidden ? loop.play() : loop.pause(),
              ),
          })
          const onVisibility = () =>
            loops.forEach((loop) =>
              !document.hidden && visibility.isActive ? loop.play() : loop.pause(),
            )
          document.addEventListener('visibilitychange', onVisibility)
          onVisibility()
          const tiltX = gsap.quickTo('.orbit-tilt', 'rotationX', {
            duration: 0.7,
            ease: 'power3.out',
          })
          const tiltY = gsap.quickTo('.orbit-tilt', 'rotationY', {
            duration: 0.7,
            ease: 'power3.out',
          })
          const onPointer = (event: PointerEvent) => {
            const bounds = figure.getBoundingClientRect()
            tiltX(-((event.clientY - bounds.top) / bounds.height - 0.5) * 12)
            tiltY(((event.clientX - bounds.left) / bounds.width - 0.5) * 12)
          }
          const onLeave = () => {
            tiltX(0)
            tiltY(0)
          }
          if (context.conditions.pointer) {
            figure.addEventListener('pointermove', onPointer)
            figure.addEventListener('pointerleave', onLeave)
          }
          return () => {
            document.removeEventListener('visibilitychange', onVisibility)
            figure.removeEventListener('pointermove', onPointer)
            figure.removeEventListener('pointerleave', onLeave)
          }
        },
      )
      return () => media.revert()
    },
    { scope, dependencies: [motionEnabled], revertOnUpdate: true },
  )

  return (
    <figure className="hero-art" ref={scope} data-mode={mode}>
      <div className="art-heading">
        <span className="status-dot" />
        <span>{text.artTitle}</span>
        <span className="art-edition">YD / 001</span>
      </div>
      <div className="orbit-tilt">
        <svg className="orbit-svg" viewBox="0 0 560 560" fill="none" aria-hidden="true">
          <defs>
            <linearGradient
              id="core-side"
              x1="180"
              y1="270"
              x2="380"
              y2="340"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#898d7f" />
              <stop offset="0.38" stopColor="#e5e7d9" />
              <stop offset="0.7" stopColor="#a3a799" />
              <stop offset="1" stopColor="#646b5f" />
            </linearGradient>
            <linearGradient
              id="core-top"
              x1="220"
              y1="204"
              x2="326"
              y2="277"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#f3f5e9" />
              <stop offset="1" stopColor="#b1b7a2" />
            </linearGradient>
            <radialGradient id="orbit-glow">
              <stop stopColor="#c5f16b" stopOpacity="0.14" />
              <stop offset="1" stopColor="#c5f16b" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="280" cy="280" r="242" fill="url(#orbit-glow)" />
          <g stroke="#e3e7da" opacity="0.11">
            <path d="M50 140H510M50 280H510M50 420H510M140 50V510M280 50V510M420 50V510" />
            <circle cx="280" cy="280" r="228" />
            <circle cx="280" cy="280" r="183" />
          </g>
          <g stroke="#909b83" strokeWidth="1">
            <path d="M45 65H59M52 58V72M501 65H515M508 58V72M45 495H59M52 488V502M501 495H515M508 488V502" />
          </g>
          <g className="orbit-shell" stroke="#e8ecdf" strokeWidth="1.15">
            <ellipse
              cx="280"
              cy="280"
              rx="211"
              ry="100"
              transform="rotate(-30 280 280)"
              opacity="0.5"
            />
            <ellipse
              cx="280"
              cy="280"
              rx="211"
              ry="100"
              transform="rotate(30 280 280)"
              opacity="0.27"
            />
            <ellipse
              cx="280"
              cy="280"
              rx="211"
              ry="100"
              transform="rotate(90 280 280)"
              opacity="0.2"
            />
          </g>
          <ellipse cx="280" cy="377" rx="109" ry="33" fill="#020a08" fillOpacity="0.35" />
          <g className="orbit-core">
            <path
              d="M182 229V317C182 336 226 352 280 352C334 352 378 336 378 317V229"
              fill="url(#core-side)"
            />
            {Array.from({ length: 6 }, (_, index) => (
              <ellipse
                key={index}
                cx="280"
                cy={242 + index * 15}
                rx="98"
                ry="35"
                stroke="#15251c"
                strokeOpacity="0.29"
              />
            ))}
            <ellipse cx="280" cy="229" rx="98" ry="35" fill="url(#core-top)" />
            <ellipse cx="280" cy="229" rx="74" ry="24" stroke="#6b7560" strokeWidth="0.7" />
            <text
              x="282"
              y="239"
              textAnchor="middle"
              fill="#233c2b"
              fontFamily="Manrope Variable, sans-serif"
              fontSize="34"
              fontWeight="800"
              letterSpacing="-3"
            >
              yd.
            </text>
            <path
              d="M282 194V134"
              stroke="var(--art-accent)"
              strokeWidth="1.4"
              strokeDasharray="3 5"
            />
            <circle cx="282" cy="130" r="6" fill="var(--art-accent)" />
          </g>
          <g className="orbit-satellites">
            <circle cx="116" cy="197" r="21" fill="#101e17" stroke="var(--art-accent)" />
            <circle cx="116" cy="197" r="7" fill="var(--art-accent)" />
            <circle cx="433" cy="199" r="11" fill="#f0f3e5" />
            <circle cx="310" cy="454" r="15" fill="#101e17" stroke="#e8ecdf" />
            <path d="M304 454H316M310 448V460" stroke="#e8ecdf" />
          </g>
          <g fill="#a6b49d" fontFamily="monospace" fontSize="10" letterSpacing="1.5">
            <text x="65" y="117">
              BUILD
            </text>
            <text x="436" y="420">
              EVOLVE
            </text>
            <text x="72" y="461">
              13+ YEARS / ONE MINDSET
            </text>
          </g>
          <path d="M380 283H463L482 302" stroke="#6d7f65" strokeWidth="0.8" />
          <circle cx="380" cy="283" r="3" fill="var(--art-accent)" />
        </svg>
      </div>
      <figcaption className="art-caption">
        <span>{text.artCaptions[mode]}</span>
        <span className="art-coordinate">−6° / +7°</span>
      </figcaption>
      <div
        className="orbit-controls"
        role="group"
        aria-label={language === 'en' ? 'Explore engineering focus' : 'Jelajahi fokus engineering'}
      >
        {text.artModes.map((label, index) => (
          <button
            key={index}
            type="button"
            aria-pressed={mode === index}
            onClick={() => setMode(index)}
          >
            {label}
            <span aria-hidden="true">0{index + 1}</span>
          </button>
        ))}
      </div>
    </figure>
  )
}
