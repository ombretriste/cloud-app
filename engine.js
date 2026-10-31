'use strict';
// Motor de SheetCTRL (sin DOM): direcciones, fórmulas, funciones y formatos de número.
// Las fórmulas se guardan como en un .xlsx (nombres en inglés, coma entre argumentos, punto decimal)
// y se enseñan en español (=SUMA(A1:A3;1,5)); toLocal() y fromLocal() traducen entre las dos formas.

const MAX_ROWS = 1048576;
const MAX_COLS = 16384;

// ---------- Direcciones ----------
function colName(c) {
  let s = '';
  for (c += 1; c > 0; c = Math.floor((c - 1) / 26)) s = String.fromCharCode(65 + (c - 1) % 26) + s;
  return s;
}
function colIndex(name) {
  let n = 0;
  for (const ch of name.toUpperCase()) n = n * 26 + ch.charCodeAt(0) - 64;
  return n - 1;
}
const a1 = (r, c) => colName(c) + (r + 1);
function parseA1(s) {
  const m = /^([A-Za-z]+)(\d+)$/.exec(s.replace(/\$/g, ''));
  return m ? { r: Number(m[2]) - 1, c: colIndex(m[1]) } : null;
}
function parseRange(s) {
  const [a, b] = s.split(':');
  const p = parseA1(a), q = parseA1(b || a);
  return p && q ? { r1: Math.min(p.r, q.r), c1: Math.min(p.c, q.c), r2: Math.max(p.r, q.r), c2: Math.max(p.c, q.c) } : null;
}
const rangeText = (x) => (x.r1 === x.r2 && x.c1 === x.c2 ? a1(x.r1, x.c1) : `${a1(x.r1, x.c1)}:${a1(x.r2, x.c2)}`);

// ---------- Errores ----------
const E = {};
['#NULL!', '#DIV/0!', '#VALUE!', '#REF!', '#NAME?', '#NUM!', '#N/A', '#CIRC!'].forEach((e) => { E[e] = Object.freeze({ e }); });
const errOf = (code) => E[code] || { e: code };
const isErr = (v) => v !== null && typeof v === 'object' && 'e' in v;
const ERR_ES = { '#NULL!': '#¡NULO!', '#DIV/0!': '#¡DIV/0!', '#VALUE!': '#¡VALOR!', '#REF!': '#¡REF!', '#NAME?': '#¿NOMBRE?', '#NUM!': '#¡NUM!', '#N/A': '#N/D', '#CIRC!': '#¡CIRC!' };
const ERR_EN = Object.fromEntries(Object.entries(ERR_ES).map(([k, v]) => [v, k]));

// ---------- Nombres de funciones en español ----------
const FN_ES = {
  SUM: 'SUMA', AVERAGE: 'PROMEDIO', COUNT: 'CONTAR', COUNTA: 'CONTARA', COUNTBLANK: 'CONTAR.BLANCO', MEDIAN: 'MEDIANA', MODE: 'MODA',
  STDEV: 'DESVEST', STDEVP: 'DESVESTP', 'STDEV.S': 'DESVEST.M', 'STDEV.P': 'DESVEST.P', 'VAR.S': 'VAR.S', 'VAR.P': 'VAR.P', PRODUCT: 'PRODUCTO',
  ROUND: 'REDONDEAR', ROUNDUP: 'REDONDEAR.MAS', ROUNDDOWN: 'REDONDEAR.MENOS', INT: 'ENTERO', TRUNC: 'TRUNCAR', CEILING: 'MULTIPLO.SUPERIOR',
  FLOOR: 'MULTIPLO.INFERIOR', MOD: 'RESIDUO', POWER: 'POTENCIA', SQRT: 'RAIZ', RAND: 'ALEATORIO', RANDBETWEEN: 'ALEATORIO.ENTRE', SIGN: 'SIGNO',
  SUMIF: 'SUMAR.SI', SUMIFS: 'SUMAR.SI.CONJUNTO', COUNTIF: 'CONTAR.SI', COUNTIFS: 'CONTAR.SI.CONJUNTO', AVERAGEIF: 'PROMEDIO.SI',
  AVERAGEIFS: 'PROMEDIO.SI.CONJUNTO', SUMPRODUCT: 'SUMAPRODUCTO', LARGE: 'K.ESIMO.MAYOR', SMALL: 'K.ESIMO.MENOR', RANK: 'JERARQUIA',
  PERCENTILE: 'PERCENTIL', QUARTILE: 'CUARTIL', MAXIFS: 'MAX.SI.CONJUNTO', MINIFS: 'MIN.SI.CONJUNTO', SUBTOTAL: 'SUBTOTALES', GCD: 'M.C.D', LCM: 'M.C.M',
  SIN: 'SENO', IF: 'SI', IFS: 'SI.CONJUNTO', IFERROR: 'SI.ERROR', IFNA: 'SI.ND', AND: 'Y', OR: 'O', NOT: 'NO', XOR: 'XO', TRUE: 'VERDADERO', FALSE: 'FALSO',
  SWITCH: 'CAMBIAR', ISBLANK: 'ESBLANCO', ISNUMBER: 'ESNUMERO', ISTEXT: 'ESTEXTO', ISERROR: 'ESERROR', ISNA: 'ESNOD', ISLOGICAL: 'ESLOGICO', ISEVEN: 'ES.PAR',
  ISODD: 'ES.IMPAR', NA: 'NOD', CONCATENATE: 'CONCATENAR', TEXTJOIN: 'UNIRCADENAS', LEFT: 'IZQUIERDA', RIGHT: 'DERECHA', MID: 'EXTRAE', LEN: 'LARGO',
  UPPER: 'MAYUSC', LOWER: 'MINUSC', PROPER: 'NOMPROPIO', TRIM: 'ESPACIOS', SUBSTITUTE: 'SUSTITUIR', REPLACE: 'REEMPLAZAR', FIND: 'ENCONTRAR', SEARCH: 'HALLAR',
  REPT: 'REPETIR', TEXT: 'TEXTO', VALUE: 'VALOR', EXACT: 'IGUAL', CHAR: 'CARACTER', CODE: 'CODIGO', TODAY: 'HOY', NOW: 'AHORA', DATE: 'FECHA', TIME: 'NSHORA',
  YEAR: 'AÑO', MONTH: 'MES', DAY: 'DIA', HOUR: 'HORA', MINUTE: 'MINUTO', SECOND: 'SEGUNDO', WEEKDAY: 'DIASEM', WEEKNUM: 'NUM.DE.SEMANA', DAYS: 'DIAS',
  DATEDIF: 'SIFECHA', EDATE: 'FECHA.MES', EOMONTH: 'FIN.MES', NETWORKDAYS: 'DIAS.LAB', WORKDAY: 'DIA.LAB', VLOOKUP: 'BUSCARV', HLOOKUP: 'BUSCARH',
  XLOOKUP: 'BUSCARX', INDEX: 'INDICE', MATCH: 'COINCIDIR', LOOKUP: 'BUSCAR', CHOOSE: 'ELEGIR', ROW: 'FILA', COLUMN: 'COLUMNA', ROWS: 'FILAS', COLUMNS: 'COLUMNAS',
  OFFSET: 'DESREF', INDIRECT: 'INDIRECTO', PMT: 'PAGO', FV: 'VF', PV: 'VA', NPV: 'VNA', IRR: 'TIR', RATE: 'TASA', IPMT: 'PAGOINT', PPMT: 'PAGOPRIN',
};
const FN_EN = Object.fromEntries(Object.entries(FN_ES).map(([k, v]) => [v, k]));
FN_EN.ANO = 'YEAR'; // sin eñe
// En el archivo, las funciones modernas llevan el prefijo _xlfn.
const XLFN = new Set(['CONCAT', 'IFS', 'MAXIFS', 'MINIFS', 'SWITCH', 'TEXTJOIN', 'XOR', 'DAYS', 'IFNA', 'STDEV.S', 'STDEV.P', 'VAR.S', 'VAR.P', 'XLOOKUP']);

// ---------- Tokens ----------
const REF_END = /^[A-Za-z0-9_.(\u00c0-\u024f]/;
const NAME_RE = /^[A-Za-z_\u00c0-\u024f][A-Za-z0-9_.\u00c0-\u024f]*/;
const SHEET_RE = /^(?:'((?:[^']|'')+)'|([A-Za-z_\u00c0-\u024f][A-Za-z0-9_.\u00c0-\u024f]*))!/;

function refToken(s) {
  let m = /^(\$?)([A-Za-z]{1,3})(\$?)(\d{1,7})(?::(\$?)([A-Za-z]{1,3})(\$?)(\d{1,7}))?/.exec(s);
  if (m && !REF_END.test(s.slice(m[0].length))) {
    const a = { ca: !!m[1], c: colIndex(m[2]), ra: !!m[3], r: Number(m[4]) - 1 };
    const b = m[6] ? { ca: !!m[5], c: colIndex(m[6]), ra: !!m[7], r: Number(m[8]) - 1 } : null;
    if (a.r >= 0 && a.c < MAX_COLS && a.r < MAX_ROWS) return { len: m[0].length, a, b, kind: 'cell' };
  }
  m = /^(\$?)([A-Za-z]{1,3}):(\$?)([A-Za-z]{1,3})/.exec(s);
  if (m && !REF_END.test(s.slice(m[0].length))) return { len: m[0].length, kind: 'col', a: { ca: !!m[1], c: colIndex(m[2]), r: 0 }, b: { ca: !!m[3], c: colIndex(m[4]), r: MAX_ROWS - 1 } };
  m = /^(\$?)(\d{1,7}):(\$?)(\d{1,7})/.exec(s);
  if (m && !REF_END.test(s.slice(m[0].length))) return { len: m[0].length, kind: 'row', a: { ra: !!m[1], r: Number(m[2]) - 1, c: 0 }, b: { ra: !!m[3], r: Number(m[4]) - 1, c: MAX_COLS - 1 } };
  return null;
}

// es: admite coma decimal y nombres en español; el resultado guarda posición para poder reescribir el texto
function tokenize(text, es = false) {
  const out = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    const rest = text.slice(i);
    if (/\s/.test(ch)) { i++; continue; }
    const push = (type, len, extra) => { out.push({ type, start: i, end: i + len, text: text.slice(i, i + len), ...extra }); i += len; };
    if (ch === '"') {
      let j = i + 1, v = '';
      for (;;) {
        if (j >= text.length) throw new SyntaxError('string');
        if (text[j] === '"') { if (text[j + 1] === '"') { v += '"'; j += 2; continue; } break; }
        v += text[j++];
      }
      push('str', j + 1 - i, { v });
      continue;
    }
    let m = (es ? /^(?:\d+[.,]?\d*|[.,]\d+)(?:[eE][+-]?\d+)?/ : /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/).exec(rest);
    if (m && !refToken(rest)) {
      // «1,» en español: la coma es separador, no decimal
      let t = m[0];
      if (es && /[.,]$/.test(t)) t = t.slice(0, -1);
      push('num', t.length, { v: Number(t.replace(',', '.')) });
      continue;
    }
    m = SHEET_RE.exec(rest);
    if (m) {
      const ref = refToken(rest.slice(m[0].length));
      const sheet = m[1] !== undefined ? m[1].replace(/''/g, "'") : m[2];
      if (ref) { push('ref', m[0].length + ref.len, { sheet, ...ref }); continue; }
      if (rest.slice(m[0].length).startsWith('#REF!')) { push('err', m[0].length + 5, { v: E['#REF!'] }); continue; }
      const n = NAME_RE.exec(rest.slice(m[0].length));
      if (n) { push('name', m[0].length + n[0].length, { sheet, v: n[0] }); continue; }
    }
    if (ch === '#') {
      m = /^#(?:[¡¿]?[A-Za-z0-9/]+[!?]?)/.exec(rest);
      if (m) { const t = m[0].toUpperCase(); push('err', m[0].length, { v: errOf(ERR_EN[t] || t) }); continue; }
    }
    const ref = refToken(rest);
    if (ref) { push('ref', ref.len, ref); continue; }
    m = NAME_RE.exec(rest);
    if (m) {
      const up = m[0].toUpperCase();
      if (text[i + m[0].length] === '(') { push('func', m[0].length, { v: up.replace(/^_XLFN\.|^_XLWS\./, '').replace(/^_XLFN\./, '') }); continue; }
      if (up === 'TRUE' || up === 'VERDADERO') { push('bool', m[0].length, { v: true }); continue; }
      if (up === 'FALSE' || up === 'FALSO') { push('bool', m[0].length, { v: false }); continue; }
      push('name', m[0].length, { v: m[0] });
      continue;
    }
    m = /^(?:<>|<=|>=|[-+*/^&=<>%])/.exec(rest);
    if (m) { push('op', m[0].length, { v: m[0] }); continue; }
    if (ch === '(' || ch === ')' || ch === '{' || ch === '}' || ch === ',' || ch === ';' || ch === '\\') { push(ch, 1); continue; }
    throw new SyntaxError(`char ${ch}`);
  }
  return out;
}

const quoteSheet = (n) => (/^[A-Za-z_\u00c0-\u024f][A-Za-z0-9_.\u00c0-\u024f]*$/.test(n) && !refToken(n) ? n : `'${n.replace(/'/g, "''")}'`);
function refText(t) {
  const part = (p, kind) => (kind === 'row' ? '' : `${p.ca ? '$' : ''}${colName(p.c)}`) + (kind === 'col' ? '' : `${p.ra ? '$' : ''}${p.r + 1}`);
  return (t.sheet !== undefined ? `${quoteSheet(t.sheet)}!` : '') + part(t.a, t.kind) + (t.b ? `:${part(t.b, t.kind)}` : '');
}
// Reescribe el texto cambiando solo algunos tokens: fn(token) devuelve el texto nuevo o undefined
function rewrite(text, es, fn) {
  const toks = tokenize(text, es);
  let out = '', pos = 0;
  for (const t of toks) {
    const n = fn(t);
    if (n === undefined) continue;
    out += text.slice(pos, t.start) + n;
    pos = t.end;
  }
  return out + text.slice(pos);
}

function toLocal(f) {
  try {
    return rewrite(f, false, (t) => {
      if (t.type === 'func') return FN_ES[t.v] || t.v;
      if (t.type === ',') return ';';
      if (t.type === 'num') return t.text.replace('.', ',');
      if (t.type === 'bool') return t.v ? 'VERDADERO' : 'FALSO';
      if (t.type === 'err') return ERR_ES[t.v.e] || t.v.e;
      return undefined;
    });
  } catch (_) { return f; }
}
function fromLocal(text) {
  return rewrite(text, true, (t) => {
    if (t.type === 'func') { const n = t.v.normalize('NFC'); return FN_EN[n] || n; }
    if (t.type === ';' || t.type === ',') return ',';
    if (t.type === 'num') return String(t.v);
    if (t.type === 'bool') return t.v ? 'TRUE' : 'FALSE';
    if (t.type === 'err') return t.v.e;
    if (t.type === 'ref') return refText(t);
    return undefined;
  });
}
// Fórmula del archivo → texto interno y al revés
// Las modernas que conocemos pierden el prefijo; las demás lo conservan para volver intactas al archivo
const fromXlsxFormula = (f) => f.replace(/_xlfn\.(?:_xlws\.)?([A-Za-z0-9.]+)/g, (m, n) => (XLFN.has(n.toUpperCase()) ? n : m));
function toXlsxFormula(f) {
  try { return rewrite(f, false, (t) => (t.type === 'func' && XLFN.has(t.v) ? `_xlfn.${t.v}` : undefined)); } catch (_) { return f; }
}

// Copiar o rellenar: mueve las referencias relativas
function shiftFormula(f, dr, dc) {
  if (!dr && !dc) return f;
  return rewrite(f, false, (t) => {
    if (t.type !== 'ref') return undefined;
    const mv = (p) => ({ ...p, r: p.ra || t.kind === 'col' ? p.r : p.r + dr, c: p.ca || t.kind === 'row' ? p.c : p.c + dc });
    const a = mv(t.a), b = t.b && mv(t.b);
    if (a.r < 0 || a.c < 0 || a.r >= MAX_ROWS || a.c >= MAX_COLS || (b && (b.r < 0 || b.c < 0 || b.r >= MAX_ROWS || b.c >= MAX_COLS))) return '#REF!';
    return refText({ ...t, a, b });
  });
}
// Insertar (n > 0) o borrar (n < 0) filas o columnas en la hoja `target`
function adjustFormula(f, owner, target, axis, at, n) {
  const key = axis === 'r' ? 'r' : 'c';
  const lc = target.toLowerCase();
  return rewrite(f, false, (t) => {
    if (t.type !== 'ref') return undefined;
    if ((t.sheet ?? owner).toLowerCase() !== lc) return undefined;
    if ((axis === 'r' && t.kind === 'col') || (axis === 'c' && t.kind === 'row')) return undefined;
    const a = { ...t.a }, b = t.b ? { ...t.b } : null;
    if (n > 0) {
      if (a[key] >= at) a[key] += n;
      if (b && b[key] >= at) b[key] += n;
    } else {
      const end = at - n; // [at, end) se borra
      if (!b) {
        if (a[key] >= end) a[key] += n;
        else if (a[key] >= at) return '#REF!';
      } else {
        if (a[key] >= at && b[key] < end) return '#REF!';
        if (a[key] >= end) a[key] += n; else if (a[key] >= at) a[key] = at;
        if (b[key] >= end) b[key] += n; else if (b[key] >= at) b[key] = at - 1;
      }
    }
    return refText({ ...t, a, b });
  });
}
function renameSheetInFormula(f, from, to) {
  const lc = from.toLowerCase();
  return rewrite(f, false, (t) => (t.type === 'ref' && t.sheet?.toLowerCase() === lc ? refText({ ...t, sheet: to }) : undefined));
}

// ---------- Análisis sintáctico ----------
const astCache = new Map();
function parseFormula(f) {
  if (astCache.has(f)) return astCache.get(f);
  let ast = null;
  try { ast = parseTokens(tokenize(f)); } catch (x) { if (x instanceof RangeError) throw x; ast = null; }
  if (astCache.size > 50000) astCache.clear();
  astCache.set(f, ast);
  return ast;
}
function parseTokens(toks) {
  let p = 0;
  const peek = () => toks[p];
  const isOp = (...ops) => peek()?.type === 'op' && ops.includes(peek().v);
  const bin = (next, ...ops) => () => {
    let a = next();
    while (isOp(...ops)) { const op = toks[p++].v; a = { t: 'bin', op, a, b: next() }; }
    return a;
  };
  const primary = () => {
    const k = toks[p++];
    if (!k) throw new SyntaxError('fin');
    switch (k.type) {
      case 'num': case 'str': case 'bool': case 'err': return { t: 'val', v: k.v };
      case 'ref': return { t: 'ref', sheet: k.sheet, a: k.a, b: k.b };
      case 'name': return { t: 'name', v: k.v, sheet: k.sheet };
      case 'func': {
        p++; // (
        const args = [];
        if (peek()?.type === ')') { p++; return { t: 'fn', name: k.v, args }; }
        for (;;) {
          if (peek()?.type === ',' || peek()?.type === ')') args.push({ t: 'empty' });
          else args.push(compare());
          const s = toks[p++];
          if (s?.type === ')') break;
          if (s?.type !== ',' && s?.type !== ';') throw new SyntaxError('args');
        }
        return { t: 'fn', name: k.v, args };
      }
      case '(': {
        const e = compare();
        if (toks[p++]?.type !== ')') throw new SyntaxError('paren');
        return e;
      }
      case '{': {
        const arr = [[]];
        for (;;) {
          let sign = 1;
          if (isOp('-')) { p++; sign = -1; }
          const c = toks[p++];
          if (!c || !['num', 'str', 'bool'].includes(c.type)) throw new SyntaxError('array');
          arr[arr.length - 1].push(c.type === 'num' ? c.v * sign : c.v);
          const s = toks[p++];
          if (s?.type === '}') break;
          if (s?.type === ';') arr.push([]);
          else if (s?.type !== ',' && s?.type !== '\\') throw new SyntaxError('array');
        }
        return { t: 'val', v: { arr } };
      }
      default: throw new SyntaxError('primary');
    }
  };
  const postfix = () => {
    let a = primary();
    while (isOp('%')) { p++; a = { t: 'pct', a }; }
    return a;
  };
  const unary = () => {
    if (isOp('-', '+')) { const op = toks[p++].v; const a = unary(); return op === '-' ? { t: 'neg', a } : a; }
    return postfix();
  };
  const pow = bin(unary, '^');
  const mul = bin(pow, '*', '/');
  const add = bin(mul, '+', '-');
  const con = bin(add, '&');
  const compare = bin(con, '=', '<>', '<', '<=', '>', '>=');
  const ast = compare();
  if (p < toks.length) throw new SyntaxError('resto');
  return ast;
}
function hasUnknown(n) {
  if (!n || typeof n !== 'object') return false;
  if (n.unk !== undefined) return n.unk;
  let u = false;
  if (n.t === 'fn') u = !FN[n.name] || n.args.some(hasUnknown);
  else if (n.t === 'bin') u = hasUnknown(n.a) || hasUnknown(n.b);
  else if (n.t === 'neg' || n.t === 'pct') u = hasUnknown(n.a);
  n.unk = u;
  return u;
}

// ---------- Hojas ----------
function newSheetData(name) {
  return { id: Math.random().toString(36).slice(2, 10), name, cells: new Map(), cols: {}, rows: {}, merges: [], freeze: { r: 0, c: 0 } };
}
const getCell = (sh, r, c) => sh.cells.get(r)?.get(c);
function ensureCell(sh, r, c) {
  let row = sh.cells.get(r);
  if (!row) sh.cells.set(r, row = new Map());
  let cell = row.get(c);
  if (!cell) row.set(c, cell = {});
  return cell;
}
function dropCell(sh, r, c) {
  const row = sh.cells.get(r);
  if (!row) return;
  row.delete(c);
  if (!row.size) sh.cells.delete(r);
}
function usedRange(sh) {
  let r2 = -1, c2 = -1;
  for (const [r, row] of sh.cells) { if (r > r2) r2 = r; for (const c of row.keys()) if (c > c2) c2 = c; }
  return { r2, c2 };
}

// ---------- Cálculo ----------
// Cada edición sube `gen`: una fórmula solo se recalcula cuando alguien pide su valor.
class Calc {
  constructor(wb) { this.wb = wb; this.gen = 1; this.indexSheets(); }
  invalidate() { this.gen++; }
  indexSheets() {
    this.byName = new Map(this.wb.sheets.map((s, i) => [s.name.toLowerCase(), i]));
    this.names = new Map(Object.entries(this.wb.names || {}).map(([k, v]) => [k.toLowerCase(), v]));
  }
  value(si, r, c) {
    const cell = getCell(this.wb.sheets[si], r, c);
    if (!cell) return undefined;
    if (cell.f === undefined) return cell.v;
    if (cell.g === this.gen) return cell.v;
    if (cell.busy) return E['#CIRC!'];
    const ast = parseFormula(cell.f);
    if (!ast) { cell.g = this.gen; return cell.v ?? E['#NAME?']; }
    if (hasUnknown(ast)) { cell.g = this.gen; return cell.v ?? E['#NAME?']; } // función que no conocemos: se respeta lo guardado
    cell.busy = true;
    let v;
    try {
      v = this.scalar(this.eval(ast, { si, r, c }), { si, r, c });
    } catch (x) {
      if (x instanceof RangeError) { delete cell.busy; throw x; }
      v = isErr(x) ? x : E['#VALUE!'];
    }
    delete cell.busy;
    cell.v = v === undefined ? 0 : v;
    cell.g = this.gen;
    return cell.v;
  }
  // Valor seguro: si una cadena de fórmulas es muy larga se calcula antes en orden y se reintenta
  safe(si, r, c) {
    try { return this.value(si, r, c); } catch (x) {
      if (!(x instanceof RangeError)) throw x;
      this.all();
      return this.value(si, r, c);
    }
  }
  all() {
    this.wb.sheets.forEach((sh, si) => {
      const rows = [...sh.cells.keys()].sort((a, b) => a - b);
      for (const r of rows) for (const c of [...sh.cells.get(r).keys()].sort((a, b) => a - b)) {
        try { this.value(si, r, c); } catch (x) { if (!(x instanceof RangeError)) throw x; }
      }
    });
  }
  // Rango → valor suelto (intersección implícita con la fila o columna de la fórmula)
  scalar(v, ctx) {
    if (v instanceof Rng) {
      const { r1, c1, r2, c2, si } = v;
      if (r1 === r2 && c1 === c2) return this.value(si, r1, c1);
      if (c1 === c2 && ctx.r >= r1 && ctx.r <= r2) return this.value(si, ctx.r, c1);
      if (r1 === r2 && ctx.c >= c1 && ctx.c <= c2) return this.value(si, r1, ctx.c);
      return r2 - r1 && c2 - c1 ? this.value(si, r1, c1) : E['#VALUE!'];
    }
    if (v && v.arr) return v.arr[0][0];
    return v;
  }
  eval(n, ctx) {
    switch (n.t) {
      case 'val': return n.v;
      case 'empty': return undefined;
      case 'ref': return this.refRange(n, ctx);
      case 'name': {
        const def = this.names.get(n.v.toLowerCase());
        if (!def) throw E['#NAME?'];
        const ast = parseFormula(def);
        if (!ast) throw E['#NAME?'];
        return this.eval(ast, ctx);
      }
      case 'neg': return this.map1(this.eval(n.a, ctx), (x) => -toNum(x));
      case 'pct': return this.map1(this.eval(n.a, ctx), (x) => toNum(x) / 100);
      case 'bin': return this.bin(n.op, this.eval(n.a, ctx), this.eval(n.b, ctx));
      case 'fn': return this.call(n, ctx);
      default: throw E['#VALUE!'];
    }
  }
  refRange(n, ctx) {
    let si = ctx.si;
    if (n.sheet !== undefined) {
      si = this.byName.get(n.sheet.toLowerCase());
      if (si === undefined) throw E['#REF!'];
    }
    const b = n.b || n.a;
    return new Rng(si, Math.min(n.a.r, b.r), Math.min(n.a.c, b.c), Math.max(n.a.r, b.r), Math.max(n.a.c, b.c));
  }
  matrix(v) {
    if (v instanceof Rng) {
      const u = usedRange(this.wb.sheets[v.si]);
      const r2 = Math.min(v.r2, Math.max(u.r2, v.r1)), c2 = Math.min(v.c2, Math.max(u.c2, v.c1));
      const out = [];
      for (let r = v.r1; r <= r2; r++) {
        const row = [];
        for (let c = v.c1; c <= c2; c++) row.push(this.value(v.si, r, c));
        out.push(row);
      }
      return out;
    }
    if (v && v.arr) return v.arr;
    return [[v]];
  }
  isMulti(v) { return (v instanceof Rng && (v.r1 !== v.r2 || v.c1 !== v.c2)) || !!(v && v.arr); }
  map1(v, fn) {
    if (this.isMulti(v)) return { arr: this.matrix(v).map((row) => row.map((x) => guard(fn, x))) };
    return fn(this.single(v));
  }
  single(v) {
    if (v instanceof Rng) v = this.value(v.si, v.r1, v.c1);
    if (isErr(v)) throw v;
    return v;
  }
  bin(op, a, b) {
    if (this.isMulti(a) || this.isMulti(b)) {
      const A = this.matrix(a), B = this.matrix(b);
      const h = Math.max(A.length, B.length), w = Math.max(A[0].length, B[0].length);
      const at = (M, i, j) => { const row = M.length === 1 ? M[0] : M[i]; if (!row) return E['#N/A']; return row.length === 1 ? row[0] : (row[j] === undefined && j >= row.length ? E['#N/A'] : row[j]); };
      const out = [];
      for (let i = 0; i < h; i++) {
        const row = [];
        for (let j = 0; j < w; j++) row.push(guard2((x, y) => binop(op, x, y), at(A, i, j), at(B, i, j)));
        out.push(row);
      }
      return { arr: out };
    }
    return binop(op, this.single(a), this.single(b));
  }
  call(n, ctx) {
    const fn = FN[n.name];
    if (!fn) throw E['#NAME?'];
    if (fn.lazy) return fn(n.args, ctx, this);
    return fn(n.args.map((a) => this.eval(a, ctx)), ctx, this);
  }
  // Recorre valores de los argumentos. En rangos solo cuentan números (como SUMA); un error se propaga.
  numbers(args, { text = false } = {}) {
    const out = [];
    for (const a of args) {
      if (a instanceof Rng || (a && a.arr)) {
        this.each(a, (v) => {
          if (isErr(v)) throw v;
          if (typeof v === 'number') out.push(v);
          else if (text && v !== undefined) out.push(typeof v === 'boolean' ? Number(v) : 0);
        });
      } else if (a !== undefined) out.push(toNum(a));
    }
    return out;
  }
  each(a, fn) {
    if (a instanceof Rng) {
      const sh = this.wb.sheets[a.si];
      if (a.r2 - a.r1 + 1 > sh.cells.size) {
        for (const [r, row] of sh.cells) {
          if (r < a.r1 || r > a.r2) continue;
          for (const c of row.keys()) if (c >= a.c1 && c <= a.c2) fn(this.value(a.si, r, c));
        }
      } else {
        for (let r = a.r1; r <= a.r2; r++) {
          const row = sh.cells.get(r);
          if (!row) continue;
          for (const c of row.keys()) if (c >= a.c1 && c <= a.c2) fn(this.value(a.si, r, c));
        }
      }
    } else if (a && a.arr) a.arr.forEach((row) => row.forEach(fn));
    else fn(a);
  }
  arg(v, ctx) { const x = this.scalar(v, ctx); if (isErr(x)) throw x; return x; }
}
class Rng {
  constructor(si, r1, c1, r2, c2) { this.si = si; this.r1 = r1; this.c1 = c1; this.r2 = r2; this.c2 = c2; }
  get rows() { return this.r2 - this.r1 + 1; }
  get cols() { return this.c2 - this.c1 + 1; }
}
const guard = (fn, x) => { try { if (isErr(x)) return x; return fn(x); } catch (e) { if (isErr(e)) return e; throw e; } };
const guard2 = (fn, x, y) => { try { if (isErr(x)) return x; if (isErr(y)) return y; return fn(x, y); } catch (e) { if (isErr(e)) return e; throw e; } };

function binop(op, a, b) {
  switch (op) {
    case '+': return toNum(a) + toNum(b);
    case '-': return toNum(a) - toNum(b);
    case '*': return toNum(a) * toNum(b);
    case '/': { const d = toNum(b); if (d === 0) throw E['#DIV/0!']; return toNum(a) / d; }
    case '^': { const r = Math.pow(toNum(a), toNum(b)); if (!Number.isFinite(r)) throw E['#NUM!']; return r; }
    case '&': return toStr(a) + toStr(b);
    default: {
      const c = compareValues(a, b);
      return { '=': c === 0, '<>': c !== 0, '<': c < 0, '<=': c <= 0, '>': c > 0, '>=': c >= 0 }[op];
    }
  }
}
const typeRank = (v) => (typeof v === 'number' ? 0 : typeof v === 'string' ? 1 : 2);
function compareValues(a, b) {
  if (a === undefined) a = typeof b === 'string' ? '' : typeof b === 'boolean' ? false : 0;
  if (b === undefined) b = typeof a === 'string' ? '' : typeof a === 'boolean' ? false : 0;
  if (typeRank(a) !== typeRank(b)) return typeRank(a) - typeRank(b);
  if (typeof a === 'string') { const x = a.toLowerCase(), y = b.toLowerCase(); return x < y ? -1 : x > y ? 1 : 0; }
  return a === b ? 0 : a < b ? -1 : 1;
}
function toNum(v) {
  if (typeof v === 'number') return v;
  if (v === undefined || v === null || v === '') return v === '' ? (() => { throw E['#VALUE!']; })() : 0;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (isErr(v)) throw v;
  if (typeof v === 'string') {
    const p = parseInput(v);
    if (typeof p.v === 'number') return p.v;
  }
  throw E['#VALUE!'];
}
function toStr(v) {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'boolean') return v ? 'VERDADERO' : 'FALSO';
  if (isErr(v)) throw v;
  return generalNumber(v);
}
function toBool(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (v === undefined) return false;
  if (typeof v === 'string') {
    const u = v.toUpperCase();
    if (u === 'TRUE' || u === 'VERDADERO') return true;
    if (u === 'FALSE' || u === 'FALSO') return false;
  }
  throw E['#VALUE!'];
}

// Criterios de SUMAR.SI y compañía: ">=5", "<>x", "a*"
function criterion(crit) {
  if (isErr(crit)) throw crit;
  let op = '=', val = crit;
  if (typeof crit === 'string') {
    const m = /^(<>|<=|>=|=|<|>)(.*)$/s.exec(crit);
    if (m) { op = m[1]; val = m[2]; }
    const p = parseInput(val);
    if (typeof p.v === 'number' || typeof p.v === 'boolean') val = p.v;
  }
  if (val === undefined) val = 0;
  if (typeof val === 'string' && (op === '=' || op === '<>')) {
    if (val === '') return (v) => (op === '=' ? v === undefined || v === '' : !(v === undefined || v === ''));
    const re = new RegExp(`^${val.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/~\*/g, '\u0001').replace(/~\?/g, '\u0002').replace(/\*/g, '.*').replace(/\?/g, '.').replace(/\u0001/g, '\\*').replace(/\u0002/g, '\\?')}$`, 'is');
    return (v) => (typeof v === 'string' && re.test(v)) === (op === '=');
  }
  return (v) => {
    if (isErr(v)) return false;
    if (typeof val === 'number' && typeof v !== 'number') return op === '<>';
    if (typeof val === 'string' && typeof v !== 'string') return false;
    if (typeof val === 'boolean' && typeof v !== 'boolean') return op === '<>';
    const c = compareValues(v, val);
    return { '=': c === 0, '<>': c !== 0, '<': c < 0, '<=': c <= 0, '>': c > 0, '>=': c >= 0 }[op];
  };
}

// ---------- Fechas ----------
const DAY_MS = 86400000;
function serialFromDate(y, m, d) { // m 1-12, admite desbordes
  const t = Date.UTC(2000, 0, 1);
  const dt = new Date(t);
  dt.setUTCFullYear(y, m - 1, d);
  const s = (dt.getTime() - Date.UTC(1899, 11, 30)) / DAY_MS;
  return s < 61 ? s - 1 : s; // Excel cuenta un 29 de febrero de 1900 que no existió
}
function dateFromSerial(n) {
  const s = Math.floor(n);
  const dt = new Date(Date.UTC(1899, 11, 30) + (s < 61 ? s + 1 : s) * DAY_MS);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), wd: dt.getUTCDay() };
}
function timeFromSerial(n) {
  const secs = Math.round((n - Math.floor(n)) * 86400);
  return { h: Math.floor(secs / 3600) % 24, i: Math.floor(secs / 60) % 60, s: secs % 60 };
}
function todaySerial() { const n = new Date(); return serialFromDate(n.getFullYear(), n.getMonth() + 1, n.getDate()); }

// ---------- Funciones ----------
const FN = {};
const def = (names, fn, lazy) => { fn.lazy = !!lazy; names.split(' ').forEach((n) => { FN[n] = fn; }); };
// mat: función con argumentos sueltos (cada uno ya convertido a escalar)
const sc = (fn) => (args, ctx, k) => fn(...args.map((a) => k.arg(a, ctx)));
const mathFn = (fn) => sc((x) => { const r = fn(toNum(x)); if (!Number.isFinite(r)) throw E['#NUM!']; return r; });

def('SUM', (a, x, k) => k.numbers(a).reduce((s, v) => s + v, 0));
def('AVERAGE', (a, x, k) => { const n = k.numbers(a); if (!n.length) throw E['#DIV/0!']; return n.reduce((s, v) => s + v, 0) / n.length; });
def('COUNT', (a, x, k) => {
  let n = 0;
  for (const v of a) {
    if (v instanceof Rng || (v && v.arr)) k.each(v, (y) => { if (typeof y === 'number') n++; });
    else if (typeof v === 'number' || typeof v === 'boolean') n++;
    else if (typeof v === 'string' && typeof parseInput(v).v === 'number') n++;
  }
  return n;
});
def('COUNTA', (a, x, k) => {
  let n = 0;
  for (const v of a) {
    if (v instanceof Rng || (v && v.arr)) k.each(v, (y) => { if (y !== undefined) n++; });
    else if (v !== undefined) n++;
  }
  return n;
});
def('COUNTBLANK', (a, x, k) => {
  const r = a[0];
  if (!(r instanceof Rng)) throw E['#VALUE!'];
  return k.matrix(r).flat().filter((v) => v === undefined || v === '').length + (r.rows * r.cols - k.matrix(r).flat().length);
});
def('MIN', (a, x, k) => { const n = k.numbers(a); return n.length ? Math.min(...n) : 0; });
def('MAX', (a, x, k) => { const n = k.numbers(a); return n.length ? Math.max(...n) : 0; });
const sorted = (n) => [...n].sort((p, q) => p - q);
def('MEDIAN', (a, x, k) => {
  const n = sorted(k.numbers(a));
  if (!n.length) throw E['#NUM!'];
  const m = n.length >> 1;
  return n.length % 2 ? n[m] : (n[m - 1] + n[m]) / 2;
});
def('MODE MODE.SNGL', (a, x, k) => {
  const seen = new Map();
  let best, top = 1;
  for (const v of k.numbers(a)) {
    const c = (seen.get(v) || 0) + 1;
    seen.set(v, c);
    if (c > top) { top = c; best = v; }
  }
  if (best === undefined) throw E['#N/A'];
  return best;
});
const variance = (n, sample) => {
  if (n.length < (sample ? 2 : 1)) throw E['#DIV/0!'];
  const m = n.reduce((s, v) => s + v, 0) / n.length;
  return n.reduce((s, v) => s + (v - m) ** 2, 0) / (n.length - (sample ? 1 : 0));
};
def('VAR VAR.S', (a, x, k) => variance(k.numbers(a), true));
def('VARP VAR.P', (a, x, k) => variance(k.numbers(a), false));
def('STDEV STDEV.S', (a, x, k) => Math.sqrt(variance(k.numbers(a), true)));
def('STDEVP STDEV.P', (a, x, k) => Math.sqrt(variance(k.numbers(a), false)));
def('PRODUCT', (a, x, k) => { const n = k.numbers(a); return n.length ? n.reduce((s, v) => s * v, 1) : 0; });
def('ABS', mathFn(Math.abs));
def('INT', mathFn(Math.floor));
def('SQRT', mathFn((v) => { if (v < 0) throw E['#NUM!']; return Math.sqrt(v); }));
def('EXP', mathFn(Math.exp));
def('LN', mathFn((v) => { if (v <= 0) throw E['#NUM!']; return Math.log(v); }));
def('LOG10', mathFn((v) => { if (v <= 0) throw E['#NUM!']; return Math.log10(v); }));
def('LOG', sc((v, b = 10) => { if (toNum(v) <= 0 || toNum(b) <= 0) throw E['#NUM!']; return Math.log(toNum(v)) / Math.log(toNum(b)); }));
def('SIN', mathFn(Math.sin)); def('COS', mathFn(Math.cos)); def('TAN', mathFn(Math.tan));
def('SIGN', mathFn(Math.sign));
def('PI', () => Math.PI);
def('RAND', () => Math.random());
def('RANDBETWEEN', sc((a, b) => { const lo = Math.ceil(toNum(a)), hi = Math.floor(toNum(b)); if (hi < lo) throw E['#NUM!']; return lo + Math.floor(Math.random() * (hi - lo + 1)); }));
const roundTo = (v, d, f) => {
  const p = 10 ** d;
  const scaled = v * p;
  // Corrige el ruido binario (1,005 × 100 = 100,49999…) antes de redondear
  const fixed = Number(scaled.toPrecision(15));
  return f(fixed) / p;
};
const awayFromZero = (x) => Math.sign(x) * Math.round(Math.abs(x));
def('ROUND', sc((v, d) => roundTo(toNum(v), Math.trunc(toNum(d)), awayFromZero)));
def('ROUNDUP', sc((v, d) => roundTo(toNum(v), Math.trunc(toNum(d)), (x) => Math.sign(x) * Math.ceil(Math.abs(x)))));
def('ROUNDDOWN TRUNC', sc((v, d = 0) => roundTo(toNum(v), Math.trunc(toNum(d)), Math.trunc)));
def('CEILING', sc((v, s = 1) => { s = toNum(s); return s === 0 ? 0 : roundTo(toNum(v) / s, 0, Math.ceil) * s; }));
def('FLOOR', sc((v, s = 1) => { s = toNum(s); if (s === 0) throw E['#DIV/0!']; return roundTo(toNum(v) / s, 0, Math.floor) * s; }));
def('MOD', sc((a, b) => { a = toNum(a); b = toNum(b); if (b === 0) throw E['#DIV/0!']; return a - b * Math.floor(a / b); }));
def('POWER', sc((a, b) => binop('^', a, b)));
def('FACT', mathFn((v) => { let r = 1; for (let i = 2; i <= Math.floor(v); i++) r *= i; if (v < 0) throw E['#NUM!']; return r; }));
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
def('GCD', (a, x, k) => k.numbers(a).map(Math.trunc).reduce(gcd, 0));
def('LCM', (a, x, k) => k.numbers(a).map(Math.trunc).reduce((p, q) => (p && q ? (p * q) / gcd(p, q) : 0), 1));
def('LARGE', (a, x, k) => { const n = sorted(k.numbers([a[0]])).reverse(), i = toNum(k.arg(a[1], x)); if (i < 1 || i > n.length) throw E['#NUM!']; return n[Math.ceil(i) - 1]; });
def('SMALL', (a, x, k) => { const n = sorted(k.numbers([a[0]])), i = toNum(k.arg(a[1], x)); if (i < 1 || i > n.length) throw E['#NUM!']; return n[Math.ceil(i) - 1]; });
def('RANK RANK.EQ', (a, x, k) => {
  const v = toNum(k.arg(a[0], x)), n = k.numbers([a[1]]), asc = a[2] !== undefined && toNum(k.arg(a[2], x)) !== 0;
  if (!n.includes(v)) throw E['#N/A'];
  return 1 + n.filter((y) => (asc ? y < v : y > v)).length;
});
const percentile = (n, p) => {
  if (!n.length || p < 0 || p > 1) throw E['#NUM!'];
  const s = sorted(n), i = p * (s.length - 1), f = Math.floor(i);
  return s[f] + (i - f) * ((s[f + 1] ?? s[f]) - s[f]);
};
def('PERCENTILE PERCENTILE.INC', (a, x, k) => percentile(k.numbers([a[0]]), toNum(k.arg(a[1], x))));
def('QUARTILE QUARTILE.INC', (a, x, k) => percentile(k.numbers([a[0]]), toNum(k.arg(a[1], x)) / 4));

// Parejas rango + criterio → casillas que cumplen todo
function matchPairs(pairs, x, k) {
  const first = pairs[0][0];
  if (!(first instanceof Rng)) throw E['#VALUE!'];
  const tests = pairs.map(([r, c]) => [r instanceof Rng ? r : null, criterion(k.arg(c, x))]);
  const h = Math.min(first.rows, usedRange(k.wb.sheets[first.si]).r2 - first.r1 + 1);
  const w = first.cols;
  const hits = [];
  for (let i = 0; i < h; i++) for (let j = 0; j < w; j++) {
    if (tests.every(([r, t]) => r && t(k.value(r.si, r.r1 + i, r.c1 + j)))) hits.push([i, j]);
  }
  return hits;
}
const pairsOf = (a) => { const out = []; for (let i = 0; i + 1 < a.length; i += 2) out.push([a[i], a[i + 1]]); return out; };
const valuesAt = (rng, hits, k) => hits.map(([i, j]) => k.value(rng.si, rng.r1 + i, rng.c1 + j));
const nums = (vals) => { const e = vals.find(isErr); if (e) throw e; return vals.filter((v) => typeof v === 'number'); };
const total = (n) => n.reduce((s, v) => s + v, 0);
def('SUMIF', (a, x, k) => { const src = a[2] instanceof Rng ? a[2] : a[0]; return total(nums(valuesAt(src, matchPairs([[a[0], a[1]]], x, k), k))); });
def('SUMIFS', (a, x, k) => total(nums(valuesAt(a[0], matchPairs(pairsOf(a.slice(1)), x, k), k))));
def('COUNTIF', (a, x, k) => {
  const test = criterion(k.arg(a[1], x));
  if (!(a[0] instanceof Rng)) throw E['#VALUE!'];
  let n = 0;
  if (test(undefined)) { n = k.matrix(a[0]).flat().filter(test).length; return n; }
  k.each(a[0], (v) => { if (test(v)) n++; });
  return n;
});
def('COUNTIFS', (a, x, k) => matchPairs(pairsOf(a), x, k).length);
const avg = (n) => { if (!n.length) throw E['#DIV/0!']; return total(n) / n.length; };
def('AVERAGEIF', (a, x, k) => { const src = a[2] instanceof Rng ? a[2] : a[0]; return avg(nums(valuesAt(src, matchPairs([[a[0], a[1]]], x, k), k))); });
def('AVERAGEIFS', (a, x, k) => avg(nums(valuesAt(a[0], matchPairs(pairsOf(a.slice(1)), x, k), k))));
def('MAXIFS', (a, x, k) => { const n = nums(valuesAt(a[0], matchPairs(pairsOf(a.slice(1)), x, k), k)); return n.length ? Math.max(...n) : 0; });
def('MINIFS', (a, x, k) => { const n = nums(valuesAt(a[0], matchPairs(pairsOf(a.slice(1)), x, k), k)); return n.length ? Math.min(...n) : 0; });
def('SUMPRODUCT', (a, x, k) => {
  const ms = a.map((v) => k.matrix(v));
  const h = ms[0].length, w = ms[0][0].length;
  if (ms.some((m) => m.length !== h || m[0].length !== w)) throw E['#VALUE!'];
  let s = 0;
  for (let i = 0; i < h; i++) for (let j = 0; j < w; j++) {
    let p = 1;
    for (const m of ms) {
      const v = m[i][j];
      if (isErr(v)) throw v;
      p *= typeof v === 'number' ? v : typeof v === 'boolean' && ms.length === 1 ? 0 : typeof v === 'boolean' ? Number(v) : 0;
    }
    s += p;
  }
  return s;
});
const SUBTOTAL_FN = ['AVERAGE', 'COUNT', 'COUNTA', 'MAX', 'MIN', 'PRODUCT', 'STDEV', 'STDEVP', 'SUM', 'VAR', 'VARP'];
def('SUBTOTAL', (a, x, k) => {
  const code = toNum(k.arg(a[0], x)) % 100;
  const name = SUBTOTAL_FN[code - 1];
  if (!name) throw E['#VALUE!'];
  return FN[name](a.slice(1), x, k);
});

// Lógica (perezosas: solo se evalúa la rama necesaria)
def('IF', (a, x, k) => {
  if (!a.length) throw E['#VALUE!'];
  const c = k.arg(k.eval(a[0], x), x);
  if (toBool(c)) return a.length > 1 ? (a[1].t === 'empty' ? 0 : k.eval(a[1], x)) : true;
  return a.length > 2 ? (a[2].t === 'empty' ? 0 : k.eval(a[2], x)) : false;
}, true);
def('IFS', (a, x, k) => {
  for (let i = 0; i + 1 < a.length; i += 2) if (toBool(k.arg(k.eval(a[i], x), x))) return k.eval(a[i + 1], x);
  throw E['#N/A'];
}, true);
def('IFERROR', (a, x, k) => {
  try { const v = k.scalar(k.eval(a[0], x), x); if (!isErr(v)) return v ?? 0; } catch (e) { if (!isErr(e)) throw e; }
  return a[1] ? k.eval(a[1], x) : '';
}, true);
def('IFNA', (a, x, k) => {
  try { const v = k.scalar(k.eval(a[0], x), x); if (!(isErr(v) && v.e === '#N/A')) return v ?? 0; } catch (e) { if (!isErr(e) || e.e !== '#N/A') throw e; }
  return a[1] ? k.eval(a[1], x) : '';
}, true);
const bools = (a, k) => {
  const out = [];
  for (const v of a) {
    if (v instanceof Rng || (v && v.arr)) k.each(v, (y) => { if (isErr(y)) throw y; if (typeof y === 'number' || typeof y === 'boolean') out.push(!!y); });
    else out.push(toBool(v));
  }
  if (!out.length) throw E['#VALUE!'];
  return out;
};
def('AND', (a, x, k) => bools(a, k).every(Boolean));
def('OR', (a, x, k) => bools(a, k).some(Boolean));
def('XOR', (a, x, k) => bools(a, k).filter(Boolean).length % 2 === 1);
def('NOT', sc((v) => !toBool(v)));
def('TRUE', () => true);
def('FALSE', () => false);
def('NA', () => { throw E['#N/A']; });
def('SWITCH', (a, x, k) => {
  const v = k.arg(k.eval(a[0], x), x);
  for (let i = 1; i + 1 < a.length; i += 2) if (compareValues(v, k.arg(k.eval(a[i], x), x)) === 0) return k.eval(a[i + 1], x);
  if (a.length % 2 === 0) return k.eval(a[a.length - 1], x);
  throw E['#N/A'];
}, true);
def('CHOOSE', (a, x, k) => {
  const i = Math.trunc(toNum(k.arg(k.eval(a[0], x), x)));
  if (i < 1 || i >= a.length) throw E['#VALUE!'];
  return k.eval(a[i], x);
}, true);
const probe = (fn) => (a, x, k) => { let v; try { v = k.scalar(k.eval(a[0], x), x); } catch (e) { if (!isErr(e)) throw e; v = e; } return fn(v); };
def('ISBLANK', probe((v) => v === undefined), true);
def('ISNUMBER', probe((v) => typeof v === 'number'), true);
def('ISTEXT', probe((v) => typeof v === 'string'), true);
def('ISNONTEXT', probe((v) => typeof v !== 'string'), true);
def('ISLOGICAL', probe((v) => typeof v === 'boolean'), true);
def('ISERROR', probe(isErr), true);
def('ISERR', probe((v) => isErr(v) && v.e !== '#N/A'), true);
def('ISNA', probe((v) => isErr(v) && v.e === '#N/A'), true);
def('ISEVEN', sc((v) => Math.trunc(toNum(v)) % 2 === 0));
def('ISODD', sc((v) => Math.trunc(toNum(v)) % 2 !== 0));

// Texto
def('CONCAT CONCATENATE', (a, x, k) => { let s = ''; for (const v of a) k.each(v, (y) => { s += toStr(y); }); return s; });
def('TEXTJOIN', (a, x, k) => {
  const sep = toStr(k.arg(a[0], x)), skip = toBool(k.arg(a[1], x)), out = [];
  for (const v of a.slice(2)) {
    const items = v instanceof Rng ? k.matrix(v).flat() : v && v.arr ? v.arr.flat() : [v];
    items.forEach((y) => { const s = toStr(y); if (s !== '' || !skip) out.push(s); });
  }
  return out.join(sep);
});
const count = (v) => { const n = Math.trunc(toNum(v)); if (n < 0) throw E['#VALUE!']; return n; };
def('LEFT', sc((s, n = 1) => toStr(s).slice(0, count(n))));
def('RIGHT', sc((s, n = 1) => { const t = toStr(s), c = count(n); return c ? t.slice(-c) : ''; }));
def('MID', sc((s, p, n) => { const i = Math.trunc(toNum(p)); if (i < 1) throw E['#VALUE!']; return toStr(s).substr(i - 1, count(n)); }));
def('LEN', sc((s) => toStr(s).length));
def('UPPER', sc((s) => toStr(s).toLocaleUpperCase('es')));
def('LOWER', sc((s) => toStr(s).toLocaleLowerCase('es')));
def('PROPER', sc((s) => toStr(s).toLocaleLowerCase('es').replace(/(^|[^\p{L}])(\p{L})/gu, (m, a, b) => a + b.toLocaleUpperCase('es'))));
def('TRIM', sc((s) => toStr(s).trim().replace(/ +/g, ' ')));
def('SUBSTITUTE', sc((s, a, b, n) => {
  const t = toStr(s), f = toStr(a), r = toStr(b);
  if (!f) return t;
  if (n === undefined) return t.split(f).join(r);
  let i = -1;
  for (let c = 0; c < toNum(n); c++) { i = t.indexOf(f, i + 1); if (i < 0) return t; }
  return t.slice(0, i) + r + t.slice(i + f.length);
}));
def('REPLACE', sc((s, p, n, r) => { const t = toStr(s), i = Math.trunc(toNum(p)) - 1; return t.slice(0, i) + toStr(r) + t.slice(i + count(n)); }));
const finder = (ci, wild) => (s, t, p = 1) => {
  let a = toStr(s), b = toStr(t);
  const from = Math.trunc(toNum(p)) - 1;
  if (ci) { a = a.toLowerCase(); b = b.toLowerCase(); }
  if (wild && /[*?]/.test(a)) {
    const re = new RegExp(a.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.'));
    const m = re.exec(b.slice(from));
    if (!m) throw E['#VALUE!'];
    return m.index + from + 1;
  }
  const i = b.indexOf(a, from);
  if (i < 0) throw E['#VALUE!'];
  return i + 1;
};
def('FIND', sc(finder(false, false)));
def('SEARCH', sc(finder(true, true)));
def('REPT', sc((s, n) => toStr(s).repeat(count(n))));
def('EXACT', sc((a, b) => toStr(a) === toStr(b)));
def('CHAR', sc((n) => String.fromCharCode(toNum(n))));
def('CODE', sc((s) => { const t = toStr(s); if (!t) throw E['#VALUE!']; return t.charCodeAt(0); }));
def('VALUE', sc((s) => toNum(s)));
def('TEXT', sc((v, f) => {
  if (typeof v === 'string' && typeof parseInput(v).v !== 'number') return v;
  return formatNumber(toNum(v), localFormat(toStr(f))).text;
}));
// El formato de TEXTO se escribe en español: aaaa por año y «0,00» con coma decimal
function localFormat(f) {
  let s = f.replace(/a(?=a|\b)/gi, (m) => (m === 'a' ? 'y' : 'Y'));
  const isDate = /[dmyhs]/i.test(s.replace(/"[^"]*"/g, ''));
  if (!isDate) {
    const c = s.lastIndexOf(','), d = s.lastIndexOf('.');
    if (c > d) { const tail = /,([0#?]*)/.exec(s.slice(c))?.[1] ?? ''; if (d >= 0 || tail.length !== 3) s = s.replace(/[.,]/g, (m) => (m === ',' ? '.' : ',')); }
  }
  return s;
}

// Fechas
const dateArg = (v) => { const n = toNum(v); if (n < 0) throw E['#NUM!']; return dateFromSerial(n); };
def('TODAY', () => todaySerial());
def('NOW', () => { const n = new Date(); return todaySerial() + (n.getHours() * 3600 + n.getMinutes() * 60 + n.getSeconds()) / 86400; });
def('DATE', sc((y, m, d) => { let Y = Math.trunc(toNum(y)); if (Y < 1900) Y += 1900; return serialFromDate(Y, Math.trunc(toNum(m)), Math.trunc(toNum(d))); }));
def('TIME', sc((h, m, s) => (toNum(h) * 3600 + toNum(m) * 60 + toNum(s)) / 86400));
def('YEAR', sc((v) => dateArg(v).y));
def('MONTH', sc((v) => dateArg(v).m));
def('DAY', sc((v) => dateArg(v).d));
def('HOUR', sc((v) => timeFromSerial(toNum(v)).h));
def('MINUTE', sc((v) => timeFromSerial(toNum(v)).i));
def('SECOND', sc((v) => timeFromSerial(toNum(v)).s));
def('WEEKDAY', sc((v, t = 1) => {
  const w = dateArg(v).wd, T = toNum(t); // 0 = domingo
  if (T === 1) return w + 1;
  if (T === 2) return ((w + 6) % 7) + 1;
  if (T === 3) return (w + 6) % 7;
  throw E['#NUM!'];
}));
def('WEEKNUM', sc((v, t = 1) => {
  const n = toNum(v), d = dateFromSerial(n), first = serialFromDate(d.y, 1, 1);
  const start = toNum(t) === 2 ? 1 : 0;
  const offset = (dateFromSerial(first).wd - start + 7) % 7;
  return Math.floor((Math.floor(n) - first + offset) / 7) + 1;
}));
def('DAYS', sc((a, b) => Math.floor(toNum(a)) - Math.floor(toNum(b))));
const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
def('EDATE', sc((v, m) => { const d = dateArg(v), t = d.y * 12 + d.m - 1 + Math.trunc(toNum(m)), Y = Math.floor(t / 12), M = t % 12 + 1; return serialFromDate(Y, M, Math.min(d.d, lastDay(Y, M))); }));
def('EOMONTH', sc((v, m) => { const d = dateArg(v), t = d.y * 12 + d.m - 1 + Math.trunc(toNum(m)), Y = Math.floor(t / 12), M = t % 12 + 1; return serialFromDate(Y, M, lastDay(Y, M)); }));
def('DATEDIF', sc((a, b, u) => {
  const s = Math.floor(toNum(a)), e = Math.floor(toNum(b));
  if (s > e) throw E['#NUM!'];
  const p = dateFromSerial(s), q = dateFromSerial(e), U = toStr(u).toUpperCase();
  let mths = (q.y - p.y) * 12 + q.m - p.m;
  if (q.d < p.d) mths--;
  if (U === 'D') return e - s;
  if (U === 'M') return mths;
  if (U === 'Y') return Math.floor(mths / 12);
  if (U === 'YM') return mths % 12;
  if (U === 'MD') return q.d >= p.d ? q.d - p.d : q.d + lastDay(q.y, q.m - 1) - p.d;
  if (U === 'YD') { const y = q.m > p.m || (q.m === p.m && q.d >= p.d) ? q.y : q.y - 1; return e - serialFromDate(y, p.m, p.d); }
  throw E['#NUM!'];
}));
const holidays = (v, k) => new Set(v === undefined ? [] : k.numbers([v]).map(Math.floor));
const isWork = (n, h) => { const w = dateFromSerial(n).wd; return w !== 0 && w !== 6 && !h.has(n); };
def('NETWORKDAYS', (a, x, k) => {
  let s = Math.floor(toNum(k.arg(a[0], x))), e = Math.floor(toNum(k.arg(a[1], x)));
  const h = holidays(a[2], k), sign = s > e ? -1 : 1;
  if (s > e) [s, e] = [e, s];
  let n = 0;
  for (let d = s; d <= e; d++) if (isWork(d, h)) n++;
  return n * sign;
});
def('WORKDAY', (a, x, k) => {
  let d = Math.floor(toNum(k.arg(a[0], x))), n = Math.trunc(toNum(k.arg(a[1], x)));
  const h = holidays(a[2], k), step = n < 0 ? -1 : 1;
  while (n) { d += step; if (isWork(d, h)) n -= step; }
  return d;
});

// Búsqueda
function findIn(list, key, mode) { // mode 0 exacta, 1 mayor valor ≤, -1 menor valor ≥ (lista ordenada)
  if (mode === 0) {
    const t = criterionExact(key);
    for (let i = 0; i < list.length; i++) if (t(list[i])) return i;
    return -1;
  }
  let best = -1;
  for (let i = 0; i < list.length; i++) {
    const v = list[i];
    if (v === undefined || typeRank(v) !== typeRank(key)) continue;
    const c = compareValues(v, key);
    if (mode > 0 ? c <= 0 : c >= 0) best = i;
    else break;
  }
  return best;
}
const criterionExact = (key) => (typeof key === 'string' && /[*?]/.test(key) ? criterion(key) : (v) => v !== undefined && typeRank(v) === typeRank(key) && compareValues(v, key) === 0);
const line = (v, k) => { const m = k.matrix(v); return m.length === 1 ? m[0] : m.map((r) => r[0]); };
def('VLOOKUP', (a, x, k) => {
  const key = k.arg(a[0], x), m = k.matrix(a[1]), col = Math.trunc(toNum(k.arg(a[2], x)));
  if (col < 1) throw E['#VALUE!'];
  const rng = a[1] instanceof Rng ? a[1] : null;
  if (col > (rng ? rng.cols : m[0].length)) throw E['#REF!'];
  const exact = a[3] !== undefined && !toBool(k.arg(a[3], x));
  const i = findIn(m.map((r) => r[0]), key, exact ? 0 : 1);
  if (i < 0) throw E['#N/A'];
  return m[i][col - 1];
});
def('HLOOKUP', (a, x, k) => {
  const key = k.arg(a[0], x), m = k.matrix(a[1]), row = Math.trunc(toNum(k.arg(a[2], x)));
  if (row < 1) throw E['#VALUE!'];
  if (row > m.length) throw E['#REF!'];
  const exact = a[3] !== undefined && !toBool(k.arg(a[3], x));
  const i = findIn(m[0], key, exact ? 0 : 1);
  if (i < 0) throw E['#N/A'];
  return m[row - 1][i];
});
def('MATCH', (a, x, k) => {
  const key = k.arg(a[0], x), list = line(a[1], k), t = a[2] === undefined ? 1 : Math.sign(toNum(k.arg(a[2], x)));
  const i = findIn(list, key, t);
  if (i < 0) throw E['#N/A'];
  return i + 1;
});
def('LOOKUP', (a, x, k) => {
  const key = k.arg(a[0], x), list = line(a[1], k), res = a[2] !== undefined ? line(a[2], k) : list;
  const i = findIn(list, key, 1);
  if (i < 0) throw E['#N/A'];
  return res[i];
});
def('XLOOKUP', (a, x, k) => {
  const key = k.arg(a[0], x), list = line(a[1], k);
  const mode = a[4] === undefined ? 0 : toNum(k.arg(a[4], x));
  const rev = a[5] !== undefined && toNum(k.arg(a[5], x)) === -1;
  let i = -1;
  if (mode === 0 || mode === 2) {
    const t = criterionExact(key);
    if (rev) { for (let j = list.length - 1; j >= 0; j--) if (t(list[j])) { i = j; break; } } else i = list.findIndex(t);
  } else {
    let best = Infinity;
    list.forEach((v, j) => {
      if (v === undefined || typeRank(v) !== typeRank(key)) return;
      const c = compareValues(v, key);
      if (c === 0 && best !== 0) { best = 0; i = j; return; }
      if ((mode < 0 && c < 0) || (mode > 0 && c > 0)) { const d = Math.abs(typeof v === 'number' ? v - key : c); if (d < best) { best = d; i = j; } }
    });
  }
  if (i < 0) { if (a[3] !== undefined) return a[3]; throw E['#N/A']; }
  const ret = a[2];
  if (ret instanceof Rng) return ret.rows === 1 || (a[1] instanceof Rng && a[1].rows === 1 && a[1].cols > 1) ? new Rng(ret.si, ret.r1, ret.c1 + i, ret.r2, ret.c1 + i) : new Rng(ret.si, ret.r1 + i, ret.c1, ret.r1 + i, ret.c2);
  return line(ret, k)[i];
});
def('INDEX', (a, x, k) => {
  const src = a[0];
  let r = a[1] === undefined ? 0 : Math.trunc(toNum(k.arg(a[1], x)));
  let c = a[2] === undefined ? 0 : Math.trunc(toNum(k.arg(a[2], x)));
  const h = src instanceof Rng ? src.rows : k.matrix(src).length;
  const w = src instanceof Rng ? src.cols : k.matrix(src)[0].length;
  if (a.length === 2 && h === 1) { c = r; r = 1; }
  else if (a.length === 2 && w === 1) c = 1;
  if (r > h || c > w || r < 0 || c < 0) throw E['#REF!'];
  if (src instanceof Rng) {
    if (r && c) return new Rng(src.si, src.r1 + r - 1, src.c1 + c - 1, src.r1 + r - 1, src.c1 + c - 1);
    if (r) return new Rng(src.si, src.r1 + r - 1, src.c1, src.r1 + r - 1, src.c2);
    if (c) return new Rng(src.si, src.r1, src.c1 + c - 1, src.r2, src.c1 + c - 1);
    return src;
  }
  return k.matrix(src)[Math.max(r, 1) - 1][Math.max(c, 1) - 1];
});
def('ROW', (a, x) => (a[0] instanceof Rng ? a[0].r1 : x.r) + 1);
def('COLUMN', (a, x) => (a[0] instanceof Rng ? a[0].c1 : x.c) + 1);
def('ROWS', (a, x, k) => (a[0] instanceof Rng ? a[0].rows : k.matrix(a[0]).length));
def('COLUMNS', (a, x, k) => (a[0] instanceof Rng ? a[0].cols : k.matrix(a[0])[0].length));
def('OFFSET', (a, x, k) => {
  const b = a[0];
  if (!(b instanceof Rng)) throw E['#VALUE!'];
  const dr = Math.trunc(toNum(k.arg(a[1], x))), dc = Math.trunc(toNum(k.arg(a[2], x)));
  const h = a[3] === undefined ? b.rows : Math.trunc(toNum(k.arg(a[3], x))), w = a[4] === undefined ? b.cols : Math.trunc(toNum(k.arg(a[4], x)));
  const r1 = b.r1 + dr, c1 = b.c1 + dc;
  if (r1 < 0 || c1 < 0 || h < 1 || w < 1) throw E['#REF!'];
  return new Rng(b.si, r1, c1, r1 + h - 1, c1 + w - 1);
});
def('INDIRECT', (a, x, k) => {
  const ast = parseFormula(toStr(k.arg(a[0], x)).trim());
  if (!ast || ast.t !== 'ref') throw E['#REF!'];
  return k.refRange(ast, x);
});

// Financieras
const pmtOf = (r, n, pv, fv = 0, type = 0) => {
  if (r === 0) return -(pv + fv) / n;
  const f = (1 + r) ** n;
  return -(pv * f + fv) * r / ((f - 1) * (1 + r * type));
};
const fvOf = (r, n, p, pv = 0, type = 0) => (r === 0 ? -(pv + p * n) : -(pv * (1 + r) ** n + p * (1 + r * type) * ((1 + r) ** n - 1) / r));
const numsOf = (fn) => sc((...a) => { const r = fn(...a.map((v) => (v === undefined ? undefined : toNum(v)))); if (!Number.isFinite(r)) throw E['#NUM!']; return r; });
def('PMT', numsOf(pmtOf));
def('FV', numsOf(fvOf));
def('PV', numsOf((r, n, p, fv = 0, type = 0) => (r === 0 ? -(fv + p * n) : -(fv + p * (1 + r * type) * ((1 + r) ** n - 1) / r) / (1 + r) ** n)));
def('NPER', numsOf((r, p, pv, fv = 0, type = 0) => {
  if (r === 0) return -(pv + fv) / p;
  const a = p * (1 + r * type) / r;
  return Math.log((a - fv) / (a + pv)) / Math.log(1 + r);
}));
const ipmtOf = (r, per, n, pv, fv = 0, type = 0) => {
  const p = pmtOf(r, n, pv, fv, type);
  if (per === 1 && type === 1) return 0;
  const bal = fvOf(r, per - 1, p, pv, type);
  const i = bal * r;
  return type === 1 ? i / (1 + r) : i;
};
def('IPMT', numsOf(ipmtOf));
def('PPMT', numsOf((r, per, n, pv, fv = 0, type = 0) => pmtOf(r, n, pv, fv, type) - ipmtOf(r, per, n, pv, fv, type)));
def('NPV', (a, x, k) => { const r = toNum(k.arg(a[0], x)); return k.numbers(a.slice(1)).reduce((s, v, i) => s + v / (1 + r) ** (i + 1), 0); });
function solve(f, guess) {
  let x = guess;
  for (let i = 0; i < 200; i++) {
    const y = f(x), d = (f(x + 1e-6) - y) / 1e-6;
    if (!Number.isFinite(y) || !d) break;
    const nx = x - y / d;
    if (Math.abs(nx - x) < 1e-10) return nx;
    x = nx <= -1 ? (x - 1) / 2 : nx;
  }
  throw E['#NUM!'];
}
def('IRR', (a, x, k) => {
  const n = k.numbers([a[0]]);
  if (!n.some((v) => v > 0) || !n.some((v) => v < 0)) throw E['#NUM!'];
  return solve((r) => n.reduce((s, v, i) => s + v / (1 + r) ** i, 0), a[1] === undefined ? 0.1 : toNum(k.arg(a[1], x)));
});
def('RATE', numsOf((n, p, pv, fv = 0, type = 0, guess = 0.1) => solve((r) => {
  if (Math.abs(r) < 1e-12) return pv + p * n + fv;
  const f = (1 + r) ** n;
  return pv * f + p * (1 + r * type) * (f - 1) / r + fv;
}, guess)));

// ---------- Formatos de número ----------
const MONTH_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DAY_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const BUILTIN_FMT = {
  0: 'General', 1: '0', 2: '0.00', 3: '#,##0', 4: '#,##0.00', 9: '0%', 10: '0.00%', 11: '0.00E+00', 12: '# ?/?', 13: '# ??/??', 14: 'dd/mm/yyyy',
  15: 'd-mmm-yy', 16: 'd-mmm', 17: 'mmm-yy', 18: 'h:mm AM/PM', 19: 'h:mm:ss AM/PM', 20: 'h:mm', 21: 'h:mm:ss', 22: 'dd/mm/yyyy h:mm',
  37: '#,##0;-#,##0', 38: '#,##0;[Red]-#,##0', 39: '#,##0.00;-#,##0.00', 40: '#,##0.00;[Red]-#,##0.00', 45: 'mm:ss', 46: '[h]:mm:ss', 47: 'mm:ss.0', 48: '##0.0E+0', 49: '@',
};
const COLOR_NAMES = { red: '#d92c2c', blue: '#2563eb', green: '#16a34a', yellow: '#ca8a04', magenta: '#c026d3', cyan: '#0891b2', black: '#000000', white: '#ffffff' };

function generalNumber(n) {
  if (!Number.isFinite(n)) return '#¡NUM!';
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 1e11 || abs < 1e-9) return n.toExponential(5).replace(/\.?0+e/, 'e').replace('e+', 'E+').replace('e-', 'E-').replace('.', ',');
  return String(Number(n.toPrecision(11))).replace('.', ',');
}
const fmtCache = new Map();
function compileFormat(fmt) {
  let c = fmtCache.get(fmt);
  if (c) return c;
  const sections = [];
  let cur = '', q = false, br = false;
  for (let i = 0; i < fmt.length; i++) {
    const ch = fmt[i];
    if (ch === '"') q = !q;
    else if (ch === '\\' && !q) { cur += ch + (fmt[++i] ?? ''); continue; }
    else if (!q && ch === '[') br = true;
    else if (!q && ch === ']') br = false;
    if (ch === ';' && !q && !br) { sections.push(cur); cur = ''; } else cur += ch;
  }
  sections.push(cur);
  c = sections.map(compileSection);
  fmtCache.set(fmt, c);
  return c;
}
function compileSection(src) {
  const sec = { toks: [], color: null, cond: null, date: false, elapsed: false, text: false };
  let s = src;
  s = s.replace(/\[([^\]]*)\]/g, (m, inner) => {
    const low = inner.toLowerCase();
    if (COLOR_NAMES[low]) { sec.color = COLOR_NAMES[low]; return ''; }
    const cond = /^(<=|>=|<>|<|>|=)\s*(-?[\d.]+)$/.exec(inner);
    if (cond) { sec.cond = [cond[1], Number(cond[2])]; return ''; }
    if (/^h+$|^m+$|^s+$/.test(low)) { sec.elapsed = true; return `\u0001${low}\u0001`; }
    if (inner.startsWith('$')) { const cur = inner.slice(1).split('-')[0]; return cur ? `"${cur}"` : ''; }
    return '';
  });
  // Tokens: literales y grupos de marcadores
  const toks = [];
  const lit = (t) => { if (toks.length && toks.at(-1).k === 'lit') toks.at(-1).v += t; else toks.push({ k: 'lit', v: t }); };
  for (let i = 0; i < s.length;) {
    const ch = s[i];
    if (ch === '"') { const j = s.indexOf('"', i + 1); lit(s.slice(i + 1, j < 0 ? undefined : j)); i = j < 0 ? s.length : j + 1; continue; }
    if (ch === '\\') { lit(s[i + 1] ?? ''); i += 2; continue; }
    if (ch === '_') { lit(' '); i += 2; continue; }
    if (ch === '*') { i += 2; continue; }
    if (ch === '\u0001') { const j = s.indexOf('\u0001', i + 1); toks.push({ k: 'el', v: s.slice(i + 1, j) }); i = j + 1; continue; }
    if (ch === '@') { toks.push({ k: 'at' }); sec.text = true; i++; continue; }
    const am = /^(AM\/PM|A\/P)/i.exec(s.slice(i));
    if (am) { toks.push({ k: 'ampm', v: am[0] }); sec.date = true; i += am[0].length; continue; }
    const dm = /^(y+|m+|d+|h+|s+|e+)/i.exec(s.slice(i));
    if (dm && !(dm[1][0].toLowerCase() === 'e' && /^E[+-]/.test(s.slice(i)))) {
      toks.push({ k: 'dt', v: dm[1].toLowerCase() }); sec.date = true; i += dm[0].length; continue;
    }
    if (/[0#?.,%]/.test(ch) || /^E[+-]/.test(s.slice(i))) {
      const m = /^(?:[0#?.,%/ ]|E[+-])+/.exec(s.slice(i));
      let t = m[0];
      const trail = /( +)$/.exec(t); // los espacios finales son literales
      if (trail) t = t.slice(0, -trail[1].length);
      toks.push({ k: 'num', v: t });
      i += t.length;
      continue;
    }
    lit(ch);
    i++;
  }
  sec.toks = toks;
  // En una fecha, los puntos y ceros tras los segundos son fracción; aquí basta tratarlos como literal
  return sec;
}
const pad = (n, w) => String(n).padStart(w, '0');
function renderDate(sec, v) {
  const d = dateFromSerial(v), t = timeFromSerial(v), ampm = sec.toks.some((x) => x.k === 'ampm');
  let out = '';
  sec.toks.forEach((tk, i) => {
    if (tk.k === 'lit') { out += tk.v; return; }
    if (tk.k === 'num') { out += tk.v === '.0' ? '.0' : tk.v; return; }
    if (tk.k === 'ampm') { out += t.h < 12 ? 'a. m.' : 'p. m.'; return; }
    if (tk.k === 'el') { const tot = Math.floor(v * 86400 + 1e-6); out += pad(tk.v[0] === 'h' ? Math.floor(tot / 3600) : tk.v[0] === 'm' ? Math.floor(tot / 60) : tot, tk.v.length); return; }
    if (tk.k !== 'dt') return;
    const n = tk.v.length;
    switch (tk.v[0]) {
      case 'y': case 'e': out += n <= 2 && tk.v[0] === 'y' ? pad(d.y % 100, 2) : d.y; break;
      case 'd': out += n === 1 ? d.d : n === 2 ? pad(d.d, 2) : n === 3 ? DAY_ES[d.wd].slice(0, 3) : DAY_ES[d.wd]; break;
      case 'h': { const h = ampm ? (t.h % 12 || 12) : t.h; out += n === 1 ? h : pad(h, 2); break; }
      case 's': out += n === 1 ? t.s : pad(t.s, 2); break;
      case 'm': {
        const dts = sec.toks.filter((x) => x.k === 'dt' || x.k === 'el');
        const at = dts.indexOf(tk), prev = dts[at - 1]?.v[0], next = dts[at + 1]?.v[0];
        if (n <= 2 && (prev === 'h' || next === 's')) out += n === 1 ? t.i : pad(t.i, 2);
        else out += n === 1 ? d.m : n === 2 ? pad(d.m, 2) : n === 3 ? MONTH_ES[d.m - 1].slice(0, 3) : n === 5 ? MONTH_ES[d.m - 1][0] : MONTH_ES[d.m - 1];
        break;
      }
      default:
    }
    void i;
  });
  return out;
}
function digitsInto(pattern, digits, thousands) {
  // pattern solo con 0 # ?; rellena de derecha a izquierda
  let out = '', i = digits.length - 1, placed = 0;
  const marks = pattern.replace(/[^0#?]/g, '');
  const put = (ch) => {
    if (thousands && placed && placed % 3 === 0 && ch !== ' ' && ch !== '') out = `.${out}`;
    out = ch + out;
    placed++;
  };
  for (let j = marks.length - 1; j >= 0; j--) {
    if (i >= 0) put(digits[i--]);
    else if (marks[j] === '0') put('0');
    else if (marks[j] === '?') out = ` ${out}`;
  }
  while (i >= 0) put(digits[i--]);
  return out;
}
function renderNumber(sec, abs) {
  let out = '';
  const pct = sec.toks.filter((t) => t.k === 'num' || t.k === 'lit').reduce((n, t) => n + (t.k === 'num' ? (t.v.match(/%/g) || []).length : 0), 0);
  let v = abs * 100 ** pct;
  const firstNum = sec.toks.findIndex((t) => t.k === 'num' && /[0#?]/.test(t.v));
  sec.toks.forEach((tk, idx) => {
    if (tk.k === 'lit') { out += tk.v; return; }
    if (tk.k !== 'num') return;
    if (idx !== firstNum) { out += tk.v.replace(/[0#?.,]/g, ''); return; }
    let p = tk.v;
    if (/\//.test(p)) { out += renderFraction(v, p); return; }
    const exp = /E[+-]/.exec(p);
    const [mant, expo] = exp ? [p.slice(0, exp.index), p.slice(exp.index + 2)] : [p, null];
    let body = mant;
    const tail = body.replace(/%/g, '').match(/,+$/);
    if (tail) v /= 1000 ** tail[0].length;
    body = body.replace(/,+(?=%*$)/, '');
    const dot = body.indexOf('.');
    const ip = dot < 0 ? body : body.slice(0, dot), dp = dot < 0 ? '' : body.slice(dot + 1);
    const dec = (dp.match(/[0#?]/g) || []).length;
    let ex = 0;
    if (expo !== null && v > 0) { ex = Math.floor(Math.log10(v)); v /= 10 ** ex; }
    let fixed = roundStr(v, dec);
    if (expo !== null && fixed.startsWith('10')) { ex++; fixed = roundStr(v / 10, dec); }
    let [I, D = ''] = fixed.split('.');
    if (I === '0' && !/0/.test(ip)) I = '';
    let txt = digitsInto(ip, I, /,/.test(ip));
    if (dec) {
      const marks = dp.replace(/[^0#?]/g, '');
      let last = D.length;
      while (last > 0 && D[last - 1] === '0' && marks[last - 1] !== '0') last--;
      D = D.slice(0, last);
      txt += (D || /0/.test(marks) ? ',' : '') + D;
    }
    out += txt;
    if (expo !== null) out += `E${ex < 0 ? '-' : exp[0][1] === '+' ? '+' : ''}${pad(Math.abs(ex), (expo.match(/0/g) || []).length)}`;
    out += '%'.repeat((tk.v.match(/%/g) || []).length);
  });
  return out;
}
function roundStr(v, dec) {
  const f = Number(`${Math.round(Number(`${v}e${dec}`))}e-${dec}`);
  return (Number.isFinite(f) ? f : v).toFixed(dec);
}
function renderFraction(v, p) {
  const m = /^([#0?]*)\s*([#0?]+)\/([#0?\d]+)$/.exec(p.trim());
  if (!m) return String(v);
  const maxD = 10 ** (m[3].length) - 1;
  const whole = m[1] ? Math.floor(v) : 0, frac = v - whole;
  let bn = 0, bd = 1, err = frac;
  for (let d = 1; d <= maxD; d++) { const n = Math.round(frac * d), e = Math.abs(frac - n / d); if (e < err - 1e-12) { err = e; bn = n; bd = d; } }
  if (bn === bd) return String(whole + 1);
  if (!bn) return String(whole);
  return `${whole ? `${whole} ` : ''}${bn}/${bd}`;
}
function pickSection(secs, v) {
  const test = (s) => s.cond && { '<': v < s.cond[1], '<=': v <= s.cond[1], '>': v > s.cond[1], '>=': v >= s.cond[1], '=': v === s.cond[1], '<>': v !== s.cond[1] }[s.cond[0]];
  if (secs.some((s) => s.cond)) {
    for (const s of secs) if (s.cond && test(s)) return { sec: s, neg: v < 0 };
    return { sec: secs.find((s) => !s.cond) || secs[0], neg: v < 0 };
  }
  if (secs.length === 1 || secs[0].text) return { sec: secs[0], neg: v < 0 };
  if (v > 0) return { sec: secs[0], neg: false };
  if (v < 0) return { sec: secs[1], neg: false };
  return { sec: secs[2] || secs[0], neg: false };
}
function formatNumber(v, fmt) {
  if (!fmt || /^general$/i.test(fmt)) return { text: generalNumber(v) };
  const { sec, neg } = pickSection(compileFormat(fmt), v);
  if (sec.toks.length === 1 && sec.toks[0].k === 'lit' && /^general$/i.test(sec.toks[0].v)) return { text: (neg ? '-' : '') + generalNumber(Math.abs(v)), color: sec.color };
  if (sec.date || sec.elapsed) {
    if (v < 0) return { text: '#'.repeat(8) };
    return { text: renderDate(sec, v), color: sec.color, date: true };
  }
  const body = renderNumber(sec, Math.abs(v));
  const isZero = !/[1-9]/.test(body);
  return { text: (neg && !isZero ? '-' : '') + body, color: sec.color };
}
function isDateFormat(fmt) {
  if (!fmt || /^general$/i.test(fmt)) return false;
  const s = compileFormat(fmt)[0];
  return s.date || s.elapsed;
}
// Texto que se ve en una casilla
function displayValue(v, fmt) {
  if (v === undefined || v === null) return { text: '' };
  if (typeof v === 'number') return formatNumber(v, fmt);
  if (typeof v === 'boolean') return { text: v ? 'VERDADERO' : 'FALSO' };
  if (isErr(v)) return { text: ERR_ES[v.e] || v.e, error: true };
  if (fmt && fmt.includes('@') && fmt !== '@') {
    const s = compileFormat(fmt).at(-1);
    if (s.text) return { text: s.toks.map((t) => (t.k === 'at' ? v : t.v ?? '')).join('') };
  }
  return { text: String(v) };
}
// Texto para editar una casilla
function editText(cell, fmt) {
  if (!cell) return '';
  if (cell.f !== undefined) return `=${toLocal(cell.f)}`;
  const v = cell.v;
  if (v === undefined) return '';
  if (typeof v === 'number') {
    if (isDateFormat(fmt)) {
      const d = dateFromSerial(v), t = timeFromSerial(v), whole = Math.floor(v);
      const date = `${pad(d.d, 2)}/${pad(d.m, 2)}/${d.y}`, time = `${pad(t.h, 2)}:${pad(t.i, 2)}${t.s ? `:${pad(t.s, 2)}` : ''}`;
      if (!whole) return time;
      return v > whole ? `${date} ${time}` : date;
    }
    if (fmt && fmt.includes('%')) return `${String(Number((v * 100).toPrecision(14))).replace('.', ',')}%`;
    return String(Number(v.toPrecision(15))).replace('.', ',');
  }
  if (typeof v === 'boolean') return v ? 'VERDADERO' : 'FALSO';
  if (isErr(v)) return ERR_ES[v.e] || v.e;
  return String(v);
}

// Lo que escribe el usuario → valor y, si procede, formato sugerido
function parseInput(raw) {
  const s = String(raw).trim();
  if (s === '') return { v: undefined };
  const up = s.toUpperCase();
  if (up === 'VERDADERO' || up === 'TRUE') return { v: true };
  if (up === 'FALSO' || up === 'FALSE') return { v: false };
  if (s[0] === '#' && ERR_EN[up]) return { v: errOf(ERR_EN[up]) };
  if (E[up]) return { v: E[up] };
  // Fechas: 31/12/2025, 31-12-25, 31/12 (año actual)
  let m = /^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}|\d{2}))?(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s);
  if (m) {
    const d = +m[1], mo = +m[2];
    let y = m[3] === undefined ? new Date().getFullYear() : +m[3];
    if (m[3]?.length === 2) y += y < 30 ? 2000 : 1900;
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= lastDay(y, mo)) {
      const time = m[4] !== undefined ? (+m[4] * 3600 + +m[5] * 60 + +(m[6] || 0)) / 86400 : 0;
      return { v: serialFromDate(y, mo, d) + time, nf: m[4] !== undefined ? 'dd/mm/yyyy hh:mm' : 'dd/mm/yyyy' };
    }
  }
  m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m && +m[2] >= 1 && +m[2] <= 12 && +m[3] >= 1 && +m[3] <= lastDay(+m[1], +m[2])) return { v: serialFromDate(+m[1], +m[2], +m[3]), nf: 'dd/mm/yyyy' };
  m = /^(\d{1,3}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (m && +m[2] < 60 && +(m[3] || 0) < 60) return { v: (+m[1] * 3600 + +m[2] * 60 + +(m[3] || 0)) / 86400, nf: m[3] ? 'hh:mm:ss' : 'hh:mm' };
  // Números: 1234 · 1234,5 · 1.234,56 · 12% · 12 € · 1e3
  m = /^([-+]?)(€\s*)?((?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d*)?|,\d+|\d+\.\d+)(?:[eE]([-+]?\d+))?\s*(%|€)?$/.exec(s);
  if (m && !(m[2] && m[5])) {
    let body = m[3];
    if (!/,/.test(body) && /^\d+\.\d+$/.test(body) && !/^\d{1,3}(\.\d{3})+$/.test(body)) { /* 3.5: punto decimal */ } else body = body.replace(/\./g, '').replace(',', '.');
    let v = Number(body) * (m[1] === '-' ? -1 : 1);
    if (m[4]) v *= 10 ** Number(m[4]);
    if (m[5] === '%') return { v: Number((v / 100).toPrecision(15)), nf: /,/.test(m[3]) ? '0.00%' : '0%' };
    if (m[2] || m[5] === '€') return { v, nf: '#,##0.00 "€"' };
    return { v };
  }
  return { v: s };
}
