import fs from 'fs';

const path = 'src/ui/card-canvas.js';
let s = fs.readFileSync(path, 'utf8');

const sigs = [
  ['drawMinimal', "async function drawMinimal(ctx, state, qrMode)"],
  ['drawCorporate', "async function drawCorporate(ctx, state, qrMode)"],
  ['drawEco', "async function drawEco(ctx, state, qrMode)"],
  ['drawPrestige', "async function drawPrestige(ctx, state, qrMode)"],
  ['drawNocturne', "async function drawNocturne(ctx, state, qrMode)"],
  ['drawAtelier', "async function drawAtelier(ctx, state, qrMode)"],
  ['drawLagoon', "async function drawLagoon(ctx, state, qrMode)"],
  ['drawSlate', "async function drawSlate(ctx, state, qrMode)"],
  ['drawSunset', "async function drawSunset(ctx, state, qrMode)"],
  ['drawSumi', "async function drawSumi(ctx, state, qrMode)"],
  ['drawArctic', "async function drawArctic(ctx, state, qrMode)"],
  ['drawMetro', "async function drawMetro(ctx, state, qrMode)"]
];

for (const [name, oldSig] of sigs) {
  const next = oldSig.replace('qrMode)', 'qrMode, accentHex)');
  if (!s.includes(oldSig)) {
    if (s.includes(next)) console.log('already', name);
    else console.log('MISS', name);
    continue;
  }
  s = s.replace(oldSig, next);
  console.log('sig', name);
}

function replaceInFn(fnName, pairs) {
  const start = s.indexOf(`async function ${fnName}(`);
  if (start < 0) {
    console.log('no fn', fnName);
    return;
  }
  const nextFn = s.indexOf('\n  async function ', start + 10);
  const end = nextFn > 0 ? nextFn : s.length;
  let body = s.slice(start, end);
  for (const [from, to] of pairs) {
    if (!body.includes(from)) {
      console.log('needle miss', fnName, from.slice(0, 48));
      continue;
    }
    body = body.split(from).join(to);
  }
  s = s.slice(0, start) + body + s.slice(end);
}

replaceInFn('drawMinimal', [
  ["const ink = '#1c1917';", "const ink = accentHex || '#1c1917';"]
]);

replaceInFn('drawCorporate', [
  ["const deep = '#0b1c2c';\n    const accent = '#2f6fed';",
   "const deep = getQrAccent(state) || '#0b1c2c';\n    const accent = accentHex || '#2f6fed';"]
]);

replaceInFn('drawCreative', [
  ["fill: '#7f1d1d',", "fill: accent || '#7f1d1d',"],
  ["jobColor: '#c2410c',\n      orgColor: '#9a3412',",
   "jobColor: accent,\n      orgColor: accent,"],
  ["labelColor: '#ea580c',", "labelColor: accent,"],
  ["await drawQrPanel(ctx, state, qrMode, '#9f1239', {",
   "await drawQrPanel(ctx, state, qrMode, accent, {"],
  ["titleColor: '#9f1239',\n      subColor: '#9a3412',",
   "titleColor: accent,\n      subColor: accent,"]
]);

replaceInFn('drawEco', [
  ["fill: '#4d7c5a',", "fill: accentHex || '#4d7c5a',"],
  ["jobColor: '#4d7c5a',", "jobColor: accentHex || '#4d7c5a',"],
  ["await drawQrPanel(ctx, state, qrMode, '#4d7c5a', {",
   "await drawQrPanel(ctx, state, qrMode, accentHex || '#4d7c5a', {"],
  ["subColor: '#4d7c5a'", "subColor: accentHex || '#4d7c5a'"]
]);

replaceInFn('drawPrestige', [
  ["const gold = '#c9a227';", "const gold = accentHex || '#c9a227';"]
]);

replaceInFn('drawNocturne', [
  ["bullet: '#a1a1aa'", "bullet: accentHex || '#a1a1aa'"],
  ["border: '#3f3f46',", "border: accentHex || '#3f3f46',"]
]);

replaceInFn('drawAtelier', [
  ["jobColor: '#8b5e3c',", "jobColor: accentHex || '#8b5e3c',"],
  ["drawMicroLabel(ctx, 'Atelier · épreuve', 56, 48, '#8b5e3c');",
   "drawMicroLabel(ctx, 'Atelier · épreuve', 56, 48, accentHex || '#8b5e3c');"],
  ["drawMicroLabel(ctx, 'Reg. A', WIDTH - 56, 48, '#8b5e3c', 'right');",
   "drawMicroLabel(ctx, 'Reg. A', WIDTH - 56, 48, accentHex || '#8b5e3c', 'right');"],
  ["subColor: '#8b5e3c'", "subColor: accentHex || '#8b5e3c'"]
]);

replaceInFn('drawLagoon', [
  ["band.addColorStop(0, '#0f766e');\n    band.addColorStop(1, '#155e75');",
   "band.addColorStop(0, accentHex || '#0f766e');\n    band.addColorStop(1, accentHex || '#155e75');"],
  ["fill: '#0f766e',", "fill: accentHex || '#0f766e',"],
  ["labelColor: '#0f766e',", "labelColor: accentHex || '#0f766e',"],
  ["await drawQrPanel(ctx, state, qrMode, '#0f766e', {",
   "await drawQrPanel(ctx, state, qrMode, accentHex || '#0f766e', {"],
  ["subColor: '#0f766e'", "subColor: accentHex || '#0f766e'"]
]);

replaceInFn('drawSlate', [
  ["ctx.fillStyle = '#1e293b';\n    ctx.fillRect(0, 0, 88, HEIGHT);",
   "ctx.fillStyle = accentHex || '#1e293b';\n    ctx.fillRect(0, 0, 88, HEIGHT);"],
  ["fill: '#334155',", "fill: accentHex || '#334155',"],
  ["orgColor: '#334155',", "orgColor: accentHex || '#334155',"],
  ["await drawQrPanel(ctx, state, qrMode, '#334155', {",
   "await drawQrPanel(ctx, state, qrMode, accentHex || '#334155', {"]
]);

replaceInFn('drawSunset', [
  ["sky.addColorStop(0.45, '#9a3412');\n    sky.addColorStop(0.7, '#ea580c');\n    sky.addColorStop(1, '#fb923c');",
   "sky.addColorStop(0.45, getQrAccent(state) || '#9a3412');\n    sky.addColorStop(0.7, accentHex || '#ea580c');\n    sky.addColorStop(1, accentHex || '#fb923c');"],
  ["fill: '#7c2d12',", "fill: getQrAccent(state) || '#7c2d12',"],
  ["ctx.fillStyle = '#fdba74';", "ctx.fillStyle = accentHex || '#fdba74';"],
  ["labelColor: '#c2410c',", "labelColor: accentHex || '#c2410c',"],
  ["await drawQrPanel(ctx, state, qrMode, '#9a3412', {",
   "await drawQrPanel(ctx, state, qrMode, getQrAccent(state) || accentHex || '#9a3412', {"]
]);

replaceInFn('drawSumi', [
  ["ctx.fillStyle = '#b91c1c';\n    ctx.fillRect(62, 48, 4, HEIGHT - 96);",
   "ctx.fillStyle = accentHex || '#b91c1c';\n    ctx.fillRect(62, 48, 4, HEIGHT - 96);"],
  ["orgColor: '#b91c1c',", "orgColor: accentHex || '#b91c1c',"],
  ["ctx.strokeStyle = '#b91c1c';", "ctx.strokeStyle = accentHex || '#b91c1c';"],
  ["ctx.fillStyle = '#b91c1c';\n    ctx.textAlign = 'center';",
   "ctx.fillStyle = accentHex || '#b91c1c';\n    ctx.textAlign = 'center';"],
  ["subColor: '#b91c1c'", "subColor: accentHex || '#b91c1c'"]
]);

replaceInFn('drawArctic', [
  ["fill: '#0284c7',", "fill: accentHex || '#0284c7',"],
  ["jobColor: '#0284c7',", "jobColor: accentHex || '#0284c7',"],
  ["await drawQrPanel(ctx, state, qrMode, '#0ea5e9', {",
   "await drawQrPanel(ctx, state, qrMode, accentHex || '#0ea5e9', {"],
  ["subColor: '#0284c7'", "subColor: accentHex || '#0284c7'"]
]);

replaceInFn('drawMetro', [
  ["ctx.fillStyle = '#fde047';\n    ctx.fillRect(400, 0, 14, HEIGHT);",
   "ctx.fillStyle = accentHex || '#fde047';\n    ctx.fillRect(400, 0, 14, HEIGHT);"],
  ["ctx.strokeStyle = '#fde047';", "ctx.strokeStyle = accentHex || '#fde047';"],
  ["fill: '#fde047',", "fill: accentHex || '#fde047',"],
  ["ctx.fillStyle = '#fde047';\n      ctx.font", "ctx.fillStyle = accentHex || '#fde047';\n      ctx.font"],
  ["ctx.fillStyle = '#fde047';\n      ctx.beginPath();\n      ctx.arc(56, y, 7",
   "ctx.fillStyle = accentHex || '#fde047';\n      ctx.beginPath();\n      ctx.arc(56, y, 7"]
]);

fs.writeFileSync(path, s);
console.log('written', s.length);
