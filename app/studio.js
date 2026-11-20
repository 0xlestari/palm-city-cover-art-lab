'use strict';
/* PALM CITY — Cover Art Lab: studio UI.
   Talks to the canvas poster engine (built in parallel as poster.js)
   through a defensive global lookup — never hard-codes one engine name.
   100% offline: every asset is a file under app/. */

var PHOTOS = [
  { id: 'p1', src: 'assets/corvette-sunset.jpg',   label: 'OCEAN DRIVE',    role: 'THE DRIVER' },
  { id: 'p2', src: 'assets/woman-convertible.jpg', label: 'PALM BOULEVARD', role: 'THE INSIDER' },
  { id: 'p3', src: 'assets/bike-neon.jpg',         label: 'NEON STRIP',     role: 'THE RIDER' },
  { id: 'p4', src: 'assets/yacht-aerial.jpg',      label: 'MARINA BAY',     role: 'THE GETAWAY' },
  { id: 'p5', src: 'assets/gas-station.jpg',       label: 'HIGHWAY 95',     role: 'THE COURIER' },
  { id: 'p6', src: 'assets/man-neon.jpg',          label: 'DOWNTOWN',       role: '' }
];

var FALLBACK_COVERS = [
  { id: 'palm-city',   ratio: '16:9', width: 1920, height: 1080, title: 'PALM CITY',   subtitle: 'Midnight Heat', grade: 'sunset' },
  { id: 'coastal-run', ratio: '4:5',  width: 1080, height: 1350, title: 'COASTAL RUN', subtitle: 'Outlaw Summer', grade: 'neon' },
  { id: 'tropic-noir', ratio: '1:1',  width: 1080, height: 1080, title: 'TROPIC NOIR', subtitle: 'High Stakes',   grade: 'gold' }
];

var state = {
  coverId: 'palm-city',
  layout: 'diagonal',
  grade: 'sunset',
  painterly: 35,
  posterInk: 65,
  title: 'PALM CITY',
  subtitle: 'Midnight Heat',
  caption: '',
  halftone: false,
  speedLines: false,
  zoom: 100,
  panX: 0,
  panY: 0,
  selectedPhoto: 0
};

var canvas = document.getElementById('cover-canvas');
var ctx = canvas.getContext('2d');
var tray = document.getElementById('tray');
var loadStatus = document.getElementById('load-status');
var canvasLoading = document.getElementById('canvas-loading');
var exportStatus = document.getElementById('export-status');

var readyResolve;
var readyPromise = new Promise(function (resolve) { readyResolve = resolve; });
window.studioReady = readyPromise;
window.__studioReady = false;

/* ---------- poster-engine lookup (defensive) ---------- */
function isEngineLike(obj) {
  if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) return false;
  var keys = Object.keys(obj);
  var hasRender = keys.some(function (k) { return /render|draw/i.test(k) && typeof obj[k] === 'function'; });
  var hasExport = keys.some(function (k) { return /export|download|png|blob/i.test(k) && typeof obj[k] === 'function'; });
  var hasReady = keys.some(function (k) { return /photo|ready|loaded/i.test(k); });
  return (hasRender && hasExport) || (hasRender && hasReady) || (hasRender && hasExport && hasReady);
}

function findPosterEngine() {
  var candidates = ['PalmCityPoster', 'PosterEngine', 'CoverEngine', 'posterEngine',
    'PalmCity', 'CoverArtEngine', 'Poster', 'CoverPoster', 'palmCityPoster'];
  for (var i = 0; i < candidates.length; i++) {
    if (window[candidates[i]] && isEngineLike(window[candidates[i]])) {
      return { name: candidates[i], engine: window[candidates[i]] };
    }
  }
  var keys = Object.keys(window);
  for (var j = 0; j < keys.length; j++) {
    var v = null;
    try { v = window[keys[j]]; } catch (e) { continue; }
    if (isEngineLike(v)) return { name: keys[j], engine: v };
  }
  return null;
}

function pickFn(engine, re) {
  var keys = Object.keys(engine);
  for (var i = 0; i < keys.length; i++) {
    if (re.test(keys[i]) && typeof engine[keys[i]] === 'function') return engine[keys[i]].bind(engine);
  }
  return null;
}

function engineCovers(engine) {
  var list = engine.covers || engine.COVERS || engine.configs || engine.coverConfigs || null;
  if (Array.isArray(list) && list.length) return list;
  return FALLBACK_COVERS;
}

function coverById(id) {
  var list = engineCovers(currentEngine ? currentEngine.engine : null);
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id || list[i].name === id) return list[i];
  }
  for (var j = 0; j < FALLBACK_COVERS.length; j++) {
    if (FALLBACK_COVERS[j].id === id) return FALLBACK_COVERS[j];
  }
  return FALLBACK_COVERS[0];
}

var currentEngine = null;
var renderFn = null;
var exportFn = null;

function bindEngine() {
  currentEngine = findPosterEngine();
  if (!currentEngine) return false;
  var eng = currentEngine.engine;
  renderFn = pickFn(eng, /^(render|draw)/i) || pickFn(eng, /render|draw/i);
  exportFn = pickFn(eng, /export/i) || pickFn(eng, /download|png|blob/i);
  return true;
}

function renderOptions() {
  return {
    id: state.coverId, coverId: state.coverId, cover: state.coverId,
    layout: state.layout, grade: state.grade,
    painterly: state.painterly, posterInk: state.posterInk,
    illustrationBoost: state.painterly, ink: state.posterInk,
    title: state.title, subtitle: state.subtitle, caption: state.caption,
    halftone: state.halftone, speedLines: state.speedLines,
    photos: PHOTOS.map(function (p) { return p.src; }),
    selectedPhoto: state.selectedPhoto
  };
}

function renderCover() {
  var cover = coverById(state.coverId);
  var w = cover.width || 1920, h = cover.height || 1080;
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  var opts = renderOptions();
  if (renderFn) {
    var attempts = [
      [state.coverId, canvas, opts],
      [canvas, state.coverId, opts],
      [state.coverId, opts],
      [canvas, opts],
      [opts]
    ];
    var lastErr = null;
    for (var i = 0; i < attempts.length; i++) {
      try {
        var r = renderFn.apply(null, attempts[i]);
        if (r && typeof r.catch === 'function') r.catch(function () {});
        return true;
      } catch (e) { lastErr = e; }
    }
    if (lastErr && window.console) console.warn('poster render failed', lastErr);
  }
  /* Engine absent: keep the last frame; never paint a blank canvas. */
  return false;
}

function waitEnginePhotos() {
  if (!currentEngine) return Promise.resolve();
  var eng = currentEngine.engine;
  var p = eng.photosReady || eng.photosLoaded || eng.ready || eng.waitForPhotos || eng.loadPhotos || null;
  try {
    if (p && typeof p.then === 'function') return p;
    if (typeof p === 'function') {
      var r = p.call(eng);
      if (r && typeof r.then === 'function') return r;
    }
    if (typeof eng.waitForPhotos === 'function') {
      var r2 = eng.waitForPhotos();
      if (r2 && typeof r2.then === 'function') return r2;
    }
  } catch (e) { /* fall through to our own preload */ }
  return Promise.resolve();
}

/* ---------- photo-load gate (anti-blank-canvas) ---------- */
var preloaded = [];
function preloadPhoto(photo) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    img.onload = function () {
      if (img.naturalWidth > 0) { preloaded.push(img); resolve(img); }
      else reject(new Error('empty image: ' + photo.src));
    };
    img.onerror = function () { reject(new Error('failed to load: ' + photo.src)); };
    img.src = photo.src;
  });
}
function preloadAllPhotos() {
  preloaded = [];
  return Promise.all(PHOTOS.map(function (p) {
    return preloadPhoto(p).catch(function () {
      /* one retry per photo before giving up */
      return preloadPhoto(p);
    });
  }));
}
function allImgsComplete() {
  var imgs = tray.querySelectorAll('img');
  if (imgs.length !== PHOTOS.length) return false;
  for (var i = 0; i < imgs.length; i++) {
    if (!imgs[i].complete || imgs[i].naturalWidth === 0) return false;
  }
  return true;
}

/* ---------- tray ---------- */
function buildTray() {
  tray.innerHTML = '';
  PHOTOS.forEach(function (photo, idx) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'thumb' + (idx === state.selectedPhoto ? ' is-selected' : '');
    btn.setAttribute('role', 'option');
    btn.setAttribute('aria-selected', idx === state.selectedPhoto ? 'true' : 'false');
    btn.dataset.index = String(idx);
    var img = document.createElement('img');
    img.src = photo.src;
    img.alt = photo.label;
    img.draggable = true;
    var label = document.createElement('span');
    label.className = 'thumb-label';
    var badge = document.createElement('span');
    badge.className = 'thumb-badge';
    badge.textContent = 'P' + (idx + 1);
    var name = document.createElement('span');
    name.className = 'thumb-name';
    name.textContent = photo.label;
    if (photo.role) {
      var role = document.createElement('span');
      role.className = 'thumb-role';
      role.textContent = photo.role;
      name.appendChild(document.createElement('br'));
      name.appendChild(role);
    }
    label.appendChild(badge);
    label.appendChild(name);
    btn.appendChild(img);
    btn.appendChild(label);
    btn.addEventListener('click', function () { selectPhoto(idx); });
    btn.addEventListener('dragstart', function (ev) {
      ev.dataTransfer.setData('text/plain', String(idx));
    });
    tray.appendChild(btn);
  });
}

function selectPhoto(idx) {
  state.selectedPhoto = idx;
  var loc = document.getElementById('location-select');
  if (loc) loc.value = String(idx);
  tray.querySelectorAll('.thumb').forEach(function (el, i) {
    el.classList.toggle('is-selected', i === idx);
    el.setAttribute('aria-selected', i === idx ? 'true' : 'false');
  });
  updateStagePill();
  renderCover();
}

function updateStagePill() {
  var pill = document.getElementById('stage-pill-label');
  if (pill) pill.textContent = PHOTOS[state.selectedPhoto].label + ' \u00B7 ' + state.zoom + '%';
  var pan = document.getElementById('pan-label');
  if (pan) pan.textContent = 'ZOOM ' + state.zoom + '% \u00B7 DRAG TO PAN';
}

/* ---------- option groups ---------- */
function wireGroup(containerId, attr, onPick) {
  var box = document.getElementById(containerId);
  if (!box) return;
  box.querySelectorAll('button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      box.querySelectorAll('button').forEach(function (b) {
        b.classList.remove('is-active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('is-active');
      btn.setAttribute('aria-checked', 'true');
      onPick(btn.dataset[attr]);
    });
  });
}

function setActiveIn(containerId, attr, value) {
  var box = document.getElementById(containerId);
  if (!box) return;
  box.querySelectorAll('button').forEach(function (b) {
    var on = b.dataset[attr] === value;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-checked', on ? 'true' : 'false');
  });
}

function applyCover(id) {
  var cover = coverById(id);
  state.coverId = cover.id || id;
  state.title = cover.title || state.title;
  state.subtitle = cover.subtitle || state.subtitle;
  if (cover.grade) { state.grade = cover.grade; setActiveIn('grade-list', 'grade', cover.grade); }
  var titleInput = document.getElementById('title-input');
  var subInput = document.getElementById('subtitle-input');
  if (titleInput) titleInput.value = state.title;
  if (subInput) subInput.value = state.subtitle;
  setActiveIn('cover-picker', 'cover', state.coverId);
  setActiveIn('aspect-list', 'cover', state.coverId);
  renderCover();
}

/* ---------- export ---------- */
function downloadBlob(blob, filename) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
}

function exportFileName(coverId) {
  var cover = coverById(coverId);
  var slug = (cover.title || coverId).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return slug + '-' + (cover.ratio || '').replace(':', 'x') + '.png';
}

function exportCover(coverId) {
  var id = coverId || state.coverId;
  var opts = renderOptions();
  opts.coverId = id; opts.id = id;
  if (exportFn) {
    var attempts = [[id, opts], [id, canvas, opts], [canvas, id, opts], [opts], [id]];
    for (var i = 0; i < attempts.length; i++) {
      try {
        var r = exportFn.apply(null, attempts[i]);
        if (typeof r === 'string' && r.indexOf('data:image') === 0) {
          var bin = atob(r.split(',')[1]);
          var bytes = new Uint8Array(bin.length);
          for (var b = 0; b < bin.length; b++) bytes[b] = bin.charCodeAt(b);
          downloadBlob(new Blob([bytes], { type: 'image/png' }), exportFileName(id));
          return Promise.resolve(true);
        }
        if (r && typeof r.then === 'function') {
          return r.then(function (v) {
            if (typeof v === 'string' && v.indexOf('data:image') === 0) {
              var bin2 = atob(v.split(',')[1]);
              var by2 = new Uint8Array(bin2.length);
              for (var c = 0; c < bin2.length; c++) by2[c] = bin2.charCodeAt(c);
              downloadBlob(new Blob([by2], { type: 'image/png' }), exportFileName(id));
            } else if (v instanceof Blob) {
              downloadBlob(v, exportFileName(id));
            } else {
              exportCanvasFallback(id);
            }
            return true;
          }).catch(function () { exportCanvasFallback(id); return true; });
        }
        if (r instanceof Blob) { downloadBlob(r, exportFileName(id)); return Promise.resolve(true); }
        /* engine handled the download itself */
        return Promise.resolve(true);
      } catch (e) { /* try next signature */ }
    }
  }
  exportCanvasFallback(id);
  return Promise.resolve(true);
}

function exportCanvasFallback(coverId) {
  var keep = state.coverId;
  if (coverId && coverId !== keep) { state.coverId = coverId; renderCover(); }
  var done = function () {
    canvas.toBlob(function (blob) {
      if (blob) downloadBlob(blob, exportFileName(coverId || keep));
      state.coverId = keep;
      if (coverId && coverId !== keep) renderCover();
    }, 'image/png');
  };
  if (coverId && coverId !== keep) { setTimeout(done, 60); } else { done(); }
}

/* ---------- wiring ---------- */
function debounce(fn, ms) {
  var t = null;
  return function () {
    var args = arguments;
    clearTimeout(t);
    t = setTimeout(function () { fn.apply(null, args); }, ms);
  };
}
var renderSoon = debounce(renderCover, 120);

function wireControls() {
  wireGroup('cover-picker', 'cover', applyCover);
  wireGroup('aspect-list', 'cover', applyCover);
  wireGroup('layout-list', 'layout', function (v) { state.layout = v; renderCover(); });
  wireGroup('grade-list', 'grade', function (v) { state.grade = v; renderCover(); });

  var titleInput = document.getElementById('title-input');
  var subInput = document.getElementById('subtitle-input');
  var capInput = document.getElementById('caption-input');
  var capQuick = document.getElementById('caption-quick');
  if (titleInput) titleInput.addEventListener('input', function () { state.title = titleInput.value; renderSoon(); });
  if (subInput) subInput.addEventListener('input', function () { state.subtitle = subInput.value; renderSoon(); });
  function syncCaption(v) {
    state.caption = v;
    if (capInput && capInput.value !== v) capInput.value = v;
    if (capQuick && capQuick.value !== v) capQuick.value = v;
    renderSoon();
  }
  if (capInput) capInput.addEventListener('input', function () { syncCaption(capInput.value); });
  if (capQuick) capQuick.addEventListener('input', function () { syncCaption(capQuick.value); });

  var painterly = document.getElementById('painterly-range');
  var ink = document.getElementById('ink-range');
  if (painterly) painterly.addEventListener('input', function () {
    state.painterly = Number(painterly.value);
    document.getElementById('painterly-value').textContent = painterly.value + '%';
    renderSoon();
  });
  if (ink) ink.addEventListener('input', function () {
    state.posterInk = Number(ink.value);
    document.getElementById('ink-value').textContent = ink.value + '%';
    renderSoon();
  });

  var halftone = document.getElementById('chk-halftone');
  var speed = document.getElementById('chk-speedlines');
  if (halftone) halftone.addEventListener('change', function () { state.halftone = halftone.checked; renderCover(); });
  if (speed) speed.addEventListener('change', function () { state.speedLines = speed.checked; renderCover(); });

  var zoom = document.getElementById('zoom-range');
  if (zoom) zoom.addEventListener('input', function () {
    state.zoom = Number(zoom.value);
    document.getElementById('zoom-value').textContent = zoom.value + '%';
    applyZoomPan();
    updateStagePill();
  });

  var loc = document.getElementById('location-select');
  if (loc) loc.addEventListener('change', function () { selectPhoto(Number(loc.value)); });

  var reset = document.getElementById('btn-reset-crop');
  if (reset) reset.addEventListener('click', function () {
    state.zoom = 100; state.panX = 0; state.panY = 0;
    if (zoom) zoom.value = '100';
    document.getElementById('zoom-value').textContent = '100%';
    applyZoomPan();
    updateStagePill();
    renderCover();
  });

  var uploadBtn = document.getElementById('btn-upload');
  var fileInput = document.getElementById('file-input');
  if (uploadBtn && fileInput) {
    uploadBtn.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      var files = Array.prototype.slice.call(fileInput.files || []);
      files.forEach(function (file, k) {
        var idx = (state.selectedPhoto + k) % PHOTOS.length;
        var url = URL.createObjectURL(file);
        PHOTOS[idx].src = url;
        PHOTOS[idx].label = file.name.replace(/\.[^.]+$/, '').toUpperCase().slice(0, 18) || PHOTOS[idx].label;
      });
      buildTray();
      preloadAllPhotos().then(function () { renderCover(); });
      fileInput.value = '';
    });
  }

  var shuffle = document.getElementById('btn-shuffle');
  if (shuffle) shuffle.addEventListener('click', function () {
    for (var i = PHOTOS.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = PHOTOS[i]; PHOTOS[i] = PHOTOS[j]; PHOTOS[j] = tmp;
    }
    buildTray();
    renderCover();
  });

  /* drag-to-pan on the stage */
  var wrap = document.getElementById('canvas-wrap');
  var dragging = false, startX = 0, startY = 0, baseX = 0, baseY = 0;
  if (wrap) {
    wrap.addEventListener('pointerdown', function (ev) {
      dragging = true; startX = ev.clientX; startY = ev.clientY;
      baseX = state.panX; baseY = state.panY;
      wrap.setPointerCapture(ev.pointerId);
    });
    wrap.addEventListener('pointermove', function (ev) {
      if (!dragging) return;
      state.panX = baseX + (ev.clientX - startX);
      state.panY = baseY + (ev.clientY - startY);
      applyZoomPan();
    });
    var endDrag = function () { dragging = false; };
    wrap.addEventListener('pointerup', endDrag);
    wrap.addEventListener('pointercancel', endDrag);
  }

  function doExport() {
    exportStatus.textContent = 'Exporting ' + state.coverId + '\u2026';
    exportCover(state.coverId).then(function () {
      exportStatus.textContent = 'Exported ' + exportFileName(state.coverId);
      exportStatus.classList.add('is-ok');
    });
  }
  var expTop = document.getElementById('btn-export-top');
  var expSide = document.getElementById('btn-export-side');
  if (expTop) expTop.addEventListener('click', doExport);
  if (expSide) expSide.addEventListener('click', doExport);

  var expAll = document.getElementById('btn-export-all');
  if (expAll) expAll.addEventListener('click', function () {
    var covers = engineCovers(currentEngine ? currentEngine.engine : null);
    var chain = Promise.resolve();
    covers.forEach(function (c) {
      chain = chain.then(function () {
        return exportCover(c.id).then(function () {
          return new Promise(function (res) { setTimeout(res, 150); });
        });
      });
    });
    chain.then(function () {
      exportStatus.textContent = 'Exported all ' + covers.length + ' covers.';
      exportStatus.classList.add('is-ok');
    });
  });
}

function applyZoomPan() {
  var scale = state.zoom / 100;
  canvas.style.transform = 'translate(' + state.panX + 'px,' + state.panY + 'px) scale(' + scale + ')';
}

/* ---------- boot: photo-load gate ---------- */
function markReady() {
  window.__studioReady = true;
  document.getElementById('app').dataset.ready = 'true';
  document.body.dataset.ready = 'true';
  canvasLoading.classList.add('is-hidden');
  loadStatus.textContent = '6 photos loaded \u00B7 ready';
  loadStatus.classList.add('is-ready');
  document.dispatchEvent(new CustomEvent('studio-ready', { detail: { cover: state.coverId } }));
  readyResolve(true);
}

function boot() {
  buildTray();
  wireControls();
  updateStagePill();
  applyZoomPan();
  loadStatus.textContent = 'Loading photos\u2026';

  var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready.catch(function () {}) : Promise.resolve();

  Promise.all([preloadAllPhotos(), fontsReady])
    .then(function () { return waitEnginePhotos(); })
    .then(function () {
      bindEngine();
      /* wait one frame so every tray <img> reports complete */
      return new Promise(function (res) { requestAnimationFrame(function () { res(); }); });
    })
    .then(function () {
      if (!allImgsComplete()) {
        /* final safety net: wait for the tray images themselves */
        return new Promise(function (res) {
          var imgs = tray.querySelectorAll('img');
          var pending = 0;
          imgs.forEach(function (img) {
            if (img.complete && img.naturalWidth > 0) return;
            pending++;
            img.addEventListener('load', function h() { img.removeEventListener('load', h); if (--pending === 0) res(); });
            img.addEventListener('error', function h2() { img.removeEventListener('error', h2); if (--pending === 0) res(); });
          });
          if (pending === 0) res();
        });
      }
    })
    .then(function () {
      renderCover();
      markReady();
    })
    .catch(function (err) {
      if (window.console) console.warn('studio boot warning', err);
      loadStatus.textContent = 'Some photos failed to load \u2014 check assets, then reload.';
      renderCover();
      markReady();
    });
}

window.Studio = {
  ready: readyPromise,
  state: state,
  photos: PHOTOS,
  render: renderCover,
  exportPNG: exportCover,
  selectPhoto: selectPhoto,
  applyCover: applyCover,
  engineName: function () { return currentEngine ? currentEngine.name : null; }
};

bindEngine();
boot();
