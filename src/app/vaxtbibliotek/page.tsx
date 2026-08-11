import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/server";
import { getCurrentUserShoppingPlantIds } from "@/lib/shopping-list/server";
import { PlantLibrary } from "./PlantLibrary";

export const metadata: Metadata = {
  title: "Växtbibliotek | GroBiggis V2",
  description: "Sök i GroBiggis statiska växtkatalog.",
};

export const dynamic = "force-dynamic";

export default async function PlantLibraryPage() {
  const user = await getCurrentUser();
  const shoppingPlantIds = await getCurrentUserShoppingPlantIds();

  return (
    <main>
      <PlantLibrary isAuthenticated={Boolean(user)} shoppingPlantIds={[...shoppingPlantIds]} />
    </main>
  );
}
