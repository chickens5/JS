import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getDatabase, onValue, ref, set } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

const TOTAL_ROUNDS = 10;
const MAX_SCORE = TOTAL_ROUNDS * 10;
const SAVE_KEY = 'trivia-night-game-v1';
const isSpectatorMode = new URLSearchParams(window.location.search).get('view') === 'live';
const gameId = new URLSearchParams(window.location.search).get('game') || 'trivia-night';
let remoteGameRef = null;
const DEFAULT_TEAMS = [
  'Witchy Tricks', 'Spooky Treats', 'Team ICD', 'Creative Crayons of CAC',
  'Ghouls & Goblins', 'Boo-tiful Minds', 'Conover’s Crew', 'Achieving My Best Life',
  'The Lurking Lyon’s', 'No One Mourns the Wicked', 'Pumpkin Patch', 'Team GDSA',
  'The Boo Crew', 'Team Rice', 'Susie’s Favorite People', 'Susie’s Other Favorite People',
  'SLL Staff #1', 'SLL Staff #2', 'Residents #1', 'Residents #2',
  'Waiting on team name', 'Extra Table'
];

const state = {
  currentRound: 1,
  currentTeamIndex: null,
  currentView: 'setup',
  teams: [],
  roundEntries: {}
};

const elements = {
  resumeView: document.querySelector('#resume-view'),
  setupView: document.querySelector('#setup-view'),
  gameView: document.querySelector('#game-view'),
  roundReadyView: document.querySelector('#round-ready-view'),
  leaderboardView: document.querySelector('#leaderboard-view'),
  spectatorView: document.querySelector('#spectator-view'),
  teamCount: document.querySelector('#team-count'),
  teamCountLabel: document.querySelector('#team-count-label'),
  teamNameInputs: document.querySelector('#team-name-inputs'),
  decreaseTeams: document.querySelector('#decrease-teams'),
  increaseTeams: document.querySelector('#increase-teams'),
  startGame: document.querySelector('#start-game'),
  roundNumber: document.querySelector('#round-number'),
  liveTeamList: document.querySelector('#live-team-list'),
  roundMessage: document.querySelector('#round-message'),
  confirmRound: document.querySelector('#confirm-round'),
  readyRoundNumber: document.querySelector('#ready-round-number'),
  beginRound: document.querySelector('#begin-round'),
  winnerBanner: document.querySelector('#winner-banner'),
  leaderboardList: document.querySelector('#leaderboard-list'),
  liveScoreChart: document.querySelector('#live-score-chart'),
  finalScoreChart: document.querySelector('#final-score-chart'),
  spectatorRound: document.querySelector('#spectator-round'),
  spectatorWinner: document.querySelector('#spectator-winner'),
  spectatorLeaderboard: document.querySelector('#spectator-leaderboard'),
  spectatorScoreChart: document.querySelector('#spectator-score-chart'),
  resumeGame: document.querySelector('#resume-game'),
  restartGame: document.querySelector('#restart-game'),
  downloadCsv: document.querySelector('#download-csv'),
  playAgain: document.querySelector('#play-again')
};

function clampTeamCount(value) {
  return Math.max(2, Math.min(30, Number.parseInt(value, 10) || 2));
}

function getSetupTeams() {
  return [...elements.teamNameInputs.querySelectorAll('.setup-team')].map((team) =>
    team.querySelector('.team-name-input').value
  );
}

function renderTeamNameInputs(setupTeams = getSetupTeams()) {
  const teamCount = clampTeamCount(elements.teamCount.value);

  elements.teamCount.value = teamCount;
  elements.teamCountLabel.textContent = `${teamCount} ${teamCount === 1 ? 'team' : 'teams'}`;
  // replaces an element's child nodes with the contents 
  // of an array by using the spread operator (...) 
  // to pass each array item as an individual argument.
  elements.teamNameInputs.replaceChildren(
    ...Array.from({ length: teamCount }, (_, index) => {
      const setupTeam = setupTeams[index] || '';
      const card = document.createElement('div');
      const header = document.createElement('label');
      const number = document.createElement('span');
      const teamInput = document.createElement('input');
      number.textContent = String(index + 1).padStart(2, '0');
      teamInput.className = 'team-name-input';
      teamInput.type = 'text';
      teamInput.maxLength = 28;
      teamInput.placeholder = `Team ${index + 1}`;
      teamInput.value = setupTeam;
      teamInput.setAttribute('aria-label', `Name for team ${index + 1}`);
      header.className = 'setup-team-header';
      header.append(number, teamInput);
      card.className = 'setup-team';
      card.append(header);
      return card;
    })
  );
}

function renderDefaultTeams() {
  elements.teamCount.value = DEFAULT_TEAMS.length;
  renderTeamNameInputs(DEFAULT_TEAMS);
}

function showView(view) {
  [elements.resumeView, elements.setupView, elements.gameView, elements.roundReadyView, elements.leaderboardView, elements.spectatorView].forEach((element) => {
    element.classList.toggle('hidden', element !== view);
  });
}

function createRoundEntries() {
  return Object.fromEntries(state.teams.map((team) => [team.id, {
    teamPoints: null
  }]));
}

function saveGame() {
  const gameSnapshot = {
    currentRound: state.currentRound,
    currentView: state.currentView,
    teams: state.teams,
    roundEntries: state.roundEntries
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(gameSnapshot));
  if (remoteGameRef) set(remoteGameRef, gameSnapshot).catch(() => {});
}

function initializeRemoteGame() {
  if (!firebaseConfig) return;
  const app = initializeApp(firebaseConfig);
  remoteGameRef = ref(getDatabase(app), `games/${gameId}`);
}

function clearSavedGame() {
  localStorage.removeItem(SAVE_KEY);
}

function hasSavedGame() {
  const savedGame = localStorage.getItem(SAVE_KEY);
  if (!savedGame) return false;

  try {
    const savedState = JSON.parse(savedGame);
    return Array.isArray(savedState.teams) && savedState.teams.length > 0 && Boolean(savedState.roundEntries);
  } catch {
    clearSavedGame();
    return false;
  }
}

function restoreSavedGame() {
  const savedGame = localStorage.getItem(SAVE_KEY);
  if (!savedGame) return false;

  try {
    const savedState = JSON.parse(savedGame);
    if (!Array.isArray(savedState.teams) || !savedState.teams.length || !savedState.roundEntries) return false;
    state.currentRound = savedState.currentRound;
    state.currentView = savedState.currentView || 'game';
    state.teams = savedState.teams;
    state.roundEntries = savedState.roundEntries;

    if (state.currentView === 'leaderboard' || state.currentRound > TOTAL_ROUNDS) {
      showLeaderboard();
      return true;
    }

    if (state.currentView === 'ready') {
      elements.readyRoundNumber.textContent = String(state.currentRound).padStart(2, '0');
      showView(elements.roundReadyView);
      return true;
    }

    renderGame();
    showView(elements.gameView);
    return true;
  } catch {
    clearSavedGame();
    return false;
  }
}

function startGame() {
  const setupTeams = getSetupTeams();
  state.currentRound = 1;
  state.currentTeamIndex = null;
  state.currentView = 'game';
  state.teams = setupTeams.map((teamName, index) => ({
    id: index + 1,
    name: teamName.trim() || `Team ${index + 1}`,
    score: 0,
    roundHistory: []
  }));
  state.roundEntries = createRoundEntries();

  saveGame();
  renderGame();
  showView(elements.gameView);
}

function renderGame() {
  elements.roundNumber.textContent = String(state.currentRound).padStart(2, '0');
  elements.roundMessage.textContent = '';
  elements.liveTeamList.replaceChildren(
    ...state.teams.map((team) => {
      const entry = state.roundEntries[team.id];
      const card = document.createElement('section');
      const header = document.createElement('div');
      const number = document.createElement('span');
      const name = document.createElement('strong');
      const scoreSummary = document.createElement('div');
      const score = document.createElement('b');
      const correctCount = document.createElement('span');
      const teamActions = document.createElement('div');
      const decreaseScore = document.createElement('button');
      const roundScore = document.createElement('output');
      const increaseScore = document.createElement('button');
      card.className = `team-score-card${entry.teamPoints !== null ? ' scored' : ''}`;
      header.className = 'team-card-header';
      number.className = 'team-number';
      number.textContent = String(team.id).padStart(2, '0');
      name.textContent = team.name;
      scoreSummary.className = 'team-score-summary';
      score.className = 'team-total';
      score.textContent = `${team.score} / ${MAX_SCORE}`;
      correctCount.className = 'team-correct-count';
      correctCount.textContent = `${team.roundHistory.length} ROUNDS COMPLETE`;
      scoreSummary.append(score, correctCount);
      teamActions.className = 'team-result-actions';
      decreaseScore.className = 'team-result-button score-stepper-button';
      decreaseScore.type = 'button';
      decreaseScore.dataset.teamId = team.id;
      decreaseScore.dataset.delta = -1;
      decreaseScore.disabled = entry.teamPoints === null || entry.teamPoints === 0;
      decreaseScore.setAttribute('aria-label', `Decrease ${team.name} round score`);
      decreaseScore.textContent = '−';
      roundScore.className = 'round-score-value';
      roundScore.textContent = entry.teamPoints === null ? '— / 10' : `${entry.teamPoints} / 10`;
      increaseScore.className = 'team-result-button score-stepper-button';
      increaseScore.type = 'button';
      increaseScore.dataset.teamId = team.id;
      increaseScore.dataset.delta = 1;
      increaseScore.disabled = entry.teamPoints === 10;
      increaseScore.setAttribute('aria-label', `Increase ${team.name} round score`);
      increaseScore.textContent = '+';
      teamActions.append(decreaseScore, roundScore, increaseScore);
      header.append(number, name, scoreSummary, teamActions);
      card.append(header);
      return card;
    })
  );
  renderScoreChart(elements.liveScoreChart);
}

function recordTeamScore(teamId, points) {
  const team = state.teams.find((candidate) => candidate.id === teamId);
  const entry = state.roundEntries[teamId];
  if (entry.teamPoints !== null) team.score -= entry.teamPoints;
  entry.teamPoints = Math.max(0, Math.min(10, points));
  team.score += entry.teamPoints;
  saveGame();
  renderGame();
}

function renderScoreChart(container) {
  container.replaceChildren(
    ...state.teams
      .slice()
      .sort((first, second) => second.score - first.score || first.id - second.id)
      .map((team) => {
        const row = document.createElement('div');
        const name = document.createElement('strong');
        const track = document.createElement('div');
        const bar = document.createElement('div');
        const value = document.createElement('span');
        row.className = 'score-chart-row';
        name.className = 'score-chart-name';
        name.textContent = team.name;
        track.className = 'score-chart-track';
        bar.className = 'score-chart-bar';
        bar.style.width = `${(team.score / MAX_SCORE) * 100}%`;
        value.className = 'score-chart-value';
        value.textContent = `${team.score} / ${MAX_SCORE}`;
        track.append(bar);
        row.append(name, track, value);
        return row;
      })
  );
}

function renderSpectatorView() {
  if (!state.teams.length) {
    elements.spectatorRound.textContent = 'WAITING FOR THE GAME TO BEGIN';
    elements.spectatorLeaderboard.replaceChildren();
    elements.spectatorWinner.classList.add('hidden');
    elements.spectatorScoreChart.replaceChildren();
    return;
  }

  const rankedTeams = [...state.teams].sort((first, second) => second.score - first.score || first.id - second.id);
  const isComplete = state.currentView === 'leaderboard' || state.currentRound > TOTAL_ROUNDS;
  elements.spectatorRound.textContent = isComplete ? 'FINAL STANDINGS' : `LIVE: ROUND ${String(state.currentRound).padStart(2, '0')} OF ${TOTAL_ROUNDS}`;
  elements.spectatorLeaderboard.replaceChildren(
    ...rankedTeams.map((team) => {
      const item = document.createElement('li');
      const name = document.createElement('strong');
      const score = document.createElement('b');
      name.textContent = team.name;
      score.textContent = `${team.score} / ${MAX_SCORE}`;
      item.append(name, score);
      return item;
    })
  );
  elements.spectatorWinner.classList.toggle('hidden', !isComplete);
  if (isComplete) elements.spectatorWinner.textContent = `${rankedTeams[0].name.toUpperCase()} WINS WITH ${rankedTeams[0].score} POINTS`;
  renderScoreChart(elements.spectatorScoreChart);
}

function startSpectatorSync() {
  showView(elements.spectatorView);
  if (!remoteGameRef) {
    elements.spectatorRound.textContent = 'LIVE SCORE CONNECTION IS NOT CONFIGURED';
    return;
  }
  onValue(remoteGameRef, (snapshot) => {
    const remoteGame = snapshot.val();
    if (!remoteGame) {
      renderSpectatorView();
      return;
    }
    state.currentRound = remoteGame.currentRound;
    state.currentView = remoteGame.currentView;
    state.teams = remoteGame.teams || [];
    state.roundEntries = remoteGame.roundEntries || {};
    renderSpectatorView();
  });
}

function confirmRound() {
  const incompleteTeam = state.teams.find((team) => state.roundEntries[team.id].teamPoints === null);
  if (incompleteTeam) {
    elements.roundMessage.textContent = `Mark a result for ${incompleteTeam.name} before confirming.`;
    return;
  }

  state.teams.forEach((team) => {
    const entry = state.roundEntries[team.id];
    team.roundHistory.push({ round: state.currentRound, points: entry.teamPoints });
  });

  if (state.currentRound === TOTAL_ROUNDS) {
    state.currentRound += 1;
    state.currentView = 'leaderboard';
    saveGame();
    showLeaderboard();
    return;
  }

  state.currentRound += 1;
  state.roundEntries = createRoundEntries();
  state.currentView = 'ready';
  saveGame();
  elements.readyRoundNumber.textContent = String(state.currentRound).padStart(2, '0');
  showView(elements.roundReadyView);
}

function showLeaderboard() {
  const rankedTeams = [...state.teams].sort((first, second) => second.score - first.score || first.id - second.id);
  const winner = rankedTeams[0];
  elements.winnerBanner.textContent = `${winner.name.toUpperCase()} TAKES THE CROWN WITH ${winner.score} POINTS`;
  elements.leaderboardList.replaceChildren(
    ...rankedTeams.map((team) => {
      const item = document.createElement('li');
      const teamName = document.createElement('strong');
      const teamScore = document.createElement('b');
      teamName.textContent = team.name;
      teamScore.textContent = `${team.score} PTS`;
      item.append(teamName, teamScore);
      return item;
    })
  );
  renderScoreChart(elements.finalScoreChart);
  showView(elements.leaderboardView);
}

function escapeCsv(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function downloadResultsCsv() {
  const header = ['Team', 'Score out of 100', 'Results by Round'];
  const rows = state.teams.map((team) => {
    return [
      team.name,
      team.score,
      team.roundHistory.map((round) => `Round ${round.round}: ${round.points}/10`).join('; ')
    ];
  });
  const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
  const file = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const downloadUrl = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = 'trivia-night-results.csv';
  link.click();
  URL.revokeObjectURL(downloadUrl);
}

function resetGame() {
  state.currentRound = 1;
  state.currentTeamIndex = null;
  state.currentView = 'setup';
  state.teams = [];
  state.roundEntries = {};
  clearSavedGame();
  renderDefaultTeams();
  showView(elements.setupView);
}

elements.decreaseTeams.addEventListener('click', () => {
  elements.teamCount.value = clampTeamCount(Number(elements.teamCount.value) - 1);
  renderTeamNameInputs();
});
elements.increaseTeams.addEventListener('click', () => {
  elements.teamCount.value = clampTeamCount(Number(elements.teamCount.value) + 1);
  renderTeamNameInputs();
});
elements.teamCount.addEventListener('change', renderTeamNameInputs);
elements.startGame.addEventListener('click', startGame);
elements.liveTeamList.addEventListener('click', (event) => {
  const teamButton = event.target.closest('.score-stepper-button');
  if (teamButton) {
    const teamId = Number(teamButton.dataset.teamId);
    const currentScore = state.roundEntries[teamId].teamPoints;
    recordTeamScore(teamId, Math.max(0, currentScore === null ? 0 : currentScore + Number(teamButton.dataset.delta)));
    return;
  }
});
elements.confirmRound.addEventListener('click', confirmRound);
elements.beginRound.addEventListener('click', () => {
  state.currentView = 'game';
  saveGame();
  renderGame();
  showView(elements.gameView);
});
elements.resumeGame.addEventListener('click', () => {
  if (!restoreSavedGame()) {
    renderTeamNameInputs();
    showView(elements.setupView);
  }
});
elements.restartGame.addEventListener('click', () => {
  clearSavedGame();
  renderDefaultTeams();
  showView(elements.setupView);
});
elements.downloadCsv.addEventListener('click', downloadResultsCsv);
elements.playAgain.addEventListener('click', resetGame);

initializeRemoteGame();

if (isSpectatorMode) {
  startSpectatorSync();
} else if (hasSavedGame()) {
  showView(elements.resumeView);
} else {
  renderDefaultTeams();
}