// Click-to-enlarge video lightbox for the race footage thumbnails.
(function () {
  var lightbox = document.getElementById('video-lightbox');
  if (!lightbox) return;

  var video = document.getElementById('lightbox-video');
  var caption = document.getElementById('lightbox-caption');
  var lastFocused = null;

  function openLightbox(src, captionHtml) {
    lastFocused = document.activeElement;
    video.src = src;
    caption.innerHTML = captionHtml || '';
    lightbox.hidden = false;
    video.play().catch(function () {});
    var closeBtn = lightbox.querySelector('.lightbox-close');
    if (closeBtn) closeBtn.focus();
    document.addEventListener('keydown', onKeydown);
  }

  function closeLightbox() {
    video.pause();
    video.removeAttribute('src');
    video.load();
    lightbox.hidden = true;
    document.removeEventListener('keydown', onKeydown);
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  function onKeydown(e) {
    if (e.key === 'Escape') closeLightbox();
  }

  document.querySelectorAll('.clip-line').forEach(function (btn) {
    btn.addEventListener('click', function () {
      openLightbox(btn.getAttribute('data-video'), btn.getAttribute('data-caption'));
    });
  });

  lightbox.querySelectorAll('[data-close]').forEach(function (el) {
    el.addEventListener('click', closeLightbox);
  });

  // Match the video thumbnail column's height to the PR list beside it.
  // Sized in real pixels (not percentages) because a percentage height on
  // the thumb, nested in an auto-sized flex column, has no definite
  // containing block to resolve against and falls back to the image's
  // full intrinsic size instead of shrinking to fit.
  var prList = document.querySelector('.pr-list');
  var clipsMini = document.querySelector('.clips-mini');
  var thumbs = clipsMini ? clipsMini.querySelectorAll('.clip-thumb') : [];
  function syncClipHeight() {
    if (!prList || !clipsMini || !thumbs.length) return;
    if (window.matchMedia('(max-width: 34rem)').matches) {
      clipsMini.style.height = '';
      thumbs.forEach(function (t) { t.style.width = ''; });
      return;
    }
    var totalHeight = prList.getBoundingClientRect().height;
    var gap = parseFloat(getComputedStyle(clipsMini).rowGap) || 0;
    var thumbHeight = (totalHeight - gap * (thumbs.length - 1)) / thumbs.length;
    var thumbWidth = thumbHeight * (16 / 9);
    clipsMini.style.height = totalHeight + 'px';
    thumbs.forEach(function (t) { t.style.width = thumbWidth + 'px'; });
  }
  syncClipHeight();
  window.addEventListener('resize', syncClipHeight);
})();
