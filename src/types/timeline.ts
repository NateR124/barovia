export interface TimelineNode {
  id: string;
  title: string;
  subtitle?: string;
  coordinates: [number, number]; // [x, y] pixel position on the map image
  thumbnail: string;
  summary: string;
  details?: string;
  sessionNumber: number;
  tags?: string[];
  date?: string;
}

export interface PathSegment {
  from: string;
  to: string;
  waypoints?: [number, number][];
  style?: "normal" | "dangerous" | "stealthy";
}

export interface PartyMember {
  name: string;
  class: string;
  player: string;
}

export interface CampaignData {
  campaign: {
    name: string;
    dm: string;
    startDate: string;
    party: PartyMember[];
  };
  nodes: TimelineNode[];
  paths: PathSegment[];
}
