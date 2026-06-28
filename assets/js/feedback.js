/* AtriaERP — Beta feedback capture
 * A floating "Feedback" button. Notes are stored locally and can be emailed in one click.
 */
(function (global) {
  "use strict";
  var U = global.UI;
  var KEY = "atriaerp.feedback";
  var OWNER_EMAIL = (global.AtriaConfig && AtriaConfig.FEEDBACK_EMAIL) || "dhokakrish@gmail.com";

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; } }
  function save(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {} }

  function currentScreen() { var h = document.querySelector("#content h1"); return h ? h.textContent : "—"; }

  function open() {
    var notes = load();
    var body = U.el("<div></div>");
    body.appendChild(U.el('<p class="muted" style="margin-top:0">Spotted a bug or have a suggestion while testing? Jot it here. Notes are saved on this device and you can email them all in one click.</p>'));
    var form = U.el('<div class="form-grid"></div>');
    form.appendChild(U.el('<div class="field"><label>Type</label><select id="fb_type"><option>Bug</option><option>Suggestion</option><option>Question</option><option>Looks good 👍</option></select></div>'));
    form.appendChild(U.el('<div class="field"><label>Screen</label><input id="fb_screen" value="' + U.esc(currentScreen()) + '"></div>'));
    form.appendChild(U.el('<div class="field full"><label>Your note</label><textarea id="fb_note" placeholder="e.g. On the Booking screen, the discount should also show the amount saved."></textarea></div>'));
    body.appendChild(form);
    var addBtn = U.el('<button class="btn primary" style="margin-top:8px">+ Save note</button>');
    body.appendChild(addBtn);

    var listWrap = U.el('<div style="margin-top:18px"></div>');
    body.appendChild(listWrap);

    function drawList() {
      notes = load();
      listWrap.innerHTML = "";
      var head = U.el('<div class="spread"><h3 style="margin:0">Collected notes (' + notes.length + ")</h3></div>");
      listWrap.appendChild(head);
      if (notes.length) {
        var actions = U.el('<div class="row-flex" style="margin:8px 0">');
        var mail = U.el('<a class="btn sm primary">✉️ Email all notes</a>');
        mail.href = "mailto:" + OWNER_EMAIL + "?subject=" + encodeURIComponent("AtriaERP Beta Feedback (" + notes.length + " notes)") +
          "&body=" + encodeURIComponent(notes.map(function (n, i) { return (i + 1) + ". [" + n.type + " · " + n.screen + " · " + n.on + "] " + n.note; }).join("\n\n"));
        var clear = U.el('<button class="btn sm danger">Clear</button>');
        clear.onclick = function () { U.confirmDialog("Delete all saved feedback notes?", function () { save([]); drawList(); }, "Clear"); };
        actions.appendChild(mail); actions.appendChild(clear); listWrap.appendChild(actions);
      }
      var ul = U.el('<ul class="list-plain"></ul>');
      notes.slice().reverse().forEach(function (n) {
        ul.appendChild(U.el('<li><span class="dotmark" style="background:' + (n.type === "Bug" ? "#dc2626" : "#1f6feb") + '"></span><div><div>' + U.esc(n.note) + '</div><small class="muted">' + U.esc(n.type) + " • " + U.esc(n.screen) + " • " + U.esc(n.on) + "</small></div></li>"));
      });
      if (!notes.length) ul.appendChild(U.el('<li class="muted">No notes yet.</li>'));
      listWrap.appendChild(ul);
    }
    addBtn.onclick = function () {
      var note = form.querySelector("#fb_note").value.trim();
      if (!note) { U.Toast.show("Write a note first", "bad"); return; }
      notes = load();
      notes.push({ type: form.querySelector("#fb_type").value, screen: form.querySelector("#fb_screen").value, note: note, on: Store.todayISO() });
      save(notes); form.querySelector("#fb_note").value = ""; U.Toast.show("Note saved", "good"); drawList();
    };
    drawList();
    U.Modal.open("📝 Beta Feedback", body);
  }

  function mount() {
    if (document.getElementById("fbBtn")) return;
    var btn = U.el('<button id="fbBtn" class="fb-fab" title="Send beta feedback">💬 Feedback</button>');
    btn.onclick = open;
    document.body.appendChild(btn);
  }

  global.Feedback = { mount: mount, open: open };
})(window);
