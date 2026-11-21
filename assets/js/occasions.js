/* ============================================================
   OCCASION THEMES  —  Pakistan gazetted holidays on screen
   ============================================================
   What it does
   ------------
   Before a national / religious occasion the LOGIN screen (and the
   customer portal) quietly changes its look: colours, background art,
   a small date chip and a greeting in the shop's own language.

   • Iqbāl Day (9 Nov)  → the 9 Nov theme shows from 5 Nov to 9 Nov
   • Eid-ul-Fitr        → 3-day theme, shows from Eid − 4 days
   • 14 August, 25 Dec, Ashura … same idea

   Nothing is hard-coded into the pages: dates live in one editable
   plan (Settings → 🎉 Occasion Themes), so the shop can add a branch
   anniversary or correct an Eid date in 10 seconds.

   Load order: after db.js, before the page scripts.
   ============================================================ */

window.OCCASIONS = (function () {
  'use strict';

  /* ------------------------------------------------------------
     1. THEME ART  —  pure SVG data URIs (offline safe, no images)
     ------------------------------------------------------------ */

  function svg(inner, w, h) {
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + (w || 400) + ' ' + (h || 400) + '">' + inner + '</svg>';
    return 'url("data:image/svg+xml,' + encodeURIComponent(s).replace(/'/g, '%27') + '")';
  }

  /* crescent moon: gold disc with a bite taken out (mask-free) */
  function crescent(col, glow) {
    return '<path d="M300 120a95 95 0 1 0 0 190 78 78 0 1 1 0-190Z" fill="' + col + '" opacity="' + (glow || 0.95) + '"/>';
  }
  function star(x, y, r, col, op) {
    var p = [];
    for (var i = 0; i < 10; i++) {
      var ang = (Math.PI / 5) * i - Math.PI / 2;
      var rr = i % 2 ? r * 0.42 : r;
      p.push((x + Math.cos(ang) * rr).toFixed(1) + ',' + (y + Math.sin(ang) * rr).toFixed(1));
    }
    return '<polygon points="' + p.join(' ') + '" fill="' + (col || '#ffd877') + '" opacity="' + (op || 0.9) + '"/>';
  }
  function stars(col, seed) {
    var out = '', pts = [[60, 70, 7], [140, 40, 5], [120, 150, 4], [40, 220, 6], [210, 90, 4], [250, 210, 5],
                         [330, 300, 4], [90, 330, 5], [180, 260, 3], [20, 120, 4]];
    for (var i = 0; i < pts.length; i++) {
      out += star(pts[i][0] + (seed || 0), pts[i][1], pts[i][2], col, 0.55 + (i % 3) * 0.15);
    }
    return out;
  }
  function dots(col, n, op) {
    var out = '';
    for (var i = 0; i < n; i++) {
      var x = (i * 137.5) % 380 + 10, y = (i * 89.3) % 380 + 10;
      out += '<circle cx="' + x.toFixed(0) + '" cy="' + y.toFixed(0) + '" r="2.6" fill="' + col + '" opacity="' + (op || 0.35) + '"/>';
    }
    return out;
  }
  /* simple mosque silhouette */
  function mosque(col, op) {
    return '<g fill="' + col + '" opacity="' + (op || 0.16) + '">' +
      '<path d="M200 150c34 0 56 30 56 62v70h-112v-70c0-32 22-62 56-62Z"/>' +
      '<ellipse cx="200" cy="150" rx="9" ry="16"/>' +
      '<rect x="80" y="236" width="16" height="60" rx="8"/><ellipse cx="88" cy="232" rx="12" ry="10"/>' +
      '<rect x="304" y="236" width="16" height="60" rx="8"/><ellipse cx="312" cy="232" rx="12" ry="10"/>' +
      '<rect x="120" y="250" width="160" height="40"/>' +
      '</g>';
  }
  function lantern(col, op) {
    return '<g stroke="' + col + '" fill="none" stroke-width="3" opacity="' + (op || 0.55) + '">' +
      '<path d="M90 40v26"/><path d="M62 66h56l10 30-12 50H64L52 96Z"/><path d="M64 146h44"/>' +
      '<path d="M310 30v20"/><path d="M286 50h48l8 26-10 44h-44l-10-44Z"/>' +
      '<circle cx="90" cy="104" r="10"/><circle cx="310" cy="90" r="9"/></g>';
  }
  function quill(col, op) {
    return '<g fill="none" stroke="' + col + '" stroke-width="4" stroke-linecap="round" opacity="' + (op || 0.35) + '">' +
      '<path d="M120 300c40-70 90-140 170-200"/><path d="M290 100c-46 6-92 30-118 66 34 10 74 4 102-14"/>' +
      '<path d="M160 236c16 4 30 2 44-6"/><path d="M186 200c14 2 26 0 38-8"/></g>';
  }
  function flagWaves(col, col2, op) {
    return '<g opacity="' + (op || 0.18) + '"><path d="M0 300c70-40 130 20 200-10s120-60 200-20v130H0Z" fill="' + col + '"/>' +
      '<path d="M0 340c90-30 140 26 220-4s120-40 180-10v74H0Z" fill="' + col2 + '"/></g>';
  }
  function snow(col, op) {
    var out = '<g stroke="' + col + '" stroke-width="2" opacity="' + (op || 0.45) + '" stroke-linecap="round">';
    [[70, 70], [180, 40], [300, 90], [110, 190], [250, 230], [40, 300], [330, 310], [190, 320]].forEach(function (p) {
      for (var k = 0; k < 3; k++) {
        var a = (Math.PI / 3) * k, dx = Math.cos(a) * 9, dy = Math.sin(a) * 9;
        out += '<line x1="' + (p[0] - dx) + '" y1="' + (p[1] - dy) + '" x2="' + (p[0] + dx) + '" y2="' + (p[1] + dy) + '"/>';
      }
    });
    return out + '</g>';
  }
  function tree(col, op) {
    return '<g fill="' + col + '" opacity="' + (op || 0.9) + '">' +
      '<path d="M310 120l46 66h-92Z"/><path d="M310 160l54 76h-108Z"/><path d="M310 210l60 84H250Z"/>' +
      '<rect x="304" y="292" width="12" height="26"/></g>' +
      '<g fill="#fff3c4">' + star(310, 116, 7, '#fff3c4', 0.95) + '</g>';
  }
  function fireworks(col, col2, op) {
    var out = '<g stroke="' + col + '" fill="none" stroke-width="2.4" opacity="' + (op || 0.7) + '" stroke-linecap="round">';
    [[110, 100], [280, 80], [200, 190]].forEach(function (c, i) {
      for (var k = 0; k < 12; k++) {
        var a = (Math.PI / 6) * k, r1 = 14, r2 = 34 + i * 6;
        out += '<line x1="' + (c[0] + Math.cos(a) * r1).toFixed(0) + '" y1="' + (c[1] + Math.sin(a) * r1).toFixed(0) +
               '" x2="' + (c[0] + Math.cos(a) * r2).toFixed(0) + '" y2="' + (c[1] + Math.sin(a) * r2).toFixed(0) + '"/>';
      }
    });
    return out + '</g><g fill="' + col2 + '" opacity="' + (op || 0.5) + '">' + dots(col2, 16, 0.5) + '</g>';
  }
  function gear(col, op) {
    var teeth = '';
    for (var i = 0; i < 12; i++) {
      var a = (Math.PI / 6) * i;
      teeth += '<rect x="' + (200 + Math.cos(a) * 74 - 7).toFixed(0) + '" y="' + (200 + Math.sin(a) * 74 - 14).toFixed(0) +
               '" width="14" height="28" rx="4" fill="' + col + '" opacity="' + (op || 0.16) + '" transform="rotate(' +
               (i * 30) + ' 200 200)"/>';
    }
    return '<g opacity="' + (op || 0.16) + '">' + teeth +
      '<circle cx="200" cy="200" r="66" fill="none" stroke="' + col + '" stroke-width="24"/>' +
      '<circle cx="200" cy="200" r="30" fill="none" stroke="' + col + '" stroke-width="16"/></g>';
  }
  function mountains(col, op) {
    return '<g fill="' + col + '" opacity="' + (op || 0.16) + '">' +
      '<path d="M0 340l90-130 60 70 70-120 90 150 60-70 60 100v60H0Z"/></g>';
  }
  function domeFrame(col, op) {
    return '<g fill="none" stroke="' + col + '" stroke-width="3" opacity="' + (op || 0.25) + '">' +
      '<rect x="30" y="30" width="340" height="340" rx="24"/><rect x="46" y="46" width="308" height="308" rx="16"/>' +
      '<path d="M170 300V170c0-24 30-44 30-44s30 20 30 44v130"/><path d="M120 300V210c0-18 22-32 22-32s22 14 22 32v90"/>' +
      '<path d="M236 300V210c0-18 22-32 22-32s22 14 22 32v90"/></g>';
  }


  /* A background *gradient* drawn as SVG, so the occasion art is ONE asset
     that renders identically in every engine (browser, print, PDF export). */
  function bgArt(stops, opts) {
    opts = opts || {};
    var g = '<defs><linearGradient id="g" x1="' + (opts.x1 || '0%') + '" y1="' + (opts.y1 || '0%') +
            '" x2="' + (opts.x2 || '100%') + '" y2="' + (opts.y2 || '100%') + '">' +
            stops.map(function (st) { return '<stop offset="' + st[0] + '" stop-color="' + st[1] + '"/>'; }).join('') +
            '</linearGradient></defs><rect width="400" height="400" fill="url(#g)"/>';
    return svg(g + (opts.extra || ''), 400, 400);
  }


  /* ------------------------------------------------------------
     2. THEME LIBRARY  —  bg / art / accent colours
     ------------------------------------------------------------ */
  /*
    bg     : CSS gradient stack for the hero (login) / portal wrap
    art    : SVG data-URI layer drawn on top (repeat or positioned)
    artSize: background-size for the art layer
    accent : accent colour used for chip, headline, ring
    accent2: secondary
    ink    : text colour on the themed area
  */
  var THEMES = {
    iqbal: {
      name: 'Iqbal Day — Navy & Gold',
      bg: bgArt([['0', '#1b4f8a'], ['0.45', '#0d2b52'], ['1', '#071a33']]),
      art: svg(quill('#c8a24a', 0.5) + stars('#c8a24a', 20), 400, 400),
      artSize: '420px 420px', artPos: 'right bottom',
      accent: '#c8a24a', accent2: '#1b4f8a', ink: '#f6f1e4',
    },
    independence: {
      name: 'Independence Day — Green & White',
      bg: bgArt([['0', '#013220'], ['0.55', '#046a38'], ['1', '#0a9c53']], { y2: '100%' }),
      art: svg(crescent('#ffffff', 0.9) + stars('#ffffff', 0) + flagWaves('#ffffff', '#0a9c53', 0.14), 400, 400),
      artSize: '460px 460px', artPos: 'right bottom',
      accent: '#ffffff', accent2: '#0a9c53', ink: '#f2fff8'
    },
    pakistanDay: {
      name: 'Pakistan Day — Green Flag',
      bg: bgArt([['0', '#063a24'], ['0.6', '#0b7a45'], ['1', '#12a35c']], { x2: '100%', y2: '100%' }),
      art: svg(stars('#ffffff', 0) + crescent('#ffffff', 0.28) + flagWaves('#ffffff', '#0b7a45', 0.12), 400, 400),
      artSize: '440px 440px', artPos: 'right bottom',
      accent: '#ffffff', accent2: '#12a35c', ink: '#f4fff9'
    },
    kashmir: {
      name: 'Kashmir Solidarity — Mountains & Green',
      bg: bgArt([['0', '#052e21'], ['0.55', '#0a6042'], ['1', '#16805c']]),
      art: svg(mountains('#ffffff', 0.14) + crescent('#ffd877', 0.9) + stars('#ffd877', 10), 400, 400),
      artSize: '460px 460px', artPos: 'right bottom',
      accent: '#ffd877', accent2: '#16805c', ink: '#f2fff9'
    },
    eidFitr: {
      name: 'Eid-ul-Fitr — Emerald & Gold Crescent',
      bg: bgArt([['0', '#12664a'], ['0.48', '#073b2b'], ['1', '#04231a']], { extra: '<circle cx="320" cy="60" r="230" fill="#1c8a63" opacity=".55"/>' }),
      art: svg(crescent('#ffd877', 0.95) + stars('#ffd877', 0) + dots('#ffd877', 14, 0.3) + mosque('#ffd877', 0.1), 400, 400),
      artSize: '470px 470px', artPos: 'right bottom',
      accent: '#ffd877', accent2: '#12664a', ink: '#fff9ec'
    },
    eidAdha: {
      name: 'Eid-ul-Adha — Teal & Sand',
      bg: bgArt([['0', '#0d5f6b'], ['0.5', '#083b46'], ['1', '#04222a']], { extra: '<circle cx="80" cy="80" r="220" fill="#14707d" opacity=".5"/>' }),
      art: svg(crescent('#f3d9a4', 0.95) + mosque('#f3d9a4', 0.14) + stars('#f3d9a4', 30), 400, 400),
      artSize: '470px 470px', artPos: 'right bottom',
      accent: '#f3d9a4', accent2: '#0d5f6b', ink: '#f5feff'
    },
    ramadan: {
      name: 'Ramadan — Indigo Lanterns',
      bg: bgArt([['0', '#3b2a6b'], ['0.55', '#221a44'], ['1', '#120e26']], { y2: '100%', extra: '<circle cx="200" cy="0" r="220" fill="#4a3585" opacity=".55"/>' }),
      art: svg(lantern('#ffd877', 0.6) + crescent('#ffd877', 0.85) + stars('#ffd877', 60), 400, 400),
      artSize: '440px 440px', artPos: 'center top',
      accent: '#ffd877', accent2: '#4b3a8a', ink: '#f7f4ff'
    },
    ashura: {
      name: 'Ashura — Charcoal & Crimson',
      bg: bgArt([['0', '#1a1a1e'], ['0.55', '#2c1417'], ['1', '#4a1418']]),
      art: svg(mosque('#e8c86a', 0.1) + star(200, 120, 16, '#e8c86a', 0.5) + dots('#e8c86a', 10, 0.2), 400, 400),
      artSize: '440px 440px', artPos: 'right bottom',
      accent: '#e8c86a', accent2: '#4a1418', ink: '#faf5ec'
    },
    milad: {
      name: 'Eid Milad-un-Nabi — Emerald & Ivory',
      bg: bgArt([['0', '#0f7a58'], ['0.5', '#0a4c39'], ['1', '#052a20']], { extra: '<circle cx="280" cy="80" r="210" fill="#159a70" opacity=".5"/>' }),
      art: svg(domeFrame('#ffefc4', 0.22) + stars('#ffefc4', 0) + crescent('#ffefc4', 0.75), 400, 400),
      artSize: '470px 470px', artPos: 'right bottom',
      accent: '#ffefc4', accent2: '#0f7a58', ink: '#fffdf5'
    },
    takbeer: {
      name: 'Youm-e-Takbeer — Green Rays',
      bg: bgArt([['0', '#022116'], ['0.45', '#05402a'], ['1', '#0a7a45']], { y1: '0%', y2: '100%' }),
      art: svg(stars('#ffd877', 0) + '<g stroke="#ffd877" stroke-width="2" opacity=".22">' +
        Array.apply(null, Array(16)).map(function (_, i) {
          var a = (Math.PI / 8) * i;
          return '<line x1="200" y1="400" x2="' + (200 + Math.cos(a) * 420).toFixed(0) + '" y2="' + (400 + Math.sin(a) * 420).toFixed(0) + '"/>';
        }).join('') + '</g>', 400, 400),
      artSize: '500px 500px', artPos: 'center bottom',
      accent: '#ffd877', accent2: '#0a7a45', ink: '#f3fff8'
    },
    labour: {
      name: 'Labour Day — Red & Steel',
      bg: bgArt([['0', '#3a0f10'], ['0.55', '#7d1418'], ['1', '#b91c1c']]),
      art: svg(gear('#ffffff', 0.14) + dots('#ffd877', 12, 0.3), 400, 400),
      artSize: '460px 460px', artPos: 'right bottom',
      accent: '#ffd877', accent2: '#b91c1c', ink: '#fff6f4'
    },
    defence: {
      name: 'Defence Day — Olive & Steel',
      bg: bgArt([['0', '#1c2a1c'], ['0.55', '#30452f'], ['1', '#47593f']]),
      art: svg(star(200, 150, 60, '#e9f0d8', 0.18) + stars('#e9f0d8', 40), 400, 400),
      artSize: '440px 440px', artPos: 'right bottom',
      accent: '#e9f0d8', accent2: '#47593f', ink: '#f7faf1'
    },
    quaid: {
      name: 'Quaid-e-Azam Day — Ivory & Gold',
      bg: bgArt([['0', '#f7ecd2'], ['0.45', '#e6d4ad'], ['1', '#c9b78e']], { extra: '<circle cx="240" cy="80" r="200" fill="#fff8e6" opacity=".6"/>' }),
      art: svg(domeFrame('#7a5a1f', 0.2) + star(200, 96, 18, '#a8842f', 0.5), 400, 400),
      artSize: '470px 470px', artPos: 'right bottom',
      accent: '#8a6a21', accent2: '#e6d4ad', ink: '#2c2210', light: true
    },
    christmas: {
      name: 'Quaid / Christmas — Red, White & Green',
      bg: bgArt([['0', '#7f1d1d'], ['0.6', '#0f5132'], ['1', '#065f46']]),
      art: svg(snow('#ffffff', 0.4) + tree('#ffffff', 0.85) + stars('#fff3c4', 70), 400, 400),
      artSize: '470px 470px', artPos: 'right bottom',
      accent: '#fff3c4', accent2: '#0f5132', ink: '#fff8f3'
    },
    newyear: {
      name: 'New Year — Midnight Fireworks',
      bg: bgArt([['0', '#1e2a5a'], ['0.55', '#101a3a'], ['1', '#070b1c']], { extra: '<circle cx="200" cy="120" r="200" fill="#2b3b7a" opacity=".55"/>' }),
      art: svg(fireworks('#ffd877', '#8ec5ff', 0.75) + stars('#ffffff', 90), 400, 400),
      artSize: '480px 480px', artPos: 'center',
      accent: '#ffd877', accent2: '#1e2a5a', ink: '#f6f9ff'
    },
    shab: {
      name: 'Shab-e-Barat / Shab-e-Miraj — Night Sky',
      bg: bgArt([['0', '#23306b'], ['0.55', '#141b40'], ['1', '#080c20']], { extra: '<circle cx="120" cy="0" r="220" fill="#2f4090" opacity=".5"/>' }),
      art: svg(stars('#ffd877', 0) + crescent('#ffd877', 0.8) + mosque('#a7c6ff', 0.12), 400, 400),
      artSize: '470px 470px', artPos: 'right bottom',
      accent: '#ffd877', accent2: '#23306b', ink: '#f2f6ff'
    },
    anniversary: {
      name: 'Shop Anniversary / Custom — Brand Blue & Gold',
      bg: bgArt([['0', '#0b3f80'], ['0.55', '#07284f'], ['1', '#04162c']], { extra: '<circle cx="280" cy="80" r="210" fill="#12559f" opacity=".5"/>' }),
      art: svg(stars('#ffd877', 0) + fireworks('#ffd877', '#7fd1ff', 0.5), 400, 400),
      artSize: '460px 460px', artPos: 'right bottom',
      accent: '#ffd877', accent2: '#0b3f80', ink: '#f4f9ff'
    }
  };

  function resolveArt(t) {
    var theme = THEMES[t] || THEMES.anniversary;
    var out = {};
    for (var k in theme) out[k] = theme[k];
    if (out.css && out.css.indexOf('url(#)') !== -1) out.css = out.css.replace('url(#)', out.art);
    return out;
  }

  /* ------------------------------------------------------------
     3. THE PLAN  —  Pakistan gazetted holidays
     ------------------------------------------------------------
     date  : first day of the occasion (YYYY-MM-DD)
     days  : how many days the holiday runs (default 1)
     lead  : how many days BEFORE the occasion the theme starts
     approx: lunar date — confirm from the Cabinet Division / Ruet-e-Hilal
     ------------------------------------------------------------ */
  var DEFAULT_PLAN = [
    /* ---- 2026 (notified by the Cabinet Division) ---- */
    { id: 'kashmir-2026', date: '2026-02-05', name: 'Kashmir Solidarity Day', ur: 'یومِ یکجہتی کشمیر', theme: 'kashmir', emoji: '🏔️', on: true },
    { id: 'ramadan-2026', date: '2026-02-19', name: 'Ramadan begins', ur: 'رمضان المبارک', theme: 'ramadan', emoji: '🌙', days: 3, on: true, approx: true, priority: 2 },
    { id: 'eidfitr-2026', date: '2026-03-20', name: 'Eid-ul-Fitr', ur: 'عید الفطر', theme: 'eidFitr', emoji: '🌙', days: 3, on: true, approx: true },
    { id: 'pakday-2026', date: '2026-03-23', name: 'Pakistan Day', ur: 'یومِ پاکستان', theme: 'pakistanDay', emoji: '🇵🇰', on: true },
    { id: 'labour-2026', date: '2026-05-01', name: 'Labour Day', ur: 'یومِ مزدور', theme: 'labour', emoji: '⚙️', on: true },
    { id: 'eidadha-2026', date: '2026-05-26', name: 'Eid-ul-Adha', ur: 'عید الاضحیٰ', theme: 'eidAdha', emoji: '🐐', days: 3, on: true, approx: true },
    { id: 'takbeer-2026', date: '2026-05-28', name: 'Youm-e-Takbeer', ur: 'یومِ تکبیر', theme: 'takbeer', emoji: '💚', on: true },
    { id: 'ashura-2026', date: '2026-06-25', name: 'Ashura', ur: 'عاشورہ', theme: 'ashura', emoji: '🕌', days: 2, on: true, approx: true },
    { id: 'independence-2026', date: '2026-08-14', name: 'Independence Day', ur: 'یومِ آزادی', theme: 'independence', emoji: '🇵🇰', on: true },
    { id: 'defence-2026', date: '2026-09-06', name: 'Defence Day', ur: 'یومِ دفاع', theme: 'defence', emoji: '🎖️', on: true },
    { id: 'iqbal-2026', date: '2026-11-09', name: 'Allama Iqbal Day', ur: 'یومِ اقبال', theme: 'iqbal', emoji: '🖋️', on: true },
    { id: 'quaid-2026', date: '2026-12-25', name: 'Quaid-e-Azam Day & Christmas', ur: 'یومِ قائدِ اعظم', theme: 'christmas', emoji: '🎄', on: true },

    /* ---- 2027 (expected — lunar dates to be confirmed) ---- */
    { id: 'kashmir-2027', date: '2027-02-05', name: 'Kashmir Solidarity Day', ur: 'یومِ یکجہتی کشمیر', theme: 'kashmir', emoji: '🏔️', on: true },
    { id: 'ramadan-2027', date: '2027-02-08', name: 'Ramadan begins', ur: 'رمضان المبارک', theme: 'ramadan', emoji: '🌙', days: 3, on: true, approx: true, priority: 2 },
    { id: 'eidfitr-2027', date: '2027-03-10', name: 'Eid-ul-Fitr', ur: 'عید الفطر', theme: 'eidFitr', emoji: '🌙', days: 3, on: true, approx: true },
    { id: 'pakday-2027', date: '2027-03-23', name: 'Pakistan Day', ur: 'یومِ پاکستان', theme: 'pakistanDay', emoji: '🇵🇰', on: true },
    { id: 'labour-2027', date: '2027-05-01', name: 'Labour Day', ur: 'یومِ مزدور', theme: 'labour', emoji: '⚙️', on: true },
    { id: 'eidadha-2027', date: '2027-05-17', name: 'Eid-ul-Adha', ur: 'عید الاضحیٰ', theme: 'eidAdha', emoji: '🐐', days: 3, on: true, approx: true },
    { id: 'takbeer-2027', date: '2027-05-28', name: 'Youm-e-Takbeer', ur: 'یومِ تکبیر', theme: 'takbeer', emoji: '💚', on: true },
    { id: 'ashura-2027', date: '2027-06-15', name: 'Ashura', ur: 'عاشورہ', theme: 'ashura', emoji: '🕌', days: 2, on: true, approx: true },
    { id: 'independence-2027', date: '2027-08-14', name: 'Independence Day', ur: 'یومِ آزادی', theme: 'independence', emoji: '🇵🇰', on: true },
    { id: 'milad-2027', date: '2027-08-15', name: 'Eid Milad-un-Nabi (PBUH)', ur: 'عید میلاد النبی', theme: 'milad', emoji: '🕌', on: true, approx: true },
    { id: 'iqbal-2027', date: '2027-11-09', name: 'Allama Iqbal Day', ur: 'یومِ اقبال', theme: 'iqbal', emoji: '🖋️', on: true },
    { id: 'quaid-2027', date: '2027-12-25', name: 'Quaid-e-Azam Day & Christmas', ur: 'یومِ قائدِ اعظم', theme: 'christmas', emoji: '🎄', on: true },

    /* ---- moving observances worth showing (optional, editable) ---- */
    { id: 'newyear-2027', date: '2027-01-01', name: 'New Year', ur: 'نیا سال', theme: 'newyear', emoji: '🎆', on: false },
    { id: 'newyear-2026', date: '2026-01-01', name: 'New Year', ur: 'نیا سال', theme: 'newyear', emoji: '🎆', on: false }
  ];

  var GREETINGS = {
    iqbal:       { en: 'Iqbal Day', ur: 'یومِ اقبال مبارک', line_en: 'Remembering the Poet of the East', line_ur: 'شاعرِ مشرق کو خراجِ تحسین' },
    independence:{ en: 'Happy Independence Day', ur: 'جشنِ آزادی مبارک', line_en: '14 August — Pakistan Zindabad', line_ur: '۱۴ اگست — پاکستان زندہ باد' },
    pakistanDay: { en: 'Happy Pakistan Day', ur: 'یومِ پاکستان مبارک', line_en: '23 March — a nation born of a resolve', line_ur: '۲۳ مارچ — قراردادِ پاکستان' },
    kashmir:     { en: 'Kashmir Solidarity Day', ur: 'یومِ یکجہتی کشمیر', line_en: 'We stand with Kashmir', line_ur: 'ہم کشمیر کے ساتھ ہیں' },
    eidFitr:     { en: 'Eid Mubarak', ur: 'عید مبارک', line_en: 'May your Eid be full of joy and blessings', line_ur: 'عید کی خوشیاں آپ کے گھر رہیں' },
    eidAdha:     { en: 'Eid-ul-Adha Mubarak', ur: 'عید الاضحیٰ مبارک', line_en: 'Blessings of sacrifice and togetherness', line_ur: 'قربانی اور خوشیوں کی عید مبارک' },
    ramadan:     { en: 'Ramadan Mubarak', ur: 'رمضان مبارک', line_en: 'Blessed month of mercy and patience', line_ur: 'رحمتوں والا مہینہ مبارک' },
    ashura:      { en: 'Ashura', ur: 'عاشورہ', line_en: 'Remembering the sacrifice of Karbala', line_ur: 'کربلا کی یاد میں' },
    milad:       { en: 'Eid Milad-un-Nabi', ur: 'عید میلاد النبی', line_en: 'Peace and blessings be upon him', line_ur: 'نورِ ہدایت پر درود و سلام' },
    takbeer:     { en: 'Youm-e-Takbeer', ur: 'یومِ تکبیر', line_en: '28 May — a day of national strength', line_ur: '۲۸ مئی — یومِ تکبیر' },
    labour:      { en: 'Happy Labour Day', ur: 'یومِ مزدور مبارک', line_en: 'Saluting every hard-working hand', line_ur: 'محنت کرنے والوں کو سلام' },
    defence:     { en: 'Defence Day', ur: 'یومِ دفاع', line_en: 'Honouring our defenders', line_ur: 'دفاعِ وطن کے محافظوں کو سلام' },
    quaid:       { en: 'Quaid-e-Azam Day', ur: 'یومِ قائدِ اعظم', line_en: 'Unity, Faith and Discipline', line_ur: 'اتحاد، ایمان، نظم' },
    christmas:   { en: 'Merry Christmas', ur: 'میری کرسمس', line_en: 'Warm wishes from all of us', line_ur: 'ہم سب کی طرف سے نیک تمنائیں' },
    newyear:     { en: 'Happy New Year', ur: 'نیا سال مبارک', line_en: 'Thank you for being with us', line_ur: 'سدا خوش رہیں' },
    shab:        { en: 'Blessed night', ur: 'مبارک رات', line_en: 'Prayers for you and your family', line_ur: 'آپ اور آپ کے گھر کے لیے دعائیں' },
    anniversary: { en: 'Our Anniversary', ur: 'ہماری سالگرہ', line_en: 'Thank you for your trust', line_ur: 'آپ کے اعتماد کا شکریہ' }
  };

  /* ------------------------------------------------------------
     4. CONFIG + ACTIVE OCCASION
     ------------------------------------------------------------ */
  function settings() {
    try { return (typeof DB !== 'undefined' && DB.settings) ? (DB.settings() || {}) : {}; } catch (e) { return {}; }
  }

  function cfg() {
    var s = settings();
    return {
      enabled: s.occasionThemes !== false,                       // ON by default
      defaultLead: (s.occasionLeadDays != null ? +s.occasionLeadDays : 4),
      showOnPortal: s.occasionPortal !== false,
      lang: (s.occasionLang || 'both'),                          // 'en' | 'ur' | 'both'
      plan: plan()
    };
  }

  /* Default plan + the shop's own edits (disabled events, changed dates, new ones). */
  function plan() {
    var s = settings();
    var custom = Array.isArray(s.occasionPlan) ? s.occasionPlan : [];
    var removed = Array.isArray(s.occasionPlanRemoved) ? s.occasionPlanRemoved : [];
    var byId = {};
    DEFAULT_PLAN.forEach(function (e) { byId[e.id] = e; });
    var merged = DEFAULT_PLAN.map(function (e) {
      var o = custom.filter(function (c) { return c && c.id === e.id; })[0];
      var row = o ? Object.assign({}, e, o) : Object.assign({}, e);
      if (removed.indexOf(e.id) !== -1) row.on = false;
      return row;
    });
    custom.forEach(function (c) {
      if (c && c.id && !byId[c.id]) merged.push(Object.assign({ days: 1 }, c));
    });
    return merged;
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function addDays(isoStr, n) {
    var d = new Date(isoStr + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return iso(d);
  }
  function daysBetween(a, b) {
    return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
  }

  /* Window for one entry: [start, end] inclusive. */
  function windowOf(e, c) {
    var lead = (e.lead != null ? +e.lead : (c ? c.defaultLead : 4));
    var days = Math.max(1, +(e.days || 1));
    return { start: addDays(e.date, -lead), end: addDays(e.date, days - 1) };
  }

  /* Which occasion is on screen today? */
  function activeOn(dateISO, c) {
    c = c || cfg();
    if (!c.enabled) return null;
    var today = dateISO || iso(new Date());
    var best = null;
    c.plan.forEach(function (e) {
      if (e.on === false || !e.date) return;
      var w = windowOf(e, c);
      if (today < w.start || today > w.end) return;
      var left = daysBetween(today, w.end);
      var toEvent = daysBetween(today, e.date);
      var cand = {
        priority: (e.priority != null ? +e.priority : 3),
        occasion: e,
        theme: e.theme || 'anniversary',
        start: w.start,
        end: w.end,
        daysLeft: left,
        daysToEvent: toEvent,
        isEventDay: today >= e.date && today <= addDays(e.date, Math.max(1, +(e.days || 1)) - 1),
        phase: toEvent > 0 ? 'before' : (left > 0 ? 'during' : 'today')
      };
      /* Overlapping windows (e.g. Ramadan → Eid): the higher-priority celebration
         wins; on equal priority the one that ends first wins. */
      if (!best || cand.priority > best.priority ||
          (cand.priority === best.priority && left < best.daysLeft)) best = cand;
    });
    return best;
  }

  /* The next occasion after today (for the settings screen). */
  function upcoming(limit, fromISO) {
    var c = cfg();
    var today = fromISO || iso(new Date());
    return c.plan
      .filter(function (e) { return e.on !== false && e.date && e.date >= today; })
      .sort(function (a, b) { return a.date < b.date ? -1 : 1; })
      .slice(0, limit || 4)
      .map(function (e) {
        var w = windowOf(e, c);
        return { occasion: e, start: w.start, end: w.end, daysTo: daysBetween(today, e.date), theme: e.theme };
      });
  }

  /* ------------------------------------------------------------
     5. HTML BITS
     ------------------------------------------------------------ */
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function prettyDate(isoStr) {
    try {
      return new Date(isoStr + 'T00:00:00')
        .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) { return isoStr; }
  }

  function greetingText(act, lang) {
    var g = GREETINGS[act.theme] || GREETINGS.anniversary;
    var name = act.occasion.name || '';
    return {
      title: g.en || name,
      titleUr: g.ur || name,
      line: g.line_en || '',
      lineUr: g.line_ur || ''
    };
  }

  /* The small date chip: "🎉 Iqbal Day · 9 Nov · 2 days to go" */
  function chipText(act) {
    var o = act.occasion;
    var when = act.isEventDay ? 'today' :
      (act.daysToEvent > 0 ? (act.daysToEvent === 1 ? 'tomorrow' : act.daysToEvent + ' days to go')
                           : (act.daysLeft === 1 ? 'last day' : act.daysLeft + ' days left'));
    return (o.emoji || '🎉') + ' ' + o.name + ' · ' + prettyDate(o.date) + ' · ' + when;
  }

  function chipHtml(act) {
    if (!act) return '';
    return '<div class="oc-chip" role="status"><span class="oc-chip-dot"></span>' + esc(chipText(act)) + '</div>';
  }

  /* Greeting block used inside the login card & portal */
  function greetHtml(act, opts) {
    if (!act) return '';
    opts = opts || {};
    var g = greetingText(act);
    var both = opts.lang !== 'ur';
    var ur = opts.lang !== 'en';
    return '' +
      '<div class="oc-greet">' +
        '<div class="oc-greet-title">' + esc(g.title) + '</div>' +
        (ur ? '<div class="oc-greet-ur" dir="rtl" lang="ur">' + esc(g.titleUr) + '</div>' : '') +
        (both && g.line ? '<div class="oc-greet-line">' + esc(g.line) + '</div>' : '') +
        '<div class="oc-greet-when">' + esc(chipText(act)) + '</div>' +
      '</div>';
  }

  /* ------------------------------------------------------------
     6. APPLYING THE THEME
     ------------------------------------------------------------ */
  var STYLE_ID = 'mdc-occasion-style';

  function baseCss() {
    return [
      /* chip */
      '.oc-chip{display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:999px;width:max-content;max-width:100%;',
      'font:700 12px/1.2 "Inter","Segoe UI",Tahoma,sans-serif;letter-spacing:.2px;',
      'background:rgba(255,255,255,.14);color:var(--oc-ink,#fff);border:1px solid rgba(255,255,255,.32);',
      'text-shadow:0 1px 2px rgba(0,0,0,.35);',
      'backdrop-filter:blur(6px);box-shadow:0 6px 18px rgba(0,0,0,.18)}',
      '.oc-chip-dot{width:7px;height:7px;border-radius:50%;background:var(--oc-accent,#ffd877);',
      'box-shadow:0 0 0 4px rgba(255,216,119,.22);animation:ocPulse 2.4s ease-in-out infinite}',
      '@keyframes ocPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.55;transform:scale(.82)}}',

      /* greeting card */
      '.oc-greet{margin:0 0 16px;padding:14px 16px;border-radius:14px;text-align:center;',
      'background:linear-gradient(135deg,rgba(255,255,255,.14),rgba(255,255,255,.05));',
      'border:1px solid rgba(255,255,255,.28);color:var(--oc-ink,#fff)}',
      '.oc-greet-title{font:800 15px/1.3 "Inter","Segoe UI",Tahoma,sans-serif;letter-spacing:.2px}',
      '.oc-greet-ur{font:700 17px/1.9 "Noto Nastaliq Urdu","Noto Naskh Arabic",serif;margin-top:2px}',
      '.oc-greet-line{font:500 11.5px/1.5 "Inter","Segoe UI",Tahoma,sans-serif;opacity:.85;margin-top:4px}',
      '.oc-greet-when{font:700 10.5px/1.4 "Inter","Segoe UI",Tahoma,sans-serif;opacity:.75;margin-top:8px;letter-spacing:.3px}',
      /* same block on a WHITE card (login panel) → tinted, readable */
      '.lg-card .oc-greet{background:linear-gradient(135deg,rgba(15,43,70,.06),rgba(15,43,70,.02));',
      'border:1px solid rgba(15,43,70,.12);color:#0f2b46;text-shadow:none}',
      '.lg-card .oc-greet-title{color:var(--oc-deep,#0f2b46)}',
      '.lg-card .oc-greet-ur{color:var(--oc-deep,#0f2b46)}',
      '.lg-card .oc-greet-line{color:#41556b;opacity:1}',
      '.lg-card .oc-greet-when{color:#6b7c8f;opacity:1}',

      /* hero: occasion art replaces the laundry photo */
      '.lg-hero.oc-hero .lg-hero-photo{background-image:var(--oc-art)!important;background-size:var(--oc-art-size,440px 440px)!important;',
      'background-position:var(--oc-art-pos,right bottom)!important;background-repeat:no-repeat!important;background-color:transparent!important}',
      '.lg-hero.oc-hero{background-image:var(--oc-bg,#0b3f80)!important;background-size:cover!important;',
      'background-position:center!important;background-repeat:no-repeat!important;background-color:#0b1c33!important}',
      '.lg-hero.oc-hero .lg-hero-veil{background:linear-gradient(96deg,rgba(4,10,22,.90) 0%,rgba(4,10,22,.70) 38%,',
      'rgba(4,10,22,.28) 68%,rgba(4,10,22,.02) 100%)!important}',
      '.lg-hero.oc-hero .lg-hero-photo{opacity:.95}',

      /* text on the themed hero */
      '.lg-hero.oc-hero .lg-brand-tag,.lg-hero.oc-hero .lg-hero-claim span{color:var(--oc-ink,#fff)!important;opacity:.9}',
      '.lg-hero.oc-hero .lg-headline{color:var(--oc-ink,#fff)!important;text-shadow:0 6px 26px rgba(0,0,0,.35)}',
      '.lg-hero.oc-hero .lg-headline-accent{color:var(--oc-accent,#ffd877)!important}',
      '.lg-hero.oc-hero .lg-subcopy{color:var(--oc-ink,#fff)!important;opacity:.88}',
      '.lg-hero.oc-hero .lg-script{color:var(--oc-accent,#ffd877)!important;opacity:.75}',
      '.lg-hero.oc-hero .lg-feature{background:rgba(255,255,255,.12)!important;border-color:rgba(255,255,255,.22)!important;color:var(--oc-ink,#fff)!important}',
      '.lg-hero.oc-hero .lg-feature-ico{color:var(--oc-accent,#ffd877)!important}',
      '.lg-hero.oc-hero .lg-feature-label{color:var(--oc-ink,#fff)!important;opacity:.95}',
      '.lg-hero.oc-hero .lg-lockup-img{filter:drop-shadow(0 6px 16px rgba(0,0,0,.45));background:#fff;',
      'border-radius:12px;padding:8px 12px}',
      '.lg-hero.oc-hero .lg-band{display:none}',
      '.lg-hero.oc-hero .oc-greet{display:none}',
      /* decoration layer: sized per theme, anchored bottom-right */
      '.lg-hero.oc-hero .lg-hero-photo{background-image:var(--oc-art)!important;background-size:var(--oc-art-size,420px 420px)!important;',
      'background-position:var(--oc-art-pos,right bottom)!important;background-repeat:no-repeat!important;background-color:transparent!important;opacity:.9}',

      /* light themes (Quaid day) need dark text */
      '.oc-light .lg-hero.oc-hero .lg-headline,.oc-light .lg-hero.oc-hero .lg-subcopy,',
      '.oc-light .lg-hero.oc-hero .lg-brand-tag,.oc-light .lg-hero.oc-hero .lg-hero-claim span{color:#2c2210!important}',
      '.oc-light .lg-hero.oc-hero .lg-hero-veil{background:linear-gradient(90deg,rgba(255,252,244,.95) 0%,',
      'rgba(255,252,244,.82) 36%,rgba(255,252,244,.32) 66%,rgba(255,252,244,.04) 92%)!important}',
      '.oc-light .lg-hero.oc-hero .lg-feature{background:rgba(255,255,255,.55)!important;color:#2c2210!important}',
      '.oc-light .oc-chip{background:rgba(255,255,255,.6);border-color:rgba(120,90,20,.35);color:#3a2c10}',

      /* accent touches on the sign-in card */
      '.oc-accent-css .lg-submit{background:var(--oc-accent-strong,#0d8a90)!important}',
      '.oc-accent-css .lg-wm-accent,.oc-accent-css .lg-headline-accent{color:var(--oc-accent,#ffd877)!important}',
      '.oc-accent-css .lg-card{box-shadow:0 24px 70px rgba(10,20,40,.18), inset 0 4px 0 var(--oc-accent,#ffd877)}',
      '.oc-accent-css .lg-input:focus-within{border-color:var(--oc-accent,#0d8a90)!important}',
      /* accent used for TEXT on white cards must stay readable (gold/ivory is not) */
      '.oc-accent-css .lg-forgot{color:#0d8a90!important}',
      '.oc-accent-css .lg-support-phone{color:#0f2b46!important}',
      '.oc-accent-css .lg-support-phone svg{color:#0d8a90!important}',
      '.oc-accent-css .lg-support{background:#f6f9fb!important;border-color:#dbe4ec!important}',

      /* portal + reviews banner */
      '.oc-portal-banner{margin:0 0 14px;padding:12px 14px;border-radius:16px;color:var(--oc-ink,#fff);text-align:center;',
      'background:var(--oc-bg,#0b3f80);background-image:var(--oc-art,none);background-size:var(--oc-art-size,300px 300px);',
      'background-position:right center;background-repeat:no-repeat;border:1px solid rgba(255,255,255,.25);',
      'box-shadow:0 12px 30px rgba(8,16,40,.28);position:relative;overflow:hidden}',
      '.oc-portal-banner .oc-greet-title{font-size:14.5px}',
      '.oc-portal-banner .oc-greet-ur{font-size:15px}',
      '.oc-portal-banner::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,',
      'rgba(0,0,0,.55),rgba(0,0,0,.15) 60%,transparent);pointer-events:none}',
      '.oc-portal-banner>*{position:relative;z-index:1}',
      '.oc-portal-banner.oc-light{color:#2c2210}',
      '.oc-portal-banner.oc-light::before{background:linear-gradient(90deg,rgba(255,255,255,.7),rgba(255,255,255,.25) 60%,transparent)}',
      'body.oc-body-tint .portal-wrap{background:var(--oc-bg,#0b3f80)!important;animation:none}',
      'body.oc-body-tint .portal-wrap::before,body.oc-body-tint .portal-wrap::after{background:rgba(255,255,255,.06)}'
    ].join('');
  }

  /* Global variables + a <style> tag. Called by login, portal, reviews. */
  function apply(act) {
    act = act === undefined ? activeOn() : act;
    var root = document.documentElement;
    var oldStyle = document.getElementById(STYLE_ID);
    if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

    if (!act) {
      root.classList.remove('oc-light', 'oc-accent-css');
      document.body && document.body.classList.remove('oc-body-tint');
      root.style.removeProperty('--oc-bg');
      root.style.removeProperty('--oc-art');
      root.style.removeProperty('--oc-accent');
      root.style.removeProperty('--oc-ink');
      return null;
    }

    var t = resolveArt(act.theme);

    /* Light themes (ivory) keep the same mechanic, just flipped contrast. */
    var isLight = !!t.light;

    var vars = [
      ['--oc-bg', t.bg],
      ['--oc-art', t.art],
      ['--oc-art-size', t.artSize || '440px 440px'],
      ['--oc-art-pos', t.artPos || 'right bottom'],
      ['--oc-accent', t.accent || '#ffd877'],
      ['--oc-accent-strong', isLight ? (t.accent2 || '#0d8a90') : (t.accent2 || t.accent || '#0d8a90')],
      ['--oc-ink', t.ink || '#ffffff'],
      ['--oc-deep', t.light ? '#2c2210' : (t.accent2 || '#0f2b46')],
      ['--oc-theme-name', '"' + (t.name || '') + '"']
    ];
    vars.forEach(function (v) { root.style.setProperty(v[0], v[1]); });

    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = baseCss() + (t.css ? '\n.lg-hero.oc-hero .lg-hero-photo{' + t.css + '}' : '');
    document.head.appendChild(style);

    root.classList.toggle('oc-light', isLight);
    root.classList.add('oc-accent-css');
    if (document.body) document.body.classList.toggle('oc-body-tint', isLight === false && !!document.querySelector('.portal-wrap'));
    return act;
  }

  /* ------------------------------------------------------------
     7. PAGE HELPERS (called from login.js / portal.html / reviews)
     ------------------------------------------------------------ */
  function decorateHero() {
    var hero = document.querySelector('.lg-hero');
    if (!hero) return null;
    var act = activeOn();
    if (!act) { hero.classList.remove('oc-hero'); return null; }
    apply(act);
    hero.classList.add('oc-hero');
    /* small chip under the claim line */
    var top = hero.querySelector('.lg-hero-top');
    if (top && !top.querySelector('.oc-chip')) {
      var wrap = document.createElement('div');
      wrap.style.cssText = 'position:relative;z-index:3;padding:10px 40px 0;';
      wrap.innerHTML = chipHtml(act);
      top.parentNode.insertBefore(wrap, top.nextSibling);
    }
    var md = document.querySelector('meta[name="theme-color"]');
    if (md) md.setAttribute('content', resolveArt(act.theme).accent || '#0b3f80');
    try { document.title = (act.occasion.emoji || '🎉') + ' ' + (act.occasion.name || '') + ' — ' + (settings().shopName || 'Modern Dry Cleaners'); } catch (e) {}
    return act;
  }

  /* Banner for the customer portal / reviews page. */
  function portalBanner(hostSelector) {
    var c = cfg();
    if (!c.showOnPortal) return null;
    var act = activeOn();
    if (!act) return null;
    apply(act);
    var host = document.querySelector(hostSelector || '.portal-wrap');
    if (!host) return act;
    var old = host.querySelector('.oc-portal-banner');
    if (old) old.parentNode.removeChild(old);
    var t = resolveArt(act.theme);
    var div = document.createElement('div');
    div.className = 'oc-portal-banner' + (t.light ? ' oc-light' : '');
    div.innerHTML = greetHtml(act, { lang: c.lang === 'en' ? 'en' : 'ur-both' });
    var anchor = host.querySelector('.portal-header') || host.querySelector('.rev-header') || host.firstElementChild;
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(div, anchor);
    else host.insertBefore(div, host.firstChild);
    return act;
  }

  /* ------------------------------------------------------------
     8. SMALL API
     ------------------------------------------------------------ */
  function themeList() {
    return Object.keys(THEMES).map(function (k) {
      return { id: k, name: THEMES[k].name, accent: THEMES[k].accent, light: !!THEMES[k].light };
    });
  }

  function previewBox(act, opts) {
    opts = opts || {};
    if (!act) return '';
    var t = resolveArt(act.theme);
    var g = greetingText(act);
    var light = t.light ? ' oc-light' : '';
    return '<div class="oc-portal-banner' + light + '" style="--oc-bg:' + t.bg + ';--oc-art:' + t.art.replace(/"/g, "'") +
      ';--oc-art-size:cover;--oc-ink:' + (t.ink || '#fff') +
      ';--oc-accent:' + (t.accent || '#ffd877') + ';text-align:left;">' +
      '<div class="oc-greet-title">' + esc(act.occasion.emoji || '🎉') + ' ' + esc(g.title) + '</div>' +
      '<div class="oc-greet-ur" dir="rtl" lang="ur">' + esc(g.titleUr) + '</div>' +
      '<div class="oc-greet-when">' + esc(chipText(act)) + '</div>' +
      '</div>';
  }

  /* Force a theme for a moment (used by the settings preview button). */
  function simulate(themeId) {
    var c = cfg();
    var fake = { occasion: { id: 'preview', name: (THEMES[themeId] || THEMES.anniversary).name, theme: themeId, emoji: '👁️', date: iso(new Date()), lead: 0 },
                 theme: themeId, start: iso(new Date()), end: iso(new Date()), daysLeft: 0, daysToEvent: 0,
                 isEventDay: true, phase: 'today' };
    return fake;
  }

  function reset() {
    var s = document.getElementById(STYLE_ID);
    if (s) s.parentNode.removeChild(s);
    document.documentElement.classList.remove('oc-light', 'oc-accent-css');
    if (document.body) document.body.classList.remove('oc-body-tint');
    var hero = document.querySelector('.lg-hero');
    if (hero) hero.classList.remove('oc-hero');
    var b = document.querySelectorAll('.oc-portal-banner');
    Array.prototype.forEach.call(b, function (x) { x.parentNode.removeChild(x); });
  }

  return {
    THEMES: THEMES,
    DEFAULT_PLAN: DEFAULT_PLAN,
    GREETINGS: GREETINGS,
    plan: plan,
    config: cfg,
    activeOn: activeOn,
    active: function () { return activeOn(); },
    upcoming: upcoming,
    apply: apply,
    decorateHero: decorateHero,
    portalBanner: portalBanner,
    chipHtml: chipHtml,
    greetHtml: greetHtml,
    chipText: chipText,
    greetingText: greetingText,
    themeList: themeList,
    previewBox: previewBox,
    simulate: simulate,
    reset: reset,
    windowOf: windowOf,
    resolveArt: resolveArt,
    iso: iso,
    addDays: addDays,
    prettyDate: prettyDate
  };
})();
