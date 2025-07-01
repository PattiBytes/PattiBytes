module.exports = function(eleventyConfig) {
  // Pass through static assets like CSS, JS, images
  eleventyConfig.addPassthroughCopy("style.css");
  eleventyConfig.addPassthroughCopy("news.css");
  eleventyConfig.addPassthroughCopy("places.css");
  eleventyConfig.addPassthroughCopy("script.js");
  eleventyConfig.addPassthroughCopy("news.js");
  eleventyConfig.addPassthroughCopy("places.js");
  eleventyConfig.addPassthroughCopy("assets"); // For your image uploads

  // Copy the admin folder for Netlify CMS
  eleventyConfig.addPassthroughCopy("admin");

  // Configure collections
  eleventyConfig.addCollection("news", function(collection) {
    return collection.getFilteredByGlob("./_news/*.md");
  });
  eleventyConfig.addCollection("places", function(collection) {
    return collection.getFilteredByGlob("./_places/*.md");
  });

  // You might need to adjust the input and output directories
  return {
    dir: {
      input: ".", // Eleventy will look for files in the root
      output: "_site", // Eleventy will build the site into this folder
    },
    markdownTemplateEngine: "njk", // Use Nunjucks for Markdown parsing, or 'md' if you prefer plain markdown
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk"
  };
};
