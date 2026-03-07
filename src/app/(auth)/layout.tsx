export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-black">
      {/* Dynamic Aurora Background */}
      <div className="aurora-bg" />
      
      <div className="w-full max-w-md space-y-8 relative z-10 animate-fade-in">
        {children}
      </div>
    </div>
  )
}
