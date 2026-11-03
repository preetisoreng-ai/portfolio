/**
 * Password request emails for the portfolio's protected case studies.
 *
 * This is a Google Apps Script, not part of the website. It runs in
 * Preeti's Google account and sends from that Gmail address.
 * Setup: paste it into a new project at https://script.google.com, set the
 * password under Project Settings > Script properties, then
 * Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
 * Copy the /exec URL into ENDPOINT in password-request.js.
 *
 * Script properties:
 *   CASE_STUDY_PASSWORD   the password to send (required)
 */

var OWNER = "preeti.soreng@gmail.com";
var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function doPost(e) {
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    var email = String(data.email || "")
      .trim()
      .toLowerCase();
    var page = String(data.page || "a case study").slice(0, 120);
    var url = String(data.url || "").slice(0, 300);
    if (!EMAIL.test(email) || email.length > 200) return reply({ ok: false, error: "bad_email" });

    var password = PropertiesService.getScriptProperties().getProperty("CASE_STUDY_PASSWORD");
    if (!password) return reply({ ok: false, error: "not_configured" });

    // One email per address per 10 minutes, so the form can't be used to flood someone.
    var cache = CacheService.getScriptCache();
    if (cache.get("sent:" + email)) return reply({ ok: false, error: "too_many" });

    var subject = "Your password for Preeti Soreng's case studies";
    var text =
      "Hi,\n\n" +
      "Thanks for your interest in my work. Here is the password for the protected case studies:\n\n" +
      "    " +
      password +
      "\n\n" +
      "You requested it from: " +
      page +
      (url ? "\n" + url : "") +
      "\n\n" +
      "Please don't share it outside your team.\n\n" +
      "Preeti Soreng\nhttps://preetisoreng.com";
    var html =
      '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1c1917">' +
      "<p>Hi,</p>" +
      "<p>Thanks for your interest in my work. Here is the password for the protected case studies:</p>" +
      '<p style="font-size:20px;font-weight:bold;letter-spacing:.04em;background:#f1eefb;' +
      'display:inline-block;padding:10px 16px;border-radius:8px">' +
      escapeHtml(password) +
      "</p>" +
      "<p>You requested it from: " +
      (url ? '<a href="' + escapeHtml(url) + '">' + escapeHtml(page) + "</a>" : escapeHtml(page)) +
      "</p>" +
      "<p>Please don't share it outside your team.</p>" +
      '<p>Preeti Soreng<br><a href="https://preetisoreng.com">preetisoreng.com</a></p></div>';

    MailApp.sendEmail({
      to: email,
      cc: OWNER,
      replyTo: OWNER,
      name: "Preeti Soreng",
      subject: subject,
      body: text,
      htmlBody: html,
    });
    cache.put("sent:" + email, "1", 600);
    return reply({ ok: true });
  } catch (err) {
    console.error(err);
    return reply({ ok: false, error: "server" });
  }
}

/* Lets you check the deployment by opening the /exec URL in a browser. */
function doGet() {
  return reply({ ok: true, service: "password-request" });
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

/* Run this once from the editor to grant permission to send email. */
function authorize() {
  MailApp.getRemainingDailyQuota();
}
