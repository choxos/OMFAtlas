import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const [browser, url = "http://127.0.0.1:3017"] = process.argv.slice(2);
if (!browser || browser === "--help") {
  console.log("Usage: node scripts/validate-explorer.mjs /path/to/browse [running-atlas-url]");
  process.exit(browser ? 0 : 1);
}
const run = (...args) => execFileSync(browser, args, {encoding:"utf8", timeout:20000}).trim();
const js = (code) => run("js",code);
const selected = () => js('document.querySelector("#selection-name").textContent');
const progress = () => Number(js('document.querySelector("#viewer").dataset.explode'));
run("viewport","1280x800");
run("goto",url);
run("wait","--networkidle");
assert.equal(js('document.querySelector("#load-status").hidden'),"true");
assert.equal(js('document.body.classList.contains("details-open")'),"true","Desktop inspector space is present from initial load");
const bounds = js('JSON.stringify(document.querySelector("canvas").getBoundingClientRect().toJSON())');
run("click",'.stage-bottom [data-clear-selection]');
assert.equal(selected(),"No structure selected");
assert.equal(js('document.querySelector("#isolate").disabled'),"true");
run("fill","#search","mandible");
run("click",'#browser [data-part="FJ3289"]');
assert.equal(selected(),"Mandible");
assert.equal(js('JSON.stringify(document.querySelector("canvas").getBoundingClientRect().toJSON())'),bounds,"Selecting does not shift or resize the skull viewport");
run("click",'#browser [data-part="FJ3289"]');
assert.equal(selected(),"No structure selected");
run("click",'#browser [data-part="FJ3289"]');
run("press","Escape");
assert.equal(selected(),"No structure selected");
run("click",'#browser [data-part="FJ3289"]');
js('const c=document.querySelector("canvas"),r=c.getBoundingClientRect();for(const type of ["pointerdown","pointerup"])c.dispatchEvent(new PointerEvent(type,{clientX:r.x+2,clientY:r.y+2,isPrimary:true,bubbles:true}));');
assert.equal(selected(),"No structure selected");
js('const input=document.querySelector("#search");input.value="";input.dispatchEvent(new Event("input",{bubbles:true}));');
run("click","#zoom-out");
assert.equal(progress(),0,"First outward input stops at the normal view");
assert.equal(js('document.querySelector("#viewer").dataset.normalStop'),"true");
run("click","#zoom-out");
assert.ok(progress()>0 && progress()<=11,"First zoom-out separates gradually, at most 11 percent");
for(let i=0;i<15 && progress()<100;i++) run("click","#zoom-out");
assert.equal(progress(),100);
assert.equal(js('document.querySelector("#structure-library").open'),"true");
assert.equal(js('document.querySelector("#browser").firstElementChild.className'),"inventory-heading");
// The blocks must follow TISSUE_ORDER. Asserting which layers happen to be on
// pinned the default layer set instead, which is a display choice, not the
// invariant this check is about.
const TISSUE_ORDER = ["bones","neck","muscles","teeth","gingiva","soft","glands","arteries","veins","nerves","brain","eyes","airway","skin"];
const blocks = JSON.parse(js('JSON.stringify([...document.querySelectorAll("[data-inventory-type]")].map(el=>el.dataset.inventoryType))'));
assert.ok(blocks.length>1,"The inventory groups names into tissue blocks");
assert.equal(blocks[0],"bones","Bones lead the parts inventory");
const ranks = blocks.map(id=>TISSUE_ORDER.indexOf(id));
assert.ok(ranks.every((rank,i)=>rank>=0 && (i===0 || rank>ranks[i-1])),`Tissue blocks must follow TISSUE_ORDER, got ${blocks.join(", ")}`);
assert.equal(Number(js('document.querySelectorAll("#structure-library [data-part]").length')),
  Number(js('parseInt(document.querySelector("#visible-count").textContent)')));
run("click","#zoom-in");
assert.ok(progress()<95 && progress()>0);
for(let i=0;i<10 && progress()>0;i++) run("click","#zoom-in");
assert.equal(progress(),0);
assert.equal(js('document.querySelector("#viewer").dataset.normalStop'),"true","Reassembly stops at normal before zooming closer");
js('const c=document.querySelector("canvas"),r=c.getBoundingClientRect();for(let i=0;i<12;i++)c.dispatchEvent(new WheelEvent("wheel",{deltaY:120,clientX:r.x+r.width/2,clientY:r.y+r.height/2,bubbles:true,cancelable:true}));');
assert.equal(progress(),100,"Wheel zoom-out reaches inventory");
run("click","#reassemble");
assert.equal(progress(),0);
console.log("Explorer passed: clear button, repeated selection, Escape, background, separation, named inventory, reverse zoom, wheel and reassemble.");
