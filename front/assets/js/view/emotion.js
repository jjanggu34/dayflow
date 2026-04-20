/* views/chat/emotion.html */
(function () {
  var group = document.getElementById("emotionBtnGroup");
  var bodyWrap = document.getElementById("bodyWrap");
  var captionEl = document.getElementById("emotionPreviewCaption");
  var emojiEl = document.getElementById("emotionPreviewEmoji");
  var startBtn = document.getElementById("startChatBtn");
  var footerPointer = document.getElementById("emotionFooterPointer");
  var footerEl = document.querySelector("#bodyWrap footer");

  if (!group || !captionEl || !emojiEl || !startBtn) return;

  var buttons = group.querySelectorAll(".emotion-option");
  var BG_PREFIX = "bg-";
  var EMOTION_BG_TYPES = ["none", "best", "good", "normal", "bad", "worst"];
  /** 버튼 DOM 순서(왼쪽부터) — 선택 항목이 항상 맨 앞으로 오도록 회전 */
  var EMOTION_BTN_ORDER = ["best", "good", "normal", "bad", "worst"];
  var stripAnimGen = 0;

  function resetButtonMotionStyles() {
    var opts = group.querySelectorAll(".emotion-option");
    for (var i = 0; i < opts.length; i++) {
      opts[i].style.transition = "";
      opts[i].style.transform = "";
    }
  }

  function setBodyBackgroundClass(emotionType) {
    if (!bodyWrap) return;
    var t = emotionType || "none";
    for (var i = 0; i < EMOTION_BG_TYPES.length; i++) {
      bodyWrap.classList.remove(BG_PREFIX + EMOTION_BG_TYPES[i]);
    }
    bodyWrap.classList.add(BG_PREFIX + t);
  }

  function previewImageSrcForType(emotionType) {
    return "../../assets/img/emotion/img-" + emotionType + ".png";
  }

  function renderPreviewImage(emotionType, altText) {
    var src = previewImageSrcForType(emotionType);
    emojiEl.innerHTML =
      '<span class="emotion-preview-emoji__icon">' +
      '<img class="emotion-preview-image" src="' +
      src +
      '" alt="' +
      altText +
      '" />' +
      "</span>";
  }

  function clearSelection() {
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute("aria-pressed", "false");
      buttons[i].classList.remove("is-selected");
    }
  }

  function activateStartButton() {
    startBtn.disabled = false;
    startBtn.classList.add("is-active");
  }

  /** footer 내부 화살표 — footer 기준 가로만 맞춤 (세로는 CSS bottom:100%) */
  function positionFooterPointer() {
    if (!footerPointer || !footerEl) return;
    var btn = group.querySelector('.emotion-option[aria-pressed="true"]');
    if (!btn) {
      footerPointer.style.visibility = "hidden";
      footerPointer.style.opacity = "0";
      return;
    }
    var fr = footerEl.getBoundingClientRect();
    var br = btn.getBoundingClientRect();
    var cx = Math.round(br.left + br.width / 2 - fr.left);
    footerPointer.style.left = cx + "px";
    footerPointer.style.top = "auto";
    footerPointer.style.right = "auto";
    footerPointer.style.bottom = "";
    footerPointer.style.transform = "translateX(-50%)";
    footerPointer.style.visibility = "visible";
    footerPointer.style.opacity = "1";
  }

  var resizePointerTimer = 0;
  function scheduleFooterPointerOnResize() {
    if (resizePointerTimer) clearTimeout(resizePointerTimer);
    resizePointerTimer = setTimeout(function () {
      resizePointerTimer = 0;
      positionFooterPointer();
    }, 100);
  }

  function rotateButtonsToFront(selectedBtn, onSettled) {
    var sel = selectedBtn.getAttribute("data-emotion-type");
    if (!sel) return;
    var idx = EMOTION_BTN_ORDER.indexOf(sel);
    if (idx < 0) return;
    var rotated = EMOTION_BTN_ORDER.slice(idx).concat(EMOTION_BTN_ORDER.slice(0, idx));

    var myGen = ++stripAnimGen;
    resetButtonMotionStyles();

    var nodes = Array.prototype.slice.call(group.querySelectorAll(".emotion-option"));
    var prevRects = new Map();
    for (var p = 0; p < nodes.length; p++) {
      prevRects.set(nodes[p], nodes[p].getBoundingClientRect());
    }

    for (var i = 0; i < rotated.length; i++) {
      var node = group.querySelector('.emotion-option[data-emotion-type="' + rotated[i] + '"]');
      if (node) group.appendChild(node);
    }
    group.scrollLeft = 0;

    var reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      requestAnimationFrame(function () {
        if (typeof onSettled === "function") onSettled();
      });
      return;
    }

    function callSettled() {
      if (myGen !== stripAnimGen) return;
      if (typeof onSettled === "function") onSettled();
    }

    requestAnimationFrame(function () {
      if (myGen !== stripAnimGen) return;
      var moved = false;
      for (var k = 0; k < nodes.length; k++) {
        var el = nodes[k];
        var a = prevRects.get(el);
        var b = el.getBoundingClientRect();
        var dx = a.left - b.left;
        var dy = a.top - b.top;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) moved = true;
        el.style.transition = "none";
        el.style.transform = "translate(" + dx + "px, " + dy + "px)";
      }
      if (!moved) {
        resetButtonMotionStyles();
        requestAnimationFrame(function () {
          requestAnimationFrame(callSettled);
        });
        return;
      }
      requestAnimationFrame(function () {
        if (myGen !== stripAnimGen) return;
        var remaining = nodes.length;
        var fallbackTimer = 0;
        function onStripTransitionEnd(ev) {
          if (ev.propertyName !== "transform") return;
          ev.target.removeEventListener("transitionend", onStripTransitionEnd);
          ev.target.style.transition = "";
          ev.target.style.transform = "";
          remaining--;
          if (remaining === 0) {
            if (fallbackTimer) clearTimeout(fallbackTimer);
            callSettled();
          }
        }
        fallbackTimer = setTimeout(function () {
          fallbackTimer = 0;
          if (remaining <= 0 || myGen !== stripAnimGen) return;
          for (var n = 0; n < nodes.length; n++) {
            nodes[n].removeEventListener("transitionend", onStripTransitionEnd);
            nodes[n].style.transition = "";
            nodes[n].style.transform = "";
          }
          remaining = 0;
          callSettled();
        }, 500);
        for (var m = 0; m < nodes.length; m++) {
          var el2 = nodes[m];
          el2.style.transition = "transform 0.34s cubic-bezier(0.22, 1, 0.36, 1)";
          el2.style.transform = "";
          el2.addEventListener("transitionend", onStripTransitionEnd);
        }
      });
    });
  }

  function applySelection(btn) {
    clearSelection();
    btn.setAttribute("aria-pressed", "true");
    btn.classList.add("is-selected");

    var weatherLabel = btn.getAttribute("data-weather-label") || "선택한 감정";
    var emotionLabel = btn.getAttribute("data-emotion-label") || weatherLabel;
    var emotionType = btn.getAttribute("data-emotion-type") || "best";

    setBodyBackgroundClass(emotionType);
    renderPreviewImage(emotionType, emotionLabel);
    captionEl.textContent = emotionLabel;
    activateStartButton();
    rotateButtonsToFront(btn, function () {
      positionFooterPointer();
    });
  }

  group.addEventListener("click", function (e) {
    var el = e.target;
    if (el && el.nodeType !== 1) el = el.parentElement;
    if (!el || !el.closest) return;
    var btn = el.closest(".emotion-option");
    if (!btn || !group.contains(btn)) return;
    e.preventDefault();
    applySelection(btn);
  });

  window.addEventListener(
    "resize",
    function () {
      scheduleFooterPointerOnResize();
    },
    { passive: true }
  );

  startBtn.addEventListener("click", function () {
    if (startBtn.disabled) return;
    var sel = group.querySelector('.emotion-option[aria-pressed="true"]');
    if (!sel) return;
    var t = sel.getAttribute("data-emotion-type") || "good";
    try {
      var key = window.DayflowEmotionChat ? DayflowEmotionChat.STORAGE_EMOTION_KEY : "dayflow_emotion_type";
      sessionStorage.setItem(key, t);
    } catch (e) {}
    window.location.href = "chat.html";
  });
})();
