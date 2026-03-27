import Image from "next/image";
import { Button } from "@/src/components/ui/button";
import { LoginButton } from "@/src/components/auth/login-button";

export default function Home() {
  return (
    <main className="min-h-full bg-gradient-to-br from-slate-50 via-sky-50 to-indigo-100">
      {/* subtle background accents */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.18),_transparent_55%)]" />
      </div>

      <div className="relative mx-auto flex min-h-full max-w-6xl items-center justify-center px-4 py-10 sm:py-16">
        <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10 items-center">
          {/* Brand panel */}
          <section className="text-slate-900">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-white/70 p-3 ring-1 ring-black/5 backdrop-blur">
                <Image
                  src="/images/logo_square.svg"
                  alt="Radhe Beautic"
                  width={40}
                  height={40}
                  priority
                />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                  Radhe Beautic
                </h1>
                <p className="text-slate-600 text-sm sm:text-base">
                  Manage catalogue, stock, and sales in one place.
                </p>
              </div>
            </div>

            <div className="mt-8 hidden lg:block">
              <div className="rounded-2xl bg-white/70 ring-1 ring-black/5 backdrop-blur p-5">
                <p className="text-slate-900 font-medium">Quick tips</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  <li>- Use size filters to find stock faster</li>
                  <li>- Download images/videos from Catalogue actions</li>
                  <li>- Keep customer visibility updated per category</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Sign-in card */}
          <section className="flex justify-center lg:justify-end">
            <div className="w-full max-w-md rounded-2xl bg-white/95 p-6 shadow-2xl ring-1 ring-black/5 backdrop-blur">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Sign in
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Continue to your dashboard.
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <LoginButton>
                  <Button size="lg" className="w-full">
                    Continue to sign in
                  </Button>
                </LoginButton>
              </div>

              <div className="mt-4 text-xs text-slate-500 leading-relaxed">
                By continuing, you agree to our policies and acknowledge that
                access may be restricted based on your role.
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
