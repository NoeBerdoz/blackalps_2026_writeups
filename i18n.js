/* Reviewed, local translations. No external service or runtime download. */
(() => {
  'use strict';
  const dictionary = window.DECK_EN || {};
  const textState = new WeakMap();
  const attrState = new WeakMap();
  const linkState = new WeakMap();
  const storageKey = 'black-alps-language';
  let language = 'fr';
  let started = false;
  function translate(value) {
    if (language === 'fr') return value;
    const trimmed = value.trim();
    let translated = dictionary[trimmed];
    if (translated === undefined) {
      if (/^SLIDE \d+\s*\/\s*\d+ ·/.test(trimmed)) {
        translated = trimmed.replace(/secondes/g, 'seconds').replace(/ÉTAPE/g, 'STEP');
      } else if (trimmed.startsWith('Ensuite : ')) {
        translated = 'Next: ' + translate(trimmed.slice(10));
      } else return value;
    }
    return value.slice(0, value.indexOf(trimmed)) + translated + value.slice(value.indexOf(trimmed) + trimmed.length);
  }
  function localize(root) {
    const doc = root.ownerDocument || root;
    const walker = doc.createTreeWalker(root, 4);
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement?.closest('script,style,noscript,[data-no-translate]')) continue;
      let state = textState.get(node);
      if (!state || node.nodeValue !== state.last) state = { french: node.nodeValue };
      state.last = translate(state.french);
      if (node.nodeValue !== state.last) node.nodeValue = state.last;
      textState.set(node, state);
    }
    for (const el of root.querySelectorAll('[title],[alt],[aria-label],meta[name="description"]')) {
      let states = attrState.get(el);
      if (!states) { states = {}; attrState.set(el, states); }
      for (const key of ['title', 'alt', 'aria-label', ...(el.tagName === 'META' ? ['content'] : [])]) {
        if (!el.hasAttribute(key)) continue;
        const value = el.getAttribute(key);
        let state = states[key];
        if (!state || value !== state.last) state = { french: value };
        state.last = translate(state.french);
        el.setAttribute(key, state.last);
        states[key] = state;
      }
    }
    for (const button of root.querySelectorAll('[data-language]')) {
      button.setAttribute('aria-pressed', String(button.dataset.language === language));
    }
  }
  function links(root) {
    for (const link of root.querySelectorAll('a[href]')) {
      const raw = link.getAttribute('href');
      if (!raw || raw.startsWith('#') || /^(https?:|mailto:|data:)/.test(raw)) continue;
      let state = linkState.get(link);
      if (!state || raw !== state.last) state = { french: raw };
      let next = state.french;
      if (/\.pdf(?:$|[?#])/.test(next)) {
        if (language === 'en') next = next.replace(/\.pdf(?=$|[?#])/, '.en.pdf');
      } else if (/\.html(?:$|[?#])/.test(next)) {
        const url = new URL(next, document.baseURI);
        url.searchParams.set('lang', language);
        next = next.split(/[?#]/)[0] + url.search + url.hash;
      }
      link.setAttribute('href', next);
      state.last = next;
      linkState.set(link, state);
    }
  }
  function refresh(root = document) {
    localize(root);
    if (root === document) links(root);
    const doc = root.ownerDocument || root;
    doc.documentElement.lang = language;
  }
  function setLanguage(next, remember = true) {
    if (!['fr', 'en'].includes(next)) return;
    language = next;
    document.documentElement.lang = language;
    if (remember) {
      try { localStorage.setItem(storageKey, language); } catch {}
      try {
        const url = new URL(location.href);
        url.searchParams.set('lang', language);
        history.replaceState(null, '', url);
      } catch {}
    }
    refresh();
    window.deck?.refreshLanguage?.();
    document.dispatchEvent(new CustomEvent('decklanguagechange', { detail: language }));
  }
  function init() {
    if (started) return;
    started = true;
    const requested = new URLSearchParams(location.search).get('lang');
    let saved;
    try { saved = localStorage.getItem(storageKey); } catch {}
    setLanguage(['fr','en'].includes(requested) ? requested : saved === 'en' ? 'en' : 'fr', false);
    document.addEventListener('click', event => {
      const button = event.target.closest('[data-language]');
      if (button) setLanguage(button.dataset.language);
    });
  }
  window.deckLanguage = { init, refresh, setLanguage, translate, get current() { return language; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
