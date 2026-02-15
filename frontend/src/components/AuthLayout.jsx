function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-purple-100 p-6">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md">
        {children}
      </div>
    </div>
  );
}

export default AuthLayout;
