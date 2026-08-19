export type AIPersonalityId = 
  | 'human_play'
  | 'human_pro'
  | 'tournament_player'
  | 'extreme_fast'
  | 'extreme_slow'
  | 'hacker_extreme';

export interface AIPersonality {
  id: AIPersonalityId;
  name: string;
  subtitle: string;
  icon: string;
  color: string;
  borderColor: string;
  badgeBg: string;
  skillLevel: number; // 0-20
  depth: number;
  moveTime?: number; // ms
  contempt: number; // -100 to 100
  multiPv: number;
  hash: number;
  description: string;
  playstyle: string;
  psychologicalTag: string;
}

export interface PresetVariant {
  id: string;
  name: string;
  category: 'standard' | 'opening' | 'puzzle' | 'endgame' | 'custom';
  description: string;
  fen: string;
  icon: string;
  whiteTurn?: boolean;
}

export type PlayerColor = 'w' | 'b' | 'both' | 'spectate';

export interface EngineEvaluation {
  scoreCp: number | null; // Centipawns from White's perspective
  mate: number | null; // Mate in X moves (positive for white, negative for black)
  depth: number;
  selDepth: number;
  nps: number;
  nodes: number;
  bestMove: string; // UCI format e.g. "e2e4"
  bestMoveSan?: string; // Standard Algebraic Notation e.g. "e4"
  ponder?: string;
  pv: string[]; // List of UCI moves
  pvSan?: string[]; // List of SAN moves
  isThinking: boolean;
  threatMove?: string;
  threatSan?: string;
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
  evalBefore?: EngineEvaluation;
  evalAfter?: EngineEvaluation;
  comment?: string;
}

export interface GodModeState {
  isActive: boolean;
  draggingPiece: {
    type: string;
    color: 'w' | 'b';
    fromSquare: string | null; // null if from palette
  } | null;
  dragPos: { x: number; y: number } | null;
  hoverSquare: string | null;
  isOffBoard: boolean;
}
