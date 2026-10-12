import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Card2D from '../cards/Card2D.jsx';
import { potSize } from '../engine/game.js';
import { useGameStore, isHumanTurn, PHASE, playerName, canStartNextHand } from '../store/gameStore.js';
import './ActionBar.css';

const round5 = (x) => Math.round(x / 5) * 5;

export function nextStepLabel(t, game) {
  if (!game || game.phase === PHASE.COMPLETE) return '';
  if (game.awaiting) return t('nextWhat.bot', { name: playerName(t, game, game.awaiting.playerIdx) });
  if (game.phase === PHASE.BETTING) return t(game.betting?.complete ? 'nextWhat.bettingDone' : 'nextWhat.betting');
  return t(`nextWhat.${game.phase}`);
}

function BetControls({ game, aw, suggestion, onAct }) {
  const { t } = useTranslation('play');
  const a = aw.actions;
  const r = a.raise;
  const pot = potSize(game);
  const cur = game.betting?.currentBet ?? 0;
  const clamp = (x) => (r ? Math.max(r.min, Math.min(r.max, x)) : 0);
  const sugAmount = suggestion && (suggestion.type === 'bet' || suggestion.type === 'raise') ? suggestion.amount : null;
  const [amount, setAmount] = useState(() => (r ? clamp(sugAmount ?? r.min) : 0));
  useEffect(() => {
    if (r) setAmount(clamp(sugAmount ?? r.min));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aw, sugAmount]);

  const presets = useMemo(() => {
    if (!r || r.fixed) return [];
    return [
      { key: 'min', label: t('bar.min'), value: r.min },
      { key: 'half', label: t('bar.halfPot'), value: clamp(round5(cur + (pot + a.toCall) * 0.5)) },
      { key: 'pot', label: t('bar.pot'), value: clamp(round5(cur + pot + a.toCall)) },
      { key: 'max', label: t('bar.allIn'), value: r.max },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r, pot, cur, a.toCall, t]);

  const sug = suggestion?.type;
  const hl = (type) => (sug === type ? ' ab__btn--suggested' : '');
  const raiseLabel = (v) => (r?.isBet ? t('bar.betTo', { amount: v }) : t('bar.raiseTo', { amount: v }));
  const raiseType = r?.isBet ? 'bet' : 'raise';
  const me = game.players[aw.playerIdx];
  const isAllIn = !!r && !r.fixed && amount >= me.bet + me.stack;

  return (
    <div className="ab__bet">
      <p className="ab__hint">{a.toCall > 0 ? t('bar.toCall', { amount: a.toCall }) : t('bar.free')}</p>
      {r && !r.fixed && (
        <div className="ab__sizing">
          <div className="ab__presets">
            {presets.map((p) => (
              <button key={p.key} type="button" className={`ab__chip${amount === p.value ? ' is-on' : ''}`} onClick={() => setAmount(p.value)}>
                {p.label}
              </button>
            ))}
          </div>
          <label className="ab__slider">
            <span className="sr-only">{t('bar.slider')}</span>
            <input type="range" min={r.min} max={r.max} step={5} value={amount} onChange={(e) => setAmount(clamp(Number(e.target.value)))} />
            <output className="ab__amount">{amount}</output>
          </label>
        </div>
      )}
      <div className="ab__buttons">
        {a.fold && (
          <button type="button" className={`ab__btn ab__btn--fold${hl('fold')}`} onClick={() => onAct({ type: 'fold' })}>
            {t('actions.fold')}
          </button>
        )}
        {a.check && (
          <button type="button" className={`ab__btn${hl('check')}`} onClick={() => onAct({ type: 'check' })}>
            {t('actions.check')}
          </button>
        )}
        {a.call && (
          <button type="button" className={`ab__btn${hl('call')}`} onClick={() => onAct({ type: 'call' })}>
            {a.call.full ? t('bar.callAmount', { amount: a.call.amount }) : t('bar.callAllIn', { amount: a.call.amount })}
          </button>
        )}
        {r && (
          <button
            type="button"
            className={`ab__btn ab__btn--raise${sug === 'bet' || sug === 'raise' ? ' ab__btn--suggested' : ''}`}
            onClick={() => onAct(isAllIn ? { type: 'allin' } : { type: raiseType, amount: r.fixed ? r.min : amount })}
          >
            {r.fixed ? raiseLabel(r.min) : isAllIn ? `${t('bar.allIn')} ${amount}` : raiseLabel(amount)}
          </button>
        )}
      </div>
      {r?.fixed && <p className="ab__note">{t('bar.fixedNote')}</p>}
    </div>
  );
}

function DrawControls({ game, aw, advice }) {
  const { t } = useTranslation('play');
  const selection = useGameStore((s) => s.drawSelection);
  const toggle = useGameStore((s) => s.toggleDiscard);
  const submit = useGameStore((s) => s.submitDraw);
  const me = game.players[aw.playerIdx];
  const suggested = new Set(advice?.discard || []);
  const matchesCoach = !!advice && suggested.size === selection.length && selection.every((id) => suggested.has(id));
  return (
    <div className="ab__draw">
      <p className="ab__hint">
        <strong>{t('bar.drawTitle')}</strong> · {t('bar.drawHint', { max: aw.maxDiscard })}
      </p>
      <div className="ab__drawcards">
        {me.cards.map((c) => {
          const on = selection.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              className={`ab__drawcard${on ? ' is-on' : ''}${suggested.has(c.id) ? ' is-suggested' : ''}`}
              aria-pressed={on}
              onClick={() => toggle(c.id)}
            >
              <Card2D card={c} faceUp size="md" />
            </button>
          );
        })}
      </div>
      <div className="ab__buttons">
        <button type="button" className={`ab__btn ab__btn--raise${matchesCoach ? ' ab__btn--suggested' : ''}`} onClick={submit}>
          {selection.length === 0 ? t('bar.standPat') : t('bar.drawBtn', { n: selection.length })}
        </button>
      </div>
    </div>
  );
}

export default function ActionBar() {
  const { t } = useTranslation('play');
  const game = useGameStore((s) => s.game);
  const mode = useGameStore((s) => s.config.mode);
  const stack = useGameStore((s) => s.config.startingStack);
  const coachOn = useGameStore((s) => s.coachOn);
  const storedAdvice = useGameStore((s) => s.advice);
  const adviceKey = useGameStore((s) => s.adviceKey);
  const blocked = useGameStore((s) => s.setupOpen);
  const advance = useGameStore((s) => s.advance);
  const humanAct = useGameStore((s) => s.humanAct);
  const newHand = useGameStore((s) => s.newHand);
  const rebuy = useGameStore((s) => s.rebuy);
  const openSetup = useGameStore((s) => s.openSetup);

  if (!game) return <div className="ab" />;
  const human = isHumanTurn(game);
  // Only use advice computed for this exact decision (same key as CoachPanel).
  const currentKey = `${game.handNumber}:${game.log.length}:${game.awaiting?.kind}`;
  const advice = coachOn && human && adviceKey === currentKey ? storedAdvice : null;
  const complete = game.phase === PHASE.COMPLETE;

  let body;
  if (human && game.awaiting.kind === 'bet') {
    body = <BetControls game={game} aw={game.awaiting} suggestion={advice?.suggestion} onAct={humanAct} />;
  } else if (human && game.awaiting.kind === 'draw') {
    body = <DrawControls game={game} aw={game.awaiting} advice={advice} />;
  } else if (complete) {
    const busted = game.players[0].stack <= 0;
    const tableWon = !busted && !canStartNextHand(game);
    body = (
      <div className="ab__status">
        <p className="ab__hint">{busted ? t('bar.busted') : tableWon ? t('bar.tableWon') : ''}</p>
        <div className="ab__buttons">
          {busted && (
            <button type="button" className="ab__btn ab__btn--raise" onClick={rebuy}>
              {t('bar.rebuy', { amount: stack })}
            </button>
          )}
          {tableWon && (
            <button type="button" className="ab__btn ab__btn--raise" onClick={openSetup}>
              {t('bar.newGame')}
            </button>
          )}
          {!busted && !tableWon && (
            <button type="button" className="ab__btn ab__btn--raise ab__btn--next" onClick={newHand}>
              {t('bar.newHand')}
            </button>
          )}
        </div>
      </div>
    );
  } else {
    body = (
      <div className="ab__status">
        <p className="ab__hint">{mode === 'auto' ? t('bar.autoRunning') : t('bar.nextStep', { what: nextStepLabel(t, game) })}</p>
        <div className="ab__buttons">
          <button type="button" className="ab__btn ab__btn--raise ab__btn--next" onClick={advance} title={t('bar.nextHint')} disabled={mode === 'auto'}>
            {t('bar.next')} <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`ab${human ? ' ab--turn' : ''}`} inert={blocked ? '' : undefined} aria-hidden={blocked || undefined}>
      {human && <span className="ab__badge">{t('bar.yourTurn')}</span>}
      {body}
    </div>
  );
}
