import { useEffect, useSyncExternalStore } from 'react'
import type { Language } from '../data/content'

const fallback = new Map<string, string>()
const listeners = new Set<() => void>()

function readPreference(key: string) {
  try {
    return localStorage.getItem(key) ?? fallback.get(key)
  } catch {
    return fallback.get(key)
  }
}

function savePreference(key: string, value: string) {
  fallback.set(key, value)
  try {
    localStorage.setItem(key, value)
  } catch {
    /* The site works without storage. */
  }
  listeners.forEach((listener) => listener())
}

function subscribePreferences(callback: () => void) {
  listeners.add(callback)
  window.addEventListener('storage', callback)
  return () => {
    listeners.delete(callback)
    window.removeEventListener('storage', callback)
  }
}

function getLanguage(): Language {
  return readPreference('yd-language') === 'id' ? 'id' : 'en'
}
function getMotion() {
  return readPreference('yd-motion') !== 'off'
}
function subscribeReducedMotion(callback: () => void) {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)')
  query.addEventListener('change', callback)
  return () => query.removeEventListener('change', callback)
}
function getReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function usePreferences() {
  // Server snapshots keep prerendering and initial hydration identical.
  const language = useSyncExternalStore(subscribePreferences, getLanguage, () => 'en' as Language)
  const motionPreference = useSyncExternalStore(subscribePreferences, getMotion, () => true)
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false)

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const changeLanguage = (value: Language) => {
    savePreference('yd-language', value)
  }
  const toggleMotion = () => {
    savePreference('yd-motion', getMotion() ? 'off' : 'on')
  }

  return {
    language,
    changeLanguage,
    motionEnabled: motionPreference && !reducedMotion,
    reducedMotion,
    toggleMotion,
  }
}
