(() => {
  'use strict';

  const STORAGE_KEY = 'mrbeast_contact_draft_v1';

  const mqReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mqCoarsePointer = window.matchMedia('(pointer: coarse)');

  const prefersReducedMotion = () => mqReducedMotion.matches;
  const isCoarsePointer = () => mqCoarsePointer.matches;

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
      this.particles = [];
      this.running = false;
      this.pointer = { x: 0, y: 0, active: false };

      this.width = 0;
      this.height = 0;
      this.dpr = 1;
      this.connectionDistance = 100;
      this.pointerDistance = 150;

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
      if (prefersReducedMotion()) return;

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
      const n = this.particles.length;
      const maxDistance2 = this.connectionDistance * this.connectionDistance;

      for (let i = 0; i < n; i++) {
        const p1 = this.particles[i];
        for (let j = i + 1; j < n; j++) {
          const p2 = this.particles[j];
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

  class Navbar {
    constructor() {
      this.navbar = document.querySelector('.navbar');
      this.toggle = document.querySelector('.nav-toggle');
      this.backdrop = document.querySelector('[data-nav-backdrop]');
      this.links = Array.from(document.querySelectorAll('#primary-navigation a[href^=\"#\"]'));

      this._onScroll = rafThrottle(() => this.handleScroll());
      this.sectionObserver = null;
      this.backdropHideTimer = 0;
    }

    init() {
      this.handleScroll();
      window.addEventListener('scroll', this._onScroll, { passive: true });

      this.toggle?.addEventListener('click', () => this.toggleMenu());
      this.backdrop?.addEventListener('click', () => this.closeMenu());

      document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        this.closeMenu();
      });

      const navList = document.getElementById('primary-navigation');
      navList?.addEventListener('click', (e) => {
        const a = e.target instanceof Element ? e.target.closest('a[href^=\"#\"]') : null;
        if (!a) return;
        this.closeMenu();
      });

      this.initActiveSection();
      this.applyActiveFromHash();
      window.addEventListener('hashchange', () => this.applyActiveFromHash());
    }

    handleScroll() {
      if (!this.navbar) return;
      const scrolled = window.scrollY > 100;
      this.navbar.classList.toggle('is-scrolled', scrolled);
    }

    isOpen() {
      return document.body.classList.contains('nav-open');
    }

    openMenu() {
      if (this.isOpen()) return;
      document.body.classList.add('nav-open');
      if (this.toggle) this.toggle.setAttribute('aria-expanded', 'true');

      if (this.backdrop) {
        window.clearTimeout(this.backdropHideTimer);
        this.backdrop.hidden = false;
      }
    }

    closeMenu() {
      if (!this.isOpen()) return;
      document.body.classList.remove('nav-open');
      if (this.toggle) this.toggle.setAttribute('aria-expanded', 'false');

      if (this.backdrop) {
        window.clearTimeout(this.backdropHideTimer);
        this.backdropHideTimer = window.setTimeout(() => {
          if (!this.isOpen()) this.backdrop.hidden = true;
        }, 240);
      }
    }

    toggleMenu() {
      if (this.isOpen()) {
        this.closeMenu();
        return;
      }
      this.openMenu();
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
    }

    init() {
      if (prefersReducedMotion() || isCoarsePointer()) return;

      const el = document.createElement('div');
      el.className = 'cursor-follower is-ready';
      document.body.appendChild(el);
      this.el = el;

      document.addEventListener(
        'mousemove',
        (e) => {
          this.x = e.clientX;
          this.y = e.clientY;
          this.schedule();
        },
        { passive: true },
      );

      document.addEventListener('mousedown', () => {
        this.scale = 1.45;
        this.schedule();
      });

      document.addEventListener('mouseup', () => {
        this.scale = 1;
        this.schedule();
      });
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

  onReady(() => {
    document.documentElement.classList.add('js');

    setCurrentYear();

    const toast = new Toast(document.getElementById('toast-root'));
    const confetti = new Confetti(document.getElementById('fxCanvas'));
    confetti.init();

    const navbar = new Navbar();
    navbar.init();

    const scrollAnimator = new ScrollAnimator();
    scrollAnimator.init();

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
  });
})();
