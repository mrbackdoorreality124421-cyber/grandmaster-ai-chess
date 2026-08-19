import { AIPersonality, PresetVariant } from '../types/chess';

export const LION_MODE: AIPersonality = {
  id: 'lion-apex',
  name: 'LION MODE — Always Winner',
  title: 'Apex Grandmaster',
  rating: 3550,
  depth: 28,
  moveTimeMs: 4000,
  skillLevel: 20,
  threads: 2,
  hash: 128,
  contempt: 200,
  icon: '🦁',
  badge: 'APEX NNUE',
  tagline: 'Always Winner • Deep NNUE • Unbeatable Strategy',
  openingStyle: 'Grandmaster Mastery'
};

export const PRESET_VARIANTS: PresetVariant[] = [
  {
    id: 'standard',
    name: 'Standard Chess',
    description: 'Official tournament starting position',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  }
];
