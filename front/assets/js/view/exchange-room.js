(function () {
  "use strict";
  var STORAGE_EXCHANGE_DRAFT = "dayflow_exchange_draft_text";
  var STORAGE_EXCHANGE_DRAFT_DATE = "dayflow_exchange_draft_date";
  var STORAGE_CHAT_CTX = "dayflow_exchange_chat_summary";
  var STORAGE_NAV_AT = "dayflow_exchange_nav_at";

  function qs(id) {
    return document.getElementById(id);
  }

  function parseRoomId() {
    try {
      var q = new URLSearchParams(window.location.search || "");
      return (q.get("room") || "").trim();
    } catch (e) {
      return "";
    }
  }

  function todayYmd() {
    return DayflowExchangeStore.toYmd(new Date());
  }

  function readExchangeContext() {
    try {
      var sum = String(sessionStorage.getItem(STORAGE_CHAT_CTX) || "").trim();
      var at = String(sessionStorage.getItem(STORAGE_NAV_AT) || "").trim();
      if (sum || at) {
        sessionStorage.removeItem(STORAGE_CHAT_CTX);
        sessionStorage.removeItem(STORAGE_NAV_AT);
      }
      return { summary: sum, navAt: at };
    } catch (e) {
      return { summary: "", navAt: "" };
    }
  }

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function formatNavTime(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return (
      d.getFullYear() +
      "." +
      pad2(d.getMonth() + 1) +
      "." +
      pad2(d.getDate()) +
      " " +
      pad2(d.getHours()) +
      ":" +
      pad2(d.getMinutes())
    );
  }

  function consumeDraft() {
    try {
      var txt = String(sessionStorage.getItem(STORAGE_EXCHANGE_DRAFT) || "").trim();
      var ymd = String(sessionStorage.getItem(STORAGE_EXCHANGE_DRAFT_DATE) || "").trim();
      sessionStorage.removeItem(STORAGE_EXCHANGE_DRAFT);
      sessionStorage.removeItem(STORAGE_EXCHANGE_DRAFT_DATE);
      return { text: txt, date: ymd };
    } catch (e) {
      return { text: "", date: "" };
    }
  }

  function renderEntries(entries, myUid, handlers) {
    handlers = handlers || {};
    var ul = qs("exchangeEntryList");
    if (!ul) return;
    ul.innerHTML = "";
    if (!entries || !entries.length) {
      ul.innerHTML = "<li style='color:#777;'>아직 기록이 없어요.</li>";
      return;
    }
    entries.forEach(function (row) {
      var li = document.createElement("li");
      if (row.author_id === myUid) li.className = "mine";

      var header = document.createElement("div");
      header.style.cssText =
        "font-size:11px;color:#777;margin-bottom:4px;display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;";

      var meta = document.createElement("span");
      meta.textContent =
        (row.author_id === myUid ? "나" : "상대") +
        " · " +
        String(row.created_at || "").replace("T", " ").slice(0, 16);
      header.appendChild(meta);

      if (row.author_id === myUid && typeof handlers.onEdit === "function" && typeof handlers.onDelete === "function") {
        var actions = document.createElement("span");
        actions.style.cssText = "display:flex;gap:6px;flex-shrink:0;";
        var btnEdit = document.createElement("button");
        btnEdit.type = "button";
        btnEdit.className = "btn-sub";
        btnEdit.style.cssText = "height:26px;padding:0 8px;font-size:11px;";
        btnEdit.textContent = "수정";
        btnEdit.addEventListener("click", function (e) {
          e.preventDefault();
          handlers.onEdit(row);
        });
        var btnDel = document.createElement("button");
        btnDel.type = "button";
        btnDel.className = "btn-sub";
        btnDel.style.cssText = "height:26px;padding:0 8px;font-size:11px;";
        btnDel.textContent = "삭제";
        btnDel.addEventListener("click", function (e) {
          e.preventDefault();
          handlers.onDelete(row);
        });
        actions.appendChild(btnEdit);
        actions.appendChild(btnDel);
        header.appendChild(actions);
      }

      var body = document.createElement("div");
      body.style.wordBreak = "break-word";
      body.textContent = String(row.content || "");

      li.appendChild(header);
      li.appendChild(body);
      ul.appendChild(li);
    });
  }

  function boot() {
    var roomId = parseRoomId();
    if (!roomId) {
      window.location.href = "/exchange";
      return;
    }
    var dateEl = qs("exchangeDate");
    var meta = qs("exchangeRoomMeta");
    var input = qs("exchangeInput");
    var sendBtn = qs("exchangeSendBtn");
    var loadBtn = qs("exchangeLoadBtn");
    var backBtn = qs("exchangeRoomBackBtn");
    var copyBtn = qs("exchangeCopyCodeBtn");
    var copyLinkBtn = qs("exchangeCopyLinkBtn");
    var firstPreview = qs("exchangeFirstPreview");
    var cancelBtn = qs("exchangeEditCancelBtn");
    var ctx = readExchangeContext();
    var pendingEditId = null;

    function resetComposerEditState() {
      pendingEditId = null;
      if (sendBtn) sendBtn.textContent = "보내기";
      if (cancelBtn) cancelBtn.style.display = "none";
    }

    if (dateEl) dateEl.value = todayYmd();
    var inviteCode = "";
    if (meta) meta.textContent = "초대코드: 불러오는 중…";
    var draft = consumeDraft();
    if (dateEl && /^\d{4}-\d{2}-\d{2}$/.test(draft.date)) {
      dateEl.value = draft.date;
    }
    if (input && draft.text) {
      input.value = draft.text;
      if (meta) meta.textContent = "채팅 기록을 불러왔어요. 확인 후 보내기를 눌러 주세요.";
    }

    var myUid = "";

    function entryHandlers() {
      return {
        onEdit: function (row) {
          pendingEditId = row.id;
          if (input) {
            input.value = String(row.content || "");
            input.focus();
          }
          if (sendBtn) sendBtn.textContent = "저장";
          if (cancelBtn) cancelBtn.style.display = "block";
        },
        onDelete: function (row) {
          if (!window.confirm("이 댓글을 삭제할까요?")) return;
          if (pendingEditId === row.id) {
            if (input) input.value = "";
            resetComposerEditState();
          }
          DayflowExchangeStore.deleteEntry(row.id)
            .then(function () {
              loadEntries();
            })
            .catch(function () {
              window.alert("삭제하지 못했어요. 잠시 후 다시 시도해 주세요.");
            });
        },
      };
    }

    function loadEntries() {
      var ymd = (dateEl && dateEl.value) || todayYmd();
      DayflowExchangeStore.listEntries(roomId, ymd).then(function (rows) {
        renderEntries(rows, myUid, entryHandlers());
        if (firstPreview) {
          if (rows && rows.length) {
            var first = String(rows[0].content || "").trim().replace(/\s+/g, " ");
            if (first.length > 40) first = first.slice(0, 40) + "…";
            firstPreview.textContent = "첫 기록: " + (first || "(내용 없음)");
          } else {
            firstPreview.textContent = "첫 기록: 아직 기록이 없어요";
          }
        }
      });
    }

    DayflowAuth.getCurrentUser().then(function (user) {
      if (!user) {
        window.location.href = "/login";
        return;
      }
      myUid = user.id;

      var panel = qs("exchangeContextPanel");
      var sumBody = qs("exchangeSummaryBody");
      var timeLine = qs("exchangeTimeLine");
      var partnerLine = qs("exchangePartnerLine");

      if (timeLine && ctx.navAt) {
        timeLine.textContent = "이동 시각: " + formatNavTime(ctx.navAt);
      }
      if (ctx.summary && panel && sumBody) {
        panel.hidden = false;
        sumBody.textContent = ctx.summary;
        if (input) input.placeholder = "요약을 보고 공감 한마디를 댓글로 남겨 보세요";
        if (firstPreview) firstPreview.style.display = "none";
      } else if (panel) {
        panel.hidden = true;
      }

      if (typeof DayflowExchangeStore.listRoomMembers === "function") {
        DayflowExchangeStore.listRoomMembers(roomId).then(function (members) {
          if (!partnerLine) return;
          var partner = null;
          for (var i = 0; i < members.length; i++) {
            if (members[i].user_id !== myUid) {
              partner = members[i];
              break;
            }
          }
          if (partner && partner.nickname && String(partner.nickname).trim()) {
            partnerLine.textContent = "상대: " + String(partner.nickname).trim();
          } else if (partner) {
            partnerLine.textContent = "상대: 친구";
          } else if (members.length < 2) {
            partnerLine.textContent = "상대가 아직 방에 입장하지 않았어요.";
          } else {
            partnerLine.textContent = "상대: 확인 중…";
          }
        });
      }

      if (typeof DayflowExchangeStore.getRoomById === "function") {
        DayflowExchangeStore.getRoomById(roomId).then(function (room) {
          inviteCode = room && room.invite_code ? String(room.invite_code) : "";
          if (meta) meta.textContent = inviteCode ? "초대코드: " + inviteCode : "초대코드: 확인 불가";
          if (copyBtn) copyBtn.disabled = !inviteCode;
          loadEntries();
        });
      } else {
        if (meta) meta.textContent = "초대코드: 확인 불가";
        loadEntries();
      }
    });

    if (loadBtn) loadBtn.addEventListener("click", loadEntries);

    if (sendBtn) {
      sendBtn.addEventListener("click", function () {
        var text = (input && input.value) || "";
        text = text.trim();
        if (!text) return;
        var ymd = (dateEl && dateEl.value) || todayYmd();
        sendBtn.disabled = true;
        var savePromise = pendingEditId
          ? DayflowExchangeStore.updateEntry(pendingEditId, text)
          : DayflowExchangeStore.addEntry({
              room_id: roomId,
              date: ymd,
              content: text,
            });
        savePromise
          .then(function () {
            if (input) input.value = "";
            resetComposerEditState();
            loadEntries();
          })
          .catch(function () {
            window.alert(pendingEditId ? "수정하지 못했어요. 잠시 후 다시 시도해 주세요." : "전송하지 못했어요. 잠시 후 다시 시도해 주세요.");
          })
          .finally(function () {
            sendBtn.disabled = false;
          });
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener("click", function () {
        if (input) input.value = "";
        resetComposerEditState();
      });
    }

    if (backBtn) {
      backBtn.addEventListener("click", function () {
        window.location.href = "/exchange";
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        if (!inviteCode) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard
            .writeText(inviteCode)
            .then(function () {
              if (meta) meta.textContent = "초대코드: " + inviteCode + " (복사됨)";
            })
            .catch(function () {
              window.prompt("초대코드를 복사해 주세요", inviteCode);
            });
          return;
        }
        window.prompt("초대코드를 복사해 주세요", inviteCode);
      });
    }

    if (copyLinkBtn) {
      copyLinkBtn.addEventListener("click", function () {
        if (!inviteCode) return;
        var inviteLink = window.location.origin + "/exchange?invite=" + encodeURIComponent(inviteCode);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard
            .writeText(inviteLink)
            .then(function () {
              if (meta) meta.textContent = "초대링크 복사 완료";
            })
            .catch(function () {
              window.prompt("초대링크를 복사해 주세요", inviteLink);
            });
          return;
        }
        window.prompt("초대링크를 복사해 주세요", inviteLink);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
