/* Request-password popup for the protected case studies.
 *
 * Every password gate has a "Click here to request password" link
 * (a mailto: link). This takes over those links: it opens a small popup
 * that asks for the visitor's email address and sends it to the Google
 * Apps Script in scripts/password-request.gs, which emails the password to
 * the visitor with preeti.soreng@gmail.com in CC.
 *
 * Until ENDPOINT is filled in, the links keep working as plain mailto:
 * links, so nothing breaks before the script is deployed.
 */
(function () {
  /* Paste the Apps Script "Web app" URL here (ends in /exec). */
  var ENDPOINT = "https://script.google.com/macros/s/AKfycbx1QJco7zP_bqSXWSR02Bwo4GB6EhTnEVc42yjatClyoabYt_6Xxw4Kl3WwJROqRn-K/exec";

  if (!ENDPOINT) return;

  var LINK = 'a[href^="mailto:"][href*="Password%20request"]';
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var dialog, form, input, button, status, lastLink;

  function css() {
    var s = document.createElement("style");
    s.textContent =
      ".pr-dialog{width:min(420px,calc(100vw - 32px));padding:0;border:0;border-radius:18px;" +
      "background:#fff;color:#1c1917;box-shadow:0 30px 60px -20px rgba(30,25,60,.45);" +
      'font:400 15px/1.55 "Roboto","Helvetica Neue",Arial,sans-serif}' +
      ".pr-dialog::backdrop{background:rgba(20,18,30,.45);backdrop-filter:blur(3px)}" +
      ".pr-body{position:relative;padding:28px 26px 24px}" +
      ".pr-eyebrow{margin:0 0 6px;font-size:12px;font-weight:500;letter-spacing:.14em;" +
      "text-transform:uppercase;color:#4f4dc5}" +
      '.pr-title{margin:0 0 8px;font:700 24px/1.2 "Fraunces",Georgia,serif;letter-spacing:-.01em}' +
      ".pr-copy{margin:0 0 18px;color:#57534e;font-size:14px}" +
      ".pr-label{display:block;margin-bottom:6px;font-size:13px;font-weight:500}" +
      ".pr-input{box-sizing:border-box;width:100%;height:46px;padding:0 14px;border:1px solid #d6d3d1;" +
      "border-radius:10px;font:inherit;color:inherit;background:#fff}" +
      ".pr-input:focus{outline:2px solid #4f4dc5;outline-offset:1px;border-color:#4f4dc5}" +
      ".pr-button{width:100%;height:46px;margin-top:12px;border:0;border-radius:999px;" +
      "background:#151515;color:#fff;font-size:15px;font-weight:500;font-family:inherit;cursor:pointer}" +
      ".pr-button:hover{background:#2b2b2b}.pr-button:disabled{opacity:.6;cursor:progress}" +
      ".pr-button:focus-visible{outline:2px solid #4f4dc5;outline-offset:2px}" +
      ".pr-status{min-height:20px;margin:12px 0 0;font-size:13.5px}" +
      ".pr-status.is-error{color:#b42318}.pr-status.is-ok{color:#1f7a3d}" +
      ".pr-close{position:absolute;top:10px;right:10px;width:40px;height:40px;border:0;" +
      "border-radius:999px;background:transparent;color:#57534e;font-size:22px;line-height:1;cursor:pointer}" +
      ".pr-close:hover{background:#f5f5f4}.pr-close:focus-visible{outline:2px solid #4f4dc5}" +
      ".pr-done .pr-form{display:none}" +
      "html.dark .pr-dialog{background:#1c1e22;color:#f5f5f4}" +
      "html.dark .pr-copy{color:#a8a29e}html.dark .pr-input{background:#141517;border-color:#3f3f46}";
    document.head.appendChild(s);
  }

  function build() {
    css();
    dialog = document.createElement("dialog");
    dialog.className = "pr-dialog";
    dialog.setAttribute("aria-labelledby", "pr-title");
    dialog.innerHTML =
      '<div class="pr-body">' +
      '<button type="button" class="pr-close" aria-label="Close">&times;</button>' +
      '<p class="pr-eyebrow">Protected case study</p>' +
      '<h2 class="pr-title" id="pr-title">Request the password</h2>' +
      '<p class="pr-copy">Enter your email address and the password will be sent to your inbox.</p>' +
      '<form class="pr-form" novalidate>' +
      '<label class="pr-label" for="pr-email">Email address</label>' +
      '<input class="pr-input" id="pr-email" type="email" autocomplete="email" ' +
      'inputmode="email" placeholder="you@company.com" required>' +
      '<button class="pr-button" type="submit">Send me the password</button>' +
      "</form>" +
      '<p class="pr-status" role="status" aria-live="polite"></p>' +
      "</div>";
    document.body.appendChild(dialog);
    form = dialog.querySelector("form");
    input = dialog.querySelector("input");
    button = dialog.querySelector(".pr-button");
    status = dialog.querySelector(".pr-status");
    dialog.querySelector(".pr-close").addEventListener("click", close);
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) close(); /* click on the backdrop */
    });
    dialog.addEventListener("close", function () {
      if (lastLink) lastLink.focus();
    });
    form.addEventListener("submit", submit);
  }

  function say(text, kind) {
    status.textContent = text;
    status.className = "pr-status" + (kind ? " is-" + kind : "");
  }

  function open(link) {
    if (!dialog) build();
    lastLink = link;
    dialog.classList.remove("pr-done");
    button.disabled = false;
    say("");
    dialog.showModal();
    input.focus();
  }

  function close() {
    dialog.close();
  }

  function page() {
    var h = document.querySelector("h1");
    return (document.title || (h && h.textContent) || location.pathname).trim();
  }

  function submit(e) {
    e.preventDefault();
    var email = input.value.trim();
    if (!EMAIL.test(email)) {
      say("Please enter a valid email address.", "error");
      input.focus();
      return;
    }
    button.disabled = true;
    say("Sending…");
    /* text/plain keeps this a "simple" request, so the browser doesn't
       send a CORS preflight that Apps Script can't answer. */
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ email: email, page: page(), url: location.href }),
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (res) {
        if (!res || !res.ok) throw new Error((res && res.error) || "failed");
        dialog.classList.add("pr-done");
        say(
          "Done! The password is on its way to " +
            email +
            ". If it isn't in your inbox in a few minutes, check your spam folder.",
          "ok"
        );
      })
      .catch(function (err) {
        button.disabled = false;
        var msg = String((err && err.message) || "");
        say(
          msg === "too_many"
            ? "A password was already sent to this address recently. Please check your inbox."
            : "Sorry, that didn't go through. Please try again, or email preeti.soreng@gmail.com.",
          "error"
        );
      });
  }

  /* The gate links are added by script after load, so listen at the top. */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest(LINK);
    if (!a || !window.HTMLDialogElement) return;
    e.preventDefault();
    open(a);
  });
})();
