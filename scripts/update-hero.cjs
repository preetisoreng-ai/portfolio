const fs = require('node:fs');
const file = 'index.html';
let html = fs.readFileSync(file, 'utf8');
html = html.replace('class="max-w-7xl mx-auto w-full relative z-10 flex-1', 'id="heroComposition" class="max-w-7xl mx-auto w-full relative z-10 flex-1');
html = html.replace('class="flex-1 flex flex-col lg:flex-row items-center', 'id="heroMain" class="flex-1 flex flex-col lg:flex-row items-center');
html = html.replace('class="w-full lg:w-[46%]', 'id="heroIntro" class="w-full lg:w-[46%]');
html = html.replace('class="relative mb-2 sm:mb-3 select-none inline-block"', 'id="heroAnnotation" class="relative mb-2 sm:mb-3 select-none inline-block"');
html = html.replace('class="w-full border-t border-stone-200/90', 'id="heroCategories" class="w-full border-t border-stone-200/90');
// Store the same coordinates the Chaos button restores after dragging.
for (const [id, left, top, rotation] of [['dragItem2','2%','23.5%','6'],['dragItem1','30.5%','3%','-5'],['dragItem4','66%','35%','-10']]) {
  const re = new RegExp('(id="'+id+'"[\\s\\S]*?)(data-clean-left=)');
  html = html.replace(re, (_, before, after) => before
    .replace(/style="[^"]*"/, `style="left: ${left}; top: ${top}; transform: rotate(${rotation}deg);"`)
    .replace(/data-chaos-left="[^"]*"/, `data-chaos-left="${left}"`)
    .replace(/data-chaos-top="[^"]*"/, `data-chaos-top="${top}"`)
    .replace(/data-chaos-rot="[^"]*"/, `data-chaos-rot="${rotation}"`) + after);
}
const css = fs.readFileSync('scripts/hero-reference.css', 'utf8');
html = html.replace('</head>', `<style id="hero-reference-layout">\n${css}\n</style>\n</head>`);
fs.writeFileSync(file, html);
