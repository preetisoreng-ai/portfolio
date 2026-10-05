/* Goes in <head>, ahead of everything else. When a page transition is on its
   way in, this puts the cover up straight away — colour, label and title —
   before any of the page has been parsed, and hides the page underneath.
   page-transition.js, at the end of <body>, then takes over this same cover
   rather than making another one. Without this the page arrives with a gap:
   a long page (the home page especially) paints before that script is
   reached, so the title vanished for a moment and then came back.
   `var home` is filled in per page by inject-page-transition.cjs. */
(function () {
  try {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var s = JSON.parse(sessionStorage.getItem("pt-v2") || "null");
    if (!s) return;
    var home = __PT_HOME__;
    if (!home && s.stage === "in") return;

    /* Home picks up the cover in the case study's own colour; a case study
       picks it up in the card's. Must match page-transition.js. */
    var bg = (home && s.page) || s.bg || "#f3f1ec";
    var m = String(bg).match(/\d+(\.\d+)?/g);
    var lum = m && m.length > 2 ? (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255 : 1;
    var fg = lum > 0.55 ? "#1c1917" : "#f5f5f4";

    var html = document.documentElement;
    html.classList.add("pt-wait");
    html.style.background = bg;
    var style = document.createElement("style");
    style.textContent = "html.pt-wait body{visibility:hidden!important}";
    document.head.appendChild(style);

    /* The same markup page-transition.js builds, already covering. */
    var root = document.createElement("div");
    root.className = "pt-root";
    root.setAttribute("data-early", "");
    root.setAttribute("aria-hidden", "true");
    root.style.cssText =
      "position:fixed;inset:0;z-index:2147483000;pointer-events:auto;overflow:hidden;" +
      "background:" +
      bg +
      ";color:" +
      fg +
      ";" +
      "clip-path:inset(0px 0px 0px 0px round 0px);will-change:clip-path;";
    var text = document.createElement("div");
    text.style.cssText =
      "position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;" +
      "justify-content:center;gap:16px;padding:0 24px;text-align:center;";
    var lines = [
      [
        s.label || "",
        'font:500 12px/1 Arial,"Helvetica Neue",Helvetica,sans-serif;letter-spacing:.2em;text-transform:uppercase;opacity:.6;',
      ],
      [
        s.title || "",
        'font:400 clamp(2.4rem,6vw,5rem)/1.05 Georgia,"Times New Roman",serif;letter-spacing:-.015em;opacity:1;',
      ],
    ];
    for (var i = 0; i < lines.length; i++) {
      var el = document.createElement("span");
      el.textContent = lines[i][0];
      el.style.cssText = "display:block;will-change:transform,opacity;" + lines[i][1];
      text.appendChild(el);
    }
    root.appendChild(text);
    html.appendChild(root);
  } catch (e) {}
})();
