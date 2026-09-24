// Every on-screen string of the video lives here (13-DO-NOT-SHOW §F).
// Checked by scripts/lint-copy.mjs. Facts only from 10-SCRIPTING-INPUT table A;
// UI strings are the product's own PT-BR labels observed in the screenshots.
// Events, venues, people and prices are FICTITIOUS demo data; no third-party names.

export const COPY = {
	brand: {
		name: 'GoTicket',
	},
	footnote: 'Imagens ilustrativas. Eventos e valores fictícios de demonstração.',

	// Fictitious event base: every scene that shows an event example uses a different one
	// (photos in public/photos, credited in out/provenance.json).
	events: {
		arena: {
			name: 'Mega Arena Game Show 2026',
			category: 'Games e E-Sports',
			day: 'Sábado, 12 de dezembro',
			time: '14:00 - 20:00',
			venue: 'Arena Central',
			city: 'São Paulo, SP',
			price: 'R$ 60,00',
			description:
				'Dois dias de campeonato ao vivo com as melhores equipes do país, telão gigante, área de experiências e encontro com os jogadores. Traga a sua torcida e viva cada partida de perto.',
		},
		festival: {name: 'Festival Horizonte', category: 'Música', day: 'Sexta, 6 de novembro', price: 'R$ 89,00'},
		openair: {name: 'Sunset Sessions', category: 'Música', day: 'Domingo, 15 de novembro', price: 'R$ 95,00'},
		stage: {name: 'Turnê Eclipse', category: 'Festas e Shows', day: 'Sábado, 21 de novembro', price: 'R$ 180,00'},
		comedy: {name: 'Noite do Riso', category: 'Comédia e Stand-up', day: 'Quinta, 3 de dezembro', price: 'R$ 45,00'},
		food: {name: 'Sabores da Serra', category: 'Gastronomia', day: 'Sábado, 28 de novembro', price: 'R$ 30,00'},
		tech: {name: 'Summit Futuro Digital', category: 'Tecnologia', day: 'Terça, 1 de dezembro', price: 'R$ 120,00'},
		art: {name: 'Expo Luz & Cor', category: 'Artes e Cultura', day: 'Quarta, 9 de dezembro', price: 'R$ 25,00'},
		electro: {name: 'Pulse Open Air', category: 'Festas e Shows', day: 'Sábado, 9 de janeiro', price: 'R$ 150,00'},
		samba: {name: 'Roda de Samba do Porto', category: 'Festas e Shows', day: 'Domingo, 13 de dezembro', price: 'R$ 20,00'},
		run: {name: 'Corrida Noturna 10K', category: 'Esportes e Bem-estar', day: 'Sábado, 19 de dezembro', price: 'R$ 70,00'},
	},

	// Generic legacy ticketing site (no brand, not modelled on any real product).
	C00: {
		site: 'Portal de Ingressos',
		loading: 'Carregando…',
		wait: 'Aguarde…',
		buy: 'Comprar',
		errorTitle: 'Erro',
		errors: ['Sessão expirada.', 'Tente novamente mais tarde.', 'A página não está respondendo.', 'Ops! Algo deu errado.'],
		ok: 'OK',
		retry: 'Tentar de novo',
	},

	C01: {
		titleWords: ['Seu', 'ingresso', 'aqui.'],
		typed: 'Em 1 clique.',
	},

	C02: {
		title: 'Seus eventos favoritos.',
		subtitle: 'Tudo num só lugar.',
		tiles: [
			'Música',
			'Tecnologia',
			'Gastronomia',
			'Artes e Cultura',
			'Cursos e Workshops',
			'Esportes e Bem-estar',
			'Comédia e Stand-up',
			'Feiras e Negócios',
			'Festas e Shows',
			'Games e E-Sports',
		],
	},

	C03: {
		eyebrow: 'Live Experience',
		title: ['Mega Arena', 'Game Show 2026.'],
		aboutTitle: 'Sobre o Evento',
		ticketsHeader: 'Ingressos',
		dateCards: [
			{day: 'Sábado, 12 de dezembro', time: '14:00 - 20:00', from: 'A partir de', price: 'R$ 60,00'},
			{day: 'Domingo, 13 de dezembro', time: '14:00 - 20:00', from: 'A partir de', price: 'R$ 60,00'},
		],
	},

	C04: {
		eyebrow: 'Sala de espera',
		event: 'Mega Arena Game Show 2026',
		eventMeta: 'Sábado, 12 de dezembro · Arena Central',
		notice: 'Este evento está com alta demanda. Você está na fila e será direcionado quando for a sua vez.',
		position: 'Sua posição na fila',
		people: 'Pessoas na fila',
		wait: 'Espera estimada',
		waitSteps: ['~4 min', '~3 min', '~2 min', '~1 min', 'menos de 1 min'],
	},

	C05: {
		sectorsTitle: 'Setores disponíveis',
		sectorsSub: 'Escolha um setor para ver as opções de ingressos.',
		mapTitle: 'Mapa de setores',
		mapSub: 'Passe o mouse sobre uma área e clique para selecionar o setor.',
		fromLabel: 'A partir de',
		selected: 'Selecionado',
		legendStatus: ['Disponível', 'Selecionado', 'Esgotado'],
		venueLabel: 'ARENA CENTRAL',
		mapLabels: {palco: 'PALCO', premium: 'PISTA PREMIUM', pista: 'PISTA'},
		legend: ['PISTA PREMIUM', 'PISTA', 'CADEIRA NÍVEL 1', 'CADEIRA SUPERIOR'],
		sectors: [
			{id: 'nivel1', name: 'Cadeira Nível 1', desc: 'Arquibancada inferior numerada', kind: 'Lugares numerados', avail: '8000 disponíveis', price: 'R$ 90,00'},
			{id: 'superior', name: 'Cadeira Superior', desc: 'Arquibancada superior numerada', kind: 'Lugares numerados', avail: '10000 disponíveis', price: 'R$ 60,00'},
			{id: 'pista', name: 'Pista', desc: 'Gramado central', kind: 'Lugares livres', avail: '12000 disponíveis', price: 'R$ 100,00'},
			{id: 'premium', name: 'Pista Premium', desc: 'Área VIP colada ao palco', kind: 'Lugares livres', avail: '4500 disponíveis', price: 'R$ 175,00'},
		],
		tooltipFrom: 'A partir de',
		ticketsSub: 'Escolha o tipo e a quantidade de ingressos.',
	},

	tickets: {
		lot: 'LOTE 1',
		max: 'Máx. 10 por compra',
		types: {
			inteira: {name: 'Inteira', desc: 'Valor cheio do ingresso, sem benefício aplicado.'},
			meia: {name: 'Meia entrada', desc: 'Para estudantes, idosos, PCD e demais públicos previstos por lei.'},
			solidaria: {name: 'Solidária', desc: 'Doe um item ou colabore com a causa apoiada por este evento.'},
		},
		prices: {
			premium: {inteira: 'R$ 350,00', meia: 'R$ 175,00'},
			nivel1: {inteira: 'R$ 180,00', meia: 'R$ 90,00', solidaria: 'R$ 180,00'},
		},
	},

	// Business value (10-SCRIPTING-INPUT A: the total updates with quantity and type; concept "sem surpresa no valor").
	C06: {
		title: ['Sem surpresa', 'no valor.'],
		sub: 'O total atualiza a cada clique.',
		totalLabel: 'TOTAL',
		totalCountOne: '1 ingresso',
		totalCount: '2 ingressos',
		totalLine: '2x Inteira · Cadeira Nível 1',
		totalLineValue: 'R$ 360,00',
		totalOne: 'R$ 180,00',
		cta: 'Continuar',
		sectorTitle: 'Cadeira Nível 1',
	},

	// Business value (10-SCRIPTING-INPUT A: each ticket is linked to a holder, name and document).
	C07: {
		phrase: ['Cada ingresso', 'tem dono.'],
		title: 'Dados dos portadores',
		sub: 'Preencha nome e documento de cada ingresso selecionado.',
		ticket: 'INGRESSO',
		type: 'Inteira',
		nameLabel: 'Nome completo',
		docLabel: 'CPF / Documento',
		holders: [
			{name: 'Beatriz Lima', doc: '•••.•••.•••-••'},
			{name: 'Diego Martins', doc: '•••.•••.•••-••'},
		],
		event: 'Pulse Open Air',
		when: 'sábado, 9 de janeiro, 22:00',
		where: 'Parque da Orla, Rio de Janeiro',
		sector: 'PISTA',
		items: 'Inteira × 2',
		count: '2 ingressos',
	},

	C08: {
		title: ['Quem organiza', 'cria.'],
		title2: ['A gente coloca', 'no ar.'],
		editorTitle: 'Mapa de setores',
		sectorsHeader: 'Setores',
		sectorList: ['Pista', 'Cadeira Nível 1', 'Cadeira Superior', 'Pista Premium'],
		addSector: 'Adicionar setor',
		boardTitle: 'Meus eventos',
		columns: {pending: 'Aguardando aprovação', approved: 'Aprovado'},
		badges: {pending: 'Pendente', approved: 'Aprovado'},
		approvedToast: 'Evento aprovado',
		cards: [
			{title: 'Festival Horizonte', category: 'Música'},
			{title: 'Expo Luz & Cor', category: 'Artes e Cultura'},
			{title: 'Summit Futuro Digital', category: 'Tecnologia'},
		],
	},

	C09: {
		lines: [
			['E', 'aí,', 'acha', 'que', 'tá', 'pronto'],
			['pra', 'transformar', 'seus', 'eventos?'],
		],
		// Six reveal groups, one per sfx.c09.reveal tick.
		groups: [[0, 1], [2, 3], [4, 5], [6], [7], [8, 9]],
		cta: 'Criar conta',
	},
} as const;
