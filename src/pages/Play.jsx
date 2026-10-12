import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import i18n from '../i18n/index.js';
import tr from '../i18n/tr/play.json';
import en from '../i18n/en/play.json';
import { visibleCards } from '../engine/game.js';
import { coachAdvice } from '../engine/coach.js';
import {
  useGameStore,
  resolveVariant,
  isHumanTurn,
  PHASE,
  PLAYABLE_IDS,
  BOT_ROSTER,
  AUTO_BOT_MS,
  AUTO_DEAL_MS,
} from '../store/gameStore.js';
import TableScene, { hasWebGL, seatPercent } from '../three/TableScene.jsx';
import PlayerSeat from '../components/PlayerSeat.jsx';
import PotDisplay from '../components/PotDisplay.jsx';
import ActionBar from '../components/ActionBar.jsx';
import CoachPanel from '../components/CoachPanel.jsx';
import GameLog from '../components/GameLog.jsx';
import HandSummary from '../components/HandSummary.jsx';
import './Play.css';

if (!i18n.hasResourceBundle('tr', 'play')) {
  i18n.addResourceBundle('tr', 'play', tr);
  i18n.addResourceBundle('en', 'play', en);
}

const COACH_SAMPLES = 200;
const STACKS = [500, 1000, 2000];

function SetupPanel({ notPlayable }) {
  const { t } = useTranslation('play');
  const navigate = useNavigate();
  const config = useGameStore((s) => s.config);
  const hasGame = useGameStore((s) => !!s.game);
  const startGame = useGameStore((s) => s.startGame);
  const closeSetup = useGameStore((s) => s.closeSetup);
  const [draft, setDraft] = useState(config);
  useEffect(() => setDraft((d) => ({ ...d, variantId: config.variantId })), [config.variantId]);
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const start = () => {
    startGame(draft);
    navigate(`/play/${draft.variantId}`, { replace: true });
  };

  return (
    <div className="play-setup" role="dialog" aria-modal="true" aria-labelledby="play-setup-title">
      <motion.div className="play-setup__card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 id="play-setup-title" className="play-setup__title">
          {t('setup.title')}
        </h1>
        <p className="play-setup__lead">{t('setup.lead')}</p>
        {notPlayable && <p className="play-setup__warn">{t('setup.notPlayable')}</p>}

        <fieldset className="play-setup__group">
          <legend>{t('setup.variant')}</legend>
          <div className="play-setup__variants">
            {PLAYABLE_IDS.map((id) => (
              <label key={id} className={`play-setup__variant${draft.variantId === id ? ' is-on' : ''}`}>
                <input type="radio" name="variant" value={id} checked={draft.variantId === id} onChange={() => set({ variantId: id })} />
                <strong>{t(`variants.${id}`)}</strong>
                <span>{t(`variantBlurb.${id}`)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="play-setup__group">
          <legend>{t('setup.bots')}</legend>
          <div className="play-setup__seg">
            {[2, 3, 4, 5].map((n) => (
              <button key={n} type="button" className={draft.numBots === n ? 'is-on' : ''} aria-pressed={draft.numBots === n} onClick={() => set({ numBots: n })}>
                {n}
              </button>
            ))}
          </div>
          <ul className="play-setup__bots">
            {BOT_ROSTER.slice(0, draft.numBots).map((b) => (
              <li key={b.name} title={t(`personalityHelp.${b.personality}`)}>
                <span className="play-setup__avatar" aria-hidden="true">
                  {b.name[0]}
                </span>
                {b.name} · <em>{t(`personalities.${b.personality}`)}</em>
              </li>
            ))}
          </ul>
        </fieldset>

        <div className="play-setup__row">
          <fieldset className="play-setup__group">
            <legend>{t('setup.stack')}</legend>
            <div className="play-setup__seg">
              {STACKS.map((s) => (
                <button key={s} type="button" className={draft.startingStack === s ? 'is-on' : ''} aria-pressed={draft.startingStack === s} onClick={() => set({ startingStack: s })}>
                  {s}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="play-setup__group">
            <legend>{t('setup.mode')}</legend>
            <div className="play-setup__seg">
              {['step', 'auto'].map((m) => (
                <button key={m} type="button" className={draft.mode === m ? 'is-on' : ''} aria-pressed={draft.mode === m} onClick={() => set({ mode: m })}>
                  {t(`setup.${m}`)}
                </button>
              ))}
            </div>
            <p className="play-setup__hint">{t(draft.mode === 'step' ? 'setup.stepHint' : 'setup.autoHint')}</p>
          </fieldset>
        </div>

        <div className="play-setup__actions">
          {hasGame && (
            <button type="button" className="btn btn--ghost" onClick={closeSetup}>
              {t('setup.cancel')}
            </button>
          )}
          <button type="button" className="btn btn--primary" onClick={start}>
            {hasGame ? t('setup.restart') : t('setup.start')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Seats({ game, positions, showCards }) {
  const n = game.players.length;
  const complete = game.phase === PHASE.COMPLETE;
  const won = {};
  if (complete && game.result) for (const w of game.result.winners) won[w.playerIdx] = w.amount;
  return game.players.map((p, i) => {
    const [x, y] = positions?.[i] || seatPercent(i, n);
    return (
      <PlayerSeat
        key={i}
        idx={i}
        player={p}
        isTurn={game.awaiting?.playerIdx === i}
        isDealer={game.dealerIdx === i}
        isSb={game.sbIdx === i && !complete}
        isBb={game.bbIdx === i && !complete}
        won={won[i] || 0}
        cards={showCards ? visibleCards(game, 0, p) : null}
        showCards={showCards}
        compact={n > 4}
        style={{ left: `${x}%`, top: `${y}%` }}
      />
    );
  });
}

export default function Play() {
  const { t } = useTranslation('play');
  const { variant: param } = useParams();
  const game = useGameStore((s) => s.game);
  const config = useGameStore((s) => s.config);
  const setupOpen = useGameStore((s) => s.setupOpen);
  const coachOn = useGameStore((s) => s.coachOn);
  const summaryOpen = useGameStore((s) => s.summaryOpen);
  const drawSelection = useGameStore((s) => s.drawSelection);
  const advance = useGameStore((s) => s.advance);
  const setMode = useGameStore((s) => s.setMode);
  const toggleCoach = useGameStore((s) => s.toggleCoach);
  const openSetup = useGameStore((s) => s.openSetup);
  const openSummary = useGameStore((s) => s.openSummary);
  const setConfig = useGameStore((s) => s.setConfig);
  const setAdvice = useGameStore((s) => s.setAdvice);

  const resolved = resolveVariant(param);
  const [webgl, setWebgl] = useState(() => hasWebGL() && !new URLSearchParams(window.location.search).has('flat'));
  const [seatPos, setSeatPos] = useState(null);
  const [sideOpen, setSideOpen] = useState(true);
  const onLayout = useCallback((pos) => setSeatPos(pos), []);
  const onFail = useCallback(() => setWebgl(false), []);

  // URL → selected variant. A different variant than the running game re-opens setup.
  useEffect(() => {
    const id = resolved || 'holdem';
    if (id !== useGameStore.getState().config.variantId) setConfig({ variantId: id });
    const g = useGameStore.getState().game;
    if (g && g.variantId !== id) openSetup();
  }, [resolved, setConfig, openSetup]);

  useEffect(() => setSeatPos(null), [game?.players.length]);

  // Auto mode: bots act after 800ms, deals after 600ms, stop for the human or at hand end.
  useEffect(() => {
    if (!game || config.mode !== 'auto' || setupOpen) return undefined;
    if (game.phase === PHASE.COMPLETE || isHumanTurn(game)) return undefined;
    const id = setTimeout(advance, game.awaiting ? AUTO_BOT_MS : AUTO_DEAL_MS);
    return () => clearTimeout(id);
  }, [game, config.mode, setupOpen, advance]);

  // Coach: one Monte Carlo run per decision, deferred so the table paints first.
  useEffect(() => {
    if (!coachOn || !isHumanTurn(game)) return undefined;
    const key = `${game.handNumber}:${game.log.length}:${game.awaiting.kind}`;
    if (useGameStore.getState().adviceKey === key) return undefined;
    const id = setTimeout(() => setAdvice(key, coachAdvice(game, 0, COACH_SAMPLES)), 40);
    return () => clearTimeout(id);
  }, [game, coachOn, setAdvice]);

  // Keyboard: → advances one step in step-by-step mode.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'ArrowRight') return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const s = useGameStore.getState();
      if (!s.game || s.setupOpen || s.config.mode !== 'step' || s.game.phase === PHASE.COMPLETE || isHumanTurn(s.game)) return;
      e.preventDefault();
      s.advance();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const variantName = t(`variants.${game?.variantId || config.variantId}`);
  const complete = game?.phase === PHASE.COMPLETE;
  const showSetup = setupOpen || !game;

  const stageClass = useMemo(() => `play__stage${webgl ? '' : ' play__stage--flat'}`, [webgl]);

  return (
    <motion.div className="page play" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
      <div className={`play__layout${sideOpen ? '' : ' play__layout--wide'}`}>
        <div className="play__main">
          <div className="play__toolbar">
            <div className="play__titles">
              <span className="play__variant">{variantName}</span>
              {game && <span className="play__hand">{t('toolbar.hand', { n: game.handNumber })}</span>}
            </div>
            <div className="play__tools">
              <div className="play__seg" role="group" aria-label={t('setup.mode')}>
                {['step', 'auto'].map((m) => (
                  <button key={m} type="button" className={config.mode === m ? 'is-on' : ''} aria-pressed={config.mode === m} onClick={() => setMode(m)}>
                    {t(`toolbar.${m}`)}
                  </button>
                ))}
              </div>
              <button type="button" className={`play__tool${coachOn ? ' is-on' : ''}`} aria-pressed={coachOn} onClick={toggleCoach}>
                {coachOn ? t('toolbar.coachOn') : t('toolbar.coachOff')}
              </button>
              {complete && !summaryOpen && (
                <button type="button" className="play__tool" onClick={openSummary}>
                  {t('toolbar.summary')}
                </button>
              )}
              <button type="button" className="play__tool" onClick={openSetup}>
                {t('toolbar.settings')}
              </button>
              <button type="button" className="play__tool play__tool--side" onClick={() => setSideOpen((v) => !v)} aria-expanded={sideOpen}>
                {sideOpen ? t('toolbar.hidePanel') : t('toolbar.showPanel')}
              </button>
            </div>
          </div>

          <div className={stageClass}>
            {game && webgl && (
              <>
                <TableScene game={game} drawSelection={drawSelection} onLayout={onLayout} onFail={onFail} />
                <div className="play__overlay">
                  <div className="play__pot">
                    <PotDisplay game={game} />
                  </div>
                  <Seats game={game} positions={seatPos} showCards={false} />
                </div>
              </>
            )}
            {game && !webgl && (
              <div className="play__flat">
                <div className="play__felt" aria-hidden="true" />
                <div className="play__overlay">
                  <div className="play__pot play__pot--center">
                    <PotDisplay game={game} showBoard />
                  </div>
                  <Seats game={game} positions={null} showCards />
                </div>
                <p className="play__fallback-note">{t('table.fallback')}</p>
              </div>
            )}
            <HandSummary />
            {showSetup && <SetupPanel notPlayable={!!param && !resolved} />}
          </div>

          <ActionBar />
        </div>

        <aside className="play__side" aria-label={t('coachUi.title')} hidden={!sideOpen}>
          <CoachPanel />
          <GameLog />
        </aside>
      </div>
    </motion.div>
  );
}
