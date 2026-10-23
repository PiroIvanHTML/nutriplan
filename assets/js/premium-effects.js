/* ======================================================================
   NUTRIPLAN — EFFETTI VISIVI PROGRESSIVI
   Nessuna funzione originale sostituita. Nessun dato o contenuto modificato.
   ====================================================================== */
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var root = document.documentElement;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var raf = window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function (fn) { return window.setTimeout(fn, 16); };
  var caf = window.cancelAnimationFrame ? window.cancelAnimationFrame.bind(window) : window.clearTimeout.bind(window);

  /* La navigazione resta sticky: si aggiorna soltanto una linea decorativa. */
  var nav = document.querySelector('body > nav.sticky');
  if (nav) {
    var navFrame = 0;
    var updateNav = function () {
      navFrame = 0;
      var scrollTop = window.pageYOffset || root.scrollTop || 0;
      var available = Math.max(0, root.scrollHeight - window.innerHeight);
      var progress = available > 0 ? Math.min(1, Math.max(0, scrollTop / available)) : 0;
      nav.style.setProperty('--np-progress', String(progress));
      nav.classList.toggle('np-nav-scrolled', scrollTop > 12);
    };
    var scheduleNav = function () { if (!navFrame) navFrame = raf(updateNav); };
    window.addEventListener('scroll', scheduleNav, { passive: true });
    window.addEventListener('resize', scheduleNav, { passive: true });
    window.addEventListener('load', scheduleNav, { once: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleNav).catch(function () {});
    updateNav();
  }

  /* Se gli effetti non sono disponibili, il CSS mostra comunque tutto. */
  if (!reduceMotion && 'IntersectionObserver' in window) {
    try {
      var visualObserver = new IntersectionObserver(function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.025 });
      document.querySelectorAll('.reveal-on-scroll').forEach(function (element) {
        visualObserver.observe(element);
      });
      root.classList.add('np-motion');
    } catch (error) {
      root.classList.remove('np-motion');
    }
  }

  /* Riflessi delicati, solo mouse; nessun timer o animazione continua. */
  if (!reduceMotion && window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.claude-card').forEach(function (card) {
      var frame = 0;
      var pointerX = 0;
      var pointerY = 0;
      card.addEventListener('pointermove', function (event) {
        pointerX = event.clientX;
        pointerY = event.clientY;
        if (frame) return;
        frame = raf(function () {
          frame = 0;
          var rect = card.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          var x = Math.max(0, Math.min(100, (pointerX - rect.left) / rect.width * 100));
          var y = Math.max(0, Math.min(100, (pointerY - rect.top) / rect.height * 100));
          card.style.setProperty('--np-x', x.toFixed(2) + '%');
          card.style.setProperty('--np-y', y.toFixed(2) + '%');
        });
      }, { passive: true });
      card.addEventListener('pointerleave', function () {
        if (frame) { caf(frame); frame = 0; }
        card.style.removeProperty('--np-x');
        card.style.removeProperty('--np-y');
      }, { passive: true });
    });
  }
})();
