(function () {
  "use strict";

  const team = window.GENESIS_TEAM || [];
  const grid = document.querySelector("[data-team-grid]");

  if (!grid) return;

  grid.innerHTML = team
    .map(
      (member, index) => `
        <a class="person-card reveal" href="team-member.html?member=${encodeURIComponent(member.slug)}" style="--delay:${index * 45}ms" aria-label="Meet ${member.name}">
          <img src="${member.image}" alt="${member.name}, ${member.role} at Genesis Educates" loading="${index < 4 ? "eager" : "lazy"}">
          <span class="person-card__shade"></span>
          <span class="person-card__info">
            <strong>${member.name}</strong>
            <small>${member.role}</small>
          </span>
          <span class="person-card__arrow" aria-hidden="true">↗</span>
        </a>`
    )
    .join("");

  const observer = new IntersectionObserver(
    (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("is-visible")),
    { threshold: 0.12 }
  );
  document.querySelectorAll(".reveal").forEach((item) => observer.observe(item));
})();
