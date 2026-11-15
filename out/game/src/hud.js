// Monsoon Market — the DOM HUD. It never touches the simulation; main.js
// pushes numbers in and reads callbacks out. Minimap is a 2D canvas drawn
// from the map's own rectangles, so it can never disagree with the world.
import { WEAPONS, UTILITY, ECONOMY } from './state.js';

const BUY_ITEMS = [
  { id: 'drizzle', label: 'DRIZZLE SMG', price: 1500, note: 'fast · close' },
  { id: 'monsoon', label: 'MONSOON AR', price: 2700, note: 'all-round rifle' },
  { id: 'stallbreaker', label: 'STALLBREAKER', price: 1800, note: '6 pellets · close' },
  { id: 'longrain', label: 'LONG RAIN DMR', price: 3500, note: '80 dmg · slow' },
  { id: 'armor', label: 'KEVLAR', price: 650, note: '+100 armour' },
  { id: 'helm', label: 'HELMET', price: 350, note: 'headshot cover' },
  { id: 'frag', label: 'FRAG', price: 300, note: 'throwable' },
  { id: 'smoke', label: 'SMOKE', price: 300, note: 'block sight' },
  { id: 'flash', label: 'FLASH', price: 200, note: 'blind' },
  { id: 'kit', label: 'DEFUSE KIT', price: 400, note: 'defuse 2.5s' },
];

export function createHud(minimapData, callbacks) {
  const $ = (id) => document.getElementById(id);
  const els = {
    overlay: $('overlay'), overlayTitle: $('overlay-title'), overlayCopy: $('overlay-copy'), play: $('play'),
    crosshair: $('crosshair'), hitmarker: $('hitmarker'),
    hp: $('hp-value'), armor: $('armor-value'), money: $('money-value'),
    ammoMag: $('ammo-mag'), ammoReserve: $('ammo-reserve'), weaponName: $('weapon-name'),
    slots: $('slots'), util: $('util'),
    teamA: $('team-a'), teamB: $('team-b'), timer: $('timer'), round: $('round-label'), plan: $('plan-label'),
    feed: $('feed'), radio: $('radio'),
    banner: $('banner'), bannerTitle: $('banner-title'), bannerSub: $('banner-sub'),
    buy: $('buy'), buyMoney: $('buy-money'), buyGrid: $('buy-grid'),
    minimap: $('minimap'),
    plantBar: $('plant-bar'), plantFill: $('plant-fill'), plantLabel: $('plant-label'),
    carry: $('carry'),
  };
  const mapCtx = els.minimap.getContext('2d');
  let hitTimer = 0;
  let last = {};
  let bannerTimer = 0;

  function setText(el, value, key) {
    if (last[key] !== value) {
      last[key] = value;
      el.textContent = value;
    }
  }

  function buildBuy() {
    els.buyGrid.innerHTML = '';
    for (const item of BUY_ITEMS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'buy-item';
      button.dataset.id = item.id;
      button.innerHTML = `<b>${item.label}</b><span>${item.note}</span><i>$${item.price}</i>`;
      button.addEventListener('click', () => callbacks.onBuy(item.id));
      els.buyGrid.appendChild(button);
    }
  }
  buildBuy();

  return {
    setVitals(hp, armor, hasHelm, money) {
      setText(els.hp, String(Math.max(0, Math.ceil(hp))), 'hp');
      setText(els.armor, `${Math.max(0, Math.ceil(armor))}${hasHelm ? ' +H' : ''}`, 'armor');
      setText(els.money, `$${money}`, 'money');
      els.hp.parentElement.classList.toggle('low', hp <= 25);
    },
    setWeapon(weaponId, mag, reserve, slots, utility) {
      const def = WEAPONS[weaponId];
      setText(els.weaponName, def.name, 'wname');
      setText(els.ammoMag, def.mag === Infinity ? '—' : String(mag), 'mag');
      setText(els.ammoReserve, def.mag === Infinity ? '' : `/ ${reserve}`, 'res');
      const slotHtml = slots.map((s) => `<span class="${s.active ? 'on' : ''}">${s.label}</span>`).join('');
      if (last.slots !== slotHtml) { last.slots = slotHtml; els.slots.innerHTML = slotHtml; }
      const utilHtml = Object.entries(utility).map(([k, v]) => `${UTILITY[k].name} ${v}`).join(' · ');
      if (last.util !== utilHtml) { last.util = utilHtml; els.util.textContent = utilHtml; }
    },
    setTopBar(scoreA, scoreB, timer, round, maxRounds, planText, phase) {
      setText(els.teamA, String(scoreA), 'sa');
      setText(els.teamB, String(scoreB), 'sb');
      const t = Math.max(0, Math.ceil(timer));
      setText(els.timer, `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, 'timer');
      setText(els.round, phase === 'freeze' ? `ROUND ${round} — BUY` : `ROUND ${round} OF ${maxRounds}`, 'round');
      setText(els.plan, planText || '', 'plan');
    },
    setCrosshair(spreadPx) {
      const gap = 5 + Math.min(26, spreadPx);
      els.crosshair.style.setProperty('--gap', `${gap}px`);
    },
    hitMarker(killed) {
      els.hitmarker.classList.add('on');
      els.hitmarker.classList.toggle('kill', killed);
      clearTimeout(hitTimer);
      hitTimer = setTimeout(() => els.hitmarker.classList.remove('on', 'kill'), 110);
    },
    killFeed(text, kind) {
      const div = document.createElement('div');
      div.className = `feed-line ${kind || ''}`;
      div.textContent = text;
      els.feed.prepend(div);
      while (els.feed.children.length > 5) els.feed.lastChild.remove();
      setTimeout(() => div.classList.add('fade'), 4200);
      setTimeout(() => div.remove(), 5200);
    },
    radio(who, text, mine) {
      const div = document.createElement('div');
      div.className = `radio-line${mine ? ' mine' : ''}`;
      div.innerHTML = `<b>${who}</b> ${text}`;
      els.radio.appendChild(div);
      while (els.radio.children.length > 4) els.radio.firstChild.remove();
      setTimeout(() => div.classList.add('fade'), 5000);
      setTimeout(() => div.remove(), 6000);
    },
    clearRadio() {
      els.radio.innerHTML = '';
    },
    clearFeed() {
      els.feed.innerHTML = '';
    },
    showBanner(title, sub, ms = 3500) {
      els.bannerTitle.textContent = title;
      els.bannerSub.textContent = sub || '';
      els.banner.hidden = false;
      clearTimeout(bannerTimer);
      bannerTimer = setTimeout(() => { els.banner.hidden = true; }, ms);
    },
    hideBanner() {
      els.banner.hidden = true;
    },
    flashScreen() {
      const flash = document.getElementById('flash');
      if (!flash) return;
      flash.classList.add('on');
      setTimeout(() => flash.classList.remove('on'), 120);
      setTimeout(() => flash.classList.add('on2'), 130);
      setTimeout(() => flash.classList.remove('on2'), 320);
    },
    showBuy(show, money) {
      els.buy.hidden = !show;
      if (show) setText(els.buyMoney, `$${money}`, 'buymoney');
    },
    setBuyAfford(money) {
      setText(els.buyMoney, `$${money}`, 'buymoney');
      for (const button of els.buyGrid.children) {
        const item = BUY_ITEMS.find((i) => i.id === button.dataset.id);
        button.classList.toggle('poor', money < item.price);
      }
    },
    setPlantBar(show, label, progress) {
      els.plantBar.hidden = !show;
      if (show) {
        els.plantLabel.textContent = label;
        els.plantFill.style.width = `${Math.round(progress * 100)}%`;
      }
    },
    setCarrying(show) {
      els.carry.hidden = !show;
    },
    drawMinimap(G, player) {
      const c = mapCtx;
      const W = els.minimap.width;
      const H = els.minimap.height;
      const { minX, maxX, minZ, maxZ, blocks, sites } = minimapData;
      const px = (x) => ((x - minX) / (maxX - minX)) * W;
      const pz = (z) => ((z - minZ) / (maxZ - minZ)) * H;
      c.clearRect(0, 0, W, H);
      c.fillStyle = 'rgba(10, 12, 24, 0.85)';
      c.fillRect(0, 0, W, H);
      c.fillStyle = '#3b2d33';
      for (const [x1, z1, x2, z2] of blocks) c.fillRect(px(x1), pz(z1), px(x2) - px(x1), pz(z2) - pz(z1));
      c.font = 'bold 11px system-ui, sans-serif';
      c.textAlign = 'center';
      for (const key of ['A', 'B']) {
        const s = sites[key];
        c.fillStyle = key === 'A' ? '#ffb020' : '#22d3ee';
        c.fillRect(px(s.minX), pz(s.minZ), px(s.maxX) - px(s.minX), px(s.maxZ) - pz(s.minZ));
        c.fillStyle = '#0b0e1e';
        c.fillText(key, px(s.x), pz(s.z) + 4);
      }
      for (const a of G.actors) {
        if (!a.alive) continue;
        const x = px(a.body.position.x);
        const y = pz(a.body.position.z);
        if (a.isPlayer) {
          c.save();
          c.translate(x, y);
          c.rotate(-a.body.yaw);
          c.fillStyle = '#ffffff';
          c.beginPath();
          c.moveTo(0, -6);
          c.lineTo(4, 5);
          c.lineTo(-4, 5);
          c.closePath();
          c.fill();
          c.restore();
        } else {
          c.fillStyle = a.team === player.team ? '#3ddc84' : '#ff4d4d';
          c.beginPath();
          c.arc(x, y, 3, 0, Math.PI * 2);
          c.fill();
        }
      }
      // stormcell carrier marker
      const carrier = G.actors.find((a) => a.id === G.stormcell.carrierId && a.alive);
      if (carrier && !G.stormcell.planted) {
        c.strokeStyle = '#ffb020';
        c.lineWidth = 1.5;
        c.beginPath();
        c.arc(px(carrier.body.position.x), pz(carrier.body.position.z), 6, 0, Math.PI * 2);
        c.stroke();
      }
      if (G.stormcell.planted) {
        const s = sites[G.stormcell.site];
        c.fillStyle = '#ff4d4d';
        c.beginPath();
        c.arc(px(s.x), pz(s.z), 5, 0, Math.PI * 2);
        c.fill();
      }
    },
    showOverlay(mode, data) {
      const copy = {
        start: ['MONSOON MARKET', 'Rain-slicked night market. 5v5, plant the Stormcell, first to 7. Click to play.', 'Click to play'],
        paused: ['Paused', 'Click to resume.', 'Click to resume'],
        roundEnd: [`Round ${data?.round || ''} — ${data?.winner || ''}`, data?.reason || '', 'Next round…'],
        matchEnd: [data?.winner === 'attack' ? 'RAINRUNNERS WIN' : data?.winner === 'defend' ? 'STALLKEEPERS WIN' : 'DRAW', data?.score || '', 'Play again'],
      }[mode];
      if (!copy) return;
      els.overlayTitle.textContent = copy[0];
      els.overlayCopy.textContent = copy[1];
      els.play.textContent = copy[2];
      els.overlay.hidden = false;
    },
    hideOverlay() {
      els.overlay.hidden = true;
    },
    onPlay(handler) {
      els.play.addEventListener('click', handler);
    },
  };
}
