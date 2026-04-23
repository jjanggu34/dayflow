/* openPopup(id), closePopup(id) */
$(document).ready(function () {
    (function () {
      var DEBUG = false;
  
      // 마지막으로 팝업을 연 트리거(버튼/인풋/라벨)
      var lastTriggerEl = null;
  
      /* =========================================================
         [2026-01-13] 추가 #A: 마지막으로 포커스가 있던 요소(진입 알럿 대비)
         - 클릭 없이 뜨는 알럿은 lastTriggerEl이 없을 수 있으니 lastActiveEl로 복귀
         ========================================================= */
      var lastActiveEl = null;
  
      document.addEventListener("focusin", function () {
        // 팝업이 열린 상태에서 팝업 내부로 옮겨 다니는 포커스는 기록하지 않음
        var openPopup = document.querySelector(".layerPopup.on");
        if (openPopup && document.activeElement && document.activeElement.closest(".layerPopup.on")) return;
  
        lastActiveEl = document.activeElement;
      });
  
      // 포커스 가능한 요소 후보 셀렉터 (button 보강)
      var FOCUSABLE =
        'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), ' +
        'select:not([disabled]), textarea:not([disabled]), [role="button"], ' +
        '[tabindex]:not([tabindex="-1"])';
  
      function log() {
        if (!DEBUG) return;
        try { console.log.apply(console, arguments); } catch (e) {}
      }
  
      /* =========================================================
         [2026-01-13] 추가 #B: 페이지 진입 알럿에서 "닫힌 후" 보낼 fallback 포커스
         - lastTriggerEl / lastActiveEl이 없으면 여기로 이동
         - 프로젝트에 맞게 selector 우선순위만 약간 잡아둠
         ========================================================= */
      function getFallbackFocusEl() {
        // 1) 로그인 화면이라면 아이디/비번 입력이 최우선
        var el =
          document.querySelector('#loginId, #user_id, #userid, input[name="userId"], input[name="id"], input[type="text"].login') ||
          document.querySelector('#loginPw, #password, input[name="password"], input[type="password"]');
  
        if (el) return el;
  
        // 2) 로그인 버튼/링크(텍스트 기반은 위험하니 class/id 우선)
        el =
          document.querySelector('#btnLogin, .btn-login, a.btn-login, button.btn-login') ||
          document.querySelector('a[href*="login"], button[onclick*="login"], a[onclick*="login"]');
  
        if (el) return el;
  
        // 3) 메인/콘텐츠의 첫 포커스 가능 요소
        el =
          document.querySelector('main ' + FOCUSABLE) ||
          document.querySelector(FOCUSABLE);
  
        return el || null;
      }
  
      // 팝업 내부로 포커스 이동
      function focusIntoPopup($target) {
        if (!$target || !$target.length) return;
  
        function pick() {
          // s: 26.1.22 웹접근성
          var $tabItem = $target.find(".tab-item.active").first();
          if (!$tabItem.length) {
            $tabItem = $target.find(".tab-item").first();
          }
          if ($tabItem.length) {
            return $tabItem;
          }
  
          var $popBody = $target.find(".pop-body").first();
          if ($popBody.length) {
            if (!$popBody.is("[tabindex]")) $popBody.attr("tabindex", "-1");
            return $popBody;
          }
  
          var $popBody = $target.find(".pop-content").first();
          if ($popBody.length) {
            if (!$popBody.is("[tabindex]")) $popBody.attr("tabindex", "-1");
            return $popBody;
          }
          // e: 26.1.22 웹접근성
          
          var $firstFocusable = $target
            .find(FOCUSABLE)
            .filter(":visible")
            .first();
  
          if ($firstFocusable.length) return $firstFocusable;
  
          var $el = $target.find(".pop-area").first();
          if (!$el.length) $el = $target.find(".pop-content").first();
          if (!$el.length) $el = $target;
  
          if (!$el.is("[tabindex]")) $el.attr("tabindex", "-1");
          return $el;
        }
  
        var tries = 0;
        (function attempt() {
          tries++;
          var $el = pick();
          try { $el.get(0).focus(); } catch (e) {}
  
          if (document.activeElement === $el.get(0)) return;
          if (tries < 4) setTimeout(attempt, 60);
        })();
      }
  
      var popupL = {
        /** 팝업 초기화 **/
        initPopup: function (id) {
          var $target = $("#" + id);
          if (!$target.length) return;
  
          $target.addClass("on");
          $target.find(".pop-content").scrollTop(0);
          $("body, .contentWrap").css("overflow", "hidden");
  
          log("initPopup:", id);
  
          focusIntoPopup($target);
  
          // 클릭 포커스 되돌림 방지용 2차 (원본 기능 안 깨는 최소 보강)
          requestAnimationFrame(function () {
            focusIntoPopup($target);
          });
        },
  
        openPopup: function (id) { this.initPopup(id); },
        openModal: function (id) { this.initPopup(id); log("openModal:", id); },
        openMenu: function (id) { this.initPopup(id); log("openMenu:", id); },
  
        /** 팝업 닫기 **/
        closePopup: function (id) {
          var _target = document.getElementById(id);
          if (_target) _target.classList.remove("on");
  
          this.fkSelAndPopupResetOverflow();
  
          if (_target && _target.classList.contains("full")) {
            var header = _target.querySelector(".pop-header");
            if (header) header.style.position = "";
          }
  
          this.fkSelAndPopupResetOverflow();
  
          /* =========================================================
             [2026-01-13] 수정 #C: 닫힘 후 포커스 복귀 대상
             - 1순위 lastTriggerEl
             - 2순위 lastActiveEl (클릭 없이 뜬 알럿 대비)
             - 3순위 fallback(로그인 입력/로그인 버튼/첫 포커스 가능 요소)
             ========================================================= */
          setTimeout(function () {
            var backEl =
              (lastTriggerEl && document.contains(lastTriggerEl)) ? lastTriggerEl :
              (lastActiveEl && document.contains(lastActiveEl)) ? lastActiveEl :
              getFallbackFocusEl();
  
            if (backEl && document.contains(backEl)) {
              try { backEl.focus(); } catch (e) {}
  
              // 탭 같은 다른 스크립트가 바로 뺏는 경우 0ms 재시도 1회
              setTimeout(function () {
                if (document.activeElement !== backEl) {
                  try { backEl.focus(); } catch (e) {}
                }
              }, 0);
            }
          }, 50);
        },
  
        fkSelAndPopupResetOverflow: function () {
          var isPopupOpen = $(".layerPopup.on").length > 0;
          var isSelectOpen = $(".stove-option-layer.on").length > 0;
  
          if (!isPopupOpen && !isSelectOpen) {
            $("body, .contentWrap").css("overflow", "");
            $(".pop-area, .pop-content").removeAttr("tabindex");
  
            setTimeout(function () {
              $(".layerPopup.toggleUp").removeClass("active");
            }, 10);
          }
        }
      };
  
      var btmShtTL = {
        btmAti: function (id) {
          var $target = $("#" + id);
          if (!$target.length) return;
  
          var $contentWrap = $target.find(".pop-content");
          $target.toggleClass("active");
  
          log("btmAti:", id);
  
          if ($target.hasClass("active")) {
            $contentWrap.scrollTop(0);
            $contentWrap.attr("tabindex", "-1");
            setTimeout(function () { try { $contentWrap.get(0).focus(); } catch (e) {} }, 0);
            setTimeout(function () { try { $contentWrap.get(0).focus(); } catch (e) {} }, 60);
          } else {
            $contentWrap.removeAttr("tabindex");
          }
        }
      };
  
      // 라벨 + change 로 팝업 여는 케이스
      $(document).on("change", "input, select, textarea", function () {
        var $label = $('label[for="' + this.id + '"]');
        var popupId = $label.data("popup-open");
        if (!popupId) return;
  
        lastTriggerEl = $label.get(0) || this;
        popupL.openPopup(popupId);
      });
  
      // 클릭으로 여닫는 케이스
      $(document).on("click", function (e) {
        var $t = $(e.target);
  
        var $openBtn = $t.closest("[data-popup-open]");
        if ($openBtn.length) {
          lastTriggerEl = $openBtn.get(0);
          return popupL.openPopup($openBtn.data("popup-open"));
        }
  
        var $modalBtn = $t.closest("[data-modal-open]");
        if ($modalBtn.length) {
          lastTriggerEl = $modalBtn.get(0);
          return popupL.openModal($modalBtn.data("modal-open"));
        }
  
        var $menuBtn = $t.closest("[data-menu-open]");
        if ($menuBtn.length) {
          lastTriggerEl = $menuBtn.get(0);
          return popupL.openMenu($menuBtn.data("menu-open"));
        }
  
        var $closeBtn = $t.closest("[data-popup-close]");
        if ($closeBtn.length) return popupL.closePopup($closeBtn.data("popup-close"));

        // 레이어 딤(::before) / 팝업 영역 바깥 클릭 시 닫기
        var $openLayer = $t.closest(".layerPopup.on");
        if ($openLayer.length) {
          var clickedInsidePopArea = $t.closest(".pop-area").length > 0;
          if (!clickedInsidePopArea) {
            var popupId = $openLayer.attr("id");
            if (popupId) return popupL.closePopup(popupId);
          }
        }
  
        var $btmToggleBtn = $t.closest("[data-btm-toggle]");
        if ($btmToggleBtn.length) {
          lastTriggerEl = $btmToggleBtn.get(0);
          return btmShtTL.btmAti($btmToggleBtn.data("btm-toggle"));
        }
  
        // 바텀시트 dim 클릭 시 닫기 (레거시 호환)
        var $dimLayer = $t.closest(".layerPopup.btmSheet");
        if ($dimLayer.length && $t.is($dimLayer)) {
          $dimLayer.removeClass("active").find(".pop-content").removeAttr("tabindex");
          popupL.closePopup($dimLayer.attr("id"));
        }
      });
  
      /* =========================================================
         [2026-01-13] 추가 #D: 레거시(클래스/onclick)로 열리는 layerPopup 포커스 주입(안전)
         - 원본 기능을 깨지 않기 위해 .layerPopup.on "열림"만 감지
         ========================================================= */
      (function observeLegacyLayerPopupOpen() {
        if (!window.MutationObserver) return;
  
        var obs = new MutationObserver(function (mutations) {
          for (var i = 0; i < mutations.length; i++) {
            var m = mutations[i];
            if (m.type !== "attributes" || m.attributeName !== "class") continue;
  
            var el = m.target;
            if (!el || !el.classList) continue;
            if (!el.classList.contains("layerPopup")) continue;
  
            var oldVal = m.oldValue || "";
            var wasOpen = oldVal.indexOf("on") !== -1;
            var isOpen = el.classList.contains("on");
  
            if (!wasOpen && isOpen) {
              focusIntoPopup($(el));
            }
          }
        });
  
        obs.observe(document.body, {
          subtree: true,
          attributes: true,
          attributeOldValue: true,
          attributeFilter: ["class"]
        });
      })();
  
      // 전역 노출
      window.popupL = popupL;
      window.btmShtTL = btmShtTL;
      window.fkSelAndPopupResetOverflow = popupL.fkSelAndPopupResetOverflow;
    })();
  });
  