/**
 * Shared Head Manager
 * Dynamically injects common head elements (fonts, icons, meta tags) into all pages
 * This centralizes font and icon management in one place
 */

(function () {
  "use strict";

  // Common head elements configuration
  const headElements = {
    meta: [
      {
        httpEquiv: "Cache-Control",
        content: "no-cache, no-store, must-revalidate",
      },
      { httpEquiv: "Pragma", content: "no-cache" },
      { httpEquiv: "Expires", content: "0" },
    ],
    preconnects: [
      { href: "https://fonts.googleapis.com" },
      { href: "https://fonts.gstatic.com", crossorigin: true },
    ],
    fonts: [
      {
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
        rel: "stylesheet",
      },
    ],
    icons: [
      {
        rel: "icon",
        type: "image/x-icon",
        href: getFaviconPath("favicon.ico"),
      },
      {
        rel: "icon",
        type: "image/svg+xml",
        href: getFaviconPath("favicon.svg"),
      },
      { rel: "icon", type: "image/png", href: getFaviconPath("favicon.png") },
    ],
  };

  /**
   * Get the correct path for favicon based on current page location
   */
  function getFaviconPath(filename) {
    const path = window.location.pathname;
    const isRootPage =
      path === "/" || path.endsWith("/index.html") || !path.includes("/");
    return isRootPage ? `/${filename}` : `../${filename}`;
  }

  /**
   * Create and append meta tags
   */
  function addMetaTags() {
    headElements.meta.forEach((meta) => {
      // Check if meta tag already exists
      const existing = document.querySelector(
        `meta[http-equiv="${meta.httpEquiv}"]`
      );
      if (!existing) {
        const metaTag = document.createElement("meta");
        metaTag.httpEquiv = meta.httpEquiv;
        metaTag.content = meta.content;
        document.head.appendChild(metaTag);
      }
    });
  }

  /**
   * Add preconnect links for better font loading performance
   */
  function addPreconnects() {
    headElements.preconnects.forEach((preconnect) => {
      const existing = document.querySelector(
        `link[href="${preconnect.href}"]`
      );
      if (!existing) {
        const link = document.createElement("link");
        link.rel = "preconnect";
        link.href = preconnect.href;
        if (preconnect.crossorigin) {
          link.crossOrigin = "";
        }
        document.head.appendChild(link);
      }
    });
  }

  /**
   * Add font stylesheets
   */
  function addFonts() {
    headElements.fonts.forEach((font) => {
      const existing = document.querySelector(`link[href="${font.href}"]`);
      if (!existing) {
        const link = document.createElement("link");
        link.rel = font.rel;
        link.href = font.href;
        document.head.appendChild(link);
      }
    });
  }

  /**
   * Add favicon and icon links
   */
  function addIcons() {
    headElements.icons.forEach((icon) => {
      const existing = document.querySelector(`link[type="${icon.type}"]`);
      if (!existing) {
        const link = document.createElement("link");
        link.rel = icon.rel;
        link.type = icon.type;
        link.href = icon.href;
        document.head.appendChild(link);
      }
    });
  }

  /**
   * Initialize shared head elements
   */
  function init() {
    // Only run if not already initialized
    if (document.head.querySelector('[data-shared-head="true"]')) {
      return;
    }

    // Add marker to prevent duplicate initialization
    const marker = document.createElement("meta");
    marker.setAttribute("data-shared-head", "true");
    document.head.appendChild(marker);

    // Add all head elements
    addMetaTags();
    addPreconnects();
    addFonts();
    addIcons();

    console.log("Shared head elements initialized");
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose function for manual initialization if needed
  window.initSharedHead = init;
})();
