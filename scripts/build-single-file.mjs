/**
 * Collapses the thirteen-page portfolio plus its 184-file `assets` folder into a
 * single self-contained HTML file that can be dragged into GitHub on its own.
 *
 * Why not simply concatenate the pages into one document: `index.html` styles
 * itself with the Tailwind v3 CDN at runtime, while the eleven case studies
 * ship a compiled Tailwind v4 stylesheet. Put both in one document and the two
 * sets of rules overwrite each other. So each page keeps its own document and
 * renders inside a viewport-sized iframe; a hash router in the shell swaps
 * which one is mounted. Nothing about a page's own CSS, ids or scripts has to
 * change, so every page renders exactly as it does today.
 *
 * Size is the other half of the problem. Every asset is re-encoded to WebP at
 * twice the width it is actually painted, and stored once in the shell; the
 * pages carry `{{key}}` where a picture goes and fill it in themselves once
 * parsed. A photo shown four times, or shared by four pages, costs its bytes
 * once — and the frame never has to parse a document with megabytes of base64
 * inside it, which is the difference between the home page appearing in about a
 * second and taking four.
 *
 * Run it from anywhere:  node v6-2026-08-28/scripts/build-single-file.mjs
 * It needs `sharp`, which the repository already has.
 */
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = path.join(root, "assets");
const outDir = path.join(root, "github-upload");

/** Home first, then the case studies in the order the work section lists them. */
const ORDER = [
  "index",
  "decision-flow",
  "aura",
  "collaborator",
  "notification",
  "user-management",
  "studios",
  "building-with-ai",
  "claude-cli",
  "bolt",
  "lovable",
  "claude-desktop",
  "boring-ui",
  "scavvy",
];
const slugOf = (name) => (name === "index" ? "home" : name);

/**
 * How wide each image is worth storing.
 *
 * These are twice the widest each one is ever painted, measured in the browser
 * across all twelve pages with every lightbox and modal open, then rounded up
 * to a multiple of 64 and capped at the 1512px design canvas. Twice, so the
 * picture still holds up on a retina screen. Anything not listed here was not
 * caught by that sweep and keeps the full canvas width.
 *
 * It is worth a table rather than one number because the range is enormous: the
 * book spines on the shelf are painted 38px wide and were shipping at 560.
 */
const CAP = {
  "csImage79.png": 1512,
  "csUserInterviewStickies.png": 1512,
  "csFig1A.png": 1512,
  "csIconHandshake.png": 256,
  "csFig1B.png": 1512,
  "csFig1C.png": 1512,
  "csFig2A.png": 1512,
  "csFig2B.png": 1512,
  "csPersonaSarah.jpg": 704,
  "csPersonaHarshad.jpg": 704,
  "csPersonaAryan.jpg": 704,
  "imgImage103.png": 1512,
  "imgImage98.png": 704,
  "colHero.png": 1512,
  "colAvatarSender.png": 256,
  "colFigA.png": 1512,
  "colFigB.png": 1280,
  "colAvatarReceiver.png": 256,
  "colFigC.png": 1512,
  "colFigD.png": 1280,
  "colFigE.png": 1280,
  "notifHero.png": 1512,
  "notifFig1.png": 1280,
  "notifFig2.png": 1280,
  "notifFig3.png": 1280,
  "umHero.png": 1512,
  "umTree.png": 1344,
  "umFig1.png": 1280,
  "umFig2.png": 1280,
  "umFig3.png": 1280,
  "umFig4.png": 1280,
  "studHero.png": 1512,
  "studFig1.png": 1472,
  "studFig2.png": 1472,
  "studFig3.png": 1344,
  "studFig4.png": 1344,
  "aiHero.jpg": 1512,
  "aiWorkflow.png": 1512,
  "aiShot1.png": 960,
  "aiLogo1.png": 256,
  "aiShot2.png": 960,
  "aiLogo2.png": 256,
  "aiShot3.png": 960,
  "aiLogo3.png": 256,
  "aiShot4.png": 960,
  "aiLogo4.png": 256,
  "aiCardDecisionFlow.png": 704,
  "cliHero.png": 1512,
  "cliStack.png": 896,
  "cliSecrets.png": 1152,
  "cliNetlify.png": 256,
  "boltHero.png": 1512,
  "boltStack.png": 448,
  "boltServices.png": 960,
  "lovableHero.png": 1512,
  "lovableStack.png": 640,
  "lovableWorkflow.png": 1512,
  "desktopHero.png": 1512,
  "desktopStack.png": 832,
  "desktopSupabase.png": 960,
  "desktopEdgeFunctions.png": 1512,
  "scavvyHero.png": 1512,
  "scavvyStep1a.png": 576,
  "scavvyStep1b.png": 576,
  "scavvyStep2.png": 512,
  "scavvyStep3.png": 512,
  "scavvyStep4.png": 512,
  "scavvyStep5.png": 512,
  "scavvyStep6.png": 512,
  "scavvyStep7.png": 512,
  "scavvyStep8.png": 512,
  "scavvyStep9.png": 512,
  "scavvyStep10.png": 512,
  "scavvyStep11.png": 512,
  "scavvyStep12.png": 512,
  "scavvyStep13.png": 512,
  "imgRectangle56.png": 320,
  "imgRectangle60.jpg": 384,
  "imgCreatingElevatedExperienceValueAward135152281.png": 1088,
  "books/design-everyday-things.jpg": 256,
  "books/emotional-design.jpg": 256,
  "books/100-things-designer.jpg": 256,
  "books/lean-ux.jpg": 256,
  "books/hooked.jpg": 256,
  "books/steal-like-an-artist.jpg": 256,
  "books/show-your-work.jpg": 256,
  "books/keep-going.jpg": 256,
  "books/creative-act.jpg": 256,
  "books/biomimicry.jpg": 256,
  "books/artificial-intelligence.jpg": 256,
  "books/brief-answers.jpg": 256,
  "books/homo-deus.jpg": 256,
  "books/nexus.jpg": 256,
  "books/sapiens.jpg": 256,
  "books/outliers.jpg": 256,
  "books/blink.jpg": 256,
  "legoBlossom.png": 320,
  "legoDaisyWhite.png": 320,
  "legoTulipPot.png": 320,
  "legoFlowerPot.png": 384,
  "legoButterflyForeL.png": 256,
  "legoButterflyHindL.png": 256,
  "legoButterflyBody.png": 256,
  "legoButterflyForeR.png": 256,
  "legoButterflyHindR.png": 256,
  "legoLadybird.png": 160,
  "legoMeadowLeft.png": 384,
  "legoMeadowRight.png": 320,
  "legoDaisyOrange.png": 160,
  "legoDaisyPink.png": 128,
};
const widthFor = (rel) => CAP[rel] ?? 1512;

/** Screenshots carry type and thin rules, so they keep more of their detail
 *  than the photographs do. */
const qualityFor = (rel) => (/\.jpe?g$/i.test(rel) ? 74 : 80);

// --- Assets ----------------------------------------------------------------

function walk(dir, base = "") {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    if (statSync(p).isDirectory()) out.push(...walk(p, rel));
    else out.push(rel);
  }
  return out;
}

const pages = Object.fromEntries(
  ORDER.map((name) => [name, readFileSync(path.join(root, `${name}.html`), "utf8")])
);
const everyPage = Object.values(pages).join("\n");

/* Only what the pages actually ask for. The folder carries earlier drafts and
   a few hundred kilobytes of unused ellipses. */
const used = walk(assetsDir).filter(
  (rel) => /\.(png|jpe?g|svg|pdf|mp4)$/i.test(rel) && everyPage.includes(rel)
);

const store = {};
let rawBytes = 0;
for (const rel of used) {
  const buf = readFileSync(path.join(assetsDir, rel));
  rawBytes += buf.length;
  if (/\.svg$/i.test(rel)) {
    store[rel] = `data:image/svg+xml;base64,${buf.toString("base64")}`;
  } else if (/\.pdf$/i.test(rel)) {
    /* The resume. Kept byte for byte; the boot script opens it. */
    store[rel] = `data:application/pdf;base64,${buf.toString("base64")}`;
  } else if (/\.mp4$/i.test(rel)) {
    /* Portfolio interaction demos. Kept byte for byte so their audio tracks
       and browser-compatible encoding survive the single-file build. */
    store[rel] = `data:video/mp4;base64,${buf.toString("base64")}`;
  } else {
    const webp = await sharp(buf)
      .resize({ width: widthFor(rel), withoutEnlargement: true })
      .webp({ quality: qualityFor(rel) })
      .toBuffer();
    store[rel] = `data:image/webp;base64,${webp.toString("base64")}`;
  }
}

/** A small favicon for the shell. The page's own is a 140KB full-size image. */
const favicon =
  "data:image/png;base64," +
  (
    await sharp(readFileSync(path.join(assetsDir, "imgRectangle56.png")))
      .resize({ width: 64 })
      .png({ compressionLevel: 9 })
      .toBuffer()
  ).toString("base64");

const tailwind = readFileSync(path.join(root, "scripts/vendor-tailwind-cdn.js"), "utf8");

/* The page transition's early cover (see page-transition-head.js), run by the
   shell as well. Between two pages the frame is empty until the next one has
   parsed; the shell puts the same cover up over that gap, so a title that is
   on screen when a page is left is still there when the next one takes over. */
const ptCover = readFileSync(path.join(root, "scripts/page-transition-head.js"), "utf8")
  .trim()
  .replace("var home = __PT_HOME__;", "var home = window.__ptHome;");

// --- Pages -----------------------------------------------------------------

/** Turn every `./assets/x.png` into the placeholder the page expands. */
const placehold = (html) =>
  html.replace(/\.\/assets\/([A-Za-z0-9._/-]+)/g, (whole, rel) =>
    store[rel] !== undefined ? `{{${rel}}}` : whole
  );

const boot = `
<script>
/* Added by the single-file build.
 *
 * A page arrives here as markup with its pictures still written as {{name}}.
 * The pictures themselves live once in the shell, and this fills them in after
 * the parse. Handing the frame a document with five megabytes of base64 already
 * in it costs about four seconds of string copying and re-parsing on the way
 * in; this way the frame parses a few hundred kilobytes and the images arrive
 * as image data, decoded off the main thread.
 *
 * Also: case-study links leave this document, so they are handed up to the
 * shell's router, and anything off-site opens in a new tab rather than
 * replacing the frame.
 */
(function () {
  var STORE = null;

  function fill(s) {
    return s.replace(/\\{\\{([^{}]+)\\}\\}/g, function (whole, key) {
      return STORE[key] !== undefined ? STORE[key] : whole;
    });
  }

  /* An image is written as data-si rather than src so the browser never goes
     looking for a file called "{{hero.png}}" before this runs. */
  function element(el) {
    var attrs = el.attributes;
    for (var i = attrs.length - 1; i >= 0; i--) {
      var name = attrs[i].name, value = attrs[i].value;
      if (name === "data-si") {
        el.setAttribute("src", fill(value));
        el.removeAttribute("data-si");
      } else if (value.indexOf("{{") >= 0) {
        el.setAttribute(name, fill(value));
      }
    }
  }

  function expand(root) {
    if (!STORE || !root || root.nodeType !== 1) return;
    element(root);
    var all = root.querySelectorAll("*"), i;
    for (i = 0; i < all.length; i++) element(all[i]);
    var styles = root.querySelectorAll("style");
    for (i = 0; i < styles.length; i++) {
      if (styles[i].textContent.indexOf("{{") >= 0) styles[i].textContent = fill(styles[i].textContent);
    }
  }

  function external(a) {
    if (!a.getAttribute("target") && /^(https?:)?\\/\\//.test(a.getAttribute("href") || "")) {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    }
  }
  function sweep() {
    var links = document.querySelectorAll("a[href]");
    for (var i = 0; i < links.length; i++) external(links[i]);
  }

  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest && e.target.closest("a[data-page-link]");
    if (!a) return;
    e.preventDefault();
    parent.postMessage({ __nav: a.getAttribute("data-page-link") }, "*");
  }, true);

  /* Jump links have to be scrolled by hand here. Letting the browser follow
     one would navigate this frame from about:srcdoc to about:srcdoc#thing,
     which tears the document down and rebuilds it — the page blinks back to
     nothing instead of scrolling. */
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute("data-page-link")) return;
    var id = a.getAttribute("href").slice(1);
    if (!id) return;
    var target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    var margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: target.getBoundingClientRect().top + window.scrollY - margin,
      left: 0,
      behavior: still ? "auto" : "smooth",
    });
  }, true);

  /* The resume is carried as a data: URL, and browsers refuse to open one of
     those as a page of its own. Hand the new tab a blob of the same bytes. */
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href^="data:application/pdf"]');
    if (!a) return;
    e.preventDefault();
    var href = a.getAttribute("href");
    var bin = atob(href.slice(href.indexOf(",") + 1));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    var url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    window.open(url, "_blank", "noopener");
  }, true);

  function start() {
    expand(document.documentElement);
    sweep();
    /* The modals build their markup when opened, so whatever they add needs the
       same treatment. */
    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var added = records[i].addedNodes;
        for (var j = 0; j < added.length; j++) expand(added[j]);
      }
      sweep();
    }).observe(document.documentElement, { childList: true, subtree: true });
    /* Show the frame now: it has its markup and its styles, which is the point
       the multi-page site paints at too. Tailwind's CDN build runs on
       DOMContentLoaded and registered its listener from the head, ahead of this
       one, so by the next frame its classes are applied. */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        try { parent.postMessage({ __ready: 1 }, "*"); } catch (e) {}
      });
    });
  }

  function withStore(store) {
    if (STORE) return;
    STORE = store;
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
    else start();
  }

  /* Same document origin: read it straight off the shell. Should anything stand
     in the way of that, ask for a copy instead. */
  addEventListener("message", function (e) { if (e.data && e.data.__store) withStore(e.data.__store); });
  var direct = null;
  try { direct = parent.__STORE || null; } catch (err) { direct = null; }
  if (direct) withStore(direct);
  else parent.postMessage({ __want: 1 }, "*");
})();
</script>
`;

/* The eleven case studies inline the same 72KB stylesheet. Keep one copy. */
/* The largest <style> on the page, not the first: the page transition puts a
   one-line one at the top of <head>. */
const sharedCss = pages["bolt"]
  .match(/<style>[\s\S]*?<\/style>/g)
  .reduce((a, b) => (b.length > a.length ? b : a));

const built = {};
const titles = {};
for (const name of ORDER) {
  let html = pages[name];
  titles[slugOf(name)] = html.match(/<title>([\s\S]*?)<\/title>/)[1].trim();

  /* Preloads warm the network for files that are about to be fetched. Here the
     bytes arrive with the document, so each one would only paste a second copy
     of an image beside the first. */
  html = html.replace(/<link\b[^>]*\brel="preload"[^>]*>/g, "");

  /* The React bundle that hydrated these pages is not in this folder, and the
     markup is complete without it — it only added hover flourishes. */
  html = html.replace(/<script\b[^>]*\btype="module"[^>]*><\/script>/g, "");

  /* The shell carries the favicon; a framed document's own is never used. */
  html = html.replace(/<link\b[^>]*\brel="icon"[^>]*>/g, "");

  if (name === "index") {
    /* The gallery modals build `./assets/${src}` at runtime from a list of bare
       filenames. Move the prefix onto the list so the placeholder pass sees it,
       and let the template emit whatever the list now holds. */
    html = html.replace(/images:\s*\[([^\]]*)\]/g, (whole, inner) =>
      whole.replace(
        inner,
        inner.replace(/"([A-Za-z0-9._/-]+\.(?:jpe?g|png|svg))"/g, '"./assets/$1"')
      )
    );
    html = html.replace('src="./assets/${src}"', 'data-si="${src}"');
  }

  /* Cross-page links become router navigations. The href is kept as a hash so
     the link still reads as a link and middle-click still opens something. */
  html = html.replace(
    /href="\.\/([a-z-]+)\.html"/g,
    (_whole, target) => `href="#${slugOf(target)}" data-page-link="${slugOf(target)}"`
  );

  html = placehold(html);

  /* Hold the image back until the boot script can hand it its data. Left as a
     src, the browser would spend the first moment of every page asking the
     server for a file named after the placeholder. */
  html = html.replace(/\bsrc="\{\{/g, 'data-si="{{');

  if (name !== "index" && html.includes(sharedCss)) html = html.replace(sharedCss, "{{__CSS__}}");
  if (name === "index") {
    html = html.replace('<script src="https://cdn.tailwindcss.com"></script>', "{{__TAILWIND__}}");
  }

  built[slugOf(name)] = html.replace("</body>", `${boot}</body>`);
}

store.__CSS__ = placehold(sharedCss);
store.__TAILWIND__ = `<script>${tailwind}</script>`;

// --- Shell -----------------------------------------------------------------

/** Valid JSON that no HTML parser can find a way out of. */
const embed = (value) =>
  JSON.stringify(value).replace(/<\//g, "<\\/").replace(/<!--/g, "<\\u0021--");

const description = pages["index"].match(/content="([^"]*portfolio of Preeti[^"]*)"/)?.[1] ?? "";

const shell = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>${titles.home}</title>
    <meta name="description" content="${description}" />
    <link rel="icon" type="image/png" href="${favicon}" />
    <style>
      html, body { margin: 0; padding: 0; height: 100%; background: #fbf9f7; }
      @media (prefers-color-scheme: dark) { html, body { background: #141517; } }
      #frame {
        display: block; border: 0; width: 100%; height: 100%;
        opacity: 0; transition: opacity 180ms ease;
      }
      #frame.ready { opacity: 1; }
      #loading {
        position: fixed; inset: 0; display: grid; place-items: center;
        font: 400 12px/1.6 "IBM Plex Mono", ui-monospace, monospace;
        letter-spacing: 0.08em; text-transform: uppercase; color: #8a8580;
        pointer-events: none; transition: opacity 180ms ease;
      }
      #loading.done { opacity: 0; }
    </style>
  </head>
  <body>
    <div id="loading">Loading</div>
    <iframe id="frame" title="${titles.home}"></iframe>

    <script id="assets" type="application/json">${embed(store)}</script>
    <script id="pages" type="application/json">${embed(built)}</script>
    <script id="titles" type="application/json">${embed(titles)}</script>

    <script>
      /* Hash router.
       *
       * Every picture in the site is held here, once, as a data URI; the pages
       * carry {{name}} where a picture goes. A page that shows the same photo
       * four times, or four pages that share one, cost those bytes once.
       *
       * Only the stylesheet and the Tailwind runtime are filled in before the
       * page is mounted, because a document cannot be given its styles after it
       * has been parsed without a flash of unstyled markup. The pictures are
       * filled in by the page itself, once it is parsed. */
      (function () {
        var STORE = JSON.parse(document.getElementById("assets").textContent);
        var PAGES = JSON.parse(document.getElementById("pages").textContent);
        var TITLES = JSON.parse(document.getElementById("titles").textContent);
        var frame = document.getElementById("frame");
        var loading = document.getElementById("loading");
        var current = null;

        /* Read by each page directly, when the browser allows a framed document
           to reach its parent; posted across on request when it does not. */
        window.__STORE = STORE;

        try { history.scrollRestoration = "manual"; } catch (e) {}

        function ptCover() {
          ${ptCover}
        }
        function ptClear() {
          var early = document.querySelector(".pt-root[data-early]");
          if (early) early.remove();
          document.documentElement.classList.remove("pt-wait");
          document.documentElement.style.removeProperty("background");
        }

        function show(slug) {
          if (!PAGES[slug]) slug = "home";
          if (slug === current) return;
          current = slug;
          ptClear();
          window.__ptHome = slug === "home";
          try { ptCover(); } catch (e) {}
          frame.classList.remove("ready");
          loading.classList.remove("done");
          document.title = TITLES[slug];
          frame.title = TITLES[slug];
          frame.srcdoc = PAGES[slug]
            .replace("{{__CSS__}}", function () { return STORE.__CSS__; })
            .replace("{{__TAILWIND__}}", function () { return STORE.__TAILWIND__; });
        }

        function reveal() {
          ptClear();
          frame.classList.add("ready");
          loading.classList.add("done");
        }
        /* Whichever comes first: the page saying it is styled, or the browser
           finishing every last image. */
        frame.addEventListener("load", reveal);

        addEventListener("message", function (e) {
          if (!e.data) return;
          if (e.data.__want) {
            if (frame.contentWindow) frame.contentWindow.postMessage({ __store: STORE }, "*");
            return;
          }
          if (e.data.__ready) { reveal(); return; }
          if (!e.data.__nav) return;
          var slug = e.data.__nav;
          if (!PAGES[slug]) return;
          if (("#" + slug) === location.hash) show(slug);
          else location.hash = slug;
        });

        function route() {
          show((location.hash || "").replace(/^#/, "") || "home");
        }
        addEventListener("hashchange", route);
        route();
      })();
    </script>
  </body>
</html>
`;

mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "index.html");
writeFileSync(outFile, shell);

const mb = (n) => (n / 1e6).toFixed(2) + " MB";
console.log(`assets   ${used.length} files, ${mb(rawBytes)} raw`);
console.log(`pages    ${ORDER.length}`);
console.log(`written  ${path.relative(process.cwd(), outFile)}  (${mb(Buffer.byteLength(shell))})`);
