/* ============================================================
   page-placeholder.js — pages that are not built yet.
   Boots the shared frame and states plainly what is missing,
   so nothing on screen pretends to work.
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {
  bootShell();
  const key = document.body.dataset.page;
  const item = NAV_ITEMS.find(n => n.key === key) || { label: key, icon: ICONS.none };
  document.getElementById('placeholder').innerHTML =
    sizedIcon(item.icon, 34) +
    '<div class="ph-title">' + escapeHtml(item.label) + '</div>' +
    '<div class="ph-sub">This page has not been built yet. Navigation, search, notifications and settings work here; the ' +
    escapeHtml(item.label) + ' workspace itself comes in a later build phase.</div>';
});
