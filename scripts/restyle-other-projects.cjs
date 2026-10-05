/**
 * Rebuilds the "Other Projects" row at the foot of every case study in the
 * soft-card style: a large Fraunces heading with the rose full stop, and three
 * tall pastel cards with a serif title, a line of copy, "Read More →" and the
 * project's screenshot bleeding off the bottom edge.
 *
 * The case studies ship a compiled Tailwind stylesheet, so arbitrary classes
 * that are not already in it do nothing. The section therefore carries its own
 * small <style> block and plain class names.
 *
 * Each page keeps the projects it already listed, in the same order. The
 * section is wrapped in <!-- other-projects:start/end --> markers so the script
 * can be run again after editing PROJECTS below.
 *
 *   node v6-2026-08-28/scripts/restyle-other-projects.cjs
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const PAGES = [
  "aura",
  "bolt",
  "building-with-ai",
  "claude-cli",
  "claude-desktop",
  "collaborator",
  "decision-flow",
  "lovable",
  "notification",
  "scavvy",
  "studios",
  "user-management",
];

/** Keyed by the title the old cards used, so the first run can find them. */
const PROJECTS = {
  "Gaming app": {
    id: "scavvy",
    href: "./scavvy.html",
    title: "Gaming app",
    desc: "A gaming app to be played in park and social groups",
    tone: "pink",
    shot: "./assets/csImage103.png",
    crop: true,
  },
  "Full Stack Product": {
    id: "full-stack",
    href: "./building-with-ai.html",
    title: "Full Stack Product",
    desc: "4 tech stacks explored to build an end-to-end pet boarding web application using AI",
    tone: "peach",
    shot: "./assets/csImage98.png",
    crop: true,
    tilt: true,
  },
  "Decision Flow": {
    id: "decision-flow",
    href: "./decision-flow.html",
    title: "Decision Flow",
    desc: "All new decision flow to analyse then the optimise the decisions making workflow",
    tone: "lilac",
    shot: "./assets/aiCardDecisionFlow.png",
    fit: true,
  },
  "Project 4": {
    id: "project-4",
    href: null,
    title: "Project 4",
    desc: "upcoming project",
    tone: "blue",
    shot: null,
  },
};
const byId = Object.fromEntries(Object.values(PROJECTS).map((p) => [p.id, p]));

const STYLE = `<style>
.op-section{width:100%;max-width:1352px;margin:80px auto 0;padding:0 16px 96px;box-sizing:border-box}
@media (min-width:768px){.op-section{margin-top:180px;padding:0 80px 120px}}
.op-title{font-family:"Fraunces",Georgia,serif;font-weight:600;font-size:44px;line-height:1.05;letter-spacing:-0.025em;color:#111214;margin:0 0 36px}
@media (min-width:768px){.op-title{font-size:68px;margin-bottom:56px}}
.op-title i{font-style:normal;color:#e23a5b}
.op-grid{display:grid;grid-template-columns:1fr;gap:24px}
@media (min-width:1024px){.op-grid{grid-template-columns:repeat(3,1fr);gap:28px}}
.op-card{position:relative;display:block;height:460px;border-radius:18px;overflow:hidden;text-decoration:none;color:inherit;box-shadow:0 1px 2px rgba(60,40,30,.04),0 10px 30px rgba(60,40,30,.06);transition:transform .35s cubic-bezier(.2,.8,.2,1),box-shadow .35s ease}
@media (min-width:768px){.op-card{height:510px}}
a.op-card:hover{transform:translateY(-4px);box-shadow:0 2px 4px rgba(60,40,30,.05),0 18px 40px rgba(60,40,30,.10)}
.op-card.pink{background:linear-gradient(165deg,#fdeef1 0%,#f9e1e8 100%)}
.op-card.peach{background:linear-gradient(165deg,#fcf1e9 0%,#f8e4d8 100%)}
.op-card.lilac{background:linear-gradient(165deg,#f7eaf5 0%,#ede6fb 100%)}
.op-card.blue{background:linear-gradient(165deg,#eef4fd 0%,#e2ebfb 100%)}
.op-body{position:relative;z-index:1;padding:40px 40px 0}
@media (min-width:768px){.op-body{padding:52px 46px 0}}
.op-name{font-family:"Fraunces",Georgia,serif;font-weight:600;font-size:30px;line-height:1.15;letter-spacing:-0.02em;color:#111214;margin:0}
@media (min-width:768px){.op-name{font-size:34px}}
.op-desc{font-family:"Roboto",sans-serif;font-weight:400;font-size:16px;line-height:1.65;color:#6b6f78;margin:14px 0 0;max-width:30em}
@media (min-width:768px){.op-desc{font-size:17px}}
.op-more{display:inline-flex;align-items:center;gap:10px;margin-top:22px;font-family:"Roboto",sans-serif;font-weight:500;font-size:17px;color:#4a4f86}
.op-more svg{width:18px;height:18px;transition:transform .3s ease}
a.op-card:hover .op-more svg{transform:translateX(4px)}
.op-shot{position:absolute;left:28px;right:-2px;bottom:-2px;height:236px;border-radius:14px 0 0 0;overflow:hidden;background:#fff;box-shadow:0 -2px 18px rgba(60,40,30,.10)}
@media (min-width:768px){.op-shot{height:270px}}
.op-shot img{display:block;width:100%;height:auto}
.op-shot.crop img{margin-top:-8.4%}
.op-shot.fit{height:auto}
.op-shot.tilt{left:24px;right:-18px;bottom:-26px;border-radius:14px;transform:rotate(-4deg);transform-origin:left bottom}
.op-ph{position:absolute;left:0;right:0;bottom:0;height:270px}
.op-ph svg{display:block;width:100%;height:100%}
</style>`;

const ARROW =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h16M14 6l6 6-6 6"/></svg>';

const PLACEHOLDER = `<div class="op-ph" aria-hidden="true"><svg viewBox="0 0 440 270" preserveAspectRatio="xMaxYMax slice">
<rect x="96" y="30" width="330" height="240" rx="18" fill="#e3ebfa"/>
<rect x="76" y="56" width="380" height="240" rx="18" fill="#f3f7fe" stroke="#dbe5f7"/>
<circle cx="104" cy="84" r="6" fill="#d3def3"/><circle cx="124" cy="84" r="6" fill="#d3def3"/><circle cx="144" cy="84" r="6" fill="#d3def3"/>
<circle cx="330" cy="140" r="30" fill="#e3ebfa"/>
<path d="M150 270 L250 170 L330 250 L370 215 L456 290 L150 290 Z" fill="#e3ebfa"/>
</svg></div>`;

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

function card(p) {
  const tag = p.href ? "a" : "div";
  const href = p.href ? ` href="${p.href}"` : "";
  const shot = p.shot
    ? `<div class="op-shot${p.crop ? " crop" : ""}${p.tilt ? " tilt" : ""}${p.fit ? " fit" : ""}"><img alt="" loading="lazy" src="${p.shot}"/></div>`
    : PLACEHOLDER;
  return (
    `<${tag} class="op-card ${p.tone}" data-op="${p.id}"${href}>` +
    `<div class="op-body"><h3 class="op-name">${esc(p.title)}</h3>` +
    `<p class="op-desc">${esc(p.desc)}</p>` +
    `<span class="op-more">Read More ${ARROW}</span></div>` +
    shot +
    `</${tag}>`
  );
}

function section(projects) {
  return (
    `<!-- other-projects:start -->${STYLE}` +
    `<section class="op-section" aria-labelledby="op-title">` +
    `<h2 class="op-title" id="op-title">Other Projects</h2>` +
    `<div class="op-grid" data-reveal="card">${projects.map(card).join("")}</div>` +
    `</section><!-- other-projects:end -->`
  );
}

/** Index just past the </div> that closes the <div> opening at `start`. */
function closeOf(html, start) {
  const re = /<div\b|<\/div>/g;
  re.lastIndex = start;
  let depth = 0;
  let m;
  while ((m = re.exec(html))) {
    depth += m[0] === "</div>" ? -1 : 1;
    if (depth === 0) return m.index + m[0].length;
  }
  throw new Error("unbalanced <div>");
}

for (const name of PAGES) {
  const file = path.join(root, `${name}.html`);
  let html = fs.readFileSync(file, "utf8");
  let start, end, projects;

  const marked = html.indexOf("<!-- other-projects:start -->");
  if (marked >= 0) {
    start = marked;
    end = html.indexOf("<!-- other-projects:end -->") + "<!-- other-projects:end -->".length;
    const ids = [...html.slice(start, end).matchAll(/data-op="([^"]+)"/g)].map((m) => m[1]);
    projects = ids.map((id) => byId[id]);
  } else {
    const label = html.indexOf(">Other Projects</p>");
    if (label < 0) throw new Error(`${name}: no Other Projects section`);
    start = html.lastIndexOf(
      '<div class="content-stretch flex flex-col items-center mx-auto',
      label
    );
    end = closeOf(html, start);
    const old = html.slice(start, end);
    const titles = [...old.matchAll(/leading-\[48px\]">([^<]+)</g)].map((m) => m[1].trim());
    projects = titles.map((t) => {
      if (!PROJECTS[t]) throw new Error(`${name}: unknown project "${t}"`);
      return PROJECTS[t];
    });
  }

  html = html.slice(0, start) + section(projects) + html.slice(end);
  fs.writeFileSync(file, html);
  console.log(`${name.padEnd(18)} ${projects.map((p) => p.title).join(" · ")}`);
}
