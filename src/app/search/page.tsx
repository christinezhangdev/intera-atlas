import { SearchPageClient } from "@/components/SearchPageClient";
import { getAllSites } from "@/lib/sites";

export default function SearchPage() {
  const sites = getAllSites().map((s) => ({
    id: s.id,
    name: s.name,
    hq: s.hq,
    type: s.type,
    states: s.states,
    therapeuticAreas: s.therapeuticAreas,
    therapeuticSpecialties: s.therapeuticSpecialties,
    notes: s.notes.slice(0, 400),
    sponsorsWorkedWith: s.sponsorsWorkedWith,
    scores: s.scores,
    histTrials: s.histTrials,
    activeNow: s.activeNow,
    icpScore: s.icpScore,
    spanish: s.spanish,
  }));
  return <SearchPageClient sites={sites} />;
}
