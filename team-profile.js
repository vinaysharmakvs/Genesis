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

  const portrait = document.querySelector("[data-portrait]");
  if (portrait) {
    portrait.src = member.profileImage || member.image;
    portrait.alt = `${member.name} — Genesis Educates profile`;
  }

  const related = document.querySelector("[data-related]");
  if (related) {
    const currentIndex = team.indexOf(member);
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
