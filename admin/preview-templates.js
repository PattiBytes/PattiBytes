// preview-templates.js

import CMS from "netlify-cms-app";

// News Preview Template
const NewsPreview = ({ entry, widgetFor }) => {
  const title = entry.getIn(["data", "title"]);
  const preview = entry.getIn(["data", "preview"]);
  const image = entry.getIn(["data", "image"]);
  const body = widgetFor("body");

  return `
    <article class="news-card">
      ${image ? `
        <div class="media-container">
          <button class="enlarge-btn" aria-label="Enlarge image">🔍</button>
          <img src="${image}" alt="${title}" />
        </div>
      ` : ""}
      <div class="news-content">
        <h4>${title}</h4>
        <p class="card-preview">${preview}</p>
        <div class="news-body">${body}</div>
      </div>
    </article>
  `;
};

// Places Preview Template
const PlacesPreview = ({ entry, widgetFor }) => {
  const title = entry.getIn(["data", "title"]);
  const preview = entry.getIn(["data", "preview"]);
  const image = entry.getIn(["data", "image"]);
  const body = widgetFor("body");

  return `
    <article class="news-card">
      ${image ? `
        <div class="media-container">
          <button class="enlarge-btn" aria-label="Enlarge image">🔍</button>
          <img src="${image}" alt="${title}" />
        </div>
      ` : ""}
      <div class="news-content">
        <h4>${title}</h4>
        <p class="card-preview">${preview}</p>
        <div class="news-body">${body}</div>
      </div>
    </article>
  `;
};

CMS.registerPreviewTemplate("news", ({ entry, widgetFor }) => {
  const container = document.createElement("div");
  container.innerHTML = NewsPreview({ entry, widgetFor });
  return container;
});

CMS.registerPreviewTemplate("places", ({ entry, widgetFor }) => {
  const container = document.createElement("div");
  container.innerHTML = PlacesPreview({ entry, widgetFor });
  return container;
});
