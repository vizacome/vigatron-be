// Source - https://stackoverflow.com/a/77784336
// Posted by Henry Bui
// Retrieved 2026-09-09, License - CC BY-SA 4.0

const { join } = require("path");

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer.
  cacheDirectory: join(__dirname, ".cache", "puppeteer"),
};
