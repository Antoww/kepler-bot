# Direction artistique de Kepler

## Intention

Kepler doit évoquer un centre de contrôle spatial : précis, calme et lisible.
L'identité vient du logo satellite, du bandeau bleu et du fond graphite. Les
interfaces évitent l'effet « arc-en-ciel » : la couleur indique une fonction,
pas une décoration.

## Palette

| Token | Hex | Usage |
| --- | --- | --- |
| Bleu orbital | `#5F91C4` | Marque, embeds et actions principales |
| Bleu profond | `#3F6FA3` | Éléments secondaires et données |
| Bleu signal | `#78AEE8` | Accent, seconde série des graphiques |
| Blanc lunaire | `#E7EBF0` | Titres et valeurs importantes |
| Argent | `#AAB4C0` | Texte secondaire |
| Graphite | `#121417` | Fond principal des visuels |
| Panneau | `#1A1E23` | Cartes et zones de données |
| Vert signal | `#49B675` | Succès uniquement |
| Jaune alerte | `#F2C94C` | Attention ou état dégradé |
| Rouge incident | `#E05252` | Erreur, suppression ou danger |

Les valeurs de référence sont définies dans `utils/theme.ts`. Aucun nouveau
code ne doit introduire une couleur statique en dehors de ce fichier, sauf
couleur produite par un utilisateur, un rôle Discord ou un contenu externe.

## Embeds et messages

- Un embed standard est créé avec `createKeplerEmbed(tone)`.
- L'auteur par défaut affiche `Kepler` avec l'avatar actuel du bot. Un auteur
  contextuel peut le remplacer lorsqu'il identifie réellement un membre, un
  serveur ou une source externe.
- `primary` sert aux informations normales, `success` aux confirmations,
  `warning` aux avertissements, `danger` aux erreurs et actions destructives.
- Un titre décrit le résultat ou l'action, sans ponctuation superflue.
- Une description courte donne le contexte ; les détails structurés utilisent
  des champs.
- Les réponses techniques et les erreurs internes ne sont jamais exposées aux
  utilisateurs. Elles vont dans les salons d'incident.
- Les emojis servent de repères sémantiques et restent constants :
  `✅` succès, `⚠️` avertissement, `❌` erreur, `ℹ️` information.
- Les footers utilisent `setRequesterFooter` quand une action est liée à un
  utilisateur.
- Les footers informatifs existants sont conservés : pagination, nombre
  d'éléments, version, durée de validité ou nom du serveur.

## Graphiques

- Format 16:9, fond graphite, panneau sombre et filet bleu orbital.
- Blanc lunaire pour les valeurs, argent pour les axes et légendes.
- Séries fixes : messages en bleu orbital, commandes en bleu signal.
- Les autres classements utilisent les tokens de `KEPLER_CHART_COLORS`.
- Pas de rouge dans une série neutre : le rouge reste réservé aux incidents.

## Ton rédactionnel

Le bot parle en français, de façon directe et calme. Une réponse indique
d'abord le résultat, puis l'action possible. Les formulations techniques,
majuscules décoratives et successions d'emojis sont évitées.
