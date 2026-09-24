# Storyboard — GoTicket Showcase

Fase F2. Tempos em segundos absolutos (frame = t × 60). Labels entre crases são os do `data/scene-timeline.json`; todo texto de tela está em `src/copy.ts`. Proveniência por cena em `out/provenance.json`.

## C01 · Marca · 0–6 s · real+recreated · música: intro + riser
| t | Keyframe |
|---|---|
| 0,0 | Fundo gelo, blobs respirando (escala ±4 %, 2 s por ciclo). Nada mais: suspense. |
| 0,8 / 1,05 / 1,3 | `C01.title.enter`: "Seu" · "ingresso" · "aqui." sobem da máscara (132 px, ink), uma por tick. |
| 2,4–3,0 | Cursor de texto azul pisca na 2ª linha (colcheia). |
| 3,0–4,1 | `C01.type.start` → `C01.type.end`: "Em 1 clique." digitado caractere a caractere em gradiente de marca (1 key_tick por caractere). |
| 4,6 | `C01.type.confirm`: a linha dá um snap (1,06 → 1), sublinhado em gradiente varre, brilho atravessa o texto. |
| 5,0–5,9 / 5,9–6,0 | Tensão: bloco comprime (0,9), vinheta fecha, blobs aceleram para o centro. 5,9: tudo congela (6 frames, som mudo). |
| **6,0** | `C01.logo.slam`: logo 3D bate (2,3× → 1 com overshoot) + flash + shockwave. **Saída T2:** o squircle do logo vira janela (6,18–6,5) e revela a C02. |

## C02 · Vitrine · 6–14 s · real+recreated · DROP 1
| t | Keyframe |
|---|---|
| 6,2–6,5 | Carrossel da home recriado dentro do squircle: banner "Live Experience" (foto real da multidão como textura, sem data), pílula "a partir de R$ 60,00"; vizinhos esmaecidos. Eyebrow "TUDO QUE ROLA". |
| **8,0** | `C02.banner.swipe1`: whip-pan com motion blur → "Samba de Raiz · a partir de R$ 15,00". |
| **10,0** | `C02.banner.swipe2`: whip → "Aula de Yoga no Parque · a partir de R$ 10,00". |
| 10,45–11,0 | Câmera recua: carrossel encolhe e some; "Do show ao e-sports." / "Tudo num só lugar." (gradiente) sobem por palavra. |
| 11,0–13,25 | `C02.tiles.cascade.start`→`.end`: 10 categorias reais entram em cascata (1 blip pentatônico por tile, `back.out`). |
| 13,75 | **Saída T1:** whip-pan para a direita (C03 entra; corte em 14,0). |

## C03 · O evento · 14–20 s · real (textura) + recreated
| t | Keyframe |
|---|---|
| 14,0 | Banner full-bleed (multidão real), chrome passa a claro. "LIVE EXPERIENCE" + "A noite que / todo mundo quer." (108 px, branco). |
| **15,0** | `C03.camera.push`: push lento; a foto escala mais que o título (parallax). |
| 15,5–16,6 | Chips "Sábado, 12 de dezembro" · "14:00 - 20:00" · "Estádio, São Paulo"; painel "Ingressos" com 2 cartões de data sobe. |
| **18,0** | `C03.datecard.pulse`: 1º cartão pulsa + anel (ping). |
| **19,25** | `C03.datecard.click`: cursor clica (press + ripple). |
| 19,42–20,0 | **Saída T4:** o cartão clicado expande até a tela inteira e vira navy. |

## C04 · A fila · 20–28 s · **ILUSTRATIVA** · breakdown + stop-time
| t | Keyframe |
|---|---|
| **20,0** | `C04.dark.enter`: cartão de sala de espera (glass escuro) sobe; campo de 300 pontos (pessoas) acende. Chip "Sala de espera · Representação ilustrativa". |
| 20,25 | "Todo mundo quer o mesmo ingresso." por palavra. |
| **21,0** | `C04.counter.start`: "Sua posição na fila" 301 → cai em 60 ticks acelerando (0,22 s → 0,03 s); pontos se dissolvem; "Pessoas na fila" e "Espera estimada" (~4 min → menos de 1 min) acompanham. |
| 24,0–27,5 | Riser: câmera empurra (1 → 1,13), brilho do cartão cresce; 26,0 tremor sutil com o snare roll. |
| **27,5** | `C04.counter.hit1` / `C04.stoptime`: número "1" carimba em branco e **tudo congela** até 28,0 (áudio mudo). |
| **28,0** | `C04.admitted.reveal`: **Saída T3 + T5:** flash + shockwave; círculo nasce do número e inverte para gelo. |

## C05 · O estádio acende · 28–38 s · real+recreated · DROP 2
| t | Keyframe |
|---|---|
| 28,0–28,9 | "Chegou a sua vez." nasce grande no centro do círculo e aporta no topo; placa da seleção sobe; setores do mapa acendem em cascata (cinza → cor). |
| **29,0 / 29,1 / 29,6** | `C05.sector1.click` / `.fill` / `C05.tooltip1`: cursor clica **Pista Premium**; borda azul + "✓ Selecionado"; região escurece por varredura radial com brilho; tooltip "Pista Premium · 4500 disponíveis · A partir de R$ 175,00". |
| 30,0 | Título troca para "Escolha o seu setor.". Câmera avança devagar para o mapa. |
| **33,0 / 33,1 / 33,6** | `C05.sector2.*` / `C05.tooltip2`: **Cadeira Nível 1** (turquesa escuro); Pista Premium volta; tooltip "8000 disponíveis · A partir de R$ 90,00". |
| 34,0–35,95 | "Preço e disponibilidade, na hora."; câmera desce até o bloco de tipos (resto esmaece). |
| **36,0** | `C05.price.swap`: nome e preços viram (Pista Premium R$ 350,00 / R$ 175,00 → Cadeira Nível 1 R$ 180,00 / R$ 90,00). |
| 37,75 | **Saída T4:** zoom-cross para a C06. |

## C06 · Quantidade e total · 38–44 s · real+recreated
| t | Keyframe |
|---|---|
| **38,0** | `C06.counter.appear`: Inteira / Meia entrada / Solidária (LOTE 1) + "Veja o total crescer." |
| **39,0 / 40,0** | `C06.plus1` / `C06.plus2`: cursor clica "+"; contador rola 0 → 1 → 2. |
| **40,7** | `C06.total.card`: cartão TOTAL sobe; valor vira R$ 180,00 → **R$ 360,00 · 2 ingressos** (valor da captura `06/04`). |
| **42,5** | `C06.cta.shine`: "Continuar" brilha (varredura + glow). |
| 43,75 | **Saída T1:** whip vertical para cima. |

## C07 · Checkout relance · 44–48 s · real+recreated · micro-drop
| t | Keyframe |
|---|---|
| **44,0** | Impacto pequeno; "Dados dos portadores" + 2 blocos (INGRESSO 1/2 · Inteira). Nomes fictícios digitados; documentos **mascarados**. |
| **44,25** | `C07.card.slide`: cartão de resumo com foto entra pela direita — "Live Experience", data, "Estádio, São Paulo", "CADEIRA NÍVEL 1 · Inteira × 2 · 2 ingressos". **Sem totais.** |
| **46,0** | `C07.tagline`: blocos saem; "Pronto. / Só falta você." (132 px). |
| 47,75 | **Saída T1:** whip horizontal. |

## C08 · Quem organiza · 48–56 s · real(H04) + **ilustrativa (status)** · bass swap
| t | Keyframe |
|---|---|
| **48,0** | Bass swap. "Quem organiza / cria."; editor "Mapa de setores" recriado (lista de setores + mapa cinza com blocos tracejados). |
| **48,5 → 52,0** | `C08.polygons.start`→`.end`: 8 blocos acendem, 1 por pluck (Pista, Pista Premium, 3 blocos da Cadeira Superior, 3 da Cadeira Nível 1) com alças azuis; a Cadeira Nível 1 termina com os 17 vértices reais. |
| **52,0** | `C08.turn`: a placa vira (rotateY) e revela o quadro de status ilustrativo (chip ganha "Representação ilustrativa"). |
| **52,5 / 53,5** | `C08.card1.slide` / `.card2.slide`: "Live Experience" e "Expo Arte Digital" entram em "Aguardando aprovação" (Pendente, laranja). |
| **54,0** | `C08.approved`: "Live Experience" desliza para "Aprovado" (verde, ✓); título vira "A gente coloca / no ar.". |
| 54–56 | Riser: push no quadro; 55,0–55,9 tremor; 55,75 mergulho rápido. **Saída T5** em 56,0. |

## C09 · Fecho · 56–62 s · real+recreated · impacto final
| t | Keyframe |
|---|---|
| **56,0** | `C09.logo.slam`: lockup (logo 3D + "GoTicket") bate + flash + shockwave. |
| **56,5** | `C09.copy.reveal`: "E aí, acha que tá pronto / pra transformar seus eventos?" em 6 grupos (1 tick cada). |
| **58,0 / 58,1** | `C09.cta.shine`: "Criar conta" brilha; cursor clica (press). |
| **59,0** | `C09.footnote`: "Imagens ilustrativas. Eventos e valores fictícios de demonstração." |
| **60,0 / 61,0** | `C09.cta.pulse1` / `pulse2`: botão pulsa na batida (anel). 61,75: frase e botão saem. |

## TAIL · Cauda · 62–64 s · recreated
| t | Keyframe |
|---|---|
| **62,0** | `TAIL.ding`: match cut (mesmo lockup); brilho especular atravessa o logo; lockup desliza ao centro (1,3 s). |
| 62–64 | Nota de rodapé visível; cauda de reverb até 64,0. |
