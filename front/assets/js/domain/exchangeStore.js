(function (global) {
  "use strict";

  function getClient() {
    return global.DayflowSupabase;
  }

  function getUserId() {
    if (!global.DayflowAuth || typeof global.DayflowAuth.getCurrentUser !== "function") {
      return Promise.reject(new Error("auth_not_ready"));
    }
    return global.DayflowAuth.getCurrentUser().then(function (user) {
      if (!user) throw new Error("not_authenticated");
      return user.id;
    });
  }

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function toYmd(d) {
    var x = d || new Date();
    return x.getFullYear() + "-" + pad2(x.getMonth() + 1) + "-" + pad2(x.getDate());
  }

  function randomInviteCode() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  function createRoom(opts) {
    var client = getClient();
    if (!client) return Promise.reject(new Error("no_supabase"));
    var nickname = String((opts && opts.nickname) || "").trim().slice(0, 20);
    return getUserId().then(function (uid) {
      var code = randomInviteCode();
      return client
        .from("exchange_rooms")
        .insert({
          invite_code: code,
          created_by: uid,
        })
        .select("*")
        .single()
        .then(function (res) {
          if (res.error) throw res.error;
          var room = res.data;
          return client
            .from("exchange_room_members")
            .upsert(
              {
                room_id: room.id,
                user_id: uid,
                nickname: nickname || null,
              },
              { onConflict: "room_id,user_id" }
            )
            .then(function (mres) {
              if (mres.error) throw mres.error;
              return room;
            });
        });
    });
  }

  function joinRoomByCode(inviteCode, opts) {
    var client = getClient();
    if (!client) return Promise.reject(new Error("no_supabase"));
    var code = String(inviteCode || "").trim().toUpperCase();
    var nickname = String((opts && opts.nickname) || "").trim().slice(0, 20);
    if (!code) return Promise.reject(new Error("invalid_code"));
    return getUserId().then(function (uid) {
      return client
        .from("exchange_rooms")
        .select("*")
        .eq("invite_code", code)
        .single()
        .then(function (res) {
          if (res.error || !res.data) throw new Error("room_not_found");
          var room = res.data;
          return client
            .from("exchange_room_members")
            .upsert(
              {
                room_id: room.id,
                user_id: uid,
                nickname: nickname || null,
              },
              { onConflict: "room_id,user_id" }
            )
            .then(function (mres) {
              if (mres.error) throw mres.error;
              return room;
            });
        });
    });
  }

  function listMyRooms() {
    var client = getClient();
    if (!client) return Promise.resolve([]);
    return getUserId()
      .then(function (uid) {
        return client
          .from("exchange_room_members")
          .select("room_id, joined_at, exchange_rooms(id, invite_code, created_at)")
          .eq("user_id", uid)
          .order("joined_at", { ascending: false })
          .then(function (res) {
            if (res.error || !res.data) return [];
            return res.data
              .map(function (row) {
                var r = row.exchange_rooms || {};
                return {
                  room_id: row.room_id,
                  invite_code: r.invite_code || "",
                  created_at: r.created_at || "",
                };
              })
              .filter(function (x) {
                return x.room_id;
              });
          });
      })
      .catch(function () {
        return [];
      });
  }

  function listRoomMembers(roomId) {
    var client = getClient();
    if (!client) return Promise.resolve([]);
    var room = String(roomId || "").trim();
    if (!room) return Promise.resolve([]);
    return getUserId()
      .then(function () {
        return client
          .from("exchange_room_members")
          .select("user_id, nickname, joined_at")
          .eq("room_id", room)
          .order("joined_at", { ascending: true });
      })
      .then(function (res) {
        if (res.error || !res.data) return [];
        return res.data;
      })
      .catch(function () {
        return [];
      });
  }

  function getRoomById(roomId) {
    var client = getClient();
    if (!client) return Promise.resolve(null);
    var room = String(roomId || "").trim();
    if (!room) return Promise.resolve(null);
    return getUserId()
      .then(function () {
        return client
          .from("exchange_rooms")
          .select("id, invite_code, created_at")
          .eq("id", room)
          .single()
          .then(function (res) {
            if (res.error || !res.data) return null;
            return res.data;
          });
      })
      .catch(function () {
        return null;
      });
  }

  function listEntries(roomId, dateYmd) {
    var client = getClient();
    if (!client) return Promise.resolve([]);
    var room = String(roomId || "").trim();
    var date = String(dateYmd || "").trim();
    if (!room || !date) return Promise.resolve([]);
    return getUserId()
      .then(function () {
        return client
          .from("exchange_entries")
          .select("id, room_id, date, author_id, content, created_at")
          .eq("room_id", room)
          .eq("date", date)
          .order("created_at", { ascending: true })
          .then(function (res) {
            if (res.error || !res.data) return [];
            return res.data;
          });
      })
      .catch(function () {
        return [];
      });
  }

  function addEntry(opts) {
    var client = getClient();
    if (!client) return Promise.reject(new Error("no_supabase"));
    var roomId = String((opts && opts.room_id) || "").trim();
    var date = String((opts && opts.date) || toYmd()).trim();
    var content = String((opts && opts.content) || "").trim();
    if (!roomId || !date || !content) return Promise.reject(new Error("invalid_input"));
    return getUserId().then(function (uid) {
      return client
        .from("exchange_entries")
        .insert({
          room_id: roomId,
          date: date,
          author_id: uid,
          content: content,
        })
        .select("id")
        .single()
        .then(function (res) {
          if (res.error) throw res.error;
          return res.data.id;
        });
    });
  }

  function updateEntry(entryId, content) {
    var client = getClient();
    if (!client) return Promise.reject(new Error("no_supabase"));
    var id = Number(entryId);
    var c = String(content || "").trim();
    if (!id || !c) return Promise.reject(new Error("invalid_input"));
    return getUserId().then(function (uid) {
      return client
        .from("exchange_entries")
        .update({ content: c })
        .eq("id", id)
        .eq("author_id", uid)
        .select("id")
        .single()
        .then(function (res) {
          if (res.error) throw res.error;
          return res.data && res.data.id;
        });
    });
  }

  function deleteEntry(entryId) {
    var client = getClient();
    if (!client) return Promise.reject(new Error("no_supabase"));
    var id = Number(entryId);
    if (!id) return Promise.reject(new Error("invalid_input"));
    return getUserId().then(function (uid) {
      return client
        .from("exchange_entries")
        .delete()
        .eq("id", id)
        .eq("author_id", uid)
        .then(function (res) {
          if (res.error) throw res.error;
          return true;
        });
    });
  }

  function sendFriendRequest(targetUserId) {
    var client = getClient();
    if (!client) return Promise.reject(new Error("no_supabase"));
    var target = String(targetUserId || "").trim();
    if (!target) return Promise.reject(new Error("invalid_friend_id"));
    return getUserId().then(function (uid) {
      if (uid === target) throw new Error("self_not_allowed");
      return client
        .from("friendships")
        .upsert(
          {
            user_id: uid,
            friend_id: target,
            status: "pending",
            requested_by: uid,
          },
          { onConflict: "user_id,friend_id" }
        )
        .then(function (res) {
          if (res.error) throw res.error;
          return true;
        });
    });
  }

  function listIncomingFriendRequests() {
    var client = getClient();
    if (!client) return Promise.resolve([]);
    return getUserId()
      .then(function (uid) {
        return client
          .from("friendships")
          .select("id, user_id, friend_id, status, requested_by, created_at")
          .eq("friend_id", uid)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .then(function (res) {
            if (res.error || !res.data) return [];
            return res.data;
          });
      })
      .catch(function () {
        return [];
      });
  }

  function acceptFriendRequest(requestId) {
    var client = getClient();
    if (!client) return Promise.reject(new Error("no_supabase"));
    var id = Number(requestId);
    if (!id) return Promise.reject(new Error("invalid_request"));
    return getUserId().then(function (uid) {
      return client
        .from("friendships")
        .select("id, user_id, friend_id")
        .eq("id", id)
        .eq("friend_id", uid)
        .single()
        .then(function (res) {
          if (res.error || !res.data) throw new Error("request_not_found");
          var req = res.data;
          return client
            .from("friendships")
            .update({ status: "accepted" })
            .eq("id", req.id)
            .then(function (up) {
              if (up.error) throw up.error;
              return client
                .from("friendships")
                .upsert(
                  {
                    user_id: uid,
                    friend_id: req.user_id,
                    status: "accepted",
                    requested_by: req.user_id,
                  },
                  { onConflict: "user_id,friend_id" }
                )
                .then(function (back) {
                  if (back.error) throw back.error;
                  return true;
                });
            });
        });
    });
  }

  function listMyFriends() {
    var client = getClient();
    if (!client) return Promise.resolve([]);
    return getUserId()
      .then(function (uid) {
        return client
          .from("friendships")
          .select("friend_id, status, created_at")
          .eq("user_id", uid)
          .eq("status", "accepted")
          .order("created_at", { ascending: false })
          .then(function (res) {
            if (res.error || !res.data) return [];
            return res.data;
          });
      })
      .catch(function () {
        return [];
      });
  }

  global.DayflowExchangeStore = {
    toYmd: toYmd,
    createRoom: createRoom,
    joinRoomByCode: joinRoomByCode,
    listMyRooms: listMyRooms,
    listRoomMembers: listRoomMembers,
    getRoomById: getRoomById,
    listEntries: listEntries,
    addEntry: addEntry,
    updateEntry: updateEntry,
    deleteEntry: deleteEntry,
    sendFriendRequest: sendFriendRequest,
    listIncomingFriendRequests: listIncomingFriendRequests,
    acceptFriendRequest: acceptFriendRequest,
    listMyFriends: listMyFriends,
  };
})(typeof window !== "undefined" ? window : this);
