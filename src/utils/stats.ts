import type { GameState, Difficulty } from '../engine/types';

export interface GameRecord {
  id: string;
  date: string;
  result: 'win' | 'loss' | 'tie';
  difficulty: Difficulty;
  expansions: { extinction: boolean; acrobatic: boolean };
  humanFirst: boolean;
  rounds: number;
  player: { total: number; subtotal: number; extinctionBonus: number; acrobaticBonus: number };
  ai: { total: number; subtotal: number; extinctionBonus: number; acrobaticBonus: number };
}

export interface AggregatedStats {
  total: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number;
  avgPlayerScore: number;
  avgAiScore: number;
  bestPlayerScore: number;
  worstPlayerScore: number;
  byDifficulty: Record<Difficulty, { total: number; wins: number }>;
}

const STORAGE_KEY = 'cocolomo-stats';

export function getRecords(): GameRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GameRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveGameResult(state: GameState): void {
  const { playerScore, aiScore } = state;
  const result: 'win' | 'loss' | 'tie' =
    playerScore.total > aiScore.total ? 'win' :
    playerScore.total < aiScore.total ? 'loss' : 'tie';

  const record: GameRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    date: new Date().toISOString(),
    result,
    difficulty: state.difficulty,
    expansions: { ...state.expansionConfig },
    humanFirst: state.humanPlaysFirst,
    rounds: state.round,
    player: {
      total: playerScore.total,
      subtotal: playerScore.subtotal,
      extinctionBonus: playerScore.extinctionBonus,
      acrobaticBonus: playerScore.acrobaticBonus,
    },
    ai: {
      total: aiScore.total,
      subtotal: aiScore.subtotal,
      extinctionBonus: aiScore.extinctionBonus,
      acrobaticBonus: aiScore.acrobaticBonus,
    },
  };

  const records = getRecords();
  records.push(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function getAggregatedStats(): AggregatedStats | null {
  const records = getRecords();
  if (records.length === 0) return null;

  const wins = records.filter(r => r.result === 'win').length;
  const losses = records.filter(r => r.result === 'loss').length;
  const ties = records.filter(r => r.result === 'tie').length;
  const total = records.length;

  const avgPlayerScore = Math.round(records.reduce((s, r) => s + r.player.total, 0) / total);
  const avgAiScore = Math.round(records.reduce((s, r) => s + r.ai.total, 0) / total);
  const bestPlayerScore = Math.max(...records.map(r => r.player.total));
  const worstPlayerScore = Math.min(...records.map(r => r.player.total));

  const byDifficulty = {} as AggregatedStats['byDifficulty'];
  for (const diff of ['EASY', 'HARD', 'EXTREME'] as const) {
    const sub = records.filter(r => r.difficulty === diff);
    byDifficulty[diff] = { total: sub.length, wins: sub.filter(r => r.result === 'win').length };
  }

  return {
    total,
    wins,
    losses,
    ties,
    winRate: Math.round((wins / total) * 100),
    avgPlayerScore,
    avgAiScore,
    bestPlayerScore,
    worstPlayerScore,
    byDifficulty,
  };
}

export function clearStats(): void {
  localStorage.removeItem(STORAGE_KEY);
}
