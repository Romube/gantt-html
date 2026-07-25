# GanttPro HTML

> Application web autonome de planification de projet avec diagramme de Gantt interactif.

[![Version](https://img.shields.io/badge/version-3.0-blue)](https://github.com/Romube/gantt-html)
![Licence](https://img.shields.io/badge/licence-MIT-green)
[![HTML](https://img.shields.io/badge/HTML-autonome-orange)](ganttPro.html)

---

## Présentation

**GanttPro** est une application de gestion de projet entièrement contenue dans un seul fichier HTML. Elle ne nécessite ni serveur, ni installation, ni connexion internet après le premier chargement. Ouvrez `ganttPro.html` dans votre navigateur et commencez immédiatement.

---

## Fonctionnalités

### Gestion des tâches
- **Trois types de tâches** : tâche standard, jalon (◆), tâche récapitulative (📁)
- **Hiérarchie multi-niveaux** : sous-tâches imbriquées à l'infini
- **Création** via la barre d'outils ou les boutons contextuels
- **Modification** via double-clic ou bouton d'édition
- **Saisie directe des dates** en cliquant sur les colonnes Début/Fin du tableau
- **Réordonnancement** par glisser-déposer (poignée à 6 points)
- **Nesting** : transformer une tâche existante en sous-tâche via drag-and-drop (zone centrale) ou bouton « Nester dans… »

### Diagramme de Gantt
- **4 niveaux de zoom** : Jours / Semaines / Mois / Années (avec trimestres T1–T4)
- **Navigation** : défilement synchronisé liste ↔ Gantt, bouton « Aujourd'hui », bouton « Ajuster »
- **Barres interactives** : déplacement et redimensionnement par glisser-déposer
- **Jalons** : représentés par un losange, positionnés sur la date exacte
- **Tâches récapitulatives** : dates calculées automatiquement, repliables/dépliables
- **Marqueur** de la date du jour (ligne rouge pointillée)

### Interface
- **Thème clair / sombre** : bascule en un clic, persisté pendant la session
- **Séparateur ajustable** entre la liste des tâches et le Gantt
- **Persistance automatique** des données dans le localStorage du navigateur

### Exports
| Format | Bouton | Contenu |
|--------|--------|---------|
| **CSV** | `CSV` | Tableau complet avec hiérarchie (UTF-8 BOM, séparateur `;`) |
| **SVG** | `SVG` | Diagramme vectoriel fidèle au zoom actif et au thème — prêt pour LibreOffice Impress |
| **Markdown** | `MD` | Tableau du planning + diagramme Mermaid Gantt (GitHub, GitLab, Notion, Obsidian) |
| **JSON** | `Sauvegarder` | Sauvegarde complète du projet (rechargeable) |

---

## Utilisation

### Démarrage rapide
1. Téléchargez `ganttPro.html`
2. Ouvrez-le dans Chrome, Firefox, Edge ou Safari (version récente)
3. Les données de démonstration se chargent automatiquement
4. Commencez à modifier, vos données sont sauvegardées automatiquement

### Raccourcis clavier
| Raccourci | Action |
|-----------|--------|
| `N` | Nouvelle tâche |
| `Ctrl+S` | Sauvegarder en JSON |
| `Entrée` (dans formulaire) | Valider |
| `Échap` | Fermer / annuler |

### Insérer le SVG dans LibreOffice Impress
1. Exportez le diagramme via le bouton `SVG`
2. Dans Impress : **Insertion → Image** → sélectionnez le fichier `.svg`
3. Redimensionnez sans perte de qualité

### Afficher le Mermaid dans GitHub
Committez le fichier `.md` exporté dans votre dépôt — GitHub rend automatiquement le bloc `mermaid` en diagramme visuel.

---

## Compatibilité

| Navigateur | Version minimale |
|------------|-----------------|
| Google Chrome | 110+ |
| Mozilla Firefox | 110+ |
| Microsoft Edge | 110+ |
| Safari | 16+ |

---

## Historique des versions

### v3.0 (Juillet 2026)
- **Nesting** : glisser-déposer avec 3 zones (avant / **dans** / après) et bouton « Nester dans… »
- **Export Markdown** : tableau du planning + diagramme Mermaid Gantt
- Correction : validation de la saisie inline des dates (change + blur différé)
- Correction : erreur de syntaxe JS dans l'export Markdown

### v2.0 (Mars 2026)
- Vue **Années** avec trimestres T1–T4
- **Thème clair / sombre** (appliqué à l'écran et à l'export SVG)
- **Saisie directe** des dates dans les colonnes du tableau
- **Réordonnancement** des lignes par glisser-déposer
- Export SVG fidèle au zoom actif
- Correction du décalage de dates (timezone UTC/heure locale)

### v1.0 (Janvier 2026)
- Version initiale : Gantt interactif, 3 types de tâches, hiérarchie, zoom Jours/Semaines/Mois, export CSV et SVG

---

## Structure du projet

Le livrable reste **un fichier HTML unique et autonome** (`ganttPro.html`), mais il est désormais *généré* à partir de sources séparées pour faciliter le développement.

```
gantt-html/
├── ganttPro.html                        # Application complète (GÉNÉRÉE — ne pas éditer)
├── src/
│   ├── index.html                       # Gabarit : markup + marqueurs
│   ├── style.css                        # Feuille de styles
│   └── app.js                           # Logique applicative (JS vanilla)
├── scripts/
│   └── build.mjs                        # Régénère ganttPro.html depuis src/
├── package.json                         # Outillage dev (check / lint / build)
├── README.md                            # Ce fichier
└── spec_fonctionnelle_ganttPro_v3.docx  # Spécification fonctionnelle détaillée
```

### Développement

```bash
npm install        # une fois : installe l'outillage (ESLint)
# éditer src/app.js, src/style.css ou src/index.html
npm run verify     # check syntaxe + lint + build ganttPro.html
```

Ouvrir ensuite `ganttPro.html` dans le navigateur. **On n'édite jamais `ganttPro.html` directement** : il est reconstruit par `npm run build`.

Un hook git *pre-commit* (activé automatiquement au `npm install`) régénère `ganttPro.html` et refuse le commit s'il est périmé — impossible d'oublier le build.

---

## Licence

MIT — libre d'utilisation, modification et distribution.

---

*Développé avec l'assistance de Claude (Anthropic) — [claude.ai](https://claude.ai)*
