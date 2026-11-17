/* Transitions between the Designer and Artist portfolios.

   Designer -> Artist (data-portal): one space jump. Space fades in over
   the page and the stars stretch into hyperspace streaks; the artist page
   loads mid-jump, and the streaks slow and fade away over it.

   Artist -> Designer (data-portal="fade"): band wipe matched to the
   reference clip. Nine beige bands sweep in from the left, top row first;
   their shades slide down the stack; then on the designer page
   (?portal=fade) they sweep on and uncover it.

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

  /* ------------- artist -> designer: band wipe ------------- */

  /* Built frame by frame from the reference clip (page pixel transition.mp4).
     Nine horizontal gradient bands form a ladder: the top band slides in
     from the left first and each band below follows a beat later, all on
     the same decelerating curve, so at any moment every band is a step
     shorter than the one above. Timed to the clip, in three motions:
       1. the ladder covers the artist page, left to right;
       2. on the designer page, while it loads underneath, the bands stay
          put and their shades slide down the stack, the dark beige
          travelling from the top band to the bottom;
       3. straight after, the ladder runs in reverse: each band's left
          edge pulls away to the right, top band first, uncovering it.
     Each band runs lighter at the left; the stack starts dark beige at the
     top and near ivory at the bottom. */
  var ROWS = 9;
  var COVER_ROW = 380; /* ms for one band to cross */
  var COVER_STAGGER = 28; /* ms between one band and the next */
  var COVER_EASE = 1.6; /* decelerating: 1 - (1 - u)^n */
  var REVEAL_ROW = 140;
  var REVEAL_STAGGER = 26;
  var HOLD_MIN = 550; /* ms for motion two, as in the clip */
  var COVER_MS = COVER_ROW + COVER_STAGGER * (ROWS - 1);
  var REVEAL_MS = REVEAL_ROW + REVEAL_STAGGER * (ROWS - 1);

  /* the designer background's light and deep tones (light or dark, as the
     visitor left the designer page); the clip's bands span about this much
     either side of its page's background */
  function bandPalette() {
    var dark = false;
    try {
      dark = localStorage.getItem("theme") === "dark";
    } catch (e) {}
    /* one beige: darkest on the top band, each band below a step lighter */
    return dark
      ? { light: [20, 21, 23], hue: [54, 45, 35] }
      : { light: [255, 253, 249], hue: [224, 207, 185] };
  }

  /* k: 0 = ivory (or the dark background), 1 = the full beige */
  function tone(pal, k) {
    k = k < 0 ? 0 : k > 1 ? 1 : k;
    return (
      "rgb(" +
      pal.light
        .map(function (v, i) {
          return Math.round(v + (pal.hue[i] - v) * k);
        })
        .join(",") +
      ")"
    );
  }
  /* depth of the shade at stack position x: the top band (0) the full dark
     beige, each band below a step lighter, mirrored past the ends */
  function shade(x) {
    var span = Math.max(1, ROWS - 1);
    var q = ((x % (2 * span)) + 2 * span) % (2 * span);
    return 1 - ((q <= span ? q : 2 * span - q) / span) * 0.85;
  }
  /* a band's own fill: a touch lighter at its left, as in the clip */
  function bandFill(pal, x) {
    var k = shade(x);
    return [tone(pal, k - 0.08), tone(pal, k + 0.04)];
  }

  /* motion one, on the artist page: drawn on a canvas, row by row */
  function BandFx() {
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
    var pal = bandPalette();

    function px(v) {
      return Math.round(v * dpr);
    }
    function band(r, x0, x1) {
      if (x1 <= x0) return;
      var f = bandFill(pal, r);
      var g = ctx.createLinearGradient(0, 0, c.width, 0);
      g.addColorStop(0, f[0]);
      g.addColorStop(1, f[1]);
      ctx.fillStyle = g;
      var Y = px((r * H) / ROWS),
        Y2 = px(((r + 1) * H) / ROWS);
      ctx.fillRect(px(x0), Y, px(x1) - px(x0), Y2 - Y);
    }
    function clamp(u) {
      return u <= 0 ? 0 : u >= 1 ? 1 : u;
    }
    /* cover, ms since it began: each band grows from the left edge */
    function cover(ms) {
      ctx.clearRect(0, 0, c.width, c.height);
      for (var r = 0; r < ROWS; r++) {
        var u = clamp((ms - r * COVER_STAGGER) / COVER_ROW);
        band(r, 0, W * (1 - Math.pow(1 - u, COVER_EASE)));
      }
    }
    return { el: c, cover: cover };
  }

  /* runs draw(ms elapsed) every frame for ms, then done() */
  function play(ms, draw, done) {
    var begin = performance.now();
    function frame(stamp) {
      var e = Math.min(ms, stamp - begin);
      draw(e);
      if (e < ms) requestAnimationFrame(frame);
      else if (done) done();
    }
    requestAnimationFrame(frame);
  }

  /* Leaving the artist page: motion one, the ladder covers it from the
     left; then straight over to the designer page for motions two and
     three. */
  function dissolveOut(href) {
    busy = true;
    var url = href.replace(/(#.*)?$/, function (hash) {
      return (href.split("#")[0].indexOf("?") > -1 ? "&" : "?") + "portal=fade" + (hash || "");
    });
    var pre = document.createElement("link");
    pre.rel = "prefetch";
    pre.href = href;
    document.head.appendChild(pre);
    var open = document.querySelector(".profile-switch.is-open");
    if (open) open.classList.remove("is-open");

    var fx = BandFx();
    play(COVER_MS, fx.cover, function () {
      /* hand the covered screen to the designer page, which paints it
         before anything else so there is no blank moment */
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

  /* Arriving on the designer page, the moment <body> exists: the same
     nine bands, rebuilt as elements so that motions two and three run on
     the browser's animation timeline. That keeps them exactly on time even
     while the rest of this long page is still being read, so motion three
     follows motion two with no wait at all.

     Motion two: each band is a window onto a column of the shades, which
     slides down by the whole stack, so the dark beige travels from the top
     band to the bottom one - once. Motion three, straight after: the
     ladder runs in reverse, each band leaving to the right, top first. */
  function dissolveIn() {
    var W = window.innerWidth,
      H = window.innerHeight;
    var pal = bandPalette();
    var span = ROWS - 1;
    var wrap = document.createElement("div");
    wrap.className = "portal-veil";
    wrap.setAttribute("aria-hidden", "true");
    wrap.style.cssText += ";overflow:hidden;pointer-events:auto";
    var bands = [];
    for (var r = 0; r < ROWS; r++) {
      var top = Math.round((r * H) / ROWS),
        h = Math.round(((r + 1) * H) / ROWS) - top;
      var b = document.createElement("div");
      b.style.cssText =
        "position:absolute;left:0;width:100%;overflow:hidden;will-change:transform;" +
        "box-sizing:border-box;margin:0;padding:0;top:" +
        top +
        "px;height:" +
        /* a pixel of overlap, so scaled screens never show a seam */
        (h + 1) +
        "px";
      /* the column: the shades of rows r-8 .. r stacked, positioned so the
         window shows row r's own shade to start with */
      var col = document.createElement("div");
      col.style.cssText =
        "position:absolute;left:0;width:100%;will-change:transform;box-sizing:border-box;" +
        "top:" +
        -span * h +
        "px;height:" +
        ROWS * h +
        "px";
      for (var j = 0; j < ROWS; j++) {
        var f = bandFill(pal, r - span + j);
        var s = document.createElement("div");
        s.style.cssText =
          "box-sizing:border-box;height:" + (h + 1) + "px;margin-bottom:-1px;" +
          "background:linear-gradient(90deg," + f[0] + "," + f[1] + ")";
        col.appendChild(s);
      }
      b.appendChild(col);
      wrap.appendChild(b);
      bands.push({ band: b, col: col, h: h });
    }
    document.body.appendChild(wrap);
    root.classList.remove("portal-fade");

    for (var i = 0; i < bands.length; i++) {
      var B = bands[i];
      /* motion two */
      B.col.animate([{ transform: "translateY(0)" }, { transform: "translateY(" + span * B.h + "px)" }], {
        duration: HOLD_MIN,
        easing: "linear",
        fill: "forwards",
      });
      /* motion three: speeding up as it goes (roughly u^1.3) */
      B.band.animate([{ transform: "translateX(0)" }, { transform: "translateX(" + W + "px)" }], {
        duration: REVEAL_ROW,
        delay: HOLD_MIN + i * REVEAL_STAGGER,
        easing: "cubic-bezier(.4,0,.85,.65)",
        fill: "forwards",
      });
    }
    setTimeout(function () {
      wrap.style.pointerEvents = "none";
    }, HOLD_MIN + REVEAL_MS / 3);
    setTimeout(function () {
      wrap.remove();
    }, HOLD_MIN + REVEAL_MS + 60);
  }

  if (mode && !reduce) {
    var run = fading ? dissolveIn : arrive;
    if (document.body) run();
    else if (fading && window.MutationObserver) {
      /* the bands go up the moment <body> exists, long before the rest of
         this large page has been read, so the motion never stalls */
      var watch = new MutationObserver(function () {
        if (!document.body) return;
        watch.disconnect();
        run();
      });
      watch.observe(root, { childList: true });
    } else document.addEventListener("DOMContentLoaded", run);
  }
})();
