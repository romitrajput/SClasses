/* Saroj Classes - admin app. All data is stored on this phone (localStorage). */
(function () {
  'use strict';

  // ---------- storage ----------
  var KEY = 'saroj_classes_db_v1';
  var db = load();
  function blank() {
    return { pin: '', students: [], payments: [], tests: [], homework: [], attendance: {}, feeSent: {}, absentSent: {}, reportSent: {}, bdaySent: {},
      settings: { className: 'Saroj Classes', lang: 'en', feeRepeatDays: 7 } };
  }
  function load() {
    try { var d = JSON.parse(localStorage.getItem(KEY)); if (d && d.students) { var b = blank(); var m = Object.assign(b, d); m.settings = Object.assign(b.settings, d.settings || {}); return m; } } catch (e) {}
    return blank();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('Could not save - storage full?'); } }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  // ---------- helpers ----------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function isoDate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return isoDate(new Date()); }
  function addDays(iso, n) { var d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return isoDate(d); }
  function monthKey(iso) { return iso.slice(0, 7); }
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtDate(iso) { if (!iso) return ''; var p = iso.split('-'); return +p[2] + ' ' + MON[+p[1] - 1] + ' ' + p[0]; }
  function fmtMonth(k) { var p = k.split('-'); return MON[+p[1] - 1] + ' ' + p[0]; }
  function prevMonthKey(iso) { var y = +iso.slice(0, 4), m = +iso.slice(5, 7) - 1; if (m < 1) { m = 12; y--; } return y + '-' + pad(m); }
  function inr(n) { return '\u20B9' + Number(n || 0).toLocaleString('en-IN'); }
  function monthsRange(from, to) { var out = [], y = +from.slice(0, 4), m = +from.slice(5, 7), ty = +to.slice(0, 4), tm = +to.slice(5, 7); while (y < ty || (y === ty && m <= tm)) { out.push(y + '-' + pad(m)); m++; if (m > 12) { m = 1; y++; } } return out; }
  function initial(n) { return (n || '?').trim().charAt(0).toUpperCase(); }
  function hue(n) { var h = 0; for (var i = 0; i < (n || '').length; i++) h = (h * 31 + n.charCodeAt(i)) % 360; return h; }
  function avatar(n, size) { var h = hue(n); return '<div class="avatar" style="background:hsl(' + h + ' 85% 92%);color:hsl(' + h + ' 55% 35%);' + (size ? 'width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * .42) + 'px' : '') + '">' + esc(initial(n)) + '</div>'; }
  function phoneFor(raw) { var d = String(raw || '').replace(/\D/g, ''); if (d.length === 10) d = '91' + d; return d; }
  function studentById(id) { return db.students.find(function (s) { return s.id === id; }); }
  function pct(a, b) { return b ? Math.round(a / b * 100) : 0; }
  var STANDARDS = ['Nursery/KG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];
  function CN() { return db.settings.className || 'Saroj Classes'; }
  function tr(en, hi) { return db.settings.lang === 'hi' ? hi : en; }

  var toastT;
  function toast(msg) { var t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2200); }

  // ---------- fees ----------
  function paidMonths(sid) { var s = {}; db.payments.forEach(function (p) { if (p.sid === sid) s[p.month] = (s[p.month] || 0) + Number(p.amount); }); return s; }
  function dueMonths(st) {
    var now = today(), cur = monthKey(now), day = +now.slice(8, 10), paid = paidMonths(st.id);
    var fee = Number(st.fee) || 0;
    return monthsRange(monthKey(st.joined), cur).filter(function (mk) {
      if ((paid[mk] || 0) >= fee) return false;
      return mk < cur || day >= (+st.dueDay || 1);
    }).map(function (mk) { return { month: mk, amount: Math.max(fee - (paid[mk] || 0), 0) }; });
  }
  function feeStatus(st) {
    var d = dueMonths(st), cur = monthKey(today()), paid = paidMonths(st.id);
    if (d.length) return { cls: 'bad', label: d.length > 1 ? d.length + ' months due' : 'Due', total: d.reduce(function (a, b) { return a + b.amount; }, 0), due: d };
    if ((paid[cur] || 0) >= (Number(st.fee) || 0)) return { cls: 'ok', label: 'Paid', total: 0, due: [] };
    return { cls: 'warn', label: 'Upcoming', total: 0, due: [] };
  }

  // ---------- attendance & marks ----------
  function attStats(sid, fromIso) {
    var p = 0, a = 0;
    Object.keys(db.attendance).forEach(function (d) { if (d >= fromIso) { var v = db.attendance[d][sid]; if (v === 'P') p++; else if (v === 'A') a++; } });
    return { p: p, a: a, total: p + a, pct: pct(p, p + a) };
  }
  function attStatsMonth(sid, mk) {
    var p = 0, a = 0;
    Object.keys(db.attendance).forEach(function (d) { if (monthKey(d) === mk) { var v = db.attendance[d][sid]; if (v === 'P') p++; else if (v === 'A') a++; } });
    return { p: p, a: a, total: p + a, pct: pct(p, p + a) };
  }
  function testsOf(sid) { return db.tests.filter(function (t) { return t.sid === sid; }).sort(function (a, b) { return a.date.localeCompare(b.date); }); }
  function tPct(t) { return t.max ? Math.round(t.got / t.max * 100) : 0; }
  function avgPct(list) { return list.length ? Math.round(list.reduce(function (a, t) { return a + tPct(t); }, 0) / list.length) : null; }

  function attention() {
    var out = [];
    db.students.forEach(function (st) {
      var r = [], f = feeStatus(st);
      if (f.due.length >= 2) r.push(['bad', f.due.length + ' months fee due']);
      var a = attStats(st.id, addDays(today(), -30));
      if (a.total >= 5 && a.pct < 75) r.push(['warn', 'Attendance ' + a.pct + '%']);
      var ts = testsOf(st.id);
      if (ts.length >= 3) { var last = tPct(ts[ts.length - 1]), prev = avgPct(ts.slice(0, -1)); if (last <= prev - 15) r.push(['warn', 'Marks dropped to ' + last + '%']); }
      if (r.length) out.push({ st: st, reasons: r });
    });
    return out;
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

  function progressText(st, mk) {
    var ts = testsOf(st.id).filter(function (t) { return monthKey(t.date) === mk; });
    var avg = avgPct(ts), at = attStatsMonth(st.id, mk), f = feeStatus(st);
    var feeLine = f.total ? tr('Pending ' + inr(f.total), '\u0936\u0947\u0937 ' + inr(f.total)) : tr('Paid up', '\u091C\u092E\u093E \u0939\u0948');
    return tr('Dear Parent,\nProgress report of ' + st.name + ' (' + st.std + ') for ' + fmtMonth(mk) + ':\nTests: ' + (avg === null ? 'no tests' : ts.length + ' held, average ' + avg + '%') + '\nAttendance: ' + (at.total ? at.pct + '% (' + at.p + ' of ' + at.total + ' days)' : 'not recorded') + '\nFees: ' + feeLine + '\nThank you for your support.\n- ' + CN(),
      '\u092A\u094D\u0930\u093F\u092F \u0905\u092D\u093F\u092D\u093E\u0935\u0915,\n' + st.name + ' (' + st.std + ') \u0915\u0940 ' + fmtMonth(mk) + ' \u0915\u0940 \u092A\u094D\u0930\u0917\u0924\u093F \u0930\u093F\u092A\u094B\u0930\u094D\u091F:\n\u091F\u0947\u0938\u094D\u091F: ' + (avg === null ? '\u0915\u094B\u0908 \u0928\u0939\u0940\u0902' : ts.length + ' \u0939\u0941\u090F, \u0914\u0938\u0924 ' + avg + '%') + '\n\u0909\u092A\u0938\u094D\u0925\u093F\u0924\u093F: ' + (at.total ? at.pct + '% (' + at.total + ' \u092E\u0947\u0902 \u0938\u0947 ' + at.p + ' \u0926\u093F\u0928)' : '\u0926\u0930\u094D\u091C \u0928\u0939\u0940\u0902') + '\n\u092B\u0940\u0938: ' + feeLine + '\n\u0927\u0928\u094D\u092F\u0935\u093E\u0926\u0964\n- ' + CN());
  }

  function buildReminders() {
    var out = [], now = today(), repeat = Number(db.settings.feeRepeatDays) || 7;
    db.students.forEach(function (st) {
      var fs = feeStatus(st);
      if (fs.due.length) {
        var last = db.feeSent[st.id];
        if (!last || daysSince(last) >= repeat) {
          var months = fs.due.map(function (d) { return fmtMonth(d.month); }).join(', ');
          out.push({ id: 'fee-' + st.id, type: 'fee', sid: st.id, icon: '\uD83D\uDCB0', label: 'Fee due ' + inr(fs.total),
            text: tr('Dear Parent,\nThis is a gentle reminder from ' + CN() + ' that the tuition fee of ' + inr(fs.total) + ' for ' + st.name + ' (' + st.std + ') is pending for ' + months + '.\nKindly pay at the earliest. If already paid, please ignore this message.\nThank you.',
              '\u092A\u094D\u0930\u093F\u092F \u0905\u092D\u093F\u092D\u093E\u0935\u0915,\n' + CN() + ' \u0915\u0940 \u0913\u0930 \u0938\u0947 \u0938\u094D\u092E\u0930\u0923: ' + st.name + ' (' + st.std + ') \u0915\u0940 ' + months + ' \u0915\u0940 \u091F\u094D\u092F\u0942\u0936\u0928 \u092B\u0940\u0938 ' + inr(fs.total) + ' \u092C\u0915\u093E\u092F\u093E \u0939\u0948\u0964\n\u0915\u0943\u092A\u092F\u093E \u091C\u0932\u094D\u0926 \u0938\u0947 \u091C\u0932\u094D\u0926 \u092D\u0941\u0917\u0924\u093E\u0928 \u0915\u0930\u0947\u0902\u0964 \u092F\u0926\u093F \u092D\u0941\u0917\u0924\u093E\u0928 \u0939\u094B \u091A\u0941\u0915\u093E \u0939\u0948 \u0924\u094B \u0907\u0938 \u0938\u0902\u0926\u0947\u0936 \u0915\u094B \u0905\u0928\u0926\u0947\u0916\u093E \u0915\u0930\u0947\u0902\u0964\n\u0927\u0928\u094D\u092F\u0935\u093E\u0926\u0964') });
        }
      }
      // birthday
      if (st.dob && st.dob.slice(5) === now.slice(5) && db.bdaySent[st.id] !== now.slice(0, 4)) {
        out.push({ id: 'bd-' + st.id, type: 'more', sub: 'bday', sid: st.id, icon: '\uD83C\uDF82', label: 'Birthday today',
          text: tr('Wishing ' + st.name + ' a very happy birthday! May the year ahead be full of joy and success.\n- ' + CN(), st.name + ' \u0915\u094B \u091C\u0928\u094D\u092E\u0926\u093F\u0928 \u0915\u0940 \u0939\u093E\u0930\u094D\u0926\u093F\u0915 \u0936\u0941\u092D\u0915\u093E\u092E\u0928\u093E\u090F\u0902! \u0906\u092A\u0915\u093E \u0906\u0928\u0947 \u0935\u093E\u0932\u093E \u0938\u093E\u0932 \u0916\u0941\u0936\u093F\u092F\u094B\u0902 \u0914\u0930 \u0938\u092B\u0932\u0924\u093E \u0938\u0947 \u092D\u0930\u093E \u0939\u094B\u0964 \uD83C\uDF82\n- ' + CN()) });
      }
      // monthly progress report for previous month
      var pm = prevMonthKey(now);
      if (!db.reportSent[st.id + '|' + pm] && monthKey(st.joined) <= pm && (testsOf(st.id).some(function (t) { return monthKey(t.date) === pm; }) || attStatsMonth(st.id, pm).total)) {
        out.push({ id: 'rep-' + st.id + '-' + pm, type: 'more', sub: 'report', sid: st.id, mk: pm, icon: '\uD83D\uDCCA', label: fmtMonth(pm) + ' progress report', text: progressText(st, pm) });
      }
    });
    db.payments.forEach(function (p) {
      var st = studentById(p.sid); if (!st || p.sent || p.noReceipt) return;
      var paid = paidMonths(st.id)[p.month] || 0, bal = Math.max((Number(st.fee) || 0) - paid, 0);
      out.push({ id: 'rcpt-' + p.id, type: 'more', sub: 'receipt', sid: st.id, pid: p.id, icon: '\uD83E\uDDFE', label: 'Receipt ' + inr(p.amount),
        text: tr('Dear Parent,\nReceived ' + inr(p.amount) + ' towards ' + st.name + "'s fee for " + fmtMonth(p.month) + ' on ' + fmtDate(p.date) + '.\n' + (bal ? 'Balance for this month: ' + inr(bal) + '.' : 'Fee for this month is fully paid.') + '\nThank you.\n- ' + CN(),
          '\u092A\u094D\u0930\u093F\u092F \u0905\u092D\u093F\u092D\u093E\u0935\u0915,\n' + st.name + ' \u0915\u0940 ' + fmtMonth(p.month) + ' \u0915\u0940 \u092B\u0940\u0938 \u0915\u0947 \u0932\u093F\u090F ' + inr(p.amount) + ' \u092A\u094D\u0930\u093E\u092A\u094D\u0924 \u0939\u0941\u090F (' + fmtDate(p.date) + ')\u0964\n' + (bal ? '\u0907\u0938 \u092E\u093E\u0939 \u0915\u093E \u0936\u0947\u0937: ' + inr(bal) + '\u0964' : '\u0907\u0938 \u092E\u093E\u0939 \u0915\u0940 \u092B\u0940\u0938 \u092A\u0942\u0930\u0940 \u091C\u092E\u093E \u0939\u0948\u0964') + '\n\u0927\u0928\u094D\u092F\u0935\u093E\u0926\u0964\n- ' + CN()) });
    });
    var since = addDays(now, -2);
    Object.keys(db.attendance).forEach(function (d) {
      if (d < since) return;
      Object.keys(db.attendance[d]).forEach(function (sid) {
        var st = studentById(sid); if (!st || db.attendance[d][sid] !== 'A' || db.absentSent[d + '|' + sid]) return;
        out.push({ id: 'abs-' + d + '-' + sid, type: 'absent', sid: sid, date: d, icon: '\uD83D\uDE4B', label: 'Absent on ' + fmtDate(d),
          text: tr('Dear Parent,\n' + st.name + ' (' + st.std + ') was absent from class on ' + fmtDate(d) + '. Please let us know the reason.\n- ' + CN(),
            '\u092A\u094D\u0930\u093F\u092F \u0905\u092D\u093F\u092D\u093E\u0935\u0915,\n' + st.name + ' (' + st.std + ') ' + fmtDate(d) + ' \u0915\u094B \u0915\u0915\u094D\u0937\u093E \u092E\u0947\u0902 \u0905\u0928\u0941\u092A\u0938\u094D\u0925\u093F\u0924 \u0930\u0939\u093E/\u0930\u0939\u0940\u0964 \u0915\u0943\u092A\u092F\u093E \u0915\u093E\u0930\u0923 \u092C\u0924\u093E\u090F\u0902\u0964\n- ' + CN()) });
      });
    });
    db.tests.forEach(function (t) {
      var st = studentById(t.sid); if (!st || t.sent) return;
      out.push({ id: 'test-' + t.id, type: 'test', sid: st.id, icon: '\uD83D\uDCDD', label: t.subject + ' test: ' + t.got + '/' + t.max,
        text: tr('Dear Parent,\n' + st.name + ' (' + st.std + ') scored ' + t.got + '/' + t.max + ' (' + tPct(t) + '%) in the ' + t.subject + ' test "' + t.title + '" held on ' + fmtDate(t.date) + '.\n- ' + CN(),
          '\u092A\u094D\u0930\u093F\u092F \u0905\u092D\u093F\u092D\u093E\u0935\u0915,\n' + st.name + ' (' + st.std + ') \u0928\u0947 ' + t.subject + ' \u091F\u0947\u0938\u094D\u091F "' + t.title + '" (' + fmtDate(t.date) + ') \u092E\u0947\u0902 ' + t.got + '/' + t.max + ' (' + tPct(t) + '%) \u0905\u0902\u0915 \u092A\u094D\u0930\u093E\u092A\u094D\u0924 \u0915\u093F\u090F\u0964\n- ' + CN()) });
    });
    db.homework.forEach(function (h) {
      db.students.forEach(function (st) {
        if (st.std !== h.std || (h.sentTo || []).indexOf(st.id) >= 0) return;
        out.push({ id: 'hw-' + h.id + '-' + st.id, type: 'hw', sid: st.id, hid: h.id, icon: '\uD83D\uDCDA', label: h.subject + ' homework',
          text: tr('Dear Parent,\nHomework for ' + st.name + ' (' + st.std + ')\nSubject: ' + h.subject + '\n' + h.text + (h.due ? '\nSubmit by: ' + fmtDate(h.due) : '') + '\n- ' + CN(),
            '\u092A\u094D\u0930\u093F\u092F \u0905\u092D\u093F\u092D\u093E\u0935\u0915,\n' + st.name + ' (' + st.std + ') \u0915\u093E \u0917\u0943\u0939\u0915\u093E\u0930\u094D\u092F\n\u0935\u093F\u0937\u092F: ' + h.subject + '\n' + h.text + (h.due ? '\n\u091C\u092E\u093E \u0915\u0930\u0928\u0947 \u0915\u0940 \u0924\u093F\u0925\u093F: ' + fmtDate(h.due) : '') + '\n- ' + CN()) });
      });
    });
    return out;
  }
  function markSent(r) {
    if (r.type === 'fee') db.feeSent[r.sid] = today();
    else if (r.type === 'absent') db.absentSent[r.date + '|' + r.sid] = true;
    else if (r.type === 'test') { var t = db.tests.find(function (x) { return 'test-' + x.id === r.id; }); if (t) t.sent = true; }
    else if (r.type === 'hw') { var h = db.homework.find(function (x) { return x.id === r.hid; }); if (h) { h.sentTo = h.sentTo || []; h.sentTo.push(r.sid); } }
    else if (r.sub === 'receipt') { var p = db.payments.find(function (x) { return x.id === r.pid; }); if (p) p.sent = true; }
    else if (r.sub === 'report') db.reportSent[r.sid + '|' + r.mk] = true;
    else if (r.sub === 'bday') db.bdaySent[r.sid] = today().slice(0, 4);
    save();
  }

  // ---------- native bits ----------
  function plugin(n) { try { return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins[n]; } catch (e) { return null; } }
  function openWhatsApp(phone, text) { window.open('https://wa.me/' + phoneFor(phone) + '?text=' + encodeURIComponent(text), '_system'); }
  function scheduleDaily() {
    var LN = plugin('LocalNotifications'); if (!LN) return;
    LN.requestPermissions().then(function (p) {
      if (p.display !== 'granted') return;
      return LN.cancel({ notifications: [{ id: 1 }, { id: 2 }] }).catch(function () {}).then(function () {
        return LN.schedule({ notifications: [
          { id: 1, title: CN(), body: 'Time to mark today\'s attendance.', schedule: { on: { hour: 16, minute: 0 }, allowWhileIdle: true } },
          { id: 2, title: CN(), body: 'Pending parent reminders are waiting to be sent.', schedule: { on: { hour: 18, minute: 0 }, allowWhileIdle: true } }] });
      });
    }).catch(function () {});
  }

  // ---------- state ----------
  var ui = { tab: 'home', locked: true, sheet: null, q: '', stdFilter: 'All', feeFilter: 'due', cls: 'att', remFilter: 'all', attDate: today(), attStd: 'All' };

  // ---------- views ----------
  var root = document.getElementById('app');
  function spark(vals) {
    if (vals.length < 2) return '';
    var w = 300, h = 60, step = w / (vals.length - 1), pts = vals.map(function (v, i) { return (i * step).toFixed(1) + ',' + (h - 6 - v / 100 * (h - 12)).toFixed(1); });
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="60" preserveAspectRatio="none"><polyline fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points="' + pts.join(' ') + '"/></svg>';
  }
  function render() {
    if (ui.locked) { root.innerHTML = lockView(); return; }
    var pending = buildReminders();
    var titles = { home: [CN(), greeting()], students: ['Students', db.students.length + ' enrolled'], fees: ['Fees', 'Monthly fee tracking'], class: ['Classroom', 'Attendance, tests and homework'], reminders: ['Reminders', pending.length + ' ready to send'] };
    var t = titles[ui.tab];
    var body = ({ home: homeView, students: studentsView, fees: feesView, class: classView, reminders: remindersView })[ui.tab](pending);
    var fab = (ui.tab === 'students' || (ui.tab === 'class' && ui.cls !== 'att')) ? '<button class="fab" data-act="add">+</button>' : '';
    var nav = [['home', '\uD83C\uDFE0', 'Home'], ['students', '\uD83C\uDF93', 'Students'], ['class', '\uD83D\uDCCB', 'Class'], ['fees', '\uD83D\uDCB0', 'Fees'], ['reminders', '\uD83D\uDD14', 'Reminders']].map(function (n) {
      return '<button class="' + (ui.tab === n[0] ? 'on' : '') + '" data-tab="' + n[0] + '"><span class="ic">' + n[1] + '</span>' + n[2] + (n[0] === 'reminders' && pending.length ? '<span class="badge">' + pending.length + '</span>' : '') + '</button>';
    }).join('');
    root.innerHTML = '<header class="top"><h1>' + esc(t[0]) + '</h1><p>' + esc(t[1]) + '</p></header><main>' + body + '</main>' + fab + '<nav class="bottom">' + nav + '</nav>' + (ui.sheet ? sheetView(pending) : '');
  }
  function greeting() { var h = new Date().getHours(); return (h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening') + ', Admin \u00B7 ' + fmtDate(today()); }

  function lockView() {
    var first = !db.pin;
    return '<div class="lock"><div class="logo">S</div><h1>' + esc(CN()) + '</h1><p>' + (first ? 'Create a 4-digit PIN to protect your data' : 'Enter your PIN') + '</p>' +
      '<input id="pin" type="password" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="\u2022\u2022\u2022\u2022">' +
      '<button class="btn" style="background:#fff;color:#4F46E5" data-act="unlock">' + (first ? 'Set PIN' : 'Unlock') + '</button></div>';
  }

  function homeView(pending) {
    var now = today(), cur = monthKey(now);
    var active = db.students.filter(function (s) { return monthKey(s.joined) <= cur; });
    var expected = active.reduce(function (a, s) { return a + (Number(s.fee) || 0); }, 0);
    var coll = db.payments.filter(function (p) { return monthKey(p.date) === cur; }).reduce(function (a, p) { return a + Number(p.amount); }, 0);
    var pctC = expected ? Math.min(100, Math.round(coll / expected * 100)) : 0;
    var dueStu = db.students.map(feeStatus).filter(function (f) { return f.cls === 'bad'; });
    var dueAmt = dueStu.reduce(function (a, f) { return a + f.total; }, 0);
    var todayAtt = db.attendance[now] || {}, present = 0, absent = 0;
    Object.keys(todayAtt).forEach(function (k) { if (todayAtt[k] === 'P') present++; else if (todayAtt[k] === 'A') absent++; });
    var h = '<div class="hero"><div class="sub2">Fees collected in ' + fmtMonth(cur) + '</div><div class="big2">' + inr(coll) + ' <small>of ' + inr(expected) + '</small></div><div class="bar"><i style="width:' + pctC + '%"></i></div><div class="sub2">' + pctC + '% collected \u00B7 ' + inr(dueAmt) + ' pending from ' + dueStu.length + ' students</div></div>';
    h += '<div class="grid2"><div class="stat"><b>' + db.students.length + '</b><span>Students</span></div>' +
      '<div class="stat ' + (db.students.length && present + absent === 0 ? 'warn' : 'ok') + '"><b>' + (present + absent ? present + '/' + (present + absent) : '\u2014') + '</b><span>' + (present + absent ? 'Present today' : 'Attendance not marked') + '</span></div></div>';
    h += '<div class="sec">Quick actions</div><div class="card"><div class="grid2">' +
      '<button class="btn" data-act="add-student">+ New student</button><button class="btn" data-act="go-att">Mark attendance</button>' +
      '<button class="btn ghost" data-act="add-test">+ Test marks</button><button class="btn ghost" data-act="add-hw">+ Homework</button>' +
      '<button class="btn wa block" style="grid-column:1/3" data-act="go-rem">Send ' + pending.length + ' pending reminder' + (pending.length === 1 ? '' : 's') + '</button></div></div>';
    var att = attention();
    if (att.length) h += '<div class="sec">Needs attention</div>' + att.slice(0, 5).map(function (x) {
      return '<div class="card row" data-act="view-student" data-id="' + x.st.id + '">' + avatar(x.st.name) + '<div class="grow"><div class="title">' + esc(x.st.name) + '</div><div class="sub">' + esc(x.st.std) + '</div><div>' + x.reasons.map(function (r) { return '<span class="pill ' + r[0] + '" style="margin:3px 4px 0 0">' + esc(r[1]) + '</span>'; }).join('') + '</div></div></div>';
    }).join('');
    var bd = db.students.filter(function (s) { return s.dob && s.dob.slice(5) === now.slice(5); });
    if (bd.length) h += '<div class="card">\uD83C\uDF82 <b>Birthday today:</b> ' + bd.map(function (s) { return esc(s.name); }).join(', ') + '</div>';
    h += '<div class="sec">Settings</div><div class="card"><div class="grid2"><button class="btn ghost" data-act="settings">Settings</button><button class="btn ghost" data-act="backup">Backup data</button><button class="btn ghost" data-act="restore">Restore</button><button class="btn danger" data-act="lock">Lock app</button></div><p class="sub" style="margin:10px 0 0">Data is stored on this phone. Take a backup regularly, especially before changing phones.</p></div>';
    return h;
  }

  function studentsView() {
    var chips = '<div class="chips">' + ['All'].concat(STANDARDS).map(function (s) { return '<button data-std="' + esc(s) + '" class="' + (ui.stdFilter === s ? 'on' : '') + '">' + esc(s) + '</button>'; }).join('') + '</div>';
    var q = ui.q.toLowerCase();
    var list = db.students.filter(function (s) { return (ui.stdFilter === 'All' || s.std === ui.stdFilter) && (!q || (s.name + ' ' + s.school + ' ' + (s.fatherName || '') + ' ' + (s.motherName || '')).toLowerCase().indexOf(q) >= 0); })
      .sort(function (a, b) { return a.name.localeCompare(b.name); });
    var h = '<input class="search" id="q" placeholder="Search student, parent or school" value="' + esc(ui.q) + '">' + chips;
    if (!list.length) return h + '<div class="empty"><div class="big">\uD83C\uDF93</div><p>' + (db.students.length ? 'No students match.' : 'No students yet.<br>Tap + to enroll your first student.') + '</p></div>';
    return h + list.map(function (s) {
      var f = feeStatus(s);
      return '<div class="card row" data-act="view-student" data-id="' + s.id + '">' + avatar(s.name) + '<div class="grow"><div class="title">' + esc(s.name) + '</div><div class="sub">' + esc(s.std) + ' \u00B7 ' + esc(s.school) + '</div></div><span class="pill ' + f.cls + '">' + f.label + '</span></div>';
    }).join('');
  }

  function feesView() {
    var chips = '<div class="chips">' + [['due', 'Due'], ['paid', 'Paid'], ['all', 'All']].map(function (c) { return '<button data-ff="' + c[0] + '" class="' + (ui.feeFilter === c[0] ? 'on' : '') + '">' + c[1] + '</button>'; }).join('') + '</div>';
    var list = db.students.map(function (s) { return { s: s, f: feeStatus(s) }; }).filter(function (x) { return ui.feeFilter === 'all' || (ui.feeFilter === 'due' ? x.f.cls === 'bad' : x.f.cls === 'ok'); });
    if (!list.length) return chips + '<div class="empty"><div class="big">' + (ui.feeFilter === 'due' ? '\uD83C\uDF89' : '\uD83D\uDCB0') + '</div><p>' + (db.students.length ? 'Nothing here.' : 'Add students to track fees.') + '</p></div>';
    return chips + list.map(function (x) {
      return '<div class="card"><div class="row">' + avatar(x.s.name) + '<div class="grow"><div class="title">' + esc(x.s.name) + '</div><div class="sub">' + esc(x.s.std) + ' \u00B7 ' + inr(x.s.fee) + '/month \u00B7 due on ' + x.s.dueDay + 'th</div></div><span class="pill ' + x.f.cls + '">' + x.f.label + '</span></div>' +
        (x.f.total ? '<div class="sub" style="margin-top:8px">Pending: <b style="color:var(--bad)">' + inr(x.f.total) + '</b> (' + x.f.due.map(function (d) { return fmtMonth(d.month); }).join(', ') + ')</div>' : '') +
        '<div style="margin-top:10px"><button class="btn sm block" data-act="pay" data-id="' + x.s.id + '">Record payment (full or part)</button></div></div>';
    }).join('');
  }

  function classView() {
    var seg = '<div class="chips"><button data-lr="att" class="' + (ui.cls === 'att' ? 'on' : '') + '">Attendance</button><button data-lr="tests" class="' + (ui.cls === 'tests' ? 'on' : '') + '">Test marks</button><button data-lr="hw" class="' + (ui.cls === 'hw' ? 'on' : '') + '">Homework</button></div>';
    if (ui.cls === 'att') return seg + attView();
    if (ui.cls === 'tests') {
      var l = db.tests.slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
      if (!l.length) return seg + '<div class="empty"><div class="big">\uD83D\uDCDD</div><p>No test marks yet. Tap + to add.</p></div>';
      return seg + l.map(function (t) { var s = studentById(t.sid), p = tPct(t); return '<div class="card row"><div class="grow"><div class="title">' + esc(s ? s.name : 'Deleted') + '</div><div class="sub">' + esc(t.subject) + ' \u00B7 ' + esc(t.title) + ' \u00B7 ' + fmtDate(t.date) + '</div></div><div style="text-align:right"><b>' + t.got + '/' + t.max + '</b><br><span class="pill ' + (p >= 60 ? 'ok' : p >= 40 ? 'warn' : 'bad') + '">' + p + '%</span></div><button class="x" data-act="del-test" data-id="' + t.id + '">\u2715</button></div>'; }).join('');
    }
    var hl = db.homework.slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
    if (!hl.length) return seg + '<div class="empty"><div class="big">\uD83D\uDCDA</div><p>No homework yet. Tap + to add.</p></div>';
    return seg + hl.map(function (h) {
      var n = db.students.filter(function (s) { return s.std === h.std; }).length, sent = (h.sentTo || []).length;
      return '<div class="card"><div class="row"><div class="grow"><div class="title">' + esc(h.subject) + ' \u00B7 ' + esc(h.std) + '</div><div class="sub">Given ' + fmtDate(h.date) + (h.due ? ' \u00B7 due ' + fmtDate(h.due) : '') + '</div></div><span class="pill ' + (sent >= n && n ? 'ok' : 'warn') + '">' + sent + '/' + n + ' sent</span></div><div style="margin-top:8px;white-space:pre-wrap">' + esc(h.text) + '</div><div style="margin-top:10px"><button class="btn danger sm" data-act="del-hw" data-id="' + h.id + '">Delete</button></div></div>';
    }).join('');
  }

  function attView() {
    var stds = STANDARDS.filter(function (s) { return db.students.some(function (x) { return x.std === s; }); });
    if (!stds.length) return '<div class="empty"><div class="big">\uD83D\uDCCB</div><p>Enroll students to mark attendance.</p></div>';
    if (ui.attStd !== 'All' && stds.indexOf(ui.attStd) < 0) ui.attStd = 'All';
    var list = db.students.filter(function (s) { return (ui.attStd === 'All' || s.std === ui.attStd) && monthKey(s.joined) <= monthKey(ui.attDate); }).sort(function (a, b) { return a.std.localeCompare(b.std, undefined, { numeric: true }) || a.name.localeCompare(b.name); });
    var day = db.attendance[ui.attDate] || {}, p = 0, a = 0;
    list.forEach(function (s) { if (day[s.id] === 'P') p++; else if (day[s.id] === 'A') a++; });
    var h = '<div class="chips">' + ['All'].concat(stds).map(function (s) { return '<button data-as="' + esc(s) + '" class="' + (ui.attStd === s ? 'on' : '') + '">' + esc(s) + '</button>'; }).join('') + '</div>' +
      '<div class="card row"><div class="grow"><label style="margin:0 0 4px">Date</label><input id="att_date" type="date" max="' + today() + '" value="' + esc(ui.attDate) + '"></div><div style="text-align:right"><span class="pill ok">' + p + ' present</span><br><span class="pill bad" style="margin-top:4px">' + a + ' absent</span></div></div>' +
      '<button class="btn ghost block" style="margin-bottom:12px" data-act="all-present">Mark everyone present</button>';
    return h + list.map(function (s) {
      var v = day[s.id], st = attStats(s.id, addDays(today(), -30));
      return '<div class="card row">' + avatar(s.name) + '<div class="grow"><div class="title">' + esc(s.name) + '</div><div class="sub">' + (ui.attStd === 'All' ? esc(s.std) + ' · ' : '') + (st.total ? st.pct + '% last 30 days' : 'No record yet') + '</div></div>' +
        '<div class="seg"><button class="' + (v === 'P' ? 'p' : '') + '" data-act="att" data-id="' + s.id + '" data-v="P">P</button><button class="' + (v === 'A' ? 'a' : '') + '" data-act="att" data-id="' + s.id + '" data-v="A">A</button></div></div>';
    }).join('');
  }

  function remindersView(pending) {
    var chips = '<div class="chips">' + [['all', 'All'], ['fee', 'Fees'], ['test', 'Tests'], ['hw', 'Homework'], ['absent', 'Absent'], ['more', 'Reports & more']].map(function (c) { return '<button data-rf="' + c[0] + '" class="' + (ui.remFilter === c[0] ? 'on' : '') + '">' + c[1] + '</button>'; }).join('') + '</div>';
    var list = pending.filter(function (r) { return ui.remFilter === 'all' || r.type === ui.remFilter; });
    if (!list.length) return chips + '<div class="empty"><div class="big">\u2705</div><p>All caught up! No reminders pending.</p></div>';
    return '<button class="btn wa block" style="margin-bottom:12px" data-act="queue">\u25B6 Send one by one (' + list.length + ')</button>' + chips + list.map(function (r) { return remCard(r); }).join('');
  }
  function remCard(r) {
    var st = studentById(r.sid), rec = recipients(st);
    return '<div class="card"><div class="row"><div style="font-size:24px">' + r.icon + '</div><div class="grow"><div class="title">' + esc(st.name) + '</div><div class="sub">' + esc(r.label) + '</div></div></div><div class="msg">' + esc(r.text) + '</div>' +
      (rec.length ? '<div class="row" style="flex-wrap:wrap">' + rec.map(function (p, i) { return '<button class="btn wa sm" data-act="send" data-rid="' + esc(r.id) + '" data-i="' + i + '">Send to ' + esc(p.who) + '</button>'; }).join('') + '<button class="btn ghost sm" data-act="skip" data-rid="' + esc(r.id) + '">Mark done</button></div>' : '<div class="sub" style="color:var(--bad)">No parent phone number saved.</div>') + '</div>';
  }

  // ---------- sheets (forms) ----------
  function opt(list, sel) { return list.map(function (v) { var val = Array.isArray(v) ? v[0] : v, lab = Array.isArray(v) ? v[1] : v; return '<option value="' + esc(val) + '"' + (val === sel ? ' selected' : '') + '>' + esc(lab) + '</option>'; }).join(''); }
  function sheetView(pending) {
    var s = ui.sheet, h = '';
    if (s.type === 'student') {
      var e = s.data || {};
      h = '<h2>' + (e.id ? 'Edit student' : 'Enroll new student') + '</h2>' +
        '<label>Student name *</label><input id="f_name" value="' + esc(e.name) + '">' +
        '<div class="grid2"><div><label>Standard *</label><select id="f_std">' + opt(STANDARDS, e.std || 'Class 5') + '</select></div><div><label>Joined on *</label><input id="f_joined" type="date" value="' + esc(e.joined || today()) + '"></div></div>' +
        '<label>School *</label><input id="f_school" value="' + esc(e.school) + '">' +
        '<div class="grid2"><div><label>Monthly fee (\u20B9) *</label><input id="f_fee" type="number" inputmode="numeric" value="' + esc(e.fee) + '"></div><div><label>Fee due day (1-28)</label><input id="f_dueDay" type="number" inputmode="numeric" min="1" max="28" value="' + esc(e.dueDay || 5) + '"></div></div>' +
        '<label>Date of birth (for birthday wishes)</label><input id="f_dob" type="date" value="' + esc(e.dob) + '">' +
        '<div class="sec">Parents</div><div class="grid2"><div><label>Father name</label><input id="f_fn" value="' + esc(e.fatherName) + '"></div><div><label>Father phone</label><input id="f_fp" type="tel" inputmode="tel" value="' + esc(e.fatherPhone) + '"></div>' +
        '<div><label>Mother name</label><input id="f_mn" value="' + esc(e.motherName) + '"></div><div><label>Mother phone</label><input id="f_mp" type="tel" inputmode="tel" value="' + esc(e.motherPhone) + '"></div></div>' +
        '<label>Send reminders to</label><select id="f_notify">' + opt([['father', 'Father'], ['mother', 'Mother'], ['both', 'Both parents']], e.notify || 'father') + '</select>' +
        '<div class="row" style="margin-top:16px"><button class="btn grow" data-act="save-student">Save</button><button class="btn ghost" data-act="close">Cancel</button></div>';
    } else if (s.type === 'student-view') {
      var st = studentById(s.id), f = feeStatus(st), ts = testsOf(st.id), a30 = attStats(st.id, addDays(today(), -30)), avg = avgPct(ts);
      var pays = db.payments.filter(function (p) { return p.sid === st.id; }).sort(function (x, y) { return y.date.localeCompare(x.date); }).slice(0, 6);
      h = '<div class="row">' + avatar(st.name, 52) + '<div class="grow"><h2>' + esc(st.name) + '</h2><div class="sub">' + esc(st.std) + ' \u00B7 ' + esc(st.school) + '</div></div></div>' +
        '<div class="grid3" style="margin:14px 0 8px"><div class="mini"><b>' + (avg === null ? '\u2014' : avg + '%') + '</b><span>Test avg</span></div><div class="mini"><b>' + (a30.total ? a30.pct + '%' : '\u2014') + '</b><span>Attendance</span></div><div class="mini"><b class="' + f.cls + '">' + f.label + '</b><span>Fees</span></div></div>' +
        (ts.length >= 2 ? '<div class="card" style="margin-bottom:8px"><div class="sub">Marks trend (last ' + Math.min(ts.length, 8) + ' tests)</div>' + spark(ts.slice(-8).map(tPct)) + '</div>' : '') +
        '<div class="card" style="margin-bottom:8px"><div class="sub">Joined: <b>' + fmtDate(st.joined) + '</b>' + (st.dob ? ' \u00B7 Birthday: <b>' + fmtDate(st.dob).replace(/ \d{4}$/, '') + '</b>' : '') + '</div><div class="sub" style="margin-top:4px">Fee: <b>' + inr(st.fee) + '/month</b> (due on ' + st.dueDay + 'th)</div>' +
        '<div class="sub" style="margin-top:6px">Father: <b>' + esc(st.fatherName || '-') + '</b> ' + (st.fatherPhone ? '<a href="tel:' + esc(st.fatherPhone) + '">' + esc(st.fatherPhone) + '</a>' : '') + '</div><div class="sub" style="margin-top:4px">Mother: <b>' + esc(st.motherName || '-') + '</b> ' + (st.motherPhone ? '<a href="tel:' + esc(st.motherPhone) + '">' + esc(st.motherPhone) + '</a>' : '') + '</div><div class="sub" style="margin-top:4px">Reminders go to: <b>' + esc(st.notify) + '</b></div></div>' +
        (pays.length ? '<div class="card" style="margin-bottom:8px"><div class="sub" style="margin-bottom:4px">Recent payments</div>' + pays.map(function (p) { return '<div class="row" style="padding:4px 0"><div class="grow sub">' + fmtDate(p.date) + ' \u00B7 ' + fmtMonth(p.month) + '</div><b>' + inr(p.amount) + '</b><button class="x" data-act="del-pay" data-id="' + p.id + '">\u2715</button></div>'; }).join('') + '</div>' : '') +
        '<div class="grid2" style="margin-top:12px"><button class="btn" data-act="pay" data-id="' + st.id + '">Record payment</button><button class="btn wa" data-act="report-now" data-id="' + st.id + '">Send report</button><button class="btn ghost" data-act="edit-student" data-id="' + st.id + '">Edit</button><button class="btn danger" data-act="del-student" data-id="' + st.id + '">Delete</button></div><button class="btn ghost block" style="margin-top:10px" data-act="close">Close</button>';
    } else if (s.type === 'pay') {
      var p = studentById(s.id), dm = dueMonths(p), defMonth = dm.length ? dm[0].month : monthKey(today()), defAmt = dm.length ? dm[0].amount : p.fee;
      var months = monthsRange(monthKey(p.joined), monthKey(today()));
      h = '<h2>Record payment</h2><div class="sub">' + esc(p.name) + ' \u00B7 ' + esc(p.std) + ' \u00B7 monthly fee ' + inr(p.fee) + '</div>' +
        '<label>For month</label><select id="f_month">' + opt(months.map(function (m) { return [m, fmtMonth(m)]; }), defMonth) + '</select>' +
        '<label>Amount received (\u20B9) - part payment is fine</label><input id="f_amt" type="number" inputmode="numeric" value="' + esc(defAmt) + '">' +
        '<label>Date received</label><input id="f_date" type="date" value="' + today() + '">' +
        '<div class="sub" style="margin-top:10px">A receipt message is added to Reminders for the parents.</div>' +
        '<div class="row" style="margin-top:16px"><button class="btn grow" data-act="save-pay" data-id="' + p.id + '">Save payment</button><button class="btn ghost" data-act="close">Cancel</button></div>';
    } else if (s.type === 'test') {
      h = '<h2>Add test marks</h2>' + (db.students.length ? '<label>Student *</label><select id="f_sid">' + opt(db.students.slice().sort(function (x, y) { return x.std.localeCompare(y.std) || x.name.localeCompare(y.name); }).map(function (x) { return [x.id, x.name + ' (' + x.std + ')']; })) + '</select>' +
        '<div class="grid2"><div><label>Subject *</label><input id="f_sub" placeholder="Maths"></div><div><label>Test name</label><input id="f_title" placeholder="Unit Test 1"></div>' +
        '<div><label>Marks obtained *</label><input id="f_got" type="number" step="0.5" inputmode="decimal"></div><div><label>Out of *</label><input id="f_max" type="number" inputmode="numeric" value="25"></div></div>' +
        '<label>Test date</label><input id="f_date" type="date" value="' + today() + '">' +
        '<div class="row" style="margin-top:16px"><button class="btn grow" data-act="save-test">Save</button><button class="btn ghost" data-act="close">Cancel</button></div>' : '<p class="empty">Enroll a student first.</p><button class="btn block" data-act="close">OK</button>');
    } else if (s.type === 'hw') {
      h = '<h2>Add homework</h2><div class="sub">A reminder is created for every student in the class.</div>' +
        '<label>Standard *</label><select id="f_std">' + opt(STANDARDS, 'Class 5') + '</select>' +
        '<label>Subject *</label><input id="f_sub" placeholder="Science">' +
        '<label>Homework details *</label><textarea id="f_text" rows="4" placeholder="Chapter 3 exercise 1 to 5"></textarea>' +
        '<label>Submit by</label><input id="f_due" type="date">' +
        '<div class="row" style="margin-top:16px"><button class="btn grow" data-act="save-hw">Save</button><button class="btn ghost" data-act="close">Cancel</button></div>';
    } else if (s.type === 'queue') {
      var cur = pending.filter(function (r) { return ui.remFilter === 'all' || r.type === ui.remFilter; })[0];
      if (!cur) h = '<div class="empty"><div class="big">\uD83C\uDF89</div><p>All reminders sent!</p></div><button class="btn block" data-act="close">Done</button>';
      else { var stq = studentById(cur.sid), recq = recipients(stq); h = '<div class="sub">Reminder ' + 1 + ' of ' + pending.filter(function (r) { return ui.remFilter === 'all' || r.type === ui.remFilter; }).length + ' remaining</div><div class="row" style="margin-top:6px"><div style="font-size:26px">' + cur.icon + '</div><div class="grow"><h2>' + esc(stq.name) + '</h2><div class="sub">' + esc(cur.label) + '</div></div></div><div class="msg">' + esc(cur.text) + '</div>' +
        (recq.length ? recq.map(function (p, i) { return '<button class="btn wa block" style="margin-bottom:8px" data-act="send" data-rid="' + esc(cur.id) + '" data-i="' + i + '">Send to ' + esc(p.who) + ' on WhatsApp</button>'; }).join('') : '<div class="sub" style="color:var(--bad)">No phone number saved.</div>') +
        '<div class="grid2"><button class="btn ghost" data-act="skip" data-rid="' + esc(cur.id) + '">Skip (mark done)</button><button class="btn ghost" data-act="close">Stop</button></div>'; }
    } else if (s.type === 'settings') {
      h = '<h2>Settings</h2><label>Class / institute name (used in messages)</label><input id="f_cn" value="' + esc(db.settings.className) + '">' +
        '<label>Message language</label><select id="f_lang">' + opt([['en', 'English'], ['hi', '\u0939\u093F\u0928\u094D\u0926\u0940 (Hindi)']], db.settings.lang) + '</select>' +
        '<label>Repeat fee reminder every (days)</label><input id="f_rep" type="number" inputmode="numeric" min="1" max="30" value="' + esc(db.settings.feeRepeatDays) + '">' +
        '<div class="row" style="margin-top:16px"><button class="btn grow" data-act="save-settings">Save</button><button class="btn ghost" data-act="chpin">Change PIN</button></div>';
    } else if (s.type === 'backup') {
      h = '<h2>Backup</h2><p class="sub">Share this to yourself (WhatsApp / Google Keep) and keep it safe.</p><textarea id="f_data" rows="8" readonly>' + esc(JSON.stringify(Object.assign({}, db, { pin: '' }))) + '</textarea>' +
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
  function val(id) { var el = document.getElementById(id); return el ? String(el.value).trim() : ''; }
  function open(type, extra) { ui.sheet = Object.assign({ type: type }, extra || {}); render(); }
  function close() { ui.sheet = null; render(); }

  function act(a, el, ev) {
    var id = el && el.dataset.id;
    switch (a) {
      case 'unlock': {
        var p = val('pin');
        if (!/^\d{4}$/.test(p)) return toast('Enter exactly 4 digits');
        if (!db.pin) { db.pin = p; save(); } else if (db.pin !== p) return toast('Wrong PIN');
        ui.locked = false; render(); scheduleDaily(); return;
      }
      case 'lock': ui.locked = true; ui.sheet = null; return render();
      case 'add': if (ui.tab === 'students') return open('student', { data: {} }); return open(ui.cls === 'tests' ? 'test' : 'hw');
      case 'add-student': return open('student', { data: {} });
      case 'add-test': return open('test');
      case 'add-hw': return open('hw');
      case 'go-rem': ui.tab = 'reminders'; return render();
      case 'go-att': ui.tab = 'class'; ui.cls = 'att'; return render();
      case 'bg': if (ev && el === ev.target) close(); return;
      case 'close': return close();
      case 'view-student': return open('student-view', { id: id });
      case 'edit-student': return open('student', { data: studentById(id) });
      case 'pay': return open('pay', { id: id });
      case 'queue': return open('queue');
      case 'settings': return open('settings');
      case 'save-settings': {
        db.settings.className = val('f_cn') || 'Saroj Classes'; db.settings.lang = val('f_lang') || 'en'; db.settings.feeRepeatDays = Math.max(1, Math.min(30, Number(val('f_rep')) || 7));
        save(); toast('Settings saved'); return close();
      }
      case 'save-student': {
        var d = { name: val('f_name'), std: val('f_std'), school: val('f_school'), joined: val('f_joined'), fee: val('f_fee'), dueDay: val('f_dueDay') || '5', dob: val('f_dob'), fatherName: val('f_fn'), fatherPhone: val('f_fp'), motherName: val('f_mn'), motherPhone: val('f_mp'), notify: val('f_notify') };
        if (!d.name || !d.school || !d.joined || !d.fee) return toast('Fill name, school, join date and fee');
        if (!d.fatherPhone && !d.motherPhone) return toast('Add at least one parent phone');
        var bad = false; [d.fatherPhone, d.motherPhone].forEach(function (x) { if (x && phoneFor(x).length < 11) bad = true; });
        if (bad) return toast('Phone should be 10 digits');
        var ex = ui.sheet.data && ui.sheet.data.id;
        if (ex) Object.assign(studentById(ex), d); else db.students.push(Object.assign({ id: uid() }, d));
        save(); toast(ex ? 'Student updated' : 'Student enrolled'); return close();
      }
      case 'del-student':
        if (!confirm('Delete this student and all their fees, marks and attendance?')) return;
        db.students = db.students.filter(function (s) { return s.id !== id; });
        db.payments = db.payments.filter(function (p) { return p.sid !== id; });
        db.tests = db.tests.filter(function (t) { return t.sid !== id; });
        Object.keys(db.attendance).forEach(function (d) { delete db.attendance[d][id]; });
        save(); toast('Deleted'); return close();
      case 'save-pay': {
        var amt = Number(val('f_amt')); if (!(amt > 0)) return toast('Enter amount');
        db.payments.push({ id: uid(), sid: id, month: val('f_month'), amount: amt, date: val('f_date') || today(), sent: false });
        save(); toast('Payment recorded - receipt ready in Reminders'); return close();
      }
      case 'del-pay': if (confirm('Delete this payment entry?')) { db.payments = db.payments.filter(function (p) { return p.id !== id; }); save(); render(); } return;
      case 'save-test': {
        var t = { id: uid(), sid: val('f_sid'), subject: val('f_sub'), title: val('f_title') || 'Class test', date: val('f_date') || today(), got: Number(val('f_got')), max: Number(val('f_max')), sent: false };
        if (!t.sid || !t.subject || val('f_got') === '' || !(t.max > 0)) return toast('Fill student, subject and marks');
        if (t.got > t.max) return toast('Marks cannot exceed total');
        db.tests.push(t); save(); toast('Saved - reminder created'); return close();
      }
      case 'del-test': if (confirm('Delete this test entry?')) { db.tests = db.tests.filter(function (t) { return t.id !== id; }); save(); render(); } return;
      case 'save-hw': {
        var hw = { id: uid(), std: val('f_std'), subject: val('f_sub'), text: val('f_text'), due: val('f_due'), date: today(), sentTo: [] };
        if (!hw.subject || !hw.text) return toast('Enter subject and details');
        db.homework.push(hw); save(); toast('Saved - reminders created'); return close();
      }
      case 'del-hw': if (confirm('Delete this homework?')) { db.homework = db.homework.filter(function (h) { return h.id !== id; }); save(); render(); } return;
      case 'att': {
        var day = db.attendance[ui.attDate] || (db.attendance[ui.attDate] = {});
        day[id] = el.dataset.v; save(); return render();
      }
      case 'all-present': {
        var dd = db.attendance[ui.attDate] || (db.attendance[ui.attDate] = {});
        db.students.forEach(function (s) { if ((ui.attStd === 'All' || s.std === ui.attStd) && monthKey(s.joined) <= monthKey(ui.attDate) && !dd[s.id]) dd[s.id] = 'P'; });
        save(); toast('Everyone marked present'); return render();
      }
      case 'report-now': {
        var stu = studentById(id), rec0 = recipients(stu)[0]; if (!rec0) return toast('No parent phone saved');
        openWhatsApp(rec0.phone, progressText(stu, monthKey(today()))); return;
      }
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
        if (Sh) Sh.share({ title: CN() + ' backup', text: txt }).catch(function () {});
        else { try { navigator.clipboard.writeText(txt); toast('Copied'); } catch (e) { toast('Select and copy the text'); } }
        return;
      }
      case 'do-restore': {
        try { var d2 = JSON.parse(val('f_data')); if (!d2.students || !d2.payments) throw 0; if (!confirm('Replace all current data?')) return; d2.pin = db.pin; db = Object.assign(blank(), d2); db.settings = Object.assign(blank().settings, d2.settings || {}); save(); toast('Restored'); close(); } catch (e) { toast('Invalid backup text'); }
        return;
      }
    }
  }

  // ---------- events ----------
  root.addEventListener('click', function (e) {
    var t = e.target.closest('[data-tab],[data-act],[data-std],[data-ff],[data-lr],[data-rf],[data-as]'); if (!t) return;
    if (t.dataset.tab) { ui.tab = t.dataset.tab; ui.sheet = null; return render(); }
    if (t.dataset.std) { ui.stdFilter = t.dataset.std; return render(); }
    if (t.dataset.ff) { ui.feeFilter = t.dataset.ff; return render(); }
    if (t.dataset.lr) { ui.cls = t.dataset.lr; return render(); }
    if (t.dataset.rf) { ui.remFilter = t.dataset.rf; return render(); }
    if (t.dataset.as) { ui.attStd = t.dataset.as; return render(); }
    if (t.dataset.act) act(t.dataset.act, t, e);
  });
  root.addEventListener('input', function (e) {
    if (e.target.id === 'q') { ui.q = e.target.value; var pos = e.target.selectionStart; render(); var q = document.getElementById('q'); q.focus(); q.setSelectionRange(pos, pos); }
  });
  root.addEventListener('change', function (e) { if (e.target.id === 'att_date' && e.target.value) { ui.attDate = e.target.value; render(); } });
  root.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.id === 'pin') act('unlock'); });

  render();
})();
