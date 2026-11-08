(() => {
  const symbols = [
    { id: 'cherry', icon: '🍒', weight: 30, pays: [0, 0, 1, 3, 8] },
    { id: 'clover', icon: '🍀', weight: 24, pays: [0, 0, 2, 6, 15] },
    { id: 'bell', icon: '🔔', weight: 20, pays: [0, 0, 3, 8, 20] },
    { id: 'gem', icon: '💎', weight: 16, pays: [0, 0, 4, 12, 35] },
    { id: 'lantern', icon: '🏮', weight: 6, pays: [0, 0, 5, 15, 50] },
  ];
  const lines = [[1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [1, 0, 1, 2, 1], [1, 2, 1, 0, 1]];
  const initial = { balance: 1000, bet: 25, freeSpins: 0 };
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('neonFortuneSave') || '{}') || {}; } catch (_) {}
  let balance = Number.isFinite(saved.balance) && saved.balance >= 0 ? saved.balance : initial.balance;
  let bet = Number.isFinite(saved.bet) && saved.bet > 0 ? saved.bet : initial.bet;
  let freeSpins = Number.isFinite(saved.freeSpins) && saved.freeSpins >= 0 ? saved.freeSpins : 0;
  let spinning = false;
  let autoRemaining = 0;
  let toastTimer;

  const $ = (id) => document.getElementById(id);
  const reels = [...document.querySelectorAll('.reel')];
  const spinButton = $('spinButton');
  const autoButton = $('autoButton');
  const betSteps = [5, 10, 25, 50, 100];
  const money = (value) => Math.floor(value).toLocaleString('en-US');
  const persist = () => {
    try { localStorage.setItem('neonFortuneSave', JSON.stringify({ balance, bet, freeSpins })); } catch (_) {}
  };
  const render = () => {
    $('balance').textContent = money(balance);
    $('betAmount').textContent = money(bet);
    $('lastWin').textContent = '—';
    $('spinHint').textContent = freeSpins > 0 ? `${freeSpins} FREE LEFT` : 'GOOD LUCK!';
    $('winCaption').textContent = freeSpins > 0 ? 'BONUS ROUND' : 'LET\'S LIGHT IT UP';
    updateControls();
  };
  function updateControls() {
    spinButton.disabled = spinning || (balance < bet && freeSpins === 0);
    $('betDown').disabled = spinning || freeSpins > 0;
    $('betUp').disabled = spinning || freeSpins > 0;
    autoButton.classList.toggle('active', autoRemaining > 0);
    $('refillButton').hidden = balance >= bet || freeSpins > 0;
    autoButton.setAttribute('aria-label', autoRemaining ? 'Stop auto spin' : 'Start auto spin');
    autoButton.innerHTML = `<span class="auto-icon">⟳</span> AUTO <span class="auto-count">${autoRemaining || 10}</span>`;
    if (!spinning && balance < bet && freeSpins === 0) $('statusText').textContent = 'LOW ON CREDITS';
    else if (!spinning) $('statusText').textContent = freeSpins > 0 ? 'BONUS SPINS ACTIVE' : 'READY TO SPIN';
  }
  function chooseSymbol() {
    const roll = Math.random() * 96;
    let total = 0;
    for (const symbol of symbols) { total += symbol.weight; if (roll < total) return symbol; }
    return symbols[0];
  }
  function paintReels(grid) {
    reels.forEach((reel, col) => {
      reel.innerHTML = grid[col].map((symbol, row) => `<div class="symbol" data-row="${row}" data-id="${symbol.id}">${symbol.icon}</div>`).join('');
    });
  }
  function evaluate(grid, spinBet) {
    let total = 0;
    const winners = [];
    const lineBet = spinBet / lines.length;
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const targetRows = lines[lineIndex];
      const first = grid[0][targetRows[0]];
      let target = first.id === 'lantern' ? null : first;
      let count = 0;
      for (let col = 0; col < 5; col++) {
        const symbol = grid[col][targetRows[col]];
        if (symbol.id === 'lantern') { count++; continue; }
        if (!target) target = symbol;
        if (symbol.id === target.id) count++;
        else break;
      }
      if (count >= 3 && target) {
        const payout = Math.floor(lineBet * target.pays[count - 1]);
        if (payout > 0) {
          total += payout;
          for (let col = 0; col < count; col++) winners.push([col, targetRows[col]]);
        }
      }
    }
    const scatterCount = grid.flat().filter((symbol) => symbol.id === 'lantern').length;
    const scatterWin = scatterCount >= 3 ? Math.floor(spinBet * (scatterCount === 3 ? 1 : scatterCount === 4 ? 2 : 5)) : 0;
    return { total: total + scatterWin, winners, scatterCount, scatterWin };
  }
  function showToast(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }
  function clearWins() {
    document.querySelectorAll('.win-symbol').forEach((el) => el.classList.remove('win-symbol'));
    $('lastWin').textContent = '—';
    $('lastWin').parentElement.classList.remove('is-win');
    $('gameMessage').classList.remove('win-message');
  }
  function setMessage(message, won = false) {
    $('messageText').textContent = message;
    $('gameMessage').classList.toggle('win-message', won);
  }
  function makeGrid() { return Array.from({ length: 5 }, () => Array.from({ length: 3 }, chooseSymbol)); }

  async function spin() {
    if (spinning || (balance < bet && freeSpins === 0)) {
      if (balance < bet && freeSpins === 0) showToast('Not enough credits. Lower your bet to keep playing!');
      autoRemaining = 0;
      updateControls();
      return;
    }
    spinning = true;
    clearWins();
    const isFree = freeSpins > 0;
    const spinBet = bet;
    if (isFree) freeSpins--;
    else balance -= spinBet;
    persist();
    $('balance').textContent = money(balance);
    $('statusText').textContent = isFree ? 'FREE SPIN IN MOTION' : 'REELS IN MOTION';
    $('spinHint').textContent = isFree ? 'FREE SPIN!' : 'GOOD LUCK!';
    spinButton.disabled = true;
    $('betDown').disabled = true;
    $('betUp').disabled = true;
    setMessage(isFree ? 'The lantern bonus is glowing. Good luck!' : 'The reels are finding their rhythm…');

    const grid = makeGrid();
    const delays = [720, 980, 1240, 1500, 1760];
    reels.forEach((reel) => reel.classList.add('spinning'));
    await Promise.all(reels.map((reel, col) => new Promise((resolve) => {
      setTimeout(() => {
        reel.classList.remove('spinning');
        reel.innerHTML = grid[col].map((symbol, row) => `<div class="symbol" data-row="${row}" data-id="${symbol.id}">${symbol.icon}</div>`).join('');
        resolve();
      }, delays[col]);
    })));

    const result = evaluate(grid, spinBet);
    const win = isFree ? result.total * 2 : result.total;
    if (win > 0) {
      balance += win;
      $('lastWin').textContent = `+${money(win)}`;
      $('lastWin').parentElement.classList.add('is-win');
      result.winners.forEach(([col, row]) => {
        const el = reels[col].querySelector(`[data-row="${row}"]`);
        if (el) el.classList.add('win-symbol');
      });
      if (result.scatterCount >= 3) {
        freeSpins += 8;
        setMessage(`LANTERN BONUS! ${result.scatterCount} lanterns lit — 8 free spins unlocked!`, true);
        showToast('🏮 8 FREE SPINS UNLOCKED!');
      } else if (result.scatterWin > 0) {
        setMessage(`A lantern scatter bonus adds ${money(isFree ? result.scatterWin * 2 : result.scatterWin)} credits!`, true);
      } else {
        setMessage(['A lovely little glow!', 'Now that’s a lucky line!', 'The lights are all yours!', 'A sparkling win!'][Math.floor(Math.random() * 4)], true);
      }
    } else if (result.scatterCount >= 3) {
      freeSpins += 8;
      setMessage(`LANTERN BONUS! ${result.scatterCount} lanterns lit — 8 free spins unlocked!`, true);
      showToast('🏮 8 FREE SPINS UNLOCKED!');
    } else {
      setMessage(isFree ? 'Free spin complete. The next one could be yours!' : 'No match this time. The next spin could be magic.');
    }
    if (win > 0) $('balance').textContent = money(balance);
    if (freeSpins > 0) $('spinHint').textContent = `${freeSpins} FREE LEFT`;
    $('winCaption').textContent = win > 0 ? (isFree ? '2× FREE SPIN WIN' : 'NICE LITTLE WIN') : (freeSpins ? 'BONUS ROUND' : 'LET\'S LIGHT IT UP');
    spinning = false;
    persist();
    updateControls();
    if (autoRemaining > 0) {
      autoRemaining--;
      updateControls();
      if (autoRemaining > 0 && (balance >= bet || freeSpins > 0)) setTimeout(spin, 550);
      else {
        autoRemaining = 0;
        updateControls();
        if (balance < bet && freeSpins === 0) showToast('Auto stopped: not enough credits for another spin.');
      }
    }
  }

  function changeBet(direction) {
    if (spinning || freeSpins > 0) return;
    let index = betSteps.indexOf(bet);
    if (index < 0) index = betSteps.findIndex((value) => value >= bet);
    if (index < 0) index = betSteps.length - 1;
    index = Math.max(0, Math.min(betSteps.length - 1, index + direction));
    bet = betSteps[index];
    persist();
    $('betAmount').textContent = money(bet);
    $('lastWin').textContent = '—';
    updateControls();
  }
  $('betDown').addEventListener('click', () => changeBet(-1));
  $('betUp').addEventListener('click', () => changeBet(1));
  $('refillButton').addEventListener('click', () => {
    if (spinning || balance >= bet) return;
    balance += 500;
    persist();
    $('balance').textContent = money(balance);
    setMessage('500 free arcade credits added. Keep the good vibes going!');
    showToast('500 free credits added!');
    updateControls();
  });
  spinButton.addEventListener('click', spin);
  autoButton.addEventListener('click', () => {
    if (autoRemaining) { autoRemaining = 0; updateControls(); showToast('Auto spin stopped.'); }
    else if (spinning) return;
    else if (balance < bet && freeSpins === 0) showToast('Not enough credits to start auto spin.');
    else { autoRemaining = 10; updateControls(); spin(); }
  });

  const modal = $('paytableModal');
  const openModal = () => { modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); $('paytableClose').focus(); };
  const closeModal = () => { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); $('paytableOpen').focus(); };
  $('paytableOpen').addEventListener('click', openModal);
  $('paytableClose').addEventListener('click', closeModal);
  $('paytableDone').addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && modal.classList.contains('open')) closeModal(); });
  render();
})();
