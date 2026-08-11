import Link from "next/link";
import { PlantVisual } from "@/components/PlantVisual";
import { RemoveShoppingListItemButton } from "@/components/RemoveShoppingListItemButton";
import { getCurrentUserShoppingList } from "@/lib/shopping-list/server";

export const dynamic = "force-dynamic";

export default async function ShoppingListPage() {
  const items = await getCurrentUserShoppingList();

  if (!items) {
    return (
      <main className="mx-auto grid w-full max-w-3xl gap-6 px-5 py-12 sm:px-8">
        <section className="rounded-[2rem] border border-[color:var(--line)] bg-white/75 px-6 py-14 text-center">
          <p className="text-sm font-bold uppercase text-[var(--moss)]">Inköpslista</p>
          <h1 className="mt-3 text-3xl font-semibold">Du behöver logga in.</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">
            Logga in för att spara växter som du vill komma ihåg att köpa.
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

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:py-14">
      <section className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(280px,0.5fr)] lg:items-end">
        <div>
          <p className="text-sm font-bold uppercase text-[var(--moss)]">Inköpslista</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">Växter du vill komma ihåg att köpa.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Lägg till växter från Växtbiblioteket när du vill spara dem till senare. Listan påverkar inte Min plan eller dina odlingsomgångar.
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/80 p-5 shadow-[0_14px_34px_rgba(28,67,53,0.06)]">
          <p className="text-sm font-semibold text-[var(--muted)]">Personlig lista</p>
          <p className="mt-2 text-3xl font-semibold">{items.length}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Varje växt kan bara finnas en gång per användare, men olika användare kan spara samma växt separat.</p>
        </div>
      </section>

      {items.length ? (
        <section aria-label="Inköpslista" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article
              className="grid gap-4 rounded-[1.75rem] border border-[color:var(--line)] bg-[rgba(255,254,250,0.88)] p-5 shadow-[0_18px_46px_rgba(28,67,53,0.08)]"
              key={item.itemId}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <PlantVisual plant={item.plant} plantId={item.plantId} />
                  <div>
                    <h2 className="text-xl font-semibold">{item.plant?.name ?? "Okänd växt"}</h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">{item.plant?.category ?? "Katalogreferensen saknas i den aktuella versionen."}</p>
                  </div>
                </div>
              </div>

              <p className="text-sm leading-6 text-[var(--muted)]">
                {item.plant?.description ?? "Den här listposten finns kvar för att undvika dataloss, men växten finns inte längre i den aktuella katalogen."}
              </p>

              <div className="mt-auto flex flex-wrap gap-3">
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--forest)] px-4 text-sm font-bold text-white shadow-[0_10px_22px_rgba(25,69,56,0.14)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
                  href="/vaxtbibliotek"
                >
                  Till Växtbiblioteket
                </Link>
                <RemoveShoppingListItemButton itemId={item.itemId} />
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="rounded-[2rem] border border-dashed border-[color:var(--line)] bg-white/70 px-6 py-14 text-center">
          <h2 className="text-2xl font-semibold">Din inköpslista är tom.</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">
            Lägg till växter från Växtbiblioteket som du vill komma ihåg att köpa.
          </p>
          <Link
            className="mt-6 inline-flex min-h-12 items-center rounded-full bg-[var(--forest)] px-6 text-sm font-bold text-white shadow-[0_12px_26px_rgba(25,69,56,0.18)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
            href="/vaxtbibliotek"
          >
            Utforska Växtbiblioteket
          </Link>
        </section>
      )}
    </main>
  );
}
