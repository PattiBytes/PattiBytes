module.exports = function(eleventyConfig) {
    eleventyConfig.addPassthroughCopy("style.css");
    eleventyConfig.addPassthroughCopy("news.css");
    eleventyConfig.addPassthroughCopy("news.js");
    eleventyConfig.addPassthroughCopy("places.css");
    eleventyConfig.addPassthroughCopy("places.js");
    eleventyConfig.addPassthroughCopy("script.js");
    eleventyConfig.addPassthroughCopy("assets");
    eleventyConfig.addPassthroughCopy("admin");
    eleventyConfig.addPassthroughCopy("index.css"); // If you're using this file

    return {
        dir: {
            input: "./",
            output: "_site",
            includes: "_includes",
            data: "_data"
        },
        templateFormats: ["html", "njk", "md"],
        markdownTemplateEngine: "njk",
        htmlTemplateEngine: "njk", // THIS IS THE CRUCIAL LINE
        dataTemplateEngine: "njk"
    };
};
