# Ascension

Application personnelle d’organisation et de progression en montagne, pensée pour l’iPhone. L’interface reste en français, avec une typographie système simple, des thèmes clair et sombre et une palette bleu glacier.

## Lancer le projet

Prérequis : Node.js 20.19+ ou 22.12+.

```sh
npm install
npm run dev
```

Contrôler la version compilée :

```sh
npm test
npm run build
npm run preview
```

## Fonctionnalités

- **Camp de base** : la montagne de l’expédition en cours en pixel art, avec son itinéraire fixe, le camp de départ, le drapeau du sommet et ton explorateur placé à l’endroit réellement atteint. Les montagnes suivent l’ordre du catalogue : on passe à la suivante quand le sommet est atteint.
- **Catalogue** : les 100 entrées du cahier des charges sont conservées dans leur ordre, avec les voies séparées des montagnes. La fiche signale les pays, altitudes, camps et itinéraires qui restent à confirmer.
- **Agenda** : vues jour et semaine, création, édition, déplacement par pas de 15 minutes, répétitions, modèles et copie de blocs.
- **Tâches** : liste indépendante de l’agenda avec ajout, édition, suppression et filtres.
- **Sessions** : activités associées à une compétence fixe, durée réglable, minuteur à rebours (25 min par défaut) cohérent après verrouillage de l’écran, **Pause / Reprendre / Quitter** (avec un message d’avertissement : la progression du sommet est perdue) et **Valider le sommet** une fois en haut, sur une scène d’ascension animée en plein écran : l’explorateur marche, grimpe près du sommet, s’assoit pendant une pause et fête le sommet. Seule l’animation boucle ; sa position sur l’itinéraire vient du temps réellement travaillé : 1 mètre gagné toutes les 5 secondes (720 m par heure de travail).
- **Progression** : temps réel conservé au carnet, altitude virtuelle, retour au camp initial en cas d’abandon et historique des sessions interrompues.
- **Profil** : radar de compétences, niveaux sans plafond, XP par matière, équipement et boutique virtuelle. Les galets gagnés n’ont aucune valeur monétaire.
- **iPhone / hors ligne** : manifeste, icône Apple, zones sûres de l’écran et service worker qui met en cache l’application après son premier chargement.

## Personnage

Le personnage vient de la planche de chara design. Ses images sont découpées telles quelles dans `public/sprites/chara/` (aucun pixel redessiné ni recoloré) :

- `chara-atlas.png` : 8 poses alignées dans des cases identiques (repos, marche, course, grimpe, saut, célébration, fatigué, interaction). `src/features/chara/Chara.tsx` et `src/expedition.css` les animent en alternant les poses d’origine et en décalant de quelques pixels.
- `chara-hero.png` : l’illustration principale (page Profil). `chara-portrait.png` : le portrait (menu).

La pose « grimpe » a été détourée de son rocher d’origine ; les autres poses ne sont détourées que de leur fond clair.

## Données et limites actuelles

Les entrées de montagnes viennent du cahier des charges; leurs noms et leur ordre sont conservés. Les emplacements, altitudes, pays, camps et itinéraires doivent encore être vérifiés individuellement. Le Kosciuszko est le seul itinéraire documenté dans l’interface et renvoie vers le parc national de Nouvelle-Galles du Sud. Les scènes sont des illustrations et la météo est simulée; elles ne remplacent pas une carte topographique ni une prévision en temps réel.

L’activité détermine la compétence affichée : mathématiques → concentration, physique → rigueur, informatique → logique, anglais → communication, sport → endurance. Chaque minute complète d’une session menée à terme donne 1 XP à sa compétence. Le niveau 1 demande 50 XP, puis le seuil augmente de 50 XP par niveau (100, 150, 200…). Abandonner une session remet l’altitude au camp initial et retire jusqu’au nombre de minutes effectuées en XP, sans faire descendre la compétence sous zéro. Le carnet conserve toujours le temps réellement travaillé. Les galets sont gagnés à raison d’un par tranche de 10 minutes de chaque session terminée (plus ceux du matériel équipé, comme le thé au beurre de yak ou le GPS).

Pour installer l’app sur iPhone : servir le build en HTTPS, ouvrir le site dans Safari, puis utiliser **Partager → Sur l’écran d’accueil**. Le service worker a besoin du premier chargement connecté pour enregistrer ses ressources.

## Structure

- `src/App.tsx` : navigation, thèmes et intégration du camp et des sessions.
- `src/data/mountain-source.ts` : les 100 intitulés dans l’ordre d’origine.
- `src/data/mountain.ts` : types, métadonnées, ambiance, météo et montagne sélectionnée.
- `src/features/camp/ExpeditionScene.tsx` et `route.ts` : scène pixel art, itinéraire fixe par montagne et position de l’explorateur.
- `src/features/chara/` : composant du personnage animé.
- `src/features/agenda/` et `src/features/tasks/` : agenda et listes.
- `src/features/sessions/` : chronomètre, stockage, synthèse, scènes d’ascension et calcul de progression.
- `src/features/profile/` : radar de compétences, niveaux, équipement et boutique locale.
- `src/styles.css` et `src/polish.css` : identité visuelle, thèmes, interactions et adaptations iPhone.
- `public/sw.js` et `manifest.webmanifest` : cache applicatif et métadonnées PWA.

## Publier l’app sur GitHub Pages et l’installer sur iPhone

1. Sur github.com : **New repository**, nom `ascension`, **Public**, sans README. **Create repository**.
2. Dézippe le projet sur ton Mac. Dans le Finder, appuie sur **Cmd + Maj + .** pour afficher les fichiers cachés (le dossier `.github` doit être visible).
3. Sur la page du repository, clique **uploading an existing file**, puis glisse **le contenu** du dossier `ascension` (pas le dossier lui-même, et surtout avec `.github`). Clique **Commit changes**.
4. **Settings → Pages → Source : GitHub Actions**.
5. Onglet **Actions** : attends la coche verte (2 à 3 minutes). Si le premier essai est rouge parce que Pages n’était pas encore activé, clique **Re-run all jobs**.
6. L’app est à l’adresse `https://TON-PSEUDO.github.io/ascension/`.
7. Sur iPhone, ouvre cette adresse dans **Safari** → bouton **Partager** → **Sur l’écran d’accueil**.

Les données (séances, galets, agenda) restent enregistrées sur l’appareil, dans le navigateur.
