// ─────────────────────────────────────────────────────────────────────────────────────────────
//  PACING — o ÚNICO lugar para controlar quanto tempo cada cena dura (em segundos).
//
//  Mude um número aqui e o vídeo inteiro se reorganiza sozinho: o início de todas as cenas
//  seguintes, as transições, os flashes/shockwaves, os cues de som e a duração total da
//  composição são derivados desta tabela (src/timeline.ts). Nada mais precisa ser editado.
//
//  Como funciona o tempo dentro de uma cena:
//  • Toda animação de uma cena é marcada em segundos A PARTIR DO INÍCIO DA CENA (tempo local).
//  • Aumentar a duração = mais tempo de leitura/respiro no fim da cena (a ação acontece no mesmo
//    ritmo e o quadro final segura por mais tempo antes da transição).
//  • Diminuir abaixo do "mínimo" corta a última ação da cena. O mínimo de cada cena está no
//    comentário ao lado (e `node scripts/verify.mjs` avisa se algum valor ficar abaixo dele).
//  • As ações que acontecem "no fim" (ex.: o card da C03 expandindo, o congelamento da C04, o
//    punch de câmera da C08) são ancoradas ao FIM da cena e acompanham a nova duração.
//
//  Frações são aceitas (ex.: 2.75). O vídeo roda a 60 fps, então o valor é arredondado ao frame.
// ─────────────────────────────────────────────────────────────────────────────────────────────

export const PACING = {
	C00: 5, //   Caos: sistema antigo travando e erros empilhando              (mínimo ≈ 4.9)
	C01: 3, //   Marca: logo + "Seu ingresso aqui. Em 1 clique."                (mínimo ≈ 2.0)
	C02: 3, //   Vitrine: categorias + "Tudo num só lugar."                     (mínimo ≈ 1.8)
	C03: 2.5, // O evento: página do evento, clique na data                     (mínimo ≈ 2.2)
	C04: 4, //   A fila: contagem 301 → 1                                       (mínimo ≈ 2.5)
	C05: 5, //   O estádio: lista de setores + mapa, 2 cliques                  (mínimo ≈ 4.2)
	C06: 3, //   Quantidade e total                                             (mínimo ≈ 2.4)
	C07: 5.5, // Checkout: 4 portadores digitados um a um, com som de teclas    (mínimo ≈ 4.8)
	C08: 7.5, // Organizador: editor de setores + quadro com 4 eventos, 2 aprovados (mínimo ≈ 6.4)
	C09: 4.5, // Fecho: frase + CTA, pop-out e logo final centralizado          (mínimo ≈ 3.6)
} as const;
