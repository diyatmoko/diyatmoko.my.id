import { ArrowUpRight, X } from 'lucide-react'
import { copy, profile } from '../data/content'
import type { Language, Project } from '../data/content'
import { useNativeDialog } from '../hooks/useNativeDialog'

export default function ProjectDialog({
  project,
  language,
  onClose,
}: {
  project: Project | null
  language: Language
  onClose: () => void
}) {
  const dialog = useNativeDialog(Boolean(project))
  if (!project) return null
  const text = copy[language].work
  return (
    <dialog
      ref={dialog}
      className="project-dialog"
      aria-labelledby="project-dialog-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const rect = event.currentTarget.getBoundingClientRect()
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          event.currentTarget.close()
      }}
    >
      <div className="dialog-heading">
        <span className="eyebrow">PROJECT / {project.number}</span>
        <button
          className="icon-button"
          type="button"
          aria-label={text.close}
          onClick={() => dialog.current?.close()}
        >
          <X size={22} aria-hidden="true" />
        </button>
      </div>
      <h2 id="project-dialog-title">{project.name}</h2>
      <p className="dialog-subtitle">{project.title[language]}</p>
      <p className="dialog-project-type eyebrow">{project.type[language]}</p>
      <div className="dialog-section">
        <h3>{text.overview}</h3>
        <p>{project.overview[language]}</p>
      </div>
      <div className="dialog-section">
        <h3>{text.areas}</h3>
        <ul>
          {project.areas[language].map((area) => (
            <li key={area}>{area}</li>
          ))}
        </ul>
      </div>
      <div className="dialog-section">
        <h3>{text.stack}</h3>
        <div className="project-tags">
          {project.stack.map((tool) => (
            <span key={tool}>{tool}</span>
          ))}
        </div>
      </div>
      <a
        className="button button-dark"
        href={project.url ?? profile.github}
        target="_blank"
        rel="noopener noreferrer"
      >
        {project.url ? text.visit : text.github}
        <ArrowUpRight size={20} aria-hidden="true" />
      </a>
    </dialog>
  )
}
