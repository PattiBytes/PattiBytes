module.exports = function(eleventyConfig) {
    // Pass through static files like CSS, JS, images
    eleventyConfig.addPassthroughCopy("assets");
    eleventyConfig.addPassthroughCopy("style.css");
    eleventyConfig.addPassthroughCopy("script.js");
    eleventyConfig.addPassthroughCopy("news.css");
    eleventyConfig.addPassthroughCopy("news.js");
    eleventyConfig.addPassthroughCopy("places.css");
    eleventyConfig.addPassthroughCopy("places.js");
    eleventyConfig.addPassthroughCopy("_redirects"); // For Netlify redirects
    eleventyConfig.addPassthroughCopy(".nojekyll"); // For GitHub Pages

    // You generally don't need explicit collection definitions if you're using `tags`
    // Eleventy automatically creates `collections.news` for files with `tags: news`
    // and `collections.places` for files with `tags: places`.

    return {
        dir: {
            input: "./",      // Process files from the root directory
            output: "_site",  // Output to _site folder
            includes: "_includes", // Nunjucks includes (like base.html)
            data: "_data"     // Data files (if you use them)
        },
        templateFormats: ["html", "njk", "md"], // Add all formats you're using
        htmlTemplateEngine: "njk", // Use Nunjucks for HTML files
        markdownTemplateEngine: "njk" // Use Nunjucks for Markdown files
    };
};
