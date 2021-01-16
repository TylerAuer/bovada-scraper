export interface Outcome {
  id: string;
  description: string;
  status: string;
  price: {
    id: string;
    decimal: string;
    handicap?: string;
  };
}

interface BovadaEvent {
  id: string;
  description: string;
  status: string;
  startTime: number;
  displayGroups: {
    id: string;
    description: string;
    markets: {
      id: string;
      descriptionKey: string;
      description: string;
      outcomes: Outcome[];
    }[];
  }[];
}

export type BovadaApiResponse = {
  events: BovadaEvent[];
}[];

export interface BetOutcome {
  desc: string;
  odds: number;
  line?: string;
}

export interface BetData {
  event: string;
  desc: string;
  outcomes: BetOutcome[];
}
