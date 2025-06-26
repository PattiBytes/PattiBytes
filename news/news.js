document.addEventListener("DOMContentLoaded", () => {
  // 1) Copy-link handler: builds /news.html#<id>
  document.querySelectorAll(".copy-link").forEach((btn) => {
    btn.addEventListener("click", async () => {
      console.log("🔗 Copy button clicked");
      const article = btn.closest("article.news-card");
      if (!article || !article.id) {
        console.error("No article or missing id");
        return;
      }

      // Hash-based URL
      const url = `${window.location.origin}${window.location.pathname}#${article.id}`;
      console.log("Copying URL:", url);

      try {
        // Try native API
        await navigator.clipboard.writeText(url);
      } catch (err) {
        console.warn("Clipboard API failed, using fallback", err);
        // Fallback using textarea+execCommand
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.top = 0;
        ta.style.left = 0;
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }

      // Visual feedback
      btn.classList.add("copied");
      btn.textContent = "✔️";
      setTimeout(() => {
        btn.classList.remove("copied");
        btn.textContent = "🔗";
      }, 1500);
    });
  });

  // 2) On-load: scroll & highlight if there's a hash
  const hash = window.location.hash.slice(1);
  if (hash) {
    const target = document.getElementById(hash);
    if (target) {
      setTimeout(() => {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        target.classList.add("highlighted");
        setTimeout(() => target.classList.remove("highlighted"), 2000);
      }, 300);
    }
  }
});
