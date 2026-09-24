// ─────────────────────────────────────────────────────────────────────────────────────────────
//  PACING — o ÚNICO lugar para controlar quanto tempo cada cena dura (em segundos).
//
//  Mude um número aqui e o vídeo inteiro se reorganiza sozinho: o início das cenas seguintes,
//  as transições, os flashes/shockwaves, os sons e a duração total são derivados desta tabela.
//
//  O ritmo INTERNO acompanha: cada cena foi animada numa duração de projeto (o valor padrão ao
//  lado) e o relógio da cena é esticado/comprimido na proporção `novo valor / padrão`. Todos os
//  pontos de ação (cliques, entradas de texto, cursor, molas, contagens, digitação, pop-outs)
//  se espalham pela nova duração. Ex.: C05 de 5 → 8 s deixa tudo 1,6× mais lento, sem sobrar
//  tempo parado no fim; C05 de 5 → 4 s deixa tudo 1,25× mais rápido.
//
//  Só as transições entre cenas (snap zoom, fade, inversão) mantêm a velocidade própria.
//  Frações são aceitas (ex.: 2.75). O vídeo roda a 60 fps, então o valor é arredondado ao frame.
// ─────────────────────────────────────────────────────────────────────────────────────────────

export const PACING = {
	C00: 5, //   Caos: sistema antigo travando e erros empilhando            (padrão 5)
	C01: 3, //   Marca: logo + "Seu ingresso aqui. Em 1 clique."              (padrão 3)
	C02: 3, //   Vitrine: categorias + "Tudo num só lugar."                   (padrão 3)
	C03: 2.5, // O evento: página do evento, clique na data                   (padrão 2.5)
	C04: 4, //   A fila: contagem 301 → 1                                     (padrão 4)
	C05: 5, //   O estádio: lista de setores + mapa, 2 cliques                (padrão 5)
	C06: 3, //   Quantidade e total                                           (padrão 3)
	C07: 3, //   Checkout: 2 portadores, um campo digitado por vez            (padrão 3)
	C08: 7.5, // Organizador: editor de setores + quadro, 2 aprovações        (padrão 7.5)
	C09: 4.5, // Fecho: frase + CTA, pop-out e logo final centralizado        (padrão 4.5)
} as const;
