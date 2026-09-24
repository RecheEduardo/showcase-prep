# Direção de arte — GoTicket Showcase (64 s, 120 BPM, 4K60)

Documento da Fase F1. Deriva uma gramática de motion própria do GoTicket a partir de referências públicas. **Princípios, nunca cópia**: nenhum asset, música, marca ou enquadramento de terceiros foi usado.

**Como a pesquisa foi feita (honestidade de fonte):** nenhum vídeo foi assistido ou baixado. As referências foram lidas como texto: transcrições oficiais da WWDC, posts de design, artigos de breakdown, páginas de produto e documentação. Onde só existe artigo sobre um vídeo, isso está dito na coluna "Fonte consultada". Pesquisa feita em 2026-09-23 por um subagente dedicado; limitações no fim do documento.

## 1. Referências

| # | Referência | URL | Fonte consultada | Princípio extraído | O que NÃO se aplica ao GoTicket |
|---|---|---|---|---|---|
| 1 | Apple WWDC18, "Designing Fluid Interfaces" | https://developer.apple.com/videos/play/wwdc2018/803/ | Página do vídeo com transcrição | Movimento contínuo, sem mudanças bruscas de direção; consistência espacial (o que sai por um lado volta pelo mesmo caminho); overshoot só com momentum | Rastreamento de toque 1:1 e latência de gesto (o vídeo não é interativo) |
| 2 | Apple WWDC23, "Animate with springs" | https://developer.apple.com/videos/play/wwdc2023/10158/ | Página do vídeo com transcrição | Spring definida por duração percebida + bounce; bounce 0 como padrão, ~15% "ágil", >40% exagerado; a spring preserva velocidade | API do SwiftUI e velocidade vinda de gesto real |
| 3 | Apple WWDC25, "Meet Liquid Glass" | https://developer.apple.com/videos/play/wwdc2025/219/ | Página do vídeo com transcrição | Vidro = lensing + brilho especular; sombra adaptativa; vidro só na camada flutuante, "evitar vidro sobre vidro" | Refração em tempo real e resposta ao sensor; não copiar o visual literal |
| 4 | Keynotes da Apple (artigo do 9to5mac sobre breakdown de Adam Grasso) | https://9to5mac.com/2023/06/21/apple-keynote-videos-transitions-and-editing/ | Artigo sobre um breakdown em vídeo (o vídeo não foi visto) | Match cuts e câmera que "atravessa" um objeto escondem o corte e simulam plano único | Live action, CGI de locações, apresentadores |
| 5 | Linear, "A Linear spin on Liquid Glass" | https://linear.app/now/linear-liquid-glass | Post de design | Vidro = blur + gradiente sutil + brilho de uma fonte de luz física; recusaram refração porque prejudica a leitura de UI densa | Shaders/SDF em tempo real, háptica |
| 6 | Linear, "How we redesigned the Linear UI (part II)" | https://linear.app/now/how-we-redesigned-the-linear-ui | Post de design | Menos cor na interface, mais contraste no texto; temas por luminosidade perceptual | O post não trata de motion; a fonte Inter não se aplica |
| 7 | Stripe, "Connect: behind the front-end experience" | https://stripe.com/blog/connect-front-end-experience | Post de design/engenharia | UI feita em código (não bitmap): animável e nítida em qualquer escala; curvas próprias guardadas como variáveis globais | Regra de <500 ms para UI web e `prefers-reduced-motion` |
| 8 | Vercel, site da conferência Ship | https://vercel.com/blog/designing-and-building-the-vercel-ship-conference-platform | Post de design (sobre o site, não o filme) | Seções em tela cheia com zoom controlado por um único valor de progresso; cabeçalho que se adapta a trechos claros/escuros | Scroll, performance web |
| 9 | Figma Config 2024 | https://www.figma.com/blog/config-2024-branding/ | Post de design | Princípios de motion com nome e uma biblioteca de partes intercambiáveis | Paletas múltiplas e supergráficos abstratos |
| 10 | Figma Config 2025 | https://www.figma.com/blog/how-we-shaped-the-visual-identity-for-config-2025/ | Post de design | Dois tratamentos tipográficos: expressivo (títulos/atos) e funcional (legendas rápidas); deixas de áudio no lugar de anúncios | Os 15 fps "feitos à mão" (o vídeo é liso a 60 fps) |
| 11 | Figma Config 2026 | https://www.figma.com/blog/the-visual-identity-behind-config-2026/ | Post de design | Elementos que "encadeiam, empilham e saem dos contêineres" | Estética de colagem solta |
| 12 | Spotify Wrapped 2025 (campanha e post da Rive) | https://newsroom.spotify.com/2025-12-03/wrapped-marketing-campaign/ · https://rive.app/blog/spotify-used-rive-for-spotify-wrapped-2025 | Página de imprensa e post técnico | Paleta reduzida, tipografia despojada; um único sistema de "card" recebe conteúdos e estados diferentes | Texturas analógicas, personalização por usuário |
| 13 | Spotify Wrapped 2023 (It's Nice That) | https://www.itsnicethat.com/features/spotify-wrapped-campaign-identity-2023-graphic-design-301123 | Artigo | Ênfase seletiva por camadas num layout fluido | "No grid, no rules", pixel retrô |
| 14 | Yonick Studio, conceito "Phone 3A Pro" (não oficial da Nothing) | https://motionographer.com/quickie/yonick-studio-nothing-phone-3a-pro-product-launch-concept/ | Artigo curto | Suspense: fragmentos antes do produto; tipografia como interrupção | Glitch/VHS, monocromático, esconder o produto por muito tempo |
| 15 | Galeria do Remotion | https://www.remotion.dev/showcase (lista lida no arquivo-fonte do repositório oficial) | Galeria (títulos/descrições) | Viabilidade: vídeos gerados por dados, promos com mockups de UI, visuais para música | Templates genéricos |
| 16 | Documentação do Remotion (TransitionSeries, CameraMotionBlur, spring) | https://www.remotion.dev/docs/transitions/transitionseries · https://www.remotion.dev/docs/motion-blur/camera-motion-blur | Documentação técnica | Transições sobrepõem cenas (encurtam o total); motion blur por amostragem com `shutterAngle` | — |
| 17 | moonb.io, kinetic typography | https://www.moonb.io/blog/kinetic-typography | Artigo (fonte secundária) | Uma frase por tela, muito espaço vazio; testar ritmo em "animatic cinza" antes da cor | Sincronia com voz (não há locução) |
| 18 | SVGator, exemplos de kinetic type | https://www.svgator.com/blog/50-kinetic-typography-examples/ | Artigo (fonte secundária) | Texto na batida ("snap, stack, pulse"); a frase precisa assentar num estado de repouso legível | Implementação SVG web |

## 2. Gramática de motion do GoTicket (12 regras)

1. **Grade rítmica.** Cortes estruturais no primeiro tempo do compasso (segundos pares); acentos na batida (30 f); reveals de texto em colcheia (15 f) ou múltiplos de 0,05 s alinhados a um cue. *(SVGator; Config 2025)*
2. **Todo impacto grande tem um cue no mesmo frame** (ver §5). *(regra do pacote 15 §2)*
3. **Entrada padrão:** subida de 24–70 px + fade em `expo.out`; saída em `expo.in`. Nada entra "do nada" sem direção. *(Apple WWDC18)*
4. **Overshoot só com momentum:** `back.out(1.4–1.6)` apenas em slams (logo), tiles e pops de tooltip; o resto é sem bounce. *(WWDC23)*
5. **Câmera nunca para seco:** sempre um drift residual (`sine.inOut`, escala 1,00→1,05 por compasso); mudança de direção só depois de desacelerar. *(WWDC18; keynotes Apple)*
6. **Mapa espacial fixo:** o fluxo de compra anda para a direita/baixo (vitrine → evento → fila → mapa → quantidade → portadores); o lado de quem organiza entra pela direita. *(WWDC18)*
7. **UI sempre em vetor, nunca screenshot ampliado.** Capturas só como textura de foto. Nitidez em 4K. *(Stripe Connect)*
8. **Vidro só na camada flutuante:** fundo gelo + blobs; placas de UI com brilho de cima (inset branco) e sombra azul; sem vidro sobre vidro. *(Liquid Glass; Linear)*
9. **Palavra por palavra, nunca letra por letra** — exceto a digitação de "Em 1 clique." (gesto real do produto). Máscaras com folga vertical para acentos PT-BR. *(moonb.io; SVGator)*
10. **Dois tratamentos de texto:** expressivo (títulos de ato 76–132 px, tracking negativo) e funcional (UI recriada, sem animação chamativa). *(Config 2025)*
11. **Um único sistema de "verbos"** reaproveitado em todas as cenas: *Surge* (placa sobe), *Focus* (push de câmera), *Flip* (virada), *Pulse* (anel/shine), *Invert* (navy↔gelo). *(Config 2024; Wrapped)*
12. **Suspense de 0 a 6 s:** só tipografia e fundo; a UI e a marca completa aparecem no DROP 1. *(conceito Yonick)*

**Regra técnica derivada (aprendida na produção):** um elemento animado pelo GSAP não recebe `translate/scale/rotate` do React. Tremores e transformações por frame ficam num wrapper interno (o GSAP incorpora essas propriedades ao cache de transformação).

## 3. Vocabulário de transições (5)

| # | Transição | Como funciona | Onde |
|---|---|---|---|
| T1 | **Whip-pan com motion blur** | Deslocamento de 1 tela em ~0,3–0,5 s com `expo.inOut`; o pico de velocidade (e o corte) cai no downbeat; `CameraMotionBlur` (14–16 amostras, 200°) só dentro da janela | C02 interno (8,0 / 10,0), C02→C03 (14,0), C06→C07 vertical (44,0), C07→C08 (48,0) |
| T2 | **Zoom-through em squircle** | O logo bate (slam) e sua forma squircle vira uma janela que cresce até cobrir o quadro, com a cena seguinte dentro | C01→C02 (6,0) |
| T3 | **Inversão navy→gelo por círculo** | Um círculo nasce do número da fila e revela a cena clara | C04→C05 (28,0) |
| T4 | **Push de câmera / expansão de cartão** | O elemento clicado cresce até preencher o quadro (C03→C04), ou a câmera mergulha num painel com crossfade de escala (C05→C06) | 20,0 e 38,0 |
| T5 | **Shockwave + flash (corte seco no impacto)** | Anel azul + flash branco decaindo, no frame do impacto | 6,0 · 28,0 · 44,0 · 48,0 · 56,0 |

Regra de alinhamento: toda janela de transição é centrada no início da cena seguinte (ponto médio = `start`). Implementado em `src/motion/transitions.tsx` (`TRANSITIONS`).

## 4. Cor

- **Dominante:** gelo `#f4f8fd/#e8f1fb/#dbe8f7` com blobs `#5fb0e6`/`#2a8fd4`; texto `--ink #0e2746`; destaque em gradiente de marca (`#5fb0e6 → #2a8fd4 → #1c6fb5`, variante documentada do deck).
- **UI recriada usa os tokens do app** (`#00334d`, CTA `#57c5f4 → #2959b9`, fundo `#fafeff`), amostrados das capturas. Tokens de marca nunca são aplicados por cima da UI do app (`14 §7`).
- **Cor pontual como ritmo:** tiles de categoria (10 gradientes reais), cores do mapa (turquesa/azul/magenta/índigo) e do editor; status laranja (Pendente/Aguardando) e verde (Aprovado), confirmados em `04-admin/02`.

## 5. Sincronia audiovisual

Todo impacto visual grande tem cue de áudio **no mesmo frame** (`frame = round(t × 60)`, amostra = `frame × 800`). A fonte única é `data/scene-timeline.json` → `scripts/sync-timeline.mjs` → `src/timeline.ts` (visual) e `src/data/cues.json` (áudio). Repetições (palavras, digitação, tiles, polígonos, ticks da fila, reveal final) são expandidas uma vez só e consumidas pelos dois lados; `scripts/verify.mjs` confere.

## 6. Contraste de tema — PROPOSTA (não é extração)

C04 (fila) em **navy `#0e2746`** para tensão, coerente com o cartão azul-escuro do slide 12 do deck; no **DROP 2 (28,0 s)** um círculo nasce do número da fila e **inverte para gelo**: luz → escuro → explosão de luz. É direção de arte proposta, não token do app.

## 7. Escala tipográfica do vídeo (Plus Jakarta Sans local, 200–800)

| Papel | px (canvas 1920×1080) | Peso | Tracking | Uso |
|---|---|---|---|---|
| Display | 132–230 | 800 | −0,045 a −0,05 em | "Seu ingresso aqui.", tagline C07, número da fila (itálico) |
| H1 | 104–112 | 800 | −0,04 em | Título do evento (C03) |
| H2 | 72–88 | 800 | −0,03 a −0,035 em | Títulos de ato (C02, C05, C06, C08, C09) |
| Lead | 56–64 | 700–800 | −0,02 a −0,03 em | Manchete da fila (C04) |
| Corpo UI | 17–40 | 500–800 | −0,02 em | UI recriada (escala 1,2–1,6× da real) |
| Eyebrow | 22 | 700 | +0,18 em, caixa alta | "TUDO QUE ROLA", "LIVE EXPERIENCE" |
| Rodapé | 21 | 500 | 0 | Nota de proveniência |

Salto de escala entre níveis adjacentes ≤ ~3× (ex.: H2 80 → corpo 30). Texto principal (títulos) ≥ 56 px. O eyebrow do deck (14 px) foi ampliado para 22 px: em vídeo, 14 px num canvas 1080p fica ilegível em telas pequenas (ver `DECISIONS.md`).

## Limitações da pesquisa

Nenhum vídeo assistido; descrições da Apple vêm de transcrições e de um artigo. `remotion.dev/showcase` renderiza via JS (lista lida no repositório). LBBOnline e Behance deram 403. Páginas de Motion das Apple HIG e alguns case studies não renderizaram. Raycast, Arc, Notion, Framer e Stripe Sessions: sem fonte primária sobre o motion dos vídeos — por isso não constam da tabela. moonb.io e SVGator são fontes secundárias (marketing).
