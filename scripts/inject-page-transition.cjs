/* Pastes the page transition into the home page and every case study:
 *   - page-transition-head.js at the very top of <head>
 *   - page-transition.js just before </body>
 * each between markers, so running it again replaces the old copy instead of
 * adding another.
 *
 *   node v6-2026-08-28/scripts/inject-page-transition.cjs
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const PAGES = [
  "index",
  "decision-flow",
  "collaborator",
  "notification",
  "user-management",
  "studios",
  "building-with-ai",
  "claude-cli",
  "bolt",
  "lovable",
  "claude-desktop",
  "scavvy",
];

const read = (name) => fs.readFileSync(path.join(__dirname, name), "utf8").trim();
const BODY = ["<!-- page-transition:start -->", "<!-- page-transition:end -->"];
const HEAD = ["<!-- page-transition-head:start -->", "<!-- page-transition-head:end -->"];
const bodySrc = read("page-transition.js");
const headSrc = read("page-transition-head.js");

const wrap = ([start, end], js, extra = "") =>
  `${start}\n${extra}<script>\n${js}\n</script>\n${end}\n`;

/* Keep the page being left on screen until the next one can draw, then swap
   them in one frame. Without it Chrome may show a blank screen while the
   home page (which takes a couple of seconds to style itself) loads, and the
   title on the cover vanishes and comes back. The two covers are identical
   at the swap, so no animation is wanted. */
const HOLD =
  "<style>@view-transition{navigation:auto}" +
  "::view-transition-old(root),::view-transition-new(root){animation:none}</style>\n";

/* Every copy already in a page, with the indent in front of it. */
function strip(html, [start, end]) {
  for (;;) {
    const s = html.indexOf(start);
    if (s < 0) return html;
    const e = html.indexOf(end, s);
    if (e < 0) throw new Error("start marker without an end marker");
    let from = s;
    while (from > 0 && (html[from - 1] === " " || html[from - 1] === "\t")) from--;
    let to = e + end.length;
    if (html[to] === "\n") to++;
    html = html.slice(0, from) + html.slice(to);
  }
}

for (const name of PAGES) {
  const file = path.join(root, `${name}.html`);
  let html = strip(strip(fs.readFileSync(file, "utf8"), BODY), HEAD);

  const head = html.match(/<head\b[^>]*>\n?/);
  if (!head) throw new Error(`${name}.html has no <head>`);
  const h = head.index + head[0].length;
  const headBlock = wrap(
    HEAD,
    headSrc.replace("var home = __PT_HOME__;", `var home = ${name === "index"};`),
    HOLD
  );
  html = html.slice(0, h) + headBlock + html.slice(h);

  const at = html.lastIndexOf("</body>");
  if (at < 0) throw new Error(`${name}.html has no </body>`);
  html = html.slice(0, at) + wrap(BODY, bodySrc) + html.slice(at);

  fs.writeFileSync(file, html);
  console.log(`injected  ${name}.html`);
}
