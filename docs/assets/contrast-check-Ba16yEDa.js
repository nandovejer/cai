const S={transparent:[0,0,0,0],white:[255,255,255,1],black:[0,0,0,1]},v=(n,t,r)=>Math.min(r,Math.max(t,n));function I(n,t,r){const e=c=>(c+n/30)%12,u=t*Math.min(r,1-r),a=c=>r-u*Math.max(-1,Math.min(e(c)-3,Math.min(9-e(c),1)));return[a(0)*255,a(8)*255,a(4)*255]}function B(n){var u;const t=String(n).trim().toLowerCase();if(t in S){const[a,c,l,i]=S[t];return{r:a,g:c,b:l,a:i}}const r=(u=t.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/))==null?void 0:u[1];if(r){const a=r.length<=4?[...r].map(l=>l+l).join(""):r,c=l=>parseInt(a.slice(l,l+2),16);return{r:c(0),g:c(2),b:c(4),a:a.length===8?c(6)/255:1}}const e=t.match(/^(rgba?|hsla?)\(([^)]+)\)$/);if(e){const a=e[2].split(/[\s,/]+/).filter(Boolean),c=(l,i=1)=>l.endsWith("%")?parseFloat(l)/100*i:parseFloat(l);if(a.length>=3&&a.length<=4&&a.every(l=>!Number.isNaN(parseFloat(l)))){const l=a[3]===void 0?1:v(c(a[3],1),0,1);if(e[1].startsWith("rgb")){const[f,s,z]=a.slice(0,3).map(m=>v(c(m,255),0,255));return{r:f,g:s,b:z,a:l}}const[i,d,o]=I((parseFloat(a[0])%360+360)%360,v(c(a[1],1),0,1),v(c(a[2],1),0,1));return{r:i,g:d,b:o,a:l}}}throw new Error(`cannot read the colour "${n}": write it as #rrggbb, rgb(), rgba(), hsl() or hsla()`)}const $=(n,t)=>({r:n.r*n.a+t.r*(1-n.a),g:n.g*n.a+t.g*(1-n.a),b:n.b*n.a+t.b*(1-n.a),a:1}),C=({r:n,g:t,b:r})=>{const e=u=>(u/=255)<=.03928?u/12.92:((u+.055)/1.055)**2.4;return .2126*e(n)+.7152*e(t)+.0722*e(r)},N=(n,t)=>{const[r,e]=[C(n),C(t)];return(Math.max(r,e)+.05)/(Math.min(r,e)+.05)},M=n=>`${(Math.floor(n*10+1e-9)/10).toFixed(1)}:1`,x=["surface-page","surface","surface-hover","surface-muted","input-bg"],y=["success","danger","warning","info","teal","purple"],R=["comment","keyword","name","property","string","literal"].map(n=>`code-${n}`),T=[{fg:["text-primary","text-secondary","brand-primary","brand-hover"],bg:x,min:4.5,kind:"text"},{fg:["text-primary","text-secondary"],bg:["surface-strong","surface-pressed"],min:4.5,kind:"text"},{fg:["text-muted"],bg:["input-bg","surface-page","surface"],min:4.5,kind:"text"},{fg:["text-disabled"],bg:["surface-page","surface","input-bg","surface-muted","surface-strong"],min:3,kind:"disabled-text"},{fg:["text-on-fill"],bg:["brand-fill","brand-fill-hover","brand-fill-active","color-danger-fill"],min:4.5,kind:"text"},{fg:["sidebar-text","sidebar-label","sidebar-text-hover"],bg:["sidebar-bg"],min:4.5,kind:"text"},{fg:["sidebar-text-hover"],bg:["sidebar-hover"],min:4.5,kind:"text"},{fg:["sidebar-active-text"],bg:["sidebar-active-bg"],min:4.5,kind:"text"},...y.map(n=>({fg:[`color-${n}`],bg:[`color-${n}-bg > surface-page`,`color-${n}-bg > surface`,`color-${n}-bg > surface-hover`],min:4.5,kind:"text"})),{fg:["color-code"],bg:["surface-page","surface","surface-muted"],min:4.5,kind:"text"},{fg:["focus-ring"],bg:[...x,"surface-strong"],min:3,kind:"ui"},{fg:["input-border"],bg:["input-bg"],min:3,kind:"ui"},{fg:["outline"],bg:["surface-page","surface"],min:3,kind:"ui"},{fg:["brand-primary"],bg:["surface-muted","surface-pressed"],min:3,kind:"ui"},...y.map(n=>({fg:[`color-${n}`],bg:[`color-${n}-bg > surface-strong`,"surface-page","surface","surface-hover","surface-muted","surface-strong"],min:4.5,kind:"text"})),{fg:["color-code"],bg:["surface-strong"],min:4.5,kind:"text"},{fg:R,bg:["surface-muted"],min:4.5,kind:"text"},{fg:["input-border"],bg:[...x,"surface-strong"],min:3,kind:"ui"},{fg:["text-on-fill"],bg:["outline"],min:4.5,kind:"text"},{fg:["color-danger"],bg:["input-bg"],min:3,kind:"ui"},{fg:["text-primary","text-secondary"],bg:y.map(n=>`color-${n}-bg > surface-page`),min:4.5,kind:"text"},{fg:["text-primary","text-secondary","brand-primary"],bg:["brand-subtle > surface-page"],min:4.5,kind:"text"},{fg:["brand-fill","focus-ring"],bg:["brand-subtle > surface-page"],min:3,kind:"ui"},{fg:["brand-fill"],bg:["surface-page","surface"],min:3,kind:"ui",advisory:!0},{fg:["brand-primary"],bg:["surface-strong"],min:3,kind:"ui"},{fg:["sidebar-active-bg"],bg:["sidebar-bg"],min:3,kind:"ui"},{fg:["text-on-fill"],bg:["surface-media"],min:4.5,kind:"text"},{fg:["brand-primary"],bg:["color-warning-bg > surface-page"],min:4.5,kind:"text"},{fg:["focus-ring"],bg:["color-warning-bg > surface-page"],min:3,kind:"ui"},{fg:["brand-fill"],bg:["surface-muted"],min:3,kind:"ui"},{fg:["outline"],bg:["input-bg"],min:3,kind:"ui"}],F=[{fg:R,bg:["surface-muted"],min:7,kind:"text"}],W=n=>n==="high-contrast"?[...T,...F]:T;function j(n){const t=[];for(const{fg:r,bg:e,min:u,kind:a,advisory:c=!1}of n)for(const l of r)for(const i of e)t.push({fg:l,bg:i,min:u,kind:a,advisory:c});return t}const D=/^var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)$/;function P(n){function t(r,e=[]){if(e.includes(r))throw new Error(`${r} refers to itself`);const u=n[r];if(u===void 0)throw new Error(`${r} is not defined`);const a=u.match(D);return a?n[a[1]]===void 0&&a[2]?{value:a[2].trim(),chain:[...e,r]}:t(a[1],[...e,r]):{value:u,chain:[...e,r]}}return t}function G(n,t){const r=[],e=[],u=c=>{const{value:l,chain:i}=n(`--luz-${c}`);try{return{colour:B(l),chain:i}}catch(d){throw d.tokens=i,d}},a=c=>{const l=c.split(">").map(o=>o.trim());let i=u("surface-page").colour;const d=[];for(const o of l.reverse()){const f=u(o);d.push(...f.chain),i=$(f.colour,i)}return{colour:i,chain:d}};for(const{fg:c,bg:l,min:i,kind:d,advisory:o}of j(t))try{const f=a(l),s=u(c),z=N($(s.colour,f.colour),f.colour);r.push({foreground:`--luz-${c}`,background:l,ratio:z,minimum:i,kind:d,advisory:o,ok:z+1e-9>=i,tokens:[...s.chain,...f.chain]})}catch(f){e.push({foreground:`--luz-${c}`,background:l,reason:f.message,tokens:f.tokens??[]})}return{results:r,unreadable:e}}const k=["light","dark","high-contrast"],q=n=>n.replace(/\/\*[\s\S]*?\*\//g,t=>t.replace(/[^\n]/g," "));function E(n){const t=q(n),r=[];let e=0,u=1;function a(){let i=0,d="",o=e,f=u;for(;e<t.length&&/\s/.test(t[e]);)t[e]===`
`&&u++,e++;for(o=e,f=u;e<t.length;e++){const s=t[e];if(s===`
`&&u++,d){s==="\\"?e++:s===d&&(d="");continue}if(s==='"'||s==="'")d=s;else if(s==="("||s==="[")i++;else if(s===")"||s==="]")i--;else if(i<=0&&(s==="{"||s===";"||s==="}"))break}return{prelude:t.slice(o,e).trim(),stop:t[e],line:f}}function c(i,d,o){const f=[];for(;e<t.length;){const{prelude:s,stop:z,line:m}=a();if(z==="{")e++,s.startsWith("@")?l(s,i,d):c(i,s.split(",").map(b=>b.trim()).filter(Boolean),m);else{const b=s.indexOf(":");if(s&&!s.startsWith("@")&&b>0){const g=s.slice(0,b).trim();g.startsWith("--luz-")&&f.push({name:g,value:s.slice(b+1).trim(),line:m})}if(z==="}"){e++;break}if(z===";")e++;else break}}return d&&f.length&&r.push({selectors:d,conditions:i,declarations:f,line:o}),f}function l(i,d,o){c([...d,i],o??null,u)}return c([],null,1),r}function O(n){let r=n.trim().replace(/\s+/g,""),e=null,u=null,a=0,c=0;for(/^html/i.test(r)?(r=r.slice(4),c=1):r.startsWith("*")&&(r=r.slice(1));;){if(r.startsWith(":root")){r=r.slice(5),a++;continue}const l=r.match(/^\[(data-theme|data-mode)=(?:"([\w-]+)"|'([\w-]+)'|([\w-]+))\]/);if(l){const i=l[2]??l[3]??l[4];l[1]==="data-theme"?e=i:u=i,r=r.slice(l[0].length),a++;continue}break}return r!==""?null:{theme:e,mode:u,specificity:a*100+c}}const H=n=>{var t;return((t=n.match(/^@media\s*\(\s*prefers-color-scheme\s*:\s*(light|dark)\s*\)$/i))==null?void 0:t[1].toLowerCase())??null},U=n=>/^@(layer|supports)\b/i.test(n);function _(n){const t=new Set;for(const{selectors:e}of n)for(const u of e){const a=O(u);a!=null&&a.theme&&!k.includes(a.theme)&&t.add(a.theme)}const r=k.map(e=>({name:e,theme:e,mode:null,scheme:e==="high-contrast"?null:e}));for(const e of[...t].sort()){r.push({name:e,theme:e,mode:null,scheme:"light",custom:!0});for(const u of k)r.push({name:`${e}/${u}`,theme:e,mode:u,scheme:u==="high-contrast"?null:u,custom:!0})}return r}function Y(n,t){const r={},e={},u={},a=[];let c=0;for(const{file:l,rules:i}of t)for(const d of i){c++;let o="any",f=null;for(const s of d.conditions){const z=H(s);z?o=z:U(s)||(f=s)}if(f){a.push({file:l,line:d.line,selector:d.selectors.join(", "),reason:`${f} is not evaluated`});continue}if(!(o!=="any"&&o!==n.scheme))for(const s of d.selectors){const z=O(s);if(!z){l!=="tokens"&&a.push({file:l,line:d.line,selector:s,reason:"only html, :root, [data-theme] and [data-mode] selectors are read"});continue}const m=z.theme===null||z.theme===n.theme,b=z.mode===null?!0:z.mode===n.mode;if(!(!m||!b))for(const{name:g,value:L,line:A}of d.declarations){const w=z.specificity*1e6+c;u[g]!==void 0&&u[g]>w||(u[g]=w,r[g]=L,e[g]={file:l,line:A})}}}return{values:r,origin:e,ignored:a}}function V(n,{strict:t=!1}={}){const r=n.slice(1),e=_(r.flatMap(o=>o.rules)),u=[],a=[],c=new Map,l=new Map;let i=0;const d=(o,f,s)=>[...new Set(o)].filter(z=>s[z]&&s[z].file!=="tokens").map(z=>({token:z,value:f[z],file:s[z].file,line:s[z].line}));for(const o of e){const{values:f,origin:s,ignored:z}=Y(o,n);for(const g of z)l.set(`${g.file}:${g.line} ${g.selector}`,g);const{results:m,unreadable:b}=G(P(f),W(o.name));for(const g of m)i++,!g.ok&&(g.advisory&&!t?a:u).push({mode:o.name,foreground:g.foreground,background:g.background,ratio:Math.floor(g.ratio*100)/100,minimum:g.minimum,kind:g.kind,overrides:d(g.tokens,f,s)});for(const g of b)c.set(g.reason,{mode:o.name,foreground:g.foreground,background:g.background,reason:g.reason,overrides:d(g.tokens,f,s)})}return{ok:u.length===0&&c.size===0,modes:e.map(o=>o.name),checked:i,failures:u,warnings:a,unreadable:[...c.values()],ignored:[...l.values()]}}const K=`/* ==========================================================================
   LUZ Design System — Tokens (no web fonts)
   Generated from tokens.json · Do not edit manually
   ========================================================================== */

@layer luz.tokens, luz.themes, luz.settings, luz.generic, luz.elements, luz.objects, luz.components, luz.utilities, luz.site, luz.landing, luz.cms, luz.app, luz.print;
@layer luz.tokens {
/* -------------------------------------------------------------------------
   LAYER 1: PRIMITIVOS
   Los valores base. Nunca cambian entre temas.
   Regla: los componentes NUNCA usan estas variables directamente.
   -------------------------------------------------------------------------- */
:root {
  /* Blue */
  --luz-blue-10: #f6fbff;
  --luz-blue-20: #dff0ff;
  --luz-blue-30: #b3d9ff;
  --luz-blue-40: #77b9ff;
  --luz-blue-50: #208fff;
  --luz-blue-60: #0066cf;
  --luz-blue-70: #004299;
  --luz-blue-80: #00256c;
  --luz-blue-90: #000d4e;
  --luz-blue-100: #020831;

  /* Gray */
  --luz-gray-10: #f9fafc;
  --luz-gray-20: #e9eef4;
  --luz-gray-30: #ced5dd;
  --luz-gray-40: #adb5bd;
  --luz-gray-50: #889099;
  --luz-gray-60: #646b73;
  --luz-gray-70: #434951;
  --luz-gray-80: #282d34;
  --luz-gray-90: #16191e;
  --luz-gray-100: #0d0e11;

  /* Green */
  --luz-green-10: #eefff5;
  --luz-green-20: #beffda;
  --luz-green-30: #89edb8;
  --luz-green-40: #52cf92;
  --luz-green-50: #08aa6b;
  --luz-green-60: #007f4d;
  --luz-green-70: #005733;

  /* Red */
  --luz-red-10: #fff8f8;
  --luz-red-20: #ffe7e6;
  --luz-red-30: #ffc3c1;
  --luz-red-40: #ff8f8c;
  --luz-red-50: #ef4f51;
  --luz-red-60: #c31a26;
  --luz-red-70: #8c000c;

  /* Yellow */
  --luz-yellow-10: #fffae8;
  --luz-yellow-20: #ffedb7;
  --luz-yellow-30: #ffcd51;
  --luz-yellow-40: #e2a928;
  --luz-yellow-50: #bc8200;
  --luz-yellow-60: #7c4d00;
  --luz-yellow-70: #553000;

  /* Teal */
  --luz-teal-10: #effefa;
  --luz-teal-20: #c3fbec;
  --luz-teal-40: #62c9b5;
  --luz-teal-50: #30a491;
  --luz-teal-60: #007c6d;
  --luz-teal-70: #00554b;

  /* Purple */
  --luz-purple-10: #fcf9ff;
  --luz-purple-20: #f3e8ff;
  --luz-purple-40: #ca9aff;
  --luz-purple-50: #ab67f0;
  --luz-purple-60: #853bca;
  --luz-purple-70: #610ca0;

  /* Spacing: --luz-space-unit (0.25rem, the 4px grid) times a step; set the unit on :root */
  --luz-space-unit: 0.25rem;
  --luz-space-3xs: calc(var(--luz-space-unit) / 2);
  --luz-space-2xs: var(--luz-space-unit);
  --luz-space-xs: calc(var(--luz-space-unit) * 2);
  --luz-space-sm: calc(var(--luz-space-unit) * 3);
  --luz-space-md: calc(var(--luz-space-unit) * 4);
  --luz-space-lg: calc(var(--luz-space-unit) * 6);
  --luz-space-xl: calc(var(--luz-space-unit) * 8);
  --luz-space-2xl: calc(var(--luz-space-unit) * 12);
  --luz-space-3xl: calc(var(--luz-space-unit) * 16);
  --luz-space-4xl: calc(var(--luz-space-unit) * 24);

  /* Control heights */
  --luz-control-sm: 28px;
  --luz-control-md: 36px;
  --luz-control-lg: 44px;
  --luz-control-xl: 56px;

  /* Typography: --luz-type-base and --luz-type-ratio size the --luz-text-* steps; set them on :root */
  --luz-font-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --luz-font-serif: "ET Book", charter, "Bitstream Charter", "Sitka Text", cambria, georgia, serif;
  --luz-font-mono: ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  --luz-type-base: 1rem;
  --luz-type-ratio: 1.25;
  --luz-text-xs: max(0.75rem, calc(var(--luz-text-sm) / var(--luz-type-ratio)));
  --luz-text-sm: max(0.875rem, calc(var(--luz-text-base) / var(--luz-type-ratio)));
  --luz-text-md: calc((var(--luz-text-sm) + var(--luz-text-base)) / 2);
  --luz-text-base: var(--luz-type-base);
  --luz-text-lg: calc(var(--luz-text-base) * var(--luz-type-ratio));
  --luz-text-xl: calc(var(--luz-text-lg) * var(--luz-type-ratio));
  --luz-text-2xl: calc(var(--luz-text-xl) * var(--luz-type-ratio));
  --luz-text-3xl: calc(var(--luz-text-2xl) * var(--luz-type-ratio));
  --luz-text-4xl: calc(var(--luz-text-3xl) * var(--luz-type-ratio));

  /* Radius */
  --luz-radius-none: 0px;
  --luz-radius-sm: 2px;
  --luz-radius-md: 4px;
  --luz-radius-full: 9999px;

  /* Shadows */
  --luz-shadow-sm: 0 1px 2px rgba(35,28,22,.08), 0 0 1px rgba(35,28,22,.1);
  --luz-shadow-md: 0 4px 10px rgba(35,28,22,.1), 0 2px 4px rgba(35,28,22,.06);
  --luz-shadow-lg: 0 14px 28px rgba(35,28,22,.14), 0 6px 12px rgba(35,28,22,.08);
  --luz-shadow-icon: 0 2px 8px rgba(0,0,0,.5);
}

/* Whole 1/16 rem steps, where round() exists (the plain chain above is the fallback) */
@supports (width: round(1px, 1px)) {
  :root {
    --luz-text-xs: max(0.75rem, round(calc(var(--luz-text-sm) / var(--luz-type-ratio)), 0.0625rem));
    --luz-text-sm: max(0.875rem, round(calc(var(--luz-text-base) / var(--luz-type-ratio)), 0.0625rem));
    --luz-text-md: round(calc((var(--luz-text-sm) + var(--luz-text-base)) / 2), 0.0625rem);
    --luz-text-lg: round(calc(var(--luz-text-base) * var(--luz-type-ratio)), 0.0625rem);
    --luz-text-xl: round(calc(var(--luz-text-lg) * var(--luz-type-ratio)), 0.0625rem);
    --luz-text-2xl: round(calc(var(--luz-text-xl) * var(--luz-type-ratio)), 0.0625rem);
    --luz-text-3xl: round(calc(var(--luz-text-2xl) * var(--luz-type-ratio)), 0.0625rem);
    --luz-text-4xl: round(calc(var(--luz-text-3xl) * var(--luz-type-ratio)), 0.0625rem);
  }
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
   --luz-surface-muted (code, wells) one step, --luz-surface-strong (table
   headers, tags, tooltips, toasts) two. Hover takes the muted step and
   pressed the strong one. Light steps darker from white; dark steps
   lighter from gray-90, and keeps gray-100 for the sidebar.
   -------------------------------------------------------------------------- */

:root,
[data-theme="light"] {
  /* Surfaces */
  --luz-surface-page: #fbf8f2; /* the walls: a warm, creamy white */
  --luz-surface: #fffdf9; /* fresh whitewash, raised surfaces */
  --luz-surface-hover: #f4ede0; /* sun on sandstone: hover */
  --luz-surface-pressed: #ebe0cc; /* sandstone in shade: pressed */
  --luz-surface-muted: #fbf8f2; /* the walls: a warm, creamy white */
  --luz-surface-strong: #efe6d6; /* cut sandstone: the deepest layer */
  --luz-scrim: rgba(13, 14, 17, 0.6); /* gray-100 */
  --luz-surface-media: #000;

  /* Text (icons use the same tokens) */
  --luz-text-primary: #231c16; /* wrought iron: text, 13.6:1 on the stone */
  --luz-text-secondary: #6b5a48; /* old door wood: secondary text, 5:1 or more */
  --luz-text-muted: #7a6a58; /* 5.1:1 on the input */
  --luz-text-disabled: #8f8172; /* 3:1 on surface-strong, the worst surface */
  --luz-text-on-fill: #fff;

  /* Lines */
  --luz-divider: #e3d4b8; /* sandstone joints: hairlines */
  --luz-outline: #807366; /* 4.6:1 under the white text of .luz-badge--gray; 3:1 or more as a border */
  --luz-focus-ring: #2365a6; /* the sky, deepened to 4.6:1: links and actions */

  /* Brand */
  --luz-brand-primary: #2365a6; /* the sky, deepened to 4.6:1: links and actions */
  --luz-brand-hover: #1b5089;
  --luz-brand-active: #143d69;
  --luz-brand-subtle: #e3eef9;
  /* Solid brand surfaces that carry --luz-text-on-fill (primary button,
     badge). Same as the brand in light; darker than it in dark mode, where
     the brand is light enough to be read as text on dark surfaces. */
  --luz-brand-fill: #2365a6; /* white text 6:1 */
  --luz-brand-fill-hover: #1b5089;
  --luz-brand-fill-active: #143d69;

  /* Sidebar */
  --luz-sidebar-bg: #2a211a;
  --luz-sidebar-text: #e3d5bf; /* 10.9:1 */
  --luz-sidebar-text-hover: #fff;
  --luz-sidebar-hover: #3a2f25;
  --luz-sidebar-active-bg: #9cc8ee; /* light sky */
  --luz-sidebar-active-text: #1a140f; /* 10.4:1 */
  --luz-sidebar-border: #3d3127;
  --luz-sidebar-label: #b9a78f; /* 6.8:1 */
  --luz-sidebar-logo-bg: #9cc8ee; /* shares the active link's text colour */

  /* Status */
  --luz-color-success: #177734;
  --luz-color-success-bg: var(--luz-green-10);
  --luz-color-danger: #ca1c25;
  --luz-color-danger-bg: var(--luz-red-10);
  --luz-color-danger-fill: var(--luz-color-danger);
  --luz-color-warning: var(--luz-yellow-60);
  --luz-color-warning-accent: var(--luz-yellow-30);
  --luz-color-warning-bg: var(--luz-yellow-10);
  --luz-color-info: var(--luz-blue-70);
  --luz-color-info-bg: var(--luz-blue-10);

  /* Inputs */
  --luz-input-bg: #fffdf9; /* fresh whitewash, raised surfaces */
  --luz-input-border: #8b7d6f; /* field and strong borders, 3:1 on every surface */

  /* Extended */
  --luz-color-teal: #00736f;
  --luz-color-teal-bg: var(--luz-teal-10);
  --luz-color-purple: #803ae9;
  --luz-color-purple-bg: var(--luz-purple-10);
  --luz-color-code: #803ae9;

  /* Code syntax (pre.luz-code-block, on --luz-surface-muted). Keywords stay
     ink and bold; colour goes to what the author wrote: names, properties,
     values. Comments are muted and italic. No red: red means error. */
  --luz-code-comment: var(--luz-gray-60); /* 5.2:1 */
  --luz-code-keyword: var(--luz-text-primary);
  --luz-code-name: var(--luz-blue-70); /* 9.0:1 */
  --luz-code-property: var(--luz-purple-60); /* 5.8:1 */
  --luz-code-string: var(--luz-green-60); /* 4.9:1 */
  --luz-code-literal: var(--luz-yellow-60); /* 6.9:1 */
}

/* -------------------------------------------------------------------------
   COLOR MODE: DARK — <html data-theme="dark">
   -------------------------------------------------------------------------- */

/* The :root:has() selectors are the no-JavaScript path: a checked radio of the
   color-mode switcher (.luz-mode-switcher) re-scopes the tokens for the
   session. theme.js adds persistence and the OS preference on top. They are
   wrapped in :is() so a browser without :has() drops them instead of
   invalidating the whole rule. */
[data-theme="dark"],
:is(:root:has(input[name="luz-theme"][value="dark"]:checked)) {
  /* Surfaces */
  --luz-surface-page: #1c1712;
  --luz-surface: #241e18;
  --luz-surface-hover: #2e261f;
  --luz-surface-pressed: #3a3028;
  --luz-surface-muted: #1c1712;
  --luz-surface-strong: #3a3028;
  --luz-scrim: rgba(0, 0, 0, 0.7);
  --luz-surface-media: #000;

  /* Shadows: the same offsets on a darker ground, so a heavier black */
  --luz-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --luz-shadow-md: 0 4px 10px rgba(0, 0, 0, 0.5);
  --luz-shadow-lg: 0 14px 28px rgba(0, 0, 0, 0.6);

  /* Text (icons use the same tokens) */
  --luz-text-primary: #f3ece1; /* whitewash by night: 11:1 on the stone */
  --luz-text-secondary: #b8a690; /* 5.5:1 on the stone */
  --luz-text-muted: #a08f7a; /* 5.3:1 on the input */
  --luz-text-disabled: #877a69; /* 3:1 on surface-strong */
  --luz-text-on-fill: #fff;

  /* Lines */
  --luz-divider: #43382d;
  --luz-outline: #7d7062; /* white badge text 4.8:1; 3:1 or more on page, surface and hover */
  --luz-focus-ring: #6fb1ec; /* 5:1 on the stone and on the brand tint */

  /* Brand */
  /* blue-40: 4.5:1 or more as text on every dark surface */
  --luz-brand-primary: #6fb1ec; /* 5:1 on the stone and on the brand tint */
  --luz-brand-hover: #9ccaf2;
  --luz-brand-active: #c8e1f8;
  --luz-brand-subtle: rgba(32, 143, 255, 0.14); /* blue-50 */
  --luz-brand-fill: #2172c1; /* white text 4.9:1; 3:1 or more on page and surfaces: the light sky is for text */
  --luz-brand-fill-hover: #18548f;
  --luz-brand-fill-active: #134577;

  /* Sidebar */
  --luz-sidebar-bg: #14100c;
  --luz-sidebar-text: #cbbba5; /* 10.1:1 */
  --luz-sidebar-text-hover: #fff;
  --luz-sidebar-hover: #241e18;
  --luz-sidebar-active-bg: #8cc4f5;
  --luz-sidebar-active-text: #14100c;
  --luz-sidebar-border: #2e261f;
  --luz-sidebar-label: #a8977f; /* 6.7:1 */
  --luz-sidebar-logo-bg: #8cc4f5;

  /* Status */
  --luz-color-success: var(--luz-green-30);
  --luz-color-success-bg: rgba(82, 207, 146, 0.12);
  --luz-color-danger: var(--luz-red-30);
  --luz-color-danger-bg: rgba(239, 79, 81, 0.12);
  --luz-color-danger-fill: var(--luz-red-60); /* white text 4.8:1 */
  --luz-color-warning: var(--luz-yellow-30);
  --luz-color-warning-accent: var(--luz-yellow-20);
  --luz-color-warning-bg: rgba(255, 205, 81, 0.12);
  --luz-color-info: var(--luz-blue-30);
  --luz-color-info-bg: rgba(119, 185, 255, 0.12);

  /* Inputs */
  --luz-input-bg: #241e18;
  --luz-input-border: #877a69; /* 3:1 on every surface */

  /* Extended */
  --luz-color-teal: var(--luz-teal-40);
  --luz-color-teal-bg: rgba(98, 201, 181, 0.12);
  --luz-color-purple: var(--luz-purple-20);
  --luz-color-purple-bg: rgba(202, 154, 255, 0.12);
  --luz-color-code: var(--luz-purple-40); /* 5.5:1 on surface-strong */

  /* Code syntax, on --luz-surface-muted (gray-80) */
  --luz-code-comment: var(--luz-gray-40);
  --luz-code-keyword: var(--luz-text-primary);
  --luz-code-name: var(--luz-blue-30);
  --luz-code-property: var(--luz-purple-40);
  --luz-code-string: var(--luz-green-40);
  --luz-code-literal: var(--luz-yellow-40);
}

/* -------------------------------------------------------------------------
   COLOR MODE: HIGH CONTRAST — <html data-theme="high-contrast">
   Pure white page, pure black text, strong borders. Maximum WCAG contrast.
   -------------------------------------------------------------------------- */

[data-theme="high-contrast"],
:is(:root:has(input[name="luz-theme"][value="high-contrast"]:checked)) {
  /* Surfaces */
  --luz-surface-page: #fff;
  --luz-surface: #fff;
  --luz-surface-hover: var(--luz-gray-10);
  --luz-surface-pressed: var(--luz-gray-20);
  --luz-surface-muted: var(--luz-gray-10);
  --luz-surface-strong: var(--luz-gray-20);
  --luz-scrim: rgba(13, 14, 17, 0.6); /* gray-100 */
  --luz-surface-media: #000;

  /* Shadows: an edge instead of a blur, which a low-vision reader cannot see */
  --luz-shadow-sm: none;
  --luz-shadow-md: 0 0 0 1px #000;
  --luz-shadow-lg: 0 0 0 2px #000;

  /* Text (icons use the same tokens) */
  --luz-text-primary: #000;
  --luz-text-secondary: var(--luz-gray-100);
  --luz-text-muted: var(--luz-gray-70);
  --luz-text-disabled: var(--luz-gray-60); /* 3.8:1 on surface-strong */
  --luz-text-on-fill: #fff;

  /* Lines */
  --luz-divider: var(--luz-gray-70);
  --luz-outline: #000;
  --luz-focus-ring: #000;

  /* Brand */
  --luz-brand-primary: var(--luz-blue-80);
  --luz-brand-hover: var(--luz-blue-90);
  --luz-brand-active: var(--luz-blue-100);
  --luz-brand-subtle: var(--luz-blue-10);
  --luz-brand-fill: var(--luz-blue-80); /* white text 6:1 */
  --luz-brand-fill-hover: var(--luz-blue-90);
  --luz-brand-fill-active: var(--luz-blue-100);

  /* Sidebar */
  --luz-sidebar-bg: #000;
  --luz-sidebar-text: var(--luz-gray-30);
  --luz-sidebar-text-hover: #fff;
  --luz-sidebar-hover: var(--luz-gray-90);
  --luz-sidebar-active-bg: #fff;
  --luz-sidebar-active-text: #000;
  --luz-sidebar-border: var(--luz-gray-80);
  --luz-sidebar-label: var(--luz-gray-50);
  --luz-sidebar-logo-bg: #fff;

  /* Status */
  --luz-color-success: #105224;
  --luz-color-success-bg: var(--luz-green-10);
  --luz-color-danger: #8d131a;
  --luz-color-danger-bg: var(--luz-red-10);
  --luz-color-danger-fill: var(--luz-color-danger);
  --luz-color-warning: #5a4300;
  --luz-color-warning-accent: var(--luz-yellow-40);
  --luz-color-warning-bg: var(--luz-yellow-10);
  --luz-color-info: var(--luz-blue-80);
  --luz-color-info-bg: var(--luz-blue-10);

  /* Inputs */
  --luz-input-bg: #fff;
  --luz-input-border: #000;

  /* Extended */
  --luz-color-teal: #00504d;
  --luz-color-teal-bg: var(--luz-teal-10);
  --luz-color-purple: #5828a1;
  --luz-color-purple-bg: var(--luz-purple-10);
  --luz-color-code: #5828a1;

  /* Code syntax, on --luz-surface-muted: 7:1 or more, darker steps of the
     same hues as light */
  --luz-code-comment: var(--luz-gray-70); /* 8.7:1 */
  --luz-code-keyword: var(--luz-text-primary);
  --luz-code-name: var(--luz-blue-80); /* 13.6:1 */
  --luz-code-property: var(--luz-purple-70); /* 9.7:1 */
  --luz-code-string: var(--luz-green-70); /* 8.3:1 */
  --luz-code-literal: var(--luz-yellow-70); /* 11.1:1 */
}

}
`,h=(n,t)=>n.replace(/\{(\w+)\}/g,(r,e)=>String(t[e]??""));function p(n,t,r="li"){const e=document.createElement(r);return e.textContent=t,n.append(e),e}function J(n=document){const t=n.querySelector("[data-contrast-tool]");if(!t||t.dataset.ready)return;const r=t.querySelector("textarea"),e=t.querySelector("button"),u=t.querySelector("[data-contrast-result]");if(!r||!e||!u)return;const a=u.dataset,c={file:"tokens",rules:E(K)};e.addEventListener("click",()=>{let l;try{l=V([c,{file:a.file,rules:E(r.value)}])}catch(o){u.replaceChildren(),p(u,`${a.error} ${o.message}`,"p");return}u.replaceChildren();const i=l.modes.join(", ");p(u,h(l.ok?a.pass:a.fail,{checked:l.checked,modes:i,failures:l.failures.length+l.unreadable.length}),"p");const d=document.createElement("ul");for(const o of l.failures){const f=p(d,h(a.item,{modes:o.mode,foreground:o.foreground,background:o.background,ratio:M(o.ratio),minimum:o.minimum}));for(const s of o.overrides)p(f,h(a.set,{token:s.token,value:s.value,line:s.line}),"small").before(document.createElement("br"))}for(const o of l.unreadable)p(d,h(a.unreadable,{foreground:o.foreground,background:o.background,reason:o.reason}));for(const o of l.warnings)p(d,h(a.warning,{modes:o.mode,foreground:o.foreground,background:o.background,ratio:M(o.ratio),minimum:o.minimum}));for(const o of l.ignored)p(d,h(a.ignored,{selector:o.selector,line:o.line}));d.children.length&&u.append(d)}),t.dataset.ready=""}export{J as initContrastTool};
