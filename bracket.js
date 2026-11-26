// Lógica compartilhada: Dupla Eliminação (9 equipes) + Utilitários
window.Bracket9 = (function () {
  const SEEDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

  // Mapa exato para 9 equipes (Chave dos Vencedores e Repescagem)
  const MAP = {
    winners: [
      [
        { id: 1, label: 'Jogo 1', s: [{ seed: 'B' }, { seed: 'G' }] }
      ],
      [
        { id: 5, label: 'Jogo 5', s: [{ seed: 'D' }, { win: 1 }] },
        { id: 2, label: 'Jogo 2', s: [{ seed: 'H' }, { seed: 'C' }] },
        { id: 3, label: 'Jogo 3', s: [{ seed: 'A' }, { seed: 'E' }] },
        { id: 4, label: 'Jogo 4', s: [{ seed: 'F' }, { seed: 'I' }] }
      ],
      [
        { id: 10, label: 'Jogo 10', s: [{ win: 5 }, { win: 2 }] },
        { id: 9, label: 'Jogo 9', s: [{ win: 3 }, { win: 4 }] }
      ],
      [
        { id: 14, label: 'Semifinal', s: [{ win: 10 }, { win: 9 }] }
      ],
      [
        { id: 16, label: 'Final', s: [{ win: 14 }, { win: 15 }] }
      ]
    ],
    losers: [
      [
        { id: 6, label: 'Jogo 6', s: [{ lose: 4 }, { lose: 1 }] }
      ],
      [
        { id: 8, label: 'Jogo 8', s: [{ lose: 3 }, { win: 6 }] },
        { id: 7, label: 'Jogo 7', s: [{ lose: 2 }, { lose: 5 }] }
      ],
      [
        { id: 12, label: 'Jogo 12', s: [{ lose: 10 }, { win: 8 }] },
        { id: 11, label: 'Jogo 11', s: [{ lose: 9 }, { win: 7 }] }
      ],
      [
        { id: 13, label: 'Jogo 13', s: [{ win: 12 }, { win: 11 }] }
      ],
      [
        { id: 15, label: 'Final perd.', s: [{ lose: 14 }, { win: 13 }] }
      ]
    ]
  };

  function defaultTeams() {
    const t = {};
    SEEDS.forEach((s, i) => {
      t[s] = `Equipe ${i + 1}`;
    });
    return t;
  }

  function escapeHTML(str) {
    if (!str && str !== 0) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function allMatches() {
    return [...MAP.winners.flat(), ...MAP.losers.flat()];
  }

  function matchById(id) {
    const numId = Number(id);
    return allMatches().find(m => m.id === numId) || null;
  }

  function resolveSlot(slot, teams, results) {
    if (slot.seed !== undefined) {
      const name = (teams && teams[slot.seed]) || `Chave ${slot.seed}`;
      return { name, decided: true, feedLabel: null, seed: slot.seed };
    }
    if (slot.win !== undefined) {
      const r = results ? results[slot.win] : undefined;
      if (r !== undefined && r !== null) {
        const m = matchById(slot.win);
        if (m) return resolveSlot(m.s[r], teams, results);
      }
      return { name: null, decided: false, feedLabel: 'Venc. Jogo ' + slot.win };
    }
    if (slot.lose !== undefined) {
      const r = results ? results[slot.lose] : undefined;
      if (r !== undefined && r !== null) {
        const m = matchById(slot.lose);
        if (m) return resolveSlot(m.s[1 - r], teams, results);
      }
      return { name: null, decided: false, feedLabel: 'Perd. Jogo ' + slot.lose };
    }
    return { name: null, decided: false, feedLabel: '?' };
  }

  // Encontra todos os jogos que dependem (direta ou indiretamente) de um jogo
  function getDependentMatchIds(matchId) {
    const deps = new Set();
    const queue = [Number(matchId)];
    const matches = allMatches();

    while (queue.length > 0) {
      const curr = queue.shift();
      matches.forEach(m => {
        const usesCurr = m.s.some(slot => slot.win === curr || slot.lose === curr);
        if (usesCurr && !deps.has(m.id)) {
          deps.add(m.id);
          queue.push(m.id);
        }
      });
    }
    return Array.from(deps);
  }

  function isFinished(results) {
    return results && results[16] !== undefined && results[16] !== null;
  }

  // Classificação final (1º ao 9º lugar)
  function calculateStandings(teams, results) {
    if (!isFinished(results)) return [];

    const getWinner = (matchId) => {
      const wIdx = results[matchId];
      if (wIdx === undefined || wIdx === null) return null;
      const m = matchById(matchId);
      const a = resolveSlot(m.s[0], teams, results);
      const b = resolveSlot(m.s[1], teams, results);
      return wIdx === 0 ? a.name : b.name;
    };

    const getLoser = (matchId) => {
      const wIdx = results[matchId];
      if (wIdx === undefined || wIdx === null) return null;
      const m = matchById(matchId);
      const a = resolveSlot(m.s[0], teams, results);
      const b = resolveSlot(m.s[1], teams, results);
      return wIdx === 0 ? b.name : a.name;
    };

    const standings = [];
    const champion = getWinner(16);
    const runnerUp = getLoser(16);
    if (champion) standings.push({ pos: '1º Lugar', posNum: 1, name: champion });
    if (runnerUp) standings.push({ pos: '2º Lugar', posNum: 2, name: runnerUp });

    const losersCols = MAP.losers;
    const numCols = losersCols.length;
    const faixas = [
      { offset: 1, base: 3 },
      { offset: 2, base: 4 },
      { offset: 3, base: 5 },
      { offset: 4, base: 7 },
      { offset: 5, base: 9 }
    ];

    faixas.forEach(f => {
      if (numCols < f.offset) return;
      const col = losersCols[numCols - f.offset];
      const losers = [];
      col.forEach(m => {
        const name = getLoser(m.id);
        if (name) losers.push(name);
      });
      if (losers.length === 0) return;
      if (losers.length === 1) {
        standings.push({ pos: `${f.base}º Lugar`, posNum: f.base, name: losers[0] });
      } else {
        const label = `${f.base}º - ${f.base + losers.length - 1}º Lugar`;
        losers.forEach((name, i) => standings.push({ pos: label, posNum: f.base + i, name }));
      }
    });

    return standings;
  }

  // Converte símbolos matemáticos para leitura natural em português
  function formatForSpeech(text) {
    if (!text) return '';
    return String(text)
      .replace(/(\d+)\s*[xX×\*]\s*(\d+)/g, '$1 vezes $2')
      .replace(/(\d+)\s*[÷\/]\s*(\d+)/g, '$1 dividido por $2')
      .replace(/(\d+)\s*\+\s*(\d+)/g, '$1 mais $2')
      .replace(/(\d+)\s*[-–−]\s*(\d+)/g, '$1 menos $2')
      .replace(/=/g, ' igual a ')
      .replace(/²/g, ' ao quadrado')
      .replace(/³/g, ' ao cubo')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return {
    CHANNEL_NAME: 'campeonato_quiz_9eq_v1',
    STORAGE_KEY: 'campeonato_quiz_9eq_state_v1',
    SEEDS,
    MAP,
    defaultTeams,
    escapeHTML,
    allMatches,
    matchById,
    resolveSlot,
    getDependentMatchIds,
    isFinished,
    calculateStandings,
    formatForSpeech
  };
})();