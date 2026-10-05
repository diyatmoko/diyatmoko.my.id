export type Language = 'en' | 'id'
export type Category = 'all' | 'platform' | 'enterprise' | 'experiment'

// Public content only. Keep confidential employers, data, and infrastructure out.
export const profile = {
  name: 'Yanuar Diyatmoko',
  github: 'https://github.com/diyatmoko',
  githubHandle: '@diyatmoko',
  site: 'https://diyatmoko.my.id',
  email: '', // Add your verified public contact address to enable the email CTA.
  linkedin: '', // Add your verified LinkedIn profile URL to display it.
  portrait: '', // Optional: e.g. 'images/yanuar.webp' under public/.
  year: 2026,
}

export const copy = {
  en: {
    skip: 'Skip to content',
    nav: { work: 'Work', about: 'About', approach: 'Approach', contact: 'Let’s talk' },
    menu: 'Open navigation',
    closeMenu: 'Close navigation',
    motionOff: 'Pause animations',
    motionOn: 'Enable animations',
    motionReduced: 'Reduced motion is enabled on your device',
    hero: {
      eyebrow: 'TECH LEAD · SOFTWARE ARCHITECT · AI ENGINEER',
      line1: 'Complexity,',
      line2: 'made clear.',
      intro: 'I’m Yanuar Diyatmoko.',
      description:
        'I turn ambitious ideas into dependable systems. From enterprise engineering to the next generation of AI agents.',
      primary: 'Explore my work',
      secondary: 'A little about me',
      experience: 'years of engineering',
      based: 'Based in Indonesia',
      mindset: 'Built for the real world',
      artTitle: 'A SYSTEM IN MOTION',
      artHint: 'A little curiosity goes a long way.',
      artModes: ['Systems', 'AI agents', 'Cloud'],
      artCaptions: ['Connected by design.', 'Intelligence, orchestrated.', 'Built to grow.'],
    },
    work: {
      label: '01 / SELECTED WORK',
      title: 'Built with purpose.',
      description: 'A selection of platforms, systems, and ideas I’m working on.',
      filters: {
        all: 'All work',
        platform: 'Platforms',
        enterprise: 'Enterprise',
        experiment: 'Experiments',
      },
      view: 'Explore project',
      count: 'projects',
      overview: 'The idea',
      areas: 'Areas of work',
      stack: 'Technology',
      close: 'Close project details',
      visit: 'Visit MESTHI',
      github: 'Find me on GitHub',
    },
    about: {
      label: '02 / THE PERSON BEHIND THE SYSTEMS',
      line1: 'An engineer’s mind.',
      line2: 'A builder’s heart.',
      paragraph1:
        'I’m a Tech Lead with 13+ years in software engineering, working at the intersection of enterprise systems, architecture, and AI.',
      paragraph2:
        'My experience in the financial industry shapes how I build: clear boundaries, thoughtful tradeoffs, and a deep respect for reliability. Alongside that, I’m building MESTHI and exploring what autonomous agents can make possible.',
      note: 'I care about what happens after launch.',
      tools: 'MY EVERYDAY TOOLKIT',
      badge: 'ALWAYS CURIOUS · ALWAYS BUILDING ·',
      experience: 'Engineering experience',
      discipline: 'From architecture to operation',
      location: 'Indonesia · UTC+7',
    },
    approach: {
      label: '03 / HOW I WORK',
      line1: 'A clear path.',
      line2: 'A considered result.',
      description:
        'Good engineering is a series of deliberate decisions. Here’s how I move an idea forward.',
      note: 'Clarity before complexity.',
      small: 'THE WAY FROM IDEA TO IMPACT',
      steps: [
        {
          title: 'Understand the problem.',
          body: 'Listen first. Make the context, constraints, and desired outcome clear before choosing a solution.',
        },
        {
          title: 'Design the system.',
          body: 'Map the boundaries, data, and failure paths. Choose an architecture that the team can own.',
        },
        {
          title: 'Build. Test. Refine.',
          body: 'Turn the design into working software. Verify behavior, review the details, and keep the feedback loop short.',
        },
        {
          title: 'Operate and evolve.',
          body: 'Make releases observable and repeatable. Learn from real use and improve the system with intent.',
        },
      ],
    },
    contact: {
      label: '04 / NEXT CHAPTER',
      line1: 'Have a hard',
      line2: 'problem?',
      description:
        'I’m always interested in thoughtful conversations about systems, engineering, and what comes next.',
      github: 'Find me on GitHub',
      email: 'Send me an email',
      linkNote: 'Explore my public work and profile.',
      tagline: 'Let’s make it work.',
      back: 'Back to top',
      rights: 'Built with intent.',
    },
  },
  id: {
    skip: 'Langsung ke konten',
    nav: { work: 'Karya', about: 'Tentang', approach: 'Pendekatan', contact: 'Mari bicara' },
    menu: 'Buka navigasi',
    closeMenu: 'Tutup navigasi',
    motionOff: 'Jeda animasi',
    motionOn: 'Aktifkan animasi',
    motionReduced: 'Perangkat Anda mengaktifkan pengurangan gerakan',
    hero: {
      eyebrow: 'TECH LEAD · SOFTWARE ARCHITECT · AI ENGINEER',
      line1: 'Kompleksitas,',
      line2: 'jadi jelas.',
      intro: 'Saya Yanuar Diyatmoko.',
      description:
        'Mengubah ide ambisius menjadi sistem yang andal. Dari rekayasa enterprise hingga generasi baru AI agents.',
      primary: 'Jelajahi karya',
      secondary: 'Tentang saya',
      experience: 'tahun pengalaman',
      based: 'Berbasis di Indonesia',
      mindset: 'Untuk kebutuhan nyata',
      artTitle: 'SISTEM YANG TERUS BERGERAK',
      artHint: 'Rasa ingin tahu membuka banyak jalan.',
      artModes: ['Sistem', 'AI agents', 'Cloud'],
      artCaptions: [
        'Terhubung lewat desain.',
        'Kecerdasan yang terorkestrasi.',
        'Dirancang untuk berkembang.',
      ],
    },
    work: {
      label: '01 / KARYA PILIHAN',
      title: 'Dibangun dengan tujuan.',
      description: 'Pilihan platform, sistem, dan ide yang sedang saya kerjakan.',
      filters: {
        all: 'Semua karya',
        platform: 'Platform',
        enterprise: 'Enterprise',
        experiment: 'Eksperimen',
      },
      view: 'Jelajahi proyek',
      count: 'proyek',
      overview: 'Gagasan',
      areas: 'Fokus pekerjaan',
      stack: 'Teknologi',
      close: 'Tutup detail proyek',
      visit: 'Kunjungi MESTHI',
      github: 'Temukan saya di GitHub',
    },
    about: {
      label: '02 / SOSOK DI BALIK SISTEM',
      line1: 'Pola pikir engineer.',
      line2: 'Semangat berkarya.',
      paragraph1:
        'Saya Tech Lead dengan pengalaman lebih dari 13 tahun di bidang software engineering, dengan fokus sistem enterprise, arsitektur, dan AI.',
      paragraph2:
        'Pengalaman di industri keuangan membentuk cara saya bekerja: batas tanggung jawab yang jelas, keputusan yang terukur, dan perhatian pada keandalan. Di luar itu, saya membangun MESTHI dan mengeksplorasi kemampuan autonomous agents.',
      note: 'Saya peduli pada sistem setelah dirilis.',
      tools: 'TEKNOLOGI SEHARI-HARI',
      badge: 'TERUS PENASARAN · TERUS BERKARYA ·',
      experience: 'Pengalaman engineering',
      discipline: 'Dari arsitektur hingga operasional',
      location: 'Indonesia · UTC+7',
    },
    approach: {
      label: '03 / CARA SAYA BEKERJA',
      line1: 'Langkah yang jelas.',
      line2: 'Hasil yang terukur.',
      description:
        'Engineering yang baik dibentuk oleh keputusan yang matang. Ini cara saya membawa sebuah ide menjadi nyata.',
      note: 'Kejelasan sebelum kompleksitas.',
      small: 'PERJALANAN DARI IDE KE DAMPAK',
      steps: [
        {
          title: 'Pahami masalahnya.',
          body: 'Dengarkan dahulu. Perjelas konteks, batasan, dan hasil yang dibutuhkan sebelum memilih solusi.',
        },
        {
          title: 'Rancang sistemnya.',
          body: 'Petakan batas sistem, data, dan alur kegagalan. Pilih arsitektur yang dapat dikelola oleh tim.',
        },
        {
          title: 'Bangun. Uji. Perbaiki.',
          body: 'Wujudkan desain menjadi software. Verifikasi perilaku, tinjau detail, dan persingkat siklus umpan balik.',
        },
        {
          title: 'Operasikan dan kembangkan.',
          body: 'Buat rilis yang terpantau dan konsisten. Pelajari penggunaan nyata dan tingkatkan sistem secara terarah.',
        },
      ],
    },
    contact: {
      label: '04 / BAB BERIKUTNYA',
      line1: 'Punya tantangan',
      line2: 'besar?',
      description:
        'Saya terbuka untuk diskusi tentang sistem, engineering, dan berbagai kemungkinan berikutnya.',
      github: 'Temukan saya di GitHub',
      email: 'Kirim email',
      linkNote: 'Jelajahi karya dan profil publik saya.',
      tagline: 'Mari wujudkan bersama.',
      back: 'Kembali ke atas',
      rights: 'Dibangun dengan tujuan.',
    },
  },
} as const

export interface Project {
  id: string
  number: string
  category: Exclude<Category, 'all'>
  name: string
  type: Record<Language, string>
  title: Record<Language, string>
  description: Record<Language, string>
  overview: Record<Language, string>
  areas: Record<Language, readonly string[]>
  stack: readonly string[]
  url?: string
}

export const projects: readonly Project[] = [
  {
    id: 'mesthi',
    number: '01',
    category: 'platform',
    name: 'MESTHI',
    type: {
      en: 'PERSONAL PLATFORM · IN DEVELOPMENT',
      id: 'PLATFORM PERSONAL · DALAM PENGEMBANGAN',
    },
    title: { en: 'A workspace for what’s next.', id: 'Workspace untuk masa depan.' },
    description: {
      en: 'An evolving platform for AI agents, developer workflows, and intelligent automation.',
      id: 'Platform yang terus berkembang untuk AI agents, alur kerja developer, dan otomatisasi cerdas.',
    },
    overview: {
      en: 'MESTHI brings my interests in AI, platform engineering, and automation into one connected ecosystem. The goal is to give agent-driven work a clear path from an idea to planned execution and reviewable results.',
      id: 'MESTHI menyatukan AI, platform engineering, dan otomatisasi dalam satu ekosistem. Tujuannya memberi pekerjaan berbasis agent alur yang jelas dari ide, perencanaan, hingga hasil yang dapat ditinjau.',
    },
    areas: {
      en: [
        'Workspace and backlog planning',
        'Identity, API boundaries, and model routing',
        'Isolated agent execution and evidence',
      ],
      id: [
        'Perencanaan workspace dan backlog',
        'Identitas, batas API, dan routing model',
        'Eksekusi agent terisolasi dan evidence',
      ],
    },
    stack: ['React', 'TypeScript', 'Python', 'Postgres', 'K3s', 'LLM / MCP'],
    url: 'https://mesthi.com',
  },
  {
    id: 'enterprise',
    number: '02',
    category: 'enterprise',
    name: 'ENTERPRISE SYSTEMS',
    type: {
      en: 'PROFESSIONAL PRACTICE · FINANCIAL INDUSTRY',
      id: 'PENGALAMAN PROFESIONAL · INDUSTRI KEUANGAN',
    },
    title: { en: 'Reliability is a design decision.', id: 'Keandalan dimulai dari desain.' },
    description: {
      en: 'Application architecture and integration work where business continuity matters.',
      id: 'Arsitektur aplikasi dan integrasi untuk kebutuhan kontinuitas bisnis.',
    },
    overview: {
      en: 'My professional work in the financial industry includes enterprise application engineering and system integration. This overview describes my areas of practice; internal implementations and company information remain private.',
      id: 'Pekerjaan profesional saya di industri keuangan mencakup aplikasi enterprise dan integrasi sistem. Ringkasan ini menjelaskan area keahlian saya; implementasi internal dan informasi perusahaan tetap privat.',
    },
    areas: {
      en: [
        'API contracts and service boundaries',
        'Integration and failure-path design',
        'Architecture documentation and delivery collaboration',
      ],
      id: [
        'Kontrak API dan batas service',
        'Integrasi dan desain alur kegagalan',
        'Dokumentasi arsitektur dan kolaborasi delivery',
      ],
    },
    stack: ['Java / Spring Boot', '.NET', 'SQL', 'REST / SOAP', 'System design'],
  },
  {
    id: 'quant',
    number: '03',
    category: 'experiment',
    name: 'THE QUANT LAB',
    type: { en: 'PERSONAL RESEARCH · EXPERIMENTAL', id: 'RISET PERSONAL · EKSPERIMENTAL' },
    title: { en: 'Curiosity, tested against data.', id: 'Rasa ingin tahu, diuji dengan data.' },
    description: {
      en: 'Exploring systematic trading through historical data, backtesting, and automation.',
      id: 'Eksplorasi trading sistematis melalui data historis, backtesting, dan otomatisasi.',
    },
    overview: {
      en: 'A personal research track focused on the engineering behind systematic trading: data pipelines, strategy evaluation, asynchronous workflows, and the gap between a backtest and real-world behavior. The artwork is illustrative, not a performance report.',
      id: 'Riset personal tentang engineering trading sistematis: pipeline data, evaluasi strategi, alur asynchronous, dan perbedaan backtest dengan kondisi nyata. Visualnya adalah ilustrasi, bukan laporan performa.',
    },
    areas: {
      en: [
        'Historical data and indicator pipelines',
        'Backtesting and forward-test methodology',
        'Risk controls and asynchronous execution',
      ],
      id: [
        'Pipeline data historis dan indikator',
        'Metodologi backtest dan forward test',
        'Kontrol risiko dan eksekusi asynchronous',
      ],
    },
    stack: ['Python', 'Pandas', 'CCXT', 'FastAPI', 'Optuna'],
  },
]
