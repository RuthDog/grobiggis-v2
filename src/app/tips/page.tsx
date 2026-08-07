import type { Metadata } from "next";
import { TipsLibrary } from "./TipsLibrary";

export const metadata: Metadata = {
  title: "Tips & kunskap | GroBiggis V2",
  description: "Sök bland granskade odlingsguider i GroBiggis V2.",
};

export default function TipsPage() {
  return (
    <main>
      <TipsLibrary />
    </main>
  );
}
