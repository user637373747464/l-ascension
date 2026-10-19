import { describe, expect, it } from 'vitest'
import { activitySkills, getSkillProgress, skillForActivity } from './skills'
import type { SessionRecord } from '../features/sessions/model'

const session = (id: string, minutes: number, outcome: 'completed' | 'abandoned' = 'completed'): SessionRecord => ({
  id, mountainId: 'mountain-001', activity: 'Mathématiques', skill: 'Concentration',
  plannedDurationMinutes: Math.max(5, minutes), startedAt: 0, endsAt: minutes * 60_000,
  endedAt: minutes * 60_000, actualDurationSeconds: minutes * 60, outcome,
  skillXpLost: outcome === 'abandoned' ? minutes : 0,
})

describe('compétences associées aux matières', () => {
  it('garde une compétence fixe pour chaque activité', () => {
    expect(activitySkills.map(({ activity, skill }) => [activity, skill])).toEqual([
      ['Mathématiques', 'Concentration'],
      ['Physique', 'Rigueur'],
      ['Informatique', 'Logique'],
      ['Anglais', 'Communication'],
      ['Sport', 'Endurance'],
    ])
    expect(skillForActivity('Mathématiques')).toBe('Concentration')
  })

  it('commence au niveau zéro et augmente le seuil de 50 XP à chaque niveau', () => {
    expect(getSkillProgress('Mathématiques', []).level).toBe(0)
    expect(getSkillProgress('Mathématiques', [session('50', 50)])).toMatchObject({ xp: 50, level: 1, xpIntoLevel: 0, xpForNextLevel: 100 })
    expect(getSkillProgress('Mathématiques', [session('149', 149)])).toMatchObject({ xp: 149, level: 1, xpIntoLevel: 99, xpForNextLevel: 100 })
    expect(getSkillProgress('Mathématiques', [session('150', 150)])).toMatchObject({ xp: 150, level: 2, xpIntoLevel: 0, xpForNextLevel: 150 })
  })

  it('ne crédite pas d’XP pour une session interrompue', () => {
    expect(getSkillProgress('Mathématiques', [session('partial', 40, 'abandoned')]).xp).toBe(0)
  })

  it('retire l’expérience d’une ascension abandonnée sans descendre sous zéro', () => {
    const history = [session('completed', 70), session('abandoned', 25, 'abandoned')]
    expect(getSkillProgress('Mathématiques', history)).toMatchObject({ xp: 45, level: 0, xpIntoLevel: 45, xpForNextLevel: 50 })
  })

  it('ne transforme pas une perte non subie en dette XP future', () => {
    const abandonedAtLevelZero: SessionRecord = { ...session('abandoned', 25, 'abandoned'), skillXpLost: 0 }
    expect(getSkillProgress('Mathématiques', [session('later', 50), abandonedAtLevelZero]).xp).toBe(50)
  })
})
