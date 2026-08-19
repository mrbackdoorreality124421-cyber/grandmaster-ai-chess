export type PlayerColor = 'w' | 'b' | 'both';

export interface AIPersonality {
  id: string;
  name: string;
  title: string;
  rating: number;
  depth: number;
  moveTimeMs: number;
  skillLevel: number; // 0-20
  threads: number;
  hash: number;
  contempt: number; // -100 to 100
  blunderRate: number; // 0 to 1
  localSearchDepth: number; // 1 to 4
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

export interface SavedGameState {
  version: number;
  fen: string;
  history: MoveRecord[];
  personalityId: string;
  userColor: PlayerColor;
  isFlipped: boolean;
  timestamp: number;
}
