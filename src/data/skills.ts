import type { SessionRecord } from '../features/sessions/model'

export const activitySkills = [
  { activity: 'Mathématiques', skill: 'Concentration', description: 'Tenir son attention sur un problème.' },
  { activity: 'Physique', skill: 'Rigueur', description: 'Construire un raisonnement précis.' },
  { activity: 'Informatique', skill: 'Logique', description: 'Décomposer et résoudre.' },
  { activity: 'Anglais', skill: 'Communication', description: 'Comprendre et s’exprimer.' },
  { activity: 'Sport', skill: 'Endurance', description: 'Maintenir un effort dans le temps.' },
] as const

export type ActivityName = typeof activitySkills[number]['activity']

export function skillForActivity(activity: string): string {
  return activitySkills.find((item) => item.activity === activity)?.skill ?? activitySkills[0].skill
}

export interface SkillProgress {
  xp: number
  level: number
  xpIntoLevel: number
  xpForNextLevel: number
  percentToNextLevel: number
}

/** One experience point per complete minute in a session that reached its planned end, with its captured equipment bonus. */
export function getSkillProgress(activity: string, history: SessionRecord[]): SkillProgress {
  const creditedXp = history.reduce((total, session) => {
    if (session.activity !== activity || session.outcome !== 'completed') return total
    const bonus = session.gearBonuses?.skillXpPercent ?? 0
    return total + Math.floor(session.actualDurationSeconds * (1 + bonus / 100) / 60)
  }, 0)
  const lostXp = history.reduce((total, session) => session.activity === activity && session.outcome === 'abandoned' ? total + session.skillXpLost : total, 0)
  const xp = Math.max(0, creditedXp - lostXp)

  let remainingXp = xp
  let level = 0
  let xpForNextLevel = 50
  while (remainingXp >= xpForNextLevel) {
    remainingXp -= xpForNextLevel
    level += 1
    xpForNextLevel = (level + 1) * 50
  }

  return {
    xp,
    level,
    xpIntoLevel: remainingXp,
    xpForNextLevel,
    percentToNextLevel: Math.min(100, (remainingXp / xpForNextLevel) * 100),
  }
}

export function getTotalSkillExperience(history: SessionRecord[]): number {
  return activitySkills.reduce((total, item) => total + getSkillProgress(item.activity, history).xp, 0)
}
