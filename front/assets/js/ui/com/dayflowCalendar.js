/**
 * DayflowCalendar — 바닐라 JS 월 달력 위젯 (다른 페이지에서도 mount만 하면 사용 가능)
 *
 * @example
 *   var api = DayflowCalendar.mount(document.getElementById("host"), {
 *     viewYear: 2026,
 *     viewMonth: 4,
 *     selectedYmd: "2026-04-21",
 *     marks: { "2026-04-21": "good" },
 *     onSelect: function (d) { console.log(d.ymd); },
 *     onMonthChange: function (d) { api.setMarks({ ... }); }
 *   });
 *   api.destroy();
 */
(function (global) {
  "use strict";

  var DOW_KO = ["일", "월", "화", "수", "목", "금", "토"];

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function toYmd(y, m0, day) {
    return y + "-" + pad2(m0 + 1) + "-" + pad2(day);
  }

  function parseYmd(ymd) {
    var p = String(ymd || "").split("-");
    if (p.length !== 3) return null;
    var y = Number(p[0]);
    var m = Number(p[1]) - 1;
    var d = Number(p[2]);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
    return { y: y, m0: m, d: d };
  }

  function monthMatrix(viewYear, viewMonth1) {
    var m0 = viewMonth1 - 1;
    var first = new Date(viewYear, m0, 1);
    var startPad = first.getDay();
    var lastDate = new Date(viewYear, m0 + 1, 0).getDate();
    var cells = [];
    var i;
    for (i = 0; i < startPad; i++) {
      cells.push({ inMonth: false, y: 0, m0: 0, d: 0 });
    }
    for (i = 1; i <= lastDate; i++) {
      cells.push({ inMonth: true, y: viewYear, m0: m0, d: i });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ inMonth: false, y: 0, m0: 0, d: 0 });
    }
    while (cells.length < 42) {
      cells.push({ inMonth: false, y: 0, m0: 0, d: 0 });
    }
    return cells;
  }

  function mount(hostEl, options) {
    if (!hostEl) {
      throw new Error("DayflowCalendar.mount: host element required");
    }

    var opts = options || {};
    var viewYear = Number(opts.viewYear) || new Date().getFullYear();
    var viewMonth1 = Number(opts.viewMonth) || new Date().getMonth() + 1;
    if (viewMonth1 < 1 || viewMonth1 > 12) viewMonth1 = new Date().getMonth() + 1;

    var selectedYmd = opts.selectedYmd || "";
    var marks = opts.marks && typeof opts.marks === "object" ? opts.marks : {};
    var onSelect = typeof opts.onSelect === "function" ? opts.onSelect : null;
    var onMonthChange = typeof opts.onMonthChange === "function" ? opts.onMonthChange : null;
    var dowLabels = Array.isArray(opts.dowLabels) && opts.dowLabels.length === 7 ? opts.dowLabels : DOW_KO;

    var root = document.createElement("div");
    root.className = "dayflow-cal";
    root.setAttribute("role", "application");
    root.setAttribute("aria-label", "월별 달력");

    root.innerHTML =
      '<div class="dayflow-cal__head">' +
      '  <button type="button" class="title-font-20 dayflow-cal__month-label" aria-label="표시 중인 월">' +
      "  </button>" +
      '  <div class="dayflow-cal__nav">' +
      '    <button type="button" class="dayflow-cal__nav-btn dayflow-cal__nav-btn--prev" aria-label="이전 달">‹</button>' +
      '    <button type="button" class="dayflow-cal__nav-btn dayflow-cal__nav-btn--next" aria-label="다음 달">›</button>' +
      "  </div>" +
      "</div>" +
      '<div class="dayflow-cal__dow"></div>' +
      '<div class="dayflow-cal__grid"></div>';

    hostEl.innerHTML = "";
    hostEl.appendChild(root);

    var elMonth = root.querySelector(".dayflow-cal__month-label");
    var elDow = root.querySelector(".dayflow-cal__dow");
    var elGrid = root.querySelector(".dayflow-cal__grid");
    var btnPrev = root.querySelector(".dayflow-cal__nav-btn--prev");
    var btnNext = root.querySelector(".dayflow-cal__nav-btn--next");

    dowLabels.forEach(function (label) {
      var d = document.createElement("span");
      d.className = "dayflow-cal__dow-cell";
      d.textContent = label;
      elDow.appendChild(d);
    });

    function setMonthLabel() {
      elMonth.textContent = viewYear + "." + pad2(viewMonth1);
    }

    function emitMonthChange() {
      setMonthLabel();
      if (onMonthChange) {
        onMonthChange({ viewYear: viewYear, viewMonth: viewMonth1 });
      }
    }

    function markTypeFor(ymd) {
      var t = marks[ymd];
      if (t === "best" || t === "good" || t === "normal" || t === "bad" || t === "worst") return t;
      return "";
    }

    function renderGrid() {
      elGrid.innerHTML = "";
      var cells = monthMatrix(viewYear, viewMonth1);
      var today = new Date();
      var todayYmd = toYmd(today.getFullYear(), today.getMonth(), today.getDate());

      cells.forEach(function (cell) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "dayflow-cal__day";

        if (!cell.inMonth) {
          btn.classList.add("dayflow-cal__day--muted");
          btn.disabled = true;
          btn.setAttribute("aria-hidden", "true");
          btn.innerHTML = "<span></span>";
          elGrid.appendChild(btn);
          return;
        }

        var ymd = toYmd(cell.y, cell.m0, cell.d);
        btn.dataset.ymd = ymd;
        var mt = markTypeFor(ymd);
        if (mt) btn.classList.add("dayflow-cal__day--" + mt);

        var shape = document.createElement("span");
        shape.className = "dayflow-cal__clover";
        shape.setAttribute("aria-hidden", "true");
        var num = document.createElement("span");
        num.className = "dayflow-cal__num";
        num.textContent = String(cell.d);
        btn.appendChild(shape);
        btn.appendChild(num);

        if (ymd === selectedYmd) btn.classList.add("is-selected");
        if (ymd === todayYmd) btn.classList.add("is-today");

        btn.addEventListener("click", function () {
          selectedYmd = ymd;
          renderGrid();
          if (onSelect) {
            onSelect({
              ymd: ymd,
              year: cell.y,
              month: cell.m0 + 1,
              date: cell.d,
              markType: mt || null,
            });
          }
        });

        elGrid.appendChild(btn);
      });
    }

    function shiftMonth(delta) {
      var d = new Date(viewYear, viewMonth1 - 1 + delta, 1);
      viewYear = d.getFullYear();
      viewMonth1 = d.getMonth() + 1;
      emitMonthChange();
      renderGrid();
    }

    function onPrev() {
      shiftMonth(-1);
    }
    function onNext() {
      shiftMonth(1);
    }

    btnPrev.addEventListener("click", onPrev);
    btnNext.addEventListener("click", onNext);

    setMonthLabel();
    renderGrid();

    return {
      getView: function () {
        return { viewYear: viewYear, viewMonth: viewMonth1 };
      },
      setMarks: function (next) {
        marks = next && typeof next === "object" ? next : {};
        renderGrid();
      },
      setSelectedYmd: function (ymd) {
        selectedYmd = String(ymd || "");
        renderGrid();
      },
      goPrevMonth: function () {
        onPrev();
      },
      goNextMonth: function () {
        onNext();
      },
      destroy: function () {
        btnPrev.removeEventListener("click", onPrev);
        btnNext.removeEventListener("click", onNext);
        if (hostEl) hostEl.innerHTML = "";
      },
    };
  }

  global.DayflowCalendar = {
    mount: mount,
    parseYmd: parseYmd,
    /** @param {number} y @param {number} m1 1~12 @param {number} d */
    toYmd: function (y, m1, d) {
      return y + "-" + pad2(m1) + "-" + pad2(d);
    },
  };
})(typeof window !== "undefined" ? window : this);
