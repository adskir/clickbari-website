module.exports = function (eleventyConfig) {
  // Copy static assets as-is (images, favicons, sitemap) so relative
  // paths in the HTML (e.g. src="logo-icon.png") keep working unchanged.
  eleventyConfig.addPassthroughCopy("src/*.png");
  eleventyConfig.addPassthroughCopy("src/*.ico");
  eleventyConfig.addPassthroughCopy("src/*.webp");
  eleventyConfig.addPassthroughCopy("src/*.xml");
  eleventyConfig.addPassthroughCopy("src/admin");

  // Custom filter: counts items in an array whose `category` field matches.
  // (Nunjucks' built-in selectattr(...,"equalto",...) does not reliably
  // filter in this version, so we use a plain, predictable filter instead.)
  eleventyConfig.addFilter("countByCategory", function (items, category) {
    if (!Array.isArray(items)) return 0;
    return items.filter((item) => item.category === category).length;
  });

  // Future blog posts: every .md file inside src/posts/ becomes a real
  // article page once you're ready to publish it (see src/posts/README.md).
  eleventyConfig.addCollection("posts", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/posts/*.md").sort((a, b) => {
      return new Date(b.data.date) - new Date(a.data.date);
    });
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
    },
    // Keep clean .html output filenames (no /index.html folders) to match
    // the current live site's URLs exactly, e.g. /servizi.html stays /servizi.html.
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
};
