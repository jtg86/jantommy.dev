/* ============================================================
   Jan Tommy Zonneveld — portfolio interactions
   ============================================================ */

const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- particle network background ---------- */
const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');
let particles = [];

function resizeCanvas() {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    const count = Math.min(110, Math.floor((innerWidth * innerHeight) / 16000));
    particles = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.8 + 0.6,
    }));
}
resizeCanvas();
addEventListener('resize', resizeCanvas);

function drawParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const LINK = 130;

    for (const p of particles) {
        // gentle drift + slight pull toward the cursor when close
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 180 && dist > 0.01) {
            p.vx += (dx / dist) * 0.012;
            p.vy += (dy / dist) * 0.012;
        }
        p.vx = Math.max(-0.6, Math.min(0.6, p.vx));
        p.vy = Math.max(-0.6, Math.min(0.6, p.vy));
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(34, 211, 238, 0.45)';
        ctx.fill();
    }

    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const a = particles[i], b = particles[j];
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d < LINK) {
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.strokeStyle = `rgba(34, 211, 238, ${0.10 * (1 - d / LINK)})`;
                ctx.stroke();
            }
        }
    }
    requestAnimationFrame(drawParticles);
}
if (!reducedMotion) drawParticles();

/* ---------- cursor glow ---------- */
const glow = document.getElementById('cursorGlow');
(function moveGlow() {
    glow.style.left = mouse.x + 'px';
    glow.style.top = mouse.y + 'px';
    requestAnimationFrame(moveGlow);
})();

/* ---------- eyes follow the mouse ---------- */
const pupils = document.querySelectorAll('.pupil');
(function trackEyes() {
    for (const pupil of pupils) {
        const eye = pupil.parentElement;
        const r = eye.getBoundingClientRect();
        if (r.width === 0) continue;
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const angle = Math.atan2(mouse.y - cy, mouse.x - cx);
        const dist = Math.min(r.width * 0.22, Math.hypot(mouse.x - cx, mouse.y - cy) * 0.1);
        pupil.style.transform =
            `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist}px))`;
    }
    requestAnimationFrame(trackEyes);
})();

// random blinking — creatures are alive, after all
setInterval(() => {
    const eyes = document.querySelectorAll('.eye, .g-eye');
    const eye = eyes[Math.floor(Math.random() * eyes.length)];
    if (!eye) return;
    eye.classList.add('blink');
    setTimeout(() => eye.classList.remove('blink'), 200);
}, 900);

/* ---------- terminal typing ---------- */
const TERMINAL_LINES = [
    { text: '$ whoami', cls: 't-prompt' },
    { text: 'jan_tommy — IT ops & cloud engineer', cls: '' },
    { text: '$ ./portfolio.sh --mode=awesome', cls: 't-prompt' },
    { text: '✓ Azure & M365 modules loaded', cls: 't-ok' },
    { text: '✓ PowerShell automation: ready', cls: 't-ok' },
    { text: '✓ Coffee levels: critically low', cls: 't-warn' },
    { text: '✓ Creatures initialized... they see you', cls: 't-ok' },
    { text: '$ █', cls: 't-prompt', final: true },
];

const termBody = document.getElementById('terminalBody');
let lineIdx = 0, charIdx = 0;

function typeTerminal() {
    if (lineIdx >= TERMINAL_LINES.length) return;
    const line = TERMINAL_LINES[lineIdx];

    if (line.final) {
        const span = document.createElement('span');
        span.className = line.cls;
        span.textContent = '$ ';
        termBody.appendChild(span);
        const cur = document.createElement('span');
        cur.className = 't-cursor';
        termBody.appendChild(cur);
        return;
    }

    if (charIdx === 0) {
        const span = document.createElement('span');
        span.className = line.cls;
        span.dataset.line = lineIdx;
        termBody.appendChild(span);
    }
    const span = termBody.querySelector(`[data-line="${lineIdx}"]`);
    span.textContent = line.text.slice(0, ++charIdx);

    if (charIdx >= line.text.length) {
        termBody.appendChild(document.createTextNode('\n'));
        lineIdx++;
        charIdx = 0;
        setTimeout(typeTerminal, line.cls === 't-prompt' ? 300 : 140);
    } else {
        setTimeout(typeTerminal, line.cls === 't-prompt' ? 45 : 14);
    }
}
setTimeout(typeTerminal, 700);

/* ---------- mascot ---------- */
const mascot = document.getElementById('mascot');
const speech = document.getElementById('mascotSpeech');
const botMouth = document.getElementById('botMouth');

const QUIPS = [
    'Have you tried turning it off and on again?',
    'I automate things while Jan Tommy sleeps. 🤫',
    'sudo make me a sandwich',
    '99 little bugs in the code... 🐛',
    'Fun fact: I run on PowerShell and coffee.',
    'Stop poking me, I\'m in a Teams meeting.',
    'Terraform plan: 1 to add, 0 to destroy. Nice.',
    'I\'ve seen things... unfiltered ticket queues.',
    'Ctrl+Z works on code, not on life choices.',
    'My uptime is better than my small talk.',
];

let speechTimer;
mascot.addEventListener('click', () => {
    mascot.classList.remove('bounce');
    void mascot.offsetWidth; // restart animation
    mascot.classList.add('bounce');
    botMouth.classList.add('happy');

    speech.textContent = QUIPS[Math.floor(Math.random() * QUIPS.length)];
    speech.classList.add('show');
    clearTimeout(speechTimer);
    speechTimer = setTimeout(() => {
        speech.classList.remove('show');
        botMouth.classList.remove('happy');
    }, 3000);
});

// greet once shortly after load
setTimeout(() => {
    speech.classList.add('show');
    speechTimer = setTimeout(() => speech.classList.remove('show'), 3500);
}, 1800);

/* ---------- peeker creature (hides if you get close) ---------- */
const peeker = document.getElementById('peeker');
let peekerShy = false;

addEventListener('scroll', () => {
    const nearBottom = scrollY > 400;
    if (nearBottom && !peekerShy) peeker.classList.add('up');
    if (!nearBottom) peeker.classList.remove('up');
}, { passive: true });

setInterval(() => {
    if (!peeker.classList.contains('up') || peekerShy) return;
    const r = peeker.getBoundingClientRect();
    const d = Math.hypot(mouse.x - (r.left + r.width / 2), mouse.y - (r.top + r.height / 2));
    if (d < 130) {
        peekerShy = true;
        peeker.classList.add('hiding');
        peeker.classList.remove('up');
        setTimeout(() => {
            peeker.classList.remove('hiding');
            peekerShy = false;
        }, 4000);
    }
}, 200);

/* ---------- reveal on scroll + counters + skill bars ---------- */
const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('visible');

        for (const counter of entry.target.querySelectorAll('.stat-number')) {
            if (counter.dataset.done) continue;
            counter.dataset.done = '1';
            const target = +counter.dataset.count;
            const t0 = performance.now();
            (function tick(now) {
                const p = Math.min(1, (now - t0) / 1400);
                counter.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
                if (p < 1) requestAnimationFrame(tick);
            })(t0);
        }
        observer.unobserve(entry.target);
    }
}, { threshold: 0.18 });

document.querySelectorAll('.reveal, .skill-card').forEach((el) => observer.observe(el));

/* ---------- 3D tilt cards ---------- */
for (const card of document.querySelectorAll('.tilt')) {
    card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.style.transform =
            `perspective(900px) rotateY(${(px - 0.5) * 10}deg) rotateX(${(0.5 - py) * 8}deg) translateY(-3px)`;
        card.style.setProperty('--mx', `${px * 100}%`);
        card.style.setProperty('--my', `${py * 100}%`);
    });
    card.addEventListener('mouseleave', () => {
        card.style.transform = '';
    });
}

/* ---------- nav ---------- */
const nav = document.getElementById('nav');
const navLinks = document.getElementById('navLinks');
const burger = document.getElementById('navBurger');

addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', scrollY > 30);

    // highlight active section
    let current = '';
    for (const sec of document.querySelectorAll('section[id], header[id]')) {
        if (scrollY >= sec.offsetTop - 200) current = sec.id;
    }
    for (const link of document.querySelectorAll('.nav-link')) {
        link.classList.toggle('active', link.getAttribute('href') === '#' + current);
    }
}, { passive: true });

burger.addEventListener('click', () => {
    burger.classList.toggle('open');
    navLinks.classList.toggle('open');
});
navLinks.addEventListener('click', (e) => {
    if (e.target.matches('a')) {
        burger.classList.remove('open');
        navLinks.classList.remove('open');
    }
});

/* ---------- terraform lab ---------- */
const labTerm = document.getElementById('labTerminal');
const labBtns = document.querySelectorAll('.lab-btn');
const diagramStatus = document.getElementById('diagramStatus');
const rgBox = document.getElementById('rgBox');
const RESOURCES = [
    { id: 'app', tf: 'azurerm_linux_web_app.api', t: 41 },
    { id: 'kv', tf: 'azurerm_key_vault.kv', t: 28 },
    { id: 'oai', tf: 'azurerm_cognitive_account.openai', t: 64 },
    { id: 'ins', tf: 'azurerm_application_insights.monitor', t: 12 },
];

const lab = { initDone: false, applied: false, busy: false };

function labPrint(lines) {
    // lines: [{text, cls, run}] — appended sequentially with a typing feel
    return new Promise((resolve) => {
        let i = 0;
        (function next() {
            if (i >= lines.length) return resolve();
            const line = lines[i++];
            const span = document.createElement('span');
            span.className = line.cls || '';
            span.textContent = line.text + '\n';
            labTerm.appendChild(span);
            labTerm.scrollTop = labTerm.scrollHeight;
            if (line.run) line.run();
            setTimeout(next, line.pause ?? 220);
        })();
    });
}

function setNodes(cls) {
    rgBox.classList.toggle('alive', cls === 'alive');
    for (const n of document.querySelectorAll('.node')) {
        n.classList.remove('planned', 'alive');
        if (cls) n.classList.add(cls);
    }
}

const LAB_CMDS = {
    async init() {
        await labPrint([
            { text: '$ terraform init', cls: 't-prompt' },
            { text: 'Initializing the backend...', pause: 350 },
            { text: 'Initializing provider plugins...', pause: 350 },
            { text: '- Installing hashicorp/azurerm v4.12.0...', pause: 600 },
            { text: '✓ Terraform has been initialized successfully!', cls: 't-ok' },
        ]);
        lab.initDone = true;
    },
    async plan() {
        if (!lab.initDone) {
            return labPrint([
                { text: '$ terraform plan', cls: 't-prompt' },
                { text: 'Error: no .terraform directory — run terraform init first 😉', cls: 't-err' },
            ]);
        }
        await labPrint([
            { text: '$ terraform plan', cls: 't-prompt' },
            { text: 'Terraform will perform the following actions:', pause: 320 },
            ...RESOURCES.map((r) => ({ text: `  + ${r.tf}`, cls: 't-add', pause: 240 })),
            {
                text: 'Plan: 4 to add, 0 to change, 0 to destroy.', cls: 't-ok',
                run: () => {
                    if (!lab.applied) {
                        setNodes('planned');
                        diagramStatus.textContent = 'state: 4 resources planned (+)';
                    }
                },
            },
        ]);
    },
    async apply() {
        if (!lab.initDone) {
            return labPrint([
                { text: '$ terraform apply', cls: 't-prompt' },
                { text: 'Error: no .terraform directory — run terraform init first 😉', cls: 't-err' },
            ]);
        }
        if (lab.applied) {
            return labPrint([
                { text: '$ terraform apply', cls: 't-prompt' },
                { text: 'No changes. Your infrastructure matches the configuration. ✨', cls: 't-ok' },
            ]);
        }
        const steps = [{ text: '$ terraform apply -auto-approve', cls: 't-prompt', pause: 400 }];
        for (const r of RESOURCES) {
            steps.push({ text: `${r.tf}: Creating...`, pause: 550 });
            steps.push({
                text: `${r.tf}: Creation complete after ${r.t}s`, cls: 't-ok', pause: 300,
                run: () => document.querySelector(`.node[data-res="${r.id}"]`)?.classList.add('alive'),
            });
        }
        steps.push({ text: '✓ Managed Identity wired up — no API keys anywhere', cls: 't-ok', pause: 320 });
        steps.push({ text: '✓ RBAC: least-privilege roles assigned', cls: 't-ok', pause: 320 });
        steps.push({ text: '✓ Diagnostics streaming to Log Analytics', cls: 't-ok', pause: 320 });
        steps.push({
            text: 'Apply complete! Resources: 4 added, 0 changed, 0 destroyed. 🎉', cls: 't-ok',
            run: () => {
                rgBox.classList.add('alive');
                diagramStatus.textContent = 'state: 4 resources deployed ✓ (the OpenAI node is watching you)';
                diagramStatus.classList.add('ok');
            },
        });
        await labPrint(steps);
        lab.applied = true;
    },
    async destroy() {
        if (!lab.applied) {
            return labPrint([
                { text: '$ terraform destroy', cls: 't-prompt' },
                { text: 'Nothing to destroy — the cloud is already empty. 🌧', cls: 't-warn' },
            ]);
        }
        await labPrint([
            { text: '$ terraform destroy -auto-approve', cls: 't-prompt', pause: 400 },
            ...RESOURCES.map((r) => ({
                text: `${r.tf}: Destruction complete`, cls: 't-err', pause: 320,
                run: () => document.querySelector(`.node[data-res="${r.id}"]`)?.classList.remove('alive'),
            })),
            {
                text: 'Destroy complete! Resources: 4 destroyed. 💸 saved.', cls: 't-warn',
                run: () => {
                    setNodes(null);
                    diagramStatus.textContent = 'state: empty — nothing deployed yet';
                    diagramStatus.classList.remove('ok');
                },
            },
        ]);
        lab.applied = false;
    },
};

for (const btn of labBtns) {
    btn.addEventListener('click', async () => {
        if (lab.busy) return;
        lab.busy = true;
        labBtns.forEach((b) => (b.disabled = true));
        await LAB_CMDS[btn.dataset.cmd]();
        labBtns.forEach((b) => (b.disabled = false));
        lab.busy = false;
    });
}

/* ---------- cert filters ---------- */
const certFilters = document.getElementById('certFilters');
certFilters.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    certFilters.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
    const f = btn.dataset.f;
    for (const card of document.querySelectorAll('.cert-card')) {
        card.classList.toggle('filtered-out', f !== 'all' && card.dataset.cat !== f);
    }
});

/* ---------- Konami code → party mode ---------- */
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let konamiPos = 0;

addEventListener('keydown', (e) => {
    konamiPos = e.key === KONAMI[konamiPos] ? konamiPos + 1 : (e.key === KONAMI[0] ? 1 : 0);
    if (konamiPos < KONAMI.length) return;
    konamiPos = 0;

    document.body.classList.add('party');
    speech.textContent = 'PARTY MODE ACTIVATED!! 🎉';
    speech.classList.add('show');

    const CRITTERS = ['🤖', '👾', '🛸', '🐙', '☁️', '⚡', '🦑', '💾'];
    for (let i = 0; i < 40; i++) {
        setTimeout(() => {
            const c = document.createElement('div');
            c.className = 'confetti-creature';
            c.textContent = CRITTERS[Math.floor(Math.random() * CRITTERS.length)];
            c.style.left = Math.random() * 100 + 'vw';
            c.style.animationDuration = 2.5 + Math.random() * 3 + 's';
            document.body.appendChild(c);
            setTimeout(() => c.remove(), 6500);
        }, i * 120);
    }

    setTimeout(() => {
        document.body.classList.remove('party');
        speech.classList.remove('show');
    }, 8000);
});
