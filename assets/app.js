/* ============================================================
   Career Hub - vanilla JS, no build step, no dependencies.
   Progress lives in localStorage and can be exported/imported.
   ============================================================ */
(function () {
"use strict";

var D = window.CAREER_HUB_DATA;
var KEY = "career-hub.v1";
var THEME_KEY = "career-hub.theme";

/* ---------------------------------------------------------- state */
var state = {
  currentDay: 1,
  view: "today",
  course: "gen",
  jobs: [],
  // done is a flat id -> true map:
  //   gen:   "d3am4"      (day item)
  //   aws:   "linux#12"   (module item)
  //   proj:  "as-3"       (milestone)
  //   li:    "post-07"    (linkedin post)
  //   job:   "jb-2"       (playbook step)
  done: {},
  notes: {}
};
var openMods = {};
var filters = { course: "", proj: "", li: "", hideDone: false, hideDoneProj: false };

/* ------------------------------------------------------ utilities */
function $(s, r) { return (r || document).querySelector(s); }
function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

function el(tag, cls, text) {
  var n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function isDone(id) { return !!state.done[id]; }

function setDone(id, val) {
  if (val) state.done[id] = 1; else delete state.done[id];
  save();
}

/* eslint-disable no-unused-vars */
function pct(a, b) { return b ? Math.round((a / b) * 100) : 0; }
function plural(n, word) { return n + " " + word + (n === 1 ? "" : "s"); }

/* --------------------------------------------------- persistence */
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      currentDay: state.currentDay, done: state.done, notes: state.notes,
      jobs: state.jobs, view: state.view, course: state.course
    }));
  } catch (e) { /* quota or private mode - progress simply will not persist */ }
}

function load() {
  var raw;
  try { raw = localStorage.getItem(KEY); } catch (e) { return; }
  if (!raw) return;
  try {
    var s = JSON.parse(raw);
    state.done = s.done || {};
    state.notes = s.notes || {};
    state.jobs = Array.isArray(s.jobs) ? s.jobs : [];
    state.currentDay = Math.min(60, Math.max(1, s.currentDay || 1));
    state.view = s.view || "today";
    state.course = s.course || "gen";
  } catch (e) { /* corrupt payload: start clean rather than crash */ }
}

function exportState() {
  var blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "career-hub-" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  toast("Exported. Keep this somewhere safe - it is your backup.");
}

function importState(file) {
  var fr = new FileReader();
  fr.onload = function () {
    try {
      var s = JSON.parse(fr.result);
      if (!s || typeof s !== "object" || !s.done) throw new Error("shape");
      state.done = s.done || state.done;
      state.notes = s.notes || {};
      state.jobs = Array.isArray(s.jobs) ? s.jobs : state.jobs;
      state.currentDay = Math.min(60, Math.max(1, s.currentDay || 1));
      save(); renderAll();
      toast("Imported " + Object.keys(state.done).length + " completed items.");
    } catch (e) { toast("That file is not a Career Hub export."); }
  };
  fr.readAsText(file);
}

var toastTimer;
function toast(msg) {
  var t = $("#toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.hidden = true; }, 3200);
}

/* ------------------------------------------------- derived totals */
function totals() {
  var genDone = 0, genAll = 0;
  D.days.days.forEach(function (d) {
    ["am", "pm"].forEach(function (h) {
      if (!d[h]) return;
      d[h].items.forEach(function (it) { genAll++; if (isDone(it.id)) genDone++; });
    });
  });

  var awsDone = 0, awsReq = 0;
  D.modules.modules.forEach(function (m) {
    awsReq += m.requiredItems;
    // only required items count toward the AWS bar
    m.items.forEach(function (it, i) {
      var required = m.requirement === "all" ||
                     (m.requirement === "one" && i === 0);
      if (required && isDone(it.id)) awsDone++;
    });
  });

  var mils = [], mDone = 0;
  D.projects.projects.forEach(function (p) {
    p.milestones.forEach(function (m) {
      mils.push(m);
      if (isDone(m.id)) mDone++;
    });
  });

  var posts = [], pDone = 0;
  D.linkedin.weeks.forEach(function (w) {
    w.posts.forEach(function (p) {
      posts.push(p);
      if (isDone(p.id)) pDone++;
    });
  });

  return {
    gen: { d: genDone, a: genAll, p: pct(genDone, genAll) },
    aws: { d: awsDone, a: awsReq, p: pct(awsDone, awsReq) },
    pro: { d: mDone, a: mils.length, p: pct(mDone, mils.length) },
    li:  { d: pDone, a: posts.length }
  };
}

/* -------------------------------------------------- item factory */
function itemNode(id, title, meta, kind) {
  var row = el("label", "item" + (kind === "ritual" ? " ritual" : "") + (isDone(id) ? " done" : ""));
  var box = el("input");
  box.type = "checkbox";
  box.checked = isDone(id);
  box.addEventListener("change", function () {
    setDone(id, box.checked);
    // re-render in place so derived numbers stay honest
    row.classList.toggle("done", box.checked);
    if (kind === "ritual") row.classList.toggle("ritual", true);
    renderStats();
    if (state.view !== "today") renderCurrent();
  });
  row.appendChild(box);

  var body = el("span", "item-body");
  body.appendChild(el("span", "item-title", title));
  if (meta) body.appendChild(el("span", "item-meta", meta));
  row.appendChild(body);
  return row;
}

/* ========================================================= TODAY */
function renderToday() {
  var d = D.days.days[state.currentDay - 1];
  $("#dayNum").textContent = state.currentDay;
  $("#dayMeta").textContent = d ? (d.week + " / 12") : "";
  $("#todayWeek").textContent = "week " + (d ? d.week : "-");

  /* AWS target for today */
  var awsBox = $("#todayAws");
  awsBox.textContent = "";
  var any = false;

  (d.awsPrimary || []).forEach(function (slug) {
    var m = modBySlug(slug);
    if (!m) return;
    any = true;
    var head = el("div", "day-block");
    var h = el("h3", null, m.name + "  (" + plural(m.itemCount, "item") +
      (m.isGap ? " - not in the 60-day plan" : "") + ")");
    head.appendChild(h);
    if (m.isGap) head.appendChild(el("span", "pill gap", "gap module"));
    m.items.forEach(function (it) {
      head.appendChild(itemNode(it.id, it.title, null, "work"));
    });
    awsBox.appendChild(head);
  });

  (d.awsGap || []).forEach(function (slug) {
    var m = modBySlug(slug);
    if (!m) return;
    any = true;
    var head = el("div", "day-block");
    head.appendChild(el("h3", null, m.name + "  (" + plural(m.itemCount, "item") + " - gap block)"));
    head.appendChild(el("span", "pill gap", "gap module"));
    m.items.forEach(function (it) { head.appendChild(itemNode(it.id, it.title, null, "work")); });
    awsBox.appendChild(head);
  });

  if (!any) awsBox.appendChild(el("div", "empty", "No AWS target mapped for this day."));

  /* Generation halves */
  renderHalf("#todayAm", d.am, "am");
  renderHalf("#todayPm", d.pm, "pm");

  /* Project milestone due this week */
  var pw = d.week;
  var box = $("#todayProject");
  box.textContent = "";
  $("#todayProjWeek").textContent = "week " + pw;
  var found = false;
  D.projects.projects.forEach(function (p) {
    p.milestones.forEach(function (m) {
      if (m.week !== pw) return;
      found = true;
      box.appendChild(itemNode(m.id, m.title, p.name + " - " + m.detail, "work"));
    });
  });
  if (!found) box.appendChild(el("div", "empty", "No project milestone scheduled this week."));

  renderStats();
}

function renderHalf(sel, half, key) {
  var box = $(sel);
  box.textContent = "";
  var cnt = $(key === "am" ? "#amCount" : "#pmCount");
  if (!half) { cnt.textContent = ""; box.appendChild(el("div", "empty", "No session.")); return; }
  var done = half.items.filter(function (i) { return isDone(i.id); }).length;
  cnt.textContent = done + " / " + half.items.length;
  half.items.forEach(function (it) {
    box.appendChild(itemNode(it.id, it.title, null, it.kind === "work" ? "work" : "ritual"));
  });
}

function modBySlug(slug) {
  var found = null;
  D.modules.modules.forEach(function (m) { if (m.slug === slug) found = m; });
  return found;
}

/* ======================================================= STATS */
function renderStats() {
  var t = totals();
  $("#statGen").textContent = t.gen.p + "%";
  $("#barGen").style.width = t.gen.p + "%";
  $("#statAws").textContent = t.aws.p + "%";
  $("#barAws").style.width = t.aws.p + "%";
  $("#statPro").textContent = t.pro.p + "%";
  $("#barPro").style.width = t.pro.p + "%";
  $("#statLi").textContent = t.li.d + "/" + t.li.a;
  $("#barLi").style.width = pct(t.li.d, t.li.a) + "%";

  // labels are derived so they can never drift from the data
  $("#labGen").textContent = "Generation \u00b7 " + t.gen.d + "/" + t.gen.a + " items \u00b7 60 days";
  $("#labAws").textContent = "AWS re/Start \u00b7 " + t.aws.d + "/" + t.aws.a + " required items";
  $("#labPro").textContent = "Projects \u00b7 " + t.pro.d + "/" + t.pro.a + " milestones";
  $("#labLi").textContent  = "LinkedIn \u00b7 " + t.li.d + "/" + t.li.a + " posts";
}

/* ===================================================== COURSES */
function renderCourses() {
  var body = $("#courseBody");
  body.textContent = "";
  var q = filters.course.toLowerCase();

  if (state.course === "aws") renderAwsModules(body, q);
  else renderGenDays(body, q);

  $$(".segbtn").forEach(function (b) {
    b.classList.toggle("active", b.dataset.course === state.course);
  });
}

function matches(txt, q) { return !q || txt.toLowerCase().indexOf(q) !== -1; }

function renderAwsModules(body, q) {
  var t = totals();
  D.modules.modules.forEach(function (m) {
    var hits = m.items.filter(function (i) { return matches(i.title, q); });
    if (q && !matches(m.name, q) && !hits.length) return;

    var d = 0;
    m.items.forEach(function (it, i) {
      var req = m.requirement === "all" || (m.requirement === "one" && i === 0);
      if (req && isDone(it.id)) d++;
    });
    var req = m.requiredItems;
    if (req && d === req && filters.hideDone) return;

    var wrap = el("div", "mod" + (openMods[m.slug] ? " open" : ""));
    var head = el("div", "mod-head");

    var name = el("div", "mod-name");
    name.appendChild(document.createTextNode(m.name));
    var sub = "week " + m.weekTarget;
    if (m.requirement === "one") sub += " - complete one item";
    else if (m.requirement === "none") sub += " - no requirement";
    else sub += " - " + d + "/" + req + " required";
    if (m.isGap) sub += " - gap module";
    name.appendChild(el("span", "nm-sub", "  " + sub));
    head.appendChild(name);

    if (m.isGap) head.appendChild(el("span", "pill gap", "gap"));
    head.appendChild(el("span", "mod-stat", req ? d + "/" + req : plural(m.itemCount, "item")));
    head.appendChild(el("span", "mod-arrow", "&#9654;"));
    head.addEventListener("click", function () {
      openMods[m.slug] = !openMods[m.slug];
      wrap.classList.toggle("open");
    });
    wrap.appendChild(head);

    var pbar = el("div", "mod-progress");
    var fill = el("i");
    fill.style.width = pct(d, req) + "%";
    pbar.appendChild(fill);
    wrap.appendChild(pbar);

    var bodyBox = el("div", "mod-body");
    hits.forEach(function (it) {
      var i = m.items.indexOf(it);
      var req = m.requirement === "all" || (m.requirement === "one" && i === 0);
      bodyBox.appendChild(itemNode(it.id, it.title, req ? null : "optional", req ? "work" : "ritual"));
    });
    wrap.appendChild(bodyBox);
    body.appendChild(wrap);
  });
  if (!body.childNodes.length) body.appendChild(el("div", "empty", "No match."));
}

function renderGenDays(body, q) {
  D.days.days.forEach(function (d) {
    var all = [];
    ["am", "pm"].forEach(function (h) {
      if (d[h]) all = all.concat(d[h].items);
    });
    var hits = all.filter(function (i) { return matches(i.title, q); });
    var dayLabel = "Day " + d.day + " - " + (d.week) + " / 12";
    if (q && !matches(dayLabel, q) && !hits.length) return;

    var done = all.filter(function (i) { return isDone(i.id); }).length;
    if (filters.hideDone && done === all.length) return;

    var key = "d" + d.day;
    var wrap = el("div", "mod" + (openMods[key] ? " open" : ""));
    var head = el("div", "mod-head");
    var name = el("div", "mod-name");
    name.appendChild(document.createTextNode("Day " + d.day));
    name.appendChild(el("span", "nm-sub", "  week " + d.week + "  " + done + "/" + all.length +
      (d.awsPrimary.length ? "  -  AWS: " + d.awsPrimary.map(function (s) { return modBySlug(s).name; }).join(", ") : "")));
    head.appendChild(name);
    head.appendChild(el("span", "mod-arrow", "&#9654;"));
    head.addEventListener("click", function () {
      openMods[key] = !openMods[key];
      wrap.classList.toggle("open");
    });
    wrap.appendChild(head);

    var bodyBox = el("div", "mod-body");
    ["am", "pm"].forEach(function (h) {
      if (!d[h]) return;
      var b = el("div", "day-block");
      b.appendChild(el("h3", null, h === "am" ? "Morning" : "Afternoon"));
      d[h].items.forEach(function (it) {
        if (q && !matches(it.title, q) && !matches(dayLabel, q)) return;
        b.appendChild(itemNode(it.id, it.title, null, it.kind === "work" ? "work" : "ritual"));
      });
      bodyBox.appendChild(b);
    });
    wrap.appendChild(bodyBox);
    body.appendChild(wrap);
  });
  if (!body.childNodes.length) body.appendChild(el("div", "empty", "No match."));
}

/* ===================================================== PROJECTS */
function renderProjects() {
  var body = $("#projBody");
  body.textContent = "";
  var q = filters.proj.toLowerCase();
  var any = false;

  D.projects.projects.forEach(function (p) {
    var ms = p.milestones.filter(function (m) {
      if (filters.hideDoneProj && isDone(m.id)) return false;
      return !q || matches(m.title + " " + p.name + " " + m.detail, q);
    });
    if (!ms.length) return;
    any = true;

    var card = el("div", "card proj" + (p.status && p.status.indexOf("BLOCKED") === 0 ? " blocked" : ""));
    var head = el("div", "proj-head");
    var t = el("div", "proj-title");
    t.appendChild(el("h2", null, p.name));
    head.appendChild(t);
    var done = p.milestones.filter(function (m) { return isDone(m.id); }).length;
    head.appendChild(el("span", "tag", done + " / " + p.milestones.length));
    card.appendChild(head);

    card.appendChild(el("div", "proj-why", p.tagline + " - " + p.whyItStandsOut));
    if (p.status) card.appendChild(el("div", "proj-why", p.status));
    if (p.existingAssets) card.appendChild(el("div", "proj-why", p.existingAssets));

    var st = el("div", "stack");
    p.stack.forEach(function (s) { st.appendChild(el("span", null, s)); });
    card.appendChild(st);

    ms.forEach(function (m) {
      var meta = p.name + "  -  week " + m.week + "  -  " + m.detail;
      if (m.post) meta += "  -  LinkedIn: " + m.post;
      card.appendChild(itemNode(m.id, m.title, meta, "work"));
    });

    var iv = el("div", "interview");
    iv.appendChild(el("h3", null, "Interview angles this project answers"));
    var ul = el("ul");
    p.interviewAngles.forEach(function (a) { ul.appendChild(el("li", null, a)); });
    iv.appendChild(ul);
    card.appendChild(iv);

    body.appendChild(card);
  });

  if (!any) body.appendChild(el("div", "empty", "No match."));
}

/* ===================================================== LINKEDIN */
function renderLinkedin() {
  var rules = $("#liRules");
  if (!rules.childNodes.length) {
    D.linkedin.rules.forEach(function (r) { rules.appendChild(el("li", null, r)); });
  }
  var body = $("#liBody");
  body.textContent = "";
  var q = filters.li.toLowerCase();
  var shown = 0, total = 0;

  D.linkedin.weeks.forEach(function (w) {
    var posts = w.posts.filter(function (p) {
      total++;
      return !q || matches(p.hook + " " + p.evidence, q);
    });
    if (!posts.length) return;
    shown += posts.length;

    var wrap = el("div", "week");
    var h = el("div", "week-head");
    h.appendChild(el("h2", null, "Week " + w.week));
    h.appendChild(el("div", "week-line"));
    h.appendChild(el("span", "count", posts.filter(function (p) { return isDone(p.id); }).length +
      "/" + posts.length + " posted"));
    wrap.appendChild(h);

    posts.forEach(function (p) {
      var done = isDone(p.id);
      var row = el("div", "post " + (done ? "done published" : "idea"));
      var box = el("input");
      box.type = "checkbox"; box.checked = done;
      box.addEventListener("change", function () {
        setDone(p.id, box.checked);
        row.classList.toggle("done", box.checked);
        row.classList.toggle("published", box.checked);
        row.classList.toggle("idea", !box.checked);
        renderStats();
        h.lastChild.textContent = w.posts.filter(function (x) { return isDone(x.id); }).length +
          "/" + w.posts.length + " posted";
      });
      row.appendChild(box);

      var b = el("div", "post-body");
      b.appendChild(el("div", "post-hook", p.hook));
      var meta = el("div", "post-meta");
      meta.appendChild(el("span", null, p.evidence));
      if (p.type === "project") meta.appendChild(el("span", "pill project", "artifact-backed"));
      else meta.appendChild(el("span", "pill", "course learning"));
      b.appendChild(meta);
      row.appendChild(b);
      wrap.appendChild(row);
    });

    body.appendChild(wrap);
  });

  $("#liCount").textContent = q ? shown + " of " + total + " posts" : total + " posts total";
  if (!shown) body.appendChild(el("div", "empty", "No match."));
}

/* ========================================================= JOBS */
function renderJobs() {
  var tg = $("#jobTarget");
  if (!tg.childNodes.length) {
    var T = D.jobs.target;
    function cell(lab, val) {
      var c = el("div");
      c.appendChild(el("div", "tg-lab", lab));
      var v = el("div", "tg-val");
      if (Array.isArray(val)) {
        var ul = el("ul");
        val.forEach(function (x) { ul.appendChild(el("li", null, x)); });
        v.appendChild(ul);
      } else v.textContent = val;
      c.appendChild(v);
      tg.appendChild(c);
    }
    cell("Target roles", T.titles);
    cell("Do not apply", T.avoid);
    cell("Locations", T.regions);
    cell("Compensation", T.salaryINR.floor / 100000 + "L floor, " +
      T.salaryINR.target / 100000 + "L target - " + T.salaryINR.note);
  }

  var pb = $("#jobPlay");
  pb.textContent = "";
  D.jobs.playbook.forEach(function (s) {
    pb.appendChild(itemNode(s.id, s.title, s.phase + " - " + s.detail, "work"));
  });

  var qb = $("#jobQuestions");
  if (!qb.childNodes.length) {
    D.jobs.questionBank.forEach(function (q) { qb.appendChild(el("li", null, q)); });
  }

  var rows = $("#jobRows");
  rows.textContent = "";
  state.jobs.forEach(function (job, idx) {
    var tr = el("tr");
    [["company", "Company"], ["role", "Role"], ["applied", "Applied"]].forEach(function (f) {
      var td = el("td"), i = el("input");
      i.type = f[0] === "applied" ? "date" : "text";
      i.placeholder = f[1];
      i.value = job[f[0]] || "";
      i.addEventListener("input", function () { job[f[0]] = i.value; save(); });
      td.appendChild(i); tr.appendChild(td);
    });

    var tdS = el("td"), sel = el("select");
    ["applied", "screen", "interview", "offer", "rejected", "ghosted"].forEach(function (s) {
      var o = el("option", null, s);
      o.value = s;
      if (job.stage === s) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener("change", function () { job.stage = sel.value; save(); });
    tdS.appendChild(sel); tr.appendChild(tdS);

    var tdF = el("td"), fi = el("input");
    fi.type = "date"; fi.value = job.followUp || "";
    fi.addEventListener("input", function () { job.followUp = fi.value; save(); });
    tdF.appendChild(fi); tr.appendChild(tdF);

    var tdD = el("td"), del = el("button", "delrow", "&#10005;");
    del.title = "Remove row";
    del.addEventListener("click", function () { state.jobs.splice(idx, 1); save(); renderJobs(); });
    tdD.appendChild(del); tr.appendChild(tdD);

    rows.appendChild(tr);
  });
  if (!state.jobs.length) {
    var tr2 = el("tr"), td = el("td");
    td.colSpan = 6;
    td.appendChild(el("div", "empty", "No applications yet. Add the first one."));
    tr2.appendChild(td); rows.appendChild(tr2);
  }
}

/* ----------------------------------------------------- view switch */
function renderCurrent() {
  if (state.view === "today") renderToday();
  else if (state.view === "courses") renderCourses();
  else if (state.view === "projects") renderProjects();
  else if (state.view === "linkedin") renderLinkedin();
  else if (state.view === "jobs") renderJobs();
}

function renderAll() {
  renderStats();
  // the day header must reflect a newly imported currentDay even if the user
  // is not sitting on the Today tab
  if (state.view !== "today") renderToday();
  renderCurrent();
}

function setView(v) {
  state.view = v;
  $$(".view").forEach(function (s) { s.hidden = s.dataset.view !== v; });
  $$(".tab").forEach(function (t) { t.classList.toggle("active", t.dataset.view === v); });
  moveInk();
  save();
  window.scrollTo(0, 0);
  renderCurrent();
}

function moveInk() {
  var active = $(".tab.active");
  var ink = $("#tabInk");
  if (!active) return;
  ink.style.width = active.offsetWidth + "px";
  ink.style.transform = "translateX(" + active.offsetLeft + "px)";
}

/* ---------------------------------------------------------- theme */
function setTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
  $("#btnTheme").innerHTML = t === "dark" ? "&#9788;" : "&#9789;";
}

/* ------------------------------------------------------------ init */
function init() {
  load();
  try {
    setTheme(localStorage.getItem(THEME_KEY) || "dark");
  } catch (e) { setTheme("dark"); }

  /* tabs */
  $("#tabs").addEventListener("click", function (e) {
    var t = e.target.closest(".tab");
    if (t) setView(t.dataset.view);
  });
  window.addEventListener("resize", moveInk);

  /* day nav */
  $("#prevDay").addEventListener("click", function () {
    if (state.currentDay > 1) { state.currentDay--; save(); renderToday(); }
  });
  $("#nextDay").addEventListener("click", function () {
    if (state.currentDay < 60) { state.currentDay++; save(); renderToday(); }
  });

  /* theme / data */
  $("#btnTheme").addEventListener("click", function () {
    setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
  });
  $("#btnExport").addEventListener("click", exportState);
  $("#btnImport").addEventListener("click", function () { $("#fileImport").click(); });
  $("#fileImport").addEventListener("change", function () {
    if (this.files && this.files[0]) importState(this.files[0]);
    this.value = "";
  });

  /* course view controls */
  $("#courseSeg").addEventListener("click", function (e) {
    var b = e.target.closest(".segbtn");
    if (!b) return;
    state.course = b.dataset.course; save(); renderCourses();
  });
  $("#courseSearch").addEventListener("input", function () {
    filters.course = this.value; renderCourses();
  });
  $("#hideDone").addEventListener("change", function () {
    filters.hideDone = this.checked; renderCourses();
  });

  /* project view controls */
  $("#projSearch").addEventListener("input", function () {
    filters.proj = this.value; renderProjects();
  });
  $("#hideDoneProj").addEventListener("change", function () {
    filters.hideDoneProj = this.checked; renderProjects();
  });

  /* linkedin controls */
  $("#liSearch").addEventListener("input", function () {
    filters.li = this.value; renderLinkedin();
  });

  /* jobs */
  $("#addJob").addEventListener("click", function () {
    state.jobs.push({ company: "", role: "", applied: new Date().toISOString().slice(0, 10),
                      stage: "applied", followUp: "" });
    save(); renderJobs();
  });

  /* keyboard: arrow keys move days */
  document.addEventListener("keydown", function (e) {
    if (e.target.matches("input, select, textarea")) return;
    if (e.key === "ArrowLeft" && state.view === "today") $("#prevDay").click();
    if (e.key === "ArrowRight" && state.view === "today") $("#nextDay").click();
  });

  setView(state.view);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
})();
