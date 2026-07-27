# Spécification fonctionnelle — GanttPro HTML

**Application de gestion de projet avec diagramme de Gantt**

| | |
|---|---|
| **Nom du projet** | GanttPro HTML |
| **Version** | 3.2 |
| **Date** | Juillet 2026 |
| **Versions précédentes** | v1.0 (janvier 2026), v2.0 (mars 2026), v3.0 (juillet 2026), v3.1 (juillet 2026) |
| **Dépôt GitHub** | [github.com/Romube/gantt-html](https://github.com/Romube/gantt-html) |
| **Statut** | Approuvé — intégrant toutes les évolutions |

> **Ce fichier Markdown est la source de vérité de la spécification.** Il est versionné avec le code : toute évolution du comportement et la règle qui la décrit changent dans le même commit. Le `.docx` diffusable est un **artefact généré** (`npm run spec:docx`) — ne jamais l'éditer à la main. `spec_fonctionnelle_ganttPro_v3.docx`, à la racine, est l'archive de la v3.1, conservée telle quelle.

---

## Sommaire

- [Historique des révisions](#historique-des-révisions)
- [1. Contexte et objectifs](#1-contexte-et-objectifs)
- [2. Périmètre de l'application](#2-périmètre-de-lapplication)
- [3. Architecture générale de l'interface](#3-architecture-générale-de-linterface)
- [4. Gestion des tâches](#4-gestion-des-tâches)
- [5. Diagramme de Gantt](#5-diagramme-de-gantt)
- [6. Fonctionnalités d'export, de sauvegarde et de chargement](#6-fonctionnalités-dexport-de-sauvegarde-et-de-chargement)
- [7. Thème clair / sombre](#7-thème-clair--sombre)
- [8. Règles de gestion](#8-règles-de-gestion)
- [9. Interfaces utilisateur détaillées](#9-interfaces-utilisateur-détaillées)
- [10. Exigences non fonctionnelles](#10-exigences-non-fonctionnelles)
- [11. Glossaire](#11-glossaire)

---

## Historique des révisions

| Version | Date | Auteur | Modifications |
|---|---|---|---|
| 1.0 | Jan. 2026 | Équipe projet | Version initiale : Gantt interactif, 3 types de tâches, hiérarchie, zoom Jours/Semaines/Mois, exports CSV et SVG |
| 2.0 | Mar. 2026 | Équipe projet | Vue Années, thème clair/sombre, saisie inline des dates, réordonnancement DnD, export SVG fidèle au zoom, correction timezone |
| 3.0 | Juil. 2026 | Équipe projet | Nesting des tâches (DnD 3 zones + modal), export Markdown + Mermaid Gantt, corrections de la validation inline, README GitHub |
| 3.1 | Juil. 2026 | Équipe projet | Reclassement manuel du type d'une tâche (récapitulative ↔ standard/jalon) via le formulaire de modification ; une tâche récapitulative sans sous-tâche n'est plus jamais rétrogradée automatiquement (RG-20, RG-21) |
| 3.2 | Juil. 2026 | Équipe projet | Formalisation de la recherche (§4.9) et des raccourcis clavier (§9.4), jusque-là non spécifiés ; chargement de projet tolérant aux fichiers abîmés (§6.4) ; exigences de sécurité d'affichage et de robustesse (RG-22 à RG-26) ; passage de la spécification en Markdown versionné |

> **Marqueurs de nouveauté** : les éléments ajoutés depuis la v2.0 portent `[NOUVEAU]`, ceux de la v3.1 `[NOUVEAU v3.1]`, ceux de la v3.2 `[NOUVEAU v3.2]`.

---

## 1. Contexte et objectifs

Cette spécification décrit les fonctionnalités d'une application web autonome, développée en HTML/CSS/JavaScript, permettant la planification et le suivi visuel d'un projet informatique sous la forme d'un diagramme de Gantt interactif.

Besoins couverts :

- Saisie et organisation intuitive des tâches d'un projet.
- Représentation graphique sous forme de diagramme de Gantt interactif.
- `[NOUVEAU]` Structuration hiérarchique (tâches récapitulatives, sous-tâches, jalons) avec nesting libre.
- `[NOUVEAU]` Exports multiples : CSV, SVG (LibreOffice Impress), Markdown + Mermaid Gantt.
- Thème clair ou sombre adapté au contexte de présentation.

L'application fonctionne entièrement dans un navigateur, sans serveur. Code source hébergé sur [github.com/Romube/gantt-html](https://github.com/Romube/gantt-html).

## 2. Périmètre de l'application

### 2.1 Fonctionnalités incluses

- CRUD complet des tâches.
- Trois types : standard, jalon, récapitulative.
- `[NOUVEAU]` Hiérarchie multi-niveaux illimitée avec nesting libre (DnD ou modal).
- Gantt interactif avec 4 niveaux de zoom : Jours, Semaines, Mois, Années.
- Saisie directe des dates dans les colonnes du tableau.
- Réordonnancement des lignes par glisser-déposer.
- `[NOUVEAU v3.2]` Recherche de tâches par nom, avec surlignage et compteur de résultats.
- Thème clair/sombre, appliqué à l'écran et aux exports SVG.
- `[NOUVEAU]` Exports : CSV, SVG, Markdown + Mermaid Gantt, JSON.
- Sauvegarde automatique dans le localStorage et sauvegarde/chargement JSON.

### 2.2 Fonctionnalités hors périmètre

- Gestion multi-utilisateurs ou collaborative.
- Synchronisation avec des outils externes (Jira, GitLab, MS Project).
- Chemin critique (CPM/PERT), ressources, coûts.
- Export PDF ou Microsoft Project.
- Dépendances entre tâches (liens de précédence).

## 3. Architecture générale de l'interface

| Zone | Description |
|---|---|
| **Barre d'outils** | Boutons : Nouveau projet, Ajouter tâche/jalon/récapitulative, Sauvegarder, Charger, CSV, MD `[NOUVEAU]`, SVG. Sélecteur Jours/Semaines/Mois/Années. Champ de recherche `[NOUVEAU v3.2]`. Bouton thème clair/sombre. Navigation Aujourd'hui / Ajuster. |
| **Panneau gauche — Liste** | Tableau avec indentation hiérarchique. Colonnes : Nom (avec poignée drag-and-drop), Début, Fin (éditables en un clic), Actions (Modifier, Ajouter sous-tâche, Nester dans… `[NOUVEAU]`, Supprimer). Largeur ajustable via splitter. |
| **Panneau droit — Gantt** | Diagramme interactif. En-tête temporelle à 2 lignes adaptée au zoom. Barres, jalons, récapitulatives. Scroll horizontal, synchronisé verticalement avec le panneau liste. |
| **Barre de statut** | Nombre de tâches, jalons, durée projet, indicateur de sauvegarde. |

## 4. Gestion des tâches

### 4.1 Attributs d'une tâche

| Attribut | Type | Description | Obligatoire |
|---|---|---|---|
| Identifiant (ID) | Entier auto-incrémenté | Clé primaire unique. Présent dans l'export CSV. | Oui |
| Nom de la tâche | Texte (255 car.) | Libellé affiché dans le panneau liste et dans le Gantt. | Oui |
| Description | Texte libre | Texte détaillé visible dans la fenêtre modale et dans l'infobulle. | Non |
| Date de début | Date (AAAA-MM-JJ) | Saisie via le formulaire modal ou directement dans la colonne Début. Calculée en heure locale. | Oui |
| Date de fin | Date (AAAA-MM-JJ) | Saisie via le formulaire modal ou directement dans la colonne Fin. Si égale à la date de début, la tâche devient un jalon. | Oui |
| Type | Énumération | STANDARD, JALON ou RÉCAPITULATIVE. | Oui |
| Tâche parente (ID) | Entier (FK) | Référence vers la tâche parente. `null` si niveau racine. Modifiable via DnD ou le bouton Nester. | Non |
| Ordre d'affichage | Entier | Position dans la liste. Modifiable par glisser-déposer. | Oui |

### 4.2 Types de tâches

#### 4.2.1 Tâche standard

Travail discret avec une durée > 0 jour. Barre bleue dans le Gantt.

#### 4.2.2 Jalon

Événement ponctuel sans durée (début = fin). Losange orange dans le Gantt. Colonne Fin non cliquable en mode inline.

#### 4.2.3 Tâche récapitulative

Regroupement de sous-tâches. Dates calculées automatiquement. Barre violette avec triangles aux extrémités. Repliable/dépliable. Une tâche standard devient automatiquement récapitulative lorsqu'une sous-tâche lui est nestée. `[NOUVEAU v3.1]` Le type peut aussi être reclassé manuellement via le formulaire de modification, indépendamment de tout nesting (voir §4.8).

### 4.3 Hiérarchie et sous-tâches

- Hiérarchie multi-niveaux illimitée.
- Indentation visuelle de 20 px par niveau.
- Repli/dépli via le bouton flèche sur les tâches récapitulatives.
- Suppression d'une tâche récapitulative : choix entre tout supprimer ou remonter les sous-tâches.

### 4.4 Création, modification et suppression

Création et modification via formulaire modal (nom, description, dates — toujours éditables). Suppression avec confirmation. Les dates sont toujours éditables, y compris pour les tâches récapitulatives.

### 4.5 Saisie directe des dates dans le tableau

Les colonnes Début et Fin sont cliquables directement dans le panneau liste.

- Un clic active un champ de date natif dans la cellule.
- La validation intervient uniquement à la sortie du champ (change + blur avec debounce 200 ms) ou à l'appui sur Entrée.
- Échap annule sans modification.
- Si début > fin existante, la fin est décalée pour préserver la durée.
- Si fin < début, la saisie est rejetée avec indicateur rouge temporaire.

### 4.6 Réordonnancement des lignes par glisser-déposer

Chaque ligne dispose d'une poignée à 6 points visible au survol. Le glissement repositionne la tâche avant ou après la cible.

### 4.7 Nesting d'une tâche existante

`[NOUVEAU]` Il est possible de transformer une tâche existante en sous-tâche d'une autre tâche, par deux méthodes complémentaires.

#### 4.7.1 Glisser-déposer avec 3 zones

Lors du glissement d'une ligne, la zone de dépôt est divisée en 3 parties :

- **Zone haute (25 %)** : insertion AVANT la tâche cible (ligne bleue en haut).
- **Zone centrale (50 %)** : insertion DANS la tâche cible (contour bleu + label « Nester ici »). La tâche cible devient récapitulative si elle ne l'est pas encore.
- **Zone basse (25 %)** : insertion APRÈS la tâche cible (ligne bleue en bas).

#### 4.7.2 Bouton « Nester dans… »

Un bouton contextuel (visible au survol) ouvre un modal listant toutes les tâches disponibles comme parent, avec une option « Niveau racine » pour retirer une sous-tâche de son parent. La tâche elle-même et ses descendants sont exclus de la liste. La cible devient automatiquement récapitulative.

### 4.8 Reclassement manuel du type d'une tâche `[NOUVEAU v3.1]`

Indépendamment du nesting, le formulaire de modification propose un reclassement manuel du type d'une tâche, sans manipulation de hiérarchie :

- **Reclasser en tâche standard** : case à cocher disponible pour une tâche récapitulative qui n'a plus aucune sous-tâche. Elle repasse son type en standard (ou jalon selon les dates).
- **Convertir en tâche récapitulative** : case à cocher disponible pour toute tâche standard ou jalon. Elle devient une tâche récapitulative vide, prête à recevoir des sous-tâches ultérieurement (cf. RG-06).

### 4.9 Recherche de tâches `[NOUVEAU v3.2]`

Un champ de recherche filtre la liste et le Gantt sur le nom des tâches, sans distinction de casse.

- La saisie filtre à la frappe ; une croix vide le champ et rétablit l'affichage complet.
- Sont affichés : les tâches dont le nom contient le texte cherché, **et leurs ancêtres**, afin de conserver le contexte hiérarchique du résultat.
- La portion de nom correspondante est surlignée dans le panneau liste.
- Un compteur indique le nombre de tâches correspondantes.
- **Le repli est ignoré pendant une recherche** : un résultat situé sous une tâche récapitulative repliée reste visible, et le chevron reflète l'affichage réel (cf. RG-25). L'état de repli est intégralement rétabli dès que la recherche est vidée.

## 5. Diagramme de Gantt

### 5.1 Grille temporelle — 4 niveaux de zoom

| Zoom | Ligne supérieure | Ligne inférieure |
|---|---|---|
| Jours | Mois + année | Numéros de jours |
| Semaines | Mois + année | Numéros de semaines ISO (S1, S2…) |
| Mois | Année | Mois abrégés (Jan, Fév, Mar…) |
| Années | Année (ex. 2026) | Trimestres T1/T2/T3/T4 (en bleu accent) |

La grille s'étend avec une marge de 10 % de chaque côté. Une ligne rouge pointillée matérialise la date du jour. La fonction « Ajuster » choisit automatiquement le zoom le plus adapté, y compris la vue Années pour les projets pluriannuels.

### 5.2 Représentations

- **Tâche standard** : barre bleue, hauteur 22 px, coins arrondis. Nom à l'intérieur ou à droite.
- **Jalon** : losange orange centré sur la date. Label à droite.
- **Tâche récapitulative** : barre violette, triangles aux extrémités, hauteur 18 px. Repliable.
- **Barres interactives** : déplacement horizontal (DnD) et redimensionnement par les bords.
- `[NOUVEAU v3.2]` **Tâche récapitulative sans sous-tâche** : ses dates n'étant calculées par personne (RG-20), sa barre est déplaçable et redimensionnable comme celle d'une tâche standard. Elle se distingue par une bordure en pointillés.

### 5.3 Navigation

- Scroll horizontal via barre de défilement ou molette.
- Synchronisation verticale garantie entre panneau liste et Gantt.
- Bouton « Aujourd'hui » : recentre la vue sur la date courante.
- Bouton « Ajuster » : sélectionne le zoom optimal.

## 6. Fonctionnalités d'export, de sauvegarde et de chargement

### 6.1 Export CSV

Encodage UTF-8 avec BOM, séparateur point-virgule, dates AAAA-MM-JJ. Colonnes : ID, NOM, TYPE, NIVEAU, ID_PARENT, DATE_DEBUT, DATE_FIN, DUREE_JOURS, DESCRIPTION. Nom du fichier : `[projet]_gantt_[date].csv`.

### 6.2 Export SVG

Format vectoriel nativement supporté par LibreOffice Impress (Insertion > Image). Reproduit fidèlement le diagramme tel qu'affiché : zoom actif, thème (clair ou sombre), période choisie.

| Zoom actif | Ligne supérieure SVG | Ligne inférieure SVG |
|---|---|---|
| Jours | Mois + année | Numéros de jours |
| Semaines | Mois + année | S1, S2… (numéros ISO) |
| Mois | Année | Jan, Fév, Mar… (mois abrégés) |
| Années | Année (ex. 2026) | T1/T2/T3/T4 (trimestres en bleu) |

Paramètres : hauteur de ligne (Compact/Standard/Confortable), période (Tout le projet / Période visible). Légende en bas (barre, jalon, récapitulative, marqueur Aujourd'hui).

### 6.3 Export Markdown

`[NOUVEAU]` L'export Markdown produit un fichier `.md` contenant les sections suivantes, téléchargé sous le nom `[projet]_gantt_[date].md`.

| Section | Contenu |
|---|---|
| En-tête | Titre du projet (`#` H1) et date d'export. |
| Tableau du planning | Tableau Markdown avec colonnes N, Tâche (emojis + indentation), Type, Début, Fin, Durée. Les tâches récapitulatives sont en gras. |
| Diagramme Mermaid | Bloc ` ```mermaid ` contenant un `gantt` Mermaid avec sections (depuis les tâches récapitulatives de niveau 0), tâches standards et jalons. Rendu automatiquement sur GitHub, GitLab, Notion, Obsidian. |
| Tableau des jalons | Tableau distinct listant uniquement les jalons avec leur date, si le projet en contient. |

Les caractères qui casseraient la syntaxe (`|`, `*`, `_` pour les tableaux ; `:`, `,`, `#`, `"` pour Mermaid) sont échappés ou neutralisés.

### 6.4 Sauvegarde et chargement JSON `[NOUVEAU v3.2 — réparation]`

- **Sauvegarder** télécharge l'intégralité du projet (nom, tâches, compteur d'identifiants) au format JSON, rechargeable ultérieurement.
- **Charger** lit un fichier JSON et remplace le projet courant.

Un fichier peut avoir été produit par une version antérieure, édité à la main ou corrompu. Le chargement **répare plutôt qu'il ne rejette** (RG-23) : le seul cas de refus est l'absence de liste de tâches exploitable. Les corrections appliquées sont les suivantes, et leur liste est présentée à l'utilisateur après chargement.

| Anomalie | Traitement |
|---|---|
| Entrée qui n'est pas une tâche, identifiant absent ou non entier, identifiant en double | L'entrée est écartée |
| Nom absent ou vide | Remplacé par « Sans nom » |
| Date absente, mal formée ou inexistante (ex. 31 février) | Alignée sur l'autre date de la tâche, ou à défaut sur la date du jour |
| Date de fin antérieure au début | Fin recalée sur le début |
| Type inconnu | Ramené à « standard » |
| Ordre ou repli de type inattendu | Valeurs par défaut (position dans la liste, non replié) |
| Tâche parente inexistante, ou tâche se référençant elle-même | La tâche est replacée à la racine |
| Hiérarchie circulaire | Le lien qui referme la boucle est coupé, la tâche concernée repasse à la racine |
| Compteur d'identifiants absent ou inférieur au plus grand identifiant présent | Recalculé |

La même validation s'applique à la restauration automatique depuis le localStorage au démarrage, silencieusement.

## 7. Thème clair / sombre

Deux thèmes basculables en un clic depuis la barre d'outils. Le thème actif est appliqué à l'affichage à l'écran et au fichier SVG exporté.

| Élément | Thème sombre (défaut) | Thème clair |
|---|---|---|
| Fond principal | `#0D1117` (noir) | `#FFFFFF` (blanc) |
| Surfaces | `#161B22` / `#1C2128` | `#F6F8FA` / `#EAEEF2` |
| Texte | `#E6EDF3` (blanc cassé) | `#1F2328` (quasi-noir) |
| Bordures | `#30363D` (gris sombre) | `#D0D7DE` (gris clair) |
| Accent | `#58A6FF` (bleu clair) | `#0969DA` (bleu GitHub) |
| Jalon | `#F0A500` (orange vif) | `#BF8700` (orange foncé) |
| Récapitulative | `#BC8CFF` (violet clair) | `#8250DF` (violet GitHub) |
| Aujourd'hui | `#FF6B6B` (rouge clair) | `#CF222E` (rouge foncé) |
| Export SVG | Fond sombre, textes clairs | Fond blanc, textes sombres |

## 8. Règles de gestion

| Réf. | Règle de gestion | Priorité |
|---|---|---|
| RG-01 | Si date_début = date_fin, la tâche est automatiquement traitée comme un jalon. | OBLIGATOIRE |
| RG-02 | La date de fin ne peut pas être antérieure à la date de début (validation dans le modal et inline). | OBLIGATOIRE |
| RG-03 | Le nom d'une tâche ne peut pas être vide. | OBLIGATOIRE |
| RG-04 | Les dates d'une tâche récapitulative sont calculées : début = min(débuts sous-tâches), fin = max(fins sous-tâches). | OBLIGATOIRE |
| RG-05 | Toute modification de dates d'une sous-tâche entraîne le recalcul de toutes ses tâches récapitulatives ancêtres. | OBLIGATOIRE |
| RG-06 | Une tâche récapitulative sans sous-tâche a des dates éditables manuellement. | IMPORTANT |
| RG-07 | L'identifiant d'une tâche est unique et jamais réutilisé. | OBLIGATOIRE |
| RG-08 | La suppression d'une tâche récapitulative propose : (a) tout supprimer, (b) remonter les sous-tâches. | IMPORTANT |
| RG-09 | Les données sont sauvegardées automatiquement dans le localStorage à chaque modification validée (cf. RG-26 pour les gestes continus). | IMPORTANT |
| RG-10 | L'export CSV respecte l'ordre d'affichage avec le niveau hiérarchique. | OBLIGATOIRE |
| RG-11 | L'export SVG reproduit fidèlement le diagramme (zoom, thème, période) tel qu'affiché à l'écran. | OBLIGATOIRE |
| RG-12 | Le DnD de réordonnancement ne peut pas créer de boucle hiérarchique. | OBLIGATOIRE |
| RG-13 | Lors de la saisie inline de la date de début, si la nouvelle valeur est postérieure à la fin, la fin est décalée pour préserver la durée. | IMPORTANT |
| RG-14 | La saisie inline ne valide qu'à la sortie du champ (change ou blur différé 200 ms), jamais pendant la frappe. | OBLIGATOIRE |
| RG-15 | Toutes les dates sont calculées en heure locale (pas de décalage UTC/timezone). | OBLIGATOIRE |
| RG-16 | La largeur minimale d'une barre de tâche dans le Gantt est de 4 px. | IMPORTANT |
| RG-17 | Lors d'un nesting par DnD (zone centrale), la tâche cible devient automatiquement récapitulative si elle ne l'est pas encore, et ses dates sont recalculées immédiatement. | OBLIGATOIRE |
| RG-18 | Il est impossible de nester une tâche dans l'un de ses propres descendants (protection anti-boucle). | OBLIGATOIRE |
| RG-19 | L'export Markdown génère un diagramme Mermaid valide, rendable par GitHub, GitLab, Notion et Obsidian. | IMPORTANT |
| RG-20 | Une tâche récapitulative sans sous-tâche n'est jamais rétrogradée automatiquement (glisser-déposer, suppression, nesting) : elle conserve son type et ses dates restent éditables manuellement (cf. RG-06). | IMPORTANT |
| RG-21 | Le formulaire de modification permet un reclassement manuel du type : une tâche récapitulative sans sous-tâche peut redevenir standard/jalon, et une tâche standard ou jalon peut devenir récapitulative (sans sous-tâche). | IMPORTANT |
| RG-22 | `[NOUVEAU v3.2]` Tout texte saisi par l'utilisateur (nom, description) est affiché **comme du texte** : il n'est jamais interprété comme du balisage, où qu'il apparaisse (liste, barre du Gantt, infobulle, modals, exports). | OBLIGATOIRE |
| RG-23 | `[NOUVEAU v3.2]` Un projet chargé — fichier JSON ou localStorage — est systématiquement validé et réparé avant affichage (cf. §6.4). Le seul motif de refus est l'absence de liste de tâches exploitable ; les corrections appliquées sont signalées à l'utilisateur lors d'un chargement de fichier. | OBLIGATOIRE |
| RG-24 | `[NOUVEAU v3.2]` Aucun parcours de la hiérarchie (descendants, ancêtres) ne peut boucler indéfiniment, quelles que soient les données en mémoire. | OBLIGATOIRE |
| RG-25 | `[NOUVEAU v3.2]` Une recherche affiche toutes les tâches correspondantes, y compris celles situées sous une tâche récapitulative repliée, ainsi que leurs ancêtres. Le nombre de tâches affichées est cohérent avec le compteur de résultats. L'état de repli est rétabli dès que la recherche est vidée. | IMPORTANT |
| RG-26 | `[NOUVEAU v3.2]` Pendant un geste continu (déplacement ou redimensionnement d'une barre), l'affichage est rafraîchi au plus une fois par image ; la sauvegarde dans le localStorage n'a lieu qu'au relâchement. | IMPORTANT |

## 9. Interfaces utilisateur détaillées

### 9.1 Barre d'outils

| Bouton / Contrôle | Action |
|---|---|
| Nouveau projet | Réinitialise le projet après confirmation. |
| Ajouter une tâche | Ouvre le formulaire de création d'une tâche standard. |
| Ajouter un jalon | Ouvre le formulaire avec les deux dates à aujourd'hui. |
| Ajouter tâche récapitulative | Ouvre le formulaire de création d'une tâche récapitulative. |
| Recherche `[NOUVEAU v3.2]` | Filtre la liste et le Gantt sur le nom des tâches (cf. §4.9). |
| Jours / Semaines / Mois / Années | Sélecteur de granularité. Modifie l'échelle du Gantt et l'en-tête exporté en SVG. |
| Thème Clair / Sombre | Bascule le thème. L'icône et le libellé indiquent le thème cible. |
| Aujourd'hui | Recentre la vue Gantt sur la date courante. |
| Ajuster | Sélectionne le zoom optimal pour afficher tout le projet. |
| Sauvegarder | Télécharge le projet au format JSON. |
| Charger | Charge un projet depuis un fichier JSON (avec réparation, cf. §6.4). |
| CSV | Génère et télécharge le fichier CSV. |
| MD `[NOUVEAU]` | Génère et télécharge le fichier Markdown avec tableau + diagramme Mermaid Gantt. |
| SVG | Ouvre la boîte de dialogue d'export SVG. |

### 9.2 Panneau liste des tâches

- Poignée de déplacement (6 points) visible au survol, à gauche du nom.
- Bouton repli/dépli pour les tâches récapitulatives.
- Icône de type : barre bleue (standard), losange orange (jalon), barre violette (récapitulative).
- Colonnes Début et Fin : clic unique pour activer la saisie inline avec validation différée.
- `[NOUVEAU]` Boutons d'action au survol : Modifier, Ajouter sous-tâche, Nester dans… `[NOUVEAU]`, Supprimer.

### 9.3 Interactions Gantt

- Survol d'une barre : infobulle (nom, dates, durée, description).
- Clic : sélection de la tâche (surbrillance dans le panneau liste).
- Double-clic : ouverture du formulaire de modification.
- Glisser-déposer horizontal : déplace les deux dates en conservant la durée.
- Redimensionnement gauche/droit : modifie la date de début ou de fin.

### 9.4 Raccourcis clavier `[NOUVEAU v3.2]`

| Touche | Action | Condition |
|---|---|---|
| `n` | Ouvre le formulaire de création d'une tâche standard | Inopérant si le curseur est dans un champ de saisie **ou si un modal est déjà ouvert** — une saisie en cours n'est jamais écrasée |
| `Échap` | Ferme le modal ouvert (édition, confirmation, export, nesting) | — |
| `Ctrl+S` / `Cmd+S` | Télécharge le projet au format JSON | Court-circuite l'enregistrement de la page par le navigateur |
| `Entrée` | Valide le formulaire d'édition | Hors zone de texte multiligne |

## 10. Exigences non fonctionnelles

| Catégorie | Exigence |
|---|---|
| Performance | Gantt fluide (> 30 fps) pour 500 tâches, y compris pendant un glisser-déposer (cf. RG-26). Exports en moins de 3 secondes. |
| Sécurité d'affichage `[NOUVEAU v3.2]` | Aucun contenu saisi par l'utilisateur, ni aucune donnée issue d'un fichier importé, ne peut être interprété comme du code par le navigateur (cf. RG-22). |
| Robustesse `[NOUVEAU v3.2]` | Aucune donnée en entrée — fichier JSON, localStorage — ne peut provoquer un blocage de l'application (cf. RG-23, RG-24). |
| Compatibilité navigateurs | Chrome 110+, Firefox 110+, Edge 110+, Safari 16+. |
| Compatibilité LibreOffice | SVG importables dans LibreOffice Impress 7.x et 24.x. CSV correctement interprété par LibreOffice Calc (UTF-8 BOM, séparateur `;`). |
| Export Markdown | Diagramme Mermaid Gantt rendable par GitHub, GitLab, Notion et Obsidian sans configuration supplémentaire. |
| Autonomie | Fonctionne hors ligne après le premier chargement. Aucun appel réseau requis. Aucune dépendance à l'exécution. |
| Persistance | Sauvegarde automatique dans le localStorage. Sauvegarde/chargement manuel JSON. |
| Gestion des dates | Toutes les dates sont traitées en heure locale (UTC+1/+2 en Europe) sans décalage. |
| Qualité du code `[MIS À JOUR v3.2]` | Le livrable `ganttPro.html` est **généré** depuis les sources séparées de `src/`. Avant chaque commit : contrôle de syntaxe (`node --check`), lint (ESLint), suite de tests unitaires sur la logique pure (`node:test`), puis build — enchaînés par `npm run verify` et rejoués par un hook git pre-commit. |
| Versionning | Code source hébergé sur GitHub ([github.com/Romube/gantt-html](https://github.com/Romube/gantt-html)). Chaque évolution fait l'objet d'un commit descriptif. |
| Maintenabilité | Livrable HTML unique auto-suffisant, généré depuis des sources séparées (markup, styles, script). Spécification versionnée avec le code. |

## 11. Glossaire

| Terme | Définition |
|---|---|
| Diagramme de Gantt | Outil de planification visuelle représentant des tâches sous forme de barres horizontales sur une ligne de temps. |
| Jalon | Événement ponctuel sans durée. Représenté par un losange dans le Gantt. |
| Tâche récapitulative | Tâche de regroupement dont les dates englobent automatiquement celles de ses sous-tâches. Peut exister sans sous-tâche (état valide, dates alors éditables manuellement) ; reclassable manuellement en tâche standard le cas échéant. |
| Sous-tâche | Tâche dont le niveau hiérarchique est inférieur à la tâche parente. |
| Nesting | Action de faire d'une tâche existante une sous-tâche d'une autre, soit par DnD (zone centrale), soit par le bouton « Nester dans… ». |
| Vue Années | Niveau de zoom affichant les années en ligne supérieure et les trimestres (T1–T4) en ligne inférieure. |
| Thème clair/sombre | Palette de couleurs de l'interface, reflétée dans l'export SVG. |
| Saisie inline | Saisie d'une date directement dans une cellule du tableau, validée à la sortie du champ. |
| DnD (drag and drop) | Glisser-déposer. Utilisé pour le réordonnancement, le nesting (3 zones) et le déplacement/redimensionnement des barres. |
| Échappement | Transformation des caractères de balisage (`<`, `>`, `&`) en équivalents inertes, pour qu'un texte reste du texte à l'affichage (cf. RG-22). |
| Réparation à l'import | Normalisation et correction automatiques d'un projet chargé avant son affichage, plutôt qu'un rejet du fichier (cf. §6.4, RG-23). |
| Mermaid | Langage de description de diagrammes en texte brut, supporté nativement par GitHub, GitLab, Notion et Obsidian. |
| CSV | Format texte structuré en colonnes séparées par un délimiteur (ici le point-virgule). Compatible LibreOffice Calc. |
| SVG | Format d'image vectorielle en XML. Vectoriel = redimensionnable sans perte. |
| localStorage | Stockage persistant côté navigateur, sans serveur. |
| ISO 8601 | Norme de représentation des dates (AAAA-MM-JJ) et de numérotation des semaines (débutant le lundi). |
| UTC / fuseau horaire | Pour éviter le décalage d'un jour en Europe (UTC+1/+2), toutes les dates sont calculées avec `getDate()` / `getMonth()` / `getFullYear()` en heure locale. |

---

*Fin de la spécification fonctionnelle GanttPro HTML v3.2.*
