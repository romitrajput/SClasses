/* MyTution - admin app. All data is stored on this phone (localStorage). */
(function () {
  'use strict';

  // ---------- storage ----------
  var KEY = 'MyTution';
  var OLD_KEY = 'saroj_classes_db_v1'; // data saved by earlier versions is copied over once
  var db = load();
  function blank() {
    return { pin: '', recQ: '', recA: '', students: [], payments: [], attendance: {}, feeSent: {}, absentSent: {}, reportSent: {}, bdaySent: {}, receiptSeq: 0,
      settings: { className: 'MyTution', lang: 'en', feeRepeatDays: 7, phone: '', address: '' } };
  }
  function load() {
    try { var d = JSON.parse(localStorage.getItem(KEY) || localStorage.getItem(OLD_KEY)); if (d && d.students) { var b = blank(); var m = Object.assign(b, d); m.settings = Object.assign(b.settings, d.settings || {}); if (m.settings.className === 'Saroj Classes') m.settings.className = 'MyTution'; return m; } } catch (e) {}
    return blank();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('Could not save - storage full?'); } }
  var RQS = ["What is your mother's maiden name?", 'What was the name of your first school?', 'In which city were you born?', "What is your favourite teacher's name?", 'What was your childhood nickname?'];
  function hashAns(str) {
    str = 'MyTution|' + String(str).toLowerCase().replace(/\s+/g, ' ').trim();
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0, ch; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }
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
  function inr(n) { return '₹' + Number(n || 0).toLocaleString('en-IN'); }
  function monthsRange(from, to) { var out = [], y = +from.slice(0, 4), m = +from.slice(5, 7), ty = +to.slice(0, 4), tm = +to.slice(5, 7); while (y < ty || (y === ty && m <= tm)) { out.push(y + '-' + pad(m)); m++; if (m > 12) { m = 1; y++; } } return out; }
  function initial(n) { return (n || '?').trim().charAt(0).toUpperCase(); }
  function hue(n) { var h = 0; for (var i = 0; i < (n || '').length; i++) h = (h * 31 + n.charCodeAt(i)) % 360; return h; }
  function avatar(n, size) { var h = hue(n); return '<div class="avatar" style="background:hsl(' + h + ' 85% 92%);color:hsl(' + h + ' 55% 35%);' + (size ? 'width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * .42) + 'px' : '') + '">' + esc(initial(n)) + '</div>'; }
  function phoneFor(raw) { var d = String(raw || '').replace(/\D/g, ''); if (d.length === 10) d = '91' + d; return d; }
  function studentById(id) { return db.students.find(function (s) { return s.id === id; }); }
  function pct(a, b) { return b ? Math.round(a / b * 100) : 0; }
  var LOGO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="56 34 400 440"><g transform="translate(35.8 -42.9) scale(0.86)"><g fill="none" stroke="#fff" stroke-width="14" stroke-linejoin="round" stroke-linecap="round"><path d="M104 382 V198 L256 296 L408 198 V382 Q336 402 256 410 Q176 402 104 382 Z"/><path d="M256 296 V410"/></g><g stroke="#F5C451" stroke-width="12" stroke-linejoin="round" stroke-linecap="round" fill="none"><path d="M206 168 V200 C206 220 230 232 256 232 C282 232 306 220 306 200 V168"/><path d="M256 104 L352 148 L256 192 L160 148 Z"/></g></g><g transform="translate(67.7 442)"><path d="M66.846 -54.756V0.0H53.508V-32.838L41.262 0.0H30.498L18.174 -32.916V0.0H4.836V-54.756H20.592L35.958 -16.848L51.168 -54.756ZM120.9 -43.524 93.6 20.67H79.248L89.232 -1.482L71.526 -43.524H86.424L96.486 -16.302L106.47 -43.524Z" fill="#F5C451"/><path d="M165.126 -54.756V-44.07H150.618V0.0H137.28V-44.07H122.772V-54.756ZM214.81199999999998 -43.524V0.0H201.474V-5.928Q199.446 -3.042 195.975 -1.287Q192.504 0.46799999999999997 188.292 0.46799999999999997Q183.29999999999998 0.46799999999999997 179.47799999999998 -1.7550000000000001Q175.65599999999998 -3.978 173.54999999999998 -8.19Q171.444 -12.402 171.444 -18.096V-43.524H184.70399999999998V-19.89Q184.70399999999998 -15.522 186.96599999999998 -13.104Q189.22799999999998 -10.686 193.04999999999998 -10.686Q196.95 -10.686 199.212 -13.104Q201.474 -15.522 201.474 -19.89V-43.524ZM248.664 -11.31V0.0H241.878Q234.624 0.0 230.56799999999998 -3.549Q226.512 -7.098 226.512 -15.132V-32.448H221.208V-43.524H226.512V-54.132H239.85V-43.524H248.58599999999998V-32.448H239.85V-14.975999999999999Q239.85 -13.026 240.786 -12.168Q241.72199999999998 -11.31 243.906 -11.31ZM254.826 -55.224Q254.826 -58.344 257.049 -60.411Q259.272 -62.478 262.782 -62.478Q266.214 -62.478 268.437 -60.411Q270.66 -58.344 270.66 -55.224Q270.66 -52.182 268.437 -50.115Q266.214 -48.048 262.782 -48.048Q259.272 -48.048 257.049 -50.115Q254.826 -52.182 254.826 -55.224ZM269.412 -43.524V0.0H256.074V-43.524ZM276.432 -21.762Q276.432 -28.47 279.396 -33.579Q282.36 -38.688 287.50800000000004 -41.418000000000006Q292.656 -44.148 299.05199999999996 -44.148Q305.448 -44.148 310.596 -41.418000000000006Q315.74399999999997 -38.688 318.70799999999997 -33.579Q321.67199999999997 -28.47 321.67199999999997 -21.762Q321.67199999999997 -15.054 318.669 -9.945Q315.666 -4.836 310.479 -2.1060000000000003Q305.292 0.624 298.896 0.624Q292.5 0.624 287.39099999999996 -2.1060000000000003Q282.282 -4.836 279.35699999999997 -9.905999999999999Q276.432 -14.975999999999999 276.432 -21.762ZM308.09999999999997 -21.762Q308.09999999999997 -26.988 305.48699999999997 -29.796Q302.87399999999997 -32.604 299.05199999999996 -32.604Q295.152 -32.604 292.578 -29.835Q290.004 -27.066 290.004 -21.762Q290.004 -16.536 292.539 -13.728000000000002Q295.074 -10.92 298.896 -10.92Q302.71799999999996 -10.92 305.409 -13.728000000000002Q308.09999999999997 -16.536 308.09999999999997 -21.762ZM372.05999999999995 -25.428V0.0H358.79999999999995V-23.634Q358.79999999999995 -28.002 356.53799999999995 -30.42Q354.27599999999995 -32.838 350.45399999999995 -32.838Q346.63199999999995 -32.838 344.36999999999995 -30.42Q342.10799999999995 -28.002 342.10799999999995 -23.634V0.0H328.77V-43.524H342.10799999999995V-37.752Q344.13599999999997 -40.638 347.568 -42.315Q350.99999999999994 -43.992 355.28999999999996 -43.992Q362.93399999999997 -43.992 367.49699999999996 -39.039Q372.05999999999995 -34.086 372.05999999999995 -25.428Z" fill="#FFFFFF"/></g></svg>';
  var STANDARDS = ['Nursery/KG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];
  function CN() { return db.settings.className || 'MyTution'; }
  function tr(en, hi) { return db.settings.lang === 'hi' ? hi : en; }

  var toastT;
  function toast(msg) { var t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2400); }

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
  // Month-wise view: who paid and who is pending for one fee month
  function monthSummary(mk) {
    var rows = [], paid = 0, collected = 0, expected = 0, outstanding = 0;
    db.students.forEach(function (s) {
      if (monthKey(s.joined) > mk) return;
      var fee = Number(s.fee) || 0;
      var pays = db.payments.filter(function (p) { return p.sid === s.id && p.month === mk; }).sort(function (a, b) { return a.date.localeCompare(b.date); });
      var got = pays.reduce(function (a, p) { return a + Number(p.amount); }, 0);
      var bal = Math.max(fee - got, 0), status = got >= fee ? 'paid' : (got > 0 ? 'part' : 'pending');
      if (status === 'paid') paid++;
      collected += got; expected += fee; outstanding += bal;
      rows.push({ s: s, fee: fee, got: got, bal: bal, status: status, pays: pays });
    });
    rows.sort(function (a, b) { return a.s.name.localeCompare(b.s.name); });
    return { rows: rows, paid: paid, pending: rows.length - paid, collected: collected, expected: expected, outstanding: outstanding };
  }
  function feeMonthsList() {
    var cur = monthKey(today());
    var first = db.students.reduce(function (m, s) { var k = monthKey(s.joined); return k < m ? k : m; }, cur);
    return monthsRange(first, cur).reverse();
  }
  function receiptNo(p) {
    if (!p.no) { db.receiptSeq = (db.receiptSeq || 0) + 1; p.no = db.receiptSeq; save(); }
    return 'RCPT-' + ('0000' + p.no).slice(-4);
  }
  function feeMsg(st, months, total) {
    var ms = months.map(fmtMonth).join(', ');
    return tr('Dear Parent,\nThis is a gentle reminder from ' + CN() + ' that the tuition fee of ' + inr(total) + ' for ' + st.name + ' (' + st.std + ') is pending for ' + ms + '.\nKindly pay at the earliest. If already paid, please ignore this message.\nThank you.',
      'प्रिय अभिभावक,\n' + CN() + ' की ओर से स्मरण: ' + st.name + ' (' + st.std + ') की ' + ms + ' की ट्यूशन फीस ' + inr(total) + ' बकाया है।\nकृपया जल्द से जल्द भुगतान करें। यदि भुगतान हो चुका है तो इस संदेश को अनदेखा करें।\nधन्यवाद।');
  }

  // ---------- attendance ----------
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
  function attention() {
    var out = [];
    db.students.forEach(function (st) {
      var r = [], f = feeStatus(st);
      if (f.due.length >= 2) r.push(['bad', f.due.length + ' months fee due']);
      var a = attStats(st.id, addDays(today(), -30));
      if (a.total >= 5 && a.pct < 75) r.push(['warn', 'Attendance ' + a.pct + '%']);
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
    var at = attStatsMonth(st.id, mk), f = feeStatus(st);
    var feeLine = f.total ? tr('Pending ' + inr(f.total), 'शेष ' + inr(f.total)) : tr('Paid up', 'जमा है');
    return tr('Dear Parent,\nMonthly report of ' + st.name + ' (' + st.std + ') for ' + fmtMonth(mk) + ':\nAttendance: ' + (at.total ? at.pct + '% (' + at.p + ' of ' + at.total + ' days)' : 'not recorded') + '\nFees: ' + feeLine + '\nThank you for your support.\n- ' + CN(),
      'प्रिय अभिभावक,\n' + st.name + ' (' + st.std + ') की ' + fmtMonth(mk) + ' की रिपोर्ट:\nउपस्थिति: ' + (at.total ? at.pct + '% (' + at.total + ' में से ' + at.p + ' दिन)' : 'दर्ज नहीं') + '\nफीस: ' + feeLine + '\nधन्यवाद।\n- ' + CN());
  }

  function buildReminders() {
    var out = [], now = today(), repeat = Number(db.settings.feeRepeatDays) || 7;
    db.students.forEach(function (st) {
      var fs = feeStatus(st);
      if (fs.due.length) {
        var last = db.feeSent[st.id];
        if (!last || daysSince(last) >= repeat) {
          out.push({ id: 'fee-' + st.id, type: 'fee', sid: st.id, icon: '💰', label: 'Fee due ' + inr(fs.total), text: feeMsg(st, fs.due.map(function (d) { return d.month; }), fs.total) });
        }
      }
      if (st.dob && st.dob.slice(5) === now.slice(5) && db.bdaySent[st.id] !== now.slice(0, 4)) {
        out.push({ id: 'bd-' + st.id, type: 'more', sub: 'bday', sid: st.id, icon: '🎂', label: 'Birthday today',
          text: tr('Wishing ' + st.name + ' a very happy birthday! May the year ahead be full of joy and success.\n- ' + CN(), st.name + ' को जन्मदिन की हार्दिक शुभकामनाएं! आपका आने वाला साल खुशियों और सफलता से भरा हो। 🎂\n- ' + CN()) });
      }
      var pm = prevMonthKey(now);
      if (!db.reportSent[st.id + '|' + pm] && monthKey(st.joined) <= pm && attStatsMonth(st.id, pm).total) {
        out.push({ id: 'rep-' + st.id + '-' + pm, type: 'more', sub: 'report', sid: st.id, mk: pm, icon: '📊', label: fmtMonth(pm) + ' monthly report', text: progressText(st, pm) });
      }
    });
    db.payments.forEach(function (p) {
      var st = studentById(p.sid); if (!st || p.sent || p.noReceipt) return;
      var paid = paidMonths(st.id)[p.month] || 0, bal = Math.max((Number(st.fee) || 0) - paid, 0);
      out.push({ id: 'rcpt-' + p.id, type: 'more', sub: 'receipt', sid: st.id, pid: p.id, icon: '🧾', label: 'Receipt ' + inr(p.amount),
        text: tr('Dear Parent,\nReceived ' + inr(p.amount) + ' towards ' + st.name + "'s fee for " + fmtMonth(p.month) + ' on ' + fmtDate(p.date) + '.\n' + (bal ? 'Balance for this month: ' + inr(bal) + '.' : 'Fee for this month is fully paid.') + '\nThank you.\n- ' + CN(),
          'प्रिय अभिभावक,\n' + st.name + ' की ' + fmtMonth(p.month) + ' की फीस के लिए ' + inr(p.amount) + ' प्राप्त हुए (' + fmtDate(p.date) + ')।\n' + (bal ? 'इस माह का शेष: ' + inr(bal) + '।' : 'इस माह की फीस पूरी जमा है।') + '\nधन्यवाद।\n- ' + CN()) });
    });
    var since = addDays(now, -2);
    Object.keys(db.attendance).forEach(function (d) {
      if (d < since) return;
      Object.keys(db.attendance[d]).forEach(function (sid) {
        var st = studentById(sid); if (!st || db.attendance[d][sid] !== 'A' || db.absentSent[d + '|' + sid]) return;
        out.push({ id: 'abs-' + d + '-' + sid, type: 'absent', sid: sid, date: d, icon: '🙋', label: 'Absent on ' + fmtDate(d),
          text: tr('Dear Parent,\n' + st.name + ' (' + st.std + ') was absent from class on ' + fmtDate(d) + '. Please let us know the reason.\n- ' + CN(),
            'प्रिय अभिभावक,\n' + st.name + ' (' + st.std + ') ' + fmtDate(d) + ' को कक्षा में अनुपस्थित रहा/रही। कृपया कारण बताएं।\n- ' + CN()) });
      });
    });
    return out;
  }
  function markSent(r) {
    if (r.type === 'fee') db.feeSent[r.sid] = today();
    else if (r.type === 'absent') db.absentSent[r.date + '|' + r.sid] = true;
    else if (r.sub === 'receipt') { var p = db.payments.find(function (x) { return x.id === r.pid; }); if (p) p.sent = true; }
    else if (r.sub === 'report') db.reportSent[r.sid + '|' + r.mk] = true;
    else if (r.sub === 'bday') db.bdaySent[r.sid] = today().slice(0, 4);
    save();
  }

  // ---------- PDF (hand-built, no libraries, works offline) ----------
  var HW = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
  var INDIGO = [79, 70, 229], DARK = [31, 41, 55], GRAY = [107, 114, 128], LIGHT = [238, 242, 255], GREEN = [5, 150, 105], AMBER = [217, 119, 6], RED = [220, 38, 38], WHITE = [255, 255, 255], LINEC = [209, 213, 219];
  function pclean(s) {
    return String(s == null ? '' : s).replace(/₹/g, 'Rs.').replace(/[–—]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/·/g, '|').replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');
  }
  function tw(s, size, bold) { var w = 0; for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); w += (c >= 32 && c <= 126) ? HW[c - 32] : 556; } return w * size / 1000 * (bold ? 1.06 : 1); }
  function fit(s, w, size, bold) { s = pclean(s); if (tw(s, size, bold) <= w) return s; while (s.length > 1 && tw(s + '...', size, bold) > w) s = s.slice(0, -1); return s + '...'; }
  function wrap(s, w, size, bold) { var words = pclean(s).split(' '), lines = [], cur = ''; words.forEach(function (x) { var t = cur ? cur + ' ' + x : x; if (tw(t, size, bold) > w && cur) { lines.push(cur); cur = x; } else cur = t; }); if (cur) lines.push(cur); return lines; }
  function pf(n) { return (Math.round(n * 100) / 100).toString(); }
  function col(c) { return pf(c[0] / 255) + ' ' + pf(c[1] / 255) + ' ' + pf(c[2] / 255); }
  function PDFDoc() {
    var pages = [], ops = null, d = {};
    d.page = function () { ops = []; pages.push(ops); return d; };
    d.count = function () { return pages.length; };
    d.on = function (i) { ops = pages[i]; };
    d.rect = function (x, y, w, h, c) { ops.push(col(c) + ' rg ' + pf(x) + ' ' + pf(y) + ' ' + pf(w) + ' ' + pf(h) + ' re f'); };
    d.box = function (x, y, w, h, c, lw) { ops.push(col(c) + ' RG ' + pf(lw || 1) + ' w ' + pf(x) + ' ' + pf(y) + ' ' + pf(w) + ' ' + pf(h) + ' re S'); };
    d.line = function (x1, y1, x2, y2, c, lw) { ops.push(col(c) + ' RG ' + pf(lw || 1) + ' w ' + pf(x1) + ' ' + pf(y1) + ' m ' + pf(x2) + ' ' + pf(y2) + ' l S'); };
    d.path = function (cmds, ox, oy, sc, stroke, lw, fill) {
      function X(x) { return pf(ox + x * sc); } function Y(y) { return pf(oy - y * sc); }
      var cx = 0, cy = 0, o = [];
      cmds.forEach(function (c) {
        var t = c[0];
        if (t === 'M') { o.push(X(c[1]) + ' ' + Y(c[2]) + ' m'); cx = c[1]; cy = c[2]; }
        else if (t === 'L') { o.push(X(c[1]) + ' ' + Y(c[2]) + ' l'); cx = c[1]; cy = c[2]; }
        else if (t === 'C') { o.push(X(c[1]) + ' ' + Y(c[2]) + ' ' + X(c[3]) + ' ' + Y(c[4]) + ' ' + X(c[5]) + ' ' + Y(c[6]) + ' c'); cx = c[5]; cy = c[6]; }
        else if (t === 'Q') { var x1 = cx + 2 / 3 * (c[1] - cx), y1 = cy + 2 / 3 * (c[2] - cy), x2 = c[3] + 2 / 3 * (c[1] - c[3]), y2 = c[4] + 2 / 3 * (c[2] - c[4]); o.push(X(x1) + ' ' + Y(y1) + ' ' + X(x2) + ' ' + Y(y2) + ' ' + X(c[3]) + ' ' + Y(c[4]) + ' c'); cx = c[3]; cy = c[4]; }
        else if (t === 'Z') o.push('h');
      });
      ops.push('1 j 1 J ' + pf(lw * sc) + ' w ' + (fill ? col(fill) + ' rg ' : '') + col(stroke) + ' RG ' + o.join(' ') + ' ' + (fill ? 'B' : 'S'));
    };
    d.text = function (x, y, s, size, bold, c, align) {
      s = pclean(s); var w = tw(s, size, bold);
      if (align === 'r') x -= w; else if (align === 'c') x -= w / 2;
      ops.push('BT /' + (bold ? 'F2' : 'F1') + ' ' + pf(size) + ' Tf ' + col(c || DARK) + ' rg ' + pf(x) + ' ' + pf(y) + ' Td (' + s.replace(/[\\()]/g, '\\$&') + ') Tj ET');
    };
    d.build = function () {
      var out = '%PDF-1.4\n', offs = [], n = 0;
      function add(body) { n++; offs[n] = out.length; out += n + ' 0 obj\n' + body + '\nendobj\n'; }
      var kids = pages.map(function (_, i) { return (6 + i * 2) + ' 0 R'; }).join(' ');
      add('<< /Type /Catalog /Pages 2 0 R >>');
      add('<< /Type /Pages /Kids [' + kids + '] /Count ' + pages.length + ' >>');
      add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
      add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
      pages.forEach(function (o, i) {
        var s = o.join('\n');
        add('<< /Length ' + s.length + ' >>\nstream\n' + s + '\nendstream');
        add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ' + (5 + i * 2) + ' 0 R >>');
      });
      var xs = out.length;
      out += 'xref\n0 ' + (n + 1) + '\n0000000000 65535 f \n';
      for (var i = 1; i <= n; i++) out += ('0000000000' + offs[i]).slice(-10) + ' 00000 n \n';
      out += 'trailer\n<< /Size ' + (n + 1) + ' /Root 1 0 R >>\nstartxref\n' + xs + '\n%%EOF';
      return out;
    };
    return d;
  }
  function inrP(n) { return 'Rs. ' + Number(n || 0).toLocaleString('en-IN'); }
  function words(n) {
    n = Math.round(n); if (n === 0) return 'Zero';
    var a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    var b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    function two(x) { return x < 20 ? a[x] : b[Math.floor(x / 10)] + (x % 10 ? ' ' + a[x % 10] : ''); }
    function three(x) { return (x >= 100 ? a[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' : '') : '') + (x % 100 ? two(x % 100) : ''); }
    var out = '', cr = Math.floor(n / 10000000); n %= 10000000; var lk = Math.floor(n / 100000); n %= 100000; var th = Math.floor(n / 1000); n %= 1000;
    if (cr) out += three(cr) + ' Crore '; if (lk) out += two(lk) + ' Lakh '; if (th) out += two(th) + ' Thousand '; if (n) out += three(n);
    return out.trim();
  }
  var GOLD = [245, 196, 81];
  function drawMark(d, left, top, sc) {
    var ox = left - 98 * sc, oy = top + 104 * sc;
    d.path([['M', 104, 382], ['L', 104, 198], ['L', 256, 296], ['L', 408, 198], ['L', 408, 382], ['Q', 336, 402, 256, 410], ['Q', 176, 402, 104, 382], ['Z']], ox, oy, sc, WHITE, 14);
    d.path([['M', 256, 296], ['L', 256, 410]], ox, oy, sc, WHITE, 14);
    d.path([['M', 206, 168], ['L', 206, 200], ['C', 206, 220, 230, 232, 256, 232], ['C', 282, 232, 306, 220, 306, 200], ['L', 306, 168]], ox, oy, sc, GOLD, 12);
    d.path([['M', 256, 104], ['L', 352, 148], ['L', 256, 192], ['L', 160, 148], ['Z']], ox, oy, sc, GOLD, 12, INDIGO);
  }
  function pdfHeader(d, title, sub) {
    d.rect(0, 742, 595, 100, INDIGO);
    drawMark(d, 40, 820, 0.17);
    d.text(108, 797, CN(), 24, true, WHITE);
    d.text(108, 772, title, 12, false, [224, 231, 255]);
    if (sub) d.text(108, 755, sub, 9.5, false, [199, 210, 254]);
    var ry = 797;
    if (db.settings.phone) { d.text(555, ry, 'Phone: ' + db.settings.phone, 9.5, false, WHITE, 'r'); ry -= 14; }
    if (db.settings.address) wrap(db.settings.address, 220, 9, false).slice(0, 3).forEach(function (l) { d.text(555, ry, l, 9, false, [224, 231, 255], 'r'); ry -= 12; });
  }
  function pdfFooter(d, label) {
    var total = d.count();
    for (var i = 0; i < total; i++) {
      d.on(i);
      d.line(40, 50, 555, 50, LINEC, 0.6);
      d.text(40, 36, label, 8, false, GRAY);
      d.text(555, 36, 'Page ' + (i + 1) + ' of ' + total, 8, false, GRAY, 'r');
    }
  }
  function receiptPdf(p) {
    var st = studentById(p.sid); if (!st) return null;
    var no = receiptNo(p), fee = Number(st.fee) || 0, amt = Number(p.amount), before = 0, found = false;
    db.payments.forEach(function (q) { if (q.sid === p.sid && q.month === p.month) { if (q === p) found = true; else if (!found) before += Number(q.amount); } });
    var bal = Math.max(fee - before - amt, 0), full = bal === 0;
    var d = PDFDoc().page();
    pdfHeader(d, 'Tuition Fee Receipt');
    d.text(40, 706, 'RECEIPT', 17, true, DARK);
    d.text(555, 708, 'Receipt No: ' + no, 10.5, true, DARK, 'r');
    d.text(555, 693, 'Date: ' + fmtDate(p.date), 10, false, GRAY, 'r');
    d.line(40, 680, 555, 680, LINEC, 0.8);
    // student box
    d.rect(40, 575, 515, 92, LIGHT);
    d.text(54, 650, 'RECEIVED FROM', 8, true, GRAY);
    d.text(54, 631, st.name, 14, true, DARK);
    d.text(54, 611, 'Class: ' + st.std, 10, false, DARK);
    d.text(54, 595, fit('School: ' + st.school, 240, 10, false), 10, false, DARK);
    d.text(330, 650, 'PARENT / GUARDIAN', 8, true, GRAY);
    var par = st.fatherName || st.motherName || '-', ph = st.fatherPhone || st.motherPhone || '';
    d.text(330, 631, fit(par, 215, 12, true), 12, true, DARK);
    d.text(330, 611, ph ? 'Phone: ' + ph : ' ', 10, false, DARK);
    d.text(330, 595, 'Paid via: ' + (p.mode || 'Cash'), 10, false, DARK);
    // table
    d.rect(40, 525, 515, 28, INDIGO);
    d.text(54, 535, 'DESCRIPTION', 9, true, WHITE); d.text(340, 535, 'FEE MONTH', 9, true, WHITE); d.text(541, 535, 'AMOUNT', 9, true, WHITE, 'r');
    d.text(54, 503, 'Tuition fee', 11, false, DARK); d.text(340, 503, fmtMonth(p.month), 11, false, DARK); d.text(541, 503, inrP(amt), 11, true, DARK, 'r');
    d.line(40, 488, 555, 488, LINEC, 0.8);
    // words + summary
    d.text(40, 462, 'AMOUNT IN WORDS', 8, true, GRAY);
    wrap('Rupees ' + words(amt) + ' Only', 250, 10.5, true).forEach(function (l, i) { d.text(40, 445 - i * 14, l, 10.5, true, DARK); });
    var sy = 462;
    [['Monthly fee', inrP(fee)], ['Paid earlier (this month)', inrP(before)], ['Balance after this payment', inrP(bal)]].forEach(function (r) {
      d.text(330, sy, r[0], 10, false, GRAY); d.text(555, sy, r[1], 10, true, DARK, 'r'); sy -= 20;
    });
    d.rect(330, 372, 225, 38, INDIGO);
    d.text(342, 387, 'AMOUNT RECEIVED', 9.5, true, WHITE); d.text(543, 386, inrP(amt), 15, true, WHITE, 'r');
    var sc = full ? GREEN : AMBER;
    d.box(40, 372, 140, 34, sc, 1.6); d.text(110, 384, full ? 'PAID IN FULL' : 'PART PAYMENT', 12, true, sc, 'c');
    if (p.note) wrap('Note: ' + p.note, 270, 9, false).slice(0, 2).forEach(function (l, i) { d.text(40, 345 - i * 12, l, 9, false, GRAY); });
    // signature
    d.text(472, 300, 'For ' + CN(), 9.5, true, DARK, 'c');
    d.line(390, 262, 555, 262, DARK, 0.8);
    d.text(472, 248, 'Authorised Signatory', 9, false, GRAY, 'c');
    d.text(40, 270, 'Thank you for your payment.', 11, true, INDIGO);
    d.text(40, 254, 'Please keep this receipt for your records.', 9, false, GRAY);
    pdfFooter(d, 'This is a computer-generated receipt. | ' + CN());
    return { bin: d.build(), name: 'Receipt_' + no + '_' + st.name.replace(/[^A-Za-z0-9]+/g, '_') + '.pdf' };
  }
  function monthReportPdf(mk) {
    var sm = monthSummary(mk), d = PDFDoc().page(), y;
    pdfHeader(d, 'Monthly Fee Report', fmtMonth(mk) + '  |  Generated on ' + fmtDate(today()));
    var boxes = [['STUDENTS', String(sm.rows.length), DARK], ['FEES PAID', String(sm.paid), GREEN], ['FEES PENDING', String(sm.pending), RED], ['COLLECTED', inrP(sm.collected), INDIGO]];
    boxes.forEach(function (b, i) { var x = 40 + i * 130; d.rect(x, 668, 122, 56, LIGHT); d.text(x + 10, 706, b[0], 8, true, GRAY); d.text(x + 10, 683, b[1], b[1].length > 9 ? 13 : 18, true, b[2]); });
    d.text(40, 645, 'Expected this month: ' + inrP(sm.expected) + '     Outstanding: ' + inrP(sm.outstanding), 10, true, DARK);
    y = 625;
    var head = null;
    function ensure(h) { if (y - h < 70) { d.page(); y = 800; if (head) drawHead(head); } }
    function drawHead(cols) { d.rect(40, y - 22, 515, 22, LIGHT); cols.forEach(function (c) { d.text(c.x, y - 15, c.t, 8.5, true, GRAY, c.a); }); y -= 22; }
    function section(title, c, cols) { ensure(70); d.rect(40, y - 24, 515, 24, c); d.text(50, y - 16, title, 10, true, WHITE); y -= 24; head = cols; drawHead(cols); }
    function row(cells, i) { ensure(22); if (i % 2) d.rect(40, y - 20, 515, 20, [249, 250, 251]); cells.forEach(function (c) { d.text(c.x, y - 14, c.t, 9.5, !!c.b, c.c || DARK, c.a); }); y -= 20; }
    var paidRows = sm.rows.filter(function (r) { return r.status === 'paid'; });
    var pendRows = sm.rows.filter(function (r) { return r.status !== 'paid'; });
    section('PAID STUDENTS (' + paidRows.length + ')', GREEN, [{ x: 50, t: '#' }, { x: 75, t: 'STUDENT' }, { x: 290, t: 'CLASS' }, { x: 390, t: 'PAID ON' }, { x: 545, t: 'AMOUNT', a: 'r' }]);
    if (!paidRows.length) row([{ x: 75, t: 'No payments yet', c: GRAY }], 0);
    paidRows.forEach(function (r, i) { var last = r.pays[r.pays.length - 1]; row([{ x: 50, t: String(i + 1) }, { x: 75, t: fit(r.s.name, 205, 9.5, false) }, { x: 290, t: r.s.std }, { x: 390, t: last ? fmtDate(last.date) : '-' }, { x: 545, t: inrP(r.got), a: 'r', b: 1 }], i); });
    y -= 14;
    section('PENDING STUDENTS (' + pendRows.length + ')', RED, [{ x: 50, t: '#' }, { x: 75, t: 'STUDENT' }, { x: 270, t: 'CLASS' }, { x: 350, t: 'PARENT PHONE' }, { x: 545, t: 'BALANCE', a: 'r' }]);
    if (!pendRows.length) row([{ x: 75, t: 'Everyone has paid', c: GRAY }], 0);
    pendRows.forEach(function (r, i) { row([{ x: 50, t: String(i + 1) }, { x: 75, t: fit(r.s.name + (r.status === 'part' ? ' (part paid)' : ''), 190, 9.5, false) }, { x: 270, t: r.s.std }, { x: 350, t: r.s.fatherPhone || r.s.motherPhone || '-' }, { x: 545, t: inrP(r.bal), a: 'r', b: 1, c: RED }], i); });
    pdfFooter(d, CN() + ' | Fee report ' + fmtMonth(mk));
    return { bin: d.build(), name: 'Fee_Report_' + mk + '.pdf' };
  }
  function sharePdf(pdf, title) {
    if (!pdf) return toast('Could not create PDF');
    var FS = plugin('Filesystem'), Sh = plugin('Share'), b64;
    try { b64 = btoa(pdf.bin); } catch (e) { return toast('Could not create PDF'); }
    if (FS && Sh) {
      FS.writeFile({ path: pdf.name, data: b64, directory: 'CACHE' }).then(function (r) {
        return Sh.share({ title: title, url: r.uri, dialogTitle: 'Share PDF' });
      }).catch(function (e) { if (e && /cancel/i.test(String(e.message || e))) return; toast('Could not share the PDF'); });
    } else {
      var u8 = new Uint8Array(pdf.bin.length); for (var i = 0; i < pdf.bin.length; i++) u8[i] = pdf.bin.charCodeAt(i) & 255;
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([u8], { type: 'application/pdf' })); a.download = pdf.name;
      if (document.body) document.body.appendChild(a); a.click();
    }
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
  var ui = { forgot: false, fails: 0, lockUntil: 0, showFees: false, tab: 'home', locked: true, sheet: null, q: '', stdFilter: 'All', feeFilter: 'pending', feeMonth: monthKey(today()), remFilter: 'all', attDate: today(), attStd: 'All' };

  // ---------- hide / show fee amounts ----------
  var EYE_ON = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3.5"/></svg>';
  var EYE_OFF = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3.5"/><path d="M3 3l18 18"/></svg>';
  function mny(n) { return ui.showFees ? inr(n) : '\u20B9 \u2022\u2022\u2022\u2022'; }
  function eyeBtn(small) { return '<button class="eye' + (small ? ' sm' : '') + '" data-act="toggle-fees" aria-label="Show or hide fee amounts">' + (ui.showFees ? EYE_ON : EYE_OFF) + '</button>'; }

  // ---------- views ----------
  var root = document.getElementById('app');
  function render() {
    if (ui.locked) { root.innerHTML = lockView(); return; }
    var pending = buildReminders();
    var titles = { home: [CN(), greeting()], students: ['Students', db.students.length + ' enrolled'], att: ['Attendance', 'Mark and track daily attendance'], fees: ['Fees', 'Month-wise fee tracking'], reminders: ['Reminders', pending.length + ' ready to send'] };
    var t = titles[ui.tab];
    var body = ({ home: homeView, students: studentsView, att: attView, fees: feesView, reminders: remindersView })[ui.tab](pending);
    var fab = ui.tab === 'students' ? '<button class="fab" data-act="add">+</button>' : '';
    var nav = [['home', '🏠', 'Home'], ['students', '🎓', 'Students'], ['att', '📋', 'Attendance'], ['fees', '💰', 'Fees'], ['reminders', '🔔', 'Reminders']].map(function (n) {
      return '<button class="' + (ui.tab === n[0] ? 'on' : '') + '" data-tab="' + n[0] + '"><span class="ic">' + n[1] + '</span>' + n[2] + (n[0] === 'reminders' && pending.length ? '<span class="badge">' + pending.length + '</span>' : '') + '</button>';
    }).join('');
    root.innerHTML = '<header class="top"><h1>' + esc(t[0]) + '</h1><p>' + esc(t[1]) + '</p></header><main>' + body + '</main>' + fab + '<nav class="bottom">' + nav + '</nav>' + (ui.sheet ? sheetView(pending) : '');
  }
  function greeting() { var h = new Date().getHours(); return (h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening') + ', Admin · ' + fmtDate(today()); }

  function lockView() {
    var first = !db.pin, logo = '<div class="lockLogo">' + LOGO_SVG + '</div>';
    if (ui.forgot) {
      return '<div class="lock">' + logo + '<h2 style="margin:0 0 6px">Forgot PIN?</h2>' +
        (db.recA ? '<p>Answer your recovery question to set a new PIN. Your data stays safe.</p><div class="lq">' + esc(db.recQ) + '</div><input class="txt" id="ra" placeholder="Your answer" autocomplete="off"><input id="npin" type="password" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="New PIN"><button class="btn light" data-act="do-recover">Reset PIN</button>'
          : '<p>No recovery question was set on this phone, so the PIN cannot be reset. You can erase the app data and start over. If you have a backup, you can restore it afterwards.</p>') +
        '<div class="lockdiv"></div><input class="txt" id="rst" placeholder="Type RESET to erase all data" autocomplete="off"><button class="btn dangerw" data-act="erase-all">Erase everything and start over</button><button class="btn linkb" data-act="forgot-back">Back</button></div>';
    }
    return '<div class="lock">' + logo + '<p>' + (first ? 'Create a 4-digit PIN to protect your data' : 'Enter your PIN') + '</p>' +
      '<input id="pin" type="password" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="\u2022\u2022\u2022\u2022">' +
      (first ? '<div class="lq">Recovery question (to reset your PIN if you forget it)</div><select id="rq" class="txt">' + opt(RQS) + '</select><input class="txt" id="ra" placeholder="Your answer" autocomplete="off">' : '') +
      '<button class="btn light" data-act="unlock">' + (first ? 'Set PIN' : 'Unlock') + '</button>' +
      (first ? '' : '<button class="btn linkb" data-act="forgot">Forgot PIN?</button>') + '</div>';
  }

  function homeView(pending) {
    var now = today(), cur = monthKey(now), sm = monthSummary(cur);
    var pctC = sm.expected ? Math.min(100, Math.round(sm.collected / sm.expected * 100)) : 0;
    var todayAtt = db.attendance[now] || {}, present = 0, absent = 0;
    Object.keys(todayAtt).forEach(function (k) { if (todayAtt[k] === 'P') present++; else if (todayAtt[k] === 'A') absent++; });
    var h = '<div class="hero">' + eyeBtn() + '<div class="sub2">Fees collected for ' + fmtMonth(cur) + '</div><div class="big2">' + (ui.showFees ? inr(sm.collected) + ' <small>of ' + inr(sm.expected) + '</small>' : mny(0)) + '</div><div class="bar"><i style="width:' + (ui.showFees ? pctC : 0) + '%"></i></div><div class="sub2">' + sm.paid + ' paid \u00B7 ' + sm.pending + ' pending' + (ui.showFees ? ' \u00B7 ' + inr(sm.outstanding) + ' outstanding' : ' \u00B7 tap the eye to view amounts') + '</div></div>';
    h += '<div class="grid2"><div class="stat"><b>' + db.students.length + '</b><span>Students</span></div>' +
      '<div class="stat ' + (db.students.length && present + absent === 0 ? 'warn' : 'ok') + '"><b>' + (present + absent ? present + '/' + (present + absent) : '—') + '</b><span>' + (present + absent ? 'Present today' : 'Attendance not marked') + '</span></div></div>';
    h += '<div class="sec">Quick actions</div><div class="card"><div class="grid2">' +
      '<button class="btn" data-act="add-student">+ New student</button><button class="btn" data-act="go-att">Mark attendance</button>' +
      '<button class="btn ghost" data-act="go-fees">Month-wise fees</button><button class="btn ghost" data-act="settings">Settings</button>' +
      '<button class="btn wa block" style="grid-column:1/3" data-act="go-rem">Send ' + pending.length + ' pending reminder' + (pending.length === 1 ? '' : 's') + '</button></div></div>';
    if (!db.recA) h += '<div class="card"><b>Set a recovery question</b><div class="sub" style="margin:4px 0 10px">If you forget your PIN, this is the only way to reset it without erasing your data.</div><button class="btn sm" data-act="recovery">Set recovery question</button></div>';
    var att = attention();
    if (att.length) h += '<div class="sec">Needs attention</div>' + att.slice(0, 5).map(function (x) {
      return '<div class="card row" data-act="view-student" data-id="' + x.st.id + '">' + avatar(x.st.name) + '<div class="grow"><div class="title">' + esc(x.st.name) + '</div><div class="sub">' + esc(x.st.std) + '</div><div>' + x.reasons.map(function (r) { return '<span class="pill ' + r[0] + '" style="margin:3px 4px 0 0">' + esc(r[1]) + '</span>'; }).join('') + '</div></div></div>';
    }).join('');
    var bd = db.students.filter(function (s) { return s.dob && s.dob.slice(5) === now.slice(5); });
    if (bd.length) h += '<div class="card">🎂 <b>Birthday today:</b> ' + bd.map(function (s) { return esc(s.name); }).join(', ') + '</div>';
    h += '<div class="sec">Data</div><div class="card"><div class="grid2"><button class="btn ghost" data-act="backup">Backup data</button><button class="btn ghost" data-act="restore">Restore</button><button class="btn ghost" data-act="chpin">Change PIN</button><button class="btn ghost" data-act="recovery">Recovery question</button><button class="btn danger block" style="grid-column:1/3" data-act="lock">Lock app</button></div><p class="sub" style="margin:10px 0 0">Data is stored on this phone. Take a backup regularly, especially before changing phones.</p></div>';
    return h;
  }

  function studentsView() {
    var chips = '<div class="chips">' + ['All'].concat(STANDARDS).map(function (s) { return '<button data-std="' + esc(s) + '" class="' + (ui.stdFilter === s ? 'on' : '') + '">' + esc(s) + '</button>'; }).join('') + '</div>';
    var q = ui.q.toLowerCase();
    var list = db.students.filter(function (s) { return (ui.stdFilter === 'All' || s.std === ui.stdFilter) && (!q || (s.name + ' ' + s.school + ' ' + (s.fatherName || '') + ' ' + (s.motherName || '')).toLowerCase().indexOf(q) >= 0); })
      .sort(function (a, b) { return a.name.localeCompare(b.name); });
    var h = '<input class="search" id="q" placeholder="Search student, parent or school" value="' + esc(ui.q) + '">' + chips;
    if (!list.length) return h + '<div class="empty"><div class="big">🎓</div><p>' + (db.students.length ? 'No students match.' : 'No students yet.<br>Tap + to enroll your first student.') + '</p></div>';
    return h + list.map(function (s) {
      var f = feeStatus(s);
      return '<div class="card row" data-act="view-student" data-id="' + s.id + '">' + avatar(s.name) + '<div class="grow"><div class="title">' + esc(s.name) + '</div><div class="sub">' + esc(s.std) + ' · ' + esc(s.school) + '</div></div><span class="pill ' + f.cls + '">' + f.label + '</span></div>';
    }).join('');
  }

  function feesView() {
    var months = feeMonthsList();
    if (months.indexOf(ui.feeMonth) < 0) ui.feeMonth = months[0];
    var mk = ui.feeMonth, sm = monthSummary(mk), pctC = sm.expected ? Math.min(100, Math.round(sm.collected / sm.expected * 100)) : 0;
    var isCur = mk === monthKey(today());
    var h = '<div class="card"><label style="margin:0 0 4px">Fee month</label><select id="fee_month">' + opt(months.map(function (m) { return [m, fmtMonth(m) + (m === monthKey(today()) ? ' (this month)' : '')]; }), mk) + '</select></div>';
    h += '<div class="hero">' + eyeBtn() + '<div class="sub2">Collected for ' + fmtMonth(mk) + '</div><div class="big2">' + (ui.showFees ? inr(sm.collected) + ' <small>of ' + inr(sm.expected) + '</small>' : mny(0)) + '</div><div class="bar"><i style="width:' + (ui.showFees ? pctC : 0) + '%"></i></div><div class="sub2">' + (ui.showFees ? pctC + '% collected \u00B7 ' + inr(sm.outstanding) + ' outstanding' : 'Amounts hidden \u00B7 tap the eye to view') + '</div></div>';
    h += '<div class="grid2"><div class="stat ok"><b>' + sm.paid + '</b><span>Students paid</span></div><div class="stat bad"><b>' + sm.pending + '</b><span>Students pending</span></div></div>';
    h += '<button class="btn ghost block" style="margin:12px 0" data-act="month-pdf">Download / share ' + esc(fmtMonth(mk)) + ' report (PDF)</button>';
    h += '<div class="chips">' + [['pending', 'Pending (' + sm.pending + ')'], ['paid', 'Paid (' + sm.paid + ')'], ['all', 'All (' + sm.rows.length + ')']].map(function (c) { return '<button data-ff="' + c[0] + '" class="' + (ui.feeFilter === c[0] ? 'on' : '') + '">' + c[1] + '</button>'; }).join('') + '</div>';
    var list = sm.rows.filter(function (r) { return ui.feeFilter === 'all' || (ui.feeFilter === 'paid' ? r.status === 'paid' : r.status !== 'paid'); });
    if (!list.length) return h + '<div class="empty"><div class="big">' + (ui.feeFilter === 'pending' ? '🎉' : '💰') + '</div><p>' + (db.students.length ? (ui.feeFilter === 'pending' ? 'No pending fees for ' + esc(fmtMonth(mk)) + '.' : 'Nothing here.') : 'Add students to track fees.') + '</p></div>';
    return h + list.map(function (r) {
      var pill = r.status === 'paid' ? ['ok', 'Paid'] : r.status === 'part' ? ['warn', 'Part paid'] : ['bad', 'Pending'];
      var line = r.status === 'paid' ? 'Received ' + mny(r.got) + (r.pays.length ? ' on ' + fmtDate(r.pays[r.pays.length - 1].date) : '')
        : r.status === 'part' ? 'Paid ' + mny(r.got) + ' · Balance <b style="color:var(--bad)">' + inr(r.bal) + '</b>'
        : 'Balance <b style="color:var(--bad)">' + inr(r.bal) + '</b>' + (isCur && +today().slice(8, 10) < (+r.s.dueDay || 1) ? ' · due on ' + r.s.dueDay + 'th' : '');
      var last = r.pays[r.pays.length - 1];
      return '<div class="card"><div class="row" data-act="view-student" data-id="' + r.s.id + '">' + avatar(r.s.name) + '<div class="grow"><div class="title">' + esc(r.s.name) + '</div><div class="sub">' + esc(r.s.std) + ' · ' + inr(r.fee) + '/month</div></div><span class="pill ' + pill[0] + '">' + pill[1] + '</span></div>' +
        '<div class="sub" style="margin:8px 0 10px">' + line + '</div><div class="row" style="flex-wrap:wrap">' +
        (r.status !== 'paid' ? '<button class="btn sm grow" data-act="pay" data-id="' + r.s.id + '" data-m="' + mk + '">Record payment</button><button class="btn wa sm" data-act="remind-fee" data-id="' + r.s.id + '" data-m="' + mk + '">Remind</button>' : '') +
        (last ? '<button class="btn ghost sm' + (r.status === 'paid' ? ' grow' : '') + '" data-act="receipt-pdf" data-id="' + last.id + '">PDF receipt</button>' : '') + '</div></div>';
    }).join('');
  }

  function attView() {
    var stds = STANDARDS.filter(function (s) { return db.students.some(function (x) { return x.std === s; }); });
    if (!stds.length) return '<div class="empty"><div class="big">📋</div><p>Enroll students to mark attendance.</p></div>';
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
    var chips = '<div class="chips">' + [['all', 'All'], ['fee', 'Fees'], ['absent', 'Absent'], ['more', 'Receipts & reports']].map(function (c) { return '<button data-rf="' + c[0] + '" class="' + (ui.remFilter === c[0] ? 'on' : '') + '">' + c[1] + '</button>'; }).join('') + '</div>';
    var list = pending.filter(function (r) { return ui.remFilter === 'all' || r.type === ui.remFilter; });
    if (!list.length) return chips + '<div class="empty"><div class="big">✅</div><p>All caught up! No reminders pending.</p></div>';
    return '<button class="btn wa block" style="margin-bottom:12px" data-act="queue">▶ Send one by one (' + list.length + ')</button>' + chips + list.map(function (r) { return remCard(r); }).join('');
  }
  function remCard(r) {
    var st = studentById(r.sid), rec = recipients(st);
    return '<div class="card"><div class="row"><div style="font-size:24px">' + r.icon + '</div><div class="grow"><div class="title">' + esc(st.name) + '</div><div class="sub">' + esc(r.label) + '</div></div></div><div class="msg">' + esc(r.text) + '</div>' +
      (rec.length ? '<div class="row" style="flex-wrap:wrap">' + rec.map(function (p, i) { return '<button class="btn wa sm" data-act="send" data-rid="' + esc(r.id) + '" data-i="' + i + '">Send to ' + esc(p.who) + '</button>'; }).join('') + (r.sub === 'receipt' ? '<button class="btn sm" data-act="receipt-pdf" data-id="' + r.pid + '">PDF</button>' : '') + '<button class="btn ghost sm" data-act="skip" data-rid="' + esc(r.id) + '">Mark done</button></div>' : '<div class="sub" style="color:var(--bad)">No parent phone number saved.</div>') + '</div>';
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
        '<div class="grid2"><div><label>Monthly fee (₹) *</label><input id="f_fee" type="number" inputmode="numeric" value="' + esc(e.fee) + '"></div><div><label>Fee due day (1-28)</label><input id="f_dueDay" type="number" inputmode="numeric" min="1" max="28" value="' + esc(e.dueDay || 5) + '"></div></div>' +
        '<label>Date of birth (for birthday wishes)</label><input id="f_dob" type="date" value="' + esc(e.dob) + '">' +
        '<div class="sec">Parents</div><div class="grid2"><div><label>Father name</label><input id="f_fn" value="' + esc(e.fatherName) + '"></div><div><label>Father phone</label><input id="f_fp" type="tel" inputmode="tel" value="' + esc(e.fatherPhone) + '"></div>' +
        '<div><label>Mother name</label><input id="f_mn" value="' + esc(e.motherName) + '"></div><div><label>Mother phone</label><input id="f_mp" type="tel" inputmode="tel" value="' + esc(e.motherPhone) + '"></div></div>' +
        '<label>Send reminders to</label><select id="f_notify">' + opt([['father', 'Father'], ['mother', 'Mother'], ['both', 'Both parents']], e.notify || 'father') + '</select>' +
        '<div class="row" style="margin-top:16px"><button class="btn grow" data-act="save-student">Save</button><button class="btn ghost" data-act="close">Cancel</button></div>';
    } else if (s.type === 'student-view') {
      var st = studentById(s.id), f = feeStatus(st), a30 = attStats(st.id, addDays(today(), -30));
      var pays = db.payments.filter(function (p) { return p.sid === st.id; }).sort(function (x, y) { return y.date.localeCompare(x.date); }).slice(0, 8);
      var totalPaid = db.payments.filter(function (p) { return p.sid === st.id; }).reduce(function (a, p) { return a + Number(p.amount); }, 0);
      h = '<div class="row">' + avatar(st.name, 52) + '<div class="grow"><h2>' + esc(st.name) + '</h2><div class="sub">' + esc(st.std) + ' · ' + esc(st.school) + '</div></div></div>' +
        '<div class="grid3" style="margin:14px 0 8px"><div class="mini"><b>' + (a30.total ? a30.pct + '%' : '—') + '</b><span>Attendance</span></div><div class="mini"><b class="' + f.cls + '">' + f.label + '</b><span>Fees</span></div><div class="mini"><b>' + mny(totalPaid) + '</b><span>Total paid</span></div></div>' +
        '<div class="card" style="margin-bottom:8px"><div class="sub">Joined: <b>' + fmtDate(st.joined) + '</b>' + (st.dob ? ' · Birthday: <b>' + fmtDate(st.dob).replace(/ \d{4}$/, '') + '</b>' : '') + '</div><div class="sub" style="margin-top:4px">Fee: <b>' + inr(st.fee) + '/month</b> (due on ' + st.dueDay + 'th)</div>' +
        '<div class="sub" style="margin-top:6px">Father: <b>' + esc(st.fatherName || '-') + '</b> ' + (st.fatherPhone ? '<a href="tel:' + esc(st.fatherPhone) + '">' + esc(st.fatherPhone) + '</a>' : '') + '</div><div class="sub" style="margin-top:4px">Mother: <b>' + esc(st.motherName || '-') + '</b> ' + (st.motherPhone ? '<a href="tel:' + esc(st.motherPhone) + '">' + esc(st.motherPhone) + '</a>' : '') + '</div><div class="sub" style="margin-top:4px">Reminders go to: <b>' + esc(st.notify) + '</b></div></div>' +
        (pays.length ? '<div class="card" style="margin-bottom:8px"><div class="row" style="margin-bottom:4px"><div class="grow sub">Payments</div>' + eyeBtn(true) + '</div>' + pays.map(function (p) { return '<div class="row" style="padding:5px 0"><div class="grow sub">' + fmtDate(p.date) + ' · ' + fmtMonth(p.month) + '<br><b style="color:var(--text)">' + mny(p.amount) + '</b></div><button class="btn ghost sm" data-act="receipt-pdf" data-id="' + p.id + '">PDF receipt</button><button class="x" data-act="del-pay" data-id="' + p.id + '">✕</button></div>'; }).join('') + '</div>' : '') +
        '<div class="grid2" style="margin-top:12px"><button class="btn" data-act="pay" data-id="' + st.id + '">Record payment</button><button class="btn wa" data-act="report-now" data-id="' + st.id + '">Send monthly report</button><button class="btn ghost" data-act="edit-student" data-id="' + st.id + '">Edit</button><button class="btn danger" data-act="del-student" data-id="' + st.id + '">Delete</button></div><button class="btn ghost block" style="margin-top:10px" data-act="close">Close</button>';
    } else if (s.type === 'pay') {
      var p = studentById(s.id), dm = dueMonths(p), months = monthsRange(monthKey(p.joined), monthKey(today()));
      var defMonth = s.month && months.indexOf(s.month) >= 0 ? s.month : (dm.length ? dm[0].month : monthKey(today()));
      var got = paidMonths(p.id)[defMonth] || 0, defAmt = Math.max((Number(p.fee) || 0) - got, 0) || p.fee;
      h = '<h2>Record payment</h2><div class="sub">' + esc(p.name) + ' · ' + esc(p.std) + ' · monthly fee ' + inr(p.fee) + '</div>' +
        '<label>For month</label><select id="f_month">' + opt(months.slice().reverse().map(function (m) { return [m, fmtMonth(m)]; }), defMonth) + '</select>' +
        '<label>Amount received (₹) - part payment is fine</label><input id="f_amt" type="number" inputmode="numeric" value="' + esc(defAmt) + '">' +
        '<div class="grid2"><div><label>Date received</label><input id="f_date" type="date" value="' + today() + '"></div><div><label>Paid via</label><select id="f_mode">' + opt(['Cash', 'UPI', 'Bank transfer', 'Cheque']) + '</select></div></div>' +
        '<label>Note on receipt (optional)</label><input id="f_note" placeholder="e.g. Includes exam fee">' +
        '<div class="row" style="margin-top:16px"><button class="btn grow" data-act="save-pay" data-id="' + p.id + '">Save and get receipt</button><button class="btn ghost" data-act="close">Cancel</button></div>';
    } else if (s.type === 'paid-done') {
      var pd = db.payments.find(function (x) { return x.id === s.pid; }), sp = pd && studentById(pd.sid);
      h = pd && sp ? '<div class="empty" style="padding:10px"><div class="big">✅</div><h2>Payment saved</h2><p>' + inr(pd.amount) + ' received from ' + esc(sp.name) + '<br>Receipt ' + receiptNo(pd) + '</p></div>' +
        '<button class="btn block" style="margin-bottom:8px" data-act="receipt-pdf" data-id="' + pd.id + '">Share PDF receipt</button>' +
        '<button class="btn ghost block" style="margin-bottom:8px" data-act="close">Done</button>' : '<button class="btn block" data-act="close">Close</button>';
    } else if (s.type === 'sendmsg') {
      var sm2 = studentById(s.sid), rc = sm2 ? recipients(sm2) : [];
      h = '<h2>' + esc(s.title || 'Send message') + '</h2><div class="sub">' + esc(sm2 ? sm2.name : '') + '</div><div class="msg">' + esc(s.text) + '</div>' +
        (rc.length ? rc.map(function (x, i) { return '<button class="btn wa block" style="margin-bottom:8px" data-act="send-custom" data-i="' + i + '">Send to ' + esc(x.who) + ' on WhatsApp</button>'; }).join('') : '<div class="sub" style="color:var(--bad)">No phone number saved.</div>') +
        '<button class="btn ghost block" data-act="close">Close</button>';
    } else if (s.type === 'queue') {
      var qlist = pending.filter(function (r) { return ui.remFilter === 'all' || r.type === ui.remFilter; }), cur = qlist[0];
      if (!cur) h = '<div class="empty"><div class="big">🎉</div><p>All reminders sent!</p></div><button class="btn block" data-act="close">Done</button>';
      else { var stq = studentById(cur.sid), recq = recipients(stq); h = '<div class="sub">' + qlist.length + ' remaining</div><div class="row" style="margin-top:6px"><div style="font-size:26px">' + cur.icon + '</div><div class="grow"><h2>' + esc(stq.name) + '</h2><div class="sub">' + esc(cur.label) + '</div></div></div><div class="msg">' + esc(cur.text) + '</div>' +
        (recq.length ? recq.map(function (p, i) { return '<button class="btn wa block" style="margin-bottom:8px" data-act="send" data-rid="' + esc(cur.id) + '" data-i="' + i + '">Send to ' + esc(p.who) + ' on WhatsApp</button>'; }).join('') : '<div class="sub" style="color:var(--bad)">No phone number saved.</div>') +
        '<div class="grid2"><button class="btn ghost" data-act="skip" data-rid="' + esc(cur.id) + '">Skip (mark done)</button><button class="btn ghost" data-act="close">Stop</button></div>'; }
    } else if (s.type === 'settings') {
      h = '<h2>Settings</h2><label>Class / institute name (shown on messages and receipts)</label><input id="f_cn" value="' + esc(db.settings.className) + '">' +
        '<label>Contact phone (shown on receipts)</label><input id="f_ph" type="tel" inputmode="tel" value="' + esc(db.settings.phone) + '">' +
        '<label>Address (shown on receipts)</label><textarea id="f_ad" rows="2">' + esc(db.settings.address) + '</textarea>' +
        '<label>Message language</label><select id="f_lang">' + opt([['en', 'English'], ['hi', 'हिन्दी (Hindi)']], db.settings.lang) + '</select>' +
        '<label>Repeat fee reminder every (days)</label><input id="f_rep" type="number" inputmode="numeric" min="1" max="30" value="' + esc(db.settings.feeRepeatDays) + '">' +
        '<div class="row" style="margin-top:16px"><button class="btn grow" data-act="save-settings">Save</button><button class="btn ghost" data-act="close">Cancel</button></div>';
    } else if (s.type === 'backup') {
      h = '<h2>Backup</h2><p class="sub">Share this to yourself (WhatsApp / Google Keep) and keep it safe.</p><textarea id="f_data" rows="8" readonly>' + esc(JSON.stringify(Object.assign({}, db, { pin: '', recQ: '', recA: '' }))) + '</textarea>' +
        '<div class="row" style="margin-top:14px"><button class="btn grow" data-act="share-backup">Share / Copy</button><button class="btn ghost" data-act="close">Close</button></div>';
    } else if (s.type === 'restore') {
      h = '<h2>Restore</h2><p class="sub">Paste your backup text. This replaces current data.</p><textarea id="f_data" rows="8"></textarea>' +
        '<div class="row" style="margin-top:14px"><button class="btn grow" data-act="do-restore">Restore</button><button class="btn ghost" data-act="close">Cancel</button></div>';
    } else if (s.type === 'recovery') {
      h = '<h2>Recovery question</h2><p class="sub">If you forget your PIN, answering this lets you set a new one without losing data.</p><label>Current PIN</label><input id="f_cur" type="password" inputmode="numeric" maxlength="4"><label>Question</label><select id="f_rq">' + opt(RQS, db.recQ) + '</select><label>Answer</label><input id="f_ra" autocomplete="off" placeholder="Your answer"><div class="row" style="margin-top:16px"><button class="btn grow" data-act="save-recovery">Save</button><button class="btn ghost" data-act="close">Cancel</button></div>';
    } else if (s.type === 'chpin') {
      h = '<h2>Change PIN</h2><label>Current PIN</label><input id="f_cur" type="password" inputmode="numeric" maxlength="4"><label>New 4-digit PIN</label><input id="f_pin" type="password" inputmode="numeric" maxlength="4"><div class="row" style="margin-top:16px"><button class="btn grow" data-act="save-pin">Save</button><button class="btn ghost" data-act="close">Cancel</button></div>';
    }
    return '<div class="sheet-bg" data-act="bg"><div class="sheet">' + h + '</div></div>';
  }

  // ---------- actions ----------
  function val(id) { var el = document.getElementById(id); return el ? String(el.value).trim() : ''; }
  function open(type, extra) { ui.sheet = Object.assign({ type: type }, extra || {}); render(); }
  function close() { ui.sheet = null; render(); }

  function lockedOut() {
    var left = Math.ceil((ui.lockUntil - Date.now()) / 1000);
    if (left > 0) { toast('Too many wrong attempts. Try again in ' + left + ' seconds'); return true; }
    return false;
  }
  function failAttempt(msg) {
    ui.fails++;
    if (ui.fails >= 5) { ui.fails = 0; ui.lockUntil = Date.now() + 60000; return toast('Too many wrong attempts. Wait 60 seconds.'); }
    toast(msg + ' (' + (5 - ui.fails) + ' tries left)');
  }
  function act(a, el, ev) {
    var id = el && el.dataset.id;
    switch (a) {
      case 'unlock': {
        if (lockedOut()) return;
        var p = val('pin');
        if (!/^\d{4}$/.test(p)) return toast('Enter exactly 4 digits');
        if (!db.pin) {
          var qa = val('ra'); if (qa.length < 2) return toast('Enter an answer for the recovery question');
          db.pin = p; db.recQ = val('rq'); db.recA = hashAns(qa); save();
        } else if (db.pin !== p) return failAttempt('Wrong PIN');
        ui.fails = 0; ui.locked = false; ui.showFees = false; render(); scheduleDaily(); return;
      }
      case 'lock': ui.locked = true; ui.sheet = null; ui.showFees = false; ui.forgot = false; return render();
      case 'toggle-fees': ui.showFees = !ui.showFees; return render();
      case 'forgot': ui.forgot = true; return render();
      case 'forgot-back': ui.forgot = false; return render();
      case 'do-recover': {
        if (lockedOut()) return;
        if (!db.recA) return toast('No recovery question was set');
        var np2 = val('npin'); if (!/^\d{4}$/.test(np2)) return toast('Enter a new 4-digit PIN');
        if (hashAns(val('ra')) !== db.recA) return failAttempt('Wrong answer');
        db.pin = np2; save(); ui.forgot = false; ui.fails = 0; toast('PIN reset. Unlock with your new PIN'); return render();
      }
      case 'erase-all': {
        if (val('rst').toUpperCase() !== 'RESET') return toast('Type RESET to confirm');
        db = blank(); save(); try { localStorage.removeItem(OLD_KEY); } catch (e) {}
        ui.forgot = false; ui.fails = 0; toast('All data erased. Create a new PIN'); return render();
      }
      case 'recovery': return open('recovery');
      case 'save-recovery': {
        if (val('f_cur') !== db.pin) return toast('Current PIN is wrong');
        if (val('f_ra').length < 2) return toast('Enter an answer');
        db.recQ = val('f_rq'); db.recA = hashAns(val('f_ra')); save(); toast('Recovery question saved'); return close();
      }
      case 'add': return open('student', { data: {} });
      case 'add-student': return open('student', { data: {} });
      case 'go-rem': ui.tab = 'reminders'; return render();
      case 'go-att': ui.tab = 'att'; return render();
      case 'go-fees': ui.tab = 'fees'; return render();
      case 'bg': if (ev && el === ev.target) close(); return;
      case 'close': return close();
      case 'view-student': return open('student-view', { id: id });
      case 'edit-student': return open('student', { data: studentById(id) });
      case 'pay': return open('pay', { id: id, month: el.dataset.m || ui.feeMonth });
      case 'queue': return open('queue');
      case 'settings': return open('settings');
      case 'save-settings': {
        db.settings.className = val('f_cn') || 'MyTution'; db.settings.phone = val('f_ph'); db.settings.address = val('f_ad'); db.settings.lang = val('f_lang') || 'en'; db.settings.feeRepeatDays = Math.max(1, Math.min(30, Number(val('f_rep')) || 7));
        save(); toast('Settings saved'); return close();
      }
      case 'save-student': {
        var d = { name: val('f_name'), std: val('f_std'), school: val('f_school'), joined: val('f_joined'), fee: val('f_fee'), dueDay: String(Math.max(1, Math.min(28, Number(val('f_dueDay')) || 5))), dob: val('f_dob'), fatherName: val('f_fn'), fatherPhone: val('f_fp'), motherName: val('f_mn'), motherPhone: val('f_mp'), notify: val('f_notify') };
        if (!d.name || !d.school || !d.joined || !d.fee) return toast('Fill name, school, join date and fee');
        if (!d.fatherPhone && !d.motherPhone) return toast('Add at least one parent phone');
        var bad = false; [d.fatherPhone, d.motherPhone].forEach(function (x) { if (x && phoneFor(x).length < 11) bad = true; });
        if (bad) return toast('Phone should be 10 digits');
        var ex = ui.sheet.data && ui.sheet.data.id;
        if (ex) Object.assign(studentById(ex), d); else db.students.push(Object.assign({ id: uid() }, d));
        save(); toast(ex ? 'Student updated' : 'Student enrolled'); return close();
      }
      case 'del-student':
        if (!confirm('Delete this student and all their fees and attendance?')) return;
        db.students = db.students.filter(function (s) { return s.id !== id; });
        db.payments = db.payments.filter(function (p) { return p.sid !== id; });
        Object.keys(db.attendance).forEach(function (d) { delete db.attendance[d][id]; });
        save(); toast('Deleted'); return close();
      case 'save-pay': {
        var amt = Number(val('f_amt')); if (!(amt > 0)) return toast('Enter amount');
        var pay = { id: uid(), sid: id, month: val('f_month'), amount: amt, date: val('f_date') || today(), mode: val('f_mode') || 'Cash', note: val('f_note'), sent: false };
        db.payments.push(pay); receiptNo(pay); save();
        return open('paid-done', { pid: pay.id });
      }
      case 'receipt-pdf': { var rp = db.payments.find(function (x) { return x.id === id; }); if (!rp) return; return sharePdf(receiptPdf(rp), 'Fee receipt'); }
      case 'month-pdf': return sharePdf(monthReportPdf(ui.feeMonth), 'Fee report ' + fmtMonth(ui.feeMonth));
      case 'del-pay': if (confirm('Delete this payment entry?')) { db.payments = db.payments.filter(function (p) { return p.id !== id; }); save(); render(); } return;
      case 'remind-fee': {
        var rs = studentById(id), mrow = monthSummary(el.dataset.m).rows.find(function (r) { return r.s.id === id; });
        if (!rs || !mrow) return;
        return open('sendmsg', { sid: id, title: 'Fee reminder', text: feeMsg(rs, [el.dataset.m], mrow.bal) });
      }
      case 'report-now': { var stu = studentById(id); return open('sendmsg', { sid: id, title: 'Monthly report', text: progressText(stu, monthKey(today())) }); }
      case 'send-custom': { var cs = ui.sheet, rec1 = recipients(studentById(cs.sid))[+el.dataset.i]; if (rec1) openWhatsApp(rec1.phone, cs.text); toast('Opening WhatsApp...'); return; }
      case 'att': {
        var day = db.attendance[ui.attDate] || (db.attendance[ui.attDate] = {});
        day[id] = el.dataset.v; save(); return render();
      }
      case 'all-present': {
        var dd = db.attendance[ui.attDate] || (db.attendance[ui.attDate] = {});
        db.students.forEach(function (s) { if ((ui.attStd === 'All' || s.std === ui.attStd) && monthKey(s.joined) <= monthKey(ui.attDate) && !dd[s.id]) dd[s.id] = 'P'; });
        save(); toast('Everyone marked present'); return render();
      }
      case 'send': case 'skip': {
        var r = buildReminders().find(function (x) { return x.id === el.dataset.rid; }); if (!r) return;
        if (a === 'send') { var rec = recipients(studentById(r.sid))[+el.dataset.i]; openWhatsApp(rec.phone, r.text); }
        markSent(r); toast(a === 'send' ? 'Opening WhatsApp...' : 'Marked done'); return render();
      }
      case 'backup': return open('backup');
      case 'restore': return open('restore');
      case 'chpin': return open('chpin');
      case 'save-pin': { if (val('f_cur') !== db.pin) return toast('Current PIN is wrong'); var np = val('f_pin'); if (!/^\d{4}$/.test(np)) return toast('Enter 4 digits'); db.pin = np; save(); toast('PIN changed'); return close(); }
      case 'share-backup': {
        var txt = document.getElementById('f_data').value, Sh = plugin('Share');
        if (Sh) Sh.share({ title: CN() + ' backup', text: txt }).catch(function () {});
        else { try { navigator.clipboard.writeText(txt); toast('Copied'); } catch (e) { toast('Select and copy the text'); } }
        return;
      }
      case 'do-restore': {
        try { var d2 = JSON.parse(val('f_data')); if (!d2.students || !d2.payments) throw 0; if (!confirm('Replace all current data?')) return; d2.pin = db.pin; d2.recQ = db.recQ; d2.recA = db.recA; db = Object.assign(blank(), d2); db.settings = Object.assign(blank().settings, d2.settings || {}); if (db.settings.className === 'Saroj Classes') db.settings.className = 'MyTution'; save(); toast('Restored'); close(); } catch (e) { toast('Invalid backup text'); }
        return;
      }
    }
  }

  // ---------- events ----------
  root.addEventListener('click', function (e) {
    var t = e.target.closest('[data-tab],[data-act],[data-std],[data-ff],[data-rf],[data-as]'); if (!t) return;
    if (t.dataset.tab) { ui.tab = t.dataset.tab; ui.sheet = null; return render(); }
    if (t.dataset.std) { ui.stdFilter = t.dataset.std; return render(); }
    if (t.dataset.ff) { ui.feeFilter = t.dataset.ff; return render(); }
    if (t.dataset.rf) { ui.remFilter = t.dataset.rf; return render(); }
    if (t.dataset.as) { ui.attStd = t.dataset.as; return render(); }
    if (t.dataset.act) act(t.dataset.act, t, e);
  });
  root.addEventListener('input', function (e) {
    if (e.target.id === 'q') { ui.q = e.target.value; var pos = e.target.selectionStart; render(); var q = document.getElementById('q'); q.focus(); q.setSelectionRange(pos, pos); }
  });
  root.addEventListener('change', function (e) {
    if (e.target.id === 'att_date' && e.target.value) { ui.attDate = e.target.value; render(); }
    if (e.target.id === 'fee_month' && e.target.value) { ui.feeMonth = e.target.value; render(); }
  });
  root.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.id === 'pin') act('unlock'); });

  if (typeof document.addEventListener === 'function') document.addEventListener('visibilitychange', function () { if (document.hidden && ui.showFees) { ui.showFees = false; if (!ui.locked && !ui.sheet) render(); } });

  render();
})();
