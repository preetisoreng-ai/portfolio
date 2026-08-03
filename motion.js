/**
 * Scroll choreography for the portfolio: an entrance for whatever is on screen
 * when the page opens, the same entrance played backwards on the way out, and
 * hero parallax.
 *
 * Deliberately a classic script rather than part of the ES-module bundle. A
 * module is CORS-blocked over file://, so a page opened straight from disk got
 * no motion at all — the glass survived, because that is pure CSS, but nothing
 * ever moved. A classic script runs there exactly as it does over http, and
 * `prerender.tsx` inlines this file into every page so there is nothing to
 * fetch either.
 *
 * The hidden state hangs off `html.motion-ready`. If this script never runs,
 * nothing is ever hidden and the prerendered markup stands exactly as it is —
 * there is no way to strand content at opacity 0.
 */
(function () {
  /** Below this the design is scrolled far enough that parallax reads as jitter. */
  var PARALLAX_CLAMP = 1600;

  /**
   * How far into the viewport an element must come before it is let in, as a
   * fraction of viewport height. Holding the trigger back stops things
   * animating while still clipped by the bottom edge.
   */
  var TRIGGER_INSET = 0.12;

  /** If the entrance has not run by now, show everything and stop trying. */
  var FAILSAFE_MS = 3000;

  var root = document.documentElement;

  /**
   * Hide first, synchronously, while the head is still parsing.
   *
   * This has to happen before the first paint. The markup is prerendered, so
   * leaving it until DOMContentLoaded means the browser has already painted the
   * hero in its final position — and an element that is already where it
   * belongs cannot animate into place without first blinking out, which is
   * worse than no entrance at all. Hiding pre-paint means the visitor never
   * sees the settled state, and the entrance below is the first thing they get.
   */
  root.classList.add("motion-ready");

  var released = false;

  /** Last resort: never leave the page hidden because something went wrong. */
  function releaseAll() {
    released = true;
    var all = document.querySelectorAll("[data-reveal], .reveal");
    for (var i = 0; i < all.length; i++) all[i].classList.add("is-in");
  }
  setTimeout(function () {
    if (!released) releaseAll();
  }, FAILSAFE_MS);

  function start() {
    var els = [].slice.call(document.querySelectorAll("[data-reveal], .reveal"));

    /**
     * Re-test every target against the viewport and set `.is-in` accordingly.
     *
     * Bi-directional on purpose: elements that leave lose the class and settle
     * back to their hidden state, so scrolling up plays the same entrance in
     * reverse rather than leaving everything switched on behind you.
     *
     * A sweep rather than an IntersectionObserver. The observer only reports
     * elements whose intersection *changed*, and one large jump — End, or a
     * restored scroll offset — can carry the viewport clean over an element
     * between two frames without ever reporting it, leaving it invisible for
     * good. Re-testing unconditionally means where the scroll came from cannot
     * matter.
     */
    function sweep(limit) {
      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        var box = el.getBoundingClientRect();
        if (box.top < limit && box.bottom > 0) el.classList.add("is-in");
        else el.classList.remove("is-in");
      }
    }

    function setParallax() {
      var y = window.scrollY || window.pageYOffset || 0;
      root.style.setProperty("--sy", Math.min(y, PARALLAX_CLAMP) + "px");
    }

    setParallax();

    // rAF-coalesced, so a fast scroll does at most one style write per frame.
    var frame = 0;
    function apply() {
      frame = 0;
      setParallax();
      sweep(window.innerHeight * (1 - TRIGGER_INSET));
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(apply);
    }

    /**
     * Flush styles, then release.
     *
     * A transition runs when a property's computed value changes between two
     * style recalculations. The hidden state was set by the head script above
     * and has been the elements' computed style since they were parsed, so
     * reading a layout property here is enough to close that first recalc and
     * make `.is-in` an animated change rather than a value adopted instantly.
     *
     * This deliberately does not wait on requestAnimationFrame. rAF does not
     * fire while a tab is not painting — open the page in a background tab and
     * a frame-gated entrance never runs, leaving the hero hidden until the tab
     * is looked at.
     */
    void document.body.offsetHeight;

    released = true;
    // The full viewport, not the inset trigger: on arrival everything actually
    // on screen should come in, including anything straddling the bottom edge.
    sweep(window.innerHeight);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    // Late images can move everything below them; re-test once they land.
    window.addEventListener("load", onScroll);
  }

  function boot() {
    try {
      start();
    } catch (e) {
      releaseAll();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
