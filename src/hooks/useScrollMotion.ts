import { useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP, ScrollTrigger)

export function useScrollMotion(enabled: boolean) {
  const scope = useRef<HTMLDivElement>(null)
  useGSAP(
    () => {
      const media = gsap.matchMedia()
      media.add(
        { allow: '(prefers-reduced-motion: no-preference)', desktop: '(min-width: 960px)' },
        (context) => {
          if (!enabled || !context.conditions?.allow) return
          const intro = gsap.timeline({ defaults: { ease: 'power3.out' } })
          intro
            .from('.hero-line-inner', { yPercent: 105, rotation: 3, duration: 1.15, stagger: 0.12 })
            .from(
              '.hero-copy, .hero-actions',
              { y: 20, autoAlpha: 0, duration: 0.8, stagger: 0.12 },
              '-=0.6',
            )
            .from('.hero-art', { y: 24, autoAlpha: 0, duration: 1.1 }, 0.2)
          gsap.utils.toArray<HTMLElement>('.reveal').forEach((element) => {
            gsap.from(element, {
              y: 34,
              autoAlpha: 0,
              duration: 0.85,
              ease: 'power3.out',
              scrollTrigger: { trigger: element, start: 'top 91%', once: true },
            })
          })
          gsap.to('.scroll-progress', {
            scaleX: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: scope.current,
              start: 'top top',
              end: 'bottom bottom',
              scrub: true,
            },
          })
          if (context.conditions.desktop) {
            gsap.to('.approach-note', {
              y: 45,
              ease: 'none',
              scrollTrigger: {
                trigger: '#approach',
                start: 'top bottom',
                end: 'bottom top',
                scrub: 1,
              },
            })
          }
        },
      )
      return () => media.revert()
    },
    { scope, dependencies: [enabled], revertOnUpdate: true },
  )
  return scope
}
