function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
}
 
function hexToRgbString(hex) {
  const { r, g, b } = hexToRgb(hex);
  return `${r}, ${g}, ${b}`;
}
 
// Picks readable ink (dark or light) for text sitting on a given paper color
function contrastInk(hex) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.58 ? "#2C2A2A" : "#FFF0F0";
}
 
const FALLBACK_TINT = "#FFA67A";
 
function initials(name = "") {
  return name
    .replace(/[(),]/g, " ")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}
 
function cvIconSvg() {
  return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 1.5v9M8 10.5 4.8 7.3M8 10.5l3.2-3.2"/>
    <path d="M2 12v1.5A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5V12"/>
  </svg>`;
}
 
/* ---------------------------------------------------------------------- */
/* Theme — light/dark toggle, persisted in localStorage                    */
/* ---------------------------------------------------------------------- */
 
const THEME_KEY = "ingenium-theme";
 
const SUN_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="4.2"/>
  <path d="M12 2.5v2.4M12 19.1v2.4M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7"/>
</svg>`;
 
const MOON_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z"/>
</svg>`;
 
function getPreferredTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch (err) {
    console.warn("localStorage unavailable, falling back to system preference", err);
  }
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}
 
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const toggle = document.getElementById("theme-toggle");
  if (toggle) {
    toggle.innerHTML = theme === "light" ? MOON_ICON : SUN_ICON;
    toggle.setAttribute(
      "aria-label",
      theme === "light" ? "Switch to dark mode" : "Switch to light mode"
    );
  }
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (err) {
    console.warn("Could not save theme preference to localStorage", err);
  }
}
 
function setupTheme() {
  applyTheme(getPreferredTheme());
  const toggle = document.getElementById("theme-toggle");
  if (!toggle) return;
  toggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    applyTheme(current === "light" ? "dark" : "light");
  });
}
 
/* ---------------------------------------------------------------------- */
/* Ambient background parallax — subtle cursor-follow interactivity        */
/* ---------------------------------------------------------------------- */
 
function setupParallax() {
  const ambient = document.querySelector(".ambient");
  if (!ambient) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
 
  let ticking = false;
  let targetX = 0;
  let targetY = 0;
 
  function apply() {
    ambient.style.transform = `translate(${targetX}px, ${targetY}px)`;
    ticking = false;
  }
 
  function onPointerMove(e) {
    const x = (e.clientX / window.innerWidth - 0.5) * 2; // -1..1
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    targetX = x * 22;
    targetY = y * 22;
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(apply);
    }
  }
 
  window.addEventListener("pointermove", onPointerMove, { passive: true });
}
 
const state = {
  activeIndex: 0,
  cards: [],
  dots: [],
  dragging: false,
  dragStartX: 0,
  dragDelta: 0,
};
 
document.addEventListener("DOMContentLoaded", init);
 
async function init() {
  setupTheme();
  setupParallax();
  try {
    const data = await fetch("data.json").then((res) => {
      if (!res.ok) throw new Error("data.json not found (status " + res.status + ")");
      return res.json();
    });
 
    if (data.site && data.site.title) document.title = data.site.title;
    populateAbout(data.about);
    populateMembers(data.members || []);
    populateAlbums(data.albums);
    populateContacts(data.contacts, data.members || []);
    setupCarousel();
    setupNavHighlighting();
  } catch (err) {
    console.error(err);
    const aboutText = document.getElementById("about-text");
    if (aboutText) {
      aboutText.textContent =
        "Couldn't load data.json — if you opened this file directly, run it through a local server instead.";
    }
  }
}
 
/* ---------------------------------------------------------------------- */
/* About                                                                   */
/* ---------------------------------------------------------------------- */
 
function populateAbout(about = {}) {
  const el = document.getElementById("about-text");
  if (el) el.textContent = about.text || "";
}
 
/* ---------------------------------------------------------------------- */
/* Members — augment the existing .carousel-card markup                   */
/* ---------------------------------------------------------------------- */
 
function populateMembers(members) {
  const cards = document.querySelectorAll(".carousel-card");
 
  cards.forEach((card, i) => {
    const nameEl = card.querySelector("h3");
    const name = nameEl ? nameEl.textContent.trim() : "";
    const info = members.find((m) => m.name === name) || {};
    const tint = info.color || FALLBACK_TINT;
    card.style.setProperty("--tint", tint);
    card.style.setProperty("--tint-rgb", hexToRgbString(tint));
    card.style.setProperty("--paper-ink", contrastInk(tint));
 
    if (info.fullName && nameEl) nameEl.textContent = info.fullName;
 
    // Avatar — real photo if provided, otherwise initials
    const avatar = document.createElement(info.photo ? "img" : "div");
    avatar.className = "card-avatar";
    if (info.photo) {
      avatar.src = info.photo;
      avatar.alt = info.fullName || name;
      avatar.onerror = () => {
        const fallback = document.createElement("div");
        fallback.className = "card-avatar";
        fallback.textContent = initials(info.fullName || name);
        avatar.replaceWith(fallback);
      };
    } else {
      avatar.textContent = initials(info.fullName || name);
    }
 
    const avatarWrap = document.createElement("div");
    avatarWrap.className = "card-avatar-wrap";
    avatarWrap.appendChild(avatar);
    card.insertBefore(avatarWrap, card.firstChild);
 
    if (info.role) {
      const role = document.createElement("p");
      role.className = "card-role";
      role.textContent = info.role;
      card.appendChild(role);
    }
 
    if (info.tagline) {
      const tagline = document.createElement("p");
      tagline.className = "card-tagline";
      tagline.textContent = info.tagline;
      card.appendChild(tagline);
    }
 
    // Download CV button
    const cvBtn = document.createElement("a");
    cvBtn.className = "card-cv";
    cvBtn.innerHTML = `${cvIconSvg()}<span>${info.cvUrl ? "Download CV" : "CV coming soon"}</span>`;
    if (info.cvUrl) {
      cvBtn.href = info.cvUrl;
      cvBtn.setAttribute("download", "");
      cvBtn.addEventListener("click", (e) => e.stopPropagation());
    } else {
      cvBtn.href = "#";
      cvBtn.classList.add("is-disabled");
      cvBtn.setAttribute("aria-disabled", "true");
      cvBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    }
    card.appendChild(cvBtn);
 
    if (info.link) {
      card.style.cursor = "pointer";
      card.addEventListener("click", () => {
        if (i === state.activeIndex) window.location.href = info.link;
      });
    }
  });
}
 
/* ---------------------------------------------------------------------- */
/* Albums                                                                  */
/* ---------------------------------------------------------------------- */
 
function populateAlbums(albums = {}) {
  const section = document.getElementById("albums");
  if (!section) return;
 
  if (albums.intro) {
    const intro = document.createElement("p");
    intro.id = "albums-intro";
    intro.textContent = albums.intro;
    section.querySelector("h2").insertAdjacentElement("afterend", intro);
  }
 
  const grid = document.createElement("div");
  grid.className = "albums-grid";
  const items = albums.items && albums.items.length ? albums.items : Array(4).fill(null);
  items.forEach((item, i) => {
    const cell = document.createElement("div");
    cell.className = "album-placeholder";
    cell.textContent = item ? item.title : `Album ${i + 1} — coming soon`;
    grid.appendChild(cell);
  });
  section.appendChild(grid);
}
 
/* ---------------------------------------------------------------------- */
/* Contacts                                                                 */
/* ---------------------------------------------------------------------- */
 
function populateContacts(contacts = [], members = []) {
  const section = document.getElementById("contacts");
  if (!section) return;
 
  const list = Array.isArray(contacts) ? contacts : [contacts];
 
  const grid = document.createElement("div");
  grid.className = "contacts-grid";
 
  list.forEach((entry) => {
    const card = document.createElement("div");
    card.className = "contacts-card";
 
    // Tint the card if this entry's name matches a member (the studio
    // card won't match anything, so it stays neutral paper by default)
    const match = members.find((m) => m.fullName === entry.name);
    if (match && match.color) {
      const tint = match.color;
      card.classList.add("is-tinted");
      card.style.setProperty("--tint", tint);
      card.style.setProperty("--tint-rgb", hexToRgbString(tint));
      card.style.setProperty("--paper-ink", contrastInk(tint));
    }
 
    if (entry.name) {
      const name = document.createElement("h3");
      name.className = "contact-card-name";
      name.textContent = entry.name;
      card.appendChild(name);
    }
 
    if (entry.role) {
      const role = document.createElement("p");
      role.className = "contact-card-role";
      role.textContent = entry.role;
      card.appendChild(role);
    }
 
    if (entry.intro) {
      const intro = document.createElement("p");
      intro.className = "contacts-intro";
      intro.textContent = entry.intro;
      card.appendChild(intro);
    }
 
    if (entry.email) {
      const email = document.createElement("a");
      email.className = "contact-email";
      email.href = `mailto:${entry.email}`;
      email.textContent = entry.email;
      card.appendChild(email);
    }
 
    if (entry.socials && entry.socials.length) {
      const socialList = document.createElement("ul");
      socialList.className = "contact-socials";
      entry.socials.forEach((s) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = s.url;
        a.textContent = s.label;
        li.appendChild(a);
        socialList.appendChild(li);
      });
      card.appendChild(socialList);
    }
 
    grid.appendChild(card);
  });
 
  section.appendChild(grid);
}
 
/* ---------------------------------------------------------------------- */
/* Carousel — glass coverflow                                              */
/* ---------------------------------------------------------------------- */
 
function setupCarousel() {
  const track = document.querySelector(".carousel-track");
  const dotsWrap = document.querySelector(".carousel-dots");
  if (!track || !dotsWrap) return;
 
  state.cards = Array.from(track.querySelectorAll(".carousel-card"));
  const total = state.cards.length;
 
  // Prev / next buttons
  const controls = document.createElement("div");
  controls.className = "carousel-controls";
 
  const prevBtn = makeNavButton("prev", "Previous member",
    '<path d="M15 18l-6-6 6-6"/>');
  const nextBtn = makeNavButton("next", "Next member",
    '<path d="M9 18l6-6-6-6"/>');
 
  controls.appendChild(prevBtn);
  const dotsMount = document.createElement("div");
  dotsMount.className = "carousel-dots";
  controls.appendChild(dotsMount);
  controls.appendChild(nextBtn);
 
  dotsWrap.replaceWith(controls);
 
  state.dots = state.cards.map((_, i) => {
    const dot = document.createElement("button");
    dot.className = "dot";
    dot.setAttribute("aria-label", `Go to member ${i + 1}`);
    dot.addEventListener("click", () => goTo(i));
    dotsMount.appendChild(dot);
    return dot;
  });
 
  prevBtn.addEventListener("click", () => goTo(state.activeIndex - 1));
  nextBtn.addEventListener("click", () => goTo(state.activeIndex + 1));
 
  document.addEventListener("keydown", (e) => {
    if (!isInMembersView()) return;
    if (e.key === "ArrowLeft") goTo(state.activeIndex - 1);
    if (e.key === "ArrowRight") goTo(state.activeIndex + 1);
  });
 
  track.addEventListener("pointerdown", (e) => {
    state.dragging = true;
    state.dragStartX = e.clientX;
    state.dragDelta = 0;
  });
  track.addEventListener("pointermove", (e) => {
    if (!state.dragging) return;
    state.dragDelta = e.clientX - state.dragStartX;
  });
  window.addEventListener("pointerup", () => {
    if (!state.dragging) return;
    state.dragging = false;
    const threshold = 50;
    if (state.dragDelta > threshold) goTo(state.activeIndex - 1);
    else if (state.dragDelta < -threshold) goTo(state.activeIndex + 1);
    state.dragDelta = 0;
  });
 
  state.total = total;
  updateCarousel();
}
 
function makeNavButton(dir, label, iconPath) {
  const btn = document.createElement("button");
  btn.className = "nav-btn";
  btn.dataset.dir = dir;
  btn.setAttribute("aria-label", label);
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconPath}</svg>`;
  return btn;
}
 
function goTo(index) {
  const total = state.total;
  state.activeIndex = ((index % total) + total) % total;
  updateCarousel();
}
 
function updateCarousel() {
  const total = state.total;
  state.cards.forEach((card, i) => {
    let offset = i - state.activeIndex;
    if (offset > total / 2) offset -= total;
    if (offset < -total / 2) offset += total;
 
    const abs = Math.abs(offset);
    const isActive = offset === 0;
    card.classList.toggle("is-active", isActive);
 
    if (abs > 2) {
      card.style.opacity = "0";
      card.style.pointerEvents = "none";
      return;
    }
 
    const x = offset * 60;
    const scale = 1 - abs * 0.16;
    const rotate = offset * -10;
    const z = -abs * 120;
    const blur = abs === 0 ? 0 : 1.5 * abs;
    const opacity = abs === 0 ? 1 : abs === 1 ? 0.65 : 0.35;
 
    card.style.opacity = String(opacity);
    card.style.pointerEvents = isActive ? "auto" : "none";
    card.style.zIndex = String(10 - abs);
    card.style.filter = blur ? `blur(${blur}px)` : "none";
    card.style.transform =
      `translate(-50%, -50%) translateX(${x}%) translateZ(${z}px) rotateY(${rotate}deg) scale(${scale})`;
    card.style.position = "absolute";
    card.style.left = "50%";
    card.style.top = "50%";
  });
 
  state.dots.forEach((dot, i) => dot.classList.toggle("is-active", i === state.activeIndex));
}
 
function isInMembersView() {
  const section = document.getElementById("members");
  if (!section) return false;
  const rect = section.getBoundingClientRect();
  return rect.top < window.innerHeight * 0.6 && rect.bottom > window.innerHeight * 0.4;
}
 
/* ---------------------------------------------------------------------- */
/* Nav active-state highlighting on scroll                                 */
/* ---------------------------------------------------------------------- */
 
function setupNavHighlighting() {
  const links = Array.from(document.querySelectorAll(".navigation-items"));
  const sections = links
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);
 
  if (!("IntersectionObserver" in window) || sections.length === 0) return;
 
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = `#${entry.target.id}`;
        links.forEach((link) => {
          link.classList.toggle("is-active", link.getAttribute("href") === id);
        });
      });
    },
    { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
  );
 
  sections.forEach((section) => observer.observe(section));
}