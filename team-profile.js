(function () {
  "use strict";

  const team = window.GENESIS_TEAM || [];
  const slug = new URLSearchParams(window.location.search).get("member") || "sahil-khanna";
  const member = team.find((item) => item.slug === slug) || team[0];
  if (!member) return;

  document.title = `${member.name} | Genesis Educates`;
  document.querySelectorAll("[data-name]").forEach((el) => (el.textContent = member.name));
  document.querySelectorAll("[data-role]").forEach((el) => (el.textContent = member.role));
  document.querySelectorAll("[data-intro]").forEach((el) => (el.textContent = member.intro));
  document.querySelectorAll("[data-bio]").forEach((el) => (el.textContent = member.bio));
  document.querySelectorAll("[data-focus]").forEach((el) => (el.textContent = member.focus));
  document.querySelectorAll("[data-quote]").forEach((el) => (el.textContent = `“${member.quote}”`));
  const dots = document.querySelector("[data-dots]");
  if (dots) {
    dots.innerHTML = [0, 1, 2].map((dot) => `<span class="profile-dot${dot === 0 ? " is-active" : ""}" aria-hidden="true"></span>`).join("");
  }

  const currentIndex = team.indexOf(member);
  const previous = team[(currentIndex - 1 + team.length) % team.length];
  const next = team[(currentIndex + 1) % team.length];
  const previousLink = document.querySelector("[data-prev]");
  const nextLink = document.querySelector("[data-next]");
  if (previousLink) { previousLink.href = `team-member.html?member=${encodeURIComponent(previous.slug)}`; previousLink.setAttribute("aria-label", `Previous: ${previous.name}`); }
  if (nextLink) { nextLink.href = `team-member.html?member=${encodeURIComponent(next.slug)}`; nextLink.setAttribute("aria-label", `Next: ${next.name}`); }

  const portrait = document.querySelector("[data-portrait]");
  const stage = document.querySelector(".profile-stage");
  const revealProfile = () => {
    if (!stage) return;
    stage.classList.add("is-ready");
    stage.setAttribute("aria-busy", "false");
  };

  if (portrait) {
    portrait.addEventListener("load", revealProfile, { once: true });
    portrait.addEventListener("error", revealProfile, { once: true });
    portrait.src = member.image;
    portrait.alt = `${member.name} — Genesis Educates profile`;
    if (portrait.complete) revealProfile();
  } else {
    revealProfile();
  }

  const related = document.querySelector("[data-related]");
  if (related) {
    const suggestions = [1, 2, 3].map((step) => team[(currentIndex + step) % team.length]);
    related.innerHTML = suggestions
      .map(
        (person) => `
          <a class="related-card" href="team-member.html?member=${encodeURIComponent(person.slug)}">
            <img src="${person.image}" alt="${person.name}" loading="lazy">
            <span><strong>${person.name}</strong><small>${person.role}</small></span>
          </a>`
      )
      .join("");
  }
})();
