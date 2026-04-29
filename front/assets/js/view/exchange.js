(function () {
  "use strict";
  var STORAGE_EXCHANGE_DRAFT = "dayflow_exchange_draft_text";

  function qs(id) {
    return document.getElementById(id);
  }

  function setMsg(text) {
    var el = qs("exchangeMsg");
    if (el) el.textContent = text || "";
  }

  function hasDraftFromChat() {
    try {
      return !!String(sessionStorage.getItem(STORAGE_EXCHANGE_DRAFT) || "").trim();
    } catch (e) {
      return false;
    }
  }

  function goRoom(roomId) {
    window.location.href = "/exchange/room?room=" + encodeURIComponent(roomId);
  }

  function parseInviteFromUrl() {
    try {
      var q = new URLSearchParams(window.location.search || "");
      var code = (q.get("invite") || "").trim().toUpperCase();
      return /^[A-Z0-9]{4,12}$/.test(code) ? code : "";
    } catch (e) {
      return "";
    }
  }

  function renderRooms(list) {
    var ul = qs("exchangeRoomList");
    if (!ul) return;
    ul.innerHTML = "";
    if (!list || !list.length) {
      ul.innerHTML = "<li style='color:#777;font-size:13px;'>참여 중인 방이 없어요.</li>";
      return;
    }
    list.forEach(function (r) {
      var li = document.createElement("li");
      li.style.marginBottom = "8px";
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-sub";
      btn.style.width = "100%";
      btn.textContent = "코드 " + (r.invite_code || "-") + " 방 열기";
      btn.addEventListener("click", function () {
        goRoom(r.room_id);
      });
      li.appendChild(btn);
      ul.appendChild(li);
    });
  }

  function renderIncoming(list) {
    var ul = qs("exchangeIncomingList");
    if (!ul) return;
    ul.innerHTML = "";
    if (!list || !list.length) {
      ul.innerHTML = "<li style='color:#777;font-size:12px;'>요청 없음</li>";
      return;
    }
    list.forEach(function (r) {
      var li = document.createElement("li");
      li.style.marginBottom = "6px";
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-sub";
      btn.style.width = "100%";
      btn.textContent = "요청: " + String(r.user_id || "").slice(0, 8) + "... 수락";
      btn.addEventListener("click", function () {
        DayflowExchangeStore.acceptFriendRequest(r.id)
          .then(refreshFriendPanels)
          .catch(function (err) {
            setMsg("수락 실패: " + (err.message || "오류"));
          });
      });
      li.appendChild(btn);
      ul.appendChild(li);
    });
  }

  function renderFriends(list) {
    var ul = qs("exchangeFriendList");
    if (!ul) return;
    ul.innerHTML = "";
    if (!list || !list.length) {
      ul.innerHTML = "<li style='color:#777;font-size:12px;'>친구 없음</li>";
      return;
    }
    list.forEach(function (r) {
      var li = document.createElement("li");
      li.style.marginBottom = "6px";
      var friendId = String(r.friend_id || "");
      var row = document.createElement("div");
      row.style.display = "flex";
      row.style.gap = "6px";
      row.style.alignItems = "center";

      var txt = document.createElement("span");
      txt.style.fontSize = "12px";
      txt.style.color = "#555";
      txt.style.flex = "1";
      txt.textContent = "friend: " + friendId;

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-sub";
      btn.style.height = "30px";
      btn.style.padding = "0 10px";
      btn.textContent = "이 친구와 방";
      btn.addEventListener("click", function () {
        setMsg("친구와 새 방 생성 중...");
        DayflowExchangeStore.createRoom({})
          .then(function (room) {
            var invite = String(room.invite_code || "");
            var link = window.location.origin + "/exchange?invite=" + encodeURIComponent(invite);
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(link).catch(function () {});
            }
            setMsg("새 방 생성 완료. 초대링크가 복사되었어요.");
            goRoom(room.id);
          })
          .catch(function (err) {
            setMsg("방 생성 실패: " + (err.message || "오류"));
          });
      });

      row.appendChild(txt);
      row.appendChild(btn);
      li.appendChild(row);
      ul.appendChild(li);
    });
  }

  function refreshFriendPanels() {
    if (!window.DayflowExchangeStore) return;
    DayflowExchangeStore.listIncomingFriendRequests().then(renderIncoming);
    DayflowExchangeStore.listMyFriends().then(renderFriends);
  }

  function boot() {
    if (!window.DayflowAuth || !window.DayflowExchangeStore) return;
    var forceList = false;
    try {
      var q = new URLSearchParams(window.location.search || "");
      forceList = q.get("list") === "1";
    } catch (eQ) {}

    DayflowAuth.getCurrentUser().then(function (user) {
      if (!user) {
        window.location.href = "/login";
        return;
      }
      var inviteCode = parseInviteFromUrl();
      if (inviteCode) {
        setMsg("초대 링크 확인 중...");
        DayflowExchangeStore.joinRoomByCode(inviteCode, {})
          .then(function (room) {
            setMsg("초대 링크로 입장했어요.");
            goRoom(room.id);
          })
          .catch(function (err) {
            setMsg("초대 링크 입장 실패: " + (err.message || "오류"));
          });
        return;
      }
      if (hasDraftFromChat()) {
        setMsg("채팅에서 가져온 오늘 기록이 있어요. 방을 선택하면 입력창에 자동으로 채워져요.");
      }
      DayflowExchangeStore.listMyRooms().then(function (rooms) {
        if (!forceList && rooms && rooms.length) {
          goRoom(rooms[0].room_id);
          return;
        }
        renderRooms(rooms);
        refreshFriendPanels();
      });
    });

    var back = qs("exchangeBackBtn");
    if (back) {
      back.addEventListener("click", function () {
        window.location.href = "/my";
      });
    }

    var createBtn = qs("exchangeCreateBtn");
    if (createBtn) {
      createBtn.addEventListener("click", function () {
        var nick = (qs("exchangeNickCreate").value || "").trim();
        setMsg("방 생성 중...");
        DayflowExchangeStore.createRoom({ nickname: nick })
          .then(function (room) {
            setMsg("생성 완료: 코드 " + room.invite_code);
            goRoom(room.id);
          })
          .catch(function (err) {
            setMsg("생성 실패: " + (err.message || "오류"));
          });
      });
    }

    var joinBtn = qs("exchangeJoinBtn");
    if (joinBtn) {
      joinBtn.addEventListener("click", function () {
        var code = (qs("exchangeInviteCode").value || "").trim();
        var nick = (qs("exchangeNickJoin").value || "").trim();
        if (!code) {
          setMsg("초대코드를 입력해 주세요.");
          return;
        }
        setMsg("입장 중...");
        DayflowExchangeStore.joinRoomByCode(code, { nickname: nick })
          .then(function (room) {
            setMsg("입장 완료");
            goRoom(room.id);
          })
          .catch(function (err) {
            setMsg("입장 실패: " + (err.message || "오류"));
          });
      });
    }

    var addFriendBtn = qs("exchangeFriendAddBtn");
    if (addFriendBtn) {
      addFriendBtn.addEventListener("click", function () {
        var friendId = (qs("exchangeFriendUserId").value || "").trim();
        if (!friendId) {
          setMsg("친구 user id를 입력해 주세요.");
          return;
        }
        DayflowExchangeStore.sendFriendRequest(friendId)
          .then(function () {
            setMsg("친구요청을 보냈어요.");
            if (qs("exchangeFriendUserId")) qs("exchangeFriendUserId").value = "";
            refreshFriendPanels();
          })
          .catch(function (err) {
            setMsg("친구요청 실패: " + (err.message || "오류"));
          });
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
