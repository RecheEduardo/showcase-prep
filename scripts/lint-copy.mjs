// Screen-copy linter (13-DO-NOT-SHOW §B, §C, §F; 10-SCRIPTING-INPUT §B).
// 1) Every string literal in src/copy.ts is checked for banned technical terms,
//    banned claims, 2025 dates, personal data patterns, third-party names and dashes.
// 2) .tsx files must not carry on-screen text of their own (all copy lives in copy.ts).
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const copyFile = path.join(root, 'src', 'copy.ts');
const src = fs.readFileSync(copyFile, 'utf8');

// §B — technical terms (word-ish boundaries, case-insensitive).
const TERMS = [
	'API', 'backend', 'back-end', 'frontend', 'front-end', 'banco de dados', 'servidor', 'Redis', 'cache', 'token', 'JWT',
	'autenticação', 'criptografia', 'idempotência', 'concorrência', 'overselling', 'escalabilidade', 'requisições',
	'requisição', 'backpressure', 'Stripe', 'gateway', 'Docker', 'S3', 'React', 'Java', 'Spring', 'Postgres', 'PostgreSQL',
	'testes de carga', 'teste de carga', 'k6', 'TCC', 'SVG', 'polígono', 'polígonos', 'Konva', 'polling', 'webhook',
	'endpoint', 'HTTP', 'JSON', 'deploy', 'fila de mensagens', 'estrutura de dados',
];
// §C — claims that must not be made.
const CLAIMS = [
	[/5[.,]0\b/, '"5.0" rating'],
	[/\b\d+\s*(avalia|reviews?)/i, 'review counts'],
	[/depoimento/i, 'testimonials'],
	[/gratuit/i, '"gratuita"'],
	[/sem mensalidade/i, '"sem mensalidade"'],
	[/sem taxa/i, '"sem taxas"'],
	[/taxas? competitiva/i, '"taxas competitivas"'],
	[/pagamento/i, 'payment claims'],
	[/\bpix\b/i, 'Pix'],
	[/cart[aã]o de cr[eé]dito|\bcart[aã]o\b/i, 'card payment'],
	[/\bQR\b|qr ?code/i, 'QR code'],
	[/check-?in/i, 'check-in'],
	[/compr\w*\s+em\s+1\s+clique/i, '"compra em 1 clique" as a flow claim'],
	[/escolh\w*\s+(a\s+)?(sua\s+)?cadeira/i, '"escolha sua cadeira" (the map is per sector)'],
	[/confirmad/i, '"confirmado" (no order was completed)'],
	[/tempo real/i, '"tempo real" metrics'],
	[/m[eé]tricas?/i, 'metrics'],
	[/liga\s+a\s+fila/i, '"o organizador liga a fila"'],
	[/em minutos|sem burocracia/i, 'unverified speed claims'],
	[/2025/, 'date in 2025'],
	[/\d{3}\.\d{3}\.\d{3}-\d{2}/, 'CPF-like number'],
	[/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/i, 'e-mail address'],
	[/allianz|nubank/i, 'third-party brand name'],
	[/—/, 'em dash'],
	[/\s–\s/, 'spaced en dash'],
	[/\/admin|\/evento\/|\bID\b|#\d+/, 'route or ID'],
];

const strings = [];
const re = /(['"`])((?:\\.|(?!\1).)*)\1/g;
let m;
while ((m = re.exec(src))) {
	const line = src.slice(0, m.index).split('\n').length;
	strings.push({s: m[2], line});
}

const problems = [];
for (const {s, line} of strings) {
	for (const term of TERMS) {
		const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		if (new RegExp(`(^|[^\\p{L}\\d])${esc}($|[^\\p{L}\\d])`, 'iu').test(s)) problems.push(`copy.ts:${line}  technical term "${term}"  in  "${s}"`);
	}
	for (const [rx, why] of CLAIMS) if (rx.test(s)) problems.push(`copy.ts:${line}  ${why}  in  "${s}"`);
}

// JSX text outside copy.ts: any run of 3+ letters between tags is flagged.
const walk = (dir, out = []) => {
	for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
		const p = path.join(dir, e.name);
		if (e.isDirectory()) walk(p, out);
		else if (e.name.endsWith('.tsx')) out.push(p);
	}
	return out;
};
for (const f of walk(path.join(root, 'src'))) {
	const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);
	lines.forEach((line, i) => {
		const code = line.replace(/\/\/.*$/, '').replace(/\{\/\*.*?\*\/\}/g, '');
		const jsxText = code.match(/[^=\s]\s*>([^<>{}]*[A-Za-zÀ-ÿ]{3,}[^<>{}]*)<(?=[/A-Za-z])/);
		if (jsxText && !/=>|\(|\)|&&|\?/.test(jsxText[1])) problems.push(`${path.relative(root, f)}:${i + 1}  on-screen text outside copy.ts: "${jsxText[1].trim()}"`);
	});
}

if (problems.length) {
	console.error(`lint-copy: ${problems.length} problem(s)`);
	for (const p of problems) console.error('  ' + p);
	process.exit(1);
}
console.log(`lint-copy: OK (${strings.length} strings in copy.ts checked)`);
