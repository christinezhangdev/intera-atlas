export type SearchHit = {
  id: string;
  name: string;
  hq: string;
  type: string;
  states: string;
  therapeuticAreas: string;
  sponsorsWorkedWith: string;
  scores: {
    overallSiteQuality: number | null;
    recruitmentStrength: number | null;
    operationalMaturity: number | null;
    sponsorAttractiveness: number | null;
    therapeuticExpertise: number | null;
    band: string;
  };
};
