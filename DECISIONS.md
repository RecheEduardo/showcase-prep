# DECISIONS — GoTicket Showcase

Registro das decisões tomadas de forma autônoma (decisão · alternativas · motivo). Data: 2026-09-23.

## F0 — Ambiente e documentação lida

| # | Decisão | Alternativas | Motivo |
|---|---|---|---|
| D01 | Projeto criado à mão (`package.json` + `tsconfig` + `remotion.config.ts`), equivalente ao template *blank* TypeScript | `npx create-video@latest` | O scaffolder é interativo e exige pasta vazia; o resultado é o mesmo (Remotion 4.0.527 ≥ 4.0.517, todos os `@remotion/*` na mesma versão exata). |
| D02 | Dependências: `remotion`, `@remotion/cli`, `gsap`, `transitions`, `motion-blur`, `media`, `sfx`, `fonts`, `shapes`, `noise`, `layout-utils`; `gsap@3.15.0` exato | — | Lista do `prompt.md` F0. Nada foi adicionado ao `package.json` do app. `shapes`, `noise` e `layout-utils` ficaram instalados mas não foram necessários. |
| D03 | Skills oficiais instaladas (`npx skills add remotion-dev/skills`) e lidas: `remotion-best-practices` → `remotion-markup` (regras gerais, `transitions.md`, `sfx.md`, `local-fonts.md`) | WebFetch da documentação | As skills não cobrem GSAP; por isso o comportamento do `@remotion/gsap` foi confirmado **no código instalado** (D04) e na página `docs/gsap/use-gsap-timeline`. |
| D04 | **Resumo do `useGsapTimeline` (lido em `node_modules/@remotion/gsap/dist/esm/index.mjs`)**: cria uma timeline GSAP pausada dentro de `gsap.context` no `useLayoutEffect`; a cada frame chama `totalTime(0)` e depois `totalTime(frame / fps)`, onde `frame = useCurrentFrame()` — logo o tempo é **relativo à `<Sequence>`** que contém o componente. Bloqueia `play/seek/progress/timeScale`, callbacks (`onUpdate` etc.), `gsap.ticker`, `random()` do GSAP, `stagger: {from:'random'}` e tweens de objetos que não sejam DOM/SVG. Labels (`addLabel`) são permitidos. O pacote "ainda não suporta plugins GSAP" (doc). | Timeline manual com `seek` (fallback do prompt §11) | O pacote funciona e é determinístico; o fallback não foi necessário. Consequência de projeto: cada cena usa `useSceneTimeline` (`src/motion/scene.tsx`), que registra **todos os labels do JSON** com `addLabel(label, label − scene.start + lead)`. |
| D05 | **Resumo do `@remotion/sfx` (lido em `node_modules/@remotion/sfx/dist/index.d.ts`)**: exporta **URLs** de WAVs hospedados em `remotion.media` (`whoosh`, `whip`, `pageTurn`, `uiSwitch`, `mouseClick`, `shutterModern`, `shutterOld`, `ding`, e efeitos de meme). Pacote MIT; licença por efeito na página de cada um. Verificado: `whoosh` = 1bob, freesound.org/s/831936, **CC0**; `whip` = JW_Audio, freesound.org/s/838766, **CC0**. | Só SFX sintetizados | Usados só `whoosh` e `whip` (CC0), como camada de transiente sobre whoosh sintetizado (ver `audio/LICENSES.md`). Nenhum efeito de meme. |
| D06 | Fonte Plus Jakarta Sans baixada do repositório `google/fonts` (variável 200–800, normal e itálico, + `OFL.txt`) para `public/fonts/`; carregada com `@remotion/fonts` (`loadFont` usa `delayRender` internamente) | Google Fonts em tempo de render | Render sem internet (R7/R30). |
| D07 | Logo copiado de `goticket-frontend/public/goticket_logo.svg` (`public/brand/logo-app.svg`), usado com exclusividade | Recriar em SVG | Existe no repositório. **Revisão 35 s:** o símbolo 3D (`logo-3d.png`) foi removido do projeto; toda a marca usa o SVG 2D. |
| D08 | `GET http://localhost:8080/venues/2/sector-map` respondeu (somente leitura). Salvo em `public/maps/`. É uma imagem JPEG de 690×716 + 4 polígonos. **O mapa foi redesenhado em vetor usando os pontos reais dos polígonos** (`src/ui/mapGeometry.ts`) | Usar a imagem do backend | 690 px ampliados para 4K ficariam borrados (R32). As cores foram amostradas das capturas `06/02`, `06/03`, `06/06` com um decodificador PNG próprio. |
| D09 | `sync-timeline.mjs` gera `src/timeline.ts` **e** `src/data/cues.json` (cues expandidos: repetições, curva acelerando da fila com 60 ticks 301→1 quantizados em frames, notas pentatônicas por cue) | Expandir separadamente no áudio e no vídeo | Uma única expansão garante que imagem e som usem os mesmos frames (verificado por `verify.mjs`). |
| D10 | O FFmpeg embutido no Remotion é mínimo (~50 filtros: tem `silencedetect`, **não** tem `ebur128`, `showwavespic`, `showspectrumpic`, `xstack`). Medições de loudness/true peak e os PNGs de análise foram implementados em Node puro; folhas de contato também | Instalar FFmpeg completo | Regra "sem novas dependências"; ver `audio/LICENSES.md` e `audio/analysis/report.json`. |

## F1/F2 — Direção de arte e roteiro

| # | Decisão | Alternativas | Motivo |
|---|---|---|---|
| D11 | Referências de F1 feitas por um subagente, **só por texto** (transcrições, posts, artigos); nenhum vídeo baixado ou assistido | Descrever vídeos de memória | Regra de honestidade do prompt; limitações listadas no `ART-DIRECTION.md`. |
| D12 | Eyebrow do vídeo = **22 px**/700/0,18 em (deck: 14 px) | 14 px | 14 px num canvas 1080p fica ilegível em telas pequenas; o resto da especificação (peso, caixa alta, tracking) foi mantido. |
| D13 | Gradiente de destaque da tipografia do vídeo = variante de marca `#5fb0e6 → #2a8fd4 → #1c6fb5` | Gradiente do app `#0078f4 → #0dbde4` | Tipografia do vídeo é camada `brand` (spec §3); o gradiente do app fica só na UI recriada (botões/CTAs). |
| D14 | Nomes neutros: "Live Experience" (evento), "Estádio" / "Estádio, São Paulo" (local), rótulo do mapa "ESTÁDIO" | Nomes do seed | R25 / 13 §F. |
| D15 | Banners da vitrine: fotos reais recortadas das capturas `01/01`, `01/02`, `02/01` como textura, com títulos e preços observados ("Live Experience · a partir de R$ 60,00", "Samba de Raiz · R$ 15,00", "Aula de Yoga no Parque · R$ 10,00"); **sem datas**; os banners vizinhos (só entrevistos) não têm texto | Banners inventados | Só fatos observados; datas 2025 cortadas (R4). As fotos ficam ampliadas ~1,4–2× no canvas; como são textura atrás de gradiente escuro e de motion, o risco R32 foi aceito para elas (a UI em si é vetor). |
| D16 | C05 mostra no bloco de tipos só **Inteira e Meia entrada** da Pista Premium (R$ 350,00 / R$ 175,00) | Mostrar também Solidária da Premium | A captura `06/06` não mostra o preço da Solidária da Premium; nada foi inventado. A C06 (Nível 1) mostra as três, todas observadas em `06/04`. |
| D17 | Total da C06: o número **vira** de R$ 180,00 para R$ 360,00 | Contador rolando de 0 a 360 | Evita exibir valores intermediários que nunca existiram na UI. |
| D18 | C07 usa nomes fictícios ("Marina Costa", "Rafael Souza") e documento totalmente mascarado; sem subtotal/taxa/total | — | Prompt F2; 13 §D; o checkout real soma taxa (R$ 378,00) e não deve ser misturado com R$ 360,00. |
| D19 | Status (C08): laranja = Pendente/Aguardando, verde = Aprovado — **confirmado** na captura `04-admin/02` | — | A captura prevalece; bateu com `07`. |
| D20 | Rotulagem de ilustração **na tela**: o chip de cena ganha "Representação ilustrativa" durante a C04 e durante o quadro de status da C08 (52,2–56 s); nota de rodapé final de 59,0 a 64,0 s | Só a nota final | Deixa explícito, no próprio frame, que a sala de espera e o quadro de status não são capturas. **Revisão 35 s:** o chip saiu junto com o chrome de apresentação (pedido do usuário); fica a nota de rodapé final (33–35 s). |
| D21 | 8 "polígonos" da C08 = Pista, Pista Premium e as arquibancadas divididas em 3 blocos cada; a Cadeira Nível 1 termina com os **17 vértices reais** como alças | 4 setores apenas | O JSON pede 8 plucks (48,5–52,0 s, um a cada 0,5 s). |
| D22 | A palavra "polígono" não aparece na tela (o subtítulo real do editor contém "polígonos" e "SVG") | Reproduzir o subtítulo | Termos proibidos (13 §B). |

## F3/F5 — Arquitetura

| # | Decisão | Alternativas | Motivo |
|---|---|---|---|
| D23 | Transições com **`<Sequence>` sobrepostas + transição própria** (`src/motion/transitions.tsx`), não `TransitionSeries` | `TransitionSeries` | Cada cena precisa de janelas assimétricas (zoom-through, inversão, expansão de cartão) e a grade exige que o **ponto médio** caia exatamente no `start` da cena seguinte sem encurtar a timeline. Cada `Sequence` começa `lead` s antes e termina `tail` s depois; `verify.mjs` confere os pontos médios. |
| D24 | `CameraMotionBlur` (14–16 amostras, 200°) **apenas** dentro das janelas de whip-pan | Blur em tudo / filtro direcional | Custo de render; fora das janelas não há blur. **Revisão 35 s:** whips substituídos por SnapZoom; motion blur (8 amostras, 180°) só nos 10 frames do mergulho de saída. |
| D25 | Números (contagem da fila, contador de quantidade, preços) e o cursor são calculados com `interpolate()` a partir do frame, não com GSAP | Tween GSAP de objeto | O `@remotion/gsap` proíbe alvos não-DOM (congelariam no render). |
| D26 | **Regra técnica:** elemento animado por GSAP nunca recebe `translate/scale/rotate` do React; tremores ficam num wrapper interno | — | Bug real encontrado no QA (C04 a 26,67 s): o GSAP incorpora a propriedade CSS `translate` ao seu cache de transformação e o elemento saiu do quadro. Corrigido na C04 e na C08. |
| D27 | Glass sem `backdrop-filter`; blobs são gradientes radiais (macios por construção), nunca `filter: blur()` animado | Blur real | Performance em 4K (15 §3.5). **Revisão 35 s:** blobs removidos (fundo estático limpo). `filter: blur()` passa a ser usado como profundidade de campo, por pedido explícito, só em camadas fora do plano focal (floaters, placas de fundo, janelas de SnapZoom) e omitido abaixo de 0,25 px. |
| D28 | Grão de filme: textura 256 px gerada com seed (`scripts/make-grain.mjs`), deslocada por `random('grain-'+frame)`, opacidade 3,5 % | Sem grão | Evita banding nos gradientes gelo; determinístico. |

## F4 — Áudio

| # | Decisão | Alternativas | Motivo |
|---|---|---|---|
| D29 | **`MUSIC_SOURCE = 'procedural'`** (constante em `src/audio.ts`); música composta por script (`scripts/audio/synth.mjs`) | Faixa externa licenciada (upgrade opcional de 20 min) | A busca por faixa externa **não foi feita**: (1) a estrutura exige drops exatamente em 6/28/44/48/56 s e dois silêncios, o que uma faixa pronta não cumpre sem edição pesada; (2) licença comercial verificável é arriscada e o prompt manda "na dúvida, não use"; (3) sem audição, a síntese determinística é a única opção verificável por medição. A arquitetura permite trocar: gerar um novo `master.wav` a partir de outra `music.wav` e mudar a constante. |
| D30 | Síntese de áudio feita por um subagente em paralelo (F4), com contexto autocontido | Fazer em série | Uso de subagentes pedido no prompt; detalhes e métricas em `audio/analysis/report.json` e `REPORT.md`. |
| D31 | Um único caminho de áudio no Remotion: `<Audio src="audio/master.wav">` de `@remotion/media` | SFX posicionados no Remotion | Evita duplicar SFX (15 §4.3). |

## F7 — Render

| # | Decisão | Alternativas | Motivo |
|---|---|---|---|
| D32 | H.264 em 4K60 aceito pelo ambiente (teste de 1 s em 3840×2160 a 60 fps passou no `ffprobe`) | H.265 | Não foi preciso trocar de codec. |
| D33 | Concurrency do render ajustada à RAM (8,4 GB totais) | Padrão | Ver comando em `REPORT.md`. |
