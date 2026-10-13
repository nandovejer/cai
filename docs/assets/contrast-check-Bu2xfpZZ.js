const C={transparent:[0,0,0,0],white:[255,255,255,1],black:[0,0,0,1]},v=(a,r,n)=>Math.min(n,Math.max(r,a));function B(a,r,n){const e=l=>(l+a/30)%12,o=r*Math.min(n,1-n),t=l=>n-o*Math.max(-1,Math.min(e(l)-3,Math.min(9-e(l),1)));return[t(0)*255,t(8)*255,t(4)*255]}function N(a){var o;const r=String(a).trim().toLowerCase();if(r in C){const[t,l,i,d]=C[r];return{r:t,g:l,b:i,a:d}}const n=(o=r.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/))==null?void 0:o[1];if(n){const t=n.length<=4?[...n].map(i=>i+i).join(""):n,l=i=>parseInt(t.slice(i,i+2),16);return{r:l(0),g:l(2),b:l(4),a:t.length===8?l(6)/255:1}}const e=r.match(/^(rgba?|hsla?)\(([^)]+)\)$/);if(e){const t=e[2].split(/[\s,/]+/).filter(Boolean),l=(i,d=1)=>i.endsWith("%")?parseFloat(i)/100*d:parseFloat(i);if(t.length>=3&&t.length<=4&&t.every(i=>!Number.isNaN(parseFloat(i)))){const i=t[3]===void 0?1:v(l(t[3],1),0,1);if(e[1].startsWith("rgb")){const[u,s,g]=t.slice(0,3).map(h=>v(l(h,255),0,255));return{r:u,g:s,b:g,a:i}}const[d,f,c]=B((parseFloat(t[0])%360+360)%360,v(l(t[1],1),0,1),v(l(t[2],1),0,1));return{r:d,g:f,b:c,a:i}}}throw new Error(`cannot read the colour "${a}": write it as #rrggbb, rgb(), rgba(), hsl() or hsla()`)}const $=(a,r)=>({r:a.r*a.a+r.r*(1-a.a),g:a.g*a.a+r.g*(1-a.a),b:a.b*a.a+r.b*(1-a.a),a:1}),M=({r:a,g:r,b:n})=>{const e=o=>(o/=255)<=.03928?o/12.92:((o+.055)/1.055)**2.4;return .2126*e(a)+.7152*e(r)+.0722*e(n)},F=(a,r)=>{const[n,e]=[M(a),M(r)];return(Math.max(n,e)+.05)/(Math.min(n,e)+.05)},T=a=>`${(Math.floor(a*10+1e-9)/10).toFixed(1)}:1`,y=["surface-page","surface","surface-hover","surface-muted","input-bg"],k=["success","danger","warning","info","teal","purple"],O=["comment","keyword","name","property","string","literal"].map(a=>`code-${a}`),E=[{fg:["text-primary","text-secondary","brand-primary","brand-hover"],bg:y,min:4.5,kind:"text"},{fg:["text-primary","text-secondary"],bg:["surface-strong","surface-pressed"],min:4.5,kind:"text"},{fg:["text-muted"],bg:["input-bg","surface-page","surface"],min:4.5,kind:"text"},{fg:["text-disabled"],bg:["surface-page","surface","input-bg","surface-muted","surface-strong"],min:3,kind:"disabled-text"},{fg:["text-on-fill"],bg:["brand-fill","brand-fill-hover","brand-fill-active","color-danger-fill"],min:4.5,kind:"text"},{fg:["sidebar-text","sidebar-label","sidebar-text-hover"],bg:["sidebar-bg"],min:4.5,kind:"text"},{fg:["sidebar-text-hover"],bg:["sidebar-hover"],min:4.5,kind:"text"},{fg:["sidebar-active-text"],bg:["sidebar-active-bg"],min:4.5,kind:"text"},...k.map(a=>({fg:[`color-${a}`],bg:[`color-${a}-bg > surface-page`,`color-${a}-bg > surface`,`color-${a}-bg > surface-hover`],min:4.5,kind:"text"})),{fg:["color-code"],bg:["surface-page","surface","surface-muted"],min:4.5,kind:"text"},{fg:["focus-ring"],bg:[...y,"surface-strong"],min:3,kind:"ui"},{fg:["input-border"],bg:["input-bg"],min:3,kind:"ui"},{fg:["outline"],bg:["surface-page","surface"],min:3,kind:"ui"},{fg:["brand-primary"],bg:["surface-muted","surface-pressed"],min:3,kind:"ui"},...k.map(a=>({fg:[`color-${a}`],bg:[`color-${a}-bg > surface-strong`,"surface-page","surface","surface-hover","surface-muted","surface-strong"],min:4.5,kind:"text"})),{fg:["color-code"],bg:["surface-strong"],min:4.5,kind:"text"},{fg:O,bg:["surface-muted"],min:4.5,kind:"text"},{fg:["input-border"],bg:[...y,"surface-strong"],min:3,kind:"ui"},{fg:["text-on-fill"],bg:["outline"],min:4.5,kind:"text"},{fg:["color-danger"],bg:["input-bg"],min:3,kind:"ui"},{fg:["text-primary","text-secondary"],bg:k.map(a=>`color-${a}-bg > surface-page`),min:4.5,kind:"text"},{fg:["text-primary","text-secondary","brand-primary"],bg:["brand-subtle > surface-page"],min:4.5,kind:"text"},{fg:["brand-fill","focus-ring"],bg:["brand-subtle > surface-page"],min:3,kind:"ui"},{fg:["brand-fill"],bg:["surface-page","surface"],min:3,kind:"ui",advisory:!0},{fg:["brand-primary"],bg:["surface-strong"],min:3,kind:"ui"},{fg:["sidebar-active-bg"],bg:["sidebar-bg"],min:3,kind:"ui"},{fg:["text-on-fill"],bg:["surface-media"],min:4.5,kind:"text"}],j=[{fg:O,bg:["surface-muted"],min:7,kind:"text"}],D=a=>a==="high-contrast"?[...E,...j]:E;function W(a){const r=[];for(const{fg:n,bg:e,min:o,kind:t,advisory:l=!1}of a)for(const i of n)for(const d of e)r.push({fg:i,bg:d,min:o,kind:t,advisory:l});return r}const P=/^var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)$/;function G(a){function r(n,e=[]){if(e.includes(n))throw new Error(`${n} refers to itself`);const o=a[n];if(o===void 0)throw new Error(`${n} is not defined`);const t=o.match(P);return t?a[t[1]]===void 0&&t[2]?{value:t[2].trim(),chain:[...e,n]}:r(t[1],[...e,n]):{value:o,chain:[...e,n]}}return r}function q(a,r){const n=[],e=[],o=l=>{const{value:i,chain:d}=a(`--cai-${l}`);try{return{colour:N(i),chain:d}}catch(f){throw f.tokens=d,f}},t=l=>{const i=l.split(">").map(c=>c.trim());let d=o("surface-page").colour;const f=[];for(const c of i.reverse()){const u=o(c);f.push(...u.chain),d=$(u.colour,d)}return{colour:d,chain:f}};for(const{fg:l,bg:i,min:d,kind:f,advisory:c}of W(r))try{const u=t(i),s=o(l),g=F($(s.colour,u.colour),u.colour);n.push({foreground:`--cai-${l}`,background:i,ratio:g,minimum:d,kind:f,advisory:c,ok:g+1e-9>=d,tokens:[...s.chain,...u.chain]})}catch(u){e.push({foreground:`--cai-${l}`,background:i,reason:u.message,tokens:u.tokens??[]})}return{results:n,unreadable:e}}const w=["light","dark","high-contrast"],H=a=>a.replace(/\/\*[\s\S]*?\*\//g,r=>r.replace(/[^\n]/g," "));function R(a){const r=H(a),n=[];let e=0,o=1;function t(){let d=0,f="",c=e,u=o;for(;e<r.length&&/\s/.test(r[e]);)r[e]===`
`&&o++,e++;for(c=e,u=o;e<r.length;e++){const s=r[e];if(s===`
`&&o++,f){s==="\\"?e++:s===f&&(f="");continue}if(s==='"'||s==="'")f=s;else if(s==="("||s==="[")d++;else if(s===")"||s==="]")d--;else if(d<=0&&(s==="{"||s===";"||s==="}"))break}return{prelude:r.slice(c,e).trim(),stop:r[e],line:u}}function l(d,f,c){const u=[];for(;e<r.length;){const{prelude:s,stop:g,line:h}=t();if(g==="{")e++,s.startsWith("@")?i(s,d,f):l(d,s.split(",").map(m=>m.trim()).filter(Boolean),h);else{const m=s.indexOf(":");if(s&&!s.startsWith("@")&&m>0){const b=s.slice(0,m).trim();b.startsWith("--cai-")&&u.push({name:b,value:s.slice(m+1).trim(),line:h})}if(g==="}"){e++;break}if(g===";")e++;else break}}return f&&u.length&&n.push({selectors:f,conditions:d,declarations:u,line:c}),u}function i(d,f,c){l([...f,d],c??null,o)}return l([],null,1),n}function A(a){let n=a.trim().replace(/\s+/g,""),e=null,o=null,t=0,l=0;for(/^html/i.test(n)?(n=n.slice(4),l=1):n.startsWith("*")&&(n=n.slice(1));;){if(n.startsWith(":root")){n=n.slice(5),t++;continue}const i=n.match(/^\[(data-theme|data-mode)=(?:"([\w-]+)"|'([\w-]+)'|([\w-]+))\]/);if(i){const d=i[2]??i[3]??i[4];i[1]==="data-theme"?e=d:o=d,n=n.slice(i[0].length),t++;continue}break}return n!==""?null:{theme:e,mode:o,specificity:t*100+l}}const _=a=>{var r;return((r=a.match(/^@media\s*\(\s*prefers-color-scheme\s*:\s*(light|dark)\s*\)$/i))==null?void 0:r[1].toLowerCase())??null},U=a=>/^@(layer|supports)\b/i.test(a);function Y(a){const r=new Set;for(const{selectors:e}of a)for(const o of e){const t=A(o);t!=null&&t.theme&&!w.includes(t.theme)&&r.add(t.theme)}const n=w.map(e=>({name:e,theme:e,mode:null,scheme:e==="high-contrast"?null:e}));for(const e of[...r].sort()){n.push({name:e,theme:e,mode:null,scheme:"light",custom:!0});for(const o of w)n.push({name:`${e}/${o}`,theme:e,mode:o,scheme:o==="high-contrast"?null:o,custom:!0})}return n}function V(a,r){const n={},e={},o={},t=[];let l=0;for(const{file:i,rules:d}of r)for(const f of d){l++;let c="any",u=null;for(const s of f.conditions){const g=_(s);g?c=g:U(s)||(u=s)}if(u){t.push({file:i,line:f.line,selector:f.selectors.join(", "),reason:`${u} is not evaluated`});continue}if(!(c!=="any"&&c!==a.scheme))for(const s of f.selectors){const g=A(s);if(!g){i!=="tokens"&&t.push({file:i,line:f.line,selector:s,reason:"only html, :root, [data-theme] and [data-mode] selectors are read"});continue}const h=g.theme===null||g.theme===a.theme,m=g.mode===null?!0:g.mode===a.mode;if(!(!h||!m))for(const{name:b,value:L,line:I}of f.declarations){const S=g.specificity*1e6+l;o[b]!==void 0&&o[b]>S||(o[b]=S,n[b]=L,e[b]={file:i,line:I})}}}return{values:n,origin:e,ignored:t}}function z(a,{strict:r=!1}={}){const n=a.slice(1),e=Y(n.flatMap(c=>c.rules)),o=[],t=[],l=new Map,i=new Map;let d=0;const f=(c,u,s)=>[...new Set(c)].filter(g=>s[g]&&s[g].file!=="tokens").map(g=>({token:g,value:u[g],file:s[g].file,line:s[g].line}));for(const c of e){const{values:u,origin:s,ignored:g}=V(c,a);for(const b of g)i.set(`${b.file}:${b.line} ${b.selector}`,b);const{results:h,unreadable:m}=q(G(u),D(c.name));for(const b of h)d++,!b.ok&&(b.advisory&&!r?t:o).push({mode:c.name,foreground:b.foreground,background:b.background,ratio:Math.floor(b.ratio*100)/100,minimum:b.minimum,kind:b.kind,overrides:f(b.tokens,u,s)});for(const b of m)l.set(b.reason,{mode:c.name,foreground:b.foreground,background:b.background,reason:b.reason,overrides:f(b.tokens,u,s)})}return{ok:o.length===0&&l.size===0,modes:e.map(c=>c.name),checked:d,failures:o,warnings:t,unreadable:[...l.values()],ignored:[...i.values()]}}const K=`/* ==========================================================================
   CAI Design System — Tokens (no web fonts)
   Generated from tokens.json · Do not edit manually
   ========================================================================== */

@layer cai.tokens, cai.themes, cai.settings, cai.generic, cai.elements, cai.objects, cai.components, cai.utilities, cai.site, cai.landing, cai.cms, cai.print;
@layer cai.tokens {
/* -------------------------------------------------------------------------
   LAYER 1: PRIMITIVOS
   Los valores base. Nunca cambian entre temas.
   Regla: los componentes NUNCA usan estas variables directamente.
   -------------------------------------------------------------------------- */
:root {
  /* Blue */
  --cai-blue-10: #f6fbff;
  --cai-blue-20: #dff0ff;
  --cai-blue-30: #b3d9ff;
  --cai-blue-40: #77b9ff;
  --cai-blue-50: #208fff;
  --cai-blue-60: #0066cf;
  --cai-blue-70: #004299;
  --cai-blue-80: #00256c;
  --cai-blue-90: #000d4e;
  --cai-blue-100: #020831;

  /* Gray */
  --cai-gray-10: #f9fafc;
  --cai-gray-20: #e9eef4;
  --cai-gray-30: #ced5dd;
  --cai-gray-40: #adb5bd;
  --cai-gray-50: #889099;
  --cai-gray-60: #646b73;
  --cai-gray-70: #434951;
  --cai-gray-80: #282d34;
  --cai-gray-90: #16191e;
  --cai-gray-100: #0d0e11;

  /* Green */
  --cai-green-10: #eefff5;
  --cai-green-20: #beffda;
  --cai-green-30: #89edb8;
  --cai-green-40: #52cf92;
  --cai-green-50: #08aa6b;
  --cai-green-60: #007f4d;
  --cai-green-70: #005733;

  /* Red */
  --cai-red-10: #fff8f8;
  --cai-red-20: #ffe7e6;
  --cai-red-30: #ffc3c1;
  --cai-red-40: #ff8f8c;
  --cai-red-50: #ef4f51;
  --cai-red-60: #c31a26;
  --cai-red-70: #8c000c;

  /* Yellow */
  --cai-yellow-10: #fffae8;
  --cai-yellow-20: #ffedb7;
  --cai-yellow-30: #ffcd51;
  --cai-yellow-40: #e2a928;
  --cai-yellow-50: #bc8200;
  --cai-yellow-60: #7c4d00;
  --cai-yellow-70: #553000;

  /* Teal */
  --cai-teal-10: #effefa;
  --cai-teal-20: #c3fbec;
  --cai-teal-40: #62c9b5;
  --cai-teal-50: #30a491;
  --cai-teal-60: #007c6d;
  --cai-teal-70: #00554b;

  /* Purple */
  --cai-purple-10: #fcf9ff;
  --cai-purple-20: #f3e8ff;
  --cai-purple-40: #ca9aff;
  --cai-purple-50: #ab67f0;
  --cai-purple-60: #853bca;
  --cai-purple-70: #610ca0;

  /* Spacing (4px base, smallest to largest) */
  --cai-space-3xs: 2px;
  --cai-space-2xs: 4px;
  --cai-space-xs: 8px;
  --cai-space-sm: 12px;
  --cai-space-md: 16px;
  --cai-space-lg: 24px;
  --cai-space-xl: 32px;
  --cai-space-2xl: 48px;
  --cai-space-3xl: 64px;
  --cai-space-4xl: 96px;

  /* Control heights */
  --cai-control-sm: 28px;
  --cai-control-md: 36px;
  --cai-control-lg: 44px;
  --cai-control-xl: 56px;

  /* Typography */
  --cai-font-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --cai-font-serif: "ET Book", charter, "Bitstream Charter", "Sitka Text", cambria, georgia, serif;
  --cai-font-mono: ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  --cai-text-xs: 0.75rem;
  --cai-text-sm: 0.875rem;
  --cai-text-md: 0.9375rem;
  --cai-text-base: 1rem;
  --cai-text-lg: 1.25rem;
  --cai-text-xl: 1.5625rem;
  --cai-text-2xl: 1.9375rem;
  --cai-text-3xl: 2.4375rem;
  --cai-text-4xl: 3.0625rem;

  /* Radius */
  --cai-radius-none: 0px;
  --cai-radius-sm: 2px;
  --cai-radius-md: 4px;
  --cai-radius-full: 9999px;

  /* Shadows */
  --cai-shadow-sm: 0 1px 2px rgba(35,28,22,.08), 0 0 1px rgba(35,28,22,.1);
  --cai-shadow-md: 0 4px 10px rgba(35,28,22,.1), 0 2px 4px rgba(35,28,22,.06);
  --cai-shadow-lg: 0 14px 28px rgba(35,28,22,.14), 0 6px 12px rgba(35,28,22,.08);
  --cai-shadow-icon: 0 2px 8px rgba(0,0,0,.5);
}

/* -------------------------------------------------------------------------
   LAYER 2: SEMANTIC
   Theme-aware tokens. Components ONLY consume these (never Layer 1 primitives).
   Base color modes are activated via data-theme on <html>:
     <html>                            → default (light)
     <html data-theme="light">         → light (explicit)
     <html data-theme="dark">          → dark
     <html data-theme="high-contrast"> → high contrast
   The values here are the Vejer look. A theme of your own overrides them
   under its own [data-theme="<name>"] scope and uses data-mode for the dark
   and high-contrast variants; start from packages/core/src/themes/_template.css.

   Surfaces, the same model in every mode: the page and the surfaces on it
   (cards, dialogs, fields) are one flat face. Two tones step away from it:
   --cai-surface-muted (code, wells) one step, --cai-surface-strong (table
   headers, tags, tooltips, toasts) two. Hover takes the muted step and
   pressed the strong one. Light steps darker from white; dark steps
   lighter from gray-90, and keeps gray-100 for the sidebar.
   -------------------------------------------------------------------------- */

:root,
[data-theme="light"] {
  /* Surfaces */
  --cai-surface-page: #fbf8f2; /* the walls: a warm, creamy white */
  --cai-surface: #fffdf9; /* fresh whitewash, raised surfaces */
  --cai-surface-hover: #f4ede0; /* sun on sandstone: hover */
  --cai-surface-pressed: #ebe0cc; /* sandstone in shade: pressed */
  --cai-surface-muted: #fbf8f2; /* the walls: a warm, creamy white */
  --cai-surface-strong: #efe6d6; /* cut sandstone: the deepest layer */
  --cai-scrim: rgba(13, 14, 17, 0.6); /* gray-100 */
  --cai-surface-media: #000;

  /* Text (icons use the same tokens) */
  --cai-text-primary: #231c16; /* wrought iron: text, 13.6:1 on the stone */
  --cai-text-secondary: #6b5a48; /* old door wood: secondary text, 5:1 or more */
  --cai-text-muted: #7a6a58; /* 5.1:1 on the input */
  --cai-text-disabled: #8f8172; /* 3:1 on surface-strong, the worst surface */
  --cai-text-on-fill: #fff;

  /* Lines */
  --cai-divider: #e3d4b8; /* sandstone joints: hairlines */
  --cai-outline: #807366; /* 4.6:1 under the white text of .cai-badge--gray; 3:1 or more as a border */
  --cai-focus-ring: #2365a6; /* the sky, deepened to 4.6:1: links and actions */

  /* Brand */
  --cai-brand-primary: #2365a6; /* the sky, deepened to 4.6:1: links and actions */
  --cai-brand-hover: #1b5089;
  --cai-brand-active: #143d69;
  --cai-brand-subtle: #e3eef9;
  /* Solid brand surfaces that carry --cai-text-on-fill (primary button,
     badge). Same as the brand in light; darker than it in dark mode, where
     the brand is light enough to be read as text on dark surfaces. */
  --cai-brand-fill: #2365a6; /* white text 6:1 */
  --cai-brand-fill-hover: #1b5089;
  --cai-brand-fill-active: #143d69;

  /* Sidebar */
  --cai-sidebar-bg: #2a211a;
  --cai-sidebar-text: #e3d5bf; /* 10.9:1 */
  --cai-sidebar-text-hover: #fff;
  --cai-sidebar-hover: #3a2f25;
  --cai-sidebar-active-bg: #9cc8ee; /* light sky */
  --cai-sidebar-active-text: #1a140f; /* 10.4:1 */
  --cai-sidebar-border: #3d3127;
  --cai-sidebar-label: #b9a78f; /* 6.8:1 */
  --cai-sidebar-logo-bg: #9cc8ee; /* shares the active link's text colour */

  /* Status */
  --cai-color-success: #177734;
  --cai-color-success-bg: var(--cai-green-10);
  --cai-color-danger: #ca1c25;
  --cai-color-danger-bg: var(--cai-red-10);
  --cai-color-danger-fill: var(--cai-color-danger);
  --cai-color-warning: var(--cai-yellow-60);
  --cai-color-warning-accent: var(--cai-yellow-30);
  --cai-color-warning-bg: var(--cai-yellow-10);
  --cai-color-info: var(--cai-blue-70);
  --cai-color-info-bg: var(--cai-blue-10);

  /* Inputs */
  --cai-input-bg: #fffdf9; /* fresh whitewash, raised surfaces */
  --cai-input-border: #8b7d6f; /* field and strong borders, 3:1 on every surface */

  /* Extended */
  --cai-color-teal: #00736f;
  --cai-color-teal-bg: var(--cai-teal-10);
  --cai-color-purple: #803ae9;
  --cai-color-purple-bg: var(--cai-purple-10);
  --cai-color-code: #803ae9;

  /* Code syntax (pre.cai-code-block, on --cai-surface-muted). Keywords stay
     ink and bold; colour goes to what the author wrote: names, properties,
     values. Comments are muted and italic. No red: red means error. */
  --cai-code-comment: var(--cai-gray-60); /* 5.2:1 */
  --cai-code-keyword: var(--cai-text-primary);
  --cai-code-name: var(--cai-blue-70); /* 9.0:1 */
  --cai-code-property: var(--cai-purple-60); /* 5.8:1 */
  --cai-code-string: var(--cai-green-60); /* 4.9:1 */
  --cai-code-literal: var(--cai-yellow-60); /* 6.9:1 */
}

/* -------------------------------------------------------------------------
   COLOR MODE: DARK — <html data-theme="dark">
   -------------------------------------------------------------------------- */

/* The :root:has() selectors are the no-JavaScript path: a checked radio of the
   color-mode switcher (.cai-mode-switcher) re-scopes the tokens for the
   session. theme.js adds persistence and the OS preference on top. They are
   wrapped in :is() so a browser without :has() drops them instead of
   invalidating the whole rule. */
[data-theme="dark"],
:is(:root:has(input[name="cai-theme"][value="dark"]:checked)) {
  /* Surfaces */
  --cai-surface-page: #1c1712;
  --cai-surface: #241e18;
  --cai-surface-hover: #2e261f;
  --cai-surface-pressed: #3a3028;
  --cai-surface-muted: #1c1712;
  --cai-surface-strong: #3a3028;
  --cai-scrim: rgba(0, 0, 0, 0.7);
  --cai-surface-media: #000;

  /* Shadows: the same offsets on a darker ground, so a heavier black */
  --cai-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --cai-shadow-md: 0 4px 10px rgba(0, 0, 0, 0.5);
  --cai-shadow-lg: 0 14px 28px rgba(0, 0, 0, 0.6);

  /* Text (icons use the same tokens) */
  --cai-text-primary: #f3ece1; /* whitewash by night: 11:1 on the stone */
  --cai-text-secondary: #b8a690; /* 5.5:1 on the stone */
  --cai-text-muted: #a08f7a; /* 5.3:1 on the input */
  --cai-text-disabled: #877a69; /* 3:1 on surface-strong */
  --cai-text-on-fill: #fff;

  /* Lines */
  --cai-divider: #43382d;
  --cai-outline: #7d7062; /* white badge text 4.8:1; 3:1 or more on page, surface and hover */
  --cai-focus-ring: #6fb1ec; /* 5:1 on the stone and on the brand tint */

  /* Brand */
  /* blue-40: 4.5:1 or more as text on every dark surface */
  --cai-brand-primary: #6fb1ec; /* 5:1 on the stone and on the brand tint */
  --cai-brand-hover: #9ccaf2;
  --cai-brand-active: #c8e1f8;
  --cai-brand-subtle: rgba(32, 143, 255, 0.14); /* blue-50 */
  --cai-brand-fill: #2172c1; /* white text 4.9:1; 3:1 or more on page and surfaces: the light sky is for text */
  --cai-brand-fill-hover: #18548f;
  --cai-brand-fill-active: #134577;

  /* Sidebar */
  --cai-sidebar-bg: #14100c;
  --cai-sidebar-text: #cbbba5; /* 10.1:1 */
  --cai-sidebar-text-hover: #fff;
  --cai-sidebar-hover: #241e18;
  --cai-sidebar-active-bg: #8cc4f5;
  --cai-sidebar-active-text: #14100c;
  --cai-sidebar-border: #2e261f;
  --cai-sidebar-label: #a8977f; /* 6.7:1 */
  --cai-sidebar-logo-bg: #8cc4f5;

  /* Status */
  --cai-color-success: var(--cai-green-30);
  --cai-color-success-bg: rgba(82, 207, 146, 0.12);
  --cai-color-danger: var(--cai-red-30);
  --cai-color-danger-bg: rgba(239, 79, 81, 0.12);
  --cai-color-danger-fill: var(--cai-red-60); /* white text 4.8:1 */
  --cai-color-warning: var(--cai-yellow-30);
  --cai-color-warning-accent: var(--cai-yellow-20);
  --cai-color-warning-bg: rgba(255, 205, 81, 0.12);
  --cai-color-info: var(--cai-blue-30);
  --cai-color-info-bg: rgba(119, 185, 255, 0.12);

  /* Inputs */
  --cai-input-bg: #241e18;
  --cai-input-border: #877a69; /* 3:1 on every surface */

  /* Extended */
  --cai-color-teal: var(--cai-teal-40);
  --cai-color-teal-bg: rgba(98, 201, 181, 0.12);
  --cai-color-purple: var(--cai-purple-20);
  --cai-color-purple-bg: rgba(202, 154, 255, 0.12);
  --cai-color-code: var(--cai-purple-40); /* 5.5:1 on surface-strong */

  /* Code syntax, on --cai-surface-muted (gray-80) */
  --cai-code-comment: var(--cai-gray-40);
  --cai-code-keyword: var(--cai-text-primary);
  --cai-code-name: var(--cai-blue-30);
  --cai-code-property: var(--cai-purple-40);
  --cai-code-string: var(--cai-green-40);
  --cai-code-literal: var(--cai-yellow-40);
}

/* -------------------------------------------------------------------------
   COLOR MODE: HIGH CONTRAST — <html data-theme="high-contrast">
   Pure white page, pure black text, strong borders. Maximum WCAG contrast.
   -------------------------------------------------------------------------- */

[data-theme="high-contrast"],
:is(:root:has(input[name="cai-theme"][value="high-contrast"]:checked)) {
  /* Surfaces */
  --cai-surface-page: #fff;
  --cai-surface: #fff;
  --cai-surface-hover: var(--cai-gray-10);
  --cai-surface-pressed: var(--cai-gray-20);
  --cai-surface-muted: var(--cai-gray-10);
  --cai-surface-strong: var(--cai-gray-20);
  --cai-scrim: rgba(13, 14, 17, 0.6); /* gray-100 */
  --cai-surface-media: #000;

  /* Shadows: an edge instead of a blur, which a low-vision reader cannot see */
  --cai-shadow-sm: none;
  --cai-shadow-md: 0 0 0 1px #000;
  --cai-shadow-lg: 0 0 0 2px #000;

  /* Text (icons use the same tokens) */
  --cai-text-primary: #000;
  --cai-text-secondary: var(--cai-gray-100);
  --cai-text-muted: var(--cai-gray-70);
  --cai-text-disabled: var(--cai-gray-60); /* 3.8:1 on surface-strong */
  --cai-text-on-fill: #fff;

  /* Lines */
  --cai-divider: var(--cai-gray-70);
  --cai-outline: #000;
  --cai-focus-ring: #000;

  /* Brand */
  --cai-brand-primary: var(--cai-blue-80);
  --cai-brand-hover: var(--cai-blue-90);
  --cai-brand-active: var(--cai-blue-100);
  --cai-brand-subtle: var(--cai-blue-10);
  --cai-brand-fill: var(--cai-blue-80); /* white text 6:1 */
  --cai-brand-fill-hover: var(--cai-blue-90);
  --cai-brand-fill-active: var(--cai-blue-100);

  /* Sidebar */
  --cai-sidebar-bg: #000;
  --cai-sidebar-text: var(--cai-gray-30);
  --cai-sidebar-text-hover: #fff;
  --cai-sidebar-hover: var(--cai-gray-90);
  --cai-sidebar-active-bg: #fff;
  --cai-sidebar-active-text: #000;
  --cai-sidebar-border: var(--cai-gray-80);
  --cai-sidebar-label: var(--cai-gray-50);
  --cai-sidebar-logo-bg: #fff;

  /* Status */
  --cai-color-success: #105224;
  --cai-color-success-bg: var(--cai-green-10);
  --cai-color-danger: #8d131a;
  --cai-color-danger-bg: var(--cai-red-10);
  --cai-color-danger-fill: var(--cai-color-danger);
  --cai-color-warning: #5a4300;
  --cai-color-warning-accent: var(--cai-yellow-40);
  --cai-color-warning-bg: var(--cai-yellow-10);
  --cai-color-info: var(--cai-blue-80);
  --cai-color-info-bg: var(--cai-blue-10);

  /* Inputs */
  --cai-input-bg: #fff;
  --cai-input-border: #000;

  /* Extended */
  --cai-color-teal: #00504d;
  --cai-color-teal-bg: var(--cai-teal-10);
  --cai-color-purple: #5828a1;
  --cai-color-purple-bg: var(--cai-purple-10);
  --cai-color-code: #5828a1;

  /* Code syntax, on --cai-surface-muted: 7:1 or more, darker steps of the
     same hues as light */
  --cai-code-comment: var(--cai-gray-70); /* 8.7:1 */
  --cai-code-keyword: var(--cai-text-primary);
  --cai-code-name: var(--cai-blue-80); /* 13.6:1 */
  --cai-code-property: var(--cai-purple-70); /* 9.7:1 */
  --cai-code-string: var(--cai-green-70); /* 8.3:1 */
  --cai-code-literal: var(--cai-yellow-70); /* 11.1:1 */
}

}
`,x=(a,r)=>a.replace(/\{(\w+)\}/g,(n,e)=>String(r[e]??""));function p(a,r,n="li"){const e=document.createElement(n);return e.textContent=r,a.append(e),e}function J(a=document){const r=a.querySelector("[data-contrast-tool]");if(!r||r.dataset.ready)return;const n=r.querySelector("textarea"),e=r.querySelector("button"),o=r.querySelector("[data-contrast-result]");if(!n||!e||!o)return;const t=o.dataset,l={file:"tokens",rules:R(K)};e.addEventListener("click",()=>{let i;try{i=z([l,{file:t.file,rules:R(n.value)}])}catch(c){o.replaceChildren(),p(o,`${t.error} ${c.message}`,"p");return}o.replaceChildren();const d=i.modes.join(", ");p(o,x(i.ok?t.pass:t.fail,{checked:i.checked,modes:d,failures:i.failures.length+i.unreadable.length}),"p");const f=document.createElement("ul");for(const c of i.failures){const u=p(f,x(t.item,{modes:c.mode,foreground:c.foreground,background:c.background,ratio:T(c.ratio),minimum:c.minimum}));for(const s of c.overrides)p(u,x(t.set,{token:s.token,value:s.value,line:s.line}),"small").before(document.createElement("br"))}for(const c of i.unreadable)p(f,x(t.unreadable,{foreground:c.foreground,background:c.background,reason:c.reason}));for(const c of i.warnings)p(f,x(t.warning,{modes:c.mode,foreground:c.foreground,background:c.background,ratio:T(c.ratio),minimum:c.minimum}));for(const c of i.ignored)p(f,x(t.ignored,{selector:c.selector,line:c.line}));f.children.length&&o.append(f)}),r.dataset.ready=""}export{J as initContrastTool};
