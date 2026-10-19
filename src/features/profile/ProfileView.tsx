import { asset } from '../../assetUrl'
import { useMemo, useState } from 'react'
import { activitySkills, getSkillProgress, getTotalSkillExperience } from '../../data/skills'
import { CHARA_HERO } from '../chara/Chara'
import { type SessionData } from '../sessions/model'
import { GearPixel } from './gearIcons'
import { TenzinScene, type TenzinReaction } from './TenzinScene'
import {
  GEAR_SHEET,
  gear,
  gearCategories,
  getEquippedBonuses,
  getExpeditionPebbles,
  loadProfile,
  saveProfile,
  type GearItem,
  type ProfileState,
} from './gear'

type RadarSkill = { activity: string; skill: string; level: number; score: number; xp: number; next: number; percent: number }

function EquipmentSprite({ item, className = '' }: { item: GearItem; className?: string }) {
  if (item.pixel) return <GearPixel id={item.pixel} className={className} label={item.name} />
  const { x, y, width, height } = item.sprite!
  const scaleX = 1024 / 1536
  const scaleY = 683 / 1024
  return <svg className={`gear-sprite ${className}`} viewBox={`${x * scaleX} ${y * scaleY} ${width * scaleX} ${height * scaleY}`} role="img" aria-label={item.name}>
    <image href={GEAR_SHEET} x="0" y="0" width="1024" height="683" preserveAspectRatio="none" />
  </svg>
}

function SkillRadar({ skills }: { skills: RadarSkill[] }) {
  const cx = 180
  const cy = 153
  const radius = 94
  const scale = Math.max(1, Math.ceil(Math.max(...skills.map((item) => item.score))))
  const point = (index: number, value: number, extra = 0) => {
    const angle = ((-90 + index * (360 / skills.length)) * Math.PI) / 180
    const r = radius * (value / scale) + extra
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r }
  }
  const polygon = (value: number) => skills.map((_, index) => {
    const position = point(index, value)
    return `${position.x},${position.y}`
  }).join(' ')
  const shape = skills.map((item, index) => {
    const position = point(index, Math.max(.035, item.score))
    return `${position.x},${position.y}`
  }).join(' ')

  return <div className="skill-radar-wrap">
    <svg className="skill-radar" viewBox="0 0 360 310" role="img" aria-label={`Diagramme des compétences. ${skills.map((item) => `${item.skill}, niveau ${item.level}`).join('; ')}.`}>
      {[.25, .5, .75, 1].map((fraction) => <polygon key={fraction} points={polygon(fraction * scale)} className="radar-grid" />)}
      {skills.map((_, index) => { const end = point(index, 1); return <line key={index} x1={cx} y1={cy} x2={end.x} y2={end.y} className="radar-axis" /> })}
      <polygon points={shape} className="radar-value" />
      {skills.map((item, index) => {
        const position = point(index, scale, 29)
        const angle = (-90 + index * (360 / skills.length)) * Math.PI / 180
        const anchor = Math.cos(angle) > .25 ? 'start' : Math.cos(angle) < -.25 ? 'end' : 'middle'
        return <text key={item.activity} x={position.x} y={position.y} textAnchor={anchor} className="radar-label">{item.skill}</text>
      })}
    </svg>
    <div className="radar-scale">1 XP par minute validée · seuil +50 XP par niveau · sans plafond</div>
  </div>
}

function GearTier({ tier }: { tier: number }) {
  return <span className="gear-tier" aria-label={tier === 0 ? 'Matériel de départ' : `Palier ${tier}`}>
    {tier === 0 ? 'Départ' : <>{[1, 2, 3].map((dot) => <i className={dot <= tier ? 'active' : ''} key={dot} />)}<small>Palier {tier}</small></>}
  </span>
}

export function ProfileView({ data }: { data: SessionData }) {
  const [profile, setProfile] = useState<ProfileState>(loadProfile)
  const [category, setCategory] = useState('all')
  const [reaction, setReaction] = useState<TenzinReaction | null>(null)
  const skills = useMemo<RadarSkill[]>(() => activitySkills.map((item) => {
    const progress = getSkillProgress(item.activity, data.history)
    return { activity: item.activity, skill: item.skill, level: progress.level, score: progress.level + progress.xpIntoLevel / progress.xpForNextLevel, xp: progress.xpIntoLevel, next: progress.xpForNextLevel, percent: progress.percentToNextLevel }
  }), [data.history])
  const completedExpeditions = data.history.filter((item) => item.outcome === 'completed').length
  const coinsEarned = data.history.reduce((sum, item) => sum + getExpeditionPebbles(item), 0)
  const coins = Math.max(0, coinsEarned - profile.spent)
  const totalXp = getTotalSkillExperience(data.history)
  const fullKitCost = gear.reduce((sum, item) => sum + item.cost, 0)
  const kitProgress = Math.min(1, coinsEarned / Math.max(1, fullKitCost))
  const visibleGear = category === 'all' ? gear : gear.filter((item) => item.categoryId === category)
  const equippedBonuses = getEquippedBonuses(profile.equipped)

  const updateProfile = (next: ProfileState) => {
    setProfile(next)
    saveProfile(next)
  }
  const purchase = (item: GearItem) => {
    if (profile.owned.includes(item.id) || coins < item.cost) return
    updateProfile({ ...profile, owned: [...profile.owned, item.id], spent: profile.spent + item.cost })
    setReaction({ id: Date.now(), text: `${item.name} : bon choix ! Là-haut, tu me remercieras.` })
  }
  const equip = (item: GearItem) => {
    if (!profile.owned.includes(item.id)) return
    const isEquipped = profile.equipped.includes(item.id)
    const nextEquipped = isEquipped
      ? profile.equipped.filter((id) => id !== item.id)
      : [...profile.equipped.filter((id) => gear.find((entry) => entry.id === id)?.categoryId !== item.categoryId), item.id]
    updateProfile({ ...profile, equipped: nextEquipped })
  }

  return <div className="page-content profile-page">
    <div className="page-heading">
      <div><div className="eyebrow"><span className="eyebrow-line" />PROFIL</div><h1>Le village sherpa</h1></div>
      <div className="village-wallet"><span className="coin-mark" aria-hidden="true">◈</span><strong>{coins}</strong><span>galets</span></div>
    </div>

    <section className="village-banner village-banner-simple">
      <img className="village-art" src={asset('/illustrations/sherpa/village-pixel.jpg')} alt="Village de montagne face aux sommets de l’Himalaya" />
      <div className="village-shade" />
      <div className="village-caption"><span>KHUMJUNG · NÉPAL</span><strong>Le village sherpa</strong><p>{completedExpeditions} expéditions terminées · 1 galet toutes les 10 min de travail</p></div>
      <span className="village-sign">CAMP DE BASE</span>
    </section>

    <div className="profile-columns">
      <section className="profile-panel skills-panel">
        <div className="profile-panel-title"><div><span className="section-label">COMPÉTENCES PAR MATIÈRE</span><h2>Niveaux</h2></div><span className="profile-panel-note">{totalXp} XP cumulés</span></div>
        <SkillRadar skills={skills} />
        <div className="skill-detail-layout">
          <ul className="skill-level-list">{skills.map((item) => <li key={item.activity}>
            <div className="skill-level-heading"><span><strong>{item.skill}</strong><small>{item.activity}</small></span><b>Niv. {item.level}</b></div>
            <div className="skill-level-track"><i style={{ width: `${item.percent}%` }} /></div>
            <small className="skill-xp-label">{item.xp} / {item.next} XP vers le niveau {item.level + 1}</small>
          </li>)}</ul>
          <div className="profile-avatar-scene"><img className="profile-hero" src={CHARA_HERO} alt="Ton explorateur : bonnet orange, sac bleu, piolet et corde, sur un sentier de montagne" /></div>
        </div>
      </section>

      <section className="profile-panel outfit-panel">
        <div className="profile-panel-title"><div><span className="section-label">ÉQUIPEMENT PORTÉ</span><h2>Dans le sac</h2></div></div>
        <div className="gear-bonus-summary">
          <strong>Bonus pour la prochaine expédition</strong>
          <span>{equippedBonuses.ascentPercent}% d’ascension · {equippedBonuses.skillXpPercent}% d’XP compétence{equippedBonuses.bonusPebbles ? ` · +${equippedBonuses.bonusPebbles} galet` : ''}</span>
        </div>
        <ul className="equipped-gear-list">{profile.equipped.length === 0 ? <li className="empty-equipment">Tu pars léger pour le moment.</li> : profile.equipped.map((id) => {
          const item = gear.find((entry) => entry.id === id)
          if (!item) return null
          return <li key={id}><EquipmentSprite item={item} /><span className="equipped-gear-copy"><strong>{item.name}</strong><small>{item.effect}</small></span></li>
        })}</ul>
      </section>
    </div>

    <section className="profile-panel shop-panel">
      <TenzinScene coins={coins} reaction={reaction}>
        <div className="shop-scene-caption"><span>TENZIN · ÉQUIPEMENTIER</span><strong>Le comptoir des hautes routes</strong><small>Alpinisme · bivouac · orientation</small></div>
        <div className="shop-scene-wallet"><span>◈</span><strong>{coins}</strong><small>galets</small></div>
      </TenzinScene>

      <div className="shop-progress-block">
        <div><strong>Ton équipement de sommet</strong><span>{Math.min(coinsEarned, fullKitCost)} / {fullKitCost} galets gagnés · collection complète</span></div>
        <div className="shop-progress-track" role="progressbar" aria-label="Galets gagnés pour la collection complète" aria-valuenow={Math.min(coinsEarned, fullKitCost)} aria-valuemin={0} aria-valuemax={fullKitCost}><i style={{ width: `${kitProgress * 100}%` }} /></div>
      </div>

      <nav className="gear-categories" aria-label="Catégories de matériel">
        <button className={category === 'all' ? 'active' : ''} onClick={() => setCategory('all')} aria-pressed={category === 'all'}>Tout le matériel</button>
        {gearCategories.map((item) => <button key={item.id} className={category === item.id ? 'active' : ''} onClick={() => setCategory(item.id)} aria-pressed={category === item.id}>{item.label}</button>)}
      </nav>

      <div className="shop-grid">{visibleGear.map((item) => {
        const owned = profile.owned.includes(item.id)
        const equipped = profile.equipped.includes(item.id)
        return <article className={`shop-item ${equipped ? 'is-equipped' : ''}`} key={item.id}>
          <div className="shop-object"><EquipmentSprite item={item} /></div>
          <div className="shop-item-copy"><div className="shop-item-title"><strong>{item.name}</strong><GearTier tier={item.tier} /></div><small>{item.detail}</small><span className="gear-effect">{item.effect}</span><b className="gear-cost">◈ {item.cost} galets</b></div>
          {owned
            ? <button className={`gear-button ${equipped ? 'equipped' : ''}`} aria-pressed={equipped} onClick={() => equip(item)}>{equipped ? 'Équipé' : 'Équiper'}</button>
            : <button className="gear-button" disabled={coins < item.cost} onClick={() => purchase(item)}>{coins < item.cost ? 'Plus tard' : 'Acheter'}</button>}
        </article>
      })}</div>
    </section>
    <p className="profile-footnote">Boutique virtuelle · 1 galet pour 10 min de travail validé · aucun achat réel</p>
  </div>
}
