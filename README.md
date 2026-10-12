[Türkçe README](README.tr.md)

# LearnToPoker

LearnToPoker is a bilingual poker school that takes complete beginners from understanding the deck to making decisions at the table. Interactive lessons, illustrated sample hands, quizzes, and a simulator with explanatory coaching turn rules into practice, with a cinematic 3D presentation.

**[Visit LearnToPoker](https://learntopoker.vercel.app)**

![Landing hero with a royal-flush fan](docs/screenshots/01-hero-fan.jpg)

## Why this project

Poker becomes easier to understand when each decision has context. LearnToPoker follows **learn → practise → play**: start with cards, hand rankings, and betting; explore how variants change the rules; then play against bots while seeing what happens and why.

This is an educational project with virtual chips. There is no real-money play.

## Features

### Landing and cinematic 3D hero

The landing page introduces the learning path, hand rankings, and poker variants. Its cards cycle through six formations: **fan, carousel, waterfall, shuffle, scatter, and helix**. The waterfall is named `cascade` in the source. Scrolling adds an exit to the current formation, spreading cards and pulling them toward the camera. A CSS card fan provides a fallback when WebGL is unavailable.

![Royal-flush fan](docs/screenshots/01-hero-fan.jpg)
![Carousel formation](docs/screenshots/02-hero-carousel.jpg)
![Landing hand rankings](docs/screenshots/03-landing-hands.jpg)
![Landing variant overview](docs/screenshots/04-landing-variants.jpg)

### Basics lesson

Learn the deck and suits, explore an expandable hand-ranking ladder with examples and probabilities, and understand fold, check, call, bet, raise, and all-in. Interactive diagrams explain blinds, antes, the pot, the flow of a Hold'em hand, and table position. An **eight-question quiz** checks understanding before moving on.

![Basics introduction](docs/screenshots/05-basics-hero.jpg)
![Hand-ranking ladder](docs/screenshots/06-basics-ladder.jpg)
![Betting actions](docs/screenshots/07-basics-actions.jpg)
![Basics quiz](docs/screenshots/08-basics-quiz.jpg)

### Variant lessons

Explore **eleven variants**, filter by family or simulator availability, and open a dedicated lesson for each. Lessons include rules, differences from Hold'em, practical tips, and a **five-question quiz**. The sample-hand player illustrates cards, bets, actions, and explanations step by step. It supports autoplay, previous/next controls, restart, direct step selection, and Left/Right arrow navigation while visible.

![Variant lesson grid](docs/screenshots/09-variants-grid.jpg)
![Variant rules and details](docs/screenshots/10-variant-detail.jpg)
![Sample-hand player](docs/screenshots/11-stepplayer.jpg)
![Variant quiz](docs/screenshots/12-variant-quiz.jpg)

### Simulator

Play **Texas Hold'em, Omaha, Five-Card Draw, or Seven-Card Stud** against **two to five bots**, with tight, balanced, loose, and maniac personalities in the roster. Choose 500, 1,000, or 2,000 virtual chips. Advance step by step, or let automatic mode handle bots and dealing while waiting for your decisions.

- The action bar offers legal actions, a sizing slider, minimum/½-pot/pot/all-in presets, and fixed-limit buttons where appropriate. Sizing respects betting limits; the maximum preset in pot-limit play can be below your entire stack.
- Five-Card Draw lets you select discards or keep the whole hand.
- The coach shows Monte Carlo equity, pot odds, a suggestion, and reasons. Draw advice uses a discard heuristic; equity does not simulate future exchanges.
- A plain-language game log explains actions and street transitions. Hand summaries show results and review notes, including passive-play feedback where applicable.
- Rebuy restores your starting stack when your chips run out.
- The 3D table displays dealt/flipped cards, bets, chip stacks, and payouts. A 2D fallback handles unavailable or failed WebGL; `/play/holdem?flat` selects it explicitly.

In step mode, Right arrow advances a bot action or game step when the table is not awaiting your decision.

![Simulator setup](docs/screenshots/13-play-setup.jpg)
![3D poker table](docs/screenshots/14-play-table.jpg)
![Draw card selection](docs/screenshots/15-play-draw.jpg)
![Hand summary and review](docs/screenshots/16-play-summary.jpg)

### Glossary

Browse **85 terms** with definitions and examples. Search checks both Turkish and English entries; category filters cover betting, cards, hands, table, variants, and strategy.

![Searchable poker glossary](docs/screenshots/17-glossary.jpg)

### Mobile

Responsive layouts adapt lessons, navigation, and landing visuals to smaller screens. The simulator offers a collapsible side panel; further portrait-phone table improvements are on the roadmap.

<p align="center"><img src="docs/screenshots/18-mobile-landing.jpg" width="45%"> <img src="docs/screenshots/19-mobile-play.jpg" width="45%"></p>

### Internationalisation: Turkish and English

Interface and lesson content are available in **TR and EN**, with per-page translation namespaces. Turkish is the initial default, English is the fallback, and the chosen language is saved locally. The document language updates with the selection.

![English landing page](docs/screenshots/20-en-landing.jpg)

### Motion preferences and accessibility

The motion toggle offers **Auto / On / Off**. Auto follows `prefers-reduced-motion`; On and Off override the operating-system preference. The locally saved choice is shared by CSS, interface transitions, and 3D animation code.

Accessibility provisions include screen-reader table text for the 3D scene, labelled controls, expandable hand-ranking buttons, keyboard navigation in sample hands and step mode, and a focus trap in the setup dialog. Setup moves focus inside and restores it on close; Escape closes it when an existing game can be resumed.

## Variants

The table reflects lesson metadata and the current simulator registry. Limits are the configurations taught by this project.

| Variant | Family | Betting limit | Playable |
| --- | --- | --- | --- |
| Texas Hold'em | Community cards | No-limit | Yes (`holdem`) |
| Omaha | Community cards | Pot-limit | Yes (`omaha`) |
| Omaha Hi-Lo | Community cards | Fixed-limit | No |
| Seven-Card Stud | Stud | Fixed-limit | Yes (`sevenCardStud`) |
| Razz | Stud | Fixed-limit | No |
| Five-Card Draw | Draw | Fixed-limit | Yes (`fiveCardDraw`) |
| 2-7 Triple Draw | Draw | Fixed-limit | No |
| Short Deck | Community cards | No-limit | No |
| Pineapple | Community cards | No-limit | No |
| Badugi | Draw | Fixed-limit | No |
| H.O.R.S.E. | Mixed | Mixed | No |

Variants without a simulator remain available as lessons and link to a related playable game.

## Game engine

`src/engine/` contains framework-free JavaScript for cards, rules, and decisions.

- **Hand evaluation:** five-card high hands, best five of *n*, Omaha's exactly two hole cards plus three board cards, ace-to-five low with eight-or-better qualification, deuce-to-seven low, and Badugi. Low evaluators are present, but their variants are not yet playable.
- **Betting:** no-limit, pot-limit, fixed-limit with a four-raise cap, minimum raises, short all-in reopening rules (including cumulative short raises), side pots, and uncalled-bet refunds before settlement.
- **Hand flow:** variant configurations drive blinds/antes, dealing, betting, drawing, showdown, and completion. Public transitions return new state; seeded shuffling makes hands reproducible.
- **Stud:** the lowest exposed card determines the bring-in decision, with an option to complete. Later streets use the best showing hand; suits do not break showing-hand ties.
- **Draw:** replacements arrive before that player's own discards enter the pile. Earlier discards can be reshuffled when the remaining deck runs out.
- **Equity:** Monte Carlo sampling respects visible cards, including exposed cards from folded stud players, and divides tied outcomes. Hidden holdings are sampled rather than inferred from opponent ranges.
- **Bots and coach:** personality parameters control aggression and looseness. Coaching compares equity with pot odds, suggests legal actions with translated reasons, and supplies post-hand review notes.

### Tests

The Vitest suite defines **69 tests: 65 engine cases and four hero-formation cases**, counting loop-expanded cases. Coverage includes categories and kickers, Omaha restrictions, low hands, betting limits, side pots, refunds, stud order, draw exhaustion, legal bot decisions, and complete hands.

Fuzz tests play **200 hands per playable variant**: 800 hands with random legal decisions, two to six players, and mixed stack sizes. They check chip conservation, nonnegative stacks, unique cards, valid turns, legal raise bounds, and payout totals. Formation tests check distinct formations and finite, bounded poses for five- and seven-card layouts.

Run `npm test`. These counts describe the checked-in tests; execution results must be confirmed in your local environment.

## Tech stack

| Area | Technology |
| --- | --- |
| Interface | React 18, React Router 6 |
| Build | Vite 5, React plugin |
| 3D | Three.js, React Three Fiber, Drei |
| Animation | Framer Motion 11 |
| State | Zustand 5 |
| Languages | i18next, react-i18next |
| Styling | CSS with shared design tokens |
| Tests | Vitest 2 |
| Hosting | Vercel |

## Getting started

Install Node.js and npm, then run these commands from the project directory. This browser application needs no separate application server for local development.

| Command | Purpose |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Build the production site into `dist/` |
| `npm test` | Run the Vitest suite once |
| `npm run preview` | Serve the production build locally after building |

Open the local URL printed by Vite. Useful routes: `/basics`, `/variants`, `/variants/holdem`, `/play/holdem`, `/glossary`. Add `?flat` to a simulator URL for the 2D table.

## Project structure

```text
LearnToPoker/
├── docs/screenshots/           # README screenshots
├── index.html                 # Browser entry document
├── package.json               # Dependencies and npm commands
├── package-lock.json          # Locked dependency versions
├── vite.config.js             # React plugin and test-file selection
├── vercel.json                # SPA routing and asset cache headers
└── src/
    ├── main.jsx               # React root and router setup
    ├── App.jsx                # Routes, layout, loading and error handling
    ├── cards/                 # 2D cards, flips, layout and texture drawing
    ├── components/            # Shared lesson and simulator UI
    ├── content/
    │   ├── variants.js        # Metadata for eleven lesson variants
    │   └── walkthroughs.js    # Sample-hand visual steps
    ├── engine/
    │   ├── deck.js            # Cards, seeded random numbers and shuffling
    │   ├── evaluator.js       # High-hand, low-hand and Badugi evaluation
    │   ├── betting.js         # Legal actions, betting rounds and pots
    │   ├── game.js            # Hand state machine and settlement
    │   ├── equity.js          # Monte Carlo estimates and discard advice
    │   ├── bots.js            # Bot personalities and decisions
    │   ├── coach.js           # Advice and post-hand review
    │   ├── variants/          # Four playable configurations and registry
    │   └── __tests__/         # Evaluator, betting, game, regression and fuzz tests
    ├── i18n/                  # Initialisation and TR/EN namespace JSON files
    ├── motion/                # Motion preference store and hooks
    ├── pages/                 # Landing, Basics, Variants, VariantDetail, Play, Glossary
    ├── store/gameStore.js     # Game lifecycle, UI state and log text helpers
    ├── styles/                # Global CSS and tokens.css
    └── three/                 # Hero, formations, table, cards, chips and formation tests
```

## Architecture notes

- **Routes:** Landing loads eagerly; other pages use lazy imports inside Suspense. A route-aware error boundary offers a return-home link and resets after navigation.
- **Translations:** common resources load at initialisation. Pages and shared lesson components register their TR/EN namespace bundles when imported.
- **Design:** `src/styles/tokens.css` holds shared design tokens, applied by global and component/page CSS.
- **Motion:** a dedicated Zustand store resolves the saved preference against the operating-system setting, exposing hooks and a value usable outside React.
- **Engine boundary:** the engine has no React dependency. `gameStore.js` is the stateful bridge for game lifecycle and actions. UI code also calls read-only engine helpers for visible cards, pot values, and coaching.

## Deployment

The live site is hosted on **[Vercel](https://learntopoker.vercel.app)**. Use `npm run build` as the build command and `dist` as the output directory.

`vercel.json` rewrites SPA requests to `/index.html`, supporting direct navigation to lesson and simulator routes. `/assets/` receives `Cache-Control: public, max-age=31536000, immutable` for long-lived caching.

## Roadmap

- Further bundle splitting for Three.js and the 3D table.
- A more comfortable simulator table on portrait phones.
- Equity estimation that models the draw phase and exchanges.
- An Omaha Hi-Lo engine with high/low pot settlement.
- More playable variants beyond the current four.

## License

Copyright © 2026 Ayberk Arda. Released under the [MIT License](LICENSE).

LearnToPoker is for education and practice with virtual chips. There is no real-money play.
