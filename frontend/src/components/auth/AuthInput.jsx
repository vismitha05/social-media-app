function AuthInput({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  autoComplete,
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:scale-[1.01] focus:ring-2 ${
          error
            ? "border-rose-300 focus:border-rose-400 focus:ring-rose-200"
            : "border-slate-200 focus:border-sky-400 focus:ring-sky-200"
        }`}
      />
      {error && <span className="mt-1 block text-xs text-rose-500">{error}</span>}
    </label>
  );
}

export default AuthInput;
