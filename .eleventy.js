module.exports = function(eleventyConfig) {
    // 1. Passthrough Copy: Copy static assets directly to the output folder (_site)
    // These files are not processed by Eleventy's templating engine.
    eleventyConfig.addPassthroughCopy("style.css");
    eleventyConfig.addPassthroughCopy("news.css");
    eleventyConfig.addPassthroughCopy("news.js");
    eleventyConfig.addPassthroughCopy("places.css");
    eleventyConfig.addPassthroughCopy("places.js");
    eleventyConfig.addPassthroughCopy("script.js"); // Your global script.js
    eleventyConfig.addPassthroughCopy("assets"); // For any images or other assets you might have
    eleventyConfig.addPassthroughCopy("admin"); // Essential for Netlify CMS admin interface

    // 2. Configure Eleventy's directories and template engines
    return {
        // Input directory: Where Eleventy looks for source files.
        // "." means the root of your project.
        dir: {
            input: "./",
            // Output directory: Where Eleventy builds the final static site.
            // This is the folder you'll deploy to GitHub Pages (or Netlify).
            output: "_site",
            // Includes directory: Where layouts and partials (like base.html) are stored.
            includes: "_includes",
            // Data directory: Where global data files (like _data/site.json) are stored.
            data: "_data"
        },
        // Template formats Eleventy should process.
        // "html" means it will process .html files as Nunjucks templates.
        // "njk" means it will process .njk files as Nunjucks templates.
        // "md" means it will process .md (Markdown) files.
        templateFormats: ["html", "njk", "md"],
        
        // Specify the template engine to use for Markdown files.
        // This allows you to use Nunjucks syntax (e.g., {% if %}, {{ variable }})
        // directly within your Markdown files if needed, before Markdown is rendered.
        markdownTemplateEngine: "njk",
        
        // Specify the template engine to use for HTML files.
        // This is crucial for your news/index.html and places/index.html to work as Nunjucks templates.
        htmlTemplateEngine: "njk",
        
        // Specify the template engine for data files (if you use .js data files that need templating).
        dataTemplateEngine: "njk"
    };
};
