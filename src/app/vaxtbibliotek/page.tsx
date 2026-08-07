import type { Metadata } from "next";
import { PlantLibrary } from "./PlantLibrary";

export const metadata: Metadata = {
  title: "Växtbibliotek | GroBiggis V2",
  description: "Sök i GroBiggis statiska växtkatalog.",
};

export default function PlantLibraryPage() {
  return (
    <main>
      <PlantLibrary />
    </main>
  );
}
