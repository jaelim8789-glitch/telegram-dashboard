export function fireConfetti(duration = 1200) {
  const colors = ["#ff6b6b", "#feca57", "#48dbfb", "#ff9ff3", "#54a0ff", "#5f27cd"];
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden";
  document.body.appendChild(container);

  const total = 60;
  for (let i = 0; i < total; i++) {
    const el = document.createElement("div");
    const color = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100;
    const delay = Math.random() * 0.5;
    const size = 6 + Math.random() * 6;
    const horizontal = (Math.random() - 0.5) * 200;
    el.style.cssText = `
      position:absolute;top:-10px;left:${left}%;width:${size}px;height:${size}px;
      background:${color};border-radius:${Math.random() > 0.5 ? "50%" : "2px"};
      animation:confetti-fall ${0.8 + Math.random() * 0.6}s ease-out ${delay}s forwards;
      transform:rotate(${Math.random() * 360}deg)
    `;
    el.innerHTML = `<style>
      @keyframes confetti-fall {
        to { transform: translateY(${window.innerHeight + 20}px) translateX(${horizontal}px) rotate(${Math.random() * 720}deg); opacity: 0; }
      }
    </style>`;
    container.appendChild(el);
  }
  setTimeout(() => container.remove(), duration);
}
