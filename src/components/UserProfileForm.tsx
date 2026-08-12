"use client";

import { useState, useTransition, type FormEvent } from "react";
import { saveUserProfileAction, searchLocalityAction } from "@/lib/user-profile/actions";
import type { GeocodingCandidate } from "@/services/geocoding/types";

function formatCandidateLocation(candidate: GeocodingCandidate) {
  return [candidate.admin1, candidate.country].filter(Boolean).join(", ");
}

function hasCoordinates(latitude?: number | null, longitude?: number | null) {
  return latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined;
}

export function UserProfileForm({
  firstName,
  locality,
  latitude,
  longitude,
}: Readonly<{ firstName?: string | null; locality?: string | null; latitude?: number | null; longitude?: number | null }>) {
  const initialVerifiedLocality = hasCoordinates(latitude, longitude) ? (locality ?? "") : "";
  const [name, setName] = useState(firstName ?? "");
  const [place, setPlace] = useState(locality ?? "");
  const [persistedVerifiedLocality, setPersistedVerifiedLocality] = useState(initialVerifiedLocality);
  const [persistedLocationSummary, setPersistedLocationSummary] = useState(initialVerifiedLocality);
  const [candidates, setCandidates] = useState<GeocodingCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<GeocodingCandidate | null>(null);
  const [message, setMessage] = useState("");
  const [searchMessage, setSearchMessage] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isPending, startTransition] = useTransition();

  const trimmedPlace = place.trim();
  const verifiedBySavedProfile = Boolean(persistedVerifiedLocality && trimmedPlace === persistedVerifiedLocality && !selectedCandidate);
  const selectedLocationSummary = selectedCandidate ? formatCandidateLocation(selectedCandidate) : "";
  const statusText = selectedCandidate
    ? `Vald plats: ${[selectedCandidate.name, selectedLocationSummary].filter(Boolean).join(", ")}.`
    : verifiedBySavedProfile
      ? `Platsen är verifierad${persistedLocationSummary ? `: ${persistedLocationSummary}.` : "."}`
      : "Odlingsorten är inte verifierad ännu.";

  const changePlace = (value: string) => {
    setPlace(value);
    setCandidates([]);
    setSearchMessage("");
    if (selectedCandidate && value.trim() !== selectedCandidate.name) setSelectedCandidate(null);
  };

  const searchLocality = async () => {
    setMessage("");
    setSearchMessage("");
    setCandidates([]);
    setSelectedCandidate(null);

    if (trimmedPlace.length < 2) {
      setSearchMessage("Skriv minst två tecken för att söka ort.");
      return;
    }

    setIsSearching(true);
    const result = await searchLocalityAction(trimmedPlace);
    setIsSearching(false);

    if (!result.ok) {
      setSearchMessage(result.error);
      return;
    }

    setCandidates(result.candidates);
    if (result.candidates.length === 0) setSearchMessage("Vi hittade ingen svensk ort med det namnet.");
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    startTransition(async () => {
      const result = await saveUserProfileAction({
        firstName: name,
        locality: place,
        selectedLocation: selectedCandidate,
      });

      if (!result.ok) {
        setMessage(result.error);
        return;
      }

      if (selectedCandidate) {
        setPersistedVerifiedLocality(selectedCandidate.name);
        setPersistedLocationSummary([selectedCandidate.name, selectedLocationSummary].filter(Boolean).join(", "));
        setPlace(selectedCandidate.name);
        setCandidates([]);
      } else if (persistedVerifiedLocality && trimmedPlace !== persistedVerifiedLocality) {
        setPersistedVerifiedLocality("");
        setPersistedLocationSummary("");
      }

      setMessage("Profilen är sparad.");
    });
  };

  return (
    <form className="grid gap-5 rounded-[2rem] border border-[color:var(--line)] bg-white/80 p-5 shadow-[0_18px_46px_rgba(28,67,53,0.08)] sm:p-6" onSubmit={submit}>
      <div>
        <label className="text-sm font-semibold" htmlFor="profile-first-name">
          Förnamn
        </label>
        <input
          className="mt-2 min-h-12 w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 outline-none focus:border-[var(--moss)] focus:ring-4 focus:ring-[var(--focus)]"
          id="profile-first-name"
          maxLength={60}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ola"
          value={name}
        />
      </div>

      <div>
        <label className="text-sm font-semibold" htmlFor="profile-locality">
          Odlingsort
        </label>
        <div className="mt-2 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input
            className="min-h-12 w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 outline-none focus:border-[var(--moss)] focus:ring-4 focus:ring-[var(--focus)]"
            id="profile-locality"
            maxLength={100}
            onChange={(event) => changePlace(event.target.value)}
            placeholder="Halmstad"
            value={place}
          />
          <button
            className="min-h-12 rounded-full border border-[color:var(--line)] bg-white px-5 text-sm font-bold text-[var(--forest)] shadow-[0_10px_22px_rgba(28,67,53,0.08)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSearching || isPending}
            onClick={searchLocality}
            type="button"
          >
            {isSearching ? "Söker..." : "Sök ort"}
          </button>
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Din odlingsort används framöver för lokala råd och väder.
        </p>
        <p className="mt-2 rounded-2xl bg-[var(--sage-light)] px-4 py-3 text-sm font-semibold text-[var(--forest)]">{statusText}</p>
      </div>

      {searchMessage ? <p className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[var(--soil)]">{searchMessage}</p> : null}

      {candidates.length > 0 ? (
        <fieldset className="grid gap-3">
          <legend className="text-sm font-semibold">Välj rätt ort</legend>
          {candidates.map((candidate) => {
            const location = formatCandidateLocation(candidate);
            return (
              <label
                className="grid cursor-pointer grid-cols-[auto_1fr] gap-3 rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm transition hover:border-[var(--moss)]"
                key={candidate.providerId}
              >
                <input
                  checked={selectedCandidate?.providerId === candidate.providerId}
                  className="mt-1"
                  name="profile-location-candidate"
                  onChange={() => {
                    setSelectedCandidate(candidate);
                    setPlace(candidate.name);
                    setSearchMessage("");
                  }}
                  type="radio"
                />
                <span>
                  <span className="block font-bold text-[var(--forest)]">{candidate.name}</span>
                  {location ? <span className="block leading-6 text-[var(--muted)]">{location}</span> : null}
                </span>
              </label>
            );
          })}
        </fieldset>
      ) : null}

      {message ? <p className="rounded-2xl bg-[var(--sage-light)] px-4 py-3 text-sm font-semibold text-[var(--forest)]">{message}</p> : null}

      <button
        className="min-h-12 rounded-full bg-[var(--forest)] px-5 text-sm font-bold text-white shadow-[0_12px_26px_rgba(25,69,56,0.18)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending || isSearching}
        type="submit"
      >
        {isPending ? "Sparar..." : "Spara profil"}
      </button>
    </form>
  );
}
