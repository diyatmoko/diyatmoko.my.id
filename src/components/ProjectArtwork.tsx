import { ArrowUpRight, Braces, Check, Layers, Sparkles } from 'lucide-react'

export default function ProjectArtwork({ id }: { id: string }) {
  if (id === 'mesthi')
    return (
      <div className="project-art project-art-mesthi" aria-hidden="true">
        <div className="preview-orbit preview-orbit-one" />
        <div className="preview-orbit preview-orbit-two" />
        <div className="studio-window">
          <div className="studio-chrome">
            <span className="studio-logo">m.</span>
            <span>MESTHI</span>
            <span className="window-dots">
              <i />
              <i />
              <i />
            </span>
          </div>
          <div className="studio-body">
            <div className="studio-sidebar">
              <span className="sidebar-active">
                <Layers size={13} /> Workspace
              </span>
              <span>
                <Sparkles size={13} /> Agents
              </span>
              <span>
                <Braces size={13} /> Backlog
              </span>
              <div className="sidebar-bottom">
                YOUR IDEAS.
                <br />
                IN MOTION.
              </div>
            </div>
            <div className="studio-main">
              <div className="studio-eyebrow">
                WORKFLOW CONCEPT <span>↗</span>
              </div>
              <h3>
                A little idea.
                <br />
                <span>A bigger possibility.</span>
              </h3>
              <div className="studio-flow">
                <span>IDEA</span>
                <i />
                <span>PLAN</span>
                <i />
                <span>BUILD</span>
              </div>
              <div className="agent-preview">
                <div>
                  <span className="agent-icon">
                    <Layers size={19} />
                  </span>
                  <span>
                    Architect<small>Map the system</small>
                  </span>
                  <ArrowUpRight size={14} />
                </div>
                <div>
                  <span className="agent-icon">
                    <Braces size={19} />
                  </span>
                  <span>
                    Engineer<small>Make it work</small>
                  </span>
                  <ArrowUpRight size={14} />
                </div>
                <div>
                  <span className="agent-icon">
                    <Check size={19} />
                  </span>
                  <span>
                    Reviewer<small>Check the details</small>
                  </span>
                  <ArrowUpRight size={14} />
                </div>
              </div>
            </div>
          </div>
        </div>
        <span className="art-corner-label">MESTHI / THE AGENT WORKSPACE</span>
      </div>
    )
  if (id === 'enterprise')
    return (
      <div className="project-art project-art-enterprise" aria-hidden="true">
        <div className="enterprise-art-header">
          <span>SYSTEMS / 02</span>
          <span>ARCHITECTURE & INTEGRATION</span>
        </div>
        <div className="enterprise-word">
          BOUNDARIES.
          <br />
          <span>BY DESIGN.</span>
        </div>
        <svg viewBox="0 0 480 220" fill="none" className="integration-art">
          <path
            d="M90 110H390M90 110V51H310M176 110V180H390"
            stroke="#afc8c0"
            strokeOpacity="0.6"
            strokeWidth="1.2"
          />
          <path d="M90 110H390" stroke="#c5f16b" strokeWidth="2" strokeDasharray="5 8" />
          <g fill="#254d45" stroke="#9fbbb2">
            <rect x="40" y="75" width="100" height="70" rx="10" />
            <rect x="188" y="75" width="100" height="70" rx="10" />
            <rect x="338" y="75" width="100" height="70" rx="10" />
          </g>
          <g fill="#eff3eb" textAnchor="middle" fontSize="13" fontFamily="monospace">
            <text x="90" y="115">
              API
            </text>
            <text x="238" y="115">
              SERVICE
            </text>
            <text x="388" y="115">
              SYSTEM
            </text>
          </g>
          <circle cx="310" cy="51" r="5" fill="#c5f16b" />
          <circle cx="390" cy="180" r="5" fill="#c5f16b" />
        </svg>
        <span className="art-corner-label">CLEAR CONTRACTS. CONNECTED SYSTEMS.</span>
      </div>
    )
  return (
    <div className="project-art project-art-quant" aria-hidden="true">
      <div className="quant-art-header">
        <span>THE QUANT LAB</span>
        <span>RESEARCH / 03</span>
      </div>
      <div className="quant-word">
        What if<span>?</span>
      </div>
      <svg className="quant-chart" viewBox="0 0 480 205" fill="none">
        <g stroke="#293d21" strokeOpacity="0.16">
          <path d="M0 40H480M0 90H480M0 140H480M0 190H480M50 0V205M150 0V205M250 0V205M350 0V205M450 0V205" />
        </g>
        <path
          d="M0 140L30 145L58 101L87 122L115 76L145 94L173 150L205 128L235 148L268 94L297 115L326 72L358 96L389 41L420 72L450 37L480 55"
          stroke="#24452a"
          strokeWidth="2.3"
        />
        <path
          d="M0 126C70 111 97 103 145 116S217 139 268 114S330 98 360 77S423 58 480 57"
          stroke="#24452a"
          strokeOpacity="0.46"
          strokeDasharray="6 6"
          strokeWidth="1.8"
        />
        <circle cx="326" cy="72" r="7" fill="#24452a" />
        <circle cx="326" cy="72" r="13" stroke="#24452a" strokeOpacity="0.3" />
      </svg>
      <div className="quant-art-bottom">
        <span>HYPOTHESIS → DATA → LEARNING</span>
        <span>ILLUSTRATIVE</span>
      </div>
    </div>
  )
}
