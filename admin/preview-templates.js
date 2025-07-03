import CMS from "netlify-cms-app";

// Create a custom preview component for News
const NewsPreview = ({ entry, widgetFor }) => {
  const title = entry.getIn(["data", "title"]);
  const preview = entry.getIn(["data", "preview"]);
  const image = entry.getIn(["data", "image"]);
  const id = entry.getIn(["data", "id"]) || "preview";
  const content = widgetFor("body");

  return `
    <article
      id="${id}"
      class="news-card preview-mode"
      data-id="${id}"
      data-title="${title}"
      data-preview="${preview}"
      data-content=""
      ${image ? `data-image="${image}"` : ""}
    >
      ${image ? `
        <div class="media-container">
          <button class="enlarge-btn" aria-label="Enlarge image">🔍</button>
          <img src="${image}" alt="${title}" loading="lazy"/>
        </div>
      ` : ""}

      <div class="news-content${!image ? " no-media" : ""}">
        <h4>${title}</h4>
        <p class="card-preview">${preview}</p>
        <div class="news-actions">
          <button class="read-more-btn">ਪੂਰਾ ਪੜ੍ਹੋ →</button>
          <button class="copy-link" title="Copy Link">🔗</button>
        </div>
        <div class="card-body">
          ${content}
        </div>
      </div>
    </article>
  `;
};

// Register the preview
CMS.registerPreviewTemplate("news", createPreviewComponent(NewsPreview));
CMS.registerPreviewStyle("/style.css");

// Optional: Do the same for places
const PlacesPreview = ({ entry, widgetFor }) => {
  const title = entry.getIn(["data", "title"]);
  const preview = entry.getIn(["data", "preview"]);
  const image = entry.getIn(["data", "image"]);
  const id = entry.getIn(["data", "id"]) || "preview";
  const content = widgetFor("body");

  return `
    <article
      id="${id}"
      class="news-card preview-mode"
      data-id="${id}"
      data-title="${title}"
      data-preview="${preview}"
      data-content=""
      ${image ? `data-image="${image}"` : ""}
    >
      ${image ? `
        <div class="media-container">
          <button class="enlarge-btn" aria-label="Enlarge image">🔍</button>
          <img src="${image}" alt="${title}" loading="lazy"/>
        </div>
      ` : ""}

      <div class="news-content${!image ? " no-media" : ""}">
        <h4>${title}</h4>
        <p class="card-preview">${preview}</p>
        <div class="news-actions">
          <button class="read-more-btn">ਵੇਰਵਾ →</button>
          <button class="copy-link" title="Copy Link">🔗</button>
        </div>
        <div class="card-body">
          ${content}
        </div>
      </div>
    </article>
  `;
};

CMS.registerPreviewTemplate("places", createPreviewComponent(PlacesPreview));
CMS.registerPreviewStyle("/style.css");

/**
 * Helper: Wrap string template in DOM node Netlify CMS expects
 */
function createPreviewComponent(templateFn) {
  return class {
    constructor({ entry, widgetFor }) {
      this.entry = entry;
      this.widgetFor = widgetFor;
    }

    render() {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = templateFn({
        entry: this.entry,
        widgetFor: this.widgetFor
      });
      return wrapper;
    }
  };
}
