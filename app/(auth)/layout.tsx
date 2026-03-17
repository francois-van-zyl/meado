export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md z-10">
        {children}
      </div>

      {/* Meadow horizon decoration */}
      <div className="fixed bottom-0 left-0 right-0 pointer-events-none" aria-hidden="true">
        <svg
          viewBox="0 0 1440 120"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="w-full"
        >
          {/* Far hills — lighter sage */}
          <path
            d="M0,80 C120,55 200,70 320,65 C440,60 500,45 620,50 C740,55 800,40 920,48 C1040,56 1120,44 1240,52 C1320,57 1390,62 1440,58 L1440,120 L0,120 Z"
            fill="#A8C4AB"
            opacity="0.5"
          />
          {/* Mid hills — sage green */}
          <path
            d="M0,95 C80,78 160,88 280,82 C380,77 460,65 560,72 C660,79 740,68 860,74 C960,79 1060,65 1160,70 C1280,76 1360,82 1440,78 L1440,120 L0,120 Z"
            fill="#7A9E7E"
            opacity="0.35"
          />
          {/* Foreground ground — deepest */}
          <path
            d="M0,108 C100,100 220,106 360,103 C500,100 580,96 700,100 C820,104 920,98 1040,101 C1160,104 1300,100 1440,104 L1440,120 L0,120 Z"
            fill="#7A9E7E"
            opacity="0.55"
          />
        </svg>
      </div>
    </div>
  )
}
