const FOCUS_DEF = 50 * 60;
const BREAK_DEF = 10 * 60;
const MAX_F = 60 * 60;
const MAX_B = 15 * 60;
const R = 90;
const CIRC = 2 * Math.PI * R;
const CF = '#B83020';
const CB = '#2E7D52';
const CI = '#3D2B1A';

let mode = 'focus', fSec = FOCUS_DEF, bSec = BREAK_DEF;
let total = FOCUS_DEF, remain = FOCUS_DEF;
let running = false, started = false, session = 0, ticker = null;

const prog = document.getElementById('prog');
const dragFill = document.getElementById('drag-fill');
const dragPrev = document.getElementById('drag-preview');
const timeTxt = document.getElementById('time-text');
const timeInp = document.getElementById('time-inp');
const modeLbl = document.getElementById('mode-lbl');
const playBtn = document.getElementById('play-btn');
const playIcon = document.getElementById('play-icon');
const resetBtn = document.getElementById('reset-btn');
const tabF = document.getElementById('tab-f');
const tabB = document.getElementById('tab-b');
const ringWrap = document.getElementById('ring-wrap');
const dragH = document.getElementById('drag-h');
const banner = document.getElementById('banner');

function fmt(s) {
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

function draw() {
    const pct = total > 0 ? remain / total : 0;
    const deg = 360 * pct - 90;
    const rad = deg * Math.PI / 180;
    dragH.style.left = (105 + R * Math.cos(rad)) + 'px';
    dragH.style.top = (105 + R * Math.sin(rad)) + 'px';

    if (started) {
        prog.setAttribute('opacity', '1');
        prog.setAttribute('stroke', mode === 'focus' ? CF : CB);
        prog.setAttribute('stroke-dashoffset', (CIRC * (1 - pct)).toFixed(2));
        dragH.style.background = mode === 'focus' ? CF : CB;
    } else {
        prog.setAttribute('opacity', '0');
        dragH.style.background = CI;
    }

    timeTxt.textContent = fmt(remain);
    document.title = fmt(remain) + (mode === 'focus' ? ' · 집중' : ' · 휴식');
}

function setIcon(playing) {
    playIcon.innerHTML = playing
        ? '<rect x="5" y="4" width="4.5" height="16" rx="1.5"/><rect x="14.5" y="4" width="4.5" height="16" rx="1.5"/>'
        : '<path d="M6 3.5l13 8.5-13 8.5V3.5z"/>';
}

function updateDots() {
    for (let i = 0; i < 4; i++) {
        document.getElementById('d' + i).className = 'dot' + (i < session ? ' done' : '');
    }
}

function applyMode(m) {
    mode = m;
    total = m === 'focus' ? fSec : bSec;
    remain = total;
    tabF.className = 'tab' + (m === 'focus' ? ' active' : '');
    tabB.className = 'tab' + (m === 'break' ? ' active' : '');
    modeLbl.textContent = m === 'focus' ? '집중' : '휴식';
}

function tick() {
    if (remain <= 0) {
        clearInterval(ticker);
        running = false;
        chime();
        if (mode === 'focus') {
            session = Math.min(session + 1, 4);
            updateDots();
            started = true;
            applyMode('break');
            draw();
            ticker = setInterval(tick, 1000);
            running = true;
            setIcon(true);
            showBanner('집중 완료! 휴식을 시작합니다');
        } else {
            started = false;
            applyMode('focus');
            draw();
            setIcon(false);
            showBanner('휴식 종료 — 새 뽀모도로를 시작하세요');
        }
        return;
    }
    remain--;
    draw();
}

function start() {
    if (running || remain <= 0) return;
    started = true;
    running = true;
    ticker = setInterval(tick, 1000);
    draw();
    setIcon(true);
}

function pause() {
    clearInterval(ticker);
    running = false;
    setIcon(false);
}

function reset() {
    pause();
    started = false;
    applyMode(mode);
    draw();
    setIcon(false);
}

let bannerTimer = null;
function showBanner(msg) {
    banner.textContent = msg;
    banner.classList.add('show');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => banner.classList.remove('show'), 3000);
}

function chime() {
    try {
        const ctx = new AudioContext();
        [[523, 0], [659, 0.2], [784, 0.4]].forEach(([f, t]) => {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.connect(g); g.connect(ctx.destination);
            o.frequency.value = f;
            g.gain.setValueAtTime(0.15, ctx.currentTime + t);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.7);
            o.start(ctx.currentTime + t);
            o.stop(ctx.currentTime + t + 0.8);
        });
    } catch (e) { }
}

playBtn.addEventListener('click', () => { if (running) pause(); else start(); });
resetBtn.addEventListener('click', reset);

tabF.addEventListener('click', () => {
    if (running && !confirm('타이머 실행 중입니다. 중단할까요?')) return;
    pause(); started = false; applyMode('focus'); draw(); setIcon(false);
});
tabB.addEventListener('click', () => {
    if (running && !confirm('타이머 실행 중입니다. 중단할까요?')) return;
    pause(); started = false; applyMode('break'); draw(); setIcon(false);
});

timeTxt.addEventListener('dblclick', () => {
    if (running) return;
    timeTxt.style.display = 'none';
    timeInp.style.display = 'block';
    timeInp.value = fmt(remain);
    timeInp.focus();
    timeInp.select();
});

function commitInp() {
    const val = timeInp.value.trim();
    let s = 0;
    if (val.includes(':')) {
        const [m, sc] = val.split(':').map(Number);
        s = (m || 0) * 60 + (sc || 0);
    } else {
        s = (parseInt(val) || 0) * 60;
    }
    const mx = mode === 'focus' ? MAX_F : MAX_B;
    s = Math.max(60, Math.min(mx, s));
    if (mode === 'focus') fSec = s; else bSec = s;
    total = s; remain = s; started = false;
    timeInp.style.display = 'none';
    timeTxt.style.display = '';
    draw();
}
timeInp.addEventListener('blur', commitInp);
timeInp.addEventListener('keydown', e => { if (e.key === 'Enter') commitInp(); });

/* ── 드래그 ── */
let dragging = false;

function secFrom(cx, cy) {
    const rect = ringWrap.getBoundingClientRect();
    let deg = Math.atan2(cy - (rect.top + 105), cx - (rect.left + 105)) * 180 / Math.PI + 90;
    if (deg < 0) deg += 360;
    const mx = mode === 'focus' ? MAX_F : MAX_B;
    return Math.max(60, Math.min(mx, Math.round((deg / 360) * mx)));
}

function startDrag() {
    if (running) return;
    dragging = true;
    dragH.classList.add('dragging');
    dragPrev.setAttribute('opacity', '0.18');
}

function doDrag(cx, cy) {
    if (!dragging) return;
    const s = secFrom(cx, cy);
    if (mode === 'focus') fSec = s; else bSec = s;
    total = s; remain = s; started = false;

    const pct = s / (mode === 'focus' ? MAX_F : MAX_B);
    dragFill.setAttribute('opacity', '0.55');
    dragFill.setAttribute('stroke-dashoffset', (CIRC * (1 - pct)).toFixed(2));

    draw();
}

function endDrag() {
    if (!dragging) return;
    dragging = false;
    dragH.classList.remove('dragging');
    dragPrev.setAttribute('opacity', '0');
    dragFill.setAttribute('opacity', '0');
}

ringWrap.addEventListener('mousedown', e => { if (e.detail === 2) return; startDrag(); e.preventDefault(); });
document.addEventListener('mousemove', e => { if (dragging) doDrag(e.clientX, e.clientY); });
document.addEventListener('mouseup', endDrag);
ringWrap.addEventListener('touchstart', () => { startDrag(); }, { passive: true });
document.addEventListener('touchmove', e => { if (dragging) doDrag(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
document.addEventListener('touchend', endDrag);

draw();
updateDots();
