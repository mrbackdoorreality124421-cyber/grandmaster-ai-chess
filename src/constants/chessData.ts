import { AIPersonality, PresetVariant } from '../types/chess';
import { generateChess960FEN } from '../utils/chess960';

export const AI_PERSONALITIES: AIPersonality[] = [
  {
    id: 'novice',
    name: 'Novice',
    title: 'Casual Player',
    rating: 800,
    depth: 3,
    moveTimeMs: 400,
    skillLevel: 1,
    threads: 1,
    hash: 16,
    contempt: 0,
    blunderRate: 0.35,
    localSearchDepth: 1,
    icon: '♟️',
    badge: 'ELO 800',
    tagline: 'Casual & friendly moves with occasional mistakes',
    openingStyle: 'Basic Principles'
  },
  {
    id: 'club-player',
    name: 'Club Player',
    title: 'Tactical Intermediate',
    rating: 1400,
    depth: 6,
    moveTimeMs: 700,
    skillLevel: 6,
    threads: 1,
    hash: 32,
    contempt: 15,
    blunderRate: 0.15,
    localSearchDepth: 2,
    icon: '♞',
    badge: 'ELO 1400',
    tagline: 'Solid basic openings with light tactical vision',
    openingStyle: 'Standard Classical'
  },
  {
    id: 'expert',
    name: 'Expert',
    title: 'Candidate Master',
    rating: 1800,
    depth: 10,
    moveTimeMs: 1100,
    skillLevel: 12,
    threads: 2,
    hash: 64,
    contempt: 30,
    blunderRate: 0.05,
    localSearchDepth: 2,
    icon: '♝',
    badge: 'ELO 1800',
    tagline: 'Sharp tactical combinations & piece harmony',
    openingStyle: 'Aggressive Mainlines'
  },
  {
    id: 'master',
    name: 'Master',
    title: 'National Master',
    rating: 2200,
    depth: 14,
    moveTimeMs: 1500,
    skillLevel: 16,
    threads: 2,
    hash: 64,
    contempt: 50,
    blunderRate: 0.01,
    localSearchDepth: 3,
    icon: '♜',
    badge: 'ELO 2200',
    tagline: 'Deep calculation, endgame mastery & zero blunders',
    openingStyle: 'Deep Book Theory'
  },
  {
    id: 'grandmaster',
    name: 'Grandmaster',
    title: 'International GM',
    rating: 2600,
    depth: 18,
    moveTimeMs: 2000,
    skillLevel: 20,
    threads: 2,
    hash: 128,
    contempt: 75,
    blunderRate: 0.0,
    localSearchDepth: 3,
    icon: '♛',
    badge: 'ELO 2600',
    tagline: 'Elite championship calculation & positional squeeze',
    openingStyle: 'World Championship Prep'
  },
  {
    id: 'lion-apex',
    name: 'LION APEX',
    title: 'Apex Superhuman',
    rating: 3550,
    depth: 24,
    moveTimeMs: 2800,
    skillLevel: 20,
    threads: 2,
    hash: 128,
    contempt: 100,
    blunderRate: 0.0,
    localSearchDepth: 4,
    icon: '🦁',
    badge: 'APEX 3550+',
    tagline: 'Always Winner • Deep NNUE • Unbeatable Calculation',
    openingStyle: 'Grandmaster Mastery'
  }
];

export const LION_MODE = AI_PERSONALITIES[5];

export const PRESET_VARIANTS: PresetVariant[] = [
  {
    id: 'standard',
    name: 'Standard Chess',
    description: 'Official tournament starting position',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  },
  {
    id: 'chess960',
    name: 'Fischer Random / Chess960',
    description: 'Randomized back rank (castling disabled in standard rules)',
    fen: generateChess960FEN()
  },
  {
    id: 'queens-gambit',
    name: "Queen's Gambit Practice",
    description: '1. d4 d5 2. c4 starting position',
    fen: 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 2'
  },
  {
    id: 'endgame-kp',
    name: 'King & Pawn Endgame',
    description: 'Fundamental endgame pawn breakthrough drill',
    fen: '8/4k3/8/4P3/8/8/4K3/8 w - - 0 1'
  }
];
