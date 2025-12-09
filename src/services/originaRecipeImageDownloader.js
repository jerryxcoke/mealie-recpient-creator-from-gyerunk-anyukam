(async () => {
  if (!window.html2canvas) {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
    document.head.appendChild(s);
    await new Promise(r => s.onload = r);
  }

  const elements = document.querySelectorAll("nutrition-recipe");
  if (!elements.length) throw new Error("Nincs nutrition-recipe elem");

  let i = 1;
  for (const el of elements) {
    const canvas = await html2canvas(el, {
      scale: window.devicePixelRatio,
      useCORS: true
    });

    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `nutrition-recipe-${i++}.png`;
    a.click();

    await new Promise(r => setTimeout(r, 300)); // böngésző letöltési limit miatt
  }
})();