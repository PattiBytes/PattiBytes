// preview-templates.js

// Register News Preview Template
CMS.registerPreviewTemplate('news', function({ entry }) {
  const data = entry.get('data');

  // Extract fields safely
  const title = data.get('title') || '';
  const preview = data.get('preview') || '';
  const content = data.get('body') || '';
  const image = data.get('image');

  // Build the HTML preview
  const html = `
    <div style="padding:1rem; font-family: sans-serif;">
      <h2>${title}</h2>
      ${image ? `<img src="${image}" alt="${title}" style="max-width: 100%; margin: 1rem 0;" />` : ''}
      <p><strong>Preview:</strong> ${preview}</p>
      <div><strong>Full Content:</strong><br>${content}</div>
    </div>
  `;

  // Return as a string of HTML inside a div
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  return wrapper;
});
