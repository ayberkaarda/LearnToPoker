import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore, explainFeedItem } from '../store/gameStore.js';
import './GameLog.css';

const ICON = {
  handStart: 'D',
  ante: '●',
  blind: '●',
  bringIn: '●',
  dealHole: '♠',
  dealCommunity: '♦',
  dealStud: '♣',
  action: '›',
  draw: '↻',
  showdown: '★',
  refund: '↩',
};

function GameLog() {
  const { t } = useTranslation('play');
  const feed = useGameStore((s) => s.feed);
  const game = useGameStore((s) => s.game);

  return (
    <section className="glog">
      <h2 className="glog__title">{t('log.title')}</h2>
      {feed.length === 0 ? (
        <p className="glog__empty">{t('log.empty')}</p>
      ) : (
        <ol className="glog__list">
          {feed.map((item, i) => {
            const e = item.entry;
            const kind = item.kind === 'note' ? 'note' : e.type;
            const actor = e.playerIdx != null && item.kind === 'log' ? game?.players[e.playerIdx] : null;
            return (
              <li
                key={item.id}
                className={`glog__item glog__item--${kind}${e.action ? ` glog__item--${e.action}` : ''}${actor?.isHuman ? ' glog__item--me' : ''}${i === 0 ? ' glog__item--latest' : ''}`}
              >
                <span className="glog__icon" aria-hidden="true">
                  {item.kind === 'note' ? '•' : ICON[e.type] || '•'}
                </span>
                <span className="glog__text">{explainFeedItem(t, game, item)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export default memo(GameLog);
