# The Village

A mobile-first, offline companion for in-person Werewolf games. One shared phone is used by the narrator to configure a game and privately deal roles. No account or game server is used.

## Run locally

```sh
npm install
npm run dev
```

Create a production build with `npm run build`, or serve it locally with `npm run preview`. The PWA service worker caches the application shell and assets after the first successful load; install it from a supported mobile browser to launch it offline.

## Game flow

1. Choose the player count, then select role cards until the number of player slots matches exactly.
2. The app securely shuffles the selected roles and saves the assignment once.
3. Pass the phone. Each player enters a nickname, reveals only their own role, and confirms to hide it before the next handover.
4. The narrator confirms they have the phone before opening the complete role distribution.

The narrator guides the game through night actions, a saved and filterable night log, morning outcomes, village discussion, offline voting, multiple role-triggered or vote-related eliminations in one day, death reactions, and faction victory checks. Village voting happens in person; the narrator records each eliminated player and the reason on the phone, then explicitly finishes the day. A Hunter killed at night is announced in the dawn log and gets a choice prompt when the narrator opens day.

## Architecture

- `src/data/roles.ts`: role identifiers, categories, flags, and player-slot counts.
- `src/locales/`: separate English and Arabic UI and role translation resources.
- `src/services/gameMachine.ts`: validated game transitions, unbiased Fisher-Yates shuffle, and private-stage normalization.
- `src/services/database.ts`: IndexedDB persistence through `idb`.
- `src/hooks/useGame.ts`: recovery window and automatic persistence.
- `src/screens/GameRoundScreen.tsx`: night actions, the event log, narrator-recorded day outcomes, and role reactions rendered as touch-friendly cards.
- `src/screens/`: independent setup, distribution, and narrator screens.
- Vite + Tailwind CSS + `vite-plugin-pwa`: client build, styles, install manifest, offline font assets, and offline app caching.

## Recovery and privacy

Game state is saved in IndexedDB after every state-changing action. A saved game can be recovered for 30 minutes from its last meaningful activity, measured using persisted timestamps. An expired game is not resumed automatically; the app asks whether to start fresh or clear the saved data. When reopening during role distribution, the app returns to a neutral handover screen and asks that player to identify themselves again. A narrator dashboard or active game is always placed behind narrator confirmation after restart. Older saved private ballots are discarded and return to the narrator-led day screen.

Local browser storage is not encrypted against someone with access to this device's browser data. This is a privacy-oriented party game, not a secure authentication system. Do not rely on it to protect sensitive information from someone who can inspect the browser profile.

Language selection is saved separately and never resets an active game. Arabic switches the document and layout to right-to-left. No runtime machine translation is used.
