function AuthLayout({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-sky-100 via-white to-fuchsia-100 p-6">
      <div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-fuchsia-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-sky-300/30 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md items-center">
        <div className="w-full rounded-3xl border border-white/70 bg-white/85 p-8 shadow-xl backdrop-blur-sm">
        {children}
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
