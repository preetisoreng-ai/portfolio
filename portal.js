/* Transitions between the Designer and Artist portfolios.

   Designer -> Artist (data-portal): one space jump. Space fades in over
   the page and the stars stretch into hyperspace streaks; the artist page
   loads mid-jump, and the streaks slow and fade away over it.

   Artist -> Designer (data-portal="fade"): green grid pixel wipe. Blocks in
   the emerald of the designer hero's grid step in from the top-right corner
   over the artist page, then on the designer page (?portal=fade) break down
   into its 20px grid and fade into it; the content then fades in on top.

   Loaded in <head> on both pages so an arriving page can hide itself
   before it paints. The arriving side is told by ?portal=in, which is
   removed from the address straight away. Reduced motion: plain navigation. */
(function () {
  /* the arriving page's colour for the instant before the streaks are drawn */
  var LIGHT = "#000";
  var SPACE = "#000";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mode = (/[?&]portal=(in|fade)\b/.exec(location.search) || [])[1] || "";
  var arriving = mode === "in";
  var fading = mode === "fade";
  var root = document.documentElement;
  /* the designer page's background, light or dark as the visitor left it */
  function designerBg() {
    var dark = false;
    try {
      dark = localStorage.getItem("theme") === "dark";
    } catch (e) {}
    return dark ? "#141517" : "#fbf9f7";
  }

  var css =
    "html.portal-in{background:" +
    LIGHT +
    "}" +
    "html.portal-in body{visibility:hidden}" +
    "html.portal-fade{background:" +
    designerBg() +
    "}" +
    "html.portal-fade body{visibility:hidden}" +
    /* the designer's content waits until its background has shown */
    "html.portal-stage body>:not(#productPortfolioView):not(.portal-fx)," +
    "html.portal-stage #productPortfolioView>:not(#hero)," +
    "html.portal-stage #hero>:not(#heroGrid){opacity:0}" +
    ".portal-veil{position:fixed;inset:0;z-index:2147483000;pointer-events:none;visibility:visible}" +
    ".portal-fx{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483000;" +
    "pointer-events:none;visibility:visible}" +
    ".portal-fx.is-blocking{pointer-events:auto;cursor:progress}";
  if (fading) {
    try {
      var shot = sessionStorage.getItem("portal-grid");
      sessionStorage.removeItem("portal-grid");
      if (shot && /^data:image\/png;base64,[A-Za-z0-9+\/=]+$/.test(shot))
        css +=
          'html.portal-fade{background-image:url("' +
          shot +
          '");background-size:100vw 100vh;background-repeat:no-repeat;background-attachment:fixed}';
    } catch (e) {}
  }
  var style = document.createElement("style");
  style.textContent = css;
  (document.head || root).appendChild(style);

  if (mode) {
    try {
      var clean = location.href
        .replace(/([?&])portal=[^&#]*/g, "$1")
        .replace(/[?&]+(?=#|$)/, "")
        .replace(/\?&+/, "?")
        .replace(/&&+/g, "&");
      history.replaceState(history.state, "", clean);
    } catch (e) {}
    if (!reduce) root.classList.add(fading ? "portal-fade" : "portal-in");
    if (!reduce && fading) root.classList.add("portal-stage");
  }

  /* ---------------------------------------------------------------- */

  function easeIn(t) {
    return t * t * t;
  }
  function easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
  }
  function clamp(t) {
    return t < 0 ? 0 : t > 1 ? 1 : t;
  }

  function makeCanvas() {
    var c = document.createElement("canvas");
    c.className = "portal-fx is-blocking";
    c.setAttribute("aria-hidden", "true");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = window.innerWidth;
    var H = window.innerHeight;
    c.width = Math.round(W * dpr);
    c.height = Math.round(H * dpr);
    var ctx = c.getContext("2d");
    ctx.scale(dpr, dpr);
    document.body.appendChild(c);
    return { el: c, ctx: ctx, W: W, H: H };
  }

  /* Hyperdrive starfield, after the reference loop: pure black, white and
     grey streaks of every length, a few bright ones with a soft glow, and
     the vanishing point left dark. */
  function Stars(W, H) {
    var n = Math.round(Math.min(1400, (W * H) / 900));
    var list = [];
    for (var i = 0; i < n; i++) list.push(spawn(Math.random()));
    function spawn(z) {
      var r = Math.random();
      return {
        x: (Math.random() * 2 - 1) * W,
        y: (Math.random() * 2 - 1) * H,
        z: z || 1,
        /* most are dim grey dust, some white, a few bright with glow */
        b: r < 0.06 ? 1 : r < 0.35 ? 0.85 : 0.35 + Math.random() * 0.35,
        g: r < 0.06,
        w: r < 0.06 ? 1.5 : 0.6 + Math.random() * 0.7,
      };
    }
    return {
      /* cx, cy: vanishing point; speed: depth per second; stretch: streak length */
      draw: function (ctx, cx, cy, speed, dt, stretch) {
        var f = Math.max(W, H) * 0.5;
        ctx.lineCap = "round";
        for (var i = 0; i < list.length; i++) {
          var s = list[i];
          s.z -= speed * dt;
          if (s.z <= 0.02) {
            list[i] = spawn(1);
            continue;
          }
          var x = cx + (s.x / s.z) * (f / W);
          var y = cy + (s.y / s.z) * (f / H);
          if (x < -80 || x > W + 80 || y < -80 || y > H + 80) {
            list[i] = spawn(1);
            continue;
          }
          var zt = Math.min(1, s.z + Math.max(speed * stretch, 0.002));
          var px = cx + (s.x / zt) * (f / W);
          var py = cy + (s.y / zt) * (f / H);
          /* fade in from the dark centre */
          var a = Math.min(1, (1 - s.z) * 1.8) * s.b;
          var v = Math.round(200 + 55 * s.b);
          ctx.strokeStyle = "rgba(" + v + "," + v + "," + v + "," + a + ")";
          ctx.lineWidth = Math.max(0.5, (1 - s.z) * 2.2 * s.w);
          if (s.g) {
            ctx.shadowColor = "rgba(255,255,255,0.9)";
            ctx.shadowBlur = 10;
          }
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(x, y);
          ctx.stroke();
          if (s.g) ctx.shadowBlur = 0;
        }
      },
    };
  }

  /* Black, with a faint smoky haze drifting near the edges. */
  function drawSpace(ctx, W, H, cx, cy, t) {
    ctx.fillStyle = SPACE;
    ctx.fillRect(0, 0, W, H);
    var R = Math.max(W, H);
    for (var i = 0; i < 3; i++) {
      var ang = i * 2.1 + t * 0.4;
      var x = cx + Math.cos(ang) * R * 0.38;
      var y = cy + Math.sin(ang) * R * 0.3;
      var g = ctx.createRadialGradient(x, y, 0, x, y, R * 0.45);
      g.addColorStop(0, "rgba(255,255,255,0.035)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
  }

  /* ---------------- leaving: open the portal and jump ---------------- */

  var busy = false;

  function jump(href) {
    busy = true;
    var url = href + (href.indexOf("?") > -1 ? "&" : "?") + "portal=in";
    var hash = "";
    var h = href.indexOf("#");
    if (h > -1) {
      hash = href.slice(h);
      href = href.slice(0, h);
      url = href + (href.indexOf("?") > -1 ? "&" : "?") + "portal=in" + hash;
    }
    var pre = document.createElement("link");
    pre.rel = "prefetch";
    pre.href = href;
    document.head.appendChild(pre);

    var cv = makeCanvas();
    var ctx = cv.ctx,
      W = cv.W,
      H = cv.H;
    var stars = Stars(W, H);
    var OPEN = 420,
      WARP = 950;
    /* leave at full speed, mid-jump: no fade to dark */
    var total = OPEN + WARP;
    var start = performance.now();
    var last = start;
    var gone = false;

    function frame(now) {
      var e = now - start;
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      var tSec = e / 1000;
      var pOpen = clamp(e / OPEN);
      var pWarp = clamp((e - OPEN * 0.6) / WARP);

      var cx = W / 2;
      var cy = H / 2;
      /* a little shake once the jump kicks in */
      var shake = pWarp > 0.4 ? (pWarp - 0.4) * 5 : 0;
      var sx = (Math.random() - 0.5) * shake;
      var sy = (Math.random() - 0.5) * shake;

      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.translate(sx, sy);
      drawSpace(ctx, W, H, cx, cy, tSec);
      var speed = 0.12 + easeIn(pWarp) * 3.4;
      stars.draw(ctx, cx, cy, speed, dt, 0.02 + easeIn(pWarp) * 0.06);
      ctx.restore();

      /* space fades in over the whole page */
      if (pOpen < 1) {
        ctx.globalCompositeOperation = "destination-in";
        ctx.fillStyle = "rgba(0,0,0," + easeOut(pOpen) + ")";
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = "source-over";
      }

      if (e >= total) {
        if (!gone) {
          gone = true;
          location.href = url;
        }
        return;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    /* Coming back with the back button: drop the overlay. */
    window.addEventListener("pageshow", function (ev) {
      if (ev.persisted && cv.el.parentNode) {
        cv.el.remove();
        busy = false;
      }
    });
  }

  document.addEventListener(
    "click",
    function (e) {
      var a = e.target.closest && e.target.closest("a[data-portal]");
      if (!a) return;
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      if (reduce) return;
      e.preventDefault();
      e.stopPropagation();
      if (busy) return;
      if (a.getAttribute("data-portal") === "fade") dissolveOut(a.href);
      else jump(a.href);
    },
    true
  );

  /* ---------------- arriving: out of hyperspace ---------------- */

  /* The jump carries straight on into the artist page: the streaks are
     still flying when it appears, then slow and fade away over it. No
     dark pause in between. */
  function arrive() {
    var cv = makeCanvas();
    var ctx = cv.ctx,
      W = cv.W,
      H = cv.H;
    var stars = Stars(W, H);
    var cx = W / 2,
      cy = H / 2;
    var EXIT = 700;
    var start = performance.now();
    var last = start;
    root.classList.remove("portal-in");

    function frame(now) {
      var e = now - start;
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      var p = clamp(e / EXIT);
      var speed = 3.5 * (1 - easeOut(p)) + 0.12;

      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, W, H);
      drawSpace(ctx, W, H, cx, cy, e / 1000);
      stars.draw(ctx, cx, cy, speed, dt, 0.02 + 0.06 * (1 - easeOut(p)));
      /* the page shows through as we drop out of the jump */
      ctx.globalCompositeOperation = "destination-in";
      ctx.fillStyle = "rgba(0,0,0," + (1 - easeOut(p)) + ")";
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "source-over";
      if (p > 0.2) cv.el.classList.remove("is-blocking");
      if (p >= 1) {
        cv.el.remove();
        return;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ------------- artist -> designer: green grid pixel wipe ------------- */

  /* Pixel blocks tinted with the emerald of the designer hero's grid step in
     from the top-right corner over the artist page. On the designer page the
     same blocks break down 80 -> 40 -> 20px, the size of the page's own grid
     cells, lined up on its grid lines, and fade into it. The page's
     background shows first; its content then fades in on top. */
  var CELL = 20; /* the hero grid's cell */
  var BIG = 80;

  function gridPalette() {
    var dark = false;
    try {
      dark = localStorage.getItem("theme") === "dark";
    } catch (e) {}
    var paper = dark ? [20, 21, 23] : [251, 249, 247];
    var green = [16, 185, 129];
    var mixes = dark
      ? [0.07, 0.1, 0.13, 0.17, 0.21]
      : [0.06, 0.1, 0.14, 0.19, 0.25];
    var tints = mixes.map(function (k) {
      return (
        "rgb(" +
        paper
          .map(function (c, i) {
            return Math.round(c + (green[i] - c) * k);
          })
          .join(",") +
        ")"
      );
    });
    return {
      tints: tints,
      line: dark ? "rgba(16,185,129,0.32)" : "rgba(16,185,129,0.45)",
    };
  }

  /* the same block gets the same tint on both pages */
  function hash(a, b, c) {
    var h =
      (Math.imul(a, 374761393) +
        Math.imul(b, 668265263) +
        Math.imul(c, 1442695041)) |
      0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function GridFx() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = window.innerWidth,
      H = window.innerHeight;
    var c = document.createElement("canvas");
    c.className = "portal-fx is-blocking";
    c.setAttribute("aria-hidden", "true");
    c.width = Math.round(W * dpr);
    c.height = Math.round(H * dpr);
    document.body.appendChild(c);
    var ctx = c.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var pal = gridPalette();
    /* where the page's grid lines start (0..19) */
    var ox = 0,
      oy = 0;
    /* the grid is pinned to the page's grid line nearest the right edge, so
       it grows and shrinks from the top-right corner */
    function anchorX() {
      return ox + Math.floor((W - ox) / CELL) * CELL;
    }

    /* cell i (counting leftwards from the anchor), row j, at size s */
    function cell(i, j, s, alpha) {
      var x = anchorX() - (i + 1) * s,
        y = oy + j * s;
      var k = hash(i, j, 0);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = pal.tints[Math.floor(k * pal.tints.length)];
      /* a hair of overlap so neighbours never show a seam while they move */
      ctx.fillRect(x - 0.5, y, s + 0.5, s + 0.5);
      ctx.fillStyle = pal.line;
      ctx.fillRect(x, y, 1, s);
      ctx.fillRect(x, y, s, 1);
    }
    /* 0 at the top-right corner, 1 at the bottom-left */
    function dist(x, y) {
      return ((W - x) / W) * 0.55 + (y / H) * 0.45;
    }
    function smooth(t) {
      return t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
    }
    function ease(t) {
      t = t <= 0 ? 0 : t >= 1 ? 1 : t;
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    /* every cell of size s that touches the screen, right edge and top row
       first; one extra column past the anchor covers the strip beside it */
    function each(s, fn) {
      var ax = anchorX();
      var cols = Math.ceil(ax / s) + 1,
        rows = Math.ceil((H - oy) / s) + 1;
      for (var j = oy > 0 ? -1 : 0; j < rows; j++)
        for (var i = -1; i < cols; i++) fn(i, j, ax - (i + 1) * s, oy + j * s);
    }

    /* cover: whole 80px blocks switch on from the top right */
    function cover(p) {
      ctx.clearRect(0, 0, W, H);
      each(BIG, function (i, j, x, y) {
        if (p * 1.15 >= dist(x + BIG, y) + 0.05) cell(i, j, BIG, 1);
      });
      ctx.globalAlpha = 1;
    }
    /* morph: the whole grid shrinks smoothly from 80px blocks to the page's
       20px cells, pinned at the top right, so the screen stays covered the
       whole way; the cells then fade into the page's own grid lines */
    function morph(p) {
      ctx.clearRect(0, 0, W, H);
      var s = BIG - (BIG - CELL) * ease(p / 0.55);
      each(s, function (i, j, x, y) {
        var a = 1 - smooth((p - 0.45 - dist(x + s / 2, y + s / 2) * 0.3) / 0.25);
        if (a > 0) cell(i, j, s, a);
      });
      ctx.globalAlpha = 1;
    }
    return {
      el: c,
      cover: cover,
      morph: morph,
      origin: function (x, y) {
        ox = ((Math.round(x) % CELL) + CELL) % CELL;
        oy = ((Math.round(y) % CELL) + CELL) % CELL;
      },
    };
  }

  function play(ms, draw, done) {
    var begin = performance.now();
    function frame(now) {
      var p = Math.min(1, (now - begin) / ms);
      draw(p);
      if (p < 1) requestAnimationFrame(frame);
      else if (done) done();
    }
    requestAnimationFrame(frame);
  }

  /* Leaving the artist page: green blocks step over it from the top right. */
  function dissolveOut(href) {
    busy = true;
    var url = href.replace(/(#.*)?$/, function (hash) {
      return (
        (href.split("#")[0].indexOf("?") > -1 ? "&" : "?") +
        "portal=fade" +
        (hash || "")
      );
    });
    var pre = document.createElement("link");
    pre.rel = "prefetch";
    pre.href = href;
    document.head.appendChild(pre);
    var open = document.querySelector(".profile-switch.is-open");
    if (open) open.classList.remove("is-open");

    var fx = GridFx();
    play(720, fx.cover, function () {
      /* hand the covered screen to the designer page, which paints it
         before anything else so there is no blank moment while it loads */
      try {
        sessionStorage.setItem("portal-grid", fx.el.toDataURL("image/png"));
      } catch (e) {}
      location.href = url;
    });
    window.addEventListener("pageshow", function (ev) {
      if (!ev.persisted) return;
      fx.el.remove();
      busy = false;
    });
  }

  /* What fades in once the background is showing: the header and the hero's
     pieces, big wrappers split into their children so nothing arrives as
     one slab. */
  function stageUnits() {
    var W = window.innerWidth,
      H = window.innerHeight,
      big = W * H * 0.3;
    var out = [];
    function add(el, depth) {
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height || r.bottom < 0 || r.top > H) return;
      if (r.width * r.height > big && depth < 3 && el.children.length) {
        for (var i = 0; i < el.children.length; i++)
          add(el.children[i], depth + 1);
        return;
      }
      out.push({
        el: el,
        d:
          ((W - (r.left + r.right) / 2) / W) * 0.55 +
          ((r.top + r.bottom) / 2 / H) * 0.45,
      });
    }
    var kids = document.body.children;
    for (var i = 0; i < kids.length; i++) {
      var k = kids[i];
      if (k.id === "productPortfolioView") {
        var hero = document.getElementById("hero");
        if (hero)
          for (var j = 0; j < hero.children.length; j++)
            if (hero.children[j].id !== "heroGrid") add(hero.children[j], 1);
      } else if (
        !/^(SCRIPT|STYLE|LINK|NOSCRIPT)$/.test(k.tagName) &&
        !k.classList.contains("portal-fx")
      )
        add(k, 1);
    }
    return out;
  }

  /* Arriving on the designer page: under the same blocks, with its content
     held back. The blocks morph down into the page's grid, then the content
     fades in on top, top right first. */
  function dissolveIn() {
    var fx = GridFx();
    fx.cover(1);
    root.classList.remove("portal-fade");
    var started = false;
    function go() {
      if (started) return;
      started = true;
      var g = document.getElementById("heroGrid");
      if (g) {
        var r = g.getBoundingClientRect();
        fx.origin(r.left, r.top);
      }
      var MORPH = 1150;
      play(MORPH, fx.morph, function () {
        fx.el.remove();
      });
      setTimeout(function () {
        fx.el.classList.remove("is-blocking");
        var units = stageUnits();
        for (var i = 0; i < units.length; i++)
          units[i].el.animate(
            [
              { opacity: 0, transform: "translateY(14px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            {
              duration: 700,
              delay: units[i].d * 520,
              easing: "cubic-bezier(.2,.7,.2,1)",
              fill: "backwards",
              composite: "add",
            },
          );
        root.classList.remove("portal-stage");
      }, MORPH * 0.6);
    }
    if (document.readyState === "complete") requestAnimationFrame(go);
    else {
      window.addEventListener("load", function () {
        requestAnimationFrame(go);
      });
      setTimeout(go, 1200);
    }
  }

  if (mode && !reduce) {
    var run = fading ? dissolveIn : arrive;
    if (document.body) run();
    else document.addEventListener("DOMContentLoaded", run);
  }
})();
