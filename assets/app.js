(() => {
  'use strict';

  const STORAGE_KEY = 'mrbeast_contact_draft_v1';
  const MOTION_MODE_KEY = 'mrbeast_motion_mode_v1';

  let motionMode = 'auto';

  const mqReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mqCoarsePointer = window.matchMedia('(pointer: coarse)');

  const prefersReducedMotion = () => {
    if (motionMode === 'reduce') return true;
    if (motionMode === 'full') return false;
    return mqReducedMotion.matches;
  };
  const isCoarsePointer = () => mqCoarsePointer.matches;

  const prefersReducedData = () => {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return false;
    if (conn.saveData) return true;
    const effectiveType = typeof conn.effectiveType === 'string' ? conn.effectiveType : '';
    return effectiveType === '2g' || effectiveType === 'slow-2g';
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const rafThrottle = (fn) => {
    let rafId = 0;
    return (...args) => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        fn(...args);
      });
    };
  };

  const safeJsonParse = (text) => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };

  const safeStorageGet = (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const safeStorageSet = (key, value) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  };

  const safeStorageRemove = (key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  };

  const normalizeMotionMode = (value) => {
    if (value === 'auto' || value === 'reduce' || value === 'full') return value;
    return 'auto';
  };

  const motionModeLabel = (mode) => {
    const normalized = normalizeMotionMode(mode);
    if (normalized === 'reduce') return '动效：关';
    if (normalized === 'full') return '动效：开';
    return '动效：自动';
  };

  const motionModeAriaLabel = (mode) => {
    const normalized = normalizeMotionMode(mode);
    if (normalized === 'reduce') return '动效模式：关（减少动效）。点击切换。';
    if (normalized === 'full') return '动效模式：开（强制开启动效）。点击切换。';
    return '动效模式：自动（跟随系统设置）。点击切换。';
  };

  const nextMotionMode = (mode) => {
    const current = normalizeMotionMode(mode);
    if (current === 'auto') return 'reduce';
    if (current === 'reduce') return 'full';
    return 'auto';
  };

  const applyMotionAttribute = () => {
    const root = document.documentElement;
    if (!(root instanceof HTMLElement)) return;

    if (prefersReducedMotion()) {
      root.setAttribute('data-motion', 'reduce');
      return;
    }

    root.removeAttribute('data-motion');
  };

  const loadMotionMode = () => {
    motionMode = normalizeMotionMode(safeStorageGet(MOTION_MODE_KEY));
  };

  const persistMotionMode = (mode) => {
    motionMode = normalizeMotionMode(mode);
    safeStorageSet(MOTION_MODE_KEY, motionMode);
  };

  loadMotionMode();
  applyMotionAttribute();

  const onReady = (fn) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
      return;
    }
    fn();
  };

  class Toast {
    constructor(root) {
      this.root = root;
    }

    show(message, { variant = 'info', timeoutMs = 3200 } = {}) {
      if (!this.root) return;

      const toast = document.createElement('div');
      toast.className = `toast toast--${variant}`;
      toast.setAttribute('role', 'status');

      const content = document.createElement('div');
      content.className = 'toast__content';

      const msg = document.createElement('div');
      msg.className = 'toast__message';
      msg.textContent = message;

      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'toast__close';
      close.setAttribute('aria-label', '关闭提示');
      close.textContent = '×';

      content.append(msg, close);
      toast.append(content);
      this.root.append(toast);

      requestAnimationFrame(() => {
        toast.classList.add('is-visible');
      });

      const remove = () => {
        if (toast.dataset.removing) return;
        toast.dataset.removing = '1';
        toast.classList.add('is-leaving');
        window.setTimeout(() => toast.remove(), 220);
      };

      close.addEventListener('click', remove);

      if (timeoutMs > 0) {
        window.setTimeout(remove, timeoutMs);
      }
    }
  }

  class Confetti {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas ? canvas.getContext('2d') : null;
      this.particles = [];
      this.running = false;
      this.width = 0;
      this.height = 0;
      this.dpr = 1;

      this._onResize = rafThrottle(() => this.resize());
      this._tick = () => this.animate();
    }

    init() {
      if (!this.canvas || !this.ctx) return;
      this.resize();
      window.addEventListener('resize', this._onResize, { passive: true });
    }

    resize() {
      if (!this.canvas || !this.ctx) return;

      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.width = document.documentElement.clientWidth;
      this.height = document.documentElement.clientHeight;

      this.canvas.width = Math.floor(this.width * this.dpr);
      this.canvas.height = Math.floor(this.height * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    burst({ x, y, count = 90 } = {}) {
      if (!this.ctx || prefersReducedMotion()) return;

      const cx = typeof x === 'number' ? x : this.width / 2;
      const cy = typeof y === 'number' ? y : this.height * 0.3;

      const palette = ['#ffd700', '#d4af37', '#ff6b35', '#ffffff'];
      const actualCount = clamp(count, 20, 140);

      for (let i = 0; i < actualCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 6;
        const size = 4 + Math.random() * 6;
        const life = 42 + Math.floor(Math.random() * 28);

        this.particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (2 + Math.random() * 2),
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.35,
          size,
          life,
          maxLife: life,
          color: palette[i % palette.length],
        });
      }

      if (!this.running) {
        this.running = true;
        requestAnimationFrame(this._tick);
      }
    }

    animate() {
      if (!this.ctx) return;

      this.ctx.clearRect(0, 0, this.width, this.height);

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];

        p.life -= 1;
        p.vy += 0.18;
        p.vx *= 0.99;
        p.vy *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;

        const alpha = clamp(p.life / p.maxLife, 0, 1);

        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.rot);
        this.ctx.fillStyle = p.color;
        this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
        this.ctx.restore();

        if (p.life <= 0 || p.y > this.height + 80) {
          this.particles.splice(i, 1);
        }
      }

      if (this.particles.length) {
        requestAnimationFrame(this._tick);
        return;
      }

      this.running = false;
    }
  }

  class ParticleSystem {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas ? canvas.getContext('2d') : null;
      this.initialized = false;
      this.particles = [];
      this.running = false;
      this.pointer = { x: 0, y: 0, active: false };

      this.width = 0;
      this.height = 0;
      this.dpr = 1;
      this.connectionDistance = 100;
      this.pointerDistance = 150;
      this.connectionGrid = new Map();

      this._onResize = rafThrottle(() => this.resize(true));
      this._onVisibility = () => this.onVisibilityChange();
      this._onMove = (e) => this.onPointerMove(e);
      this._onLeave = () => {
        this.pointer.active = false;
      };

      this._frame = () => this.frame();
    }

    init() {
      if (!this.canvas || !this.ctx) return;
      if (this.initialized) return;
      if (prefersReducedMotion()) return;

      this.initialized = true;
      this.resize(true);
      this.resetParticles();

      window.addEventListener('resize', this._onResize, { passive: true });
      document.addEventListener('visibilitychange', this._onVisibility, { passive: true });

      if (!isCoarsePointer()) {
        document.addEventListener('pointermove', this._onMove, { passive: true });
        document.addEventListener('pointerleave', this._onLeave, { passive: true });
      }
    }

    computeParticleCount() {
      const area = this.width * this.height;
      let count = Math.floor(area / 11000);
      count = clamp(count, 50, 160);
      if (isCoarsePointer()) count = Math.min(count, 90);
      if (prefersReducedData()) count = Math.min(count, 70);
      return count;
    }

    resize(recalculate = false) {
      if (!this.canvas || !this.ctx) return;

      this.dpr = Math.min(window.devicePixelRatio || 1, 2);

      const rect = this.canvas.getBoundingClientRect();
      this.width = Math.max(1, Math.floor(rect.width));
      this.height = Math.max(1, Math.floor(rect.height));

      this.canvas.width = Math.floor(this.width * this.dpr);
      this.canvas.height = Math.floor(this.height * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

      this.connectionDistance = clamp(Math.floor(this.width / 12), 80, 115);
      this.pointerDistance = prefersReducedData() ? 120 : 150;
      if (prefersReducedData()) this.connectionDistance = Math.min(this.connectionDistance, 90);

      if (!recalculate) return;
      const targetCount = this.computeParticleCount();
      if (this.particles.length > targetCount) {
        this.particles.length = targetCount;
      } else {
        while (this.particles.length < targetCount) {
          this.particles.push(this.createParticle());
        }
      }
    }

    createParticle() {
      const palette = ['#d4af37', '#ff6b35', '#ffd700'];
      const color = palette[Math.floor(Math.random() * palette.length)];
      const radius = 1.2 + Math.random() * 2.4;

      return {
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.9,
        vy: (Math.random() - 0.5) * 0.9,
        radius,
        opacity: 0.18 + Math.random() * 0.55,
        life: 220 + Math.floor(Math.random() * 220),
        color,
      };
    }

    resetParticles() {
      const count = this.computeParticleCount();
      this.particles = [];
      for (let i = 0; i < count; i++) {
        this.particles.push(this.createParticle());
      }
    }

    onPointerMove(e) {
      this.pointer.x = e.clientX;
      this.pointer.y = e.clientY;
      this.pointer.active = true;
    }

    onVisibilityChange() {
      if (document.hidden) {
        this.stop();
        return;
      }
      this.start();
    }

    start() {
      if (!this.ctx || prefersReducedMotion()) return;
      if (this.running) return;
      this.running = true;
      requestAnimationFrame(this._frame);
    }

    stop() {
      this.running = false;
    }

    updateParticles() {
      const pointerDistance2 = this.pointerDistance * this.pointerDistance;

      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];

        p.x += p.vx;
        p.y += p.vy;

        if (this.pointer.active) {
          const dx = this.pointer.x - p.x;
          const dy = this.pointer.y - p.y;
          const d2 = dx * dx + dy * dy;

          if (d2 > 0.0001 && d2 < pointerDistance2) {
            const distance = Math.sqrt(d2);
            const force = (this.pointerDistance - distance) / this.pointerDistance;
            p.vx -= (dx / distance) * force * 0.02;
            p.vy -= (dy / distance) * force * 0.02;
          }
        }

        if (p.x < 0 || p.x > this.width) p.vx *= -1;
        if (p.y < 0 || p.y > this.height) p.vy *= -1;

        p.life -= 1;
        if (p.life <= 0) {
          this.particles[i] = this.createParticle();
        }
      }
    }

    drawParticles() {
      if (!this.ctx) return;

      this.ctx.clearRect(0, 0, this.width, this.height);

      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        this.ctx.save();
        this.ctx.globalAlpha = p.opacity;
        this.ctx.fillStyle = p.color;
        this.ctx.shadowBlur = 14;
        this.ctx.shadowColor = p.color;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      }

      this.drawConnections();
    }

    drawConnections() {
      if (!this.ctx) return;
      const particles = this.particles;
      const n = particles.length;
      if (n < 2) return;

      const cellSize = this.connectionDistance;
      const maxDistance2 = cellSize * cellSize;
      const grid = this.connectionGrid;
      grid.clear();

      const cellKey = (cx, cy) => ((cx & 0xffff) << 16) | (cy & 0xffff);

      for (let i = 0; i < n; i++) {
        const p = particles[i];
        const cx = Math.floor(p.x / cellSize);
        const cy = Math.floor(p.y / cellSize);
        const key = cellKey(cx, cy);
        let bucket = grid.get(key);
        if (!bucket) {
          bucket = [];
          grid.set(key, bucket);
        }
        bucket.push(i);
      }

      for (let i = 0; i < n; i++) {
        const p1 = particles[i];
        const cx = Math.floor(p1.x / cellSize);
        const cy = Math.floor(p1.y / cellSize);

        for (let ox = -1; ox <= 1; ox++) {
          for (let oy = -1; oy <= 1; oy++) {
            const key = cellKey(cx + ox, cy + oy);
            const bucket = grid.get(key);
            if (!bucket) continue;

            for (let b = 0; b < bucket.length; b++) {
              const j = bucket[b];
              if (j <= i) continue;

              const p2 = particles[j];
              const dx = p1.x - p2.x;
              const dy = p1.y - p2.y;
              const d2 = dx * dx + dy * dy;
              if (d2 >= maxDistance2) continue;

              const opacity = (1 - d2 / maxDistance2) * 0.26;
              this.ctx.save();
              this.ctx.globalAlpha = opacity;
              this.ctx.strokeStyle = p1.color === p2.color ? p1.color : '#d4af37';
              this.ctx.lineWidth = 1;
              this.ctx.beginPath();
              this.ctx.moveTo(p1.x, p1.y);
              this.ctx.lineTo(p2.x, p2.y);
              this.ctx.stroke();
              this.ctx.restore();
            }
          }
        }
      }
    }

    frame() {
      if (!this.running) return;
      this.updateParticles();
      this.drawParticles();
      requestAnimationFrame(this._frame);
    }
  }

  class ScrollAnimator {
    constructor() {
      this.elements = Array.from(document.querySelectorAll('.scroll-animate'));
      this.observer = null;
      this._fallbackCheck = rafThrottle(() => this.checkFallback());
    }

    init() {
      if (!this.elements.length) return;

      if (prefersReducedMotion()) {
        this.elements.forEach((el) => el.classList.add('active'));
        return;
      }

      if ('IntersectionObserver' in window) {
        this.observer = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              entry.target.classList.add('active');
              this.observer?.unobserve(entry.target);
            }
          },
          {
            root: null,
            threshold: 0.12,
            rootMargin: '0px 0px -12% 0px',
          },
        );

        this.elements.forEach((el) => this.observer?.observe(el));
        return;
      }

      window.addEventListener('scroll', this._fallbackCheck, { passive: true });
      window.addEventListener('resize', this._fallbackCheck, { passive: true });
      this.checkFallback();
    }

    checkFallback() {
      const triggerBottom = (window.innerHeight / 5) * 4;
      this.elements.forEach((el) => {
        const top = el.getBoundingClientRect().top;
        if (top < triggerBottom) el.classList.add('active');
      });
    }
  }

  class Spotlight {
    constructor() {
      this.targets = [];
    }

    init() {
      if (prefersReducedMotion() || isCoarsePointer()) return;

      this.targets = Array.from(document.querySelectorAll('[data-spotlight]'));
      if (!this.targets.length) return;

      this.targets.forEach((el) => this.attach(el));
    }

    attach(el) {
      if (!(el instanceof HTMLElement)) return;
      const firstChild = el.firstElementChild;
      if (firstChild && firstChild.classList.contains('spotlight-glow')) return;

      const glow = document.createElement('span');
      glow.className = 'spotlight-glow';
      glow.setAttribute('aria-hidden', 'true');
      el.insertBefore(glow, el.firstChild);

      let rafId = 0;
      let lastX = 0;
      let lastY = 0;

      const update = () => {
        rafId = 0;
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        const px = clamp((lastX - rect.left) / rect.width, 0, 1) * 100;
        const py = clamp((lastY - rect.top) / rect.height, 0, 1) * 100;
        el.style.setProperty('--spot-x', `${px.toFixed(2)}%`);
        el.style.setProperty('--spot-y', `${py.toFixed(2)}%`);
      };

      const onMove = (e) => {
        if (prefersReducedMotion()) return;
        lastX = e.clientX;
        lastY = e.clientY;
        if (rafId) return;
        rafId = requestAnimationFrame(update);
      };

      const onLeave = () => {
        el.style.removeProperty('--spot-x');
        el.style.removeProperty('--spot-y');
      };

      const onFocus = () => {
        if (prefersReducedMotion()) return;
        el.style.setProperty('--spot-x', '50%');
        el.style.setProperty('--spot-y', '35%');
      };

      el.addEventListener('pointermove', onMove, { passive: true });
      el.addEventListener('pointerleave', onLeave, { passive: true });
      el.addEventListener('focusin', onFocus, { passive: true });
    }
  }

  class Carousel {
    constructor(root, { intervalMs = 6500 } = {}) {
      this.root = root;
      this.viewport = root?.querySelector('[data-viewport]') || null;
      this.track = root?.querySelector('[data-track]') || null;
      this.status = root?.querySelector('[data-carousel-status]') || null;
      this.dotsRoot = root?.querySelector('[data-dots]') || null;
      this.prevBtn = root?.querySelector('[data-prev]') || null;
      this.nextBtn = root?.querySelector('[data-next]') || null;

      this.slides = [];
      this.dots = [];
      this.index = 0;
      this.intervalMs = intervalMs;
      this.timer = 0;
      this.drag = { active: false, pointerId: 0, startX: 0, currentX: 0 };
    }

    init() {
      if (!(this.root instanceof HTMLElement)) return;
      if (!(this.track instanceof HTMLElement)) return;

      this.slides = Array.from(this.track.children).filter((el) => el instanceof HTMLElement);
      if (!this.slides.length) return;

      this.root.tabIndex = 0;
      this.buildDots();
      this.apply(true);

      this.prevBtn?.addEventListener('click', () => this.prev());
      this.nextBtn?.addEventListener('click', () => this.next());

      this.root.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          this.prev();
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          this.next();
        }
        if (e.key === 'Home') {
          e.preventDefault();
          this.go(0);
        }
        if (e.key === 'End') {
          e.preventDefault();
          this.go(this.slides.length - 1);
        }
      });

      this.root.addEventListener('pointerenter', () => this.pause(), { passive: true });
      this.root.addEventListener('pointerleave', () => this.play(), { passive: true });
      this.root.addEventListener('focusin', () => this.pause());
      this.root.addEventListener('focusout', () => this.play());

      this.viewport?.addEventListener('pointerdown', (e) => this.onPointerDown(e));

      if (!prefersReducedMotion()) this.play();
    }

    buildDots() {
      if (!(this.dotsRoot instanceof HTMLElement)) return;
      this.dotsRoot.innerHTML = '';
      this.dots = [];

      const controlsId = this.viewport instanceof HTMLElement ? this.viewport.id : '';
      for (let i = 0; i < this.slides.length; i++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'carousel-dot';
        btn.setAttribute('aria-label', `第 ${i + 1} 条见证`);
        if (controlsId) btn.setAttribute('aria-controls', controlsId);
        btn.addEventListener('click', () => this.go(i));
        this.dotsRoot.appendChild(btn);
        this.dots.push(btn);
      }
    }

    width() {
      if (!(this.viewport instanceof HTMLElement)) return 1;
      const rect = this.viewport.getBoundingClientRect();
      return Math.max(1, rect.width);
    }

    clampIndex(i) {
      if (!this.slides.length) return 0;
      const max = this.slides.length - 1;
      return clamp(i, 0, max);
    }

    apply(initial = false) {
      if (!(this.track instanceof HTMLElement)) return;

      const pct = this.index * 100;
      this.track.style.transform = `translate3d(-${pct}%, 0, 0)`;

      this.slides.forEach((slide, i) => {
        slide.setAttribute('aria-hidden', i === this.index ? 'false' : 'true');
        slide.tabIndex = i === this.index ? 0 : -1;
      });

      this.dots.forEach((dot, i) => {
        dot.setAttribute('aria-current', i === this.index ? 'true' : 'false');
      });

      this.updateStatus();

      if (initial) return;
    }

    updateStatus() {
      if (!(this.status instanceof HTMLElement)) return;
      if (!this.slides.length) return;

      const total = this.slides.length;
      const slide = this.slides[this.index];
      const author = slide?.querySelector('.testimonial-author')?.textContent?.trim() || '';
      const suffix = author ? `：${author}` : '';
      this.status.textContent = `已显示第 ${this.index + 1} 条，共 ${total} 条${suffix}。`;
    }

    go(i) {
      this.index = this.clampIndex(i);
      this.apply();
    }

    next() {
      if (!this.slides.length) return;
      const nextIndex = this.index >= this.slides.length - 1 ? 0 : this.index + 1;
      this.go(nextIndex);
    }

    prev() {
      if (!this.slides.length) return;
      const prevIndex = this.index <= 0 ? this.slides.length - 1 : this.index - 1;
      this.go(prevIndex);
    }

    play() {
      if (prefersReducedMotion()) return;
      if (this.timer) return;
      this.timer = window.setInterval(() => {
        const nextIndex = (this.index + 1) % this.slides.length;
        this.go(nextIndex);
      }, this.intervalMs);
    }

    pause() {
      if (!this.timer) return;
      window.clearInterval(this.timer);
      this.timer = 0;
    }

    onPointerDown(e) {
      if (!this.viewport || !this.track) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      this.pause();

      this.drag.active = true;
      this.drag.pointerId = e.pointerId;
      this.drag.startX = e.clientX;
      this.drag.currentX = e.clientX;

      this.track.classList.add('is-dragging');
      this.viewport.setPointerCapture(e.pointerId);

      const onMove = (ev) => this.onPointerMove(ev);
      const onUp = (ev) => this.onPointerUp(ev, onMove, onUp);

      this.viewport.addEventListener('pointermove', onMove);
      this.viewport.addEventListener('pointerup', onUp);
      this.viewport.addEventListener('pointercancel', onUp);
    }

    onPointerMove(e) {
      if (!this.drag.active) return;
      if (e.pointerId !== this.drag.pointerId) return;
      if (!this.track) return;

      const w = this.width();
      const delta = e.clientX - this.drag.startX;
      let damped = delta;

      if (this.index === 0 && delta > 0) damped = delta * 0.35;
      if (this.index === this.slides.length - 1 && delta < 0) damped = delta * 0.35;

      const base = -this.index * w;
      this.track.style.transform = `translate3d(${base + damped}px, 0, 0)`;
      this.drag.currentX = e.clientX;
    }

    onPointerUp(e, onMove, onUp) {
      if (!this.drag.active) return;
      if (e.pointerId !== this.drag.pointerId) return;
      if (!this.viewport || !this.track) return;

      this.drag.active = false;
      this.track.classList.remove('is-dragging');

      this.viewport.removeEventListener('pointermove', onMove);
      this.viewport.removeEventListener('pointerup', onUp);
      this.viewport.removeEventListener('pointercancel', onUp);

      const w = this.width();
      const delta = this.drag.currentX - this.drag.startX;
      const threshold = w * 0.18;

      if (delta > threshold) this.prev();
      else if (delta < -threshold) this.next();
      else this.apply();

      this.play();
    }
  }

  class Navbar {
    constructor() {
      this.navbar = document.querySelector('.navbar');
      this.toggle = document.querySelector('.nav-toggle');
      this.backdrop = document.querySelector('[data-nav-backdrop]');
      this.navList = document.getElementById('primary-navigation');
      this.links = Array.from(document.querySelectorAll('#primary-navigation a[href^=\"#\"]'));
      this.mqMobile = window.matchMedia('(max-width: 768px)');

      this._onScroll = rafThrottle(() => this.handleScroll());
      this._onResize = rafThrottle(() => this.handleResize());
      this.sectionObserver = null;
      this.backdropHideTimer = 0;
    }

    init() {
      this.handleScroll();
      window.addEventListener('scroll', this._onScroll, { passive: true });
      window.addEventListener('resize', this._onResize, { passive: true });

      this.toggle?.addEventListener('click', () => this.toggleMenu());
      this.backdrop?.addEventListener('click', () => this.closeMenu());

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.closeMenu();
          return;
        }

        if (e.key === 'Tab') {
          this.trapFocus(e);
        }
      });

      this.navList?.addEventListener('click', (e) => {
        const a = e.target instanceof Element ? e.target.closest('a[href^=\"#\"]') : null;
        if (!a) return;
        this.closeMenu();
      });

      const onMqChange = () => this.updateMenuAccessibility();
      if (typeof this.mqMobile.addEventListener === 'function') {
        this.mqMobile.addEventListener('change', onMqChange);
      } else if (typeof this.mqMobile.addListener === 'function') {
        this.mqMobile.addListener(onMqChange);
      }

      this.updateMenuAccessibility();
      this.initActiveSection();
      this.applyActiveFromHash();
      window.addEventListener('hashchange', () => this.applyActiveFromHash());
    }

    handleScroll() {
      if (!this.navbar) return;
      const scrolled = window.scrollY > 100;
      this.navbar.classList.toggle('is-scrolled', scrolled);
    }

    handleResize() {
      this.handleScroll();
      this.updateScrollbarCompensation();
    }

    isOpen() {
      return document.body.classList.contains('nav-open');
    }

    updateScrollbarCompensation() {
      const root = document.documentElement;
      if (!(root instanceof HTMLElement)) return;

      if (!this.isOpen()) {
        root.style.removeProperty('--scrollbar-compensation');
        return;
      }

      const width = window.innerWidth - root.clientWidth;
      const px = clamp(width, 0, 40);
      root.style.setProperty('--scrollbar-compensation', `${px}px`);
    }

    openMenu() {
      if (this.isOpen()) return;
      document.body.classList.add('nav-open');
      if (this.toggle) this.toggle.setAttribute('aria-expanded', 'true');
      this.updateScrollbarCompensation();

      if (this.backdrop) {
        window.clearTimeout(this.backdropHideTimer);
        this.backdrop.hidden = false;
      }

      this.updateMenuAccessibility();
      if (this.mqMobile.matches) {
        const firstLink = this.navList?.querySelector('a[href^=\"#\"]');
        if (firstLink instanceof HTMLElement) firstLink.focus({ preventScroll: true });
      }
    }

    closeMenu() {
      if (!this.isOpen()) return;
      document.body.classList.remove('nav-open');
      if (this.toggle) this.toggle.setAttribute('aria-expanded', 'false');
      this.updateScrollbarCompensation();

      if (this.backdrop) {
        window.clearTimeout(this.backdropHideTimer);
        this.backdropHideTimer = window.setTimeout(() => {
          if (!this.isOpen()) this.backdrop.hidden = true;
        }, 240);
      }

      this.updateMenuAccessibility();
      if (this.mqMobile.matches && this.toggle instanceof HTMLElement) {
        this.toggle.focus({ preventScroll: true });
      }
    }

    toggleMenu() {
      if (this.isOpen()) {
        this.closeMenu();
        return;
      }
      this.openMenu();
    }

    updateMenuAccessibility() {
      if (!this.navList) return;

      const isMobile = this.mqMobile.matches;
      if (!isMobile) {
        this.navList.removeAttribute('aria-hidden');
        this.navList.removeAttribute('inert');
        if ('inert' in this.navList) this.navList.inert = false;
        return;
      }

      const isOpen = this.isOpen();
      this.navList.setAttribute('aria-hidden', isOpen ? 'false' : 'true');

      if ('inert' in this.navList) {
        this.navList.inert = !isOpen;
      } else if (!isOpen) {
        this.navList.setAttribute('inert', '');
      } else {
        this.navList.removeAttribute('inert');
      }
    }

    getMenuFocusables() {
      const focusables = [];

      if (this.toggle instanceof HTMLButtonElement) {
        focusables.push(this.toggle);
      }

      this.links.forEach((link) => {
        if (!(link instanceof HTMLElement)) return;
        if (link.getAttribute('aria-hidden') === 'true') return;
        focusables.push(link);
      });

      return focusables.filter((el) => {
        if (!(el instanceof HTMLElement)) return false;
        if (el.hasAttribute('disabled')) return false;
        return true;
      });
    }

    trapFocus(e) {
      if (!(e instanceof KeyboardEvent)) return;
      if (!this.isOpen()) return;
      if (!this.mqMobile.matches) return;

      const focusables = this.getMenuFocusables();
      if (!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (!(active instanceof Element) || !focusables.includes(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus({ preventScroll: true });
        return;
      }

      if (e.shiftKey) {
        if (active === first) {
          e.preventDefault();
          last.focus({ preventScroll: true });
        }
        return;
      }

      if (active === last) {
        e.preventDefault();
        first.focus({ preventScroll: true });
      }
    }

    setActiveLink(id) {
      const normalized = id.startsWith('#') ? id : `#${id}`;
      this.links.forEach((link) => {
        if (link.getAttribute('href') === normalized) {
          link.setAttribute('aria-current', 'true');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    }

    applyActiveFromHash() {
      if (!location.hash) return;
      const id = location.hash.replace('#', '').trim();
      if (!id) return;
      this.setActiveLink(id);
    }

    initActiveSection() {
      if (!('IntersectionObserver' in window)) return;

      const targets = this.links
        .map((link) => {
          const href = link.getAttribute('href');
          if (!href) return null;
          const target = document.querySelector(href);
          if (!(target instanceof HTMLElement)) return null;
          return { link, target };
        })
        .filter(Boolean);

      if (!targets.length) return;

      this.sectionObserver = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0))[0];
          if (!visible) return;
          this.setActiveLink(visible.target.id);
        },
        {
          root: null,
          threshold: [0.15, 0.22, 0.3],
          rootMargin: '-35% 0px -55% 0px',
        },
      );

      targets.forEach(({ target }) => this.sectionObserver?.observe(target));
    }
  }

  class MouseFollower {
    constructor() {
      this.el = null;
      this.x = -999;
      this.y = -999;
      this.scale = 1;
      this.raf = 0;
      this.initialized = false;

      this._onMove = (e) => {
        if (prefersReducedMotion() || isCoarsePointer()) return;
        this.x = e.clientX;
        this.y = e.clientY;
        this.schedule();
      };

      this._onDown = () => {
        if (prefersReducedMotion() || isCoarsePointer()) return;
        this.scale = 1.45;
        this.schedule();
      };

      this._onUp = () => {
        if (prefersReducedMotion() || isCoarsePointer()) return;
        this.scale = 1;
        this.schedule();
      };
    }

    init() {
      if (this.initialized) return;
      if (prefersReducedMotion() || isCoarsePointer()) return;

      const el = document.createElement('div');
      el.className = 'cursor-follower is-ready';
      document.body.appendChild(el);
      this.el = el;
      this.initialized = true;

      document.addEventListener('mousemove', this._onMove, { passive: true });
      document.addEventListener('mousedown', this._onDown, { passive: true });
      document.addEventListener('mouseup', this._onUp, { passive: true });
    }

    schedule() {
      if (this.raf) return;
      this.raf = requestAnimationFrame(() => {
        this.raf = 0;
        this.render();
      });
    }

    render() {
      if (!this.el) return;
      this.el.style.transform = `translate3d(${this.x - 9}px, ${this.y - 9}px, 0) scale(${this.scale})`;
    }
  }

  class FormHandler {
    constructor({ form, toast, confetti }) {
      this.form = form;
      this.toast = toast;
      this.confetti = confetti;

      this.fields = {
        name: form?.querySelector('#name') || null,
        email: form?.querySelector('#email') || null,
        phone: form?.querySelector('#phone') || null,
        message: form?.querySelector('#message') || null,
      };

      this._saveDraft = rafThrottle(() => this.saveDraft());
    }

    init() {
      if (!this.form) return;

      this.restoreDraft();

      this.form.addEventListener('input', this._saveDraft, { passive: true });
      this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    readDraft() {
      const raw = safeStorageGet(STORAGE_KEY);
      if (!raw) return null;
      return safeJsonParse(raw);
    }

    restoreDraft() {
      const draft = this.readDraft();
      if (!draft) return;

      if (this.fields.name && typeof draft.name === 'string') this.fields.name.value = draft.name;
      if (this.fields.email && typeof draft.email === 'string') this.fields.email.value = draft.email;
      if (this.fields.phone && typeof draft.phone === 'string') this.fields.phone.value = draft.phone;
      if (this.fields.message && typeof draft.message === 'string') this.fields.message.value = draft.message;
    }

    saveDraft() {
      const payload = {
        name: this.fields.name?.value || '',
        email: this.fields.email?.value || '',
        phone: this.fields.phone?.value || '',
        message: this.fields.message?.value || '',
        savedAt: Date.now(),
      };

      safeStorageSet(STORAGE_KEY, JSON.stringify(payload));
    }

    clearDraft() {
      safeStorageRemove(STORAGE_KEY);
    }

    setSubmitting(isSubmitting) {
      const btn = this.form?.querySelector('button[type=\"submit\"]');
      if (!(btn instanceof HTMLButtonElement)) return;

      if (isSubmitting) {
        btn.dataset.originalText = btn.textContent || '';
        btn.textContent = '发送中...';
        btn.disabled = true;
        return;
      }

      const original = btn.dataset.originalText || '发送消息';
      btn.textContent = original;
      btn.disabled = false;
    }

    handleSubmit(e) {
      e.preventDefault();
      if (!this.form) return;

      const name = (this.fields.name?.value || '').trim();
      const email = (this.fields.email?.value || '').trim();

      if (!name) {
        this.toast?.show('请填写你的名字。', { variant: 'error' });
        this.fields.name?.focus();
        return;
      }

      if (!email) {
        this.toast?.show('请填写邮箱地址。', { variant: 'error' });
        this.fields.email?.focus();
        return;
      }

      if (this.fields.email && !this.fields.email.checkValidity()) {
        this.toast?.show('邮箱格式看起来不太对，请检查一下。', { variant: 'error' });
        this.fields.email.focus();
        return;
      }

      this.setSubmitting(true);

      window.setTimeout(() => {
        this.toast?.show('消息已发送！感谢你对 MrBeast 的支持！', { variant: 'success' });
        this.clearDraft();
        this.form?.reset();
        this.setSubmitting(false);

        const btn = this.form?.querySelector('button[type=\"submit\"]');
        if (btn instanceof HTMLElement) {
          const rect = btn.getBoundingClientRect();
          this.confetti?.burst({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, count: 110 });
        } else {
          this.confetti?.burst({ count: 90 });
        }
      }, 1100);
    }
  }

  const setCurrentYear = () => {
    const year = String(new Date().getFullYear());
    document.querySelectorAll('[data-current-year]').forEach((el) => {
      el.textContent = year;
    });
  };

  const initToTop = () => {
    const btn = document.querySelector('[data-to-top]');
    if (!(btn instanceof HTMLButtonElement)) return;

    const update = rafThrottle(() => {
      btn.classList.toggle('is-visible', window.scrollY > 700);
    });

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    });
  };

  const initScrollProgress = () => {
    const root = document.documentElement;

    const update = rafThrottle(() => {
      const max = root.scrollHeight - window.innerHeight;
      const progress = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
      root.style.setProperty('--scroll-progress', String(progress));
    });

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  };

  const initMotionToggle = ({ toast, particles, carousels, spotlight, mouseFollower }) => {
    const btn = document.querySelector('[data-motion-toggle]');
    if (!(btn instanceof HTMLButtonElement)) return;

    const syncButton = () => {
      btn.textContent = motionModeLabel(motionMode);
      btn.setAttribute('aria-label', motionModeAriaLabel(motionMode));
      applyMotionAttribute();
    };

    const applyRuntime = () => {
      const reduced = prefersReducedMotion();

      if (reduced) {
        document.querySelectorAll('.scroll-animate').forEach((el) => el.classList.add('active'));
        particles?.stop();
        carousels?.forEach((carousel) => carousel.pause());
        return;
      }

      particles?.init();
      particles?.start();
      carousels?.forEach((carousel) => carousel.play());
      spotlight?.init();
      mouseFollower?.init();
    };

    syncButton();
    applyRuntime();

    btn.addEventListener('click', () => {
      persistMotionMode(nextMotionMode(motionMode));
      syncButton();
      applyRuntime();

      toast?.show(`已切换：${motionModeLabel(motionMode)}`, { variant: 'success', timeoutMs: 2200 });
    });

    document.addEventListener('keydown', (e) => {
      if (!(e instanceof KeyboardEvent)) return;
      if (!e.altKey) return;
      if (e.key !== 'm' && e.key !== 'M') return;
      const target = e.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      btn.click();
    });

    const onSystemChange = () => {
      if (motionMode !== 'auto') return;
      syncButton();
      applyRuntime();
    };

    if (typeof mqReducedMotion.addEventListener === 'function') {
      mqReducedMotion.addEventListener('change', onSystemChange);
    } else if (typeof mqReducedMotion.addListener === 'function') {
      mqReducedMotion.addListener(onSystemChange);
    }
  };

  onReady(() => {
    setCurrentYear();
    initToTop();
    initScrollProgress();

    const toast = new Toast(document.getElementById('toast-root'));
    const confetti = new Confetti(document.getElementById('fxCanvas'));
    confetti.init();

    const spotlight = new Spotlight();
    spotlight.init();

    const navbar = new Navbar();
    navbar.init();

    const scrollAnimator = new ScrollAnimator();
    scrollAnimator.init();

    const carousels = [];
    document.querySelectorAll('[data-carousel]').forEach((el) => {
      const carousel = new Carousel(el, { intervalMs: 6800 });
      carousel.init();
      carousels.push(carousel);
    });

    const particles = new ParticleSystem(document.getElementById('particleCanvas'));
    particles.init();
    particles.start();

    const mouseFollower = new MouseFollower();
    mouseFollower.init();

    const formHandler = new FormHandler({
      form: document.getElementById('contactForm'),
      toast,
      confetti,
    });
    formHandler.init();

    initMotionToggle({
      toast,
      particles,
      carousels,
      spotlight,
      mouseFollower,
    });
  });
})();
