/* ============================================================
   UPTIME — the arcade CV of Jan Tommy Gustavsen Zonneveld
   An original vertical shooter in five career stages.
   Vanilla JS + one 240×320 <canvas>. No dependencies, no build.
   ============================================================ */

(() => {
    'use strict';

    const canvas = document.getElementById('game');
    if (!canvas) return;
    const screenCtx = canvas.getContext('2d');
    let g = screenCtx;               // current drawing context (swapped for the boss buffer)

    /* ============================================================
       CONSTANTS & HELPERS
       ============================================================ */
    const W = 240;
    const H = 320;
    const STEP = 1 / 60;
    const TAU = Math.PI * 2;
    const FONT = '"Press Start 2P", ui-monospace, monospace';
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const DEBUG = new URLSearchParams(location.search).has('debug');

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const rand = (a, b) => a + Math.random() * (b - a);
    const pick = (arr, r = Math.random) => arr[Math.floor(r() * arr.length)];
    const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;
    const pad = (n, len = 7) => String(Math.max(0, Math.floor(n))).padStart(len, '0');
    const dashToEn = (s) => s.replace(/(\d)-(\d)/g, '$1–$2');
    const dotted = (s) => s.replace(/ - /g, ' · ');

    function mulberry32(seed) {
        let a = seed >>> 0;
        return () => {
            a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // localStorage can throw (private mode, blocked storage) — never let it break the game
    const store = {
        get(key, fallback) {
            try {
                const v = localStorage.getItem(key);
                return v === null ? fallback : JSON.parse(v);
            } catch {
                return fallback;
            }
        },
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch {
                /* storage unavailable — fine */
            }
        },
    };

    /* ============================================================
       PIXEL ART
       ============================================================ */
    const PAL = {
        k: '#0b0a14', w: '#f8fafc', g: '#94a3b8', G: '#475569', s: '#64748b',
        c: '#22d3ee', C: '#0e7490', b: '#60a5fa', B: '#1d4ed8',
        m: '#f472b6', M: '#be185d', r: '#fb7185', R: '#be123c',
        o: '#fb923c', O: '#c2410c', y: '#fde68a', Y: '#d97706', Z: '#fde047',
        l: '#a3e635', L: '#4d7c0f', t: '#2dd4bf', T: '#0f766e', p: '#c084fc', P: '#7e22ce',
    };

    // Every sprite is original pixel art. 'w' 2×2 blocks listed in `eyes` get googly pupils.
    const SPRITE_DEFS = {
        player: {
            rows: [
                '.......Z.......',
                '.......G.......',
                '...GgggggggG...',
                '...gkkkkkkkg...',
                '...gkcckcckg...',
                '...gkkkkkkkg...',
                '...GgggggggG...',
                '....BbbbbbB....',
                '.B..bbwwwbb..B.',
                'BbB.bbbbbbb.BbB',
                'BbbbbbbbbbbbbbB',
                '.BbbB.bbb.BbbB.',
                '..BB..BBB..BB..',
            ],
        },
        bug: {
            rows: [
                '..k.....k..',
                '...k...k...',
                '..RRRRRRR..',
                '.RrrrrrrrR.',
                'RrwwrrrwwrR',
                'RrwwrrrwwrR',
                '.RrrrrrrrR.',
                'k.RrrrrrR.k',
                '.k.R...R.k.',
            ],
            eyes: [[2, 4], [7, 4]],
        },
        ticket: {
            rows: [
                'YYYYYYYYYYYY',
                'YyyyyyyyyyyY',
                'YywwyyyywwyY',
                'YywwyyyywwyY',
                'YyyyyyyyyyyY',
                'YyGGGGGGGGyY',
                'YyyyyyyyyyyY',
                'YyGGGGGyyyyY',
                'YyyyyyyyyyyY',
                'Y.Y.Y.Y.Y.Y.',
            ],
            eyes: [[2, 2], [8, 2]],
        },
        spam: {
            rows: [
                '.MMMMMMM.',
                'MmmmmmmmM',
                'MmwwmwwmM',
                'MmwwmwwmM',
                'MmmmmmmmM',
                '.MmMmMmM.',
                '..M...M..',
            ],
            eyes: [[2, 2], [5, 2]],
        },
        phish: {
            rows: [
                '....BBBBB....',
                '..BBbbbbbBB.B',
                '.BbwwbbbbbbBB',
                'BbbwwbbbbbbbB',
                'BbbbbbwwwbbbB',
                'BbbbbbbwbbbBB',
                '.BbbbbbbbbBBB',
                '..BBbbbbbBB.B',
                '....BBBBB....',
            ],
            eyes: [[3, 2]],
            mirror: true,
        },
        outage: {
            rows: [
                '....GGG...GGG...',
                '..GGgggG.GgggG..',
                '.GgggggGGgggggG.',
                'GggggggggggggggG',
                'GggwwgggggggwwgG',
                'GggwwgggggggwwgG',
                'GgggggkkkkgggggG',
                'GggggkgggkgggggG',
                '.GGGGGGGGGGGGGG.',
                '....ZZ....ZZ....',
                '...ZZ....ZZ.....',
                '....Z.....Z.....',
            ],
            eyes: [[3, 4], [12, 4]],
        },
        legacy: {
            rows: [
                'GGGGGGGGGGGGGGGG',
                'GggggggggggggggG',
                'GgkkkkkkkkkkkkgG',
                'GgkwwkkkkkkwwkgG',
                'GgkwwkkkkkkwwkgG',
                'GgkkkkrrrrkkkkgG',
                'GgkkkkkkkkkkkkgG',
                'GggggggggggggggG',
                'GgGGGGGGGGGGGGgG',
                'GgGkkkkkkkkkkGgG',
                'GgGGGGGGGGGGGGgG',
                'GgGkkkkkkkkkkGgG',
                'GgGGGGGGGGGGGGgG',
                'GggggggggggggggG',
                'GGGGGGGGGGGGGGGG',
                '.GG..........GG.',
            ],
            eyes: [[3, 3], [11, 3]],
        },
        heart: {
            rows: ['.mm.mm.', 'mmmmmmm', 'mmmmmmm', '.mmmmm.', '..mmm..', '...m...'],
        },
    };

    const ORB_ROWS = ['.aaa.', 'awwwa', 'awwwa', 'awwwa', '.aaa.'];
    const ORB_COLORS = { pink: '#f472b6', orange: '#fb923c', red: '#fb7185', cyan: '#22d3ee', lime: '#a3e635' };

    function makeCanvas(w, h) {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return c;
    }

    function makeSprite(def, extra = {}) {
        const rows = def.rows;
        const h = rows.length;
        const w = rows[0].length;
        const pal = { ...PAL, ...extra };
        const img = makeCanvas(w, h);
        const flash = makeCanvas(w, h);
        const ic = img.getContext('2d');
        const fc = flash.getContext('2d');
        fc.fillStyle = '#ffffff';
        rows.forEach((row, y) => {
            [...row].forEach((ch, x) => {
                if (ch === '.') return;
                ic.fillStyle = pal[ch] || '#ff00ff';
                ic.fillRect(x, y, 1, 1);
                fc.fillRect(x, y, 1, 1);
            });
        });
        let mirror = null;
        if (def.mirror) {
            mirror = makeCanvas(w, h);
            const mc = mirror.getContext('2d');
            mc.translate(w, 0);
            mc.scale(-1, 1);
            mc.drawImage(img, 0, 0);
        }
        return { img, flash, mirror, w, h, eyes: def.eyes || [] };
    }

    const SPR = {};
    for (const [name, def] of Object.entries(SPRITE_DEFS)) SPR[name] = makeSprite(def);
    SPR.playerBlink = makeSprite({ rows: SPRITE_DEFS.player.rows.map((r, i) => (i === 4 ? r.replace(/c/g, 'k') : r)) });
    const ORB = {};
    for (const [name, color] of Object.entries(ORB_COLORS)) ORB[name] = makeSprite({ rows: ORB_ROWS }, { a: color });

    /* ---------- tiny 3×5 pixel font for chips & small labels ---------- */
    const FONT3 = {
        A: '25755', B: '65656', C: '34443', D: '65556', E: '74647', F: '74644', G: '34553', H: '55755',
        I: '72227', J: '11152', K: '55655', L: '44447', M: '57755', N: '65555', O: '25552', P: '65644',
        Q: '25573', R: '65655', S: '34216', T: '72222', U: '55557', V: '55552', W: '55775', X: '55255',
        Y: '55222', Z: '71247',
        0: '75557', 1: '26227', 2: '61247', 3: '61216', 4: '55711', 5: '74616', 6: '34652', 7: '71122',
        8: '25252', 9: '25316',
        '+': '02720', '-': '00700', '.': '00002', ',': '00024', '!': '22202', '?': '61202', ':': '02020',
        '/': '11244', '%': '51245', '#': '57575', '&': '25253', '@': '25743', '(': '12221', ')': '42224',
        "'": '22000', '=': '07070', '_': '00007', '>': '42124', '<': '12421', '*': '05250', '"': '55000',
    };

    function tinyWidth(str, scale = 1) {
        return (str.length * 4 - 1) * scale;
    }

    function tiny(str, x, y, color, align = 'left', scale = 1) {
        const s = String(str).toUpperCase();
        let cx = Math.round(align === 'center' ? x - tinyWidth(s, scale) / 2 : align === 'right' ? x - tinyWidth(s, scale) : x);
        const cy = Math.round(y);
        g.fillStyle = color;
        for (const ch of s) {
            const glyph = FONT3[ch];
            if (glyph) {
                for (let row = 0; row < 5; row++) {
                    const bits = +glyph[row];
                    for (let col = 0; col < 3; col++) {
                        if (bits & (4 >> col)) g.fillRect(cx + col * scale, cy + row * scale, scale, scale);
                    }
                }
            }
            cx += 4 * scale;
        }
    }

    function text(str, x, y, color = '#fff', align = 'left', size = 8, shadow = '#000') {
        g.font = `${size}px ${FONT}`;
        g.textAlign = align;
        g.textBaseline = 'top';
        if (shadow) {
            g.fillStyle = shadow;
            g.fillText(str, Math.round(x) + 1, Math.round(y) + 1);
        }
        g.fillStyle = color;
        g.fillText(str, Math.round(x), Math.round(y));
    }

    function rect(x, y, w, h, color) {
        g.fillStyle = color;
        g.fillRect(Math.round(x), Math.round(y), w, h);
    }

    function disc(cx, cy, r, color) {
        g.fillStyle = color;
        for (let dy = -r; dy <= r; dy++) {
            const dx = Math.floor(Math.sqrt(r * r - dy * dy));
            g.fillRect(Math.round(cx - dx), Math.round(cy + dy), dx * 2 + 1, 1);
        }
    }

    // big googly eye that looks at (lx, ly)
    function bigEye(x, y, r, lx, ly, white = '#f8fafc', pupil = PAL.k, outline = null) {
        if (outline) disc(x, y, r + 1, outline);
        disc(x, y, r, white);
        const a = Math.atan2(ly - y, lx - x);
        const pr = Math.max(1, Math.floor(r * 0.45));
        const reach = r - pr - 0.5;
        disc(x + Math.cos(a) * reach, y + Math.sin(a) * reach, pr, pupil);
    }

    function drawSprite(spr, x, y, { flash = false, flip = false } = {}) {
        const img = flash ? spr.flash : flip && spr.mirror ? spr.mirror : spr.img;
        g.drawImage(img, Math.round(x - spr.w / 2), Math.round(y - spr.h / 2));
    }

    function drawPupils(spr, x, y, lookX, lookY, flip = false) {
        const ox = Math.round(x - spr.w / 2);
        const oy = Math.round(y - spr.h / 2);
        const dx = lookX > x + 1 ? 1 : 0;
        const dy = lookY > y ? 1 : 0;
        g.fillStyle = PAL.k;
        for (const [ex, ey] of spr.eyes) {
            const eX = flip ? spr.w - ex - 2 : ex;
            g.fillRect(ox + eX + dx, oy + ey + dy, 1, 1);
        }
    }

    /* ============================================================
       SOUND — tiny WebAudio synth (sfx + a looping chiptune)
       ============================================================ */
    const Sound = (() => {
        let ac = null;
        let master;
        let sfxBus;
        let musicBus;
        let noiseBuf;
        let muted = !!store.get('uptime.muted', false);
        let seq = null;
        const last = {};
        const VOL = 0.55;

        function ensure() {
            if (!ac) {
                const AC = window.AudioContext || window.webkitAudioContext;
                if (!AC) return false;
                try {
                    ac = new AC();
                } catch {
                    return false;
                }
                master = ac.createGain();
                master.gain.value = muted ? 0 : VOL;
                master.connect(ac.destination);
                sfxBus = ac.createGain();
                sfxBus.gain.value = 0.7;
                sfxBus.connect(master);
                musicBus = ac.createGain();
                musicBus.gain.value = 0.3;
                musicBus.connect(master);
                noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
                const data = noiseBuf.getChannelData(0);
                for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
            }
            if (ac.state === 'suspended') ac.resume();
            return true;
        }

        function osc(t, type, f, f2, dur, vol, bus) {
            const o = ac.createOscillator();
            const gain = ac.createGain();
            o.type = type;
            o.frequency.setValueAtTime(f, t);
            if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
            gain.gain.setValueAtTime(vol, t);
            gain.gain.exponentialRampToValueAtTime(0.0008, t + dur);
            o.connect(gain).connect(bus);
            o.start(t);
            o.stop(t + dur + 0.02);
        }

        function noise(t, dur, vol, freq, freq2, type = 'lowpass', bus = sfxBus) {
            const src = ac.createBufferSource();
            src.buffer = noiseBuf;
            const filter = ac.createBiquadFilter();
            filter.type = type;
            filter.frequency.setValueAtTime(freq, t);
            if (freq2) filter.frequency.exponentialRampToValueAtTime(freq2, t + dur);
            const gain = ac.createGain();
            gain.gain.setValueAtTime(vol, t);
            gain.gain.exponentialRampToValueAtTime(0.0008, t + dur);
            src.connect(filter).connect(gain).connect(bus);
            src.start(t);
            src.stop(t + dur + 0.02);
        }

        const note = (base, semis) => base * 2 ** (semis / 12);
        const SFX = {
            shoot: (t) => osc(t, 'square', 1500, 700, 0.04, 0.022, sfxBus),
            pop: (t) => {
                noise(t, 0.14, 0.2, 3000, 300);
                osc(t, 'triangle', 320, 70, 0.12, 0.1, sfxBus);
            },
            boom: (t) => {
                noise(t, 0.7, 0.42, 1800, 50);
                osc(t, 'sine', 150, 30, 0.6, 0.32, sfxBus);
            },
            hurt: (t) => {
                osc(t, 'sawtooth', 520, 50, 0.6, 0.15, sfxBus);
                noise(t, 0.5, 0.3, 1200, 80);
            },
            shield: (t) => osc(t, 'square', 900, 180, 0.28, 0.08, sfxBus),
            pickup: (t) => [0, 4, 7, 12].forEach((n, i) => osc(t + i * 0.05, 'square', note(660, n), null, 0.08, 0.06, sfxBus)),
            cert: (t) => [0, 7, 12, 16, 19].forEach((n, i) => osc(t + i * 0.06, 'triangle', note(523, n), null, 0.16, 0.12, sfxBus)),
            bomb: (t) => {
                noise(t, 1.3, 0.45, 4000, 50);
                osc(t, 'sawtooth', 220, 25, 1.1, 0.14, sfxBus);
            },
            warn: (t) => {
                for (let i = 0; i < 4; i++) osc(t + i * 0.4, 'square', 880, 440, 0.34, 0.06, sfxBus);
            },
            beam: (t) => {
                osc(t, 'sawtooth', 90, 60, 0.55, 0.08, sfxBus);
                noise(t, 0.5, 0.12, 6000, 800, 'highpass');
            },
            clear: (t) => [0, 4, 7, 12, 7, 12, 16].forEach((n, i) => osc(t + i * 0.09, 'square', note(523, n), null, 0.13, 0.07, sfxBus)),
            coin: (t) => {
                osc(t, 'square', 988, null, 0.07, 0.07, sfxBus);
                osc(t + 0.07, 'square', 1319, null, 0.3, 0.07, sfxBus);
            },
            select: (t) => osc(t, 'square', 740, null, 0.05, 0.04, sfxBus),
            over: (t) => [7, 4, 0, -5].forEach((n, i) => osc(t + i * 0.22, 'triangle', note(330, n), null, 0.3, 0.13, sfxBus)),
        };

        function sfx(name) {
            if (!ac || muted || !SFX[name]) return;
            const now = ac.currentTime;
            const gap = name === 'shoot' ? 0.09 : name === 'pop' ? 0.05 : 0.03;
            if (last[name] && now - last[name] < gap) return;
            last[name] = now;
            SFX[name](now);
        }

        /* ---------- music: original arpeggio loops ---------- */
        const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
        const SONGS = {
            stage: { bpm: 128, prog: [[57, 0], [53, 1], [48, 1], [55, 1]] },  // i – VI – III – VII
            boss: { bpm: 152, prog: [[57, 0], [58, 1], [57, 0], [55, 1]] },
            title: { bpm: 104, prog: [[57, 0], [52, 0], [53, 1], [55, 1]] },
        };
        const ARP = [0, 1, 2, 3, 2, 1, 2, 3];

        function scheduleStep(t, step) {
            const song = SONGS[seq.song];
            const bar = Math.floor(step / 16) % song.prog.length;
            const st = step % 16;
            const [root0, major] = song.prog[bar];
            const root = root0 + seq.key;
            const chord = [0, major ? 4 : 3, 7, 12];
            const len = 60 / song.bpm / 4;
            if (st % 2 === 0) osc(t, 'triangle', mtof(root - (st % 4 === 0 ? 24 : 12)), null, len * 1.8, 0.16, musicBus);
            osc(t, 'square', mtof(root + 12 + chord[ARP[st % 8]]), null, len * 0.9, 0.032, musicBus);
            if (seq.song !== 'title') {
                if (st % 8 === 0) osc(t, 'sine', 150, 40, 0.12, 0.32, musicBus);
                if (st % 8 === 4) noise(t, 0.1, 0.1, 2500, null, 'highpass', musicBus);
                if (st % 2 === 1) noise(t, 0.03, 0.025, 8000, null, 'highpass', musicBus);
            }
        }

        function tick() {
            if (!seq || !ac) return;
            const len = 60 / SONGS[seq.song].bpm / 4;
            if (seq.next < ac.currentTime - 0.2) seq.next = ac.currentTime + 0.05;
            while (seq.next < ac.currentTime + 0.12) {
                if (!muted) scheduleStep(seq.next, seq.step);
                seq.next += len;
                seq.step++;
            }
        }

        function music(song, key = 0) {
            stopMusic();
            if (!ac) return;
            seq = { song, key, step: 0, next: ac.currentTime + 0.08, timer: setInterval(tick, 25) };
        }

        function stopMusic() {
            if (seq) clearInterval(seq.timer);
            seq = null;
        }

        function pauseMusic(paused) {
            if (!seq) return;
            clearInterval(seq.timer);
            if (!paused && ac) {
                seq.next = ac.currentTime + 0.05;
                seq.timer = setInterval(tick, 25);
            }
        }

        function setMuted(m) {
            muted = m;
            store.set('uptime.muted', m);
            if (master) master.gain.setTargetAtTime(m ? 0 : VOL, ac.currentTime, 0.02);
        }

        return { ensure, sfx, music, stopMusic, pauseMusic, setMuted, isMuted: () => muted };
    })();

    /* ============================================================
       GAME DATA — the CV, as levels
       ============================================================ */
    const EFFECTS = {
        rapid: { color: '#fb923c', dark: '#7c2d12', label: 'RAPID FIRE' },
        spread: { color: '#c084fc', dark: '#581c87', label: 'SPREAD SHOT' },
        drone: { color: '#60a5fa', dark: '#1e3a8a', label: 'AUTOMATION DRONE' },
        shield: { color: '#2dd4bf', dark: '#134e4a', label: 'SHIELD' },
        homing: { color: '#a3e635', dark: '#365314', label: 'AI-GUIDED MISSILES' },
        life: { color: '#f472b6', dark: '#831843', label: '+1 LIFE' },
        cert: { color: '#fde047', dark: '#713f12', label: 'CERT UNLOCKED' },
        repo: { color: '#e2e8f0', dark: '#334155', label: 'REPO UNLOCKED' },
    };

    const chip = (code, effect, name, note, url = null) => ({ code, effect, name, note, url });

    const STAGES = [
        {
            name: 'HELPDESK',
            when: '2004-2006',
            role: 'IT Apprentice',
            org: 'UECC',
            sub: 'IT APPRENTICE @ UECC',
            blurb: 'Helpdesk, support and maintenance of IT systems. Where it all started.',
            theme: { bg: '#090d1f', line: 'rgba(56, 189, 248, 0.10)', kind: 'grid' },
            pool: ['ticket', 'bug', 'ticket', 'spam'],
            heavy: ['outage'],
            waves: 12,
            gap: 2.6,
            seed: 3,
            chips: [
                chip('HD', 'rapid', 'Helpdesk', 'First-line support and troubleshooting'),
                chip('HW', 'spread', 'Hardware', 'Maintenance of IT systems'),
                chip('SUP', 'shield', 'User support', 'Keeping people productive'),
            ],
            boss: { kind: 'queue', name: 'THE QUEUE', hp: 150 },
        },
        {
            name: 'SALES & SERVICE',
            when: '2008-2019',
            role: 'Key accounts, B2B advisory & installs',
            org: 'PS.no · Telehuset · Terjesen · Power',
            sub: 'PS.NO - TELEHUSET - TERJESEN - POWER',
            blurb: 'Business customers, ICT advisory, network and fiber installs, PC and mobile repair.',
            theme: { bg: '#140a1f', line: 'rgba(244, 114, 182, 0.07)', kind: 'stripes' },
            pool: ['spam', 'phish', 'bug', 'spam', 'ticket'],
            heavy: ['outage'],
            waves: 14,
            gap: 2.4,
            seed: 8,
            chips: [
                chip('KAM', 'rapid', 'Key account management', 'Business customers and larger deliveries'),
                chip('B2B', 'spread', 'B2B advisory', 'Selling and installing ICT solutions'),
                chip('PC', 'drone', 'PC & mobile repair', 'Fixing things so people can work'),
                chip('NET', 'shield', 'Network installs', 'Networks, fiber, satellite and surveillance'),
                chip('CAFE', 'life', 'Coffee', 'Retail hours are long'),
            ],
            boss: { kind: 'target', name: 'QUARTERLY TARGET', hp: 240 },
        },
        {
            name: 'FIBER',
            when: '2019-2021',
            role: 'Fiber Technician',
            org: 'New Connection',
            sub: 'FIBER TECHNICIAN @ NEW CONNECTION',
            blurb: 'Installing, blowing and splicing fiber — and documenting every metre of it.',
            theme: { bg: '#04141a', line: 'rgba(34, 211, 238, 0.10)', kind: 'fiber' },
            pool: ['bug', 'phish', 'spam', 'bug'],
            heavy: ['tangle'],
            waves: 14,
            gap: 2.4,
            seed: 21,
            chips: [
                chip('FIBR', 'rapid', 'Fiber splicing', 'More bandwidth! Installation, blowing and splicing'),
                chip('OPS', 'spread', 'Network operations', 'Operating fiber networks'),
                chip('DOC', 'shield', 'Documentation', 'If it is not documented, it does not exist'),
            ],
            boss: { kind: 'kraken', name: 'CABLE KRAKEN', hp: 320 },
        },
        {
            name: 'FAGSKOLE',
            when: 'CLASS OF 2024',
            role: 'Higher Vocational Degree, IT Operations',
            org: 'TISIP Fagskole · 120 ECTS',
            sub: 'IT OPERATIONS DEGREE @ TISIP',
            blurb: 'NQF level 5.2 — top grades in programming, automation, Linux, Microsoft 365 and ethical hacking.',
            theme: { bg: '#0b1410', line: 'rgba(163, 230, 53, 0.08)', kind: 'paper' },
            pool: ['bug', 'phish', 'spam', 'ticket'],
            heavy: ['outage', 'tangle'],
            waves: 16,
            gap: 2.3,
            seed: 34,
            chips: [
                chip('PY', 'rapid', 'Python', 'Grade A'),
                chip('PS', 'drone', 'PowerShell automation', 'Grade A - automate the boring stuff'),
                chip('IAC', 'spread', 'Infrastructure as Code', 'Terraform - count = 3'),
                chip('CSCO', 'cert', 'Networking Basics', 'Cisco - 2022'),
                chip('LNX', 'rapid', 'Linux', 'Grade A'),
                chip('SEC', 'shield', 'Cybersecurity & ethical hacking', 'Grade A'),
                chip('GOOG', 'cert', 'Google IT Support', 'Google - 2023'),
                chip('JAVA', 'life', 'Java', 'Grade A - and the coffee'),
                chip('CC', 'cert', 'Certified in Cybersecurity', 'ISC2 - 2024'),
            ],
            boss: { kind: 'exam', name: 'THE FINAL EXAM', hp: 400 },
        },
        {
            name: 'CLOUD & AI',
            when: 'NOW',
            role: 'IT Operations, Microsoft 365 & Azure AI',
            org: 'IKT Agder',
            sub: 'IT OPERATIONS & AI @ IKT AGDER',
            blurb: 'Supporting municipalities on Microsoft 365 and Entra ID — and building secure RAG assistants on Azure OpenAI.',
            theme: { bg: '#070b24', line: 'rgba(96, 165, 250, 0.10)', kind: 'cloud' },
            pool: ['phish', 'spam', 'bug', 'phish'],
            heavy: ['legacy', 'outage'],
            waves: 18,
            gap: 2.25,
            seed: 55,
            chips: [
                chip('M365', 'shield', 'Microsoft 365', 'Support for several municipalities'),
                chip('AZ', 'rapid', 'Microsoft Azure', 'Platform, identity and networking'),
                chip('AI', 'homing', 'Azure OpenAI', 'RAG with Azure AI Search - grounded answers'),
                chip('REPO', 'repo', 'azure-ai-terraform-demo', 'Terraform + Azure OpenAI', 'https://github.com/jtg86/azure-ai-terraform-demo'),
                chip('ID', 'shield', 'Microsoft Entra ID', 'Identity, access and security trimming'),
                chip('3016', 'cert', 'AI-3016: Generative AI apps in Azure AI Foundry', 'Microsoft - 2026'),
                chip('TF', 'spread', 'Terraform', 'Infrastructure end-to-end'),
                chip('REPO', 'repo', 'M365 Admin Tool', 'PowerShell 7 + WPF', 'https://github.com/jtg86/365SharedMailandDistributionGroupsTool'),
                chip('MCP', 'homing', 'MCP & AI agents', 'Agents that use real tools'),
                chip('3026', 'cert', 'AI-3026: Develop AI agents on Azure', 'Microsoft'),
                chip('REPO', 'repo', 'ticket-ai-classifier', 'ML ticket routing', 'https://github.com/jtg86/ticket-ai-classifier'),
                chip('DOCK', 'cert', 'Docker Foundations', 'Docker'),
                chip('REPO', 'repo', 'Arendal Museum 3D', 'Three.js - live demo', '/museum/'),
                chip('REPO', 'repo', 'NilexViewer', 'Flask + Azure Cosmos DB', 'https://github.com/jtg86/NilexViewer'),
            ],
            boss: { kind: 'monolith', name: 'LEGACY MONOLITH', hp: 560 },
        },
    ];
    STAGES.forEach((s, si) => s.chips.forEach((c, ci) => { c.id = `${si}-${ci}`; }));
    const TOTAL_CHIPS = STAGES.reduce((n, s) => n + s.chips.length, 0);
    const TITLE_THEME = { bg: '#0a0720', line: 'rgba(192, 132, 252, 0.10)', kind: 'grid' };
    const MUSIC_KEYS = [0, 3, -2, 5, 2];

    const ENEMY_TYPES = {
        bug: { spr: 'bug', hp: 1, score: 100, speed: 46, move: 'sine', r: 5 },
        ticket: { spr: 'ticket', hp: 2, score: 150, speed: 32, move: 'down', r: 6 },
        spam: { spr: 'spam', hp: 1, score: 80, speed: 62, move: 'down', r: 4 },
        phish: { spr: 'phish', hp: 2, score: 200, speed: 48, move: 'swim', r: 6, shoot: { kind: 'aimed', every: 2.8, n: 1 } },
        outage: { spr: 'outage', hp: 9, score: 500, speed: 40, move: 'hover', r: 8, shoot: { kind: 'aimed', every: 1.8, n: 3 } },
        tangle: { spr: null, hp: 10, score: 600, speed: 28, move: 'hover', r: 9, shoot: { kind: 'ring', every: 2.3, n: 8 } },
        legacy: { spr: 'legacy', hp: 16, score: 900, speed: 24, move: 'hover', r: 9, shoot: { kind: 'fan', every: 2.4, n: 5 } },
    };

    const BOSSES = {
        queue: { hw: 36, hh: 29, oy: -7, ty: 74, win: 'QUEUE: 0 TICKETS' },
        target: { hw: 26, hh: 26, oy: 0, ty: 76, win: 'TARGET HIT: 120%' },
        kraken: { hw: 19, hh: 19, oy: 0, ty: 62, win: 'LINK RESTORED' },
        exam: { hw: 28, hh: 34, oy: 0, ty: 76, win: 'GRADE: A' },
        monolith: { hw: 42, hh: 30, oy: 0, ty: 70, win: 'MIGRATED TO CLOUD' },
    };

    const FIRE_RATE = [6.5, 8.5, 10.5, 12.5];
    const SPREAD = [[0], [-0.13, 0, 0.13], [-0.26, -0.13, 0, 0.13, 0.26]];
    const MAX = { rapid: 3, spread: 2, drone: 2, homing: 2, life: 5 };

    /* ============================================================
       STATE
       ============================================================ */
    const state = {
        mode: 'title',          // title | game | clear | over | ending
        paused: false,
        stageIdx: 0,
        phase: 'intro',         // intro | waves | warning | boss | outro
        phaseT: 0,
        stageT: 0,
        timeline: null,
        evIdx: 0,
        rng: Math.random,
        pending: [],
        enemies: [],
        pBullets: [],
        eBullets: [],
        pickups: [],
        particles: [],
        popups: [],
        boss: null,
        score: 0,
        hits: 0,
        loot: new Set(),
        stageLoot: [],
        credits: 0,
        shake: 0,
        flash: 0,
        bomb: null,
        toast: null,
        toastQueue: [],
        time: 0,
        overT: 0,
        stars: [],
        clouds: [],
        attract: [],
        scoreSaved: true,
        visGrace: 0,
        hi: 0,
    };

    const P = {
        x: W / 2, y: H - 40, alive: true, inv: 0, fireT: 0, respawnT: 0,
        rapid: 0, spread: 0, drones: 0, homing: 0, shield: false,
        lives: 3, bombs: 2, homingT: 0,
        droneState: [{ x: W / 2, y: H, t: 0 }, { x: W / 2, y: H, t: 0.17 }],
    };

    for (let i = 0; i < 70; i++) state.stars.push({ x: rand(0, W), y: rand(0, H), z: pick([1, 1, 1, 2, 2, 3]) });
    for (let i = 0; i < 6; i++) state.clouds.push({ x: rand(-20, W), y: rand(0, H), w: rand(30, 60), s: rand(8, 16) });

    /* ============================================================
       INPUT — keyboard, pointer drag, gamepad
       ============================================================ */
    const keys = new Set();
    const KEYMAP = {
        ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
        ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    };
    const BOMB_KEYS = new Set(['KeyX', 'KeyB', 'KeyK', 'ShiftLeft', 'ShiftRight']);
    const padAxes = { x: 0, y: 0 };
    const padPrev = {};
    const drag = { active: false, id: null, sx: 0, sy: 0, px: 0, py: 0, tx: 0, ty: 0 };

    const isField = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    const isControl = (el) => el && (isField(el) || el.tagName === 'BUTTON' || el.tagName === 'A');
    const playing = () => state.mode === 'game' && !state.paused;

    addEventListener('keydown', (e) => {
        if (isField(e.target)) return;
        const dir = KEYMAP[e.code];

        if (playing()) {
            if (dir || e.code === 'Space' || BOMB_KEYS.has(e.code)) e.preventDefault();
            if (dir) keys.add(dir);
            if (BOMB_KEYS.has(e.code) && !e.repeat) useBomb();
        }

        if (e.code === 'KeyP' || e.code === 'Escape') {
            if (state.mode === 'game') {
                e.preventDefault();
                togglePause();
            } else if (!ui.how.hidden) {
                showTitle();
            }
        } else if (e.code === 'KeyM' && !e.repeat) {
            toggleMute();
        } else if ((e.code === 'Enter' || e.code === 'Space') && !isControl(e.target) && !e.repeat) {
            if (confirmAction()) e.preventDefault();
        }
    });

    addEventListener('keyup', (e) => {
        const dir = KEYMAP[e.code];
        if (dir) keys.delete(dir);
    });

    addEventListener('blur', () => keys.clear());

    function confirmAction() {
        if (state.mode === 'title' && ui.how.hidden && isScreenVisible()) {
            startGame(0);
            return true;
        }
        if (state.mode === 'clear') {
            nextStage();
            return true;
        }
        if (state.mode === 'over') {
            continueGame();
            return true;
        }
        return false;
    }

    function screenScale() {
        return W / canvas.getBoundingClientRect().width;
    }

    canvas.addEventListener('pointerdown', (e) => {
        if (!playing()) return;
        Sound.ensure();
        drag.active = true;
        drag.id = e.pointerId;
        drag.sx = e.clientX;
        drag.sy = e.clientY;
        drag.px = P.x;
        drag.py = P.y;
        drag.tx = P.x;
        drag.ty = P.y;
        try {
            canvas.setPointerCapture(e.pointerId);
        } catch {
            /* not critical */
        }
        e.preventDefault();
    });

    canvas.addEventListener('pointermove', (e) => {
        if (!drag.active || e.pointerId !== drag.id) return;
        const s = screenScale() * 1.15;
        const dx = (e.clientX - drag.sx) * s;
        const dy = (e.clientY - drag.sy) * s;
        let tx = drag.px + dx;
        let ty = drag.py + dy;
        // rebase so dragging back from an edge responds immediately
        const cx = clamp(tx, 8, W - 8);
        const cy = clamp(ty, 28, H - 12);
        if (cx !== tx) drag.px = cx - dx;
        if (cy !== ty) drag.py = cy - dy;
        tx = cx;
        ty = cy;
        drag.tx = tx;
        drag.ty = ty;
    });

    const endDrag = (e) => {
        if (e.pointerId === drag.id) drag.active = false;
    };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    function pollGamepad() {
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        let gp = null;
        for (const p of pads) {
            if (p) {
                gp = p;
                break;
            }
        }
        if (!gp) {
            padAxes.x = 0;
            padAxes.y = 0;
            return;
        }
        const pressed = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
        const ax = gp.axes[0] || 0;
        const ay = gp.axes[1] || 0;
        padAxes.x = (Math.abs(ax) > 0.25 ? ax : 0) + (pressed(15) ? 1 : 0) - (pressed(14) ? 1 : 0);
        padAxes.y = (Math.abs(ay) > 0.25 ? ay : 0) + (pressed(13) ? 1 : 0) - (pressed(12) ? 1 : 0);
        const edge = (i) => {
            const now = pressed(i);
            const was = padPrev[i];
            padPrev[i] = now;
            return now && !was;
        };
        const bombEdge = [0, 1, 2].map(edge).some(Boolean);
        const startEdge = edge(9);
        if (bombEdge) {
            if (playing()) useBomb();
            else confirmAction();
        }
        if (startEdge) {
            if (state.mode === 'game') togglePause();
            else confirmAction();
        }
    }

    /* ============================================================
       SPAWNING
       ============================================================ */
    function later(delay, fn) {
        state.pending.push({ t: delay, fn });
    }

    function spawnEnemy(type, x, y, opts = {}) {
        const def = ENEMY_TYPES[type];
        const lvl = state.stageIdx;
        const e = {
            type,
            def,
            x,
            y,
            x0: x,
            t: 0,
            hp: Math.round(def.hp * (1 + lvl * 0.25)),
            vy: def.speed * (1 + lvl * 0.05),
            move: opts.move || def.move,
            dir: opts.dir || 1,
            flash: 0,
            fireT: def.shoot ? def.shoot.every * rand(0.4, 1) : 0,
            phase: rand(0, TAU),
            targetY: opts.targetY || rand(46, 96),
            hold: rand(6.5, 8.5),
            flip: false,
            dead: false,
        };
        state.enemies.push(e);
        return e;
    }

    const FORMATIONS = {
        line(type, r) {
            const n = 4 + Math.floor(r() * 3);
            for (let i = 0; i < n; i++) spawnEnemy(type, (W / (n + 1)) * (i + 1), -10 - (i % 2) * 8);
        },
        vee(type, r) {
            const cx = 60 + r() * 120;
            for (let i = -2; i <= 2; i++) spawnEnemy(type, cx + i * 16, -10 - Math.abs(i) * 12);
        },
        column(type, r) {
            const x = 30 + r() * 180;
            for (let i = 0; i < 5; i++) later(i * 0.32, () => spawnEnemy(type, x, -10, { move: 'sine' }));
        },
        sweep(type, r) {
            const left = r() < 0.5;
            const y = 26 + r() * 50;
            for (let i = 0; i < 6; i++) {
                later(i * 0.28, () => spawnEnemy(type, left ? -8 : W + 8, y, { move: 'sweep', dir: left ? 1 : -1 }));
            }
        },
        rain(type, r) {
            for (let i = 0; i < 7; i++) {
                const x = 16 + r() * 208;
                later(i * 0.3, () => spawnEnemy(type, x, -10));
            }
        },
        dive(type, r) {
            const x = 40 + r() * 160;
            for (let i = 0; i < 4; i++) later(i * 0.4, () => spawnEnemy(type, x + (i % 2 ? 12 : -12), -10, { move: 'dive' }));
        },
        heavy(type, r) {
            spawnEnemy(type, 50 + r() * 140, -16, { move: 'hover' });
        },
    };

    function buildTimeline(stage, idx) {
        const r = mulberry32(stage.seed * 7919 + 17);
        const kinds = ['line', 'vee', 'column', 'sweep', 'rain'];
        if (idx >= 1) kinds.push('dive');
        if (idx >= 3) kinds.push('sweep', 'dive');
        const ev = [];
        let t = 0.8;
        for (let i = 0; i < stage.waves; i++) {
            if (i % 4 === 3) ev.push({ t, f: 'heavy', type: pick(stage.heavy, r) });
            else ev.push({ t, f: pick(kinds, r), type: pick(stage.pool, r) });
            t += stage.gap * (0.85 + r() * 0.3);
        }
        const end = t;
        const n = stage.chips.length;
        stage.chips.forEach((c, i) => ev.push({ t: 3 + ((end - 7) * (i + 0.5)) / n, chip: c }));
        ev.sort((a, b) => a.t - b.t);
        return { ev, end };
    }

    function runEvent(ev) {
        if (ev.chip) spawnPickup(ev.chip);
        else FORMATIONS[ev.f](ev.type, state.rng);
    }

    function spawnPickup(c) {
        state.pickups.push({ chip: c, x: rand(30, W - 30), y: -10, t: rand(0, TAU) });
    }

    /* ============================================================
       BULLETS
       ============================================================ */
    function eBullet(x, y, vx, vy, o = {}) {
        state.eBullets.push({ x, y, vx, vy, r: o.letter ? 3 : 2, spr: o.spr || 'pink', letter: o.letter || null, dead: false });
    }

    const aimAt = (x, y) => Math.atan2(P.y - y, P.x - x);

    function aimed(x, y, spd, o) {
        const a = aimAt(x, y);
        eBullet(x, y, Math.cos(a) * spd, Math.sin(a) * spd, o);
    }

    function fan(x, y, n, spread, spd, angle = aimAt(x, y), o) {
        for (let i = 0; i < n; i++) {
            const a = angle + (n === 1 ? 0 : (i / (n - 1) - 0.5) * spread);
            eBullet(x, y, Math.cos(a) * spd, Math.sin(a) * spd, o);
        }
    }

    function ring(x, y, n, spd, off = 0, o) {
        for (let i = 0; i < n; i++) {
            const a = off + (i / n) * TAU;
            eBullet(x, y, Math.cos(a) * spd, Math.sin(a) * spd, o);
        }
    }

    function burst(x, y, n, spd, o) {
        for (let i = 0; i < n; i++) later(i * 0.11, () => aimed(x, y, spd, o));
    }

    const enemyBulletSpeed = () => 62 + state.stageIdx * 7;

    /* ============================================================
       EFFECTS
       ============================================================ */
    function explode(x, y, colors, n = 14, spd = 90) {
        for (let i = 0; i < n; i++) {
            const a = rand(0, TAU);
            const s = rand(0.25, 1) * spd;
            const life = rand(0.25, 0.75);
            state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, color: pick(colors), size: Math.random() < 0.3 ? 2 : 1 });
        }
    }

    function popup(x, y, str, color = '#fff') {
        state.popups.push({ x, y, str, color, life: 0.9 });
    }

    function shake(amount) {
        state.shake = Math.max(state.shake, amount);
    }

    function flash(amount) {
        state.flash = Math.max(state.flash, amount);
    }

    function showToast(c, maxed) {
        const fx = EFFECTS[c.effect];
        state.toastQueue.push({ c, fx, maxed, t: 0 });
        if (!state.toast) state.toast = state.toastQueue.shift();
    }

    /* ============================================================
       PLAYER
       ============================================================ */
    function resetPlayer() {
        Object.assign(P, {
            x: W / 2, y: H - 36, alive: true, inv: 0, fireT: 0, respawnT: 0,
            rapid: 0, spread: 0, drones: 0, homing: 0, shield: false, lives: 3, bombs: 2, homingT: 0,
        });
    }

    // Starting mid-career (stage select / continue) grants the power of the earlier stages
    function grantPowerFor(idx) {
        for (let s = 0; s < idx; s++) {
            for (const c of STAGES[s].chips) {
                if (c.effect === 'rapid') P.rapid = Math.min(MAX.rapid, P.rapid + 1);
                if (c.effect === 'spread') P.spread = Math.min(MAX.spread, P.spread + 1);
                if (c.effect === 'drone') P.drones = Math.min(MAX.drone, P.drones + 1);
                if (c.effect === 'shield') P.shield = true;
            }
        }
    }

    function nearestTarget(x, y) {
        let best = null;
        let bd = Infinity;
        for (const e of state.enemies) {
            if (e.dead || e.y < 4) continue;
            const d = dist2(x, y, e.x, e.y);
            if (d < bd) {
                bd = d;
                best = e;
            }
        }
        const b = state.boss;
        if (b && !b.entering && !b.dead) {
            const d = dist2(x, y, b.x, b.y) * 0.6;
            if (d < bd) best = b;
        }
        return best;
    }

    function updatePlayer(dt) {
        if (!P.alive) {
            if (P.lives <= 0) {
                state.overT -= dt;
                if (state.overT <= 0) gameOver();
            } else {
                P.respawnT -= dt;
                if (P.respawnT <= 0) {
                    P.alive = true;
                    P.x = W / 2;
                    P.y = H - 30;
                    P.inv = 2.5;
                    drag.active = false;
                }
            }
            return;
        }
        P.inv = Math.max(0, P.inv - dt);

        let ix = padAxes.x;
        let iy = padAxes.y;
        if (keys.has('left')) ix -= 1;
        if (keys.has('right')) ix += 1;
        if (keys.has('up')) iy -= 1;
        if (keys.has('down')) iy += 1;
        const len = Math.hypot(ix, iy);
        if (len > 1) {
            ix /= len;
            iy /= len;
        }
        if (drag.active) {
            const dx = drag.tx - P.x;
            const dy = drag.ty - P.y;
            const d = Math.hypot(dx, dy);
            const max = 460 * dt;
            if (d > max) {
                P.x += (dx / d) * max;
                P.y += (dy / d) * max;
            } else {
                P.x = drag.tx;
                P.y = drag.ty;
            }
        } else {
            P.x += ix * 125 * dt;
            P.y += iy * 125 * dt;
        }
        P.x = clamp(P.x, 8, W - 8);
        P.y = clamp(P.y, 28, H - 12);

        // main gun — always on
        P.fireT -= dt;
        if (P.fireT < -0.1) P.fireT = 0;
        if (P.fireT <= 0) {
            P.fireT += 1 / FIRE_RATE[P.rapid];
            for (const a of SPREAD[P.spread]) {
                state.pBullets.push({ x: P.x + a * 20, y: P.y - 8, vx: Math.sin(a) * 320, vy: -Math.cos(a) * 320, dmg: 1, kind: 'shot' });
            }
            Sound.sfx('shoot');
        }

        // automation drones — auto-target the nearest threat
        for (let i = 0; i < P.drones; i++) {
            const d = P.droneState[i];
            const k = 1 - Math.pow(0.0004, dt);
            d.x = lerp(d.x, P.x + (i === 0 ? -16 : 16), k);
            d.y = lerp(d.y, P.y + 7, k);
            d.t -= dt;
            if (d.t <= 0) {
                d.t = 0.34;
                const tg = nearestTarget(d.x, d.y);
                const a = tg ? Math.atan2(tg.y - d.y, tg.x - d.x) : -Math.PI / 2;
                state.pBullets.push({ x: d.x, y: d.y - 3, vx: Math.cos(a) * 280, vy: Math.sin(a) * 280, dmg: 1, kind: 'drone' });
            }
        }

        // AI-guided missiles
        if (P.homing > 0) {
            P.homingT -= dt;
            if (P.homingT <= 0) {
                P.homingT = 0.85;
                const n = P.homing * 2;
                for (let i = 0; i < n; i++) {
                    const side = i % 2 ? 1 : -1;
                    state.pBullets.push({ x: P.x + side * 6, y: P.y, vx: side * (55 + i * 12), vy: -70, dmg: 2, kind: 'missile', life: 2.2 });
                }
            }
        }
    }

    function hurtPlayer() {
        if (!P.alive || P.inv > 0 || P.god || state.phase === 'outro') return;
        state.hits++;
        if (P.shield) {
            P.shield = false;
            P.inv = 1.3;
            explode(P.x, P.y, ['#2dd4bf', '#99f6e4', '#fff'], 18, 110);
            shake(3);
            Sound.sfx('shield');
            return;
        }
        P.alive = false;
        P.lives--;
        explode(P.x, P.y, ['#22d3ee', '#60a5fa', '#fde047', '#fff'], 44, 150);
        shake(7);
        flash(0.5);
        Sound.sfx('hurt');
        state.eBullets.length = 0;
        P.rapid = Math.max(0, P.rapid - 1);
        P.spread = Math.max(0, P.spread - 1);
        P.homing = Math.max(0, P.homing - 1);
        if (P.lives <= 0) state.overT = 1.8;
        else P.respawnT = 1.2;
    }

    function useBomb() {
        if (!playing() || !P.alive || P.bombs <= 0 || (state.bomb && state.bomb.t < 1.2)) return;
        P.bombs--;
        let destroyed = state.eBullets.length;
        state.eBullets.length = 0;
        for (const e of state.enemies) {
            if (e.y > -4) {
                damageEnemy(e, 25);
                if (e.dead) destroyed++;
            }
        }
        if (state.boss) damageBoss(45);
        state.bomb = { x: P.x, y: P.y, t: 0, n: destroyed };
        P.inv = Math.max(P.inv, 1.6);
        shake(5);
        flash(0.7);
        Sound.sfx('bomb');
        updateDeck();
    }

    function collect(p) {
        const c = p.chip;
        const fx = EFFECTS[c.effect];
        let bonus = 500;
        let maxed = false;
        switch (c.effect) {
            case 'rapid':
                if (P.rapid < MAX.rapid) P.rapid++;
                else maxed = true;
                break;
            case 'spread':
                if (P.spread < MAX.spread) P.spread++;
                else maxed = true;
                break;
            case 'drone':
                if (P.drones < MAX.drone) {
                    P.droneState[P.drones].x = P.x;
                    P.droneState[P.drones].y = P.y;
                    P.drones++;
                } else {
                    maxed = true;
                }
                break;
            case 'homing':
                if (P.homing < MAX.homing) P.homing++;
                else maxed = true;
                break;
            case 'shield':
                if (!P.shield) P.shield = true;
                else maxed = true;
                break;
            case 'life':
                if (P.lives < MAX.life) P.lives++;
                else maxed = true;
                break;
            default:
                bonus = 1500;
        }
        if (maxed) bonus += 1000;
        state.score += bonus;
        state.loot.add(c.id);
        state.stageLoot.push(c.id);
        popup(p.x, p.y - 8, `+${bonus}`, fx.color);
        explode(p.x, p.y, [fx.color, '#fff'], 12, 70);
        showToast(c, maxed);
        Sound.sfx(c.effect === 'cert' || c.effect === 'repo' ? 'cert' : 'pickup');
        addLootDom(c);
    }

    /* ============================================================
       ENEMIES
       ============================================================ */
    function moveEnemy(e, dt) {
        switch (e.move) {
            case 'down':
                e.y += e.vy * dt;
                e.x += Math.sin(e.t * 2 + e.phase) * 6 * dt;
                break;
            case 'sine':
                e.y += e.vy * dt;
                e.x = e.x0 + Math.sin(e.t * 3 + e.phase) * 22;
                break;
            case 'sweep':
                e.x += e.dir * 80 * dt;
                e.y += (10 + e.t * 30) * dt;
                e.flip = e.dir > 0;
                break;
            case 'swim':
                e.y += e.vy * 0.8 * dt;
                e.x += clamp(P.x - e.x, -1, 1) * 26 * dt + Math.sin(e.t * 4) * 10 * dt;
                e.flip = P.x > e.x;
                break;
            case 'dive':
                if (e.t < 0.9) {
                    e.y += 60 * dt;
                } else {
                    if (!e.dv) {
                        const a = aimAt(e.x, e.y);
                        e.dv = [Math.cos(a) * 125, Math.max(40, Math.sin(a) * 125)];
                    }
                    e.x += e.dv[0] * dt;
                    e.y += e.dv[1] * dt;
                }
                break;
            case 'hover':
                if (e.t < e.hold) {
                    e.y = lerp(e.y, e.targetY, 1 - Math.pow(0.08, dt));
                    e.x = e.x0 + Math.sin(e.t * 0.9 + e.phase) * 30;
                } else {
                    e.y += 50 * dt;
                }
                break;
            default:
                e.y += e.vy * dt;
        }
    }

    function enemyShoot(e, dt) {
        const s = e.def.shoot;
        if (!s || !P.alive || e.y < 6 || e.y > H * 0.7) return;
        e.fireT -= dt;
        if (e.fireT > 0) return;
        e.fireT = s.every * (1 - state.stageIdx * 0.06) * rand(0.85, 1.15);
        const spd = enemyBulletSpeed();
        if (s.kind === 'aimed') {
            for (let i = 0; i < s.n; i++) {
                later(i * 0.12, () => {
                    if (!e.dead) aimed(e.x, e.y + 4, spd);
                });
            }
        } else if (s.kind === 'fan') {
            fan(e.x, e.y + 6, s.n, 0.8, spd, undefined, { spr: 'orange' });
        } else if (s.kind === 'ring') {
            ring(e.x, e.y, s.n, spd * 0.85, e.t, { spr: 'cyan' });
        }
    }

    function damageEnemy(e, dmg) {
        if (e.dead) return;
        e.hp -= dmg;
        if (!(e.flashCD > 0)) {
            e.flash = 0.05;
            e.flashCD = 0.13;
        }
        if (e.hp <= 0) {
            e.dead = true;
            const pts = Math.round(e.def.score * (1 + state.stageIdx * 0.25));
            state.score += pts;
            const big = e.def.hp >= 8;
            explode(e.x, e.y, ['#fde047', '#fb923c', '#fff', '#f472b6'], big ? 30 : 12, big ? 120 : 80);
            if (big) {
                popup(e.x, e.y, `+${pts}`, '#fde047');
                shake(3);
                Sound.sfx('boom');
            } else {
                Sound.sfx('pop');
            }
        }
    }

    /* ============================================================
       BOSSES
       ============================================================ */
    function spawnBoss() {
        const def = state.stage.boss;
        const cfg = BOSSES[def.kind];
        state.boss = {
            ...def, ...cfg,
            x: W / 2, y: -60, max: def.hp, t: 0, entering: true, flash: 0,
            timers: {}, phase: 0, dead: false, deathT: 0, beams: [], spin: 0, alt: false,
        };
        Sound.music('boss', MUSIC_KEYS[state.stageIdx]);
    }

    function every(b, key, interval, fn) {
        if (b.timers[key] === undefined) b.timers[key] = interval * 0.6;
        b.timers[key] -= STEP;
        if (b.timers[key] <= 0) {
            b.timers[key] += interval;
            fn();
        }
    }

    function krakenTentacles(b) {
        const out = [];
        for (let k = 0; k < 6; k++) {
            const base = Math.PI / 2 + (k - 2.5) * 0.42;
            let x = b.x + Math.cos(base) * 15;
            let y = b.y + Math.sin(base) * 15;
            const pts = [];
            for (let s = 0; s < 14; s++) {
                const ang = base + Math.sin(b.t * 2 + s * 0.45 + k * 1.3) * 0.5 * (s / 14);
                x += Math.cos(ang) * 3.1;
                y += Math.sin(ang) * 3.1;
                pts.push([x, y]);
            }
            out.push(pts);
        }
        return out;
    }

    const BOSS_AI = {
        queue(b, ph) {
            b.x = W / 2 + Math.sin(b.t * 0.7) * 58;
            every(b, 'fan', [1.6, 1.35, 1.2][ph], () => fan(b.x, b.y + 20, ph ? 7 : 5, 0.95, 64, undefined, { spr: 'orange' }));
            if (ph >= 1) {
                every(b, 'spawn', 2.8, () => {
                    spawnEnemy('ticket', b.x - 24, b.y + 18, { move: 'down' });
                    spawnEnemy('ticket', b.x + 24, b.y + 18, { move: 'down' });
                });
            }
            if (ph === 2) every(b, 'ring', 2.4, () => ring(b.x, b.y, 12, 50, b.t));
        },
        target(b, ph) {
            b.x = W / 2 + Math.sin(b.t * 0.8) * 66;
            b.y = b.ty + Math.sin(b.t * 1.6) * 12;
            every(b, 'ring', [1.7, 1.55, 1.45][ph], () => ring(b.x, b.y, ph === 2 ? 16 : 12, 56, b.t * 0.7, { spr: 'red' }));
            if (ph >= 1) {
                every(b, 'spiral', 0.17, () => {
                    b.spin += 0.5;
                    eBullet(b.x, b.y, Math.cos(b.spin) * 60, Math.sin(b.spin) * 60);
                });
            }
            if (ph === 2) every(b, 'aim', 1.7, () => burst(b.x, b.y + 20, 3, 88, { spr: 'orange' }));
        },
        kraken(b, ph) {
            b.x = W / 2 + Math.sin(b.t * 0.5) * 48;
            const tips = krakenTentacles(b).map((pts) => pts[pts.length - 1]);
            every(b, 'tips', [1.5, 1.3, 1.15][ph], () => {
                b.alt = !b.alt;
                tips.forEach(([x, y], i) => {
                    if ((i % 2 === 0) === b.alt) aimed(x, y, 72, { spr: 'cyan' });
                });
            });
            if (ph >= 1) every(b, 'curtain', 1.0, () => tips.forEach(([x, y]) => eBullet(x, y, 0, 56, { spr: 'cyan' })));
            if (ph === 2) every(b, 'ring', 2.1, () => ring(b.x, b.y, 14, 54, b.t, { spr: 'lime' }));
        },
        exam(b, ph) {
            b.x = W / 2 + Math.sin(b.t * 0.9) * 56;
            const L = ['F', 'D', 'C'];
            every(b, 'fan', [1.45, 1.25, 1.2][ph], () => fan(b.x, b.y + 30, ph === 2 ? 7 : 5, 1.0, 64, undefined, { letter: pick(L) }));
            if (ph >= 1) {
                every(b, 'quiz', 3.2, () => {
                    spawnEnemy('bug', b.x - 22, b.y + 22, { move: 'dive' });
                    spawnEnemy('bug', b.x + 22, b.y + 22, { move: 'dive' });
                });
            }
            if (ph === 2) every(b, 'rain', 0.45, () => eBullet(rand(8, W - 8), -4, 0, rand(48, 66), { letter: pick(L) }));
        },
        monolith(b, ph) {
            b.x = W / 2 + Math.sin(b.t * 0.45) * 40;
            every(b, 'fan', [1.5, 1.6, 1.9][ph], () => fan(b.x, b.y + 30, 6, 1.1, 66, undefined, { spr: 'red' }));
            if (ph >= 1) {
                every(b, 'beam', ph === 2 ? 2.4 : 2.9, () => b.beams.push({ x: clamp(P.x, 8, W - 8), t: 0, fired: false }));
                every(b, 'minion', 3.6, () => spawnEnemy('spam', b.x + rand(-30, 30), b.y + 24, { move: 'dive' }));
            }
            if (ph === 2) {
                every(b, 'spiral', 0.17, () => {
                    b.spin += 0.55;
                    for (const o of [0, Math.PI]) eBullet(b.x, b.y, Math.cos(b.spin + o) * 56, Math.sin(b.spin + o) * 56);
                });
            }
        },
    };

    function updateBoss(b, dt) {
        b.t += dt;
        b.flash = Math.max(0, b.flash - dt);
        b.flashCD = Math.max(0, (b.flashCD || 0) - dt);
        for (const bm of b.beams) {
            bm.t += dt;
            if (bm.t > 0.9 && !bm.fired) {
                bm.fired = true;
                Sound.sfx('beam');
                shake(2);
            }
        }
        b.beams = b.beams.filter((bm) => bm.t < 1.55);

        if (b.dead) {
            b.deathT += dt;
            if (Math.random() < dt * 14) {
                explode(b.x + rand(-b.hw, b.hw), b.y + b.oy + rand(-b.hh, b.hh), ['#fde047', '#fb923c', '#fff', '#f472b6'], 16, 100);
                Sound.sfx('pop');
            }
            if (b.deathT > 2) {
                explode(b.x, b.y, ['#fde047', '#fb923c', '#fff', '#f472b6', '#22d3ee'], 90, 190);
                shake(9);
                flash(0.9);
                Sound.sfx('boom');
                state.boss = null;
                setPhase('outro');
            }
            return;
        }
        if (b.entering) {
            b.y = lerp(b.y, b.ty, 1 - Math.pow(0.12, dt));
            if (b.t > 2.4) {
                b.entering = false;
                b.t = 0;
            }
            return;
        }
        const ph = b.hp > b.max * 0.66 ? 0 : b.hp > b.max * 0.33 ? 1 : 2;
        if (ph !== b.phase) {
            b.phase = ph;
            b.timers = {};
            flash(0.35);
            shake(4);
            Sound.sfx('boom');
        }
        BOSS_AI[b.kind](b, ph);
    }

    function damageBoss(dmg) {
        const b = state.boss;
        if (!b || b.entering || b.dead) return;
        const real = Math.min(dmg, b.hp);
        b.hp -= real;
        if (!(b.flashCD > 0)) {
            b.flash = 0.04;
            b.flashCD = 0.18;
        }
        state.score += 5 * real;
        if (b.hp <= 0) {
            b.hp = 0;
            b.dead = true;
            b.deathT = 0;
            b.beams = [];
            const bonus = 5000 * (state.stageIdx + 1);
            state.score += bonus;
            popup(b.x, b.y, `+${bonus}`, '#fde047');
            for (const bl of state.eBullets) explode(bl.x, bl.y, ['#fde047'], 2, 30);
            state.eBullets.length = 0;
            for (const e of state.enemies) damageEnemy(e, 999);
            Sound.stopMusic();
            Sound.sfx('boom');
        }
    }

    /* ============================================================
       UPDATE
       ============================================================ */
    function setPhase(phase) {
        state.phase = phase;
        state.phaseT = 0;
        if (phase === 'warning') Sound.sfx('warn');
    }

    function updatePhase(dt) {
        state.phaseT += dt;
        switch (state.phase) {
            case 'intro':
                if (state.phaseT > 2.8) setPhase('waves');
                break;
            case 'waves': {
                state.stageT += dt;
                const tl = state.timeline;
                while (state.evIdx < tl.ev.length && tl.ev[state.evIdx].t <= state.stageT) runEvent(tl.ev[state.evIdx++]);
                const done = state.evIdx >= tl.ev.length && state.stageT > tl.end;
                if (done && (state.enemies.length === 0 || state.stageT > tl.end + 6)) setPhase('warning');
                break;
            }
            case 'warning':
                if (state.phaseT > 2.7) {
                    spawnBoss();
                    setPhase('boss');
                }
                break;
            case 'outro':
                if (state.phaseT > 2.8) stageClear();
                break;
            default:
                break;
        }
    }

    function updatePending(dt) {
        for (let i = state.pending.length - 1; i >= 0; i--) {
            const p = state.pending[i];
            p.t -= dt;
            if (p.t <= 0) {
                state.pending.splice(i, 1);
                p.fn();
            }
        }
    }

    function updateEnemies(dt) {
        for (const e of state.enemies) {
            e.t += dt;
            if (e.flash > 0) e.flash -= dt;
            if (e.flashCD > 0) e.flashCD -= dt;
            moveEnemy(e, dt);
            enemyShoot(e, dt);
            if (e.y > H + 24 || e.x < -40 || e.x > W + 40) e.gone = true;
        }
        state.enemies = state.enemies.filter((e) => !e.dead && !e.gone);
    }

    function updateBullets(dt) {
        for (const b of state.pBullets) {
            if (b.kind === 'missile') {
                b.life -= dt;
                const tg = nearestTarget(b.x, b.y);
                let cur = Math.atan2(b.vy, b.vx);
                if (tg) {
                    const want = Math.atan2(tg.y - b.y, tg.x - b.x);
                    const diff = ((want - cur + Math.PI * 3) % TAU) - Math.PI;
                    cur += clamp(diff, -5 * dt, 5 * dt);
                }
                const sp = Math.min(240, Math.hypot(b.vx, b.vy) + 320 * dt);
                b.vx = Math.cos(cur) * sp;
                b.vy = Math.sin(cur) * sp;
                if (Math.random() < 0.6) state.particles.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.25, max: 0.25, color: '#a3e635', size: 1 });
            }
            b.x += b.vx * dt;
            b.y += b.vy * dt;
        }
        state.pBullets = state.pBullets.filter((b) => b.y > -10 && b.y < H + 10 && b.x > -10 && b.x < W + 10 && (b.kind !== 'missile' || b.life > 0) && !b.dead);

        for (const b of state.eBullets) {
            b.x += b.vx * dt;
            b.y += b.vy * dt;
        }
        state.eBullets = state.eBullets.filter((b) => !b.dead && b.y > -12 && b.y < H + 12 && b.x > -12 && b.x < W + 12);
    }

    function updatePickups(dt) {
        for (const p of state.pickups) {
            p.t += dt;
            p.y += 24 * dt;
            p.x += Math.sin(p.t * 2.2) * 14 * dt;
            if (P.alive) {
                const d2 = dist2(p.x, p.y, P.x, P.y);
                if (d2 < 36 * 36) {
                    const d = Math.sqrt(d2) || 1;
                    p.x += ((P.x - p.x) / d) * 150 * dt;
                    p.y += ((P.y - p.y) / d) * 150 * dt;
                }
                if (d2 < 12 * 12) {
                    p.got = true;
                    collect(p);
                }
            }
        }
        state.pickups = state.pickups.filter((p) => !p.got && p.y < H + 12);
    }

    function updateParticles(dt) {
        for (const p of state.particles) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.96;
            p.vy *= 0.96;
            p.life -= dt;
        }
        state.particles = state.particles.filter((p) => p.life > 0);
        for (const p of state.popups) {
            p.y -= 18 * dt;
            p.life -= dt;
        }
        state.popups = state.popups.filter((p) => p.life > 0);
    }

    function collide() {
        // player fire → enemies / boss
        const b = state.boss;
        const bossOpen = b && !b.entering && !b.dead;
        for (const s of state.pBullets) {
            for (const e of state.enemies) {
                if (e.dead) continue;
                const r = e.def.r + 2;
                if (dist2(s.x, s.y, e.x, e.y) < r * r) {
                    damageEnemy(e, s.dmg);
                    s.dead = true;
                    break;
                }
            }
            if (!s.dead && bossOpen && Math.abs(s.x - b.x) < b.hw && Math.abs(s.y - (b.y + b.oy)) < b.hh) {
                damageBoss(s.dmg);
                s.dead = true;
            }
            if (s.dead && Math.random() < 0.5) {
                state.particles.push({ x: s.x, y: s.y, vx: rand(-30, 30), vy: rand(-40, 0), life: 0.15, max: 0.15, color: '#fff', size: 1 });
            }
        }
        state.pBullets = state.pBullets.filter((s) => !s.dead);
        state.enemies = state.enemies.filter((e) => !e.dead);

        if (!P.alive || P.inv > 0) return;

        for (const bl of state.eBullets) {
            if (dist2(bl.x, bl.y, P.x, P.y) < (bl.r + 1.5) ** 2) {
                bl.dead = true;
                hurtPlayer();
                return;
            }
        }
        for (const e of state.enemies) {
            if (dist2(e.x, e.y, P.x, P.y) < (e.def.r + 2) ** 2) {
                damageEnemy(e, 6);
                hurtPlayer();
                return;
            }
        }
        if (bossOpen && Math.abs(P.x - b.x) < b.hw - 4 && Math.abs(P.y - (b.y + b.oy)) < b.hh - 4) {
            hurtPlayer();
            return;
        }
        if (b) {
            for (const bm of b.beams) {
                if (bm.t > 0.9 && bm.t < 1.5 && Math.abs(P.x - bm.x) < 6 && P.y > b.y) {
                    hurtPlayer();
                    return;
                }
            }
        }
    }

    function updateStars(dt, speed) {
        for (const s of state.stars) {
            s.y += s.z * 14 * speed * dt;
            if (s.y > H) {
                s.y -= H;
                s.x = rand(0, W);
            }
        }
        for (const c of state.clouds) {
            c.y += c.s * speed * dt;
            if (c.y > H + 20) {
                c.y = -20;
                c.x = rand(-20, W);
            }
        }
    }

    function updateAttract(dt) {
        const t = state.time;
        P.x = W / 2 + Math.sin(t * 0.8) * 46;
        P.y = H - 34 + Math.sin(t * 2.1) * 3;
        if (Math.random() < dt * 0.9 && state.attract.length < 7) {
            state.attract.push({ type: pick(['bug', 'ticket', 'spam', 'phish', 'outage']), x: rand(16, W - 16), y: -16, vy: rand(9, 20), ph: rand(0, TAU), t: 0 });
        }
        for (const a of state.attract) {
            a.t += dt;
            a.y += a.vy * dt;
            a.x += Math.sin(a.t + a.ph) * 8 * dt;
        }
        state.attract = state.attract.filter((a) => a.y < H + 20);
    }

    function update(dt) {
        state.time += dt;
        pollGamepad();
        state.shake = Math.max(0, state.shake - dt * 14);
        state.flash = Math.max(0, state.flash - dt * 2.5);

        if (state.mode === 'title') {
            updateStars(dt, 1);
            updateAttract(dt);
            return;
        }
        if (state.paused) return;
        if (state.mode !== 'game') {
            updateStars(dt, 0.4);
            updateParticles(dt);
            return;
        }

        updateStars(dt, state.phase === 'warning' ? 2.6 : 1);
        updatePhase(dt);
        updatePlayer(dt);
        updatePending(dt);
        updateEnemies(dt);
        if (state.boss) updateBoss(state.boss, dt);
        updateBullets(dt);
        updatePickups(dt);
        updateParticles(dt);
        if (state.mode === 'game') collide();

        if (state.toast) {
            state.toast.t += dt;
            const dur = state.toastQueue.length ? 1.5 : 2.6;
            if (state.toast.t > dur) state.toast = state.toastQueue.shift() || null;
        }
        if (state.bomb) {
            state.bomb.t += dt;
            if (state.bomb.t > 2.2) state.bomb = null;
        }
    }

    /* ============================================================
       RENDER
       ============================================================ */
    const patternCache = {};
    function stripePattern(color) {
        if (!patternCache[color]) {
            const tile = makeCanvas(16, 16);
            const c = tile.getContext('2d');
            c.fillStyle = color;
            for (let y = 0; y < 16; y++) {
                const x = (16 - y) % 16;
                c.fillRect(x, y, 5, 1);
                if (x + 5 > 16) c.fillRect(x - 16, y, 5, 1);
            }
            patternCache[color] = screenCtx.createPattern(tile, 'repeat');
        }
        return patternCache[color];
    }

    function drawBackdrop(theme, t) {
        g.fillStyle = theme.bg;
        g.fillRect(0, 0, W, H);
        g.fillStyle = theme.line;
        switch (theme.kind) {
            case 'grid': {
                const off = (t * 18) % 20;
                for (let y = off - 20; y < H; y += 20) g.fillRect(0, Math.round(y), W, 1);
                for (let x = 10; x < W; x += 20) g.fillRect(x, 0, 1, H);
                break;
            }
            case 'stripes': {
                g.save();
                g.translate(0, Math.floor((t * 14) % 16));
                g.fillStyle = stripePattern(theme.line);
                g.fillRect(0, -16, W, H + 32);
                g.restore();
                break;
            }
            case 'fiber': {
                for (let i = 0; i < 10; i++) {
                    const x = 12 + i * 24;
                    g.fillStyle = theme.line;
                    g.fillRect(x, 0, 1, H);
                    const py = ((t * (50 + (i % 3) * 18) + i * 53) % (H + 40)) - 20;
                    g.fillStyle = 'rgba(103, 232, 249, 0.55)';
                    g.fillRect(x, Math.round(py), 1, 6);
                    g.fillStyle = 'rgba(103, 232, 249, 0.2)';
                    g.fillRect(x, Math.round(py) - 6, 1, 6);
                }
                break;
            }
            case 'paper': {
                const off = (t * 16) % 14;
                for (let y = off - 14; y < H; y += 14) g.fillRect(0, Math.round(y), W, 1);
                g.fillStyle = 'rgba(251, 113, 133, 0.12)';
                g.fillRect(22, 0, 1, H);
                break;
            }
            case 'cloud': {
                const off = (t * 10) % 40;
                for (let y = off - 40; y < H; y += 40) {
                    g.fillRect(0, Math.round(y), 30, 1);
                    g.fillRect(30, Math.round(y), 1, 20);
                    g.fillRect(30, Math.round(y) + 20, 70, 1);
                    g.fillRect(170, Math.round(y) + 10, 70, 1);
                    g.fillRect(170, Math.round(y) + 10, 1, 24);
                }
                g.fillStyle = 'rgba(148, 163, 184, 0.06)';
                for (const c of state.clouds) {
                    g.fillRect(Math.round(c.x), Math.round(c.y), c.w, 6);
                    g.fillRect(Math.round(c.x + 6), Math.round(c.y - 4), c.w - 14, 4);
                    g.fillRect(Math.round(c.x + 12), Math.round(c.y - 7), c.w - 26, 3);
                }
                break;
            }
            default:
                break;
        }
    }

    function drawStars() {
        const colors = ['', '#34315a', '#7c78ab', '#e9e6ff'];
        for (const s of state.stars) {
            g.fillStyle = colors[s.z];
            g.fillRect(Math.round(s.x), Math.round(s.y), 1, s.z === 3 ? 2 : 1);
        }
    }

    function drawEnemy(e) {
        if (e.type === 'tangle') {
            drawTangle(e);
            return;
        }
        const spr = SPR[e.def.spr];
        drawSprite(spr, e.x, e.y, { flash: e.flash > 0, flip: e.flip });
        if (e.flash <= 0) drawPupils(spr, e.x, e.y, P.x, P.y, e.flip);
        if (e.type === 'legacy') {
            const on = Math.floor(state.time * 4 + e.phase) % 2;
            const ox = Math.round(e.x - 8);
            const oy = Math.round(e.y - 8);
            rect(ox + 12, oy + 9, 1, 1, on ? '#a3e635' : '#14532d');
            rect(ox + 12, oy + 11, 1, 1, on ? '#14532d' : '#fb7185');
            rect(ox + 12, oy + 13, 1, 1, on ? '#a3e635' : '#14532d');
        }
    }

    function drawTangle(e) {
        const white = e.flash > 0;
        for (let ringI = 0; ringI < 3; ringI++) {
            const r = 4 + ringI * 2.6;
            const n = 8 + ringI * 4;
            for (let i = 0; i < n; i++) {
                const a = e.t * (ringI % 2 ? -2.2 : 1.8) + (i / n) * TAU;
                const rr = r * (0.75 + 0.25 * Math.sin(i * 1.7 + e.t * 3));
                rect(e.x + Math.cos(a) * rr - 1, e.y + Math.sin(a) * rr - 1, 2, 2, white ? '#fff' : ringI === 1 ? '#22d3ee' : '#0e7490');
            }
        }
        if (!white) {
            rect(e.x - 5, e.y - 2, 3, 3, '#f8fafc');
            rect(e.x + 2, e.y - 2, 3, 3, '#f8fafc');
            const dx = P.x > e.x ? 1 : 0;
            const dy = P.y > e.y ? 1 : 0;
            rect(e.x - 5 + dx + 0.5, e.y - 2 + dy + 0.5, 1, 1, PAL.k);
            rect(e.x + 2 + dx + 0.5, e.y - 2 + dy + 0.5, 1, 1, PAL.k);
        }
    }

    function drawChip(c, x, y, glow = true) {
        const fx = EFFECTS[c.effect];
        const w = tinyWidth(c.code) + 6;
        const h = 11;
        const ox = Math.round(x - w / 2);
        const oy = Math.round(y - h / 2);
        if (glow && Math.sin(state.time * 10) > 0) rect(ox - 2, oy - 2, w + 4, h + 4, `${fx.color}55`);
        g.fillStyle = '#cbd5e1';
        for (let i = 2; i < w - 1; i += 3) {
            g.fillRect(ox + i, oy - 1, 1, 1);
            g.fillRect(ox + i, oy + h, 1, 1);
        }
        rect(ox, oy, w, h, fx.dark);
        rect(ox + 1, oy + 1, w - 2, h - 2, fx.color);
        rect(ox + 1, oy + h - 2, w - 2, 1, 'rgba(0,0,0,0.25)');
        tiny(c.code, ox + 3, oy + 3, '#0b0a14');
    }

    function drawPlayer() {
        for (let i = 0; i < P.drones; i++) {
            const d = P.droneState[i];
            rect(d.x - 3, d.y - 2, 6, 4, '#1d4ed8');
            rect(d.x - 2, d.y - 3, 4, 5, '#60a5fa');
            rect(d.x - 1, d.y - 2, 2, 2, Math.floor(state.time * 8) % 2 ? '#22d3ee' : '#f8fafc');
            rect(d.x - 1, d.y + 2, 2, 1 + (Math.floor(state.time * 30) % 2), '#fb923c');
        }
        if (!P.alive) return;
        if (P.inv > 0 && state.mode === 'game' && !state.paused && Math.floor(state.time * 18) % 2 === 0) return;
        const fl = Math.floor(state.time * 30) % 3;
        rect(P.x - 1, P.y + 6, 3, 2 + fl, '#fb923c');
        rect(P.x, P.y + 6, 1, 1 + fl, '#fde047');
        rect(P.x - 6, P.y + 6, 1, 1 + (fl % 2), '#fb923c');
        rect(P.x + 6, P.y + 6, 1, 1 + (fl % 2), '#fb923c');
        const blink = Math.floor(state.time * 10) % 37 === 0;
        drawSprite(blink ? SPR.playerBlink : SPR.player, P.x, P.y);
        if (P.shield) {
            for (let i = 0; i < 12; i++) {
                const a = state.time * 3 + (i / 12) * TAU;
                if (i % 3 === 2) continue;
                rect(P.x + Math.cos(a) * 12, P.y + Math.sin(a) * 12, 1, 1, '#5eead4');
            }
        }
        if (state.mode === 'game') {
            rect(P.x - 1, P.y - 1, 2, 2, '#f472b6');
        }
    }

    function drawPBullets() {
        for (const b of state.pBullets) {
            if (b.kind === 'shot') {
                rect(b.x - 1, b.y - 3, 2, 6, '#22d3ee');
                rect(b.x - 1, b.y - 3, 2, 2, '#ecfeff');
            } else if (b.kind === 'drone') {
                rect(b.x - 0.5, b.y - 2, 1, 4, '#93c5fd');
            } else {
                rect(b.x - 1, b.y - 1, 3, 3, '#a3e635');
                rect(b.x, b.y, 1, 1, '#fff');
            }
        }
    }

    function drawEBullets() {
        for (const b of state.eBullets) {
            if (b.letter) {
                rect(b.x - 4, b.y - 4, 8, 8, '#450a0a');
                rect(b.x - 3, b.y - 3, 6, 6, '#dc2626');
                tiny(b.letter, b.x - 1, b.y - 2, '#fff');
            } else {
                drawSprite(ORB[b.spr] || ORB.pink, b.x, b.y);
            }
        }
    }

    function drawBeams(b) {
        for (const bm of b.beams) {
            const top = b.y + 26;
            if (bm.t < 0.9) {
                if (Math.floor(bm.t * 16) % 2 === 0) {
                    for (let y = top; y < H; y += 6) rect(bm.x, y, 1, 3, '#fb7185');
                }
                tiny('!', bm.x - 1, H - 16, '#fb7185');
            } else {
                const k = 1 - Math.abs(bm.t - 1.2) / 0.35;
                const w = Math.max(2, Math.round(10 * clamp(k, 0.3, 1)));
                rect(bm.x - w / 2, top, w, H - top, '#f472b6');
                rect(bm.x - w / 4, top, Math.max(1, w / 2), H - top, '#fff');
            }
        }
    }

    function drawPickups() {
        for (const p of state.pickups) drawChip(p.chip, p.x, p.y);
    }

    function drawParticles() {
        for (const p of state.particles) {
            g.globalAlpha = clamp(p.life / p.max, 0, 1);
            g.fillStyle = p.color;
            g.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
        }
        g.globalAlpha = 1;
        for (const p of state.popups) tiny(p.str, p.x, p.y, p.color, 'center');
    }

    function drawBombFx() {
        const bomb = state.bomb;
        if (!bomb) return;
        if (bomb.t < 0.9) {
            const r = bomb.t * 380;
            g.strokeStyle = `rgba(163, 230, 53, ${1 - bomb.t / 0.9})`;
            g.lineWidth = 4;
            g.beginPath();
            g.arc(bomb.x, bomb.y, r, 0, TAU);
            g.stroke();
        }
    }

    /* ---------- boss rendering (into an offscreen buffer so it can flash white) ---------- */
    const BOSS_BUF = makeCanvas(180, 150);
    const bossCtx = BOSS_BUF.getContext('2d');
    const BCX = 90;
    const BCY = 75;

    const BOSS_DRAW = {
        queue(b, lx, ly) {
            const n = Math.max(1, Math.ceil((7 * b.hp) / b.max));
            for (let i = 0; i < n; i++) {
                const jx = Math.round(Math.sin(b.t * 3 + i) * 2);
                const y = BCY - 6 - i * 5;
                rect(BCX - 27 + jx, y - 1, 54, 7, '#b45309');
                rect(BCX - 26 + jx, y, 52, 5, i % 2 ? '#fde68a' : '#fcd34d');
                rect(BCX - 20 + jx, y + 2, 22, 1, '#92400e');
            }
            rect(BCX - 37, BCY - 1, 74, 24, '#0b0a14');
            rect(BCX - 36, BCY, 72, 22, '#475569');
            rect(BCX - 36, BCY, 72, 3, '#94a3b8');
            rect(BCX - 33, BCY + 19, 66, 2, '#334155');
            bigEye(BCX - 17, BCY + 10, 6, lx, ly);
            bigEye(BCX + 17, BCY + 10, 6, lx, ly);
            rect(BCX - 23, BCY + 2, 12, 2, '#0b0a14');
            rect(BCX + 11, BCY + 2, 12, 2, '#0b0a14');
            const count = String(Math.ceil((427 * b.hp) / b.max));
            rect(BCX - 9, BCY + 13, 18, 8, '#0b0a14');
            tiny(count, BCX, BCY + 14, '#fb7185', 'center');
        },
        target(b, lx, ly) {
            for (let i = 0; i < 8; i++) {
                const a = b.t * 1.6 + (i / 8) * TAU;
                rect(BCX + Math.cos(a) * 31 - 1, BCY + Math.sin(a) * 31 - 1, 3, 3, i % 2 ? '#fb7185' : '#fde047');
            }
            disc(BCX, BCY, 27, '#0b0a14');
            disc(BCX, BCY, 26, '#be123c');
            disc(BCX, BCY, 21, '#f8fafc');
            disc(BCX, BCY, 16, '#fb7185');
            disc(BCX, BCY, 11, '#f8fafc');
            disc(BCX, BCY, 6, '#be123c');
            bigEye(BCX - 10, BCY - 4, 5, lx, ly);
            bigEye(BCX + 10, BCY - 4, 5, lx, ly);
            rect(BCX - 16, BCY - 12, 9, 2, '#0b0a14');
            rect(BCX + 7, BCY - 12, 9, 2, '#0b0a14');
            rect(BCX - 8, BCY + 18, 16, 8, '#0b0a14');
            tiny('Q4', BCX, BCY + 19, '#fde047', 'center');
        },
        kraken(b, lx, ly) {
            const tents = krakenTentacles(b);
            tents.forEach((pts, k) => {
                const pulse = Math.floor(b.t * 12 + k * 3) % 18;
                pts.forEach(([x, y], s) => {
                    const px = x - b.x + BCX;
                    const py = y - b.y + BCY;
                    rect(px - 1, py - 1, 3, 3, s === pulse ? '#a5f3fc' : s % 2 ? '#0e7490' : '#155e75');
                });
                const [tx, ty] = pts[pts.length - 1];
                rect(tx - b.x + BCX - 2, ty - b.y + BCY - 2, 4, 4, '#22d3ee');
            });
            disc(BCX, BCY, 19, '#042f2e');
            disc(BCX, BCY, 18, '#0f766e');
            disc(BCX - 4, BCY - 6, 8, '#14b8a6');
            rect(BCX - 12, BCY + 6, 3, 3, '#115e59');
            rect(BCX + 9, BCY + 4, 3, 3, '#115e59');
            bigEye(BCX - 7, BCY - 1, 5, lx, ly);
            bigEye(BCX + 7, BCY - 1, 5, lx, ly);
            rect(BCX - 4, BCY + 9, 8, 2, '#042f2e');
        },
        exam(b, lx, ly) {
            rect(BCX - 29, BCY - 35, 58, 70, '#0b0a14');
            rect(BCX - 28, BCY - 34, 56, 68, '#fef3c7');
            rect(BCX - 28, BCY - 34, 56, 10, '#e5e7eb');
            tiny('FINAL EXAM', BCX - 6, BCY - 31, '#1f2937', 'center');
            for (let y = BCY - 18; y < BCY + 32; y += 6) rect(BCX - 25, y, 50, 1, '#bfdbfe');
            rect(BCX - 20, BCY - 24, 1, 58, '#fca5a5');
            bigEye(BCX - 10, BCY - 6, 6, lx, ly, '#ffffff', PAL.k, '#1f2937');
            bigEye(BCX + 10, BCY - 6, 6, lx, ly, '#ffffff', PAL.k, '#1f2937');
            for (let i = 0; i < 6; i++) {
                rect(BCX - 16 + i, BCY - 15 + Math.floor(i / 2), 1, 1, '#0b0a14');
                rect(BCX + 15 - i, BCY - 15 + Math.floor(i / 2), 1, 1, '#0b0a14');
            }
            for (let i = 0; i < 12; i++) rect(BCX - 6 + i, BCY + 6 + (i % 2), 1, 1, '#7f1d1d');
            const grade = b.dead ? 'A' : ['F', 'C', 'B'][b.phase];
            disc(BCX + 19, BCY - 22, 8, '#dc2626');
            disc(BCX + 19, BCY - 22, 7, '#fff7ed');
            text(grade, BCX + 16, BCY - 25, b.dead ? '#16a34a' : '#dc2626', 'left', 8, null);
            tiny('12 ECTS', BCX, BCY + 24, '#6b7280', 'center');
        },
        monolith(b, lx, ly) {
            rect(BCX - 43, BCY - 31, 86, 62, '#0b0a14');
            rect(BCX - 42, BCY - 30, 84, 60, '#334155');
            rect(BCX - 40, BCY - 28, 80, 9, '#1e293b');
            tiny('LEGACY-SRV-01', BCX, BCY - 26, '#94a3b8', 'center');
            rect(BCX - 32, BCY - 17, 64, 20, '#0f172a');
            for (const ex of [-14, 14]) {
                disc(BCX + ex, BCY - 7, 6, '#7f1d1d');
                const a = Math.atan2(ly - (BCY - 7), lx - (BCX + ex));
                disc(BCX + ex + Math.cos(a) * 2.5, BCY - 7 + Math.sin(a) * 2.5, 3, '#ef4444');
                rect(BCX + ex + Math.cos(a) * 2.5, BCY - 7 + Math.sin(a) * 2.5, 1, 1, '#fecaca');
            }
            for (let row = 0; row < 3; row++) {
                rect(BCX - 38, BCY + 6 + row * 7, 76, 5, '#1e293b');
                for (let i = 0; i < 9; i++) {
                    const on = (Math.floor(b.t * 6) + i * 7 + row * 3) % 5 < 2;
                    rect(BCX - 35 + i * 8, BCY + 8 + row * 7, 3, 1, on ? (row === 1 && b.phase > 0 ? '#fb7185' : '#a3e635') : '#14532d');
                }
            }
            for (const px of [-24, 0, 24]) {
                const charging = b.beams.some((bm) => bm.t < 0.9 && Math.abs(bm.x - (b.x + px)) < 60);
                rect(BCX + px - 4, BCY + 27, 8, 3, charging && Math.floor(b.t * 20) % 2 ? '#f472b6' : '#0b0a14');
            }
            if (b.phase >= 1) {
                rect(BCX + 20, BCY - 30, 1, 8, '#0b0a14');
                rect(BCX + 21, BCY - 22, 1, 6, '#0b0a14');
                rect(BCX - 30, BCY + 3, 6, 1, '#0b0a14');
            }
            if (b.phase === 2 && Math.random() < 0.3) rect(BCX + rand(-40, 40), BCY + rand(-28, 28), 1, 1, '#fde047');
        },
    };

    function drawBoss(b) {
        bossCtx.clearRect(0, 0, BOSS_BUF.width, BOSS_BUF.height);
        g = bossCtx;
        const lx = P.x - b.x + BCX;
        const ly = P.y - b.y + BCY;
        BOSS_DRAW[b.kind](b, lx, ly);
        if (b.flash > 0 || (b.dead && Math.floor(b.deathT * 16) % 2 === 0)) {
            bossCtx.globalCompositeOperation = 'source-atop';
            bossCtx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            bossCtx.fillRect(0, 0, BOSS_BUF.width, BOSS_BUF.height);
            bossCtx.globalCompositeOperation = 'source-over';
        }
        g = screenCtx;
        g.drawImage(BOSS_BUF, Math.round(b.x - BCX), Math.round(b.y - BCY));
        drawBeams(b);
    }

    /* ---------- HUD & banners ---------- */
    function drawHUD() {
        rect(0, 0, W, 19, 'rgba(5, 4, 14, 0.65)');
        tiny('1UP', 4, 2, '#f472b6');
        tiny('HI-SCORE', W / 2, 2, '#22d3ee', 'center');
        tiny(`STAGE ${state.stageIdx + 1}/5`, W - 4, 2, '#fde047', 'right');
        text(pad(state.score), 4, 9, '#fff');
        text(pad(Math.max(state.score, state.hi)), W / 2, 9, '#cbd5e1', 'center');
        for (let i = 0; i < P.lives; i++) drawSprite(SPR.heart, W - 8 - i * 9, 13);

        // bombs (bottom left)
        for (let i = 0; i < P.bombs; i++) {
            const x = 4 + i * 15;
            rect(x, H - 12, 13, 9, '#581c87');
            rect(x + 1, H - 11, 11, 7, '#c084fc');
            tiny('TF', x + 3, H - 10, '#0b0a14');
        }
        // power pips (bottom right)
        const pips = [
            ['rapid', P.rapid, MAX.rapid], ['spread', P.spread, MAX.spread],
            ['drone', P.drones, MAX.drone], ['homing', P.homing, MAX.homing], ['shield', P.shield ? 1 : 0, 1],
        ];
        let x = W - 4;
        for (let i = pips.length - 1; i >= 0; i--) {
            const [fx, lvl, max] = pips[i];
            for (let j = max - 1; j >= 0; j--) {
                x -= 4;
                rect(x, H - 8, 3, 4, j < lvl ? EFFECTS[fx].color : '#2a2550');
            }
            x -= 3;
        }

        const b = state.boss;
        if (b && !b.dead) {
            const ratio = b.entering ? clamp(b.t / 2.2, 0, 1) : b.hp / b.max;
            tiny(b.name, 4, 22, '#fff');
            rect(4, 29, W - 8, 4, '#3b0d1d');
            rect(4, 29, Math.round((W - 8) * ratio), 4, ratio > 0.33 ? '#fb7185' : '#fde047');
            rect(4, 29, Math.round((W - 8) * ratio), 1, 'rgba(255,255,255,0.4)');
        }
    }

    function drawBanners() {
        const s = state.stage;
        if (state.mode !== 'game' || !s) return;
        if (state.phase === 'intro') {
            const t = state.phaseT;
            const a = clamp(Math.min(t / 0.3, (2.8 - t) / 0.4), 0, 1);
            g.globalAlpha = a;
            rect(0, 112, W, 84, 'rgba(5, 4, 14, 0.82)');
            rect(0, 112, W, 1, '#f472b6');
            rect(0, 195, W, 1, '#f472b6');
            text(`STAGE ${state.stageIdx + 1}`, W / 2, 122, '#fde047', 'center', 16, '#be185d');
            text(s.name, W / 2, 146, '#fff', 'center');
            text(s.when, W / 2, 160, '#22d3ee', 'center');
            tiny(s.sub, W / 2, 178, '#a09bc4', 'center');
            g.globalAlpha = 1;
        } else if (state.phase === 'warning') {
            const on = Math.floor(state.phaseT * 5) % 2 === 0;
            const off = Math.floor(state.phaseT * 40) % 12;
            for (const y of [118, 186]) {
                rect(0, y, W, 8, '#450a0a');
                for (let x = -12 + off; x < W; x += 12) rect(x, y, 6, 8, '#dc2626');
            }
            rect(0, 126, W, 60, 'rgba(10, 2, 6, 0.75)');
            if (on) text('WARNING', W / 2, 134, '#fb7185', 'center', 16, '#450a0a');
            tiny('P1 INCIDENT DETECTED', W / 2, 156, '#fecaca', 'center');
            text(s.boss.name, W / 2, 168, '#fff', 'center');
        } else if (state.phase === 'outro') {
            const a = clamp(state.phaseT / 0.4, 0, 1);
            g.globalAlpha = a;
            rect(0, 128, W, 50, 'rgba(5, 4, 14, 0.8)');
            text('INCIDENT RESOLVED', W / 2, 138, '#a3e635', 'center');
            tiny(BOSSES[s.boss.kind].win, W / 2, 156, '#fde047', 'center');
            g.globalAlpha = 1;
        }

        if (state.bomb && state.bomb.t < 2.2) {
            rect(4, 38, 150, 22, 'rgba(5, 4, 14, 0.8)');
            tiny('> TERRAFORM DESTROY', 8, 42, '#a3e635');
            if (state.bomb.t > 0.35) tiny(`DESTROY COMPLETE! ${state.bomb.n} DESTROYED.`, 8, 50, '#d9f99d');
        }
    }

    function drawToast() {
        const tt = state.toast;
        if (!tt || state.mode !== 'game') return;
        const slide = Math.min(1, tt.t / 0.15);
        const y = Math.round(H - 52 + (1 - slide) * 12);
        const name = tt.c.name.toUpperCase();
        const note = tt.c.note.toUpperCase();
        const full = `${tt.fx.label} MAX +1000`;
        const label = tt.maxed && full.length <= 27 ? full : tt.fx.label;
        const ww = Math.min(W - 8, Math.max(150, label.length * 8 + 12, tinyWidth(name) + 14, tinyWidth(note) + 14));
        const x = Math.round((W - ww) / 2);
        rect(x, y, ww, 34, 'rgba(5, 4, 14, 0.88)');
        rect(x, y, ww, 1, tt.fx.color);
        rect(x, y + 33, ww, 1, tt.fx.color);
        rect(x, y, 1, 34, tt.fx.color);
        rect(x + ww - 1, y, 1, 34, tt.fx.color);
        text(label, W / 2, y + 4, tt.fx.color, 'center', 8, null);
        tiny(name, W / 2, y + 16, '#fff', 'center');
        tiny(note, W / 2, y + 24, '#a09bc4', 'center');
    }

    function drawAttract() {
        for (const a of state.attract) {
            const spr = SPR[a.type];
            drawSprite(spr, a.x, a.y);
            drawPupils(spr, a.x, a.y, P.x, P.y);
        }
        drawPlayer();
    }

    function render() {
        g = screenCtx;
        g.save();
        if (state.shake > 0 && !reducedMotion) g.translate(Math.round(rand(-state.shake, state.shake)), Math.round(rand(-state.shake, state.shake)));
        const theme = state.mode === 'title' ? TITLE_THEME : state.stage.theme;
        drawBackdrop(theme, state.time);
        drawStars();
        if (state.mode === 'title') {
            drawAttract();
        } else {
            drawPickups();
            for (const e of state.enemies) drawEnemy(e);
            if (state.boss) drawBoss(state.boss);
            drawPBullets();
            drawPlayer();
            drawEBullets();
            drawParticles();
            drawBombFx();
        }
        g.restore();
        if (state.mode !== 'title') {
            drawHUD();
            drawBanners();
            drawToast();
        }
        if (state.flash > 0 && !reducedMotion) {
            g.fillStyle = `rgba(255, 255, 255, ${state.flash * 0.55})`;
            g.fillRect(0, 0, W, H);
        }
    }

    /* ============================================================
       FLOW — start, stages, clear, game over, ending
       ============================================================ */
    function startGame(idx = 0) {
        Sound.ensure();
        Sound.sfx('coin');
        commitScore();
        state.score = 0;
        state.credits = 0;
        state.loot = new Set();
        state.scoreSaved = false;
        resetLootDom();
        resetPlayer();
        grantPowerFor(idx);
        state.stageIdx = idx;
        startStage();
    }

    function startStage() {
        const s = STAGES[state.stageIdx];
        Object.assign(state, {
            stage: s, mode: 'game', paused: false, phase: 'intro', phaseT: 0, stageT: 0, evIdx: 0,
            rng: mulberry32(s.seed * 9973 + 1), timeline: buildTimeline(s, state.stageIdx),
            enemies: [], eBullets: [], pBullets: [], pickups: [], pending: [], particles: [], popups: [],
            boss: null, bomb: null, toast: null, toastQueue: [], hits: 0, stageLoot: [], stageScore0: state.score,
        });
        P.x = W / 2;
        P.y = H - 36;
        P.alive = true;
        P.inv = 2.8;
        P.bombs = Math.max(P.bombs, 2);
        drag.active = false;
        keys.clear();
        hideOverlays();
        updateNowPanel();
        updateDeck();
        Sound.music('stage', MUSIC_KEYS[state.stageIdx]);
    }

    function stageClear() {
        const noHit = state.hits === 0;
        if (noHit) state.score += 5000;
        state.mode = 'clear';
        Sound.stopMusic();
        Sound.sfx('clear');
        renderClearCard(noHit);
        updateNowPanel();
        updateDeck();
    }

    function nextStage() {
        if (state.stageIdx < STAGES.length - 1) {
            state.stageIdx++;
            startStage();
        } else {
            ending();
        }
    }

    function gameOver() {
        state.mode = 'over';
        Sound.stopMusic();
        Sound.sfx('over');
        ui.overScore.textContent = pad(state.score, 1);
        ui.overEntry.hidden = !qualifies(state.score);
        ui.overInitials.value = store.get('uptime.name', '');
        showOverlay(ui.over);
        focusFirst(ui.over);
        updateDeck();
    }

    function continueGame() {
        commitScore(ui.overEntry.hidden ? null : ui.overInitials);
        state.credits++;
        state.score = 0;
        state.scoreSaved = false;
        P.lives = 3;
        P.bombs = 2;
        grantPowerFor(state.stageIdx);
        startStage();
    }

    function ending() {
        state.mode = 'ending';
        Sound.music('title', 0);
        const got = state.loot.size;
        const el = ui.end;
        el.innerHTML = '';
        const q = qualifies(state.score);
        el.insertAdjacentHTML('beforeend', `
            <div class="sc-top">
                <p class="sc-title">ALL SYSTEMS UP</p>
                <p class="sc-when">YOU REACHED THE PRESENT DAY</p>
            </div>
            <p class="end-text">That's the career so far — from helpdesk apprentice to building AI on Azure. Thanks for playing!</p>
            <dl class="sc-stats">
                <dt>FINAL SCORE</dt><dd class="gold">${pad(state.score, 1)}</dd>
                <dt>LOOT</dt><dd>${got}/${TOTAL_CHIPS}</dd>
                <dt>CONTINUES</dt><dd>${state.credits}</dd>
            </dl>
            <div class="name-entry" ${q ? '' : 'hidden'}>
                <label for="endInitials">NEW HIGH SCORE! INITIALS</label>
                <input id="endInitials" class="initials" maxlength="3" autocomplete="off" spellcheck="false">
            </div>
            <p class="end-wanted">NEXT: STAGE 6 — YOUR TEAM?<br>PLAYER 2 WANTED</p>
            <div class="sc-actions">
                <a class="mbtn primary" href="mailto:jan_tommy_g@hotmail.com?subject=UPTIME%20%E2%80%94%20Stage%206">✉ HIRE JAN TOMMY</a>
                <a class="mbtn" href="#manual">☰ READ THE FULL CV</a>
                <button type="button" class="mbtn" data-action="again">↻ PLAY AGAIN</button>
            </div>`);
        const input = $('#endInitials', el);
        if (input) {
            input.value = store.get('uptime.name', '');
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    commitScore(input);
                    input.blur();
                    renderHiTable();
                }
            });
            input.addEventListener('change', () => commitScore(input));
        }
        el.scrollTop = 0;
        showOverlay(el);
        focusFirst(el, q ? 'input' : '.mbtn');
        updateNowPanel();
        updateDeck();
    }

    function setPaused(p) {
        if (state.mode !== 'game' || state.paused === p) return;
        state.paused = p;
        keys.clear();
        drag.active = false;
        Sound.pauseMusic(p);
        if (p) {
            showOverlay(ui.pause);
            focusFirst(ui.pause);
        } else {
            Sound.ensure();
            hideOverlays();
        }
        updateDeck();
    }

    function togglePause() {
        setPaused(!state.paused);
    }

    function showTitle() {
        commitScore();
        state.mode = 'title';
        state.paused = false;
        state.boss = null;
        Sound.stopMusic();
        resetPlayer();
        renderHiTable();
        showOverlay(ui.title);
        updateNowPanel();
        updateDeck();
    }

    /* ---------- high scores ---------- */
    const DEFAULT_SCORES = [['JTG', 150000], ['BIT', 100000], ['AZR', 60000], ['PWS', 30000], ['TFM', 10000]];

    function loadScores() {
        const s = store.get('uptime.scores', null);
        if (!Array.isArray(s) || !s.every((r) => Array.isArray(r) && typeof r[1] === 'number')) return DEFAULT_SCORES.map((r) => [...r]);
        return s.slice(0, 5);
    }

    function qualifies(score) {
        const s = loadScores();
        return score > 0 && (s.length < 5 || score > s[s.length - 1][1]);
    }

    function commitScore(input = null) {
        if (state.scoreSaved || !qualifies(state.score)) {
            state.scoreSaved = true;
            return;
        }
        let name = input ? input.value : store.get('uptime.name', '');
        name = String(name || 'YOU').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) || 'YOU';
        store.set('uptime.name', name);
        const s = loadScores();
        s.push([name, Math.floor(state.score)]);
        s.sort((a, b) => b[1] - a[1]);
        store.set('uptime.scores', s.slice(0, 5));
        state.hi = s[0][1];
        state.lastEntry = [name, Math.floor(state.score)];
        state.scoreSaved = true;
    }

    /* ============================================================
       DOM UI
       ============================================================ */
    const ui = {
        screen: $('#screen'),
        title: $('#ovTitle'),
        how: $('#ovHow'),
        pause: $('#ovPause'),
        clear: $('#ovClear'),
        over: $('#ovOver'),
        end: $('#ovEnd'),
        hiTable: $('#hiTable'),
        nowStage: $('#nowStage'),
        nowRole: $('#nowRole'),
        nowOrg: $('#nowOrg'),
        nowTrack: $$('#nowTrack li'),
        lootList: $('#lootList'),
        lootCount: $('#lootCount'),
        soundBtn: $('#soundBtn'),
        bombBtn: $('#bombBtn'),
        bombCount: $('#bombCount'),
        pauseBtn: $('#pauseBtn'),
        overScore: $('#overScore'),
        overEntry: $('#overEntry'),
        overInitials: $('#overInitials'),
    };
    const OVERLAYS = [ui.title, ui.how, ui.pause, ui.clear, ui.over, ui.end];

    function showOverlay(el) {
        for (const o of OVERLAYS) o.hidden = o !== el;
    }

    function hideOverlays() {
        for (const o of OVERLAYS) o.hidden = true;
    }

    function focusFirst(el, sel = '.mbtn.primary, .mbtn') {
        const target = $(sel, el);
        if (target && isScreenVisible()) target.focus({ preventScroll: true });
    }

    function isScreenVisible() {
        const r = ui.screen.getBoundingClientRect();
        const visible = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
        return visible > r.height * 0.5;
    }

    function renderHiTable() {
        const rows = loadScores();
        state.hi = rows[0][1];
        ui.hiTable.innerHTML = '';
        const ord = ['1ST', '2ND', '3RD', '4TH', '5TH'];
        rows.forEach(([name, score], i) => {
            const li = document.createElement('li');
            if (state.lastEntry && state.lastEntry[0] === name && state.lastEntry[1] === score) li.className = 'me';
            for (const v of [ord[i], name, pad(score)]) {
                const span = document.createElement('span');
                span.textContent = v;
                li.append(span);
            }
            ui.hiTable.append(li);
        });
    }

    function updateNowPanel() {
        const idx = state.stageIdx;
        if (state.mode === 'title') {
            ui.nowStage.textContent = 'INSERT COIN';
            ui.nowRole.textContent = 'A career in 5 stages';
            ui.nowOrg.textContent = 'From helpdesk apprentice to Azure OpenAI.';
            ui.nowTrack.forEach((li) => li.classList.remove('done', 'current'));
            return;
        }
        const s = STAGES[idx];
        const cleared = state.mode === 'clear' || state.mode === 'ending';
        if (state.mode === 'ending') {
            ui.nowStage.textContent = 'ALL STAGES CLEAR';
            ui.nowRole.textContent = 'Next: Stage 6 — your team?';
            ui.nowOrg.textContent = 'Open to IT operations, cloud, automation and applied AI roles.';
        } else {
            ui.nowStage.textContent = `STAGE ${idx + 1}/5 · ${dashToEn(s.when)}${cleared ? ' · CLEAR' : ''}`;
            ui.nowRole.textContent = s.role;
            ui.nowOrg.textContent = `${s.org} — ${s.blurb}`;
        }
        ui.nowTrack.forEach((li, i) => {
            li.classList.toggle('done', i < idx || (i === idx && cleared));
            li.classList.toggle('current', i === idx && !cleared);
        });
    }

    function resetLootDom() {
        ui.lootList.innerHTML = '<li class="loot-empty">Catch skill chips to fill the log…</li>';
        ui.lootCount.textContent = `0/${TOTAL_CHIPS}`;
    }

    function chipEl(c) {
        const span = document.createElement('span');
        span.className = 'chip';
        span.style.setProperty('--c', EFFECTS[c.effect].color);
        span.textContent = c.code;
        return span;
    }

    function addLootDom(c) {
        const empty = $('.loot-empty', ui.lootList);
        if (empty) empty.remove();
        const li = document.createElement('li');
        li.className = 'loot-item';
        const body = document.createElement('span');
        const b = document.createElement('b');
        if (c.url) {
            const a = document.createElement('a');
            a.href = c.url;
            a.target = '_blank';
            a.rel = 'noreferrer';
            a.textContent = c.name;
            b.append(a);
        } else {
            b.textContent = c.name;
        }
        const small = document.createElement('small');
        small.textContent = `${EFFECTS[c.effect].label.toLowerCase()} · ${dotted(c.note)}`;
        body.append(b, small);
        li.append(chipEl(c), body);
        ui.lootList.prepend(li);
        ui.lootCount.textContent = `${state.loot.size}/${TOTAL_CHIPS}`;
    }

    function renderClearCard(noHit) {
        const idx = state.stageIdx;
        const s = STAGES[idx];
        const el = ui.clear;
        el.innerHTML = '';

        const top = document.createElement('div');
        top.className = 'sc-top';
        top.innerHTML = `<p class="sc-title">STAGE ${idx + 1} CLEAR</p><p class="sc-when"></p>`;
        $('.sc-when', top).textContent = `${s.name} · ${dashToEn(s.when)}`;
        el.append(top);

        // the real CV entries for this stage, straight from the manual below
        const jobs = document.createElement('div');
        jobs.className = 'sc-jobs';
        for (const job of $$(`#career .stage[data-stage="${idx + 1}"] .job`)) jobs.append(job.cloneNode(true));
        el.append(jobs);

        const lootBox = document.createElement('div');
        const got = s.chips.filter((c) => state.stageLoot.includes(c.id)).length;
        lootBox.innerHTML = `<p class="sc-sec">LOOT ${got}/${s.chips.length}</p>`;
        const ul = document.createElement('ul');
        ul.className = 'sc-loot';
        for (const c of s.chips) {
            const li = document.createElement('li');
            if (!state.stageLoot.includes(c.id)) li.className = 'missed';
            const body = document.createElement('span');
            const b = document.createElement('b');
            b.textContent = c.name;
            const small = document.createElement('small');
            small.textContent = ` ${dotted(c.note)}`;
            body.append(b, small);
            li.append(chipEl(c), body);
            ul.append(li);
        }
        lootBox.append(ul);
        el.append(lootBox);

        const sla = noHit ? '100.00%' : `${Math.max(90, 99.99 - state.hits * 0.25).toFixed(2)}%`;
        const stats = document.createElement('dl');
        stats.className = 'sc-stats';
        stats.innerHTML = `
            <dt>SLA</dt><dd>${sla}</dd>
            <dt>NO-HIT BONUS</dt><dd>${noHit ? '+5000' : '—'}</dd>
            <dt>STAGE SCORE</dt><dd>${pad(state.score - state.stageScore0, 1)}</dd>
            <dt>TOTAL</dt><dd class="gold">${pad(state.score)}</dd>`;
        el.append(stats);

        const actions = document.createElement('div');
        actions.className = 'sc-actions';
        const last = idx === STAGES.length - 1;
        actions.innerHTML = `<button type="button" class="mbtn primary" data-action="next">${last ? '▶ FINISH' : `▶ STAGE ${idx + 2}`}</button>`;
        el.append(actions);

        el.scrollTop = 0;
        showOverlay(el);
        focusFirst(el);
    }

    function updateDeck() {
        ui.bombCount.textContent = `×${P.bombs}`;
        ui.bombBtn.disabled = !playing();
        ui.pauseBtn.disabled = state.mode !== 'game';
        $('span', ui.pauseBtn).textContent = state.paused ? '▶' : '❚❚';
    }

    function toggleMute() {
        Sound.setMuted(!Sound.isMuted());
        renderSoundBtn();
    }

    function renderSoundBtn() {
        const on = !Sound.isMuted();
        ui.soundBtn.textContent = on ? '♪ ON' : '♪ OFF';
        ui.soundBtn.setAttribute('aria-pressed', String(on));
    }

    /* ---------- wiring ---------- */
    ui.screen.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        Sound.ensure();
        Sound.sfx('select');
        switch (btn.dataset.action) {
            case 'start':
                startGame(0);
                break;
            case 'how':
                showOverlay(ui.how);
                focusFirst(ui.how);
                break;
            case 'back':
                showOverlay(ui.title);
                focusFirst(ui.title);
                break;
            case 'resume':
                setPaused(false);
                break;
            case 'quit':
                showTitle();
                focusFirst(ui.title);
                break;
            case 'next':
                nextStage();
                break;
            case 'continue':
                continueGame();
                break;
            case 'giveup':
                commitScore(ui.overEntry.hidden ? null : ui.overInitials);
                showTitle();
                focusFirst(ui.title);
                break;
            case 'again':
                commitScore($('#endInitials'));
                showTitle();
                focusFirst(ui.title);
                break;
            default:
                break;
        }
    });

    ui.soundBtn.addEventListener('click', () => {
        Sound.ensure();
        toggleMute();
    });

    const pressFx = (btn) => {
        btn.classList.add('pressed');
        setTimeout(() => btn.classList.remove('pressed'), 120);
    };
    ui.bombBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        pressFx(ui.bombBtn);
        useBomb();
    });
    ui.bombBtn.addEventListener('click', (e) => {
        // keyboard activation (pointer already handled on pointerdown)
        if (e.detail === 0) useBomb();
    });
    ui.pauseBtn.addEventListener('click', () => togglePause());

    // reading the CV pauses the game
    for (const a of $$('a[href="#manual"]')) a.addEventListener('click', () => setPaused(true));

    for (const btn of $$('.play-stage')) {
        btn.addEventListener('click', () => {
            const idx = clamp(Number(btn.dataset.stage) - 1, 0, STAGES.length - 1);
            state.visGrace = performance.now() + 1500;
            $('#top').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
            startGame(idx);
        });
    }

    const printBtn = $('#printBtn');
    if (printBtn) printBtn.addEventListener('click', () => window.print());

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) setPaused(true);
    });

    if ('IntersectionObserver' in window) {
        new IntersectionObserver((entries) => {
            for (const en of entries) {
                if (en.intersectionRatio < 0.5 && performance.now() > state.visGrace) setPaused(true);
            }
        }, { threshold: [0, 0.25, 0.5, 0.75, 1] }).observe(ui.screen);
    }

    /* ============================================================
       BOOT
       ============================================================ */
    renderSoundBtn();
    renderHiTable();
    resetLootDom();
    updateNowPanel();
    updateDeck();
    if (document.fonts && document.fonts.load) document.fonts.load(`8px ${FONT}`).catch(() => {});

    let last = performance.now();
    let acc = 0;
    function frame(now) {
        acc += Math.min(0.1, (now - last) / 1000);
        last = now;
        while (acc >= STEP) {
            update(STEP);
            acc -= STEP;
        }
        render();
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    if (DEBUG) {
        window.UPTIME = {
            state, P, STAGES, startGame,
            toBoss() {
                state.evIdx = state.timeline.ev.length;
                state.stageT = state.timeline.end + 10;
                state.enemies = [];
                setPhase('warning');
            },
            killBoss() {
                if (state.boss) {
                    state.boss.entering = false;
                    damageBoss(1e6);
                }
            },
            god(on = true) {
                P.god = on;
            },
            keys,
            step(n) {
                for (let i = 0; i < n; i++) update(STEP);
            },
        };
    }
})();
