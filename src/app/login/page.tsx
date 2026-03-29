import { login, redirectIfAuthenticated } from "@/app/login/actions";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

const errorMessages: Record<string, string> = {
  invalid: "Invalid username or password.",
  config: "Server is missing DATABASE_URL.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  await redirectIfAuthenticated();

  const params = await searchParams;
  const errorText = params.error ? errorMessages[params.error] ?? "Unable to sign in." : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="rounded-3xl border border-white/70 bg-white/85 p-8 shadow-2xl shadow-cyan-950/20 backdrop-blur">
        <p className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-cyan-900">
          Simple CRM
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">Sign in</h1>
        <p className="mt-2 text-sm text-slate-600">Use your team username and password to access your workspace.</p>

        {errorText ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorText}</p>
        ) : null}

        <form action={login} className="mt-6 space-y-4">
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            <span>Username</span>
            <input
              name="username"
              required
              autoComplete="username"
              className="rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-cyan-700"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-700">
            <span>Password</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-cyan-700"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-slate-900 to-cyan-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-cyan-900/20"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
