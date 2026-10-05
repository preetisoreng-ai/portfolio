/* Page transition between the home page's case study cards and the case
   studies, timed after the menu on delassus.com. The clicked card grows, in
   its own colour and with its own rounded corners, until it fills the
   screen; the title rises into it; the case study then opens as that cover
   lifts away upwards. Going back home plays it in reverse: the title drops
   out and the cover shrinks back into the card you left from, with the page
   scrolled back to where you were.

   The same script runs on every page; it knows the home page by its Case
   Studies section. Where it is going and where it came from travel in
   sessionStorage. It is pasted into each page by inject-page-transition.cjs
   rather than linked, because the single-file build only carries images. */
(function () {
  var KEY = "pt-v2";
  var EASE = "cubic-bezier(0.86, 0, 0.07, 1)";
  var RISE = "cubic-bezier(0.2, 0.8, 0.2, 1)";
  var GROW = 800;
  /* The way back home runs at this fraction of the way in: leaving a case
     study should feel quick, not like a second entrance. */
  var BACK = 0.5;
  var FALLBACK = { bg: "#f3f1ec", fg: "#1c1917" };

  /* The note in <head> (page-transition-head.js) hid the page while it
     loaded; whatever cover is needed is put up below in this same task, so
     nothing paints in between. */
  document.documentElement.classList.remove("pt-wait");
  document.documentElement.style.removeProperty("background");
  /* Anything below that wants the early cover takes it synchronously; if
     nothing did, it must not be left standing. */
  setTimeout(function () {
    var stray = document.querySelector(".pt-root[data-early]");
    if (stray) stray.remove();
  }, 0);

  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    try {
      sessionStorage.removeItem(KEY);
    } catch (e) {}
    return;
  }

  var home = document.getElementById("featured-works");

  function load() {
    try {
      return JSON.parse(sessionStorage.getItem(KEY) || "null");
    } catch (e) {
      return null;
    }
  }
  function save(v) {
    try {
      if (v) sessionStorage.setItem(KEY, JSON.stringify(v));
      else sessionStorage.removeItem(KEY);
    } catch (e) {}
  }

  /* Dark writing on a light card, light writing on a dark one. */
  function inkFor(colour) {
    var m = String(colour).match(/\d+(\.\d+)?/g);
    if (!m || m.length < 3) return FALLBACK.fg;
    var lum = (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255;
    return lum > 0.55 ? "#1c1917" : "#f5f5f4";
  }

  /* ---------- Geometry ---------- */

  function box(el, radius) {
    var r = el.getBoundingClientRect();
    return { t: r.top, l: r.left, b: r.bottom, r: r.right, round: radius || 0 };
  }
  function clip(b) {
    if (!b) return "inset(0px 0px 0px 0px round 0px)";
    var w = window.innerWidth;
    var h = window.innerHeight;
    return (
      "inset(" +
      b.t.toFixed(1) +
      "px " +
      (w - b.r).toFixed(1) +
      "px " +
      (h - b.b).toFixed(1) +
      "px " +
      b.l.toFixed(1) +
      "px round " +
      b.round +
      "px)"
    );
  }
  /* Nothing left but a sliver along the top edge. */
  var LIFTED = "inset(0px 0px 100% 0px round 0px)";

  /* ---------- The overlay ---------- */

  function line(text, css) {
    var el = document.createElement("span");
    el.textContent = text;
    el.style.cssText = "display:block;will-change:transform,opacity;opacity:0;" + css;
    return el;
  }

  function overlay(s) {
    /* Arriving: the note in <head> already put this cover up. */
    var early = document.querySelector(".pt-root[data-early]");
    if (early) {
      early.removeAttribute("data-early");
      return { root: early, lines: [].slice.call(early.querySelectorAll("span")) };
    }
    var root = document.createElement("div");
    root.className = "pt-root";
    root.setAttribute("aria-hidden", "true");
    root.style.cssText =
      "position:fixed;inset:0;z-index:2147483000;pointer-events:auto;overflow:hidden;" +
      "background:" +
      (s.bg || FALLBACK.bg) +
      ";color:" +
      (s.fg || FALLBACK.fg) +
      ";" +
      "clip-path:" +
      clip(null) +
      ";will-change:clip-path;";
    var text = document.createElement("div");
    text.style.cssText =
      "position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;" +
      "justify-content:center;gap:16px;padding:0 24px;text-align:center;";
    var lines = [
      line(
        s.label || "",
        'font:500 12px/1 Arial,"Helvetica Neue",Helvetica,sans-serif;letter-spacing:.2em;text-transform:uppercase;'
      ),
      line(
        s.title || "",
        'font:400 clamp(2.4rem,6vw,5rem)/1.05 Georgia,"Times New Roman",serif;letter-spacing:-.015em;'
      ),
    ];
    lines.forEach(function (l) {
      text.appendChild(l);
    });
    root.appendChild(text);
    document.documentElement.appendChild(root);
    return { root: root, lines: lines };
  }

  function shown(l, i) {
    return i ? 1 : 0.6;
  }

  function cover(o) {
    o.root.style.clipPath = clip(null);
    o.lines.forEach(function (l, i) {
      l.style.opacity = shown(l, i);
    });
  }

  /* The card opens out to the edges, then the words rise in one after the
     other. */
  function grow(o, from, k) {
    k = k || 1;
    o.root.style.clipPath = clip(from);
    o.root.animate([{ clipPath: clip(from) }, { clipPath: clip(null) }], {
      duration: GROW * k,
      easing: EASE,
      fill: "forwards",
    });
    o.lines.forEach(function (l, i) {
      l.animate(
        [
          { transform: "translateY(90px)", opacity: 0 },
          { transform: "none", opacity: shown(l, i) },
        ],
        { duration: 700 * k, delay: (380 + i * 90) * k, easing: RISE, fill: "both" }
      );
    });
    return new Promise(function (done) {
      setTimeout(done, (GROW + 180) * k);
    });
  }

  /* The words leave, then the cover either folds back into a card (`into`)
     or lifts off the top of the screen. */
  function release(o, into, k) {
    k = k || 1;
    cover(o);
    var back = !!into;
    var off = back ? "translateY(90px)" : "translateY(-70px)";
    var n = o.lines.length;
    o.lines.forEach(function (l, i) {
      l.animate(
        [
          { transform: "none", opacity: shown(l, i) },
          { transform: off, opacity: 0 },
        ],
        { duration: 450 * k, delay: (back ? n - 1 - i : i) * 70 * k, easing: EASE, fill: "forwards" }
      );
    });
    var end = back ? clip(into) : LIFTED;
    var a = o.root.animate([{ clipPath: clip(null) }, { clipPath: end }], {
      duration: GROW * k,
      delay: 260 * k,
      easing: EASE,
      fill: "forwards",
    });
    o.root.style.pointerEvents = "none";
    /* The card underneath is already there; fading the copy out over the
       last moment hides the seam between the two. */
    if (back) {
      o.root.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 160 * k,
        delay: (260 + GROW - 120) * k,
        fill: "forwards",
      });
    }
    a.onfinish = function () {
      o.root.remove();
    };
  }

  /* Follow the link once the cover is up. Clicking it again, flagged, lets
     the browser (or the single-file build's router) take it from there. */
  function go(a) {
    a.__pt = true;
    a.click();
    setTimeout(function () {
      a.__pt = false;
    }, 0);
  }

  function plain(e) {
    return !(e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey);
  }

  /* After the page has its styles and fonts in place, so positions are real. */
  function settled(fn) {
    function next() {
      requestAnimationFrame(function () {
        requestAnimationFrame(fn);
      });
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", next);
    else next();
  }

  function radiusOf(el) {
    return parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
  }

  /* The colour the page shows up top: whatever paints behind the middle of
     the first screen, looking past the cover and past pictures to the first
     thing with a background of its own. */
  function pageTint() {
    var x = window.innerWidth / 2;
    var y = Math.min(window.innerHeight * 0.3, 260);
    var hits = document.elementsFromPoint ? document.elementsFromPoint(x, y) : [];
    for (var i = 0; i < hits.length; i++) {
      if (hits[i].closest(".pt-root")) continue;
      for (var el = hits[i]; el && el.nodeType === 1; el = el.parentElement) {
        var c = getComputedStyle(el).backgroundColor;
        var m = c.match(/[\d.]+/g);
        if (m && (m.length < 4 || +m[3] > 0.5)) return c;
      }
    }
    return getComputedStyle(document.body).backgroundColor || FALLBACK.bg;
  }

  /* Cross-fade the cover (and its writing) from one colour to another. */
  var MORPH = 650;
  function morph(o, from, to, k) {
    k = k || 1;
    if (!from || !to || from === to) return 0;
    o.root.style.background = to;
    o.root.style.color = inkFor(to);
    o.root.animate(
      [
        { backgroundColor: from, color: inkFor(from) },
        { backgroundColor: to, color: inkFor(to) },
      ],
      { duration: MORPH * k, easing: "cubic-bezier(0.65, 0, 0.35, 1)" }
    );
    return MORPH * k;
  }

  /* A cover in the colour it left the case study in, if it has been to one. */
  function returning(s) {
    var start = {};
    for (var k in s) start[k] = s[k];
    if (s.page) {
      start.bg = s.page;
      start.fg = inkFor(s.page);
    }
    return overlay(start);
  }

  /* ---------- Home ---------- */

  if (home) {
    var cards = home.querySelectorAll(".cs-card");

    window.addEventListener(
      "click",
      function (e) {
        var a = e.target.closest && e.target.closest("#featured-works .cs-card");
        if (!a || a.__pt || !plain(e)) return;
        e.preventDefault();
        e.stopPropagation();
        var bg = getComputedStyle(a).backgroundColor;
        var num = a.querySelector(".cs-meta span");
        var h3 = a.querySelector("h3");
        var s = {
          idx: Array.prototype.indexOf.call(cards, a),
          y: window.scrollY,
          bg: bg,
          fg: inkFor(bg),
          label: "Case study " + (num ? num.textContent.trim() : ""),
          title: h3 ? h3.textContent.trim() : "",
        };
        save(s);
        grow(overlay(s), box(a, radiusOf(a))).then(function () {
          go(a);
        });
      },
      true
    );

    function arrive(o, s) {
      cover(o);
      save(null);
      settled(function () {
        if (s && typeof s.y === "number")
          window.scrollTo({ top: s.y, left: 0, behavior: "instant" });
        requestAnimationFrame(function () {
          var card = s && cards[s.idx];
          /* Back from the case study's own colour to the card's, then
             into the card. */
          var wait = morph(o, s && s.page, s && s.bg, BACK);
          setTimeout(function () {
            release(o, card && !card.hidden ? box(card, radiusOf(card)) : null, BACK);
          }, wait * 0.55);
        });
      });
    }

    var back = load();
    if (back) arrive(returning(back), back);

    /* Back button with the page kept in memory: it comes back exactly as it
       was left, cover and all. */
    window.addEventListener("pageshow", function (e) {
      if (!e.persisted) return;
      var left = document.querySelector(".pt-root");
      if (!left) return;
      left.remove();
      var s = load() || {};
      arrive(returning(s), s);
    });
    return;
  }

  /* ---------- A case study ---------- */

  var came = load();
  if (came && came.stage !== "in") {
    var o = overlay(came);
    cover(o);
    came.stage = "in";
    save(came);
    settled(function () {
      setTimeout(function () {
        /* Turn from the card's colour to this page's own, then lift. */
        var page = pageTint();
        came.page = page;
        save(came);
        var wait = morph(o, came.bg, page);
        setTimeout(function () {
          release(o, null);
        }, wait * 0.55);
      }, 80);
    });
  }

  window.addEventListener(
    "click",
    function (e) {
      var a =
        e.target.closest &&
        e.target.closest('a[href$="/index.html"], a[href="index.html"], a[data-page-link="home"]');
      if (!a || a.__pt || !plain(e)) return;
      e.preventDefault();
      e.stopPropagation();
      var s = load() || {};
      var h1 = document.querySelector("h1");
      s.label = s.label || "Case study";
      s.title = s.title || (h1 ? h1.textContent.trim() : document.title.split(/\s[—|-]\s/)[0]);
      s.stage = "back";
      /* Leave in this page's colour; home turns it back into the card's. */
      s.page = s.page || pageTint();
      save(s);
      grow(returning(s), box(a, 12), BACK).then(function () {
        go(a);
      });
    },
    true
  );

  window.addEventListener("pageshow", function (e) {
    if (!e.persisted) return;
    var left = document.querySelector(".pt-root");
    if (left) left.remove();
  });
})();
