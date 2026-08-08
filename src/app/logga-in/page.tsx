import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="mx-auto min-h-[calc(100vh-80px)] w-full max-w-7xl px-5 py-12 sm:px-8 lg:py-16">
      <section className="max-w-3xl">
        <p className="text-sm font-bold uppercase text-[var(--moss)]">Konto</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">Logga in i GroBiggis V2</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted)]">
          Ange din e-postadress så skickar vi en engångslänk. När du är inloggad sparas dina odlingsomgångar på ditt konto.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
