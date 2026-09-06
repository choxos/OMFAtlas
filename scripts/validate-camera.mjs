import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const [browser, url = "http://127.0.0.1:3017"] = process.argv.slice(2);
if (!browser || browser === "--help") {
  console.log(
    "Usage: node scripts/validate-camera.mjs /path/to/browse [running-atlas-url]",
  );
  process.exit(browser ? 0 : 1);
}
const run = (...args) =>
  execFileSync(browser, args, { encoding: "utf8", timeout: 20000 }).trim();
const inDetail = () =>
  run("js", 'document.body.classList.contains("tooth-inspection")') === "true";
const zoomUntil = (detail, button) => {
  for (let i = 0; i < 24 && inDetail() !== detail; i++) run("click", button);
  assert.equal(
    inDetail(),
    detail,
    `Expected tooth detail ${detail} after ${button}`,
  );
};

run("viewport", "1280x800");
run("goto", url);
run("wait", "--networkidle");
assert.equal(run("js", 'document.querySelector("#load-status").hidden'), "true", "Anatomy must finish loading");
run("click", '[data-tab="dental"]');
run("click", '[data-tooth="16"]');
assert.equal(inDetail(), false, "Selecting a tooth must not enter a close-up");
zoomUntil(true, "#zoom-in");
zoomUntil(false, "#zoom-out");
assert.match(
  run("js", 'document.querySelector("#visible-count").textContent'),
  /structures visible/,
);

run("select", "#age", "child");
run("click", "#isolate");
assert.equal(inDetail(), true);
zoomUntil(false, "#zoom-out");
assert.equal(run("js", 'document.querySelector("#age").value'), "child");
assert.match(
  run("js", 'document.querySelector("#visible-count").textContent'),
  /20 schematic teeth/,
);

run("click", "#isolate");
for (let i = 0; i < 30 && inDetail(); i++) {
  run(
    "js",
    'const c=document.querySelector("canvas"),r=c.getBoundingClientRect();c.dispatchEvent(new WheelEvent("wheel",{deltaY:400,clientX:r.x+r.width/2,clientY:r.y+r.height/2,bubbles:true,cancelable:true}));',
  );
}
assert.equal(inDetail(), false, "Wheel zoom-out must leave tooth detail");
console.log(
  "Camera transitions passed: selection, zoom-in, zoom-out, child context, and wheel zoom-out.",
);
