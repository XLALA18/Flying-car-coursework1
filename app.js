(() => {
  "use strict";

  document.documentElement.classList.add("js");

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const number = new Intl.NumberFormat("zh-CN");

  /* ------------------------------------------------------------
     Header, progress, mobile navigation
     ------------------------------------------------------------ */
  const header = $("#siteHeader");
  const progress = $("#scrollProgress");
  const navToggle = $("#navToggle");
  const navLinks = $$("#siteNav a");
  let ticking = false;

  function updateScrollUI() {
    const top = window.scrollY || document.documentElement.scrollTop;
    if (header) header.classList.toggle("is-scrolled", top > 40);

    if (progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(1, Math.max(0, top / max)) : 0;
      progress.style.width = `${ratio * 100}%`;
    }
    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(updateScrollUI);
      ticking = true;
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  updateScrollUI();

  function closeNav() {
    if (!header) return;
    header.classList.remove("nav-open");
    if (navToggle) navToggle.setAttribute("aria-expanded", "false");
  }

  if (navToggle && header) {
    navToggle.addEventListener("click", () => {
      const open = header.classList.toggle("nav-open");
      navToggle.setAttribute("aria-expanded", String(open));
    });

    navLinks.forEach((link) => link.addEventListener("click", closeNav));

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeNav();
    });

    document.addEventListener("click", (event) => {
      if (!header.classList.contains("nav-open")) return;
      if (!header.contains(event.target)) closeNav();
    });
  }

  /* Active section in navigation */
  const navMap = new Map();
  navLinks.forEach((link) => {
    const id = link.getAttribute("href");
    if (id && id.startsWith("#")) navMap.set(id.slice(1), link);
  });

  if ("IntersectionObserver" in window && navMap.size) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((link) => link.classList.remove("is-active"));
          const link = navMap.get(entry.target.id);
          if (link) link.classList.add("is-active");
        });
      },
      { rootMargin: "-42% 0px -52% 0px", threshold: 0 }
    );
    navMap.forEach((_, id) => {
      const section = document.getElementById(id);
      if (section) sectionObserver.observe(section);
    });
  }

  /* ------------------------------------------------------------
     Reveal on scroll
     ------------------------------------------------------------ */
  const revealElements = $$("[data-reveal]");
  if (!prefersReducedMotion && "IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    revealElements.forEach((el) => revealObserver.observe(el));
  } else {
    revealElements.forEach((el) => el.classList.add("is-visible"));
  }

  /* ------------------------------------------------------------
     Number count-up
     ------------------------------------------------------------ */
  function countUp(el) {
    if (el.dataset.counted === "true") return;
    el.dataset.counted = "true";

    const target = Number.parseFloat(el.dataset.target || "0");
    const suffix = el.dataset.suffix || "";
    const decimals = Number.parseInt(el.dataset.decimals || "0", 10);
    const duration = prefersReducedMotion ? 0 : 900;
    const start = performance.now();

    function render(value) {
      const formatted = number.format(
        decimals > 0
          ? Number(value.toFixed(decimals))
          : Math.round(value)
      );
      if (suffix) {
        el.innerHTML = `${formatted}<small>${suffix}</small>`;
      } else {
        el.textContent = formatted;
      }
    }

    if (duration === 0) {
      render(target);
      return;
    }

    function frame(now) {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      render(target * eased);
      if (p < 1) window.requestAnimationFrame(frame);
      else render(target);
    }
    window.requestAnimationFrame(frame);
  }

  const counters = $$(".count");
  if ("IntersectionObserver" in window) {
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          countUp(entry.target);
          counterObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.45 }
    );
    counters.forEach((el) => counterObserver.observe(el));
  } else {
    counters.forEach(countUp);
  }

  /* ------------------------------------------------------------
     Spec tabs
     ------------------------------------------------------------ */
  const tabs = $$(".tab");
  const panels = $$(".tab-panel");

  function activateTab(tab) {
    const target = tab.dataset.tab;
    tabs.forEach((item) => {
      const active = item === tab;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", String(active));
      item.tabIndex = active ? 0 : -1;
    });
    panels.forEach((panel) => {
      const active = panel.id === `panel-${target}`;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
    });
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => activateTab(tab));
    tab.addEventListener("keydown", (event) => {
      const current = tabs.indexOf(tab);
      let next = null;
      if (event.key === "ArrowRight") next = tabs[(current + 1) % tabs.length];
      if (event.key === "ArrowLeft") next = tabs[(current - 1 + tabs.length) % tabs.length];
      if (event.key === "Home") next = tabs[0];
      if (event.key === "End") next = tabs[tabs.length - 1];
      if (next) {
        event.preventDefault();
        activateTab(next);
        next.focus();
      }
    });
  });

  /* ------------------------------------------------------------
     Redundancy demo
     ------------------------------------------------------------ */
  const failRotorButton = $("#failRotor");
  const resetRotorButton = $("#resetRotor");
  const rotorStatus = $("#rotorStatus");
  const demoRotors = $$(".demo-rotor");

  function setRotorFailure(failed) {
    demoRotors.forEach((rotor) => {
      const isFailed = failed && rotor.dataset.rotor === "3";
      rotor.classList.toggle("failed", isFailed);
      rotor.classList.toggle("boost", failed && !isFailed);
    });

    if (rotorStatus) {
      rotorStatus.classList.toggle("is-failed", failed);
      rotorStatus.textContent = failed
        ? "状态：5/6 旋翼正常 · 1 个失效。飞控重新分配推力与力矩；这是设计冗余示意，不是故障率数据。"
        : "状态：6/6 旋翼正常。点击按钮查看失效示意。";
    }

    if (failRotorButton) failRotorButton.disabled = failed;
    if (resetRotorButton) resetRotorButton.disabled = !failed;
  }

  if (failRotorButton && resetRotorButton) {
    failRotorButton.addEventListener("click", () => setRotorFailure(true));
    resetRotorButton.addEventListener("click", () => setRotorFailure(false));
  }

  /* ------------------------------------------------------------
     Range / scenario widget
     ------------------------------------------------------------ */
  const rangeData = {
    scenic: {
      kicker: "典型任务 / 高适配",
      headline: "8 km 环线 · 约 12 分钟",
      desc: "从营地起飞，绕山谷或湖面一圈后返回。20 km 最大航程足够覆盖 8–10 km 的观光环线，并保留返航余量。",
      fit: "高",
      width: 92,
      foot: "判断依据：航程、座舱、昼间目视、起降场地与监管边界。",
      marker: [274, 168],
      path: "M230 230 Q275 185 274 168"
    },
    training: {
      kicker: "训练空域 / 高适配",
      headline: "5 km 起落航线 · 约 10 分钟",
      desc: "围绕起降点做起落、悬停与应急科目。飞行培训是专用条件明确允许的场景，但需要教练、空域、维修与保险体系。",
      fit: "高",
      width: 88,
      foot: "判断依据：LSA 培训用途、双座、昼间目视。",
      marker: [214, 185],
      path: "M230 230 Q210 205 214 185"
    },
    commute: {
      kicker: "城市通勤 / 不适配",
      headline: "25 km 单程 · 超出包线",
      desc: "20 km 是最大航程，不是可用通勤半径；120 m AGL、72 km/h、昼间目视与商业载客限制，任一条都足以否定通勤叙事。",
      fit: "低",
      width: 12,
      foot: "判断依据：航程、速度、高度、商业载客限制。",
      marker: [425, 366],
      path: "M230 230 Q340 260 425 366"
    },
    emergency: {
      kicker: "应急救援 / 低适配",
      headline: "15 km 任务 · 载荷与夜航受限",
      desc: "双座、纯电、20 分钟级航时，难以承担医疗/消防载荷；夜航与复杂气象也不在初始运行边界内。",
      fit: "低",
      width: 24,
      foot: "判断依据：载荷、航时、夜航/全天候能力。",
      marker: [312, 347],
      path: "M230 230 Q300 285 312 347"
    }
  };

  const rangeTabs = $$(".range-tab");
  const rangeMarker = $("#rangeMarker");
  const rangeRoute = $("#rangeRoute");
  const rangeKicker = $("#rangeKicker");
  const rangeHeadline = $("#rangeHeadline");
  const rangeDesc = $("#rangeDesc");
  const rangeFitLabel = $("#rangeFitLabel");
  const rangeFitBar = $("#rangeFitBar");
  const rangeFoot = $("#rangeFoot");

  function selectRange(key) {
    const data = rangeData[key];
    if (!data) return;

    rangeTabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.range === key));
    rangeTabs.forEach((tab) => tab.setAttribute("aria-pressed", String(tab.dataset.range === key)));
    if (rangeMarker) rangeMarker.setAttribute("transform", `translate(${data.marker[0]} ${data.marker[1]})`);
    if (rangeRoute) rangeRoute.setAttribute("d", data.path);
    if (rangeKicker) rangeKicker.textContent = data.kicker;
    if (rangeHeadline) rangeHeadline.textContent = data.headline;
    if (rangeDesc) rangeDesc.textContent = data.desc;
    if (rangeFitLabel) rangeFitLabel.textContent = data.fit;
    if (rangeFoot) rangeFoot.textContent = data.foot;

    if (rangeFitBar) {
      rangeFitBar.style.width = `${data.width}%`;
      rangeFitBar.style.background =
        data.fit === "高" ? "var(--green)" : data.fit === "低" ? "var(--red)" : "var(--yellow)";
    }
  }

  rangeTabs.forEach((tab) => {
    tab.addEventListener("click", () => selectRange(tab.dataset.range));
  });

  /* ------------------------------------------------------------
     Market calculator
     ------------------------------------------------------------ */
  const priceRange = $("#priceRange");
  const conversionRange = $("#conversionRange");
  const deliveryRange = $("#deliveryRange");
  const priceOut = $("#priceOut");
  const conversionOut = $("#conversionOut");
  const deliveryOut = $("#deliveryOut");
  const gmvOut = $("#gmvOut");
  const revenueOut = $("#revenueOut");
  const unitsOut = $("#unitsOut");

  const ORDERS = 7000;

  function setRangeFill(input) {
    if (!input) return;
    const min = Number(input.min) || 0;
    const max = Number(input.max) || 100;
    const value = Number(input.value) || 0;
    const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;
    input.style.setProperty("--p", `${percent}%`);
  }

  function oneDecimal(value) {
    return Number(value.toFixed(1)).toLocaleString("zh-CN", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
  }

  function updateMarket() {
    if (!priceRange || !conversionRange || !deliveryRange) return;

    const price = Number(priceRange.value);
    const conversion = Number(conversionRange.value);
    const deliveries = Number(deliveryRange.value);
    const convertedUnits = Math.round((ORDERS * conversion) / 100);
    const gmv = (convertedUnits * price) / 10000;
    const revenue = (deliveries * price) / 10000;

    if (priceOut) priceOut.textContent = `${price} 万元`;
    if (conversionOut) conversionOut.textContent = `${conversion}%`;
    if (deliveryOut) deliveryOut.textContent = `${number.format(deliveries)} 台`;
    if (gmvOut) gmvOut.textContent = `${oneDecimal(gmv)} 亿元`;
    if (revenueOut) revenueOut.textContent = `${oneDecimal(revenue)} 亿元`;
    if (unitsOut) unitsOut.textContent = `${number.format(convertedUnits)} 台`;

    [priceRange, conversionRange, deliveryRange].forEach(setRangeFill);
  }

  [priceRange, conversionRange, deliveryRange].forEach((input) => {
    if (!input) return;
    input.addEventListener("input", updateMarket);
    setRangeFill(input);
  });
  updateMarket();

  /* ------------------------------------------------------------
     Evidence filters
     ------------------------------------------------------------ */
  const evidenceRows = $$("#evidenceTable tbody tr");
  const evidenceChips = $$(".filter-chips .chip");

  const typeCounts = { all: evidenceRows.length };
  evidenceRows.forEach((row) => {
    const type = row.dataset.type || "other";
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });

  evidenceChips.forEach((chip) => {
    const filter = chip.dataset.filter || "all";
    const count = chip.querySelector("span");
    if (count) count.textContent = String(typeCounts[filter] || 0);
    chip.setAttribute("aria-pressed", chip.classList.contains("is-active") ? "true" : "false");

    chip.addEventListener("click", () => {
      evidenceChips.forEach((item) => {
        const active = item === chip;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", String(active));
      });

      evidenceRows.forEach((row) => {
        const show = filter === "all" || row.dataset.type === filter;
        row.classList.toggle("is-hidden", !show);
      });
    });
  });

  /* ------------------------------------------------------------
     Optional: initial state
     ------------------------------------------------------------ */
  selectRange("scenic");
  setRotorFailure(false);
})();
