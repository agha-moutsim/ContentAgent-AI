export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-6 text-white tracking-tight">
          Content Execution Agent
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          Transform one content idea into multi-platform content packages with AI precision.
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/signup"
            className="px-6 py-3 bg-primary hover:bg-primary-hover rounded-lg font-semibold transition-colors"
          >
            Get Started
          </a>
          <a
            href="/login"
            className="px-6 py-3 bg-secondary hover:bg-secondary-hover rounded-lg font-semibold transition-colors"
          >
            Log In
          </a>
        </div>
      </div>
    </main>
  )
}
