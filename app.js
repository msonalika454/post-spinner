(function () {
  "use strict";

  const DATA = window.POST_SPINNER_DATA;
  const KEYS = ["format", "topic", "hook"];
  const HISTORY_LIMIT = 5;
  const FAVORITES_KEY = "postSpinner.favorites";
  const CONTRAST_KEY = "postSpinner.highContrast";
  const SOUND_KEY = "postSpinner.sound";

  // Rings stop one by one, inside to outside, and turn in opposite directions.
  const SPIN = {
    format: { ms: 1700, turns: 3, dir: 1 },
    topic: { ms: 2200, turns: 4, dir: -1 },
    hook: { ms: 2700, turns: 5, dir: 1 },
  };

  // Ring sizes in a 1000 x 1000 drawing. The hub fills the middle 26%.
  const RINGS = {
    format: { inner: 130, outer: 240, font: 31, chars: 12, lines: 1 },
    topic: { inner: 240, outer: 385, font: 27, chars: 12, lines: 3 },
    hook: { inner: 385, outer: 500, font: 21, chars: 10, lines: 2 },
  };

  const el = (id) => document.getElementById(id);
  const spinButton = el("spin");
  const saveButton = el("save");
  const copyButton = el("copy");
  const undoButton = el("undo");
  const copyAllButton = el("copy-all");
  const contrastButton = el("contrast");
  const soundButton = el("sound");
  const pointer = el("pointer");
  const announcer = el("announcer");
  const toastBox = el("toast");
  const toastText = el("toast-text");
  const toastAction = el("toast-action");

  const headline = document.querySelector(".headline");

  const IDLE_TEXT = { format: "Format", topic: "Topic", hook: el("value-hook").textContent };
  const values = { format: el("value-format"), topic: el("value-topic"), hook: el("value-hook") };
  const shells = { format: document.querySelector(".tag--format"), topic: document.querySelector(".tag--topic"), hook: headline };
  const locks = {};
  document.querySelectorAll(".lock").forEach((button) => { locks[button.dataset.key] = button; });

  const rings = {};                // key -> { node, items, seg, angle, segments }

  const state = {
    current: null,                 // { format, topic, hook } once she has spun
    locked: { format: false, topic: false, hook: false },
    history: [],                   // previous ideas, newest first
    favorites: [],
    niche: "All",
    sound: true,
    run: null,                     // { next, pending: Map(key -> { animation, target }) }
  };

  /* ---------- Idea helpers ---------- */

  const sameIdea = (a, b) => KEYS.every((key) => a[key] === b[key]);
  const spoken = (idea) => `${idea.format}, ${idea.topic}, Hook: ${idea.hook}`;
  const ideaAsText = (idea) => `Format: ${idea.format}\nTopic: ${idea.topic}\nHook: ${idea.hook}`;

  function pick(pool, avoid) {
    const fresh = pool.filter((item) => item !== avoid);
    const options = fresh.length ? fresh : pool;
    return options[Math.floor(Math.random() * options.length)];
  }

  function topicsInNiche() {
    return DATA.topics
      .filter((topic) => state.niche === "All" || topic.niches.includes(state.niche))
      .map((topic) => topic.name);
  }

  // A hook comes from the topic's own niches plus "Any", so the pair reads as one idea.
  function hooksForTopic(topicName) {
    const topic = DATA.topics.find((item) => item.name === topicName);
    const groups = ["Any", ...(topic ? topic.niches : [])];
    return [...new Set(groups.flatMap((group) => DATA.hooks[group] || []))];
  }

  function poolFor(key, next) {
    if (key === "format") return DATA.formats;
    if (key === "topic") return topicsInNiche();
    return hooksForTopic(next.topic);
  }

  function buildNextIdea() {
    const next = {};
    for (const key of KEYS) {
      if (state.locked[key]) {
        next[key] = state.current[key];
        continue;
      }
      const pool = poolFor(key, next);
      if (!pool.length) return null;
      next[key] = pick(pool, state.current && state.current[key]);
    }
    return next;
  }

  /* ---------- Drawing the wheel ---------- */

  const SVG_NS = "http://www.w3.org/2000/svg";
  const svgNode = (name, attrs) => {
    const node = document.createElementNS(SVG_NS, name);
    Object.entries(attrs).forEach(([attr, value]) => node.setAttribute(attr, value));
    return node;
  };

  const onCircle = (radius, degrees) => {
    const radians = (degrees * Math.PI) / 180;
    return `${(500 + radius * Math.sin(radians)).toFixed(2)} ${(500 - radius * Math.cos(radians)).toFixed(2)}`;
  };

  function wedge(inner, outer, from, to) {
    const large = to - from > 180 ? 1 : 0;
    return `M${onCircle(inner, from)} L${onCircle(outer, from)} A${outer} ${outer} 0 ${large} 1 ${onCircle(outer, to)} L${onCircle(inner, to)} A${inner} ${inner} 0 ${large} 0 ${onCircle(inner, from)} Z`;
  }

  function wrapWords(text, chars, maxLines) {
    const lines = [];
    for (const word of text.split(/\s+/)) {
      const last = lines[lines.length - 1];
      if (last !== undefined && `${last} ${word}`.length <= chars) lines[lines.length - 1] = `${last} ${word}`;
      else lines.push(word);
    }
    return lines.slice(0, maxLines);
  }

  function buildRing(key, items) {
    const spec = RINGS[key];
    const seg = 360 / items.length;
    const svg = svgNode("svg", { viewBox: "0 0 1000 1000", class: `ring ring--${key}` });
    const middle = (spec.inner + spec.outer) / 2;
    const segments = items.map((item, index) => {
      const group = svgNode("g", { class: `seg seg--${index % 2 ? "b" : "a"}` });
      group.append(svgNode("path", { d: wedge(spec.inner, spec.outer, index * seg, (index + 1) * seg) }));

      // The hook ring only has room for a hook's opening words.
      const label = key === "hook" ? item.split(/\s+/).slice(0, 2).join(" ") : item;
      const lines = wrapWords(label, spec.chars, spec.lines);
      const leading = spec.font * 1.08;
      const firstLine = 500 - middle - ((lines.length - 1) * leading) / 2 + spec.font * 0.35;
      const text = svgNode("text", {
        x: 500,
        "font-size": spec.font,
        "text-anchor": "middle",
        transform: `rotate(${(index + 0.5) * seg} 500 500)`,
      });
      lines.forEach((line, row) => {
        const span = svgNode("tspan", { x: 500, y: (firstLine + row * leading).toFixed(1) });
        span.textContent = line;
        text.append(span);
      });
      group.append(text);
      svg.append(group);
      return group;
    });
    return { node: svg, items, seg, angle: -seg / 2, segments };
  }

  function buildWheel() {
    const lists = {
      format: DATA.formats,
      topic: DATA.topics.map((topic) => topic.name),
      hook: Object.values(DATA.hooks).flat(),
    };
    const wheel = el("wheel");
    for (const key of [...KEYS].reverse()) {
      rings[key] = buildRing(key, [...new Set(lists[key])]);
      rings[key].node.style.transform = `rotate(${rings[key].angle}deg)`;
      wheel.append(rings[key].node);
    }
    // The story section reuses the same wheel, turned by scrolling.
    el("story-wheel").append(...[...wheel.children].map((ring) => {
      const copy = ring.cloneNode(true);
      copy.style.transform = "";
      return copy;
    }));
    dimTopics();
  }

  // Rotation that brings an item under the pointer.
  const restAngle = (ring, value) => -(ring.items.indexOf(value) + 0.5) * ring.seg;

  function markHit(key) {
    const ring = rings[key];
    const value = state.run ? state.run.next[key] : state.current && state.current[key];
    ring.segments.forEach((segment, index) => {
      segment.classList.toggle("is-hit", ring.items[index] === value);
    });
  }

  // The filter shows on the wheel itself: topics outside the niche fade.
  function dimTopics() {
    const allowed = topicsInNiche();
    rings.topic.segments.forEach((segment, index) => {
      segment.classList.toggle("is-off", !allowed.includes(rings.topic.items[index]));
    });
  }

  /* ---------- Sound ---------- */

  let audio = null;

  function blip(frequency, length, volume) {
    if (!state.sound) return;
    const AudioEngine = window.AudioContext || window.webkitAudioContext;
    if (!AudioEngine) return;
    audio = audio || new AudioEngine();
    if (audio.state === "suspended") audio.resume();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const now = audio.currentTime;
    oscillator.type = "square";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(now);
    oscillator.stop(now + length);
  }

  /* ---------- Spin ---------- */

  const prefersReducedMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function spin() {
    if (state.run) {
      settle();
      return;
    }
    if (!dataIsValid()) {
      toast("Fix data.js, then refresh the page.");
      return;
    }
    const free = KEYS.filter((key) => !state.locked[key]);
    if (!free.length) {
      toast("All three are locked. Unlock one to spin.");
      return;
    }
    const next = buildNextIdea();
    if (!next) {
      toast("No ideas in this niche. Pick another filter.");
      return;
    }
    if (prefersReducedMotion()) {
      free.forEach((key) => setAngle(key, restAngle(rings[key], next[key])));
      commit(next);
      return;
    }
    animate(next, free);
  }

  function setAngle(key, angle) {
    rings[key].angle = angle;
    rings[key].node.style.transform = `rotate(${angle}deg)`;
  }

  function animate(next, free) {
    state.run = { next, pending: new Map() };
    spinButton.textContent = "Stop";
    spinButton.classList.add("is-spinning");
    el("result").setAttribute("aria-busy", "true");
    blip(90, 0.09, 0.05);

    for (const key of free) {
      const ring = rings[key];
      const { ms, turns, dir } = SPIN[key];
      const from = ring.angle;
      const rest = restAngle(ring, next[key]) + (Math.random() - 0.5) * ring.seg * 0.5;
      const gap = (((rest - from) * dir) % 360 + 360) % 360;
      const target = from + dir * (turns * 360 + gap);
      const overshoot = target + dir * ring.seg * 0.14;

      ring.segments.forEach((segment) => segment.classList.remove("is-hit"));
      shells[key].classList.remove("is-empty");

      const animation = ring.node.animate(
        [
          { transform: `rotate(${from}deg)`, easing: "cubic-bezier(0.1, 0.6, 0.12, 1)" },
          { transform: `rotate(${overshoot}deg)`, offset: 0.93, easing: "ease-in-out" },
          { transform: `rotate(${target}deg)` },
        ],
        { duration: ms, fill: "both" }
      );
      animation.onfinish = () => land(key);
      state.run.pending.set(key, { animation, target });
    }
    window.requestAnimationFrame(watchRings);
  }

  // Each frame: show whatever is under the pointer, and tick as segments pass it.
  const lastIndex = {};

  function watchRings() {
    if (!state.run) return;
    const keys = [...state.run.pending.keys()];
    const ticker = keys[keys.length - 1];
    for (const key of keys) {
      const ring = rings[key];
      const matrix = new DOMMatrixReadOnly(getComputedStyle(ring.node).transform);
      const angle = (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI;
      const index = Math.floor((((-angle % 360) + 360) % 360) / ring.seg) % ring.items.length;
      if (index !== lastIndex[key]) {
        lastIndex[key] = index;
        values[key].textContent = ring.items[index];
        if (key === ticker) tick();
      }
    }
    window.requestAnimationFrame(watchRings);
  }

  function tick() {
    blip(1500, 0.018, 0.012);
    pointer.animate(
      [{ transform: "translateX(-50%) rotate(-14deg)" }, { transform: "translateX(-50%) rotate(0deg)" }],
      { duration: 90, easing: "ease-out" }
    );
  }

  function land(key) {
    const { animation, target } = state.run.pending.get(key);
    state.run.pending.delete(key);
    setAngle(key, target);
    animation.cancel();
    values[key].textContent = state.run.next[key];
    markHit(key);
    stamp(shells[key]);
    blip(170, 0.07, 0.05);
    if (!state.run.pending.size) commit(state.run.next);
  }

  function stamp(node) {
    if (prefersReducedMotion()) return;
    node.animate(
      [{ transform: "scale(1.18) rotate(-2.5deg)", opacity: 0.2 }, { transform: "none", opacity: 1 }],
      { duration: 240, easing: "cubic-bezier(0.2, 1.4, 0.4, 1)" }
    );
  }

  // Lands every ring now. Stop calls it, and so does any other action during a
  // spin, so she can never act on an idea she can't see yet.
  function settle() {
    if (!state.run) return;
    [...state.run.pending.keys()].forEach(land);
  }

  function commit(next) {
    if (state.current) {
      state.history = [state.current, ...state.history].slice(0, HISTORY_LIMIT);
    }
    state.current = next;
    state.run = null;
    spinButton.textContent = "Spin";
    spinButton.classList.remove("is-spinning");
    el("result").removeAttribute("aria-busy");
    if (navigator.vibrate) navigator.vibrate(12);
    render();
    announce(spoken(next));
  }

  // Undo and restore turn the rings the short way back to the idea.
  function turnRingsToCurrent() {
    for (const key of KEYS) {
      const ring = rings[key];
      const rest = restAngle(ring, state.current[key]);
      const delta = ((((rest - ring.angle) % 360) + 540) % 360) - 180;
      const from = ring.angle;
      setAngle(key, from + delta);
      if (!prefersReducedMotion() && Math.abs(delta) > 0.01) {
        ring.node.animate(
          [{ transform: `rotate(${from}deg)` }, { transform: `rotate(${from + delta}deg)` }],
          { duration: 420, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
        );
      }
    }
  }

  /* ---------- Actions ---------- */

  function toggleLock(key) {
    settle();
    if (!state.current) {
      toast("Spin first, then lock what you like.");
      return;
    }
    state.locked[key] = !state.locked[key];
    const name = key[0].toUpperCase() + key.slice(1);
    toast(state.locked[key] ? `${name} locked` : `${name} unlocked`);
    render();
  }

  function undo() {
    settle();
    if (!state.history.length) {
      toast("Nothing to undo yet.");
      return;
    }
    state.current = state.history.shift();
    turnRingsToCurrent();
    render();
    toast("Went back one spin");
    announce(spoken(state.current));
  }

  // Swaps instead of discarding, so restoring an old spin never loses the current one.
  function restore(index) {
    settle();
    const [chosen] = state.history.splice(index, 1);
    state.history.unshift(state.current);
    state.current = chosen;
    turnRingsToCurrent();
    render();
    toast("Spin restored");
    announce(spoken(chosen));
    spinButton.focus({ preventScroll: true });
  }

  function save() {
    settle();
    if (!state.current) {
      toast("Spin first, then save the idea.");
      return;
    }
    if (isFavorite(state.current)) {
      toast("Already in favorites");
      return;
    }
    state.favorites.unshift({ ...state.current });
    const stored = storeFavorites();
    render();
    swatchBurst(saveButton);
    toast(stored ? "Saved to favorites" : "Saved for now. This browser is blocking storage.");
  }

  // A small handful of fabric swatches: the reward for keeping an idea.
  function swatchBurst(origin) {
    if (prefersReducedMotion()) return;
    const box = origin.getBoundingClientRect();
    for (let i = 0; i < 14; i += 1) {
      const swatch = document.createElement("span");
      swatch.className = `swatch swatch--${i % 3}`;
      swatch.style.left = `${box.left + box.width / 2}px`;
      swatch.style.top = `${box.top + box.height / 2}px`;
      document.body.append(swatch);
      const angle = Math.random() * Math.PI * 2;
      const reach = 50 + Math.random() * 90;
      swatch.animate(
        [
          { transform: "translate(-50%, -50%) rotate(0deg)", opacity: 1 },
          {
            transform: `translate(${Math.cos(angle) * reach}px, ${Math.sin(angle) * reach + 40}px) rotate(${Math.random() * 300}deg)`,
            opacity: 0,
          },
        ],
        { duration: 650 + Math.random() * 250, easing: "cubic-bezier(0.15, 0.7, 0.3, 1)" }
      ).onfinish = () => swatch.remove();
    }
  }

  function removeFavorite(index) {
    const [removed] = state.favorites.splice(index, 1);
    storeFavorites();
    render();

    // Focus would otherwise fall to the top of the page.
    const buttons = el("favorites").querySelectorAll("button");
    const neighbour = buttons[Math.min(index, buttons.length - 1)];
    (neighbour || el("favorites-heading")).focus();

    toast("Removed from favorites", {
      action: () => {
        state.favorites.splice(Math.min(index, state.favorites.length), 0, removed);
        storeFavorites();
        render();
        toast("Favorite restored");
      },
    });
  }

  async function copyIdea() {
    settle();
    if (!state.current) {
      toast("Spin first, then copy the idea.");
      return;
    }
    toast((await copyText(ideaAsText(state.current))) ? "Idea copied" : "Couldn't copy. Try selecting the text.");
  }

  async function copyAll() {
    if (!state.favorites.length) {
      toast("No favorites to copy yet.");
      return;
    }
    const text = state.favorites.map(ideaAsText).join("\n\n");
    const count = state.favorites.length;
    const ok = await copyText(text);
    toast(ok ? `Copied ${count} ${count === 1 ? "favorite" : "favorites"}` : "Couldn't copy. Try selecting the text.");
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (error) { /* fall through to the older method */ }

    const active = document.activeElement;
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.className = "visually-hidden";
    document.body.append(area);
    area.select();
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch (error) { /* reported by the caller's toast */ }
    area.remove();
    if (active) active.focus({ preventScroll: true });
    return copied;
  }

  function setNiche(niche) {
    state.niche = niche;
    dimTopics();
    const topic = state.current && state.current.topic;
    if (state.locked.topic && !topicsInNiche().includes(topic)) {
      toast(`${niche} selected. Your locked topic stays until you unlock it.`);
    } else {
      toast(niche === "All" ? "Spinning all niches" : `Spinning ${niche} ideas`);
    }
  }

  function remember(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) { /* still applies for this visit */ }
  }

  function toggleContrast() {
    const on = document.documentElement.dataset.contrast !== "high";
    if (on) document.documentElement.dataset.contrast = "high";
    else delete document.documentElement.dataset.contrast;
    contrastButton.setAttribute("aria-pressed", String(on));
    remember(CONTRAST_KEY, on ? "1" : "0");
    toast(on ? "High contrast on" : "High contrast off");
  }

  function toggleSound() {
    state.sound = !state.sound;
    soundButton.setAttribute("aria-pressed", String(state.sound));
    remember(SOUND_KEY, state.sound ? "1" : "0");
    toast(state.sound ? "Sound on" : "Sound off");
  }

  function spinFromStory() {
    el("top").scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
    spinButton.focus({ preventScroll: true });
    spin();
  }

  /* ---------- Favorites storage ---------- */

  const isFavorite = (idea) => state.favorites.some((item) => sameIdea(item, idea));

  function loadFavorites() {
    try {
      const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY));
      if (Array.isArray(saved)) {
        state.favorites = saved.filter((item) => item && KEYS.every((key) => typeof item[key] === "string"));
      }
    } catch (error) {
      state.favorites = [];
    }
  }

  function storeFavorites() {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(state.favorites));
      return true;
    } catch (error) {
      return false;
    }
  }

  /* ---------- Rendering ---------- */

  function ideaLines(idea) {
    const title = document.createElement("span");
    title.className = "idea-title";
    title.textContent = `${idea.format}, ${idea.topic}`;
    const hook = document.createElement("span");
    hook.className = "idea-hook";
    hook.textContent = idea.hook;
    return [title, hook];
  }

  function render() {
    const hasIdea = Boolean(state.current);

    for (const key of KEYS) {
      values[key].textContent = hasIdea ? state.current[key] : IDLE_TEXT[key];
      shells[key].classList.toggle("is-empty", !hasIdea);
      locks[key].setAttribute("aria-pressed", String(state.locked[key]));
      locks[key].setAttribute("aria-disabled", String(!hasIdea));
      if (rings[key]) {
        rings[key].node.classList.toggle("is-held", state.locked[key]);
        markHit(key);
      }
    }

    saveButton.textContent = hasIdea && isFavorite(state.current) ? "Saved" : "Save";
    saveButton.setAttribute("aria-disabled", String(!hasIdea));
    copyButton.setAttribute("aria-disabled", String(!hasIdea));
    undoButton.setAttribute("aria-disabled", String(!state.history.length));
    copyAllButton.setAttribute("aria-disabled", String(!state.favorites.length));

    el("favorites-count").textContent = state.favorites.length;
    el("favorites-empty").hidden = state.favorites.length > 0;
    el("favorites").replaceChildren(...state.favorites.map((idea, index) => {
      const item = document.createElement("li");
      item.className = "favorite";
      const text = document.createElement("p");
      text.append(...ideaLines(idea));
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "btn btn--small";
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", `Remove ${idea.format}, ${idea.topic}`);
      remove.addEventListener("click", () => removeFavorite(index));
      item.append(text, remove);
      return item;
    }));

    el("recent-empty").hidden = state.history.length > 0;
    el("recent").replaceChildren(...state.history.map((idea, index) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "recent-item";
      const prefix = document.createElement("span");
      prefix.className = "visually-hidden";
      prefix.textContent = "Restore ";
      button.append(prefix, ...ideaLines(idea));
      button.addEventListener("click", () => restore(index));
      item.append(button);
      return item;
    }));
  }

  function renderChips() {
    const chips = el("chips");
    ["All", ...DATA.niches].forEach((niche) => {
      const label = document.createElement("label");
      label.className = "chip";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "niche";
      input.value = niche;
      input.checked = niche === state.niche;
      input.addEventListener("change", () => setNiche(niche));
      const text = document.createElement("span");
      text.textContent = niche;
      label.append(input, text);
      chips.append(label);
    });
  }

  function renderTicker() {
    const hooks = Object.values(DATA.hooks).flat();
    const run = () => {
      const line = document.createElement("span");
      line.textContent = `${hooks.join("  /  ")}  /  `;
      return line;
    };
    el("ticker").append(run(), run());
  }

  /* ---------- Feedback ---------- */

  function announce(message) {
    announcer.textContent = "";
    // A short gap makes screen readers treat a repeated message as new.
    window.setTimeout(() => { announcer.textContent = message; }, 60);
  }

  let toastTimer = 0;
  let toastDuration = 0;
  let toastHandler = null;

  function toast(message, options = {}) {
    toastHandler = options.action || null;
    toastText.textContent = message;
    toastAction.hidden = !toastHandler;
    toastDuration = toastHandler ? 6000 : 2600;
    toastBox.classList.add("is-visible");
    armToast();
  }

  function armToast() {
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(hideToast, toastDuration);
  }

  function hideToast() {
    window.clearTimeout(toastTimer);
    if (toastBox.contains(document.activeElement)) spinButton.focus({ preventScroll: true });
    toastBox.classList.remove("is-visible");
    toastText.textContent = "";
    toastAction.hidden = true;
    toastHandler = null;
  }

  /* ---------- Input ---------- */

  const wheelInView = () => {
    const box = spinButton.getBoundingClientRect();
    return box.bottom > 0 && box.top < window.innerHeight;
  };

  function handleKeydown(event) {
    if (event.key !== " " && event.key !== "Enter") return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    const target = event.target;
    const isSpinButton = target === spinButton;
    // Focused controls keep their own Space and Enter. A checked radio has no
    // use for them, so the chips can spin straight after choosing a filter.
    const ownsKey = target.closest("button, a, select, textarea, input:not([type='radio'])");

    // Down in the story, Space keeps its usual job of scrolling the page.
    if (!ownsKey && !wheelInView()) return;

    if (event.repeat) {
      // Holding the key must not start spin after spin.
      if (isSpinButton || !ownsKey) event.preventDefault();
      return;
    }
    if (ownsKey) return;

    event.preventDefault();
    spin();
  }

  // Clicking a control with a mouse leaves it focused, so the next Space would
  // press that control again instead of spinning. Keyboard focus is untouched.
  function releaseMouseFocus(event) {
    if (event.pointerType === "mouse" && event.target.closest("button")) {
      document.activeElement.blur();
    }
  }

  function dataIsValid() {
    return Boolean(
      DATA &&
      Array.isArray(DATA.niches) &&
      Array.isArray(DATA.formats) && DATA.formats.length &&
      Array.isArray(DATA.topics) && DATA.topics.length &&
      DATA.topics.every((topic) => topic.name && Array.isArray(topic.niches)) &&
      DATA.hooks && Array.isArray(DATA.hooks.Any) && DATA.hooks.Any.length
    );
  }

  function init() {
    contrastButton.setAttribute("aria-pressed", String(document.documentElement.dataset.contrast === "high"));
    try {
      state.sound = localStorage.getItem(SOUND_KEY) !== "0";
    } catch (error) { /* default stays on */ }
    soundButton.setAttribute("aria-pressed", String(state.sound));

    if (dataIsValid()) {
      renderChips();
      buildWheel();
      renderTicker();
    } else {
      const error = el("data-error");
      error.textContent = "The ideas in data.js couldn't be read. Check it for a missing quote or comma, then refresh.";
      error.hidden = false;
    }

    loadFavorites();
    render();

    spinButton.addEventListener("click", spin);
    saveButton.addEventListener("click", save);
    copyButton.addEventListener("click", copyIdea);
    undoButton.addEventListener("click", undo);
    copyAllButton.addEventListener("click", copyAll);
    contrastButton.addEventListener("click", toggleContrast);
    soundButton.addEventListener("click", toggleSound);
    el("story-spin").addEventListener("click", spinFromStory);
    KEYS.forEach((key) => locks[key].addEventListener("click", () => toggleLock(key)));

    toastAction.addEventListener("click", () => {
      if (toastHandler) toastHandler();
    });
    // The toast waits while she is reaching for its Undo button.
    toastBox.addEventListener("mouseenter", () => window.clearTimeout(toastTimer));
    toastBox.addEventListener("mouseleave", armToast);
    toastBox.addEventListener("focusin", () => window.clearTimeout(toastTimer));
    toastBox.addEventListener("focusout", armToast);

    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("click", releaseMouseFocus);
  }

  init();
})();
