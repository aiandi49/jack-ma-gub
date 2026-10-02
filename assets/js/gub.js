(function () {
  'use strict';

  var STATUS_LABELS = { verified: 'Verified', corrected: 'Corrected', unverified: 'Unverified', flagged: 'Flagged' };

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function paragraphs(parent, body) {
    String(body || '').split(/\n\n+/).forEach(function (chunk) {
      if (chunk.trim()) parent.appendChild(el('p', null, chunk.trim()));
    });
  }

  function detailList(details) {
    var dl = el('dl', 'details');
    Object.keys(details || {}).forEach(function (key) {
      var row = el('div', 'detail-row');
      row.appendChild(el('dt', null, key));
      row.appendChild(el('dd', null, details[key]));
      dl.appendChild(row);
    });
    return dl;
  }

  function renderLadder(ladder) {
    var list = document.getElementById('ladder');
    if (!list) return;
    (ladder || []).forEach(function (rung, index) {
      var li = el('li', 'rung rung-' + (index + 1));
      li.setAttribute('data-side', rung.weight > 2 ? 'money' : 'info');
      li.appendChild(el('span', 'rung-side', rung.weight > 2 ? 'Handles money' : 'Handles information'));
      li.appendChild(el('h3', 'rung-title', rung.step));
      li.appendChild(el('p', 'rung-built', rung.built));
      var dl = el('dl', 'rung-facts');
      [['Touches', rung.handles], ['Rulebook', rung.oversight]].forEach(function (pair) {
        var row = el('div', 'detail-row');
        row.appendChild(el('dt', null, pair[0]));
        row.appendChild(el('dd', null, pair[1]));
        dl.appendChild(row);
      });
      li.appendChild(dl);
      var meter = el('div', 'meter');
      meter.setAttribute('role', 'img');
      meter.setAttribute('aria-label', 'Regulatory weight ' + rung.weight + ' of 4');
      for (var i = 1; i <= 4; i++) meter.appendChild(el('span', i <= rung.weight ? 'on' : ''));
      li.appendChild(meter);
      list.appendChild(li);
    });
  }

  function renderTimeline(entries) {
    var wrap = document.getElementById('timeline-list');
    if (!wrap) return;
    entries
      .filter(function (e) { return e.kind === 'story'; })
      .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; })
      .forEach(function (entry) {
        var item = el('article', 'moment');
        item.id = entry.id;
        if ((entry.tags || []).indexOf('money-line') !== -1) item.classList.add('money');
        item.appendChild(el('p', 'moment-date', entry.dateLabel));
        var head = el('div', 'moment-head');
        head.appendChild(el('h3', null, entry.title));
        head.appendChild(el('p', 'moment-summary', entry.summary));
        item.appendChild(head);
        var body = el('div', 'moment-body');
        paragraphs(body, entry.body);
        body.appendChild(detailList(entry.details));
        item.appendChild(body);
        wrap.appendChild(item);
      });
  }

  function renderLessons(entries) {
    var wrap = document.getElementById('lesson-list');
    if (!wrap) return;
    entries
      .filter(function (e) { return e.kind === 'lesson'; })
      .forEach(function (entry) {
        var card = el('article', 'lesson');
        card.id = entry.id;
        card.appendChild(el('h3', null, entry.title));
        card.appendChild(el('p', 'lesson-summary', entry.summary));
        var body = el('div', 'lesson-body');
        paragraphs(body, entry.body);
        card.appendChild(body);
        card.appendChild(detailList(entry.details));
        wrap.appendChild(card);
      });
  }

  function renderClaims(claims) {
    var body = document.getElementById('claims-body');
    if (!body) return;
    (claims || []).forEach(function (c) {
      var tr = el('tr');
      var cells = [
        ['Claim', c.claim],
        ['Where it came from', c.source],
        ['Status', null],
        ['What the record shows', c.note]
      ];
      cells.forEach(function (pair) {
        var td = el('td');
        td.setAttribute('data-label', pair[0]);
        if (pair[0] === 'Status') {
          var key = STATUS_LABELS[c.status] ? c.status : 'unverified';
          td.appendChild(el('span', 'status status-' + key, STATUS_LABELS[key]));
        } else {
          td.textContent = pair[1];
        }
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
  }

  function renderSources(sources) {
    var list = document.getElementById('source-list');
    if (!list) return;
    (sources || []).forEach(function (s) {
      if (!/^https:\/\//.test(s.url)) return;
      var li = el('li');
      var a = el('a', null, s.title);
      a.href = s.url;
      a.rel = 'noopener noreferrer';
      li.appendChild(a);
      list.appendChild(li);
    });
  }

  function showError() {
    var wrap = document.getElementById('timeline-list');
    if (wrap) wrap.appendChild(el('p', 'load-error', 'The guide content did not load. Refresh the page to try again.'));
  }

  fetch('/data/gub.json', { headers: { Accept: 'application/json' } })
    .then(function (res) { if (!res.ok) throw new Error('status ' + res.status); return res.json(); })
    .then(function (data) {
      var entries = Array.isArray(data.entries) ? data.entries : [];
      renderLadder(data.meta && data.meta.ladder);
      renderTimeline(entries);
      renderLessons(entries);
      renderClaims(data.claims);
      renderSources(data.sources);
      if (location.hash) {
        var target = document.getElementById(location.hash.slice(1));
        if (target) target.scrollIntoView();
      }
    })
    .catch(showError);
})();
