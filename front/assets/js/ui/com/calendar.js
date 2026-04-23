/**
 * @param {string|Element} selector CSS 선택자 또는 DOM 요소
 * @param {Object} options DayflowCalendar.mount 과 동일한 옵션 객체
 */
(function (global) {
  "use strict";

  function initCalendar(selector, options) {
    var el = typeof selector === "string" ? document.querySelector(selector) : selector;
    if (!el || !global.DayflowCalendar || typeof global.DayflowCalendar.mount !== "function") {
      return null;
    }
    return global.DayflowCalendar.mount(el, options || {});
  }

  global.initCalendar = initCalendar;
})(typeof window !== "undefined" ? window : this);
