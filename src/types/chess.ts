export type PlayerColor = 'w' | 'b' | 'both';

export interface AIPersonality {
  id: string;
  name: string;
  title: string;
  rating: number;
  depth: number;
  moveTimeMs: number;
  skillLevel: number;
  threads: number;
  hash: number;
  contempt: number;
  icon: string;
  badge: string;
  tagline: string;
  openingStyle: string;
}

export interface PresetVariant {
  id: string;
  name: string;
  description: string;
  fen: string;
}

export interface MoveRecord {
  san: string;
  from: string;
  to: string;
  piece: string;
  color: 'w' | 'b';
  captured?: string;
  promotion?: string;
  flags: string;
  fenBefore: string;
  fenAfter: string;
}
