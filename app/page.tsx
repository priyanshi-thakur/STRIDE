export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-stride-ivory text-stride-dark">
      <header className="flex items-center justify-between px-6 py-4">
        <a
          href="#"
          className="font-serif text-xl font-bold tracking-tight text-stride-dark"
        >
          STRIDE
        </a>
        <nav className="flex items-center gap-3" aria-label="Primary navigation">
          <a
            href="/auth/signup"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-stride-olive text-stride-olive-contrast font-medium text-sm transition-colors hover:bg-stride-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2"
          >
            Start a Project
          </a>
          <a
            href="/auth/login"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-stride-stone bg-transparent text-stride-dark font-medium text-sm transition-colors hover:bg-stride-stone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2"
          >
            Explore Scenarios
          </a>
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center relative overflow-hidden px-6">
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div
            className="stride-float top-[-12%] left-[-8%] w-[36%] h-[36%] rounded-full bg-stride-mint/40 blur-[140px]"
          ></div>
          <div
            className="stride-float bottom-[-12%] right-[-8%] w-[36%] h-[36%] rounded-full bg-stride-blush/40 blur-[140px]"
            style={{ animationDelay: "-2s" }}
          ></div>
          <div
            className="absolute top-[18%] right-[16%] w-[22%] h-[22%] rounded-full bg-stride-butter/50 blur-[100px]"
          ></div>
          <div
            className="stride-float left-[12%] top-[42%] w-[20%] h-[20%] rounded-full bg-stride-lavender/40 blur-[90px]"
            style={{ animationDelay: "-4s" }}
          ></div>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-3xl mx-auto space-y-6">
          <h1
            className="text-stride-dark font-serif text-5xl md:text-7xl font-bold leading-tight tracking-tight"
          >
            Build what matters.
          </h1>
          <p
            className="text-stride-dark/80 text-lg md:text-xl max-w-xl leading-relaxed"
          >
            STRIDE guides you from identifying a real problem to researching it,
            defining it clearly, generating ideas, building a prototype, and
            evaluating the result.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="/auth/signup"
              className="inline-flex items-center justify-center px-6 py-3.5 rounded-full bg-stride-olive text-stride-olive-contrast font-medium text-sm transition-colors hover:bg-stride-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2"
            >
              Start a Project
            </a>
            <a
              href="/auth/login"
              className="inline-flex items-center justify-center px-6 py-3.5 rounded-full border border-stride-stone bg-transparent text-stride-dark font-medium text-sm transition-colors hover:bg-stride-stone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2"
            >
              Explore Scenarios
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
