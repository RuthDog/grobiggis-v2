import Link from "next/link";
import { UserProfileForm } from "@/components/UserProfileForm";
import { getCurrentUser } from "@/lib/auth/server";
import { getCurrentUserProfile } from "@/lib/user-profile/server";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main className="mx-auto grid w-full max-w-3xl gap-6 px-5 py-12 sm:px-8">
        <section className="rounded-[2rem] border border-[color:var(--line)] bg-white/75 px-6 py-14 text-center">
          <p className="text-sm font-bold uppercase text-[var(--moss)]">Profil</p>
          <h1 className="mt-3 text-3xl font-semibold">Du behöver logga in.</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">
            Logga in för att spara ditt förnamn och din odlingsort.
          </p>
          <Link
            className="mt-6 inline-flex min-h-12 items-center rounded-full bg-[var(--forest)] px-6 text-sm font-bold text-white shadow-[0_12px_26px_rgba(25,69,56,0.18)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
            href="/logga-in"
          >
            Logga in
          </Link>
        </section>
      </main>
    );
  }

  const profile = await getCurrentUserProfile();

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(320px,0.55fr)] lg:items-start lg:py-14">
      <section>
        <p className="text-sm font-bold uppercase text-[var(--moss)]">Profil</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">Din odlingsplats i Grobiggis.</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)]">
          Spara ditt förnamn och orten där du odlar. Det här blir grunden för mer lokala råd längre fram.
        </p>
      </section>

      <UserProfileForm firstName={profile?.firstName} latitude={profile?.latitude} locality={profile?.locality} longitude={profile?.longitude} />
    </main>
  );
}
