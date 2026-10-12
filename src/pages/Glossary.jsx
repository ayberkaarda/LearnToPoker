import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import i18n from '../i18n/index.js';
import tr from '../i18n/tr/glossary.json';
import en from '../i18n/en/glossary.json';
import './Glossary.css';

if (!i18n.hasResourceBundle('tr', 'glossary')) i18n.addResourceBundle('tr', 'glossary', tr);
if (!i18n.hasResourceBundle('en', 'glossary')) i18n.addResourceBundle('en', 'glossary', en);

const categoryKeys = ['betting', 'cards', 'hands', 'table', 'variants', 'strategy'];

export default function Glossary() {
  const { t } = useTranslation('glossary');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState([]);
  const rawTerms = t('terms', { returnObjects: true });
  const terms = Array.isArray(rawTerms) ? rawTerms : [];
  const rawCategories = t('categories', { returnObjects: true });
  const categories = rawCategories && typeof rawCategories === 'object' ? rawCategories : {};
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const translations = ['tr', 'en'].map((language) => i18n.getResource(language, 'glossary', 'terms') || []);
    return terms.filter((item, index) => {
      const searchable = translations.map((list) => list[index]).filter(Boolean)
        .map((entry) => `${entry.term} ${entry.definition} ${entry.example || ''}`).join(' ');
      return (!selected.length || selected.includes(item.category)) &&
        (!needle || searchable.toLocaleLowerCase().includes(needle));
    });
  }, [terms, query, selected]);
  const grouped = filtered.reduce((groups, item) => {
    const letter = item.term.charAt(0).toLocaleUpperCase();
    (groups[letter] ||= []).push(item);
    return groups;
  }, {});

  const toggleCategory = (key) => setSelected((current) => current.includes(key)
    ? current.filter((item) => item !== key) : [...current, key]);

  return (
    <motion.div className="page glossary-page" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
      <section className="section">
        <div className="container">
          <header className="glossary-header">
            <p className="eyebrow">{t('eyebrow')}</p>
            <h1 className="h1">{t('title')}</h1>
            <p className="lead">{t('lead')}</p>
          </header>
          <div className="glossary-controls">
            <label className="glossary-search-wrap">
              <span className="sr-only">{t('searchPlaceholder')}</span>
              <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>
              <input className="glossary-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('searchPlaceholder')} />
            </label>
            <div className="glossary-filters" aria-label={t('filterLabel')}>
              {categoryKeys.map((key) => <button key={key} type="button" className={`glossary-chip${selected.includes(key) ? ' is-active' : ''}`} aria-pressed={selected.includes(key)} onClick={() => toggleCategory(key)}>{categories[key]}</button>)}
            </div>
          </div>
          {filtered.length === 0 ? <p className="glossary-empty">{t('noResults')}</p> : (
            <div className="glossary-groups">
              {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([letter, items]) => (
                <section className="glossary-group" key={letter} aria-label={letter}>
                  <h2 className="glossary-letter">{letter}</h2>
                  <motion.div className="glossary-list" layout>
                    <AnimatePresence mode="popLayout">
                      {items.sort((a, b) => a.term.localeCompare(b.term)).map((item) => <motion.article className="glossary-item" key={item.term} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                        <div className="glossary-item-heading"><h3>{item.term}</h3><span className="glossary-badge">{categories[item.category]}</span></div>
                        <p className="glossary-definition">{item.definition}</p>
                        {item.example && <p className="glossary-example">{item.example}</p>}
                      </motion.article>)}
                    </AnimatePresence>
                  </motion.div>
                </section>
              ))}
            </div>
          )}
        </div>
      </section>
    </motion.div>
  );
}
