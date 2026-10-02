/* Saroj Classes - admin app. All data is stored on this phone (localStorage). */
(function () {
  'use strict';

  // ---------- storage ----------
  var KEY = 'saroj_classes_db_v1';
  var db = load();
  function blank() { return { pin: '', students: [], payments: [], tests: [], homework: [], feeSent: {} }; }
  function load() {
    try { var d = JSON.parse(localStorage.getItem(KEY)); if (d && d.students) return Object.assign(blank(), d); } catch (e) {}
    return blank();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('Could not save - storage full?'); } }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  // ---------- helpers ----------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function isoDate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return isoDate(new Date()); }
  function monthKey(iso) { return iso.slice(0, 7); }
  function fmtDate(iso) { if (!iso) return ''; var p = iso.split('-'); var m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; return +p[2] + ' ' + m[+p[1] - 1] + ' ' + p[0]; }
  function fmtMonth(k) { var p = k.split('-'); var m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; return m[+p[1] - 1] + ' ' + p[0]; }
  function inr(n) { return '₹' + Number(n || 0).toLocaleString('en-IN'); }
  function monthsRange(from, to) { var out = [], y = +from.slice(0, 4), m = +from.slice(5, 7), ty = +to.slice(0, 4), tm = +to.slice(5, 7); while (y < ty || (y === ty && m <= tm)) { out.push(y + '-' + pad(m)); m++; if (m > 12) { m = 1; y++; } } return out; }
  function initial(n) { return (n || '?').trim().charAt(0).toUpperCase(); }
  function phoneFor(raw) { var d = String(raw || '').replace(/\D/g, ''); if (d.length === 10) d = '91' + d; return d; }
  function studentById(id) { return db.students.find(function (s) { return s.id === id; }); }
  var STANDARDS = ['Nursery/KG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];
  var CLASS_NAME = 'Saroj Classes';

  var toastT;
  function toast(msg) { var t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2200); }

  // ---------- fees ----------
  function paidMonths(sid) { var s = {}; db.payments.forEach(function (p) { if (p.sid === sid) s[p.month] = (s[p.month] || 0) + Number(p.amount); }); return s; }
  function dueMonths(st) {
    var now = today(), cur = monthKey(now), day = +now.slice(8, 10), paid = paidMonths(st.id);
    var fee = Number(st.fee) || 0;
    return monthsRange(monthKey(st.joined), cur).filter(function (mk) {
      if (paid[mk] >= fee) return false;
      return mk < cur || day >= (+st.dueDay || 1);
    }).map(function (mk) { return { month: mk, amount: Math.max(fee - (paid[mk] || 0), 0) }; });
  }
  function feeStatus(st) {
    var d = dueMonths(st), cur = monthKey(today()), paid = paidMonths(st.id);
    if (d.length) return { cls: 'bad', label: d.length > 1 ? d.length + ' months due' : 'Due', total: d.reduce(function (a, b) { return a + b.amount; }, 0), due: d };
    if (paid[cur] >= (Number(st.fee) || 0)) return { cls: 'ok', label: 'Paid', total: 0, due: [] };
    return { cls: 'warn', label: 'Upcoming', total: 0, due: [] };
  }

  // ---------- reminders (computed) ----------
  function recipients(st) {
    var r = [];
    if ((st.notify === 'father' || st.notify === 'both') && st.fatherPhone) r.push({ who: st.fatherName || 'Father', phone: st.fatherPhone });
    if ((st.notify === 'mother' || st.notify === 'both') && st.motherPhone) r.push({ who: st.motherName || 'Mother', phone: st.motherPhone });
    if (!r.length) { if (st.fatherPhone) r.push({ who: st.fatherName || 'Father', phone: st.fatherPhone }); else if (st.motherPhone) r.push({ who: st.motherName || 'Mother', phone: st.motherPhone }); }
    return r;
  }
  function daysSince(iso) { return Math.floor((new Date(today()) - new Date(iso)) / 86400000); }
  function buildReminders() {
    var out = [];
    db.students.forEach(function (st) {
      var fs = feeStatus(st);
      if (fs.due.length) {
        var last = db.feeSent[st.id];
        if (!last || daysSince(last) >= 7) {
          var months = fs.due.map(function (d) { return fmtMonth(d.month); }).join(', ');
          out.push({ id: 'fee-' + st.id, type: 'fee', sid: st.id, icon: '💰', label: 'Fee due ' + inr(fs.total),
            text: 'Dear Parent,\nThis is a gentle reminder from ' + CLASS_NAME + ' that the tuition fee of ' + inr(fs.total) + ' for ' + st.name + ' (' + st.std + ') is pending for ' + months + '.\nKindly pay at the earliest. If already paid, please ignore this message.\nThank you.' });
        }
      }
    });
    db.tests.forEach(function (t) {
      var st = studentById(t.sid); if (!st || t.sent) return;
      var pct = t.max ? Math.round(t.got / t.max * 100) : 0;
      out.push({ id: 'test-' + t.id, type: 'test', sid: st.id, icon: '📝', label: t.subject + ' test: ' + t.got + '/' + t.max,
        text: 'Dear Parent,\n' + st.name + ' (' + st.std + ') scored ' + t.got + '/' + t.max + ' (' + pct + '%) in the ' + t.subject + ' test "' + t.title + '" held on ' + fmtDate(t.date) + '.\n- ' + CLASS_NAME });
    });
    db.homework.forEach(function (h) {
      db.students.forEach(function (st) {
        if (st.std !== h.std || (h.sentTo || []).indexOf(st.id) >= 0) return;
        out.push({ id: 'hw-' + h.id + '-' + st.id, type: 'hw', sid: st.id, hid: h.id, icon: '📚', label: h.subject + ' homework',
          text: 'Dear Parent,\nHomework for ' + st.name + ' (' + st.std + ')\nSubject: ' + h.subject + '\n' + h.text + (h.due ? '\nSubmit by: ' + fmtDate(h.due) : '') + '\n- ' + CLASS_NAME });
      });
    });
    return out;
  }
  function markSent(r) {
    if (r.type === 'fee') db.feeSent[r.sid] = today();
    else if (r.type === 'test') { var t = db.tests.find(function (x) { return 'test-' + x.id === r.id; }); if (t) t.sent = true; }
    else if (r.type === 'hw') { var h = db.homework.find(function (x) { return x.id === r.hid; }); if (h) { h.sentTo = h.sentTo || []; h.sentTo.push(r.sid); } }
    save();
  }

  // ---------- native bits ----------
  function plugin(n) { try { return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins[n]; } catch (e) { return null; } }
  function openWhatsApp(phone, text) {
    var url = 'https://wa.me/' + phoneFor(phone) + '?text=' + encodeURIComponent(text);
    window.open(url, '_system');
  }
  function scheduleDaily() {
    var LN = plugin('LocalNotifications'); if (!LN) return;
    LN.requestPermissions().then(function (p) {
      if (p.display !== 'granted') return;
      return LN.cancel({ notifications: [{ id: 1 }] }).catch(function () {}).then(function () {
        return LN.schedule({ notifications: [{ id: 1, title: 'Saroj Classes', body: 'Check pending fee, test and homework reminders for parents.', schedule: { on: { hour: 18, minute: 0 }, allowWhileIdle: true } }] });
      });
    }).catch(function () {});
  }

  // ---------- state ----------
  var ui = { tab: 'home', locked: true, sheet: null, q: '', stdFilter: 'All', feeFilter: 'due', learn: 'tests', remFilter: 'all' };

  // ---------- views ----------
  var root = document.getElementById('app');
  function render() {
    if (ui.locked) { root.innerHTML = lockView(); return; }
    var pending = buildReminders();
    var titles = { home: ['Saroj Classes', 'Welcome back, Admin'], students: ['Students', db.students.length + ' enrolled'], fees: ['Fees', 'Monthly fee tracking'], learn: ['Tests & Homework', 'Keep parents updated'], reminders: ['Reminders', pending.length + ' to send'] };
    var t = titles[ui.tab];
    var body = ({ home: homeView, students: studentsView, fees: feesView, learn: learnView, reminders: function () { return remindersView(pending); } })[ui.tab](pending);
    var fab = (ui.tab === 'students' || ui.tab === 'learn') ? '<button class="fab" data-act="add">+</button>' : '';
    var nav = [['home', '🏠', 'Home'], ['students', '🎓', 'Students'], ['fees', '💰', 'Fees'], ['learn', '📝', 'Learn'], ['reminders', '🔔', 'Reminders']].map(function (n) {
      return '<button class="' + (ui.tab === n[0] ? 'on' : '') + '" data-tab="' + n[0] + '"><span class="ic">' + n[1] + '</span>' + n[2] + (n[0] === 'reminders' && pending.length ? '<span class="badge">' + pending.length + '</span>' : '') + '</button>';
    }).join('');
    root.innerHTML = '<header class="top"><h1>' + esc(t[0]) + '</h1><p>' + esc(t[1]) + '</p></header><main>' + body + '</main>' + fab + '<nav class="bottom">' + nav + '</nav>' + (ui.sheet ? sheetView() : '');
  }

  function lockView() {
    var first = !db.pin;
    return '<div class="lock"><div class="logo">S</div><h1>Saroj Classes</h1><p>' + (first ? 'Create a 4-digit PIN to protect your data' : 'Enter your PIN') + '</p>' +
      '<input id="pin" type="password" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="••••">' +
      '<button class="btn" style="background:#fff;color:#4F46E5" data-act="unlock">' + (first ? 'Set PIN' : 'Unlock') + '</button></div>';
  }

  function homeView(pending) {
    var dueList = db.students.map(function (s) { return feeStatus(s); });
    var dueCount = dueList.filter(function (f) { return f.cls === 'bad'; }).length;
    var dueAmt = dueList.reduce(function (a, f) { return a + f.total; }, 0);
    var cur = monthKey(today());
    var coll = db.payments.filter(function (p) { return monthKey(p.date) === cur; }).reduce(function (a, p) { return a + Number(p.amount); }, 0);
    var h = '<div class="grid2"><div class="stat"><b>' + db.students.length + '</b><span>Total students</span></div>' +
      '<div class="stat ok"><b>' + inr(coll) + '</b><span>Collected this month</span></div>' +
      '<div class="stat bad"><b>' + dueCount + '</b><span>Fees due (' + inr(dueAmt) + ')</span></div>' +
      '<div class="stat warn"><b>' + pending.length + '</b><span>Reminders to send</span></div></div>';
    h += '<div class="sec">Quick actions</div><div class="card"><div class="grid2">' +
      '<button class="btn" data-act="add-student">+ New student</button><button class="btn ghost" data-act="go-rem">Send reminders</button>' +
      '<button class="btn ghost" data-act="add-test">+ Test marks</button><button class="btn ghost" data-act="add-hw">+ Homework</button></div></div>';
    var byStd = {}; db.students.forEach(function (s) { byStd[s.std] = (byStd[s.std] || 0) + 1; });
    var keys = Object.keys(byStd);
    if (keys.length) h += '<div class="sec">Students by class</div><div class="card">' + keys.sort().map(function (k) { return '<div class="row" style="padding:5px 0"><div class="grow">' + esc(k) + '</div><span class="pill info">' + byStd[k] + '</span></div>'; }).join('') + '</div>';
    h += '<div class="sec">Settings</div><div class="card"><div class="grid2"><button class="btn ghost" data-act="backup">Backup data</button><button class="btn ghost" data-act="restore">Restore</button><button class="btn ghost" data-act="chpin">Change PIN</button><button class="btn danger" data-act="lock">Lock app</button></div><p class="sub" style="margin:10px 0 0">Daily alert at 6 PM reminds you to send pending messages. Data is stored on this phone, so take a backup regularly.</p></div>';
    return h;
  }

  function studentsView() {
    var chips = '<div class="chips">' + ['All'].concat(STANDARDS).map(function (s) { return '<button data-std="' + esc(s) + '" class="' + (ui.stdFilter === s ? 'on' : '') + '">' + esc(s) + '</button>'; }).join('') + '</div>';
    var q = ui.q.toLowerCase();
    var list = db.students.filter(function (s) { return (ui.stdFilter === 'All' || s.std === ui.stdFilter) && (!q || (s.name + ' ' + s.school).toLowerCase().indexOf(q) >= 0); })
      .sort(function (a, b) { return a.name.localeCompare(b.name); });
    var h = '<input class="search" id="q" placeholder="Search name or school" value="' + esc(ui.q) + '">' + chips;
    if (!list.length) return h + '<div class="empty"><div class="big">🎓</div><p>' + (db.students.length ? 'No students match.' : 'No students yet.<br>Tap + to enroll your first student.') + '</p></div>';
    return h + list.map(function (s) {
      var f = feeStatus(s);
      return '<div class="card row" data-act="view-student" data-id="' + s.id + '"><div class="avatar">' + esc(initial(s.name)) + '</div><div class="grow"><div class="title">' + esc(s.name) + '</div><div class="sub">' + esc(s.std) + ' · ' + esc(s.school) + '</div></div><span class="pill ' + f.cls + '">' + f.label + '</span></div>';
    }).join('');
  }

  function feesView() {
    var chips = '<div class="chips">' + [['due', 'Due'], ['paid', 'Paid'], ['all', 'All']].map(function (c) { return '<button data-ff="' + c[0] + '" class="' + (ui.feeFilter === c[0] ? 'on' : '') + '">' + c[1] + '</button>'; }).join('') + '</div>';
    var list = db.students.map(function (s) { return { s: s, f: feeStatus(s) }; }).filter(function (x) { return ui.feeFilter === 'all' || (ui.feeFilter === 'due' ? x.f.cls === 'bad' : x.f.cls === 'ok'); });
    if (!list.length) return chips + '<div class="empty"><div class="big">' + (ui.feeFilter === 'due' ? '🎉' : '💰') + '</div><p>' + (db.students.length ? 'Nothing here.' : 'Add students to track fees.') + '</p></div>';
    return chips + list.map(function (x) {
      return '<div class="card"><div class="row"><div class="avatar">' + esc(initial(x.s.name)) + '</div><div class="grow"><div class="title">' + esc(x.s.name) + '</div><div class="sub">' + esc(x.s.std) + ' · ' + inr(x.s.fee) + '/month · due on ' + x.s.dueDay + 'th</div></div><span class="pill ' + x.f.cls + '">' + x.f.label + '</span></div>' +
        (x.f.total ? '<div class="sub" style="margin-top:8px">Pending: <b style="color:var(--bad)">' + inr(x.f.total) + '</b> (' + x.f.due.map(function (d) { return fmtMonth(d.month); }).join(', ') + ')</div>' : '') +
        '<div style="margin-top:10px" class="row"><button class="btn sm grow" data-act="pay" data-id="' + x.s.id + '">Record payment</button></div></div>';
    }).join('');
  }

  function learnView() {
    var seg = '<div class="chips"><button data-lr="tests" class="' + (ui.learn === 'tests' ? 'on' : '') + '">Test marks</button><button data-lr="hw" class="' + (ui.learn === 'hw' ? 'on' : '') + '">Homework</button></div>';
    if (ui.learn === 'tests') {
      var l = db.tests.slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
      if (!l.length) return seg + '<div class="empty"><div class="big">📝</div><p>No test marks yet. Tap + to add.</p></div>';
      return seg + l.map(function (t) { var s = studentById(t.sid); var pct = t.max ? Math.round(t.got / t.max * 100) : 0; return '<div class="card row"><div class="grow"><div class="title">' + esc(s ? s.name : 'Deleted') + '</div><div class="sub">' + esc(t.subject) + ' · ' + esc(t.title) + ' · ' + fmtDate(t.date) + '</div></div><div style="text-align:right"><b>' + t.got + '/' + t.max + '</b><br><span class="pill ' + (pct >= 60 ? 'ok' : pct >= 40 ? 'warn' : 'bad') + '">' + pct + '%</span></div></div>'; }).join('');
    }
    var hl = db.homework.slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
    if (!hl.length) return seg + '<div class="empty"><div class="big">📚</div><p>No homework yet. Tap + to add.</p></div>';
    return seg + hl.map(function (h) {
      var n = db.students.filter(function (s) { return s.std === h.std; }).length, sent = (h.sentTo || []).length;
      return '<div class="card"><div class="row"><div class="grow"><div class="title">' + esc(h.subject) + ' · ' + esc(h.std) + '</div><div class="sub">Given ' + fmtDate(h.date) + (h.due ? ' · due ' + fmtDate(h.due) : '') + '</div></div><span class="pill ' + (sent >= n && n ? 'ok' : 'warn') + '">' + sent + '/' + n + ' sent</span></div><div style="margin-top:8px;white-space:pre-wrap">' + esc(h.text) + '</div><div style="margin-top:10px"><button class="btn danger sm" data-act="del-hw" data-id="' + h.id + '">Delete</button></div></div>';
    }).join('');
  }

  function remindersView(pending) {
    var chips = '<div class="chips">' + [['all', 'All'], ['fee', 'Fees'], ['test', 'Tests'], ['hw', 'Homework']].map(function (c) { return '<button data-rf="' + c[0] + '" class="' + (ui.remFilter === c[0] ? 'on' : '') + '">' + c[1] + '</button>'; }).join('') + '</div>';
    var list = pending.filter(function (r) { return ui.remFilter === 'all' || r.type === ui.remFilter; });
    if (!list.length) return chips + '<div class="empty"><div class="big">✅</div><p>All caught up! No reminders pending.</p></div>';
    return '<p class="sub" style="margin:0 4px 10px">Tap Send to open WhatsApp with the message ready. It is marked as sent once you tap.</p>' + chips + list.map(function (r) {
      var st = studentById(r.sid), rec = recipients(st);
      return '<div class="card"><div class="row"><div style="font-size:24px">' + r.icon + '</div><div class="grow"><div class="title">' + esc(st.name) + '</div><div class="sub">' + esc(r.label) + '</div></div></div><div class="msg">' + esc(r.text) + '</div>' +
        (rec.length ? '<div class="row" style="flex-wrap:wrap">' + rec.map(function (p, i) { return '<button class="btn wa sm" data-act="send" data-rid="' + esc(r.id) + '" data-i="' + i + '">Send to ' + esc(p.who) + '</button>'; }).join('') + '<button class="btn ghost sm" data-act="skip" data-rid="' + esc(r.id) + '">Mark done</button></div>' : '<div class="sub" style="color:var(--bad)">No parent phone number saved.</div>') + '</div>';
    }).join('');
  }

  // ---------- sheets (forms) ----------
  function opt(list, sel) { return list.map(function (v) { var val = Array.isArray(v) ? v[0] : v, lab = Array.isArray(v) ? v[1] : v; return '<option value="' + esc(val) + '"' + (val === sel ? ' selected' : '') + '>' + esc(lab) + '</option>'; }).join(''); }
  function sheetView() {
    var s = ui.sheet, h = '';
    if (s.type === 'student') {
      var e = s.data || {};
      h = '<h2>' + (e.id ? 'Edit student' : 'Enroll new student') + '</h2>' +
        '<label>Student name *</label><input id="f_name" value="' + esc(e.name) + '">' +
        '<div class="grid2"><div><label>Standard *</label><select id="f_std">' + opt(STANDARDS, e.std || 'Class 5') + '</select></div><div><label>Joined on *</label><input id="f_joined" type="date" value="' + esc(e.joined || today()) + '"></div></div>' +
        '<label>School *</label><input id="f_school" value="' + esc(e.school) + '">' +
        '<div class="grid2"><div><label>Monthly fee (₹) *</label><input id="f_fee" type="number" inputmode="numeric" value="' + esc(e.fee) + '"></div><div><label>Fee due day (1-28)</label><input id="f_dueDay" type="number" inputmode="numeric" min="1" max="28" value="' + esc(e.dueDay || 5) + '"></div></div>' +
        '<div class="sec">Parents</div><div class="grid2"><div><label>Father name</label><input id="f_fn" value="' + esc(e.fatherName) + '"></div><div><label>Father phone</label><input id="f_fp" type="tel" inputmode="tel" value="' + esc(e.fatherPhone) + '"></div>' +
        '<div><label>Mother name</label><input id="f_mn" value="' + esc(e.motherName) + '"></div><div><label>Mother phone</label><input id="f_mp" type="tel" inputmode="tel" value="' + esc(e.motherPhone) + '"></div></div>' +
        '<label>Send reminders to</label><select id="f_notify">' + opt([['father', 'Father'], ['mother', 'Mother'], ['both', 'Both parents']], e.notify || 'father') + '</select>' +
        '<div class="row" style="margin-top:16px"><button class="btn grow" data-act="save-student">Save</button><button class="btn ghost" data-act="close">Cancel</button></div>';
    } else if (s.type === 'student-view') {
      var st = studentById(s.id), f = feeStatus(st);
      h = '<div class="row"><div class="avatar" style="width:52px;height:52px;font-size:22px">' + esc(initial(st.name)) + '</div><div class="grow"><h2>' + esc(st.name) + '</h2><div class="sub">' + esc(st.std) + ' · ' + esc(st.school) + '</div></div></div>' +
        '<div class="card" style="margin:14px 0 8px"><div class="sub">Joined: <b>' + fmtDate(st.joined) + '</b></div><div class="sub">Fee: <b>' + inr(st.fee) + '/month</b> (due on ' + st.dueDay + 'th) <span class="pill ' + f.cls + '">' + f.label + '</span></div></div>' +
        '<div class="card" style="margin-bottom:8px"><div class="sub">Father: <b>' + esc(st.fatherName || '-') + '</b> ' + (st.fatherPhone ? '<a href="tel:' + esc(st.fatherPhone) + '">' + esc(st.fatherPhone) + '</a>' : '') + '</div><div class="sub" style="margin-top:4px">Mother: <b>' + esc(st.motherName || '-') + '</b> ' + (st.motherPhone ? '<a href="tel:' + esc(st.motherPhone) + '">' + esc(st.motherPhone) + '</a>' : '') + '</div><div class="sub" style="margin-top:4px">Reminders go to: <b>' + esc(st.notify) + '</b></div></div>' +
        '<div class="grid2" style="margin-top:12px"><button class="btn" data-act="pay" data-id="' + st.id + '">Record payment</button><button class="btn ghost" data-act="edit-student" data-id="' + st.id + '">Edit</button><button class="btn danger" data-act="del-student" data-id="' + st.id + '">Delete</button><button class="btn ghost" data-act="close">Close</button></div>';
    } else if (s.type === 'pay') {
      var p = studentById(s.id), dm = dueMonths(p), defMonth = dm.length ? dm[0].month : monthKey(today()), defAmt = dm.length ? dm[0].amount : p.fee;
      var months = monthsRange(monthKey(p.joined), monthKey(today()));
      h = '<h2>Record payment</h2><div class="sub">' + esc(p.name) + ' · ' + esc(p.std) + '</div>' +
        '<label>For month</label><select id="f_month">' + opt(months.map(function (m) { return [m, fmtMonth(m)]; }), defMonth) + '</select>' +
        '<label>Amount received (₹)</label><input id="f_amt" type="number" inputmode="numeric" value="' + esc(defAmt) + '">' +
        '<label>Date received</label><input id="f_date" type="date" value="' + today() + '">' +
        '<div class="row" style="margin-top:16px"><button class="btn grow" data-act="save-pay" data-id="' + p.id + '">Save payment</button><button class="btn ghost" data-act="close">Cancel</button></div>';
    } else if (s.type === 'test') {
      h = '<h2>Add test marks</h2>' + (db.students.length ? '<label>Student *</label><select id="f_sid">' + opt(db.students.map(function (x) { return [x.id, x.name + ' (' + x.std + ')']; })) + '</select>' +
        '<div class="grid2"><div><label>Subject *</label><input id="f_sub" placeholder="Maths"></div><div><label>Test name</label><input id="f_title" placeholder="Unit Test 1"></div>' +
        '<div><label>Marks obtained *</label><input id="f_got" type="number" step="0.5" inputmode="decimal"></div><div><label>Out of *</label><input id="f_max" type="number" inputmode="numeric" value="25"></div></div>' +
        '<label>Test date</label><input id="f_date" type="date" value="' + today() + '">' +
        '<div class="row" style="margin-top:16px"><button class="btn grow" data-act="save-test">Save</button><button class="btn ghost" data-act="close">Cancel</button></div>' : '<p class="empty">Enroll a student first.</p><button class="btn block" data-act="close">OK</button>');
    } else if (s.type === 'hw') {
      h = '<h2>Add homework</h2><div class="sub">Reminder is created for every student in the class.</div>' +
        '<label>Standard *</label><select id="f_std">' + opt(STANDARDS, 'Class 5') + '</select>' +
        '<label>Subject *</label><input id="f_sub" placeholder="Science">' +
        '<label>Homework details *</label><textarea id="f_text" rows="4" placeholder="Chapter 3 exercise 1 to 5"></textarea>' +
        '<label>Submit by</label><input id="f_due" type="date">' +
        '<div class="row" style="margin-top:16px"><button class="btn grow" data-act="save-hw">Save</button><button class="btn ghost" data-act="close">Cancel</button></div>';
    } else if (s.type === 'backup') {
      h = '<h2>Backup</h2><p class="sub">Copy this text and save it somewhere safe (e.g. WhatsApp to yourself or Google Keep).</p><textarea id="f_data" rows="8" readonly>' + esc(JSON.stringify(Object.assign({}, db, { pin: '' }))) + '</textarea>' +
        '<div class="row" style="margin-top:14px"><button class="btn grow" data-act="share-backup">Share / Copy</button><button class="btn ghost" data-act="close">Close</button></div>';
    } else if (s.type === 'restore') {
      h = '<h2>Restore</h2><p class="sub">Paste your backup text. This replaces current data.</p><textarea id="f_data" rows="8"></textarea>' +
        '<div class="row" style="margin-top:14px"><button class="btn grow" data-act="do-restore">Restore</button><button class="btn ghost" data-act="close">Cancel</button></div>';
    } else if (s.type === 'chpin') {
      h = '<h2>Change PIN</h2><label>New 4-digit PIN</label><input id="f_pin" type="password" inputmode="numeric" maxlength="4"><div class="row" style="margin-top:16px"><button class="btn grow" data-act="save-pin">Save</button><button class="btn ghost" data-act="close">Cancel</button></div>';
    }
    return '<div class="sheet-bg" data-act="bg"><div class="sheet">' + h + '</div></div>';
  }

  // ---------- actions ----------
  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
  function open(type, extra) { ui.sheet = Object.assign({ type: type }, extra || {}); render(); }
  function close() { ui.sheet = null; render(); }

  function act(a, el) {
    var id = el && el.dataset.id;
    switch (a) {
      case 'unlock': {
        var p = val('pin');
        if (!/^\d{4}$/.test(p)) return toast('Enter exactly 4 digits');
        if (!db.pin) { db.pin = p; save(); } else if (db.pin !== p) return toast('Wrong PIN');
        ui.locked = false; render(); scheduleDaily(); return;
      }
      case 'lock': ui.locked = true; ui.sheet = null; return render();
      case 'add': if (ui.tab === 'students') return open('student', { data: {} }); return open(ui.learn === 'tests' ? 'test' : 'hw');
      case 'add-student': return open('student', { data: {} });
      case 'add-test': return open('test');
      case 'add-hw': return open('hw');
      case 'go-rem': ui.tab = 'reminders'; return render();
      case 'bg': if (el === event.target) close(); return;
      case 'close': return close();
      case 'view-student': return open('student-view', { id: id });
      case 'edit-student': return open('student', { data: studentById(id) });
      case 'pay': return open('pay', { id: id });
      case 'save-student': {
        var d = { name: val('f_name'), std: val('f_std'), school: val('f_school'), joined: val('f_joined'), fee: val('f_fee'), dueDay: val('f_dueDay') || '5', fatherName: val('f_fn'), fatherPhone: val('f_fp'), motherName: val('f_mn'), motherPhone: val('f_mp'), notify: val('f_notify') };
        if (!d.name || !d.school || !d.joined || !d.fee) return toast('Fill name, school, join date and fee');
        if (!d.fatherPhone && !d.motherPhone) return toast('Add at least one parent phone');
        [d.fatherPhone, d.motherPhone].forEach(function (x) { if (x && phoneFor(x).length < 11) d.bad = true; });
        if (d.bad) return toast('Phone should be 10 digits');
        delete d.bad;
        var ex = ui.sheet.data && ui.sheet.data.id;
        if (ex) Object.assign(studentById(ex), d); else db.students.push(Object.assign({ id: uid() }, d));
        save(); toast(ex ? 'Student updated' : 'Student enrolled'); return close();
      }
      case 'del-student':
        if (!confirm('Delete this student and all their fees and marks?')) return;
        db.students = db.students.filter(function (s) { return s.id !== id; });
        db.payments = db.payments.filter(function (p) { return p.sid !== id; });
        db.tests = db.tests.filter(function (t) { return t.sid !== id; });
        save(); toast('Deleted'); return close();
      case 'save-pay': {
        var amt = Number(val('f_amt')); if (!(amt > 0)) return toast('Enter amount');
        db.payments.push({ id: uid(), sid: id, month: val('f_month'), amount: amt, date: val('f_date') || today() });
        save(); toast('Payment recorded'); return close();
      }
      case 'save-test': {
        var t = { id: uid(), sid: val('f_sid'), subject: val('f_sub'), title: val('f_title') || 'Class test', date: val('f_date') || today(), got: Number(val('f_got')), max: Number(val('f_max')), sent: false };
        if (!t.sid || !t.subject || val('f_got') === '' || !(t.max > 0)) return toast('Fill student, subject and marks');
        if (t.got > t.max) return toast('Marks cannot exceed total');
        db.tests.push(t); save(); toast('Saved - reminder created'); return close();
      }
      case 'save-hw': {
        var hw = { id: uid(), std: val('f_std'), subject: val('f_sub'), text: val('f_text'), due: val('f_due'), date: today(), sentTo: [] };
        if (!hw.subject || !hw.text) return toast('Enter subject and details');
        db.homework.push(hw); save(); toast('Saved - reminders created'); return close();
      }
      case 'del-hw': if (confirm('Delete this homework?')) { db.homework = db.homework.filter(function (h) { return h.id !== id; }); save(); render(); } return;
      case 'send': case 'skip': {
        var r = buildReminders().find(function (x) { return x.id === el.dataset.rid; }); if (!r) return;
        if (a === 'send') { var rec = recipients(studentById(r.sid))[+el.dataset.i]; openWhatsApp(rec.phone, r.text); }
        markSent(r); toast(a === 'send' ? 'Opening WhatsApp...' : 'Marked done'); return render();
      }
      case 'backup': return open('backup');
      case 'restore': return open('restore');
      case 'chpin': return open('chpin');
      case 'save-pin': { var np = val('f_pin'); if (!/^\d{4}$/.test(np)) return toast('Enter 4 digits'); db.pin = np; save(); toast('PIN changed'); return close(); }
      case 'share-backup': {
        var txt = document.getElementById('f_data').value, Sh = plugin('Share');
        if (Sh) Sh.share({ title: 'Saroj Classes backup', text: txt }).catch(function () {});
        else { try { navigator.clipboard.writeText(txt); toast('Copied'); } catch (e) { toast('Select and copy the text'); } }
        return;
      }
      case 'do-restore': {
        try { var d2 = JSON.parse(val('f_data')); if (!d2.students || !d2.payments) throw 0; if (!confirm('Replace all current data?')) return; d2.pin = db.pin; db = Object.assign(blank(), d2); save(); toast('Restored'); close(); } catch (e) { toast('Invalid backup text'); }
        return;
      }
    }
  }

  // ---------- events ----------
  root.addEventListener('click', function (e) {
    var t = e.target.closest('[data-tab],[data-act],[data-std],[data-ff],[data-lr],[data-rf]'); if (!t) return;
    if (t.dataset.tab) { ui.tab = t.dataset.tab; ui.sheet = null; return render(); }
    if (t.dataset.std) { ui.stdFilter = t.dataset.std; return render(); }
    if (t.dataset.ff) { ui.feeFilter = t.dataset.ff; return render(); }
    if (t.dataset.lr) { ui.learn = t.dataset.lr; return render(); }
    if (t.dataset.rf) { ui.remFilter = t.dataset.rf; return render(); }
    if (t.dataset.act) { window.event = e; act(t.dataset.act, t); }
  });
  root.addEventListener('input', function (e) {
    if (e.target.id === 'q') { ui.q = e.target.value; var pos = e.target.selectionStart; render(); var q = document.getElementById('q'); q.focus(); q.setSelectionRange(pos, pos); }
  });
  root.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.id === 'pin') act('unlock'); });

  render();
})();
