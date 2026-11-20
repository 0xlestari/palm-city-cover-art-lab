/* PALM CITY — Cover Art Lab
 * Canvas cover renderer (entry v11, composed from the design spec +
 * the approved v10 reference screenshots).
 * 100% offline: local Anton / Yellowtail woff2 + local photos only.
 * No network references anywhere in this file.
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Config                                                              */
  /* ------------------------------------------------------------------ */

  var ASSET_BASE = 'assets/';
  var FONT_BASE = 'fonts/';

  var PHOTOS = {
    corvette: { file: 'corvette-sunset.jpg',  location: 'OCEAN DRIVE',    role: 'THE DRIVER',  focus: [0.50, 0.42] },
    woman:    { file: 'woman-convertible.jpg', location: 'PALM BOULEVARD', role: 'THE INSIDER', focus: [0.50, 0.32] },
    bike:     { file: 'bike-neon.jpg',        location: 'NEON STRIP',     role: 'THE RIDER',   focus: [0.55, 0.45] },
    yacht:    { file: 'yacht-aerial.jpg',     location: 'MARINA BAY',     role: 'THE GETAWAY', focus: [0.50, 0.50] },
    gas:      { file: 'gas-station.jpg',      location: 'HIGHWAY 95',     role: 'THE COURIER', focus: [0.50, 0.55] },
    man:      { file: 'man-neon.jpg',         location: 'DOWNTOWN',       role: 'THE LOCAL',   focus: [0.50, 0.35] }
  };

  /* The five poster panels, in order. The 6th photo (man-neon / DOWNTOWN)
   * is the studio tray sample and is not placed on a poster panel. */
  var PANELS = ['corvette', 'woman', 'bike', 'yacht', 'gas'];

  var GRADES = {
    'electric-sunset': {
      id: 'electric-sunset', name: 'Electric Sunset',
      titleStops: [[0, '#ff5da2'], [0.45, '#ff6a4d'], [1, '#ffb03a']],
      subtitle: '#ff6ec7', subtitleGlow: 'rgba(255,110,199,0.85)',
      accent: '#ffc93c', quoteGold: '#f5c542',
      photoFilter: 'saturate(1.18) contrast(1.06) brightness(1.02)',
      wash: ['rgba(255,120,60,0.10)', 'rgba(255,60,140,0.08)']
    },
    'miami-neon': {
      id: 'miami-neon', name: 'Miami Neon',
      titleStops: [[0, '#8ef7ff'], [0.5, '#38d6ff'], [1, '#ff4fd8']],
      subtitle: '#ff5fd0', subtitleGlow: 'rgba(255,95,208,0.85)',
      accent: '#38e1ff', quoteGold: '#f5c542',
      photoFilter: 'saturate(1.28) hue-rotate(-8deg) contrast(1.08)',
      wash: ['rgba(56,225,255,0.10)', 'rgba(255,79,216,0.10)']
    },
    'tropic-gold': {
      id: 'tropic-gold', name: 'Tropic Gold',
      titleStops: [[0, '#fff3a0'], [0.5, '#ffc93c'], [1, '#ff8a00']],
      subtitle: '#ff7ad9', subtitleGlow: 'rgba(255,122,217,0.85)',
      accent: '#ffb03a', quoteGold: '#f5c542',
      photoFilter: 'saturate(1.22) sepia(0.16) contrast(1.05)',
      wash: ['rgba(255,200,60,0.10)', 'rgba(255,140,0,0.08)']
    },
    'midnight-noir': {
      id: 'midnight-noir', name: 'Midnight Noir',
      titleStops: [[0, '#dfe8ff'], [0.5, '#8d9bd8'], [1, '#46538c']],
      subtitle: '#8ef6ff', subtitleGlow: 'rgba(142,246,255,0.85)',
      accent: '#8ef6ff', quoteGold: '#f5c542',
      photoFilter: 'saturate(0.55) brightness(0.92) contrast(1.12)',
      wash: ['rgba(40,60,140,0.16)', 'rgba(10,10,40,0.18)']
    }
  };

  var LAYOUTS = {
    'gta-diagonal':    { id: 'gta-diagonal',    name: 'GTA Diagonal' },
    'box-art-classic': { id: 'box-art-classic', name: 'Box Art Classic' },
    'hero-split':      { id: 'hero-split',      name: 'Hero Split' },
    'widescreen-grid': { id: 'widescreen-grid', name: 'Widescreen Grid' }
  };

  var COVERS = [
    {
      id: 'palm-city', title: 'PALM CITY', subtitle: 'Midnight Heat',
      grade: 'electric-sunset', layout: 'gta-diagonal',
      width: 1920, height: 1080, aspect: '16:9',
      quote: 'PURE GOLDEN-HOUR MAYHEM', source: 'PALM GAZETTE',
      footerFrac: 0.15
    },
    {
      id: 'coastal-run', title: 'COASTAL RUN', subtitle: 'Outlaw Summer',
      grade: 'miami-neon', layout: 'box-art-classic',
      width: 1080, height: 1350, aspect: '4:5',
      quote: 'NEON-SOAKED AND FEARLESS', source: 'COASTAL WEEKLY',
      footerFrac: 0.115
    },
    {
      id: 'tropic-noir', title: 'TROPIC NOIR', subtitle: 'High Stakes',
      grade: 'tropic-gold', layout: 'hero-split',
      width: 1080, height: 1080, aspect: '1:1',
      quote: 'SUN-DRENCHED PERFECTION', source: 'METRO REVIEW',
      footerFrac: 0.13
    }
  ];

  var TAGLINE = 'FIVE STRANGERS \u00B7 ONE COAST \u00B7 NO WAY BACK';
  var CREDITS = 'A PALM CITY PICTURE \u00B7 STARRING YOU \u00B7 SHOT ON YOUR CAMERA';

  /* ------------------------------------------------------------------ */
  /* Loading: fonts + photos                                             */
  /* ------------------------------------------------------------------ */

  var _photos = {};       // key -> HTMLImageElement
  var _photosPromise = null;
  var _fontsPromise = null;

  function loadImage(key) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { _photos[key] = img; resolve(img); };
      img.onerror = function () { reject(new Error('photo failed: ' + PHOTOS[key].file)); };
      img.src = ASSET_BASE + PHOTOS[key].file;
    });
  }

  function loadPhotos() {
    if (!_photosPromise) {
      _photosPromise = Promise.all(Object.keys(PHOTOS).map(loadImage));
    }
    return _photosPromise;
  }

  function ensureFonts() {
    if (!_fontsPromise) {
      _fontsPromise = (async function () {
        var faces = [
          new FontFace('Anton', 'url(' + FONT_BASE + 'anton.woff2) format("woff2")', { weight: '400' }),
          new FontFace('Yellowtail', 'url(' + FONT_BASE + 'yellowtail.woff2) format("woff2")', { weight: '400' })
        ];
        for (var i = 0; i < faces.length; i++) {
          try {
            var loaded = await faces[i].load();
            document.fonts.add(loaded);
          } catch (e) { /* fall through to document.fonts.load below */ }
        }
        try { await document.fonts.load('100px Anton'); } catch (e) {}
        try { await document.fonts.load('100px Yellowtail'); } catch (e) {}
        await document.fonts.ready;
        return {
          anton: document.fonts.check('100px Anton'),
          yellowtail: document.fonts.check('100px Yellowtail')
        };
      })();
    }
    return _fontsPromise;
  }

  /* Resolves when every one of the 6 photos is loaded. The studio UI
   * must await this before screenshotting, or the canvas is blank. */
  var photosReady = loadPhotos().then(function () { return true; });
  var ready = Promise.all([ensureFonts(), loadPhotos()]).then(function () { return true; });

  /* ------------------------------------------------------------------ */
  /* Small canvas helpers                                                */
  /* ------------------------------------------------------------------ */

  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function setLetterSpacing(ctx, px) {
    try { ctx.letterSpacing = px + 'px'; } catch (e) {}
  }

  /* Cover-fit draw with a focal point, so faces are never cropped. */
  function drawCover(ctx, img, x, y, w, h, focus) {
    var iw = img.naturalWidth, ih = img.naturalHeight;
    var scale = Math.max(w / iw, h / ih);
    var dw = iw * scale, dh = ih * scale;
    var fx = focus ? focus[0] : 0.5, fy = focus ? focus[1] : 0.5;
    var dx = x + (w - dw) * fx;
    var dy = y + (h - dh) * fy;
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  /* Simple palm silhouette, drawn in the footer background layer. */
  function drawPalm(ctx, x, y, s, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = 'round';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(6, -55, -4, -105);
    ctx.stroke();
    ctx.lineWidth = 4;
    for (var i = 0; i < 7; i++) {
      var a = -Math.PI * (0.08 + i * 0.14);
      var len = 42 - Math.abs(i - 3) * 5;
      var cx = -4 + Math.cos(a) * len;
      var cy = -105 + Math.sin(a) * len * 0.55 + 14;
      ctx.beginPath();
      ctx.moveTo(-4, -105);
      ctx.quadraticCurveTo(-4 + Math.cos(a) * len * 0.6, -105 + Math.sin(a) * len * 0.3 - 8, cx, cy);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* Deterministic barcode bars (fixed seed pattern, no randomness). */
  var BARCODE = [3, 1, 2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 1, 3, 2, 2, 1, 1];
  function drawBarcode(ctx, x, y, w, h) {
    var unit = w / BARCODE.reduce(function (a, b) { return a + b + 1; }, 0);
    var cx = x;
    ctx.fillStyle = '#f2eef7';
    for (var i = 0; i < BARCODE.length; i++) {
      var bw = BARCODE[i] * unit;
      ctx.fillRect(cx, y, bw, h);
      cx += bw + unit;
    }
  }

  /* Serrated gold stamp: "★ ORIGINAL COVER ART ★". */
  function drawStamp(ctx, cx, cy, r) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    var spikes = 26;
    for (var i = 0; i <= spikes * 2; i++) {
      var ang = (i / (spikes * 2)) * Math.PI * 2;
      var rad = (i % 2 === 0) ? r : r * 0.86;
      var px = Math.cos(ang) * rad, py = Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#f7b731';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#8a5a00';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(138,90,0,0.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#241300';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 ' + Math.round(r * 0.24) + 'px Arial, sans-serif';
    ctx.fillText('\u2605 ORIGINAL', 0, -r * 0.18);
    ctx.fillText('COVER ART \u2605', 0, r * 0.16);
    ctx.restore();
  }

  /* ------------------------------------------------------------------ */
  /* Layouts: 5 panels inside the photo area                             */
  /* ------------------------------------------------------------------ */

  function layoutPanels(layoutId, ax, ay, aw, ah, gap) {
    var p = [];
    if (layoutId === 'gta-diagonal') {
      var heroW = aw * 0.40;
      var rx = ax + heroW + gap, rw = aw - heroW - gap;
      var cw = (rw - gap) / 2, rh = (ah - gap) / 2;
      p = [
        { x: ax, y: ay, w: heroW, h: ah },
        { x: rx, y: ay, w: cw, h: rh },
        { x: rx + cw + gap, y: ay, w: cw, h: rh },
        { x: rx, y: ay + rh + gap, w: cw, h: rh },
        { x: rx + cw + gap, y: ay + rh + gap, w: cw, h: rh }
      ];
    } else if (layoutId === 'box-art-classic') {
      var topH = ah * 0.56, botH = ah - topH - gap;
      var tw = (aw - gap * 2) / 3, bw = (aw - gap) / 2;
      p = [
        { x: ax, y: ay, w: tw, h: topH },
        { x: ax + tw + gap, y: ay, w: tw, h: topH },
        { x: ax + (tw + gap) * 2, y: ay, w: tw, h: topH },
        { x: ax, y: ay + topH + gap, w: bw, h: botH },
        { x: ax + bw + gap, y: ay + topH + gap, w: bw, h: botH }
      ];
    } else if (layoutId === 'hero-split') {
      var hh = ah * 0.52, bh = ah - hh - gap;
      var qw = (aw - gap * 3) / 4;
      p = [
        { x: ax, y: ay, w: aw, h: hh },
        { x: ax, y: ay + hh + gap, w: qw, h: bh },
        { x: ax + (qw + gap), y: ay + hh + gap, w: qw, h: bh },
        { x: ax + (qw + gap) * 2, y: ay + hh + gap, w: qw, h: bh },
        { x: ax + (qw + gap) * 3, y: ay + hh + gap, w: qw, h: bh }
      ];
    } else { /* widescreen-grid */
      var gh = (ah - gap) / 2;
      var gw = (aw - gap * 2) / 3;
      p = [
        { x: ax, y: ay, w: gw * 2 + gap, h: gh },
        { x: ax, y: ay + gh + gap, w: gw, h: gh },
        { x: ax + (gw + gap) * 2, y: ay, w: gw, h: gh },
        { x: ax + gw + gap, y: ay + gh + gap, w: gw, h: gh },
        { x: ax + (gw + gap) * 2, y: ay + gh + gap, w: gw, h: gh }
      ];
    }
    return p;
  }

  /* ------------------------------------------------------------------ */
  /* Grades                                                              */
  /* ------------------------------------------------------------------ */

  function applyGrade(ctx, rect, gradeId) {
    var g = GRADES[gradeId] || GRADES['electric-sunset'];
    var grad = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    grad.addColorStop(0, g.wash[0]);
    grad.addColorStop(1, g.wash[1]);
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = grad;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
    return g;
  }

  function applyPainterly(ctx, rect, amount) {
    if (!amount || amount <= 0) return;
    amount = Math.max(0, Math.min(1, amount));
    var x = Math.max(0, Math.floor(rect.x)), y = Math.max(0, Math.floor(rect.y));
    var w = Math.min(Math.floor(rect.w), ctx.canvas.width - x);
    var h = Math.min(Math.floor(rect.h), ctx.canvas.height - y);
    if (w <= 0 || h <= 0) return;
    var img = ctx.getImageData(x, y, w, h);
    var d = img.data;
    var levels = Math.max(3, Math.round(9 - amount * 5)); /* 9 -> 4 steps */
    var step = 255 / (levels - 1);
    var seed = 1234567;
    function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
    for (var i = 0; i < d.length; i += 4) {
      for (var c = 0; c < 3; c++) {
        var v = d[i + c];
        v = Math.round(v / step) * step;
        var grain = (rnd() - 0.5) * 26 * amount;
        d[i + c] = Math.max(0, Math.min(255, v + grain));
      }
    }
    ctx.putImageData(img, x, y);
  }

  /* ------------------------------------------------------------------ */
  /* Pieces: quote bar, role tags, stamp, title                          */
  /* ------------------------------------------------------------------ */

  function drawQuoteBar(ctx, cover, W, qbH) {
    var g = GRADES[cover.grade];
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, qbH);
    ctx.textBaseline = 'middle';
    /* Right badge FIRST: measure it, so the quote can be clamped to the
     * space left of it and never run underneath it. */
    ctx.font = '700 ' + Math.round(qbH * 0.42) + 'px Arial, sans-serif';
    var badge = 'VOL. 06 / SPECIAL EDITION';
    var bw = ctx.measureText(badge).width + qbH * 0.9;
    var bx = W - bw - W * 0.008, by = qbH * 0.14, bh = qbH * 0.72;
    /* Quote text: shrink until it fits in the space left of the badge. */
    var leftX = W * 0.012;
    var maxQuoteW = bx - W * 0.012 - leftX;
    var quoteSize = Math.round(qbH * 0.52);
    var quote = cover.quote;
    function quoteText(q) { return '\u2605\u2605\u2605\u2605\u2605  \u201C' + q + '\u201D  \u2014  ' + cover.source; }
    ctx.font = 'italic 700 ' + quoteSize + 'px Georgia, "Times New Roman", serif';
    var left = quoteText(quote);
    while (ctx.measureText(left).width > maxQuoteW && quoteSize > Math.round(qbH * 0.34)) {
      quoteSize -= 1;
      ctx.font = 'italic 700 ' + quoteSize + 'px Georgia, "Times New Roman", serif';
      left = quoteText(quote);
    }
    /* Last resort: shorten the quote itself (the source must read fully). */
    while (ctx.measureText(left).width > maxQuoteW && quote.length > 4) {
      quote = quote.slice(0, -1);
      left = quoteText(quote + '\u2026');
    }
    ctx.fillStyle = g.quoteGold;
    ctx.textAlign = 'left';
    ctx.fillText(left, leftX, qbH / 2 + 1);
    ctx.fillStyle = '#f5b301';
    rr(ctx, bx, by, bw, bh, bh / 2);
    ctx.fill();
    ctx.fillStyle = '#1a0b00';
    ctx.textAlign = 'center';
    ctx.font = '700 ' + Math.round(qbH * 0.42) + 'px Arial, sans-serif';
    ctx.fillText(badge, bx + bw / 2, qbH / 2 + 1);
    ctx.textAlign = 'left';
  }

  function drawRoleTag(ctx, rect, photo, grade, scale) {
    var pad = 10 * scale;
    ctx.font = Math.round(20 * scale) + 'px Anton, "Arial Narrow", sans-serif';
    var locW = ctx.measureText(photo.location).width;
    ctx.font = '700 ' + Math.round(13 * scale) + 'px Arial, sans-serif';
    var roleW = ctx.measureText(photo.role).width;
    var bw = Math.max(locW, roleW) + pad * 2 + 4 * scale;
    var bh = 46 * scale;
    var bx = rect.x + 8 * scale, by = rect.y + 8 * scale;
    ctx.fillStyle = 'rgba(4,2,10,0.88)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = grade.accent;
    ctx.fillRect(bx, by, 4 * scale, bh);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = Math.round(20 * scale) + 'px Anton, "Arial Narrow", sans-serif';
    ctx.fillText(photo.location, bx + pad + 4 * scale, by + 22 * scale);
    ctx.fillStyle = grade.accent;
    ctx.font = '700 ' + Math.round(13 * scale) + 'px Arial, sans-serif';
    setLetterSpacing(ctx, 1);
    ctx.fillText(photo.role, bx + pad + 4 * scale, by + 39 * scale);
    setLetterSpacing(ctx, 0);
  }

  function drawSpecialStamp(ctx, rect, scale) {
    var label = 'SPECIAL EDITION';
    var sub = '2026 \u00B7 PALM CITY';
    ctx.save();
    ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.rotate(-0.14);
    ctx.font = '700 ' + Math.round(15 * scale) + 'px Arial, sans-serif';
    var w1 = ctx.measureText(label).width;
    ctx.font = '700 ' + Math.round(10 * scale) + 'px Arial, sans-serif';
    var w2 = ctx.measureText(sub).width;
    var w = Math.max(w1, w2) + 26 * scale, h = 44 * scale;
    ctx.fillStyle = 'rgba(8,4,14,0.92)';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.lineWidth = 2 * scale;
    ctx.strokeStyle = '#f5b301';
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd34d';
    ctx.font = '700 ' + Math.round(15 * scale) + 'px Arial, sans-serif';
    ctx.fillText(label, 0, -h * 0.18);
    ctx.fillStyle = '#f2eef7';
    ctx.font = '700 ' + Math.round(10 * scale) + 'px Arial, sans-serif';
    ctx.fillText(sub, 0, h * 0.24);
    ctx.restore();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  function drawWanted(ctx, rect, scale) {
    var label = 'WANTED \u2605\u2605\u2605\u2605\u2605';
    ctx.font = '700 ' + Math.round(17 * scale) + 'px Arial, sans-serif';
    var w = ctx.measureText(label).width + 22 * scale;
    var h = 34 * scale;
    var bx = rect.x + rect.w - w - 8 * scale, by = rect.y + 8 * scale;
    ctx.fillStyle = 'rgba(8,4,14,0.92)';
    ctx.fillRect(bx, by, w, h);
    ctx.lineWidth = 2 * scale;
    ctx.strokeStyle = '#f5b301';
    ctx.strokeRect(bx, by, w, h);
    ctx.fillStyle = '#ffd34d';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, bx + w / 2, by + h / 2 + 1);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  function drawSparkle(ctx, x, y, r, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.quadraticCurveTo(0, 0, 0, r);
    ctx.quadraticCurveTo(0, 0, -r, 0);
    ctx.quadraticCurveTo(0, 0, 0, -r);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /* 3-layer title. Returns { titleBaseline, subBaseline, subTop } so the
   * caller can verify the clearance above the tagline pill. */
  function drawTitle(ctx, cover, W, pillTop, minTitleTop) {
    var g = GRADES[cover.grade];
    var title = cover.title;
    var cx = W / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    function titleFont(s) { return s + 'px Anton, "Arial Narrow", sans-serif'; }
    /* Fit the title to exactly 80% of the poster width (band 75-85%):
     * measure once at a probe size, then scale by the exact ratio, so the
     * measured width lands in-band on every cover. */
    var targetW = W * 0.80, minW = W * 0.75, maxW = W * 0.85;
    var size = W * 0.21;
    ctx.font = titleFont(size);
    var w0 = ctx.measureText(title).width;
    if (w0 > 0) size = Math.floor(size * targetW / w0);
    size = Math.max(40, size);
    ctx.font = titleFont(size);
    var tw = ctx.measureText(title).width;
    if (tw > maxW) { size = Math.floor(size * maxW / tw); ctx.font = titleFont(size); tw = ctx.measureText(title).width; }
    if (tw < minW) { size = Math.ceil(size * minW / tw); ctx.font = titleFont(size); tw = ctx.measureText(title).width; }

    var subSize = Math.round(size * 0.30);
    ctx.font = subSize + 'px Yellowtail, cursive';
    var subW = ctx.measureText(cover.subtitle).width;
    var m = ctx.measureText(cover.subtitle);
    var subAscent = m.actualBoundingBoxAscent || subSize * 0.72;
    var subDescent = m.actualBoundingBoxDescent || subSize * 0.15;
    var ext = Math.max(4, Math.round(size * 0.055));
    /* Real cap height of the title (Anton is tall: ~0.87em, not 0.72). */
    ctx.font = titleFont(size);
    var titleAscent = ctx.measureText(title).actualBoundingBoxAscent || size * 0.72;

    /* Anchor the whole logo unit on the subtitle's LOWEST real glyph:
     * its lowest point must clear the pill top by 11px. The subtitle
     * sits tight against the title's bottom-right (its baseline a
     * little below the title baseline) and the title bottom (incl. the
     * 3D extrusion below its baseline) then sits a clear gap above the
     * pill too — nothing in the logo unit overlaps the pill.
     * On the wide cover the title is so tall that hanging the script
     * below it would push the title top into the bottom-row role tags,
     * so the title is lowered until its top clears the lowest tag and
     * the script tucks into the title's bottom-right instead — the
     * approved v10 look. minTitleTop is the lowest tag bottom + gap. */
    var subBaseline = pillTop - 11 - subDescent;
    var titleBaseline = subBaseline - Math.round(size * 0.08);
    if (typeof minTitleTop === 'number' && titleBaseline - titleAscent < minTitleTop) {
      titleBaseline = minTitleTop + titleAscent;
    }
    var subTop = subBaseline - subAscent;

    var grad = ctx.createLinearGradient(0, titleBaseline - size * 0.72, 0, titleBaseline + size * 0.10);
    g.titleStops.forEach(function (s) { grad.addColorStop(s[0], s[1]); });

    ctx.font = titleFont(size);
    ctx.textAlign = 'center';

    /* Layer 1 — dense black 3D extrusion, tight behind the letters. */
    ctx.fillStyle = '#09060e';
    var ext = Math.max(4, Math.round(size * 0.055));
    var steps = 6;
    for (var i = steps; i >= 1; i--) {
      ctx.fillText(title, cx, titleBaseline + (ext * i) / steps);
    }
    /* Layer 2 — black outline, round joins. */
    ctx.lineWidth = Math.max(8, Math.min(12, Math.round(size * 0.045)));
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000000';
    ctx.strokeText(title, cx, titleBaseline);
    /* Layer 3 — gradient fill, then synthwave lines clipped inside. */
    ctx.fillStyle = grad;
    ctx.fillText(title, cx, titleBaseline);
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    var tw = ctx.measureText(title).width;
    var top = titleBaseline - size * 0.72, bot = titleBaseline + size * 0.06;
    var bandTop = top + (bot - top) * 0.42;
    ctx.fillStyle = 'rgba(10,4,18,0.85)';
    var lines = 5;
    for (var l = 0; l < lines; l++) {
      var ly = bandTop + ((bot - bandTop) * l) / (lines - 1);
      var lt = Math.max(2, size * 0.018) * (1 + l * 0.35);
      ctx.fillRect(cx - tw / 2 - 4, ly - lt / 2, tw + 8, lt);
    }
    ctx.restore();
    /* 4-point sparkles near the letters. */
    drawSparkle(ctx, cx - tw * 0.42, top + size * 0.10, size * 0.045, '#ffffff');
    drawSparkle(ctx, cx + tw * 0.36, top + size * 0.42, size * 0.035, '#ffe9a8');
    drawSparkle(ctx, cx - tw * 0.48, bot - size * 0.10, size * 0.03, '#ffffff');
    drawSparkle(ctx, cx + tw * 0.47, bot - size * 0.16, size * 0.04, '#ffe9a8');

    /* Subtitle — Yellowtail neon script, tight on the title's
     * bottom-right as one logo unit. */
    ctx.font = subSize + 'px Yellowtail, cursive';
    ctx.textAlign = 'right';
    ctx.shadowColor = g.subtitleGlow;
    ctx.shadowBlur = Math.round(subSize * 0.45);
    ctx.fillStyle = g.subtitle;
    var subX = cx + tw / 2 + subSize * 0.10;
    ctx.fillText(cover.subtitle, subX, subBaseline);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.55;
    ctx.fillText(cover.subtitle, subX, subBaseline);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';

    return { titleBaseline: titleBaseline, subBaseline: subBaseline, subTop: subTop };
  }

  /* ------------------------------------------------------------------ */
  /* Footer: palms (background) -> credits/barcode/stamp -> pill (top)   */
  /* ------------------------------------------------------------------ */

  function drawFooter(ctx, cover, W, H, footerTop, footerH) {
    var scale = W / 1920;
    ctx.fillStyle = '#0a0616';
    ctx.fillRect(0, footerTop, W, footerH);

    /* BACKGROUND layer: thin palm silhouettes. */
    var palmColor = 'rgba(46,32,86,0.55)';
    var palms = [
      [W * 0.06, footerTop + footerH * 0.95, 0.9],
      [W * 0.20, footerTop + footerH * 1.02, 0.7],
      [W * 0.72, footerTop + footerH * 0.98, 0.8],
      [W * 0.86, footerTop + footerH * 1.05, 0.65]
    ];
    palms.forEach(function (p) { drawPalm(ctx, p[0], p[1], p[2] * (0.7 + scale * 0.5), palmColor); });

    /* Mid layer: film credits, barcode, gold stamp. */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#9a8fb0';
    ctx.font = '600 ' + Math.round(Math.max(11, footerH * 0.15)) + 'px Arial, sans-serif';
    setLetterSpacing(ctx, 2);
    ctx.fillText(CREDITS, W / 2, footerTop + footerH * 0.86);
    setLetterSpacing(ctx, 0);

    var stampR = footerH * 0.42;
    var stampCx = W - stampR - W * 0.018;
    var stampCy = footerTop + footerH * 0.58;
    var barW = Math.round(W * 0.055), barH = Math.round(footerH * 0.30);
    drawBarcode(ctx, stampCx - stampR - barW - W * 0.012, stampCy - barH / 2, barW, barH);
    drawStamp(ctx, stampCx, stampCy, stampR);

    /* TOPMOST layer: the tagline pill — nothing may overlap it. */
    var pillH = footerH * 0.42;
    ctx.font = '700 ' + Math.round(pillH * 0.42) + 'px Arial, sans-serif';
    setLetterSpacing(ctx, 1.5);
    var pillW = ctx.measureText(TAGLINE).width + pillH * 1.6;
    var pillX = (W - pillW) / 2;
    var pillY = footerTop + footerH * 0.13;
    ctx.fillStyle = '#120a24';
    rr(ctx, pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#f5c542';
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(TAGLINE, W / 2, pillY + pillH / 2 + 1);
    setLetterSpacing(ctx, 0);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    return { pillTop: pillY, pillBottom: pillY + pillH };
  }

  /* ------------------------------------------------------------------ */
  /* Main render                                                           */
  /* ------------------------------------------------------------------ */

  function getCover(id) {
    for (var i = 0; i < COVERS.length; i++) {
      if (COVERS[i].id === id) return COVERS[i];
    }
    return COVERS[0];
  }

  async function renderCover(coverId, canvas, opts) {
    opts = opts || {};
    var cover = getCover(coverId);
    var gradeId = opts.grade || cover.grade;
    var layoutId = opts.layout || cover.layout;
    var grade = GRADES[gradeId] || GRADES[cover.grade];
    var W = cover.width, H = cover.height;
    var renderCoverCfg = Object.assign({}, cover, { grade: gradeId, layout: layoutId });

    await ensureFonts();
    await loadPhotos();

    if (!canvas) canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext('2d');
    var scale = W / 1920;

    ctx.fillStyle = '#0b0616';
    ctx.fillRect(0, 0, W, H);

    var qbH = Math.max(28, Math.round(H * 0.038));
    var footerH = Math.round(H * cover.footerFrac);
    var footerTop = H - footerH;
    var gap = Math.max(5, Math.round(W * 0.004));
    var photoRect = { x: gap, y: qbH + gap, w: W - gap * 2, h: footerTop - qbH - gap * 2 };

    /* --- Photos --- */
    var panels = layoutPanels(layoutId, photoRect.x, photoRect.y, photoRect.w, photoRect.h, gap);
    ctx.save();
    try { ctx.filter = grade.photoFilter; } catch (e) {}
    panels.forEach(function (rect, i) {
      var key = PANELS[i];
      drawCover(ctx, _photos[key], rect.x, rect.y, rect.w, rect.h, PHOTOS[key].focus);
    });
    try { ctx.filter = 'none'; } catch (e) {}
    ctx.restore();
    applyGrade(ctx, photoRect, gradeId);
    applyPainterly(ctx, photoRect, opts.painterly || 0);

    /* --- Role tags + badges (never over faces: top corners only) --- */
    panels.forEach(function (rect, i) {
      drawRoleTag(ctx, rect, PHOTOS[PANELS[i]], grade, Math.max(0.6, scale * 1.15));
    });
    /* WANTED box on the bike panel (panel 3). */
    drawWanted(ctx, panels[2], Math.max(0.6, scale * 1.15));
    /* SPECIAL EDITION stamp: 16:9 diagonal -> TOP-RIGHT of Panel 1
     * (sky/palm area) so PALM CITY stays 100% clean; every other
     * layout -> bottom-right of the hero panel. */
    var stampScale = Math.max(0.6, scale * 1.15);
    var stampW = 150 * stampScale, stampH = 44 * stampScale;
    var stampRect;
    if (layoutId === 'gta-diagonal') {
      stampRect = { x: panels[0].x + panels[0].w - stampW - 14 * stampScale, y: panels[0].y + 14 * stampScale, w: stampW, h: stampH };
    } else {
      stampRect = { x: panels[0].x + panels[0].w - stampW - 14 * stampScale, y: panels[0].y + panels[0].h - stampH - 14 * stampScale, w: stampW, h: stampH };
    }
    drawSpecialStamp(ctx, stampRect, stampScale);

    /* --- Footer first (so we know the pill top), then the title --- */
    var footer = drawFooter(ctx, renderCoverCfg, W, H, footerTop, footerH);

    /* Lowest role-tag bottom (+2px): the title top must stay below it,
     * so no tag text is ever covered by the big title letters. */
    var tagScale = Math.max(0.6, scale * 1.15);
    var minTitleTop = 0;
    panels.forEach(function (rect) {
      minTitleTop = Math.max(minTitleTop, rect.y + 8 * tagScale + 46 * tagScale);
    });
    minTitleTop += 2;

    /* --- Title (3 layers) + subtitle, raised to clear the pill --- */
    drawTitle(ctx, renderCoverCfg, W, footer.pillTop, minTitleTop);

    /* --- Quote bar on top --- */
    drawQuoteBar(ctx, renderCoverCfg, W, qbH);

    /* --- Studio selection frame (optional) --- */
    if (typeof opts.selectedPanel === 'number' && panels[opts.selectedPanel]) {
      var sel = panels[opts.selectedPanel];
      ctx.save();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#38e1ff';
      ctx.shadowColor = '#38e1ff';
      ctx.shadowBlur = 14;
      ctx.strokeRect(sel.x + 1, sel.y + 1, sel.w - 2, sel.h - 2);
      ctx.restore();
    }

    return canvas;
  }

  async function exportPNG(coverId, opts) {
    var canvas = await renderCover(coverId, null, opts);
    return canvas.toDataURL('image/png');
  }

  async function exportAll(opts) {
    var out = [];
    for (var i = 0; i < COVERS.length; i++) {
      out.push({ id: COVERS[i].id, dataUrl: await exportPNG(COVERS[i].id, opts) });
    }
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Public API                                                            */
  /* ------------------------------------------------------------------ */

  window.PalmCity = {
    version: '11.0.0',
    covers: COVERS,
    grades: GRADES,
    layouts: LAYOUTS,
    photos: PHOTOS,
    panels: PANELS,
    tagline: TAGLINE,
    credits: CREDITS,

    /* Loading */
    loadPhotos: loadPhotos,
    ensureFonts: ensureFonts,
    photosReady: photosReady,   /* Promise<boolean> — all 6 photos loaded */
    ready: ready,               /* Promise<boolean> — fonts + photos loaded */

    /* Rendering */
    renderCover: renderCover,   /* (coverId, canvas|null, opts) -> Promise<canvas> */
    renderInto: renderCover,    /* alias */
    exportPNG: exportPNG,       /* (coverId, opts) -> Promise<dataURL png> */
    exportAll: exportAll,       /* (opts) -> Promise<[{id, dataUrl}]> */

    /* Style controls the studio UI calls live */
    applyGrade: applyGrade,         /* (ctx, rect, gradeId) -> grade object */
    applyPainterly: applyPainterly, /* (ctx, rect, 0..1) posterize + grain */
    setAssetBase: function (base) { ASSET_BASE = base; },
    setFontBase: function (base) { FONT_BASE = base; },
    getCover: getCover
  };
})();
