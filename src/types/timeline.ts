export interface NodePhoto {
  src: string;
  title: string;
  step?: number; // journey entry index — for multi-visit locations
}

export interface TimelineNode {
  id: string;
  title: string;
  subtitle?: string;
  coordinates: [number, number]; // [x, y] pixel position on the map image
  thumbnail: string;
  photos?: NodePhoto[];
  summary: string;
  details?: string;
  sessionNumber?: number;
  tags?: string[];
  date?: string;
}

export interface PathSegment {
  from: string;
  to: string;
  waypoints?: [number, number][];
  style?: "normal" | "dangerous" | "stealthy" | "teleport";
  partyLevel?: number;
}

export interface CharacterDef {
  name: string;
  assets: string[];
  flip?: boolean;   // horizontally flip this character's art
  scale?: number;   // relative size multiplier (default 1.0)
  yOffset?: number; // vertical pixel shift (positive = down)
  order?: number;   // grid position priority (lower = back row, left side)
}

export interface GroupMemberRef {
  id: string;
  variant: number;
}

export interface GroupChange {
  atStep: number;
  set: GroupMemberRef[];
  location?: string; // node ID — for groups with a fixed location (e.g. allies)
}

export interface GroupDef {
  default: GroupMemberRef[] | null;
  changes?: GroupChange[];
}

export interface GroupManifestEntry {
  image: string | null;
  location: string | null;
}

export interface GroupManifest {
  [step: string]: GroupManifestEntry;
}

export interface CampaignData {
  campaign: {
    name: string;
    dm: string;
    startDate: string;
    startingLevel?: number;
    characters?: Record<string, CharacterDef>;
    groups?: Record<string, GroupDef>;
  };
  nodes: TimelineNode[];
  paths: PathSegment[];
}
