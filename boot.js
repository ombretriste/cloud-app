// Se carga en <head> antes de pintar. Está en un archivo aparte (y no dentro de index.html)
// porque la política de seguridad (CSP, en vercel.json) no permite scripts en línea.

// Aplica tema y fondo antes de pintar (evita un destello del tema equivocado)
try {
  var d = JSON.parse(localStorage.getItem('cloudctrl:display') || '{}');
  var light = d.theme === 'light' || (d.theme !== 'dark' && matchMedia('(prefers-color-scheme: light)').matches);
  document.documentElement.dataset.theme = light ? 'light' : 'dark';
  document.documentElement.dataset.wall = d.wall || 'nube';
} catch (e) {}

// Vercel Web Analytics: sin cookies; solo visitas y las funciones que se abren, nunca el contenido.
window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
window.va('beforeSend', function (e) { return Object.assign({}, e, { url: e.url.split(/[?#]/)[0] }); });

// La app habla con su propio servidor (TextCTRL y SheetCTRL usan la dirección completa)
window.CLOUD_API = 'api/cloud';
