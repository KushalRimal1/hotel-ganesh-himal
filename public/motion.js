(function () {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const touchLayout = window.matchMedia('(pointer: coarse), (max-width: 720px)');
  const tracked = new Set();
  const animations = new Set();
  let started = false;
  let observer;
  let progressFrame = 0;

  function play(element, frames, options = {}, done) {
    if (!element || reducedMotion.matches || typeof element.animate !== 'function') { done?.(); return; }
    const animation = element.animate(frames, { duration: touchLayout.matches ? 460 : 680, easing: 'cubic-bezier(.2,.75,.25,1)', ...options });
    animations.add(animation);
    function complete() { animations.delete(animation); done?.(); }
    animation.finished.then(() => { animation.cancel(); complete(); }, complete);
  }

  function show(element, delay = 0) {
    if (element.dataset.motionState === 'shown') return;
    element.classList.add('visible');
    const transform = getComputedStyle(element).transform;
    element.dataset.motionState = 'shown';
    if (reducedMotion.matches) return;
    play(element, [
      { opacity: 0, transform: `${transform === 'none' ? '' : transform} translateY(${touchLayout.matches ? 16 : 24}px)` },
      { opacity: 1, transform }
    ], { delay, fill: 'both' });
  }

  function revealVisible() {
    if (document.body.classList.contains('welcome-active')) return;
    if (reducedMotion.matches || typeof IntersectionObserver !== 'function') { tracked.forEach(element => show(element)); return; }
    if (!observer) observer = new IntersectionObserver(entries => {
      if (document.body.classList.contains('welcome-active')) return;
      for (const entry of entries) if (entry.isIntersecting) {
        show(entry.target, Number(entry.target.dataset.motionDelay || 0));
        observer.unobserve(entry.target);
      }
    }, { threshold: 0, rootMargin: '0px 0px -36px 0px' });
    for (const element of tracked) if (element.dataset.motionState !== 'shown') observer.observe(element);
  }

  function refresh() {
    const selectors = [
      'main .reveal:not(.hero-copy)', '.section-heading', '.amenities-heading',
      '.explore-card', '.room-card', '.amenity', '.gallery-item', '.contact-card',
      '.booking-intro', '.panel-heading', '.feedback-copy', '.feedback-form',
      '.location-copy', '.location-map', '.lukla-step', '.lukla-route',
      '.lukla-planning-copy', '.lukla-facts > div', '.stay-guide-grid > article',
      '.visitor-review-card', '.guest-review-empty', '.page-cta > div', '.page-cta > .button',
      '.newsletter > div', '.newsletter > form', '.footer-brand', '.footer-column', '.footer-action'
    ];
    document.querySelectorAll(selectors.join(',')).forEach(element => {
      if (tracked.has(element)) return;
      tracked.add(element);
      element.dataset.motionReveal = '';
      element.dataset.motionState = 'pending';
      const siblings = Array.from(element.parentElement.children);
      element.dataset.motionDelay = String(Math.min(siblings.indexOf(element), touchLayout.matches ? 3 : 4) * (touchLayout.matches ? 45 : 70));
    });
    revealVisible();
  }

  function entrance() {
    if (document.body.classList.contains('welcome-active')) return;
    started = true;
    document.querySelector('.hero-copy')?.classList.add('visible');
    const text = document.querySelectorAll('.hero-copy > *, .page-hero-copy > *, .lukla-heading > *');
    text.forEach((element, index) => play(element, [
      { opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }
    ], { duration: touchLayout.matches ? 560 : 820, delay: Math.min(index, 4) * 85, fill: 'both' }));
    play(document.querySelector('.page-hero-photo img'), [
      { opacity: .4, transform: 'scale(1.045)' }, { opacity: 1, transform: 'scale(1)' }
    ], { duration: touchLayout.matches ? 650 : 1100, fill: 'both' });
    play(document.querySelector('.weather-card'), [{ opacity: 0 }, { opacity: 1 }], { delay: 250, duration: 450 });
    refresh();
    updateProgress();
  }

  const progress = document.createElement('div');
  progress.className = 'site-scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.append(progress);
  function updateProgress() {
    progressFrame = 0;
    const hidden = document.body.classList.contains('welcome-active');
    progress.hidden = hidden;
    if (hidden) return;
    const distance = document.documentElement.scrollHeight - window.innerHeight;
    const fraction = distance > 0 ? Math.min(1, Math.max(0, window.scrollY / distance)) : 0;
    progress.style.transform = `scaleX(${fraction})`;
  }
  function scheduleProgress() { if (!progressFrame) progressFrame = requestAnimationFrame(updateProgress); }
  window.addEventListener('scroll', scheduleProgress, { passive: true });
  window.addEventListener('resize', scheduleProgress);
  window.addEventListener('pageshow', event => { if (event.persisted) { refresh(); updateProgress(); } });

  function closeDialog(dialog) {
    if (!dialog?.open || dialog.dataset.motionClosing === 'true') return;
    if (reducedMotion.matches) { dialog.close(); return; }
    dialog.dataset.motionClosing = 'true';
    const style = getComputedStyle(dialog);
    play(dialog, [
      { opacity: Number(style.opacity), transform: style.transform },
      { opacity: 0, transform: `${style.transform === 'none' ? '' : style.transform} translateY(10px) scale(.985)` }
    ], { duration: 160, easing: 'ease-in', fill: 'both' }, () => {
      if (dialog.open) dialog.close();
      delete dialog.dataset.motionClosing;
    });
  }

  function filterResults() {
    document.querySelectorAll('.room-card:not([hidden])').forEach((card, index) => {
      card.dataset.motionState = 'shown';
      card.classList.add('visible');
      play(card, [{ opacity: .35, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: index * 45 });
    });
  }

  document.addEventListener('toggle', event => {
    const element = event.target;
    if (element.tagName !== 'DETAILS' || !element.open || reducedMotion.matches) return;
    Array.from(element.children).filter(child => child.tagName !== 'SUMMARY').forEach(child => {
      play(child, [{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }], { duration: 240 });
    });
  }, true);
  document.addEventListener('hotel:welcome-closed', entrance);
  document.addEventListener('hotel:weather-updated', () => {
    if (started && !document.body.classList.contains('welcome-active')) play(document.querySelector('.weather-reading'), [{ opacity: .3 }, { opacity: 1 }], { duration: 350 });
  });
  document.querySelectorAll('#nav-links a').forEach((link, index) => link.style.setProperty('--menu-index', index));

  reducedMotion.addEventListener('change', () => {
    document.body.classList.toggle('motion-enabled', !reducedMotion.matches);
    if (reducedMotion.matches) {
      for (const animation of animations) animation.cancel();
      tracked.forEach(element => { element.dataset.motionState = 'shown'; element.classList.add('visible'); });
    }
  });
  document.body.classList.toggle('motion-enabled', !reducedMotion.matches);
  window.HotelMotion = { refresh, entrance, closeDialog, filterResults };
  refresh();
  if (!document.body.classList.contains('welcome-active')) entrance();
})();
