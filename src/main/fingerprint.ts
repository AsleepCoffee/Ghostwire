import { session, type WebContents, type Session } from 'electron'
import { all } from './db'
import { getSettings } from './handlers'

/** Deterministic per-persona browser fingerprint hardening.
 *
 *  Each persona already has an isolated session (cookies/cache) and can exit via
 *  its own VPN. This adds a *stable, per-persona* spoof of the most common
 *  fingerprinting signals so two personas (and your real browser) don't share an
 *  identical canvas/WebGL/UA fingerprint. Best-effort: injected at dom-ready. */

function seedFrom(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Default browsing UA — a clean desktop Chrome string with no "Electron"/app
// token. Sites like Google (Maps, Street View, Lens, sign-in) reject the stock
// Electron UA and bounce in a reload/consent loop; a normal Chrome UA fixes it.
export const BASE_CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

// A small pool of plausible recent desktop Chrome UAs; pick one per persona.
const CHROME_VERSIONS = ['124.0.0.0', '125.0.0.0', '126.0.0.0', '127.0.0.0', '128.0.0.0']
const PLATFORMS = [
  { ua: 'Windows NT 10.0; Win64; x64', platform: 'Win32' },
  { ua: 'Macintosh; Intel Mac OS X 10_15_7', platform: 'MacIntel' },
  { ua: 'X11; Linux x86_64', platform: 'Linux x86_64' }
]
const GPUS = [
  { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 6600 Direct3D11 vs_5_0 ps_5_0, D3D11)' }
]

function personaUA(seed: number): string {
  const p = PLATFORMS[seed % PLATFORMS.length]
  const v = CHROME_VERSIONS[(seed >> 3) % CHROME_VERSIONS.length]
  return `Mozilla/5.0 (${p.ua}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v} Safari/537.36`
}

/** The in-page spoof script, seeded so it's stable per persona. */
function spoofScript(seed: number): string {
  const plat = PLATFORMS[seed % PLATFORMS.length].platform
  const gpu = GPUS[(seed >> 5) % GPUS.length]
  const cores = [4, 8, 12, 16][(seed >> 2) % 4]
  const mem = [4, 8, 16][(seed >> 4) % 3]
  return `(function(){try{
    if (window.__gwFp) return; window.__gwFp = 1;
    var SEED = ${seed} >>> 0;
    function rnd(){ SEED = (SEED * 1664525 + 1013904223) >>> 0; return SEED / 4294967296; }
    function def(obj, prop, val){ try { Object.defineProperty(obj, prop, { get: function(){ return val; }, configurable: true }); } catch(e){} }
    def(navigator, 'hardwareConcurrency', ${cores});
    def(navigator, 'deviceMemory', ${mem});
    def(navigator, 'platform', ${JSON.stringify(plat)});
    // Canvas: add a tiny seeded perturbation to readbacks.
    function jitter(data){ for (var i=0;i<data.length;i+=4){ if (((i>>2) + SEED) % 977 === 0){ data[i]^=1; } } return data; }
    var origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(){
      try { var ctx=this.getContext('2d'); if(ctx){ var w=this.width,h=this.height; if(w&&h){ var img=ctx.getImageData(0,0,w,h); jitter(img.data); ctx.putImageData(img,0,0); } } } catch(e){}
      return origToDataURL.apply(this, arguments);
    };
    var origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    CanvasRenderingContext2D.prototype.getImageData = function(){
      var d = origGetImageData.apply(this, arguments);
      try { jitter(d.data); } catch(e){}
      return d;
    };
    // WebGL: spoof the unmasked vendor/renderer.
    function patchGL(proto){
      if(!proto) return;
      var orig = proto.getParameter;
      proto.getParameter = function(p){
        if (p === 37445) return ${JSON.stringify(gpu.vendor)};
        if (p === 37446) return ${JSON.stringify(gpu.renderer)};
        return orig.apply(this, arguments);
      };
    }
    if (window.WebGLRenderingContext) patchGL(WebGLRenderingContext.prototype);
    if (window.WebGL2RenderingContext) patchGL(WebGL2RenderingContext.prototype);
  }catch(e){}})();`
}

/** Find the persona that owns a given session (matched by partition). */
function personaForSession(ses: Session): { id: string } | null {
  try {
    const rows = all<{ id: string; partition: string }>('SELECT id, partition FROM personas')
    for (const r of rows) {
      if (r.partition && session.fromPartition(String(r.partition)) === ses) return { id: String(r.id) }
    }
  } catch {
    /* db not ready */
  }
  return null
}

/** Apply UA + fingerprint spoof to a guest webview if it belongs to a persona
 *  and hardening is enabled. Call from the web-contents-created handler. */
export function hardenWebContents(contents: WebContents): void {
  const persona = personaForSession(contents.session)
  const harden = getSettings().hardenFingerprint !== false
  if (persona && harden) {
    const seed = seedFrom(persona.id)
    try {
      contents.session.setUserAgent(personaUA(seed))
    } catch {
      /* ignore */
    }
    contents.on('dom-ready', () => contents.executeJavaScript(spoofScript(seed)).catch(() => {}))
    return
  }
  // Default / un-hardened sessions: still strip the "Electron" token from the UA
  // so Google (Maps, Street View, Earth, Lens, sign-in) doesn't reject the browser.
  try {
    contents.session.setUserAgent(BASE_CHROME_UA)
  } catch {
    /* ignore */
  }
}
