(function () {
  'use strict';

  var STATE_KEY = 'ma-engine-state';
  var MAX_HISTORY = 20;
  var MAX_CHARS = 1500;
  var CIRCUMFERENCE = 326.73;
  var GREETING = "Tell me what you're building and where you want to take it. For example: what it does, who pays whom, and how you plan to fund growth. I'll ask a question or two, then show which parts of Jack Ma's story apply to you.";

  var log = document.getElementById('log');
  var form = document.getElementById('composer');
  var input = document.getElementById('chat-input');
  var sendBtn = document.getElementById('send-btn');
  var micBtn = document.getElementById('mic-btn');
  var statusEl = document.getElementById('status');
  var resetBtn = document.getElementById('reset-btn');
  var topEl = document.getElementById('top-match');
  var shortlistEl = document.getElementById('shortlist');
  var shortEmpty = document.getElementById('short-empty');
  var gaugeFill = document.getElementById('gauge-fill');
  var gaugeNumber = document.getElementById('gauge-number');
  var detailsEl = document.getElementById('details');
  var tileTitle = document.getElementById('tile-title');
  var nextStepEl = document.getElementById('next-step');
  var countEl = document.getElementById('msg-count');
  var countText = document.getElementById('msg-count-text');
  var chatCard = document.getElementById('chat-card');
  var fullBtn = document.getElementById('full-btn');
  var fullLabel = document.getElementById('full-label');

  var state = { messages: [], matches: [], selected: null };
  var busy = false;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function load() {
    try {
      var raw = sessionStorage.getItem(STATE_KEY);
      if (!raw) return;
      var saved = JSON.parse(raw);
      if (saved && Array.isArray(saved.messages)) {
        state.messages = saved.messages.filter(function (m) {
          return m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string';
        }).slice(-MAX_HISTORY);
      }
      if (saved && Array.isArray(saved.matches)) state.matches = saved.matches.map(cleanMatch).filter(Boolean);
      if (saved && typeof saved.selected === 'string') state.selected = saved.selected;
    } catch (e) { /* storage blocked or corrupt: start fresh */ }
  }

  function save() {
    try { sessionStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) { /* storage blocked */ }
  }

  function setStatus(text, isError) {
    statusEl.textContent = text || '';
    statusEl.classList.toggle('error', Boolean(isError && text));
  }

  // ----- MATCH line parsing -----
  function cleanMatch(m) {
    if (!m || typeof m !== 'object') return null;
    var title = typeof m.title === 'string' ? m.title.trim().slice(0, 120) : '';
    if (!title) return null;
    var id = typeof m.id === 'string' && /^[a-z0-9-]{1,60}$/.test(m.id) ? m.id : '';
    var score = Math.round(Number(m.score));
    if (!isFinite(score)) score = 0;
    score = Math.max(0, Math.min(100, score));
    var details = {};
    if (m.details && typeof m.details === 'object' && !Array.isArray(m.details)) {
      Object.keys(m.details).slice(0, 8).forEach(function (k) {
        var v = m.details[k];
        if (v === null || v === undefined || typeof v === 'object') return;
        details[String(k).slice(0, 40)] = String(v).slice(0, 240);
      });
    }
    return { id: id, title: title, score: score, why: typeof m.why === 'string' ? m.why.slice(0, 300) : '', details: details };
  }

  function splitReply(text) {
    var visible = [];
    var found = [];
    String(text || '').split(/\r?\n/).forEach(function (line) {
      if (/^\s*MATCH\s*:/i.test(line)) {
        var json = line.replace(/^\s*MATCH\s*:\s*/i, '');
        try {
          var parsed = cleanMatch(JSON.parse(json));
          if (parsed) found.push(parsed);
        } catch (e) { /* malformed MATCH line: drop it silently */ }
        return;
      }
      visible.push(line);
    });
    var clean = visible.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    var byKey = {};
    found.forEach(function (m) {
      var key = m.id || m.title;
      if (!byKey[key] || byKey[key].score < m.score) byKey[key] = m;
    });
    var matches = Object.keys(byKey).map(function (k) { return byKey[k]; }).sort(function (a, b) { return b.score - a.score; });
    return { text: clean, matches: matches };
  }

  // ----- rendering -----
  function addBubble(role, text) {
    var bubble = el('div', 'msg ' + (role === 'user' ? 'msg-user' : 'msg-bot'), text);
    log.appendChild(bubble);
    log.scrollTop = log.scrollHeight;
    return bubble;
  }

  function renderCount() {
    var n = state.messages.length;
    countText.textContent = n === 0 ? 'No messages yet' : n === 1 ? '1 message' : n + ' messages';
    countEl.classList.toggle('active', n > 0);
  }

  function renderLog() {
    log.textContent = '';
    addBubble('assistant', GREETING);
    state.messages.forEach(function (m) { addBubble(m.role, m.content); });
    renderCount();
  }

  function keyOf(m) { return m.id || m.title; }

  function selectedMatch() {
    for (var i = 0; i < state.matches.length; i++) if (keyOf(state.matches[i]) === state.selected) return state.matches[i];
    return state.matches[0] || null;
  }

  function renderTop() {
    topEl.textContent = '';
    var top = state.matches[0];
    topEl.classList.toggle('has-match', Boolean(top));
    if (!top) {
      tileTitle.textContent = 'Waiting for your first question';
      topEl.appendChild(el('p', 'empty', 'Your closest lesson from Ma\'s story appears here once the engine has enough detail.'));
      return;
    }
    tileTitle.textContent = top.title;
    topEl.appendChild(el('p', 'score-pill', top.score + ' / 100 fit'));
    if (top.why) topEl.appendChild(el('p', 'top-why', top.why));
  }

  function renderShortlist() {
    shortlistEl.textContent = '';
    var top = state.matches[0];
    var score = top ? top.score : 0;
    gaugeFill.setAttribute('stroke-dasharray', (CIRCUMFERENCE * score / 100).toFixed(2) + ' ' + CIRCUMFERENCE);
    gaugeFill.setAttribute('visibility', score > 0 ? 'visible' : 'hidden');
    gaugeNumber.textContent = top ? String(score) : '\u2014';
    shortEmpty.hidden = state.matches.length > 0;
    var current = selectedMatch();
    state.matches.forEach(function (m) {
      var li = el('li');
      var btn = el('button', 'short-btn');
      btn.type = 'button';
      btn.setAttribute('aria-pressed', current && keyOf(current) === keyOf(m) ? 'true' : 'false');
      btn.setAttribute('aria-label', m.title + ', fit ' + m.score + ' out of 100. Show details');
      btn.appendChild(el('span', null, m.title));
      btn.appendChild(el('span', null, String(m.score)));
      btn.addEventListener('click', function () {
        state.selected = keyOf(m);
        save();
        renderShortlist();
        renderDetails();
      });
      li.appendChild(btn);
      shortlistEl.appendChild(li);
    });
  }

  function renderDetails() {
    detailsEl.textContent = '';
    var m = selectedMatch();
    if (!m) {
      detailsEl.appendChild(el('h3', 'detail-title', 'Nothing selected yet'));
      detailsEl.appendChild(el('p', 'empty', 'Ask the engine about your plan. The details of whichever match you pick land here.'));
      nextStepEl.textContent = 'Tell the engine what you\'re building.';
      return;
    }
    detailsEl.appendChild(el('h3', 'detail-title', m.title));
    var dl = el('dl', 'detail-list');
    var rows = [['Fit', m.score + ' / 100']];
    if (m.why) rows.push(['Why it applies', m.why]);
    var move = '';
    Object.keys(m.details).forEach(function (k) {
      if (/your move|next step/i.test(k)) { move = m.details[k]; return; }
      rows.push([k, m.details[k]]);
    });
    rows.forEach(function (r) {
      var div = el('div');
      div.appendChild(el('dt', null, r[0]));
      div.appendChild(el('dd', null, r[1]));
      dl.appendChild(div);
    });
    detailsEl.appendChild(dl);
    if (m.id) {
      var a = el('a', 'detail-link', 'Read this lesson in the guide');
      a.href = '/guide#' + m.id;
      detailsEl.appendChild(a);
    }
    nextStepEl.textContent = move || 'Answer the engine\'s next question to sharpen this match.';
  }

  function renderSide() { renderTop(); renderShortlist(); renderDetails(); }

  // ----- sending -----
  function setBusy(on) {
    busy = on;
    sendBtn.disabled = on;
    sendBtn.textContent = on ? 'Sending' : 'Send';
  }

  function send(text) {
    if (busy) return;
    var content = text.trim().slice(0, MAX_CHARS);
    if (!content) { setStatus('Type a message first, or use the mic.', true); return; }
    setStatus('');
    state.messages.push({ role: 'user', content: content });
    state.messages = state.messages.slice(-MAX_HISTORY);
    while (state.messages.length && state.messages[0].role !== 'user') state.messages.shift();
    save();
    addBubble('user', content);
    renderCount();
    input.value = '';
    fitInput();
    setBusy(true);
    var waiting = addBubble('assistant', 'Thinking about your plan');
    waiting.classList.add('msg-wait');

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: state.messages })
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) { return { ok: res.ok, data: data }; });
      })
      .then(function (result) {
        waiting.remove();
        if (!result.ok || typeof result.data.reply !== 'string') {
          var msg = typeof result.data.error === 'string' ? result.data.error.slice(0, 200) : 'The engine could not answer right now. Try again in a moment.';
          state.messages.pop();
          save();
          renderCount();
          var last = log.lastElementChild;
          if (last && last.classList.contains('msg-user')) last.remove();
          input.value = content;
        fitInput();
          setStatus(msg, true);
          return;
        }
        var parts = splitReply(result.data.reply);
        var visible = parts.text || 'Here is how your plan lines up with Ma\'s story.';
        state.messages.push({ role: 'assistant', content: visible });
        if (parts.matches.length) {
          state.matches = parts.matches.slice(0, 6);
          state.selected = keyOf(state.matches[0]);
        }
        save();
        addBubble('assistant', visible);
        renderCount();
        renderSide();
      })
      .catch(function () {
        waiting.remove();
        state.messages.pop();
        save();
        renderCount();
        var last = log.lastElementChild;
        if (last && last.classList.contains('msg-user')) last.remove();
        input.value = content;
        fitInput();
        setStatus('Could not reach the engine. Check your connection and try again.', true);
      })
      .then(function () { setBusy(false); });
  }

  function fitInput() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight + 2, 144) + 'px';
  }
  input.addEventListener('input', fitInput);

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    send(input.value);
  });

  input.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      send(input.value);
    }
  });

  resetBtn.addEventListener('click', function () {
    state = { messages: [], matches: [], selected: null };
    try { sessionStorage.removeItem(STATE_KEY); } catch (e) { /* ignore */ }
    setStatus('');
    renderLog();
    renderSide();
    input.focus();
  });

  // ----- full page chat -----
  function setFull(on) {
    var board = chatCard.parentNode;
    if (on) board.style.setProperty('--chat-h', chatCard.offsetHeight + 'px');
    board.classList.toggle('chat-full', on);
    chatCard.classList.toggle('is-full', on);
    fullBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    fullBtn.setAttribute('aria-label', on ? 'Exit full page chat' : 'Open the chat full page');
    fullLabel.textContent = on ? 'Exit full page' : 'Full page';
    log.scrollTop = log.scrollHeight;
    if (on) input.focus(); else fullBtn.focus();
  }
  fullBtn.addEventListener('click', function () { setFull(!chatCard.classList.contains('is-full')); });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && chatCard.classList.contains('is-full')) setFull(false);
  });

  // ----- voice input -----
  var Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (Recognition && micBtn) {
    micBtn.hidden = false;
    var recognizer = null;
    var listening = false;
    var baseText = '';

    var stopUi = function () {
      listening = false;
      micBtn.setAttribute('aria-pressed', 'false');
      micBtn.setAttribute('aria-label', 'Start voice input');
    };

    micBtn.addEventListener('click', function () {
      if (listening && recognizer) { recognizer.stop(); return; }
      try {
        recognizer = new Recognition();
      } catch (e) {
        setStatus('Voice input is not available in this browser.', true);
        return;
      }
      recognizer.lang = document.documentElement.lang || 'en-US';
      recognizer.interimResults = true;
      recognizer.continuous = false;
      baseText = input.value ? input.value.replace(/\s+$/, '') + ' ' : '';

      recognizer.onresult = function (event) {
        var transcript = '';
        for (var i = 0; i < event.results.length; i++) transcript += event.results[i][0].transcript;
        input.value = (baseText + transcript).slice(0, MAX_CHARS);
        fitInput();
      };
      recognizer.onerror = function (event) {
        var code = event && event.error;
        if (code === 'not-allowed' || code === 'service-not-allowed') {
          setStatus('The microphone is blocked. Allow mic access for this site in your browser settings, then try again.', true);
        } else if (code === 'audio-capture') {
          setStatus('No microphone was found. Connect one or type your message instead.', true);
        } else if (code === 'no-speech') {
          setStatus('No speech was heard. Tap the mic and try again.', true);
        } else if (code === 'network') {
          setStatus('Voice input needs a connection to your browser\'s speech service. Type your message instead.', true);
        } else if (code !== 'aborted') {
          setStatus('Voice input stopped unexpectedly. Type your message instead.', true);
        }
        stopUi();
      };
      recognizer.onend = function () { stopUi(); input.focus(); };

      try {
        recognizer.start();
        listening = true;
        setStatus('');
        micBtn.setAttribute('aria-pressed', 'true');
        micBtn.setAttribute('aria-label', 'Stop voice input');
      } catch (e) {
        setStatus('Voice input could not start. Type your message instead.', true);
        stopUi();
      }
    });
  }

  load();
  renderLog();
  renderSide();
  fitInput();
})();
