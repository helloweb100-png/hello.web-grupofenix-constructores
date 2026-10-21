/* ==========================================================================
   GRUPO FÉNIX CONSTRUCTORES · app.js
   JavaScript nativo, sin dependencias.

   IMPORTANTE (antes de publicar):
   → Cambia CONFIG.whatsapp por el número real del negocio.
     Formato: código de país + número, solo dígitos. Ej. México: 521XXXXXXXXXX

   Estructura
   01 Config y helpers          09 Hero (rotador, chispas, inclinación)
   02 Motor de scroll           10 Servicios apilados
   03 Preloader                 11 Imagen expandible
   04 Texto dividido            12 Proceso (línea de tiempo)
   05 Reveal y contadores       13 Galería horizontal
   06 Header, menú y scrollspy  14 Antes / Después
   07 Parallax                  15 Visor de fotos
   08 Marquee                   16 FAQ, formulario, WhatsApp, extras
   ========================================================================== */
(() => {
    'use strict';

    /* 01 · CONFIG Y HELPERS ---------------------------------------------- */
    const CONFIG = {
        whatsapp: '520000000000',          // ← REEMPLAZAR por el número real
        brand: 'Grupo Fénix Constructores',
        defaultMessage: 'Hola, vi su página web y quiero cotizar una obra.'
    };

    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
    const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const prog = (v, a, b) => clamp((v - a) / (b - a));
    const rand = (a, b) => a + Math.random() * (b - a);
    const easeIO = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const easeOutExpo = t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
    const docTop = el => el.getBoundingClientRect().top + window.scrollY;

    const root = document.documentElement;
    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const FINE = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const isDesktop = () => window.matchMedia('(min-width: 900px)').matches;

    let vh = window.innerHeight;
    let vw = window.innerWidth;

    if (CONFIG.whatsapp === '520000000000') {
        console.warn('[Fénix] Falta configurar el número de WhatsApp en app.js (CONFIG.whatsapp).');
    }
    const waUrl = msg => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg || CONFIG.defaultMessage)}`;


    /* 02 · MOTOR DE SCROLL ------------------------------------------------
       Un solo requestAnimationFrame para toda la página. Los módulos se
       registran como "tareas de scroll" (corren cuando cambia el scroll) o
       "ticks" (corren siempre: partículas, marquee, inclinación).
       El scroll suave (tipo inercia) solo se activa con mouse/trackpad. */
    const Engine = (() => {
        const scrollTasks = [];
        const ticks = [];
        const measures = [[], [], []];   // fases: 0 = cambian el layout | 1 = solo lecturas | 2 = lecturas + escrituras sin efecto en el layout
        let queued = false;
        let lastY = -1;
        let dirty = true;
        let docH = 0;
        let last = performance.now();

        // Scroll suave por inercia (solo puntero fino, sin movimiento reducido)
        const smooth = {
            on: FINE && !REDUCED,
            target: window.scrollY,
            current: window.scrollY,
            applied: window.scrollY,
            max: () => Math.max(0, root.scrollHeight - window.innerHeight),
            blocked: () => root.classList.contains('is-locked') || root.classList.contains('is-loading')
        };

        const normalizeDelta = e => (e.deltaMode === 1 ? e.deltaY * 34 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY);

        if (smooth.on) {
            window.addEventListener('wheel', e => {
                if (e.ctrlKey || smooth.blocked()) return;
                if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
                if (e.target.closest && e.target.closest('textarea, select, [data-native-scroll], dialog[open], .menu.is-open')) return;
                e.preventDefault();
                if (Math.abs(smooth.current - window.scrollY) > 2) smooth.current = smooth.target = window.scrollY;
                smooth.target = clamp(smooth.target + normalizeDelta(e), 0, smooth.max());
            }, { passive: false });

            // Teclado: flechas, RePág/AvPág, espacio, inicio/fin
            window.addEventListener('keydown', e => {
                if (smooth.blocked() || e.altKey || e.ctrlKey || e.metaKey) return;
                if (e.target !== document.body && e.target !== root) return;
                const step = { ArrowDown: 80, ArrowUp: -80, PageDown: window.innerHeight * .88, PageUp: -window.innerHeight * .88 }[e.key];
                if (e.key === ' ') {
                    e.preventDefault();
                    smooth.target = clamp(smooth.target + (e.shiftKey ? -1 : 1) * window.innerHeight * .88, 0, smooth.max());
                } else if (e.key === 'Home') { e.preventDefault(); smooth.target = 0; }
                else if (e.key === 'End') { e.preventDefault(); smooth.target = smooth.max(); }
                else if (step) { e.preventDefault(); smooth.target = clamp(smooth.target + step, 0, smooth.max()); }
            });
        }

        function stepSmooth(dt) {
            if (!smooth.on || smooth.blocked()) {
                smooth.current = smooth.target = smooth.applied = window.scrollY;
                return;
            }
            const sy = window.scrollY;
            // Cambio externo (barra de scroll, ancla nativa): sincronizar
            if (Math.abs(sy - smooth.applied) > 1.5) { smooth.current = smooth.target = smooth.applied = sy; return; }
            const diff = smooth.target - smooth.current;
            if (Math.abs(diff) < .25) {
                if (smooth.current !== smooth.target) { smooth.current = smooth.target; window.scrollTo(0, smooth.current); smooth.applied = window.scrollY; }
                return;
            }
            smooth.current += diff * (1 - Math.exp(-dt * 6.2));
            window.scrollTo(0, smooth.current);
            smooth.applied = window.scrollY;
        }

        function scrollTo(y, instant) {
            const top = clamp(y, 0, smooth.max());
            if (instant) { smooth.current = smooth.target = top; window.scrollTo(0, top); smooth.applied = window.scrollY; return; }
            if (smooth.on) { smooth.target = top; return; }
            window.scrollTo({ top, behavior: REDUCED ? 'auto' : 'smooth' });
        }

        function frame(now) {
            const dt = Math.min(.05, (now - last) / 1000);
            last = now;
            stepSmooth(dt);
            const y = window.scrollY;
            if (y !== lastY || dirty) {
                const vel = lastY < 0 ? 0 : y - lastY;
                for (let i = 0; i < scrollTasks.length; i++) scrollTasks[i](y, vel);
                lastY = y; dirty = false;
            }
            for (let i = 0; i < ticks.length; i++) ticks[i](now, dt);
            requestAnimationFrame(frame);
        }

        // Mide todo por fases para no forzar recálculos de layout entre lecturas y escrituras
        const measureAll = () => {
            vh = window.innerHeight; vw = window.innerWidth;
            measures[0].forEach(fn => fn());
            docH = root.scrollHeight;
            measures[1].forEach(fn => fn());
            measures[2].forEach(fn => fn());
            dirty = true;
        };
        // Varias peticiones seguidas se fusionan en una sola medición por frame
        const requestMeasure = () => {
            if (queued) return;
            queued = true;
            requestAnimationFrame(() => { queued = false; measureAll(); });
        };

        let rt;
        window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(requestMeasure, 140); });
        const mainEl = $('main');
        if (mainEl && 'ResizeObserver' in window) {
            let h = mainEl.offsetHeight;
            new ResizeObserver(() => {
                if (Math.abs(mainEl.offsetHeight - h) < 2) return;
                h = mainEl.offsetHeight;
                requestMeasure();
            }).observe(mainEl);
        }

        return {
            onScroll: fn => scrollTasks.push(fn),
            onTick: fn => ticks.push(fn),
            onMeasure: (fn, phase = 1) => { measures[phase].push(fn); },   // se ejecuta dentro de measureAll
            maxScroll: () => Math.max(0, docH - vh),
            measureAll, requestMeasure, scrollTo,
            start: () => requestAnimationFrame(frame),
            markDirty: () => { dirty = true; }
        };
    })();

    // Anclas internas con scroll suave
    document.addEventListener('click', e => {
        const a = e.target.closest('a[href^="#"]');
        if (!a || a.hasAttribute('data-wa-live')) return;
        const id = a.getAttribute('href');
        if (id.length < 2) return;
        const el = document.getElementById(id.slice(1));
        if (!el) return;
        e.preventDefault();
        Menu.close(true);
        Engine.scrollTo(docTop(el));
        history.replaceState(null, '', id);
    });


    /* 03 · PRELOADER ------------------------------------------------------
       Etapas de obra sincronizadas con el progreso. Se abre cuando la página
       terminó de cargar (con mínimo de tiempo para que se aprecie). */
    function runLoader() {
        const loader = $('#loader');
        const finishReady = () => {
            root.classList.remove('is-loading');
            root.classList.add('is-ready');
            document.dispatchEvent(new Event('fenix:ready'));
        };
        if (!loader) { finishReady(); return; }

        const pctEl = $('#loader-pct');
        const stageEl = $('#loader-stage');
        const stages = [[0, 'Preparando terreno'], [24, 'Cimentando'], [50, 'Levantando estructura'], [76, 'Instalaciones y acabados'], [97, 'Obra lista']];
        const MIN = REDUCED ? 450 : 2300;
        const t0 = performance.now();
        let loaded = false, shown = 0, currentStage = -1;

        Promise.all([
            document.readyState === 'complete' ? Promise.resolve() : new Promise(r => window.addEventListener('load', r, { once: true })),
            document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()
        ]).then(() => { loaded = true; });
        setTimeout(() => { loaded = true; }, 7000);                       // seguro anti-bloqueo

        const finish = () => {
            loader.style.setProperty('--p', 100);
            pctEl.textContent = '100';
            stageEl.textContent = 'Obra lista';
            window.scrollTo(0, 0);
            loader.classList.add('is-done');                             // abre las compuertas
            setTimeout(finishReady, REDUCED ? 0 : 520);                  // el hero entra mientras abren
            setTimeout(() => loader.classList.add('is-gone'), REDUCED ? 60 : 1500);
        };

        const loop = now => {
            const t = prog(now - t0, 0, MIN);
            let target = easeIO(t) * 100;
            if (!loaded) target = Math.min(target, 91);
            shown = lerp(shown, target, .16);
            const v = Math.min(shown, 99.4);
            loader.style.setProperty('--p', v.toFixed(2));
            pctEl.textContent = String(Math.round(v));
            let s = 0;
            stages.forEach((st, i) => { if (v >= st[0]) s = i; });
            if (s !== currentStage) { currentStage = s; stageEl.textContent = stages[s][1]; }
            if (loaded && t >= 1 && shown > 98.6) finish(); else requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }


    /* 04 · TEXTO DIVIDIDO -------------------------------------------------
       Divide encabezados en palabras (o letras) para animarlos con máscara.
       El encabezado conserva su texto original en aria-label. */
    function splitText(el, mode) {
        const original = el.textContent.replace(/\s+/g, ' ').trim();
        // El texto real queda en el DOM (SEO, sin duplicados); los lectores de pantalla usan aria-label
        if (/^H[1-6]$/.test(el.tagName)) el.setAttribute('aria-label', original);
        const vis = document.createElement('span');
        vis.setAttribute('aria-hidden', 'true');
        let i = 0;
        const walk = (node, parent) => {
            node.childNodes.forEach(n => {
                if (n.nodeType === 3) {
                    n.textContent.split(/(\s+)/).forEach(tok => {
                        if (!tok) return;
                        if (/^\s+$/.test(tok)) { parent.appendChild(document.createTextNode(' ')); return; }
                        if (mode === 'chars') {
                            Array.from(tok).forEach(ch => {
                                const c = document.createElement('span');
                                c.className = 'sw__i'; c.style.setProperty('--i', i++); c.textContent = ch;
                                parent.appendChild(c);
                            });
                        } else {
                            const w = document.createElement('span'); w.className = 'sw';
                            const inner = document.createElement('span'); inner.className = 'sw__i';
                            inner.style.setProperty('--i', i++); inner.textContent = tok;
                            w.appendChild(inner); parent.appendChild(w);
                        }
                    });
                } else if (n.nodeType === 1) {
                    const clone = n.cloneNode(false);
                    parent.appendChild(clone);
                    walk(n, clone);
                }
            });
        };
        walk(el, vis);
        el.textContent = '';
        el.append(vis);
    }

    // Texto que se enciende palabra por palabra con el scroll
    function initScrubText() {
        const el = $('[data-scrub]');
        if (!el) return;
        const words = [];
        const walk = node => {
            Array.from(node.childNodes).forEach(n => {
                if (n.nodeType === 3) {
                    const frag = document.createDocumentFragment();
                    n.textContent.split(/(\s+)/).forEach(tok => {
                        if (!tok) return;
                        if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); return; }
                        const s = document.createElement('span'); s.className = 'sc'; s.textContent = tok;
                        words.push({ el: s, v: -1 }); frag.appendChild(s);
                    });
                    n.replaceWith(frag);
                } else if (n.nodeType === 1) walk(n);
            });
        };
        walk(el);
        if (REDUCED) { words.forEach(w => w.el.style.setProperty('--w', 1)); return; }

        let top = 0, h = 0;
        Engine.onMeasure(() => { top = docTop(el); h = el.offsetHeight; });
        Engine.onScroll(y => {
            const p = prog(y + vh * .82, top, top + h + vh * .34);
            const n = words.length;
            for (let i = 0; i < n; i++) {
                const v = Math.round(clamp((p * (n + 7) - i) / 7) * 100) / 100;
                if (v !== words[i].v) { words[i].v = v; words[i].el.style.setProperty('--w', v); }
            }
        });
    }


    /* 05 · REVEAL Y CONTADORES ------------------------------------------------ */
    function initReveal() {
        $$('[data-stagger]').forEach(group => {
            $$('[data-reveal]', group).forEach((el, i) => el.style.setProperty('--d', (i * 0.09).toFixed(2) + 's'));
        });
        const targets = $$('[data-reveal], [data-split]').filter(el => !el.closest('.hero'));
        if (!('IntersectionObserver' in window) || REDUCED) { targets.forEach(el => el.classList.add('is-in')); return; }
        const io = new IntersectionObserver(entries => {
            entries.forEach(en => {
                if (!en.isIntersecting) return;
                en.target.classList.add('is-in');
                io.unobserve(en.target);
            });
        }, { threshold: .14, rootMargin: '0px 0px -6% 0px' });
        targets.forEach(el => io.observe(el));
    }

    function initCounters() {
        $$('[data-count]').forEach(el => {
            const end = parseFloat(el.dataset.count);
            const run = () => {
                if (REDUCED) { el.textContent = end; return; }
                const t0 = performance.now(), dur = 2000;
                const step = now => {
                    const t = prog(now - t0, 0, dur);
                    el.textContent = Math.round(end * easeOutExpo(t));
                    if (t < 1) requestAnimationFrame(step);
                };
                requestAnimationFrame(step);
            };
            if (!('IntersectionObserver' in window)) { el.textContent = end; return; }
            const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { run(); io.disconnect(); } }, { threshold: .45 });
            io.observe(el);
        });
    }


    /* 06 · HEADER, MENÚ Y SCROLLSPY ----------------------------------------------- */
    const Menu = (() => {
        const menu = $('#menu'), burger = $('#burger');
        let open = false;
        const set = (state, silent) => {
            if (!menu || state === open) return;
            open = state;
            menu.classList.toggle('is-open', open);
            if (open) menu.removeAttribute('inert'); else menu.setAttribute('inert', '');
            burger.setAttribute('aria-expanded', String(open));
            burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
            root.classList.toggle('menu-open', open);
            root.classList.toggle('is-locked', open);
            if (open) { const first = $('.menu__link', menu); if (first) setTimeout(() => first.focus({ preventScroll: true }), 450); }
            else if (!silent) burger.focus({ preventScroll: true });
        };
        if (burger) burger.addEventListener('click', () => set(!open));
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && open) set(false); });
        window.addEventListener('resize', () => { if (open && window.innerWidth >= 1100) set(false, true); });
        return { close: silent => set(false, silent) };
    })();

    function initHeader() {
        const header = $('#header');
        const bar = $('#progress');
        const links = $$('.nav a');
        const secs = links.map(a => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
        let tops = [];
        Engine.onMeasure(() => { tops = secs.map(s => docTop(s)); });
        let activeIdx = -2, stuck = false;
        Engine.onScroll(y => {
            const s = y > 24;
            if (s !== stuck) { stuck = s; header.classList.toggle('is-stuck', s); }
            const max = Engine.maxScroll();
            bar.style.transform = `scaleX(${max > 0 ? clamp(y / max).toFixed(4) : 0})`;
            let idx = -1;
            for (let i = 0; i < tops.length; i++) if (y + vh * .4 >= tops[i]) idx = i;
            if (idx !== activeIdx) {
                activeIdx = idx;
                links.forEach((a, i) => a.classList.toggle('is-active', i === idx));
            }
        });
    }


    /* 07 · PARALLAX ---------------------------------------------------------------------- */
    function initParallax() {
        if (REDUCED) return;
        // Fondo del hero: se desplaza más lento que la página
        const bg = $('.hero__bg');
        if (bg) Engine.onScroll(y => { if (y < vh * 1.5) bg.style.transform = `translate3d(0, ${(y * .28).toFixed(1)}px, 0)`; });
    }


    /* 08 · MARQUEE (reacciona a la velocidad del scroll) ----------------------------------- */
    function initMarquee() {
        const track = $('#marquee');
        if (!track) return;
        const original = Array.from(track.children);
        let setW = 0, x = 0, boost = 0, dirSign = 1;
        const build = () => {
            Array.from(track.children).slice(original.length).forEach(n => n.remove());
            setW = track.scrollWidth + parseFloat(getComputedStyle(track).columnGap || 0);
            const copies = Math.ceil((vw * 2) / Math.max(setW, 1)) + 1;
            for (let c = 0; c < copies; c++) original.forEach(n => track.appendChild(n.cloneNode(true)));
        };
        Engine.onMeasure(build, 0);
        Engine.onScroll((y, vel) => {
            if (vel) { boost = lerp(boost, clamp(vel, -90, 90), .35); if (Math.abs(vel) > 1.5) dirSign = vel > 0 ? 1 : -1; }
        });
        if (REDUCED) return;
        Engine.onTick((t, dt) => {
            boost *= Math.pow(.02, dt);
            const speed = 70 * dirSign + boost * 24;
            x -= speed * dt;
            if (setW) { x = ((x % setW) - setW) % setW; }
            track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
        });
    }


    /* 09 · HERO ---------------------------------------------------------------------------------
       Rotador de palabras, chispas de soldadura (canvas) e inclinación 3D. */
    function glowSprite() {
        const s = 64, c = document.createElement('canvas');
        c.width = c.height = s;
        const g = c.getContext('2d');
        const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        gr.addColorStop(0, 'rgba(255,246,205,1)');
        gr.addColorStop(.16, 'rgba(255,196,86,.95)');
        gr.addColorStop(.48, 'rgba(255,104,24,.36)');
        gr.addColorStop(1, 'rgba(255,60,0,0)');
        g.fillStyle = gr; g.fillRect(0, 0, s, s);
        return c;
    }

    class Sparks {
        constructor(canvas, opts = {}) {
            this.c = canvas;
            this.ctx = canvas.getContext('2d');
            this.rate = opts.rate || 20;          // brasas por segundo
            this.max = opts.max || 240;
            this.bias = opts.bias || 1;
            this.sprite = glowSprite();
            this.p = []; this.acc = 0; this.visible = false;
            this.w = 0; this.h = 0; this.dpr = 1;
            if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; }).observe(canvas);
            else this.visible = true;
            Engine.onMeasure(() => this.measure(), 2);
            Engine.onTick((t, dt) => this.step(dt));
        }
        measure() {
            const r = this.c.getBoundingClientRect();
            this.dpr = Math.min(window.devicePixelRatio || 1, 1.75);
            this.w = r.width; this.h = r.height;
            this.c.width = Math.max(1, Math.round(r.width * this.dpr));
            this.c.height = Math.max(1, Math.round(r.height * this.dpr));
            this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        }
        ember() {
            this.p.push({
                t: 0, x: Math.pow(Math.random(), this.bias) * this.w, y: this.h + 12,
                vx: rand(-8, 8), vy: -rand(30, 110), s: rand(3, 13), a: rand(.5, 1),
                life: rand(5, 11), age: 0, ph: rand(0, 6.28), sw: rand(.5, 1.6), amp: rand(6, 22)
            });
        }
        burst(x, y, n = 14, power = 1) {
            for (let i = 0; i < n && this.p.length < this.max + 120; i++) {
                const a = -Math.PI / 2 + rand(-1.15, 1.15), sp = rand(140, 520) * power;
                this.p.push({ t: 1, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, s: rand(.8, 1.9), life: rand(.5, 1.25), age: 0 });
            }
        }
        step(dt) {
            if (!this.visible || document.hidden || REDUCED || root.classList.contains('is-loading')) return;
            const { ctx, w, h } = this;
            this.acc += dt * this.rate;
            while (this.acc >= 1) { this.acc -= 1; if (this.p.length < this.max) this.ember(); }
            ctx.clearRect(0, 0, w, h);
            ctx.globalCompositeOperation = 'lighter';
            ctx.lineCap = 'round';
            for (let i = this.p.length - 1; i >= 0; i--) {
                const q = this.p[i];
                q.age += dt;
                const k = q.age / q.life;
                if (k >= 1 || q.y < -50 || q.y > h + 60) { this.p[i] = this.p[this.p.length - 1]; this.p.pop(); continue; }
                if (q.t === 0) {
                    q.x += (q.vx + Math.sin(q.ph + q.age * q.sw) * q.amp) * dt;
                    q.y += q.vy * dt;
                    const flick = .78 + .22 * Math.sin(q.age * 17 + q.ph);
                    ctx.globalAlpha = Math.sin(Math.PI * Math.min(k * 1.15, 1)) * q.a * flick;
                    const s = q.s * (1 - k * .5);
                    ctx.drawImage(this.sprite, q.x - s, q.y - s, s * 2, s * 2);
                } else {
                    q.vy += 660 * dt; q.vx *= 1 - 1.2 * dt; q.vy *= 1 - .5 * dt;
                    q.x += q.vx * dt; q.y += q.vy * dt;
                    ctx.globalAlpha = 1 - k;
                    ctx.strokeStyle = `rgb(255,${Math.round(232 - k * 120)},${Math.round(150 - k * 120)})`;
                    ctx.lineWidth = q.s * (1 - k * .45);
                    ctx.beginPath();
                    ctx.moveTo(q.x - q.vx * .035, q.y - q.vy * .035);
                    ctx.lineTo(q.x, q.y);
                    ctx.stroke();
                }
            }
            ctx.globalAlpha = 1;
        }
    }

    let heroSparks = null, contactSparks = null;

    function initHero() {
        const hero = $('.hero');
        if (!hero) return;

        $$('[data-hero]').forEach(el => el.style.setProperty('--h', el.dataset.hero));

        // Las palabras del rotador se inyectan aquí como contenido CSS: el texto real del h1 sigue siendo "Construimos obra civil"
        const rot = $('#rot');
        if (rot && rot.dataset.words) {
            rot.dataset.words.split('|').forEach(w => {
                const s = document.createElement('span');
                s.className = 'rot__w'; s.setAttribute('aria-hidden', 'true'); s.dataset.w = w;   // texto vía CSS (attr), no entra al texto del h1
                rot.appendChild(s);
            });
        }

        document.addEventListener('fenix:ready', startRotator, { once: true });

        // Rotador de palabras (constante)
        function startRotator() {
            if (!rot || REDUCED) return;
            const words = $$('.rot__w', rot);
            let i = 0;
            setInterval(() => {
                if (document.hidden) return;
                const cur = words[i];
                i = (i + 1) % words.length;
                const next = words[i];
                cur.classList.remove('is-on'); cur.classList.add('is-off');
                next.classList.add('is-on');
                setTimeout(() => cur.classList.remove('is-off'), 950);
            }, 2700);
        }

        // Chispas
        const canvas = $('#sparks-hero');
        if (canvas && !REDUCED) {
            const small = window.matchMedia('(max-width: 700px)').matches;
            heroSparks = new Sparks(canvas, { rate: small ? 12 : 34, max: small ? 110 : 320, bias: 1.35 });
            // Soldadura interactiva: chispas al mover el puntero y al tocar
            if (FINE) {
                let lx = 0, ly = 0, lt = 0;
                hero.addEventListener('pointermove', e => {
                    const now = performance.now();
                    if (now - lt < 45) return;
                    const r = canvas.getBoundingClientRect();
                    const x = e.clientX - r.left, y = e.clientY - r.top;
                    if (Math.hypot(x - lx, y - ly) > 14) heroSparks.burst(x, y, 3, .8);
                    lx = x; ly = y; lt = now;
                });
            }
            hero.addEventListener('pointerdown', e => {
                if (e.target.closest('a, button')) return;
                const r = canvas.getBoundingClientRect();
                heroSparks.burst(e.clientX - r.left, e.clientY - r.top, 26, 1);
            });
        }

        // Inclinación 3D de la foto según el puntero
        const hv = $('#hv');
        if (hv && FINE && !REDUCED) {
            const cur = { rx: 0, ry: 0, px: 0, py: 0 }, tar = { rx: 0, ry: 0, px: 0, py: 0 };
            hero.addEventListener('pointermove', e => {
                const nx = (e.clientX / vw - .5) * 2, ny = (e.clientY / vh - .5) * 2;
                tar.ry = nx * 8; tar.rx = -ny * 6; tar.px = -nx * 10; tar.py = -ny * 10;
            });
            hero.addEventListener('pointerleave', () => { tar.rx = tar.ry = tar.px = tar.py = 0; });
            Engine.onTick(() => {
                let moving = false;
                for (const k in cur) { const d = tar[k] - cur[k]; if (Math.abs(d) > .01) { cur[k] += d * .08; moving = true; } }
                if (!moving) return;
                hv.style.setProperty('--rx', cur.rx.toFixed(2) + 'deg');
                hv.style.setProperty('--ry', cur.ry.toFixed(2) + 'deg');
                hv.style.setProperty('--px', cur.px.toFixed(1) + 'px');
                hv.style.setProperty('--py', cur.py.toFixed(1) + 'px');
            });
        }

        // Botones magnéticos
        if (FINE && !REDUCED) {
            $$('[data-magnetic]').forEach(btn => {
                const s = { x: 0, y: 0, tx: 0, ty: 0 };
                btn.addEventListener('pointermove', e => {
                    const r = btn.getBoundingClientRect();
                    s.tx = (e.clientX - (r.left + r.width / 2)) * .22;
                    s.ty = (e.clientY - (r.top + r.height / 2)) * .3;
                });
                btn.addEventListener('pointerleave', () => { s.tx = s.ty = 0; });
                Engine.onTick(() => {
                    if (Math.abs(s.tx - s.x) < .05 && Math.abs(s.ty - s.y) < .05 && !s.tx && !s.ty) {
                        if (s.x || s.y) { s.x = s.y = 0; btn.style.setProperty('--tx', '0px'); btn.style.setProperty('--ty', '0px'); }
                        return;
                    }
                    s.x = lerp(s.x, s.tx, .16); s.y = lerp(s.y, s.ty, .16);
                    btn.style.setProperty('--tx', s.x.toFixed(2) + 'px');
                    btn.style.setProperty('--ty', s.y.toFixed(2) + 'px');
                });
            });
        }
    }


    /* 10 · SERVICIOS: tarjetas apiladas --------------------------------------------------------- */
    function initStack() {
        const cards = $$('[data-stack]');
        if (!cards.length) return;
        const inners = cards.map(c => $('.scard__inner', c));
        const veils = cards.map(c => $('.scard__veil', c));
        const imgs = cards.map(c => $('[data-par-in]', c));
        const medias = cards.map(c => $('.scard__media', c));
        const state = cards.map(() => ({ s: -1, o: -1 }));
        let sticky = [], heights = [];
        Engine.onMeasure(() => {
            sticky = cards.map(c => parseFloat(getComputedStyle(c).top) || 0);
            heights = cards.map(c => c.offsetHeight);
        });
        const n = cards.length;
        const nextTops = new Array(n), mediaRects = new Array(n);

        Engine.onScroll(() => {
            // 1) Lecturas de layout agrupadas (evita recalcular layout entre escrituras)
            for (let i = 0; i < n; i++) {
                nextTops[i] = i < n - 1 ? cards[i + 1].getBoundingClientRect().top : 0;
                mediaRects[i] = REDUCED ? null : medias[i].getBoundingClientRect();
            }
            // 2) Escrituras
            for (let i = 0; i < n; i++) {
                // Apilado: la tarjeta se reduce y oscurece cuando la siguiente llega encima
                if (i < n - 1) {
                    const p = clamp(1 - (nextTops[i] - sticky[i]) / heights[i]);
                    const sc = 1 - p * .06, op = p * .62;
                    if (Math.abs(sc - state[i].s) > .0004) { state[i].s = sc; inners[i].style.transform = `scale(${sc.toFixed(4)})`; }
                    if (Math.abs(op - state[i].o) > .004) { state[i].o = op; veils[i].style.opacity = op.toFixed(3); }
                }
                // Parallax interno de la foto
                const r = mediaRects[i];
                if (r && imgs[i] && r.bottom > -50 && r.top < vh + 50) {
                    const p = clamp((r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2), -1, 1);
                    imgs[i].style.transform = `translate3d(0, ${(-p * r.height * .07).toFixed(1)}px, 0)`;
                }
            }
        });
    }


    /* 11 · IMAGEN QUE SE ABRE A PANTALLA COMPLETA ----------------------------------------------------- */
    function initExpand() {
        const el = $('[data-expand]');
        if (!el || REDUCED) return;
        let top = 0, total = 1, live = false, last = -1;
        Engine.onMeasure(() => { top = docTop(el); total = Math.max(1, el.offsetHeight - vh); });
        Engine.onScroll(y => {
            const p = prog(y, top, top + total);
            const e = easeIO(clamp(p / .58));
            if (Math.abs(e - last) > .0005) { last = e; el.style.setProperty('--e', e.toFixed(4)); }
            const l = e > .8;
            if (l !== live) { live = l; el.classList.toggle('is-live', l); }
        });
    }


    /* 12 · PROCESO: línea de tiempo --------------------------------------------------------------------- */
    function initTimeline() {
        const tl = $('#timeline');
        if (!tl) return;
        const steps = $$('.tl-step', tl);
        let top = 0, h = 1, tops = [], last = -1, active = -1;
        Engine.onMeasure(() => { top = docTop(tl); h = tl.offsetHeight; tops = steps.map(s => docTop(s) + 28); });
        Engine.onScroll(y => {
            const line = y + vh * .58;
            const p = clamp((line - top - 28) / (h - 56));
            if (Math.abs(p - last) > .002) { last = p; tl.style.setProperty('--tl', p.toFixed(4)); }
            let a = -1;
            for (let i = 0; i < tops.length; i++) if (line >= tops[i]) a = i;
            if (a !== active) { active = a; steps.forEach((s, i) => s.classList.toggle('is-active', i <= a)); }
        });
    }


    /* 13 · GALERÍA HORIZONTAL ---------------------------------------------------------------------------- */
    function initHGallery() {
        const sec = $('[data-hgal]');
        const track = $('#hg-track');
        const bar = $('#hg-bar');
        if (!sec || !track) return;
        let pinned = false, top = 0, dist = 0, lastX = null;

        Engine.onMeasure(() => {
            pinned = isDesktop() && !REDUCED;
            lastX = null;                                   // fuerza a reaplicar el desplazamiento tras medir
            if (!pinned) { sec.style.removeProperty('--hg-h'); track.style.transform = ''; return; }
            track.style.transform = 'none';
            dist = Math.max(0, track.scrollWidth - vw);
            sec.style.setProperty('--hg-h', `${Math.round(dist + vh)}px`);
        }, 0);
        Engine.onMeasure(() => { top = docTop(sec); });

        Engine.onScroll(y => {
            if (!pinned) return;
            const p = prog(y, top, top + dist);
            const x = -Math.round(p * dist * 10) / 10;
            if (x !== lastX) { lastX = x; track.style.transform = `translate3d(${x}px, 0, 0)`; bar.style.transform = `scaleX(${p.toFixed(4)})`; }
        });

        // Accesibilidad: si una foto recibe foco por teclado, desplazar la página hasta mostrarla
        track.addEventListener('focusin', e => {
            if (!pinned) return;
            const card = e.target.closest('.gcard');
            if (!card) return;
            // offsetLeft ignora transformaciones: es la posición natural de la foto dentro de la pista
            const need = clamp((card.offsetLeft - vw * .1) / Math.max(dist, 1));
            Engine.scrollTo(top + need * dist, false);
        });
    }


    /* 14 · ANTES / DESPUÉS --------------------------------------------------------------------------------- */
    function initCompare() {
        const stage = $('#ba'), range = $('#ba-range');
        if (!stage || !range) return;
        const setPos = v => stage.style.setProperty('--pos', v.toFixed(2) + '%');
        range.addEventListener('input', () => { demoDone = true; setPos(parseFloat(range.value)); });

        // Demostración automática una sola vez, para invitar a arrastrar
        let demoDone = REDUCED;
        if (!('IntersectionObserver' in window)) return;
        const io = new IntersectionObserver(([en]) => {
            if (!en.isIntersecting) return;
            io.disconnect();
            const t0 = performance.now() + 500;
            const run = now => {
                if (demoDone) return;
                const t = prog(now - t0, 0, 2800);
                if (now >= t0) {
                    const v = 50 + Math.sin(t * Math.PI * 2) * 26 * (1 - t * .25);
                    range.value = v; setPos(v);
                }
                if (t < 1) requestAnimationFrame(run); else { range.value = 50; setPos(50); }
            };
            requestAnimationFrame(run);
        }, { threshold: .6 });
        io.observe(stage);
    }


    /* 15 · VISOR DE FOTOS ------------------------------------------------------------------------------------ */
    function initLightbox() {
        const dlg = $('#lightbox');
        if (!dlg || typeof dlg.showModal !== 'function') return;
        const items = $$('[data-lb]');
        const img = $('#lb-img'), cap = $('#lb-cap');
        let idx = 0, opener = null;

        const load = i => {
            idx = (i + items.length) % items.length;
            const it = items[idx];
            const fig = it.closest('figure');
            const title = fig ? $('figcaption b', fig).textContent : '';
            const sub = fig ? $('figcaption span', fig).textContent : '';
            img.classList.add('is-swap');
            setTimeout(() => {
                img.src = it.dataset.lb;
                img.alt = it.dataset.lbAlt || '';
                cap.textContent = title ? `${title}. ${sub}` : '';
                img.onload = () => img.classList.remove('is-swap');
                if (img.complete) img.classList.remove('is-swap');
            }, REDUCED ? 0 : 140);
            [1, -1].forEach(d => { const n = items[(idx + d + items.length) % items.length]; (new Image()).src = n.dataset.lb; });
        };
        const open = i => { opener = items[i]; root.classList.add('is-locked'); dlg.showModal(); load(i); };
        const close = () => dlg.close();

        items.forEach((it, i) => it.addEventListener('click', () => open(i)));
        $('#lb-close').addEventListener('click', close);
        $('#lb-prev').addEventListener('click', () => load(idx - 1));
        $('#lb-next').addEventListener('click', () => load(idx + 1));
        dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
        dlg.addEventListener('close', () => { root.classList.remove('is-locked'); if (opener) opener.focus({ preventScroll: true }); });
        dlg.addEventListener('keydown', e => {
            if (e.key === 'ArrowRight') load(idx + 1);
            if (e.key === 'ArrowLeft') load(idx - 1);
        });

        // Deslizar con el dedo
        let sx = 0, sy = 0, tracking = false;
        dlg.addEventListener('pointerdown', e => { if (e.target.closest('.lb__btn')) return; tracking = true; sx = e.clientX; sy = e.clientY; });
        dlg.addEventListener('pointerup', e => {
            if (!tracking) return; tracking = false;
            const dx = e.clientX - sx, dy = e.clientY - sy;
            if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.3) load(idx + (dx < 0 ? 1 : -1));
        });
    }


    /* 16 · FAQ, FORMULARIO, WHATSAPP Y EXTRAS ------------------------------------------------------------------- */
    function initFaq() {
        const items = $$('.faq__item');
        items.forEach(item => {
            const btn = $('.faq__q', item);
            btn.addEventListener('click', () => {
                const willOpen = !item.classList.contains('is-open');
                items.forEach(o => { o.classList.remove('is-open'); $('.faq__q', o).setAttribute('aria-expanded', 'false'); });
                if (willOpen) { item.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); }
            });
        });
    }

    function initWhatsApp() {
        $$('[data-wa]').forEach(a => {
            a.href = waUrl(a.dataset.waMsg);
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.setAttribute('data-wa-live', '');
        });
        // Globo de invitación del botón flotante (una sola vez)
        const fab = $('#wa-float');
        if (fab) {
            document.addEventListener('fenix:ready', () => {
                setTimeout(() => {
                    fab.classList.add('show-tip');
                    setTimeout(() => fab.classList.remove('show-tip'), 5200);
                }, 8000);
            }, { once: true });
        }
    }

    function initForm() {
        const form = $('#form');
        if (!form) return;
        const f = {
            nombre: $('#f-nombre'), servicio: $('#f-servicio'), ubicacion: $('#f-ubicacion'), mensaje: $('#f-mensaje')
        };
        const setErr = (input, msg) => {
            const wrap = input.closest('.field');
            const err = $('.field__err', wrap);
            wrap.classList.toggle('has-error', !!msg);
            err.textContent = msg || '';
            if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
        };
        f.nombre.addEventListener('input', () => setErr(f.nombre, ''));
        f.servicio.addEventListener('change', () => setErr(f.servicio, ''));

        form.addEventListener('submit', e => {
            e.preventDefault();
            let ok = true;
            if (f.nombre.value.trim().length < 2) { setErr(f.nombre, 'Escribe tu nombre para poder dirigirnos a ti.'); ok = false; }
            if (!f.servicio.value) { setErr(f.servicio, 'Elige el servicio que más se parece a lo que necesitas.'); ok = false; }
            if (!ok) { (form.querySelector('[aria-invalid="true"]') || f.nombre).focus(); return; }

            const lines = [
                `Hola, soy ${f.nombre.value.trim()}. Quiero cotizar: ${f.servicio.value}.`,
                f.ubicacion.value.trim() ? `Ubicación de la obra: ${f.ubicacion.value.trim()}.` : '',
                f.mensaje.value.trim() ? `Sobre mi proyecto: ${f.mensaje.value.trim()}` : '',
                `(Mensaje enviado desde la página web de ${CONFIG.brand})`
            ].filter(Boolean);
            const url = waUrl(lines.join('\n'));

            // Celebración con chispas desde el botón
            const btn = $('button[type="submit"]', form);
            if (contactSparks && btn) {
                const cr = $('#sparks-contact').getBoundingClientRect(), br = btn.getBoundingClientRect();
                contactSparks.burst(br.left + br.width / 2 - cr.left, br.top + br.height / 2 - cr.top, 44, 1.2);
            }
            form.classList.add('is-sent');
            const okMsg = $('#form-ok');
            okMsg.hidden = false;
            const link = $('a', okMsg);
            link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer';
            window.open(url, '_blank', 'noopener');
        });
    }

    function initFooter() {
        const yr = $('#year');
        if (yr) yr.textContent = new Date().getFullYear();
        const mark = $('#footmark span');
        if (!mark || REDUCED) { if (mark) mark.style.setProperty('--fm', 1); return; }
        let top = 0, h = 1, last = -1;
        Engine.onMeasure(() => { const box = $('#footmark'); top = docTop(box); h = box.offsetHeight; });
        Engine.onScroll(y => {
            const p = prog(y + vh, top + h * .15, top + h + vh * .35);
            if (Math.abs(p - last) > .004) { last = p; mark.style.setProperty('--fm', p.toFixed(3)); }
        });
    }

    function initContactSparks() {
        const canvas = $('#sparks-contact');
        if (canvas && !REDUCED) {
            const small = window.matchMedia('(max-width: 700px)').matches;
            contactSparks = new Sparks(canvas, { rate: small ? 6 : 13, max: small ? 70 : 150, bias: 1 });
        }
    }


    /* ARRANQUE ------------------------------------------------------------------------------------------------------ */
    function boot() {
        if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
        window.scrollTo(0, 0);

        initWhatsApp();
        initHero();
        initScrubText();
        $$('[data-split]').filter(el => !el.closest('.hero')).forEach(el => splitText(el, 'words'));
        initReveal();
        initCounters();
        initHeader();
        initParallax();
        initMarquee();
        initStack();
        initExpand();
        initTimeline();
        initHGallery();
        initCompare();
        initLightbox();
        initFaq();
        initForm();
        initFooter();
        initContactSparks();

        Engine.measureAll();                 // una única medición inicial
        Engine.start();
        runLoader();

        // Remedir cuando las fuentes terminan de cargar (cambian las métricas del texto)
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => Engine.requestMeasure());

        // Si llegan con un ancla en la URL, ir a esa sección al terminar el preloader
        document.addEventListener('fenix:ready', () => {
            if (location.hash.length > 1) {
                const el = document.getElementById(location.hash.slice(1));
                if (el) setTimeout(() => Engine.scrollTo(docTop(el), true), 60);
            }
        }, { once: true });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
