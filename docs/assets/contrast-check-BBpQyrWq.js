const C={transparent:[0,0,0,0],white:[255,255,255,1],black:[0,0,0,1]},y=(a,n,r)=>Math.min(r,Math.max(n,a));function N(a,n,r){const e=l=>(l+a/30)%12,o=n*Math.min(r,1-r),i=l=>r-o*Math.max(-1,Math.min(e(l)-3,Math.min(9-e(l),1)));return[i(0)*255,i(8)*255,i(4)*255]}function B(a){var o;const n=String(a).trim().toLowerCase();if(n in C){const[i,l,c,d]=C[n];return{r:i,g:l,b:c,a:d}}const r=(o=n.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/))==null?void 0:o[1];if(r){const i=r.length<=4?[...r].map(c=>c+c).join(""):r,l=c=>parseInt(i.slice(c,c+2),16);return{r:l(0),g:l(2),b:l(4),a:i.length===8?l(6)/255:1}}const e=n.match(/^(rgba?|hsla?)\(([^)]+)\)$/);if(e){const i=e[2].split(/[\s,/]+/).filter(Boolean),l=(c,d=1)=>c.endsWith("%")?parseFloat(c)/100*d:parseFloat(c);if(i.length>=3&&i.length<=4&&i.every(c=>!Number.isNaN(parseFloat(c)))){const c=i[3]===void 0?1:y(l(i[3],1),0,1);if(e[1].startsWith("rgb")){const[f,s,g]=i.slice(0,3).map(p=>y(l(p,255),0,255));return{r:f,g:s,b:g,a:c}}const[d,u,t]=N((parseFloat(i[0])%360+360)%360,y(l(i[1],1),0,1),y(l(i[2],1),0,1));return{r:d,g:u,b:t,a:c}}}throw new Error(`cannot read the colour "${a}": write it as #rrggbb, rgb(), rgba(), hsl() or hsla()`)}const $=(a,n)=>({r:a.r*a.a+n.r*(1-a.a),g:a.g*a.a+n.g*(1-a.a),b:a.b*a.a+n.b*(1-a.a),a:1}),M=({r:a,g:n,b:r})=>{const e=o=>(o/=255)<=.03928?o/12.92:((o+.055)/1.055)**2.4;return .2126*e(a)+.7152*e(n)+.0722*e(r)},F=(a,n)=>{const[r,e]=[M(a),M(n)];return(Math.max(r,e)+.05)/(Math.min(r,e)+.05)},E=a=>`${(Math.floor(a*10+1e-9)/10).toFixed(1)}:1`,x=["surface-page","surface","surface-hover","surface-muted","input-bg"],k=["success","danger","warning","info","teal","purple"],O=["comment","keyword","name","property","string","literal"].map(a=>`code-${a}`),T=[{fg:["text-primary","text-secondary","brand-primary","brand-hover"],bg:x,min:4.5,kind:"text"},{fg:["text-primary","text-secondary"],bg:["surface-strong","surface-pressed"],min:4.5,kind:"text"},{fg:["text-muted"],bg:["input-bg","surface-page","surface"],min:4.5,kind:"text"},{fg:["text-disabled"],bg:["surface-page","surface","input-bg","surface-muted","surface-strong"],min:3,kind:"disabled-text"},{fg:["text-on-fill"],bg:["brand-fill","brand-fill-hover","brand-fill-active","color-danger-fill"],min:4.5,kind:"text"},{fg:["sidebar-text","sidebar-label","sidebar-text-hover"],bg:["sidebar-bg"],min:4.5,kind:"text"},{fg:["sidebar-text-hover"],bg:["sidebar-hover"],min:4.5,kind:"text"},{fg:["sidebar-active-text"],bg:["sidebar-active-bg"],min:4.5,kind:"text"},...k.map(a=>({fg:[`color-${a}`],bg:[`color-${a}-bg > surface-page`,`color-${a}-bg > surface`,`color-${a}-bg > surface-hover`],min:4.5,kind:"text"})),{fg:["color-code"],bg:["surface-page","surface","surface-muted"],min:4.5,kind:"text"},{fg:["focus-ring"],bg:[...x,"surface-strong"],min:3,kind:"ui"},{fg:["input-border"],bg:["input-bg"],min:3,kind:"ui"},{fg:["outline"],bg:["surface-page","surface"],min:3,kind:"ui"},{fg:["brand-primary"],bg:["surface-muted","surface-pressed"],min:3,kind:"ui"},...k.map(a=>({fg:[`color-${a}`],bg:[`color-${a}-bg > surface-strong`,"surface-page","surface","surface-hover","surface-muted","surface-strong"],min:4.5,kind:"text"})),{fg:["color-code"],bg:["surface-strong"],min:4.5,kind:"text"},{fg:O,bg:["surface-muted"],min:4.5,kind:"text"},{fg:["input-border"],bg:[...x,"surface-strong"],min:3,kind:"ui"},{fg:["text-on-fill"],bg:["outline"],min:4.5,kind:"text"},{fg:["color-danger"],bg:["input-bg"],min:3,kind:"ui"},{fg:["text-primary","text-secondary"],bg:k.map(a=>`color-${a}-bg > surface-page`),min:4.5,kind:"text"},{fg:["text-primary","text-secondary","brand-primary"],bg:["brand-subtle > surface-page"],min:4.5,kind:"text"},{fg:["brand-fill"],bg:["surface-page","surface"],min:3,kind:"ui",advisory:!0},{fg:["brand-primary"],bg:["surface-strong"],min:3,kind:"ui"},{fg:["sidebar-active-bg"],bg:["sidebar-bg"],min:3,kind:"ui"},{fg:["text-on-fill"],bg:["surface-media"],min:4.5,kind:"text"}],W=[{fg:O,bg:["surface-muted"],min:7,kind:"text"}],D=a=>a==="high-contrast"?[...T,...W]:T;function G(a){const n=[];for(const{fg:r,bg:e,min:o,kind:i,advisory:l=!1}of a)for(const c of r)for(const d of e)n.push({fg:c,bg:d,min:o,kind:i,advisory:l});return n}const P=/^var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)$/;function j(a){function n(r,e=[]){if(e.includes(r))throw new Error(`${r} refers to itself`);const o=a[r];if(o===void 0)throw new Error(`${r} is not defined`);const i=o.match(P);return i?a[i[1]]===void 0&&i[2]?{value:i[2].trim(),chain:[...e,r]}:n(i[1],[...e,r]):{value:o,chain:[...e,r]}}return n}function q(a,n){const r=[],e=[],o=l=>{const{value:c,chain:d}=a(`--cai-${l}`);try{return{colour:B(c),chain:d}}catch(u){throw u.tokens=d,u}},i=l=>{const c=l.split(">").map(t=>t.trim());let d=o("surface-page").colour;const u=[];for(const t of c.reverse()){const f=o(t);u.push(...f.chain),d=$(f.colour,d)}return{colour:d,chain:u}};for(const{fg:l,bg:c,min:d,kind:u,advisory:t}of G(n))try{const f=i(c),s=o(l),g=F($(s.colour,f.colour),f.colour);r.push({foreground:`--cai-${l}`,background:c,ratio:g,minimum:d,kind:u,advisory:t,ok:g+1e-9>=d,tokens:[...s.chain,...f.chain]})}catch(f){e.push({foreground:`--cai-${l}`,background:c,reason:f.message,tokens:f.tokens??[]})}return{results:r,unreadable:e}}const w=["light","dark","high-contrast"],H=a=>a.replace(/\/\*[\s\S]*?\*\//g,n=>n.replace(/[^\n]/g," "));function R(a){const n=H(a),r=[];let e=0,o=1;function i(){let d=0,u="",t=e,f=o;for(;e<n.length&&/\s/.test(n[e]);)n[e]===`
`&&o++,e++;for(t=e,f=o;e<n.length;e++){const s=n[e];if(s===`
`&&o++,u){s==="\\"?e++:s===u&&(u="");continue}if(s==='"'||s==="'")u=s;else if(s==="("||s==="[")d++;else if(s===")"||s==="]")d--;else if(d<=0&&(s==="{"||s===";"||s==="}"))break}return{prelude:n.slice(t,e).trim(),stop:n[e],line:f}}function l(d,u,t){const f=[];for(;e<n.length;){const{prelude:s,stop:g,line:p}=i();if(g==="{")e++,s.startsWith("@")?c(s,d,u):l(d,s.split(",").map(m=>m.trim()).filter(Boolean),p);else{const m=s.indexOf(":");if(s&&!s.startsWith("@")&&m>0){const b=s.slice(0,m).trim();b.startsWith("--cai-")&&f.push({name:b,value:s.slice(m+1).trim(),line:p})}if(g==="}"){e++;break}if(g===";")e++;else break}}return u&&f.length&&r.push({selectors:u,conditions:d,declarations:f,line:t}),f}function c(d,u,t){l([...u,d],t??null,o)}return l([],null,1),r}function A(a){let r=a.trim().replace(/\s+/g,""),e=null,o=null,i=0,l=0;for(/^html/i.test(r)?(r=r.slice(4),l=1):r.startsWith("*")&&(r=r.slice(1));;){if(r.startsWith(":root")){r=r.slice(5),i++;continue}const c=r.match(/^\[(data-theme|data-mode)=(?:"([\w-]+)"|'([\w-]+)'|([\w-]+))\]/);if(c){const d=c[2]??c[3]??c[4];c[1]==="data-theme"?e=d:o=d,r=r.slice(c[0].length),i++;continue}break}return r!==""?null:{theme:e,mode:o,specificity:i*100+l}}const U=a=>{var n;return((n=a.match(/^@media\s*\(\s*prefers-color-scheme\s*:\s*(light|dark)\s*\)$/i))==null?void 0:n[1].toLowerCase())??null},Y=a=>/^@(layer|supports)\b/i.test(a);function _(a){const n=new Set;for(const{selectors:e}of a)for(const o of e){const i=A(o);i!=null&&i.theme&&!w.includes(i.theme)&&n.add(i.theme)}const r=w.map(e=>({name:e,theme:e,mode:null,scheme:e==="high-contrast"?null:e}));for(const e of[...n].sort()){r.push({name:e,theme:e,mode:null,scheme:"light",custom:!0});for(const o of w)r.push({name:`${e}/${o}`,theme:e,mode:o,scheme:o==="high-contrast"?null:o,custom:!0})}return r}function z(a,n){const r={},e={},o={},i=[];let l=0;for(const{file:c,rules:d}of n)for(const u of d){l++;let t="any",f=null;for(const s of u.conditions){const g=U(s);g?t=g:Y(s)||(f=s)}if(f){i.push({file:c,line:u.line,selector:u.selectors.join(", "),reason:`${f} is not evaluated`});continue}if(!(t!=="any"&&t!==a.scheme))for(const s of u.selectors){const g=A(s);if(!g){c!=="tokens"&&i.push({file:c,line:u.line,selector:s,reason:"only html, :root, [data-theme] and [data-mode] selectors are read"});continue}const p=g.theme===null||g.theme===a.theme,m=g.mode===null?!0:g.mode===a.mode;if(!(!p||!m))for(const{name:b,value:L,line:I}of u.declarations){const S=g.specificity*1e6+l;o[b]!==void 0&&o[b]>S||(o[b]=S,r[b]=L,e[b]={file:c,line:I})}}}return{values:r,origin:e,ignored:i}}function K(a,{strict:n=!1}={}){const r=a.slice(1),e=_(r.flatMap(t=>t.rules)),o=[],i=[],l=new Map,c=new Map;let d=0;const u=(t,f,s)=>[...new Set(t)].filter(g=>s[g]&&s[g].file!=="tokens").map(g=>({token:g,value:f[g],file:s[g].file,line:s[g].line}));for(const t of e){const{values:f,origin:s,ignored:g}=z(t,a);for(const b of g)c.set(`${b.file}:${b.line} ${b.selector}`,b);const{results:p,unreadable:m}=q(j(f),D(t.name));for(const b of p)d++,!b.ok&&(b.advisory&&!n?i:o).push({mode:t.name,foreground:b.foreground,background:b.background,ratio:Math.floor(b.ratio*100)/100,minimum:b.minimum,kind:b.kind,overrides:u(b.tokens,f,s)});for(const b of m)l.set(b.reason,{mode:t.name,foreground:b.foreground,background:b.background,reason:b.reason,overrides:u(b.tokens,f,s)})}return{ok:o.length===0&&l.size===0,modes:e.map(t=>t.name),checked:d,failures:o,warnings:i,unreadable:[...l.values()],ignored:[...c.values()]}}const V=`/* ==========================================================================
   CAI Design System — Tokens (no web fonts)
   Generated from tokens.json · Do not edit manually
   ========================================================================== */

@layer cai.tokens, cai.themes, cai.settings, cai.generic, cai.elements, cai.objects, cai.components, cai.utilities, cai.platform, cai.print;
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
  --cai-font-serif: "ET Book", Georgia, serif;
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
  --cai-radius-lg: 8px;
  --cai-radius-xl: 12px;
  --cai-radius-full: 9999px;

  /* Shadows */
  --cai-shadow-sm: 0 1px 2px rgba(0,0,0,.15), 0 0 1px rgba(0,0,0,.1);
  --cai-shadow-md: 0 4px 8px rgba(0,0,0,.2), 0 2px 4px rgba(0,0,0,.12);
  --cai-shadow-lg: 0 12px 24px rgba(0,0,0,.24), 0 6px 12px rgba(0,0,0,.12);
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
   Custom themes (packages/core/src/themes/*.css) override these under their
   own [data-theme="<name>"] scope and use data-mode for luminosity variants.

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
  --cai-surface-page: #fff;
  --cai-surface: #fff;
  --cai-surface-hover: var(--cai-gray-10);
  --cai-surface-pressed: var(--cai-gray-20);
  --cai-surface-muted: var(--cai-gray-10);
  --cai-surface-strong: var(--cai-gray-20);
  --cai-scrim: rgba(13, 14, 17, 0.6); /* gray-100 */
  --cai-surface-media: #000; /* behind video: letterboxing, the same in every mode */

  /* Text (icons use the same tokens) */
  --cai-text-primary: var(--cai-gray-100);
  --cai-text-secondary: var(--cai-gray-70);
  --cai-text-muted: var(--cai-gray-60); /* placeholders and hints: 4.5:1 or more on white (WCAG 1.4.3) */
  --cai-text-disabled: var(--cai-gray-60);
  --cai-text-on-fill: #fff;

  /* Lines */
  --cai-divider: var(--cai-gray-20);
  --cai-outline: var(--cai-gray-60);
  --cai-focus-ring: var(--cai-blue-60);

  /* Brand */
  --cai-brand-primary: var(--cai-blue-60);
  --cai-brand-hover: var(--cai-blue-70);
  --cai-brand-active: var(--cai-blue-80);
  --cai-brand-subtle: var(--cai-blue-10);
  /* Solid brand surfaces that carry --cai-text-on-fill (primary button,
     badge). Same as the brand in light; darker than it in dark mode, where
     the brand is light enough to be read as text on dark surfaces. */
  --cai-brand-fill: var(--cai-brand-primary);
  --cai-brand-fill-hover: var(--cai-brand-hover);
  --cai-brand-fill-active: var(--cai-brand-active);

  /* Sidebar */
  --cai-sidebar-bg: var(--cai-gray-100);
  --cai-sidebar-text: var(--cai-gray-40);
  --cai-sidebar-text-hover: #fff;
  --cai-sidebar-hover: var(--cai-gray-90);
  --cai-sidebar-active-bg: var(--cai-blue-60);
  --cai-sidebar-active-text: #fff;
  --cai-sidebar-border: var(--cai-gray-90);
  --cai-sidebar-label: var(--cai-gray-50);
  --cai-sidebar-logo-bg: var(--cai-blue-60);

  /* Status */
  --cai-color-success: var(--cai-green-70); /* 4.5:1 or more on every surface, surface-strong included */
  --cai-color-success-bg: var(--cai-green-10);
  --cai-color-danger: var(--cai-red-70);
  --cai-color-danger-bg: var(--cai-red-10);
  --cai-color-danger-fill: var(--cai-red-60); /* the danger button keeps its red under white text */
  --cai-color-warning: var(--cai-yellow-60);
  --cai-color-warning-accent: var(--cai-yellow-30);
  --cai-color-warning-bg: var(--cai-yellow-10);
  --cai-color-info: var(--cai-blue-70);
  --cai-color-info-bg: var(--cai-blue-10);

  /* Inputs */
  --cai-input-bg: #fff;
  --cai-input-border: var(--cai-gray-60); /* 3:1 or more on every surface, surface-strong included */

  /* Extended */
  --cai-color-teal: var(--cai-teal-70);
  --cai-color-teal-bg: var(--cai-teal-10);
  --cai-color-purple: var(--cai-purple-70);
  --cai-color-purple-bg: var(--cai-purple-10);
  --cai-color-code: var(--cai-purple-70);

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
  --cai-surface-page: var(--cai-gray-90);
  --cai-surface: var(--cai-gray-90);
  --cai-surface-hover: var(--cai-gray-80);
  --cai-surface-pressed: var(--cai-gray-70);
  --cai-surface-muted: var(--cai-gray-80);
  --cai-surface-strong: var(--cai-gray-70);
  --cai-scrim: rgba(0, 0, 0, 0.7);
  --cai-surface-media: #000; /* behind video: letterboxing, the same in every mode */

  /* Text (icons use the same tokens) */
  --cai-text-primary: var(--cai-gray-10);
  --cai-text-secondary: var(--cai-gray-30);
  --cai-text-muted: var(--cai-gray-50);
  --cai-text-disabled: var(--cai-gray-40); /* 3:1 or more on surface-strong, the lightest surface */
  --cai-text-on-fill: #fff;

  /* Lines */
  --cai-divider: var(--cai-gray-80);
  --cai-outline: var(--cai-gray-60);
  --cai-focus-ring: var(--cai-blue-40); /* 3:1 or more on every dark surface */

  /* Brand */
  /* blue-40: 4.5:1 or more as text on every dark surface */
  --cai-brand-primary: var(--cai-blue-40);
  --cai-brand-hover: var(--cai-blue-30);
  --cai-brand-active: var(--cai-blue-20);
  --cai-brand-subtle: rgba(32, 143, 255, 0.14); /* blue-50 */
  --cai-brand-fill: var(--cai-blue-60); /* white text 4.5:1 or more */
  --cai-brand-fill-hover: var(--cai-blue-70);
  --cai-brand-fill-active: var(--cai-blue-80);

  /* Sidebar */
  --cai-sidebar-bg: var(--cai-gray-100);
  --cai-sidebar-text: var(--cai-gray-40);
  --cai-sidebar-text-hover: #fff;
  --cai-sidebar-hover: var(--cai-gray-90);
  --cai-sidebar-active-bg: var(--cai-blue-60);
  --cai-sidebar-active-text: #fff;
  --cai-sidebar-border: var(--cai-gray-80);
  --cai-sidebar-label: var(--cai-gray-50);
  --cai-sidebar-logo-bg: var(--cai-blue-60);

  /* Status */
  --cai-color-success: var(--cai-green-20); /* 4.5:1 on its tint over surface-strong, the lightest dark surface */
  --cai-color-success-bg: rgba(82, 207, 146, 0.14); /* green-40 */
  --cai-color-danger: var(--cai-red-20);
  --cai-color-danger-bg: rgba(239, 79, 81, 0.14); /* red-50 */
  --cai-color-danger-fill: var(--cai-red-60); /* white text 4.5:1 or more */
  --cai-color-warning: var(--cai-yellow-20);
  --cai-color-warning-accent: var(--cai-yellow-20);
  --cai-color-warning-bg: rgba(255, 205, 81, 0.14); /* yellow-30 */
  --cai-color-info: var(--cai-blue-20);
  --cai-color-info-bg: rgba(119, 185, 255, 0.14); /* blue-40 */

  /* Inputs */
  --cai-input-bg: var(--cai-gray-90);
  --cai-input-border: var(--cai-gray-40); /* 3:1 or more on every surface, surface-strong included */

  /* Extended */
  --cai-color-teal: var(--cai-teal-20);
  --cai-color-teal-bg: rgba(98, 201, 181, 0.14); /* teal-40 */
  --cai-color-purple: var(--cai-purple-20);
  --cai-color-purple-bg: rgba(202, 154, 255, 0.14); /* purple-40 */
  --cai-color-code: var(--cai-purple-20); /* 4.5:1 on surface-strong */

  /* Code syntax, on --cai-surface-muted (gray-80) */
  --cai-code-comment: var(--cai-gray-40); /* 6.7:1 */
  --cai-code-keyword: var(--cai-text-primary);
  --cai-code-name: var(--cai-blue-30); /* 9.4:1 */
  --cai-code-property: var(--cai-purple-40); /* 6.3:1 */
  --cai-code-string: var(--cai-green-40); /* 7.1:1 */
  --cai-code-literal: var(--cai-yellow-40); /* 6.6:1 */
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
  --cai-scrim: rgba(0, 0, 0, 0.6);
  --cai-surface-media: #000; /* behind video: letterboxing, the same in every mode */

  /* Text (icons use the same tokens) */
  --cai-text-primary: #000;
  --cai-text-secondary: var(--cai-gray-100);
  --cai-text-muted: var(--cai-gray-70);
  --cai-text-disabled: var(--cai-gray-60);
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
  --cai-brand-fill: var(--cai-brand-primary);
  --cai-brand-fill-hover: var(--cai-brand-hover);
  --cai-brand-fill-active: var(--cai-brand-active);

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
  --cai-color-success: var(--cai-green-70); /* 4.5:1 or more on surface-strong too */
  --cai-color-success-bg: var(--cai-green-10);
  --cai-color-danger: var(--cai-red-70);
  --cai-color-danger-bg: var(--cai-red-10);
  --cai-color-danger-fill: var(--cai-color-danger);
  --cai-color-warning: var(--cai-yellow-60);
  --cai-color-warning-accent: var(--cai-yellow-40);
  --cai-color-warning-bg: var(--cai-yellow-10);
  --cai-color-info: var(--cai-blue-80);
  --cai-color-info-bg: var(--cai-blue-10);

  /* Inputs */
  --cai-input-bg: #fff;
  --cai-input-border: #000;

  /* Extended */
  --cai-color-teal: var(--cai-teal-70);
  --cai-color-teal-bg: var(--cai-teal-10);
  --cai-color-purple: var(--cai-purple-70);
  --cai-color-purple-bg: var(--cai-purple-10);
  --cai-color-code: var(--cai-blue-80);

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
`,v=(a,n)=>a.replace(/\{(\w+)\}/g,(r,e)=>String(n[e]??""));function h(a,n,r="li"){const e=document.createElement(r);return e.textContent=n,a.append(e),e}function J(a=document){const n=a.querySelector("[data-contrast-tool]");if(!n||n.dataset.ready)return;const r=n.querySelector("textarea"),e=n.querySelector("button"),o=n.querySelector("[data-contrast-result]");if(!r||!e||!o)return;const i=o.dataset,l={file:"tokens",rules:R(V)};e.addEventListener("click",()=>{let c;try{c=K([l,{file:i.file,rules:R(r.value)}])}catch(t){o.replaceChildren(),h(o,`${i.error} ${t.message}`,"p");return}o.replaceChildren();const d=c.modes.join(", ");h(o,v(c.ok?i.pass:i.fail,{checked:c.checked,modes:d,failures:c.failures.length+c.unreadable.length}),"p");const u=document.createElement("ul");for(const t of c.failures){const f=h(u,v(i.item,{modes:t.mode,foreground:t.foreground,background:t.background,ratio:E(t.ratio),minimum:t.minimum}));for(const s of t.overrides)h(f,v(i.set,{token:s.token,value:s.value,line:s.line}),"small").before(document.createElement("br"))}for(const t of c.unreadable)h(u,v(i.unreadable,{foreground:t.foreground,background:t.background,reason:t.reason}));for(const t of c.warnings)h(u,v(i.warning,{modes:t.mode,foreground:t.foreground,background:t.background,ratio:E(t.ratio),minimum:t.minimum}));for(const t of c.ignored)h(u,v(i.ignored,{selector:t.selector,line:t.line}));u.children.length&&o.append(u)}),n.dataset.ready=""}export{J as initContrastTool};
