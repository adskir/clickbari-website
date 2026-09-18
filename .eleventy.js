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
  // Works on both plain "coming soon" objects (item.category) and real
  // Eleventy content objects from collections.posts (item.data.category).
  eleventyConfig.addFilter("countByCategory", function (items, category) {
    if (!Array.isArray(items)) return 0;
    return items.filter((item) => (item.category ?? item.data?.category) === category).length;
  });

  // Future blog posts: every .md file inside src/posts/ becomes a real
  // article page once you're ready to publish it (see src/posts/README.md).
  eleventyConfig.addCollection("posts", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/posts/*.md").sort((a, b) => {
      return new Date(b.data.date) - new Date(a.data.date);
    });
  });

  // Italian long-form date for the visible byline on blog posts.
  eleventyConfig.addFilter("readableDateIt", function (dateObj) {
    const d = new Date(dateObj);
    if (isNaN(d)) return "";
    const months = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
    return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  });

  // ISO 8601 date for structured data (datePublished/dateModified).
  eleventyConfig.addFilter("isoDate", function (dateObj) {
    const d = new Date(dateObj);
    return isNaN(d) ? "" : d.toISOString();
  });

  eleventyConfig.addFilter("absoluteUrl", function (url) {
    return `https://www.clickbari.it${url || ""}`;
  });

  // JSON-LD Article schema for a blog post (SEO + AEO: gives search
  // engines and AI answer engines a machine-readable summary of the page).
  // Returns "" when required fields (e.g. date) are missing, so this is
  // safe to call from any page that happens to use this layout's markup.
  eleventyConfig.addFilter("articleJsonLd", function (data) {
    const d = new Date(data.date);
    if (!data.title || isNaN(d)) return "";
    const url = `https://www.clickbari.it${data.url}`;
    const iso = d.toISOString();
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": data.title,
      "description": data.excerpt,
      "datePublished": iso,
      "dateModified": iso,
      "inLanguage": "it-IT",
      "author": { "@type": "Organization", "name": "ClickBari", "url": "https://www.clickbari.it/chi-sono/" },
      "publisher": {
        "@type": "Organization",
        "name": "ClickBari",
        "logo": { "@type": "ImageObject", "url": "https://www.clickbari.it/logo-icon.png" },
      },
      "mainEntityOfPage": { "@type": "WebPage", "@id": url },
      "url": url,
    });
  });

  // JSON-LD FAQPage schema, built from a post's optional `faq` front-matter
  // list ([{q, a}, ...]). AEO: this is what lets assistants like Google AI
  // Overviews, Perplexity or ChatGPT quote a direct answer from the page.
  eleventyConfig.addFilter("faqJsonLd", function (faq) {
    if (!Array.isArray(faq) || faq.length === 0) return "";
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faq.map((item) => ({
        "@type": "Question",
        "name": item.q,
        "acceptedAnswer": { "@type": "Answer", "text": item.a },
      })),
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
