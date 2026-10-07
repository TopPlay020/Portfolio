/* Wach Ta3ref page: language switch, reveals, counters, parallax, screenshot rail. */
(() => {
    'use strict';

    // Flip to true once the game is live on Google Play; the buttons then become real store links.
    const PLAY_LIVE = false;

    const $ = (s, el = document) => el.querySelector(s);
    const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
    const root = document.documentElement;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

    /* ---------- Language ---------- */
    const lang = () => root.lang;
    function movePill() {
        const b = $('.lang button[aria-pressed="true"]'), pill = $('#langPill');
        if (!b || !pill) return;
        pill.style.width = b.offsetWidth + 'px';
        pill.style.transform = `translateX(${b.offsetLeft}px)`;
    }
    function applyLang(l) {
        root.lang = l; root.dir = l === 'ar' ? 'rtl' : 'ltr';
        try { localStorage.setItem('lang', l); } catch (e) { /* storage blocked */ }
        $$('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === l)));
        $$('[data-alt-ar]').forEach((img) => { img.alt = img.dataset['alt' + (l === 'ar' ? 'Ar' : 'En')]; });
        $$('#railPrev, #railNext').forEach((b, i) => { b.setAttribute('aria-label', l === 'ar' ? (i ? 'التالي' : 'السابق') : (i ? 'Next' : 'Previous')); });
        $('#rail') && $('#rail').setAttribute('aria-label', l === 'ar' ? 'لقطات من اللعبة' : 'Game screenshots');
        movePill();
        updateRail();
    }
    $$('.lang button').forEach((b) => b.addEventListener('click', () => { if (b.dataset.lang !== lang()) applyLang(b.dataset.lang); }));

    /* ---------- Play buttons ---------- */
    let toastTimer;
    function toast(msg) {
        const t = $('#toast'); t.textContent = msg; t.classList.add('show');
        clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
    }
    $$('#play, #play2').forEach((a) => {
        if (PLAY_LIVE) { a.removeAttribute('aria-disabled'); a.target = '_blank'; a.rel = 'noopener'; return; }
        a.addEventListener('click', (e) => { e.preventDefault(); toast(lang() === 'ar' ? 'قريباً على Google Play' : 'Coming soon on Google Play'); });
    });

    /* ---------- Nav state ---------- */
    const nav = $('#nav');
    addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 24), { passive: true });
    nav.classList.toggle('scrolled', scrollY > 24);

    /* ---------- Reveals + counters ---------- */
    function countUp(el) {
        const target = +el.dataset.count;
        if (reduced) { el.textContent = target; return; }
        const t0 = performance.now(), dur = 1500;
        (function step(t) {
            const p = Math.min((t - t0) / dur, 1);
            el.textContent = Math.round(target * (1 - Math.pow(1 - p, 4)));
            if (p < 1) requestAnimationFrame(step);
        })(t0);
    }
    const io = new IntersectionObserver((es) => es.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in'); io.unobserve(e.target);
        $$('[data-count]', e.target).forEach(countUp);
    }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    $$('[data-reveal]').forEach((el) => io.observe(el));
    $$('[data-count]').forEach((el) => { el.textContent = '0'; });
    // anything already on screen shows right away (observers pause in background tabs)
    setTimeout(() => $$('[data-reveal]:not(.in)').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < innerHeight * .94 && r.bottom > 0) { el.classList.add('in'); $$('[data-count]', el).forEach(countUp); }
    }), 60);

    /* ---------- Pointer parallax (hero) + tile spotlight ---------- */
    if (finePointer && !reduced) {
        const hero = $('.hero'), stage = $('#stage');
        let raf = 0, nx = 0, ny = 0;
        hero.addEventListener('pointermove', (e) => {
            const r = hero.getBoundingClientRect();
            nx = (e.clientX - r.left) / r.width - .5; ny = (e.clientY - r.top) / r.height - .5;
            if (raf) return;
            raf = requestAnimationFrame(() => { raf = 0; stage.style.setProperty('--px', nx.toFixed(3)); stage.style.setProperty('--py', ny.toFixed(3)); });
        }, { passive: true });
        hero.addEventListener('pointerleave', () => { stage.style.setProperty('--px', 0); stage.style.setProperty('--py', 0); });
        document.addEventListener('pointermove', (e) => {
            const t = e.target.closest && e.target.closest('.tile');
            if (!t) return;
            const r = t.getBoundingClientRect();
            t.style.setProperty('--mx', (e.clientX - r.left) + 'px'); t.style.setProperty('--my', (e.clientY - r.top) + 'px');
        }, { passive: true });
    }

    /* ---------- Screenshot rail: drag, arrows, progress ---------- */
    const rail = $('#rail'), bar = $('#railBar');
    function updateRail() {
        if (!rail) return;
        const max = rail.scrollWidth - rail.clientWidth;
        const p = max > 0 ? Math.abs(rail.scrollLeft) / max : 1;
        bar.style.setProperty('--p', Math.max(.12, Math.min(1, .12 + p * .88)));
    }
    function step(dir) {
        const card = $('.shot', rail), w = card.getBoundingClientRect().width + 20;
        // scrollLeft is negative in RTL, so "next" always means moving in the reading direction
        rail.scrollBy({ left: dir * w * (root.dir === 'rtl' ? -1 : 1), behavior: reduced ? 'auto' : 'smooth' });
    }
    $('#railPrev').addEventListener('click', () => step(-1));
    $('#railNext').addEventListener('click', () => step(1));
    rail.addEventListener('scroll', updateRail, { passive: true });
    rail.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); step(root.dir === 'rtl' ? -1 : 1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); step(root.dir === 'rtl' ? 1 : -1); }
    });

    let down = false, startX = 0, startLeft = 0, moved = 0;
    rail.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse') return; // touch scrolls natively
        down = true; moved = 0; startX = e.clientX; startLeft = rail.scrollLeft;
        rail.classList.add('drag'); rail.setPointerCapture(e.pointerId);
    });
    rail.addEventListener('pointermove', (e) => {
        if (!down) return;
        moved = e.clientX - startX;
        rail.scrollLeft = startLeft - moved;
    });
    const end = (e) => { if (!down) return; down = false; rail.classList.remove('drag'); try { rail.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ } };
    rail.addEventListener('pointerup', end);
    rail.addEventListener('pointercancel', end);

    applyLang(lang());
    if (document.fonts) document.fonts.ready.then(movePill);
    addEventListener('resize', () => { movePill(); updateRail(); }, { passive: true });
})();
