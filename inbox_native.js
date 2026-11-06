/* Scandal Without Sanction - native inbox builder (external, loaded via jsDelivr).
   Exposes window.SWS_INBOX.build(qThis). Condition passed via window.SWS_SAL / SWS_EXPO.
   Lifecycle (addOnPageSubmit/addOnUnload) is registered by the in-editor loader, not here. */
window.SWS_INBOX = { build: function (qThis) {

  /* =====================================================================
     Inbox process-tracing task (Scandal Without Sanction, Option 1)

     Draws a simulated email inbox inside this question and records, in
     embedded data, which messages were triaged, opened, in what order, and
     for how long. v1.1.0: Flag and Forward removed (ib_ctrl_flag / ib_ctrl_fwd
     stay in the data, always empty); shorter emails; first names in E2.
     v1.2.0: emails cut further (briefing = story only; thread forwards headline only).

     Condition comes from embedded data set in the Survey Flow randomizer:
       Salience = Low  -> the controversy appears only as line 4 of the ESG
                          digest (E4), as a routine rating-feed signal.
       Salience = High -> the same digest line, PLUS media amplification: the
                          top story of the news briefing (E1) and a colleague
                          thread about the trending story (E2).
       Exposure = Named / NotNamed -> whether the report names Orvane.
     E1 and E2 sit in the same inbox positions in both conditions and carry
     routine content when Salience = Low.

     Data are written with setEmbeddedData (Flat / Modern / Classic layouts,
     fields ib_*) and setJSEmbeddedData (Simple layout, fields __js_ib_*).
     ===================================================================== */
  var MEETING_SECONDS = 300;   // visible countdown to the 10:00 meeting (soft: nothing is forced at 0). 0 = no clock.
  var REQUIRE_TRIAGE = true;   // Next stays disabled until every message has been triaged.

  var SE = Qualtrics.SurveyEngine;
  var Q = qThis;
  var root = (Q && Q.getQuestionContainer) ? Q.getQuestionContainer() : document.body;

  /* ---------- 1. Read the condition ---------- */
  function clean(v) {
    v = (v === null || v === undefined) ? "" : String(v).replace(/^\s+|\s+$/g, "");
    return (v.indexOf("${") > -1 || v.indexOf("e://") > -1) ? "" : v;
  }
  var sal = clean(window.SWS_SAL);
  var expo = clean(window.SWS_EXPO);

  // Fallback 1: marker text "IBCOND:<Salience>|<Exposure>" piped into the question text.
  var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
  var node;
  while ((node = walker.nextNode())) {
    var i = node.nodeValue.indexOf("IBCOND:");
    if (i > -1) {
      var parts = node.nodeValue.substring(i + 7).split("|");
      if (!sal) sal = clean(parts[0]);
      if (!expo) expo = clean(parts[1]);
      var holder = node.parentNode;
      node.nodeValue = "";
      if (holder && holder !== root && holder.childNodes.length === 1) holder.style.display = "none";
      break;
    }
  }
  // Fallback 2: read embedded data directly.
  try { if (!sal) sal = clean(SE.getEmbeddedData("Salience")); } catch (e) {}
  try { if (!expo) expo = clean(SE.getEmbeddedData("Exposure")); } catch (e) {}

  var condError = !((sal === "High" || sal === "Low") && (expo === "Named" || expo === "NotNamed"));
  if (sal !== "High") sal = "Low";
  if (expo !== "Named") expo = "NotNamed";
  var HIGH = (sal === "High");
  var CTRL = HIGH ? ["E1", "E2", "E4"] : ["E4"];   // messages that carry the controversy

  /* ---------- 2. Stimulus text (edit wording here) ---------- */
  // The misconduct facts, source, and Kaldera's response are identical wherever they appear.
  var FACTS = "Migrant workers at Kaldera Precision's plant in Penang, Malaysia, often worked more than 70 hours a week and paid months of wages in fees to get hired, a report by the non-profit Labor Rights Monitor says.";
  var EXPO = (expo === "Named")
    ? "The report lists Orvane among the appliance brands whose motors are made at the plant."
    : "The report does not identify the plant's customers.";
  var RESP = "Kaldera said in a statement that it is reviewing the findings.";
  var HEADLINE = "Workers at Malaysian motor maker Kaldera say they worked 70-hour weeks and paid months of wages to get hired";
  var AMPLIFY = "It is the most-read business story in the country today.";

  var ME = "Me (Category Manager, Motors &amp; Drives)";

  function article(kicker, headline, byline, paras) {
    return "<div class='ibx-article'><div class='ibx-kicker'>" + kicker + "</div>" +
      "<div class='ibx-headline'>" + headline + "</div><div class='ibx-byline'>" + byline + "</div>" +
      "<p>" + paras.join("</p><p>") + "</p></div>";
  }
  function threadMsg(name, role, time, html) {
    return "<div class='ibx-msg'><div class='ibx-msghdr'><b>" + name + "</b> &middot; " + role + " &middot; " + time + "</div>" + html + "</div>";
  }

  var kalderaArticleTop = article("TOP STORY &middot; <span class='ibx-trend'>TRENDING #1</span>", HEADLINE,
    "Updated 7:05 a.m. &middot; Most read today", [FACTS, EXPO, RESP, AMPLIFY]);
  var fedArticleTop = article("TOP STORY", "Fed officials signal interest rates will hold through year end",
    "Updated 7:05 a.m.", ["Several Federal Reserve officials said over the weekend that they expect to keep interest rates unchanged for the rest of the year, citing steady inflation and a resilient job market.",
                          "Markets had priced in one more cut before December. Analysts said borrowing costs for businesses are likely to stay near current levels into next year."]);

  var E1body = "<p class='ibx-muted'>THE NATIONAL COURIER &middot; MORNING BRIEFING &middot; Monday</p>" +
    (HIGH ? kalderaArticleTop : fedArticleTop) +
    "";

  var fwdHdr = function (subj) {
    return "<div class='ibx-fwdhdr'>---------- Forwarded message ----------<br>From: The National Courier &lt;news@nationalcourier.example&gt;<br>Subject: " + subj + "</div>";
  };
  var E2body = HIGH
    ? threadMsg("Jen", "Buyer, Electronics", "8:31 AM", "<p>It's on every channel this morning.</p>") +
      threadMsg("Marcus", "Packaging", "8:19 AM", "<p>Saw it on TV too. It's everywhere.</p>") +
      threadMsg("Dana", "Buyer, Motors &amp; Drives", "7:52 AM", "<p>Have you seen this? It's trending everywhere.</p>" + fwdHdr(HEADLINE))
    : threadMsg("Jen", "Buyer, Electronics", "8:31 AM", "<p>Good news for once.</p>") +
      threadMsg("Marcus", "Packaging", "8:19 AM", "<p>Worth raising with our forwarders.</p>") +
      threadMsg("Dana", "Buyer, Motors &amp; Drives", "7:52 AM", "<p>FYI, might help the savings plan.</p>" + fwdHdr("Ocean freight rates from Asia expected to ease") +
        article("THE NATIONAL COURIER &middot; BUSINESS", "Ocean freight rates from Asia expected to ease", "Updated 6:40 a.m.",
                ["Container rates from Southeast Asia to U.S. ports are expected to fall later this year as new ships enter service, analysts said."]));

  var EMAILS = [
    { id: "E1", from: "The National Courier", addr: "briefing@nationalcourier.example", time: "8:43 AM",
      subject: HIGH ? "Morning Briefing: Kaldera workers say they worked 70-hour weeks and paid months of wages to get hired"
                    : "Morning Briefing: Fed officials signal interest rates will hold through year end",
      preview: HIGH ? "TOP STORY \u00b7 TRENDING #1: Workers at Malaysian motor maker Kaldera Precision say\u2026"
                    : "TOP STORY: Several Federal Reserve officials said over the weekend\u2026",
      body: E1body },
    { id: "E2", from: "Jen, Marcus, Dana", count: 3, time: "8:31 AM",
      subject: HIGH ? "RE: FW: Kaldera labor story is trending" : "RE: FW: Freight rates expected to ease",
      preview: HIGH ? "Jen: It's on every channel this morning\u2026"
                    : "Jen: Good news for once\u2026",
      body: E2body },
    { id: "E3", from: "Priya Nair", addr: "p.nair@orvane-appliances.example", time: "8:12 AM",
      subject: "Delayed shipment: OK to pay for air freight?",
      preview: "Our blender parts from Tenzo Plastics are stuck at port\u2026",
      body: "<p>Hi,</p><p>Our blender parts from Tenzo Plastics are stuck at port and will be 5 days late. Air freight would cost <b>$8,400</b>. OK to book it? I need to know by noon.</p><p>Thanks,<br>Priya</p>" },
    { id: "E4", from: "SupplierWatch ESG Monitoring", addr: "digest@supplierwatch.example", time: "7:30 AM",
      subject: "Weekly Supplier ESG Digest (5 updates)",
      preview: "1. Tenzo Plastics: climate score lowered slightly. 2. Brightwell Wire & Cable\u2026",
      body: "<p class='ibx-muted'>SupplierWatch ESG Monitoring &middot; Weekly digest for <b>Orvane Appliances</b></p>" +
            "<table><tr><th>#</th><th>Supplier</th><th>Topic</th><th>Update</th></tr>" +
            "<tr><td>1</td><td>Tenzo Plastics (Malaysia)</td><td>Environment</td><td>Climate score lowered slightly.</td></tr>" +
            "<tr><td>2</td><td>Brightwell Wire &amp; Cable (Mexico)</td><td>Environment</td><td>New environmental certification for its Monterrey site.</td></tr>" +
            "<tr><td>3</td><td>Redmont Castings (USA)</td><td>Environment</td><td>Wastewater permit renewal pending; no violations.</td></tr>" +
            "<tr><td>4</td><td>Kaldera Precision (Malaysia)</td><td>Labor rights</td><td>" + FACTS + " " + EXPO + " " + RESP + "</td></tr>" +
            "<tr><td>5</td><td>Sunfield Packaging (USA)</td><td>Governance</td><td>Conflict-minerals report submitted.</td></tr></table>" },
    { id: "E5", from: "Key Account Manager (Kaldera Precision)", addr: "account.manager@kalderaprecision.example", time: "7:14 AM",
      subject: "Contract renewal: proposed terms",
      preview: "Our KD-700 agreement ends December 31\u2026",
      body: "<p>Dear Category Manager,</p><p>Our KD-700 agreement ends December 31. We propose a two-year renewal with the price held flat at <b>$38.40</b> per unit. We value our eight-year partnership.</p>" +
            "<p>Best regards,<br>Kaldera Precision</p>" }
  ];
  var FORWARD_TO = ["My manager (Ellen Park)", "Sustainability team", "Legal & Compliance", "Supplier Quality (Sofia Martins)", "Inbound Logistics (Priya Nair)"];
  var TRIAGE = ["", "Act today", "This week", "No action"];   // codes 1, 2, 3

  /* ---------- 3. Styles ---------- */
  var css =
    ".ibx{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.5;color:#1b1f24;border:1px solid #dfe3e8;border-radius:8px;overflow:hidden;background:#fff;margin:16px 0 4px;text-align:left;box-shadow:0 1px 3px rgba(27,31,36,.06)}" +
    ".ibx *{box-sizing:border-box}" +
    ".ibx button{font-family:inherit}" +
    ".ibx .ibx-top{background:#2c3a4f;color:#eef1f5;padding:9px 14px;display:flex;flex-wrap:wrap;gap:4px 14px;justify-content:space-between;align-items:center;font-size:11.5px;letter-spacing:.02em}" +
    ".ibx .ibx-top b{font-weight:600;color:#fff}" +
    ".ibx .ibx-clock{font-variant-numeric:tabular-nums;font-weight:600;color:#fff}" +
    ".ibx .ibx-clock.late{color:#ffb4ab}" +
    ".ibx .ibx-main{display:flex;min-height:470px}" +
    ".ibx .ibx-list{width:42%;min-width:262px;border-right:1px solid #e6e9ec;background:#fbfcfd;max-height:660px;overflow-y:auto}" +
    ".ibx .ibx-item{position:relative;border-bottom:1px solid #edf0f2;transition:background .12s}" +
    ".ibx .ibx-item:last-child{border-bottom:0}" +
    ".ibx .ibx-item:hover{background:#f3f6fa}" +
    ".ibx .ibx-item.sel{background:#eef3fb;box-shadow:inset 3px 0 0 #2b5fa8}" +
    ".ibx .ibx-item.unread:before{content:'';position:absolute;left:9px;top:15px;width:6px;height:6px;border-radius:50%;background:#2b5fa8}" +
    ".ibx .ibx-item.unread .ibx-from,.ibx .ibx-item.unread .ibx-subj{font-weight:650}" +
    ".ibx .ibx-row{display:block;width:100%;text-align:left;background:transparent;border:0;border-radius:0;padding:10px 12px 2px 22px;margin:0;cursor:pointer;font:inherit;color:inherit;box-shadow:none}" +
    ".ibx .ibx-l1{display:flex;justify-content:space-between;align-items:baseline;gap:8px}" +
    ".ibx .ibx-from,.ibx .ibx-subj,.ibx .ibx-prev{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
    ".ibx .ibx-from{font-size:12px;color:#1b1f24}" +
    ".ibx .ibx-cnt{color:#8b949e;font-weight:400}" +
    ".ibx .ibx-time{font-size:10.5px;color:#8b949e;white-space:nowrap;flex:none}" +
    ".ibx .ibx-subj{font-size:12.5px;margin-top:1px;color:#1b1f24}" +
    ".ibx .ibx-prev{font-size:11.5px;color:#8b949e;margin-top:1px}" +
    ".ibx .ibx-tools{display:flex;flex-wrap:wrap;gap:4px;align-items:center;padding:6px 12px 9px 22px}" +
    ".ibx .ibx-open{font-size:10.5px;line-height:1.4;padding:2px 9px;margin:0;border:1px solid #bacbe4;border-radius:10px;background:#eef3fb;color:#1f4e8c;font-weight:600;cursor:pointer;box-shadow:none}" +
    ".ibx .ibx-open:hover{background:#e0eaf7;border-color:#8fb0da}" +
    ".ibx .ibx-div{width:1px;height:13px;background:#e0e4e8;margin:0 3px;display:inline-block}" +
    ".ibx .ibx-chip{font-size:10.5px;line-height:1.4;padding:2px 8px;margin:0;border:1px solid #dde1e6;border-radius:10px;background:#fff;color:#6b737c;cursor:pointer;box-shadow:none}" +
    ".ibx .ibx-chip:hover{border-color:#a8b0b9;color:#3c434a}" +
    ".ibx .ibx-chip.on.t1{background:#fdeceb;border-color:#d99b93;color:#9b2c20;font-weight:600}" +
    ".ibx .ibx-chip.on.t2{background:#fff6e2;border-color:#ddc079;color:#7a5c10;font-weight:600}" +
    ".ibx .ibx-chip.on.t3{background:#eef0f2;border-color:#c2c8ce;color:#4a5259;font-weight:600}" +
    ".ibx .ibx-pane{flex:1;min-width:0;padding:16px 20px 20px;overflow-y:auto;max-height:660px}" +
    ".ibx .ibx-h{font-size:15px;font-weight:600;margin:0;letter-spacing:-.01em;line-height:1.35}" +
    ".ibx .ibx-meta{font-size:11.5px;color:#767e87;margin-top:5px;line-height:1.5}" +
    ".ibx .ibx-meta b{color:#3c434a;font-weight:600}" +
    ".ibx .ibx-actions{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:12px 0 14px;padding-bottom:12px;border-bottom:1px solid #edf0f2}" +
    ".ibx .ibx-actions .ibx-trilbl{font-size:10.5px;color:#8b949e;margin-left:auto}" +
    ".ibx .ibx-btn{font-size:11.5px;line-height:1.4;padding:4px 10px;border:1px solid #dde1e6;background:#fff;border-radius:5px;cursor:pointer;color:#3c434a;margin:0;box-shadow:none}" +
    ".ibx .ibx-btn:hover{background:#f3f6fa;border-color:#b9c0c8}" +
    ".ibx .ibx-btn.on{background:#fff6e2;border-color:#ddc079;color:#7a5c10;font-weight:600}" +
    ".ibx .ibx-menu{display:none;width:100%;gap:5px;flex-wrap:wrap;align-items:center;font-size:11px;color:#767e87;margin-top:2px}" +
    ".ibx .ibx-menu.open{display:flex}" +
    ".ibx .ibx-note{font-size:11.5px;color:#1a7f37}" +
    ".ibx .ibx-body{font-size:12.8px;line-height:1.62;color:#24292f;max-width:640px}" +
    ".ibx .ibx-body p{margin:0 0 9px}" +
    ".ibx .ibx-body ul{margin:0 0 9px 18px;padding:0}" +
    ".ibx .ibx-body li{margin-bottom:3px}" +
    ".ibx .ibx-body table{border-collapse:collapse;width:100%;font-size:11.8px;margin:8px 0 12px}" +
    ".ibx .ibx-body th,.ibx .ibx-body td{border:1px solid #e6e9ec;padding:5px 8px;text-align:left;vertical-align:top;line-height:1.5}" +
    ".ibx .ibx-body th{background:#f6f8fa;font-weight:600;color:#3c434a}" +
    ".ibx .ibx-muted{color:#8b949e;font-size:11.5px}" +
    ".ibx .ibx-msg{border-bottom:1px solid #edf0f2;padding:0 0 10px;margin:0 0 12px}" +
    ".ibx .ibx-msg:last-child{border-bottom:0;padding-bottom:0}" +
    ".ibx .ibx-msghdr{font-size:11.5px;color:#767e87;margin-bottom:5px}" +
    ".ibx .ibx-msghdr b{color:#3c434a}" +
    ".ibx .ibx-fwdhdr{font-size:11.5px;color:#8b949e;margin:6px 0 10px;line-height:1.5}" +
    ".ibx .ibx-article{border:1px solid #e6e9ec;border-radius:6px;padding:13px 15px;background:#fcfcfd}" +
    ".ibx .ibx-kicker{font-size:10px;letter-spacing:.07em;color:#8b949e;margin-bottom:5px;text-transform:uppercase}" +
    ".ibx .ibx-trend{color:#c0392b;font-weight:700}" +
    ".ibx .ibx-headline{font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.3;font-weight:700;margin-bottom:5px;color:#1b1f24}" +
    ".ibx .ibx-byline{font-size:11px;color:#8b949e;margin-bottom:11px}" +
    ".ibx .ibx-hello{max-width:330px;margin:44px auto 0;border:1px dashed #e0e4e8;border-radius:7px;padding:14px 16px;background:#fbfcfd;color:#767e87;font-size:11.8px;line-height:1.6}" +
    ".ibx .ibx-hello-h{font-size:12.5px;font-weight:600;color:#3c434a;margin-bottom:5px}" +
    ".ibx .ibx-hello ul{margin:8px 0 0 16px;padding:0}" +
    ".ibx .ibx-hello li{margin-bottom:4px}" +
    ".ibx .ibx-status{padding:8px 14px;border-top:1px solid #e6e9ec;background:#fbfcfd;font-size:11.5px;color:#767e87;line-height:1.5}" +
    ".ibx .ibx-status.ok{color:#1a7f37}" +
    "@media (max-width:640px){.ibx .ibx-main{display:block}.ibx .ibx-list{width:100%;min-width:0;max-height:none;border-right:0;border-bottom:1px solid #e6e9ec}.ibx .ibx-pane{max-height:none}.ibx .ibx-hello{margin:16px 0}.ibx .ibx-actions .ibx-trilbl{margin-left:0}}";
  var styleEl = document.createElement("style");
  styleEl.appendChild(document.createTextNode(css));
  document.head.appendChild(styleEl);

  /* ---------- 4. Build the inbox ---------- */
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function chips(id) {
    var h = "";
    for (var c = 1; c <= 3; c++) {
      h += "<button type='button' class='ibx-chip t" + c + "' data-tri='" + c + "' data-tid='" + id + "'>" + TRIAGE[c] + "</button>";
    }
    return h;
  }

  var HELLO =
    "<div class='ibx-hello'><div class='ibx-hello-h'>Reading pane</div>" +
    "<p style='margin:0'>Click a message on the left, or its <b>Open</b> button, to read it here.</p>" +
    "<ul><li>Open the messages that you think deserve your attention.</li>" +
    "<li>Triage every message with the buttons under it in the list.</li></ul></div>";

  var app = document.createElement("div");
  app.className = "ibx";
  var rows = "";
  for (var k = 0; k < EMAILS.length; k++) {
    var m = EMAILS[k];
    rows += "<div class='ibx-item unread' data-item='" + m.id + "'>" +
      "<button type='button' class='ibx-row' data-id='" + m.id + "'>" +
      "<span class='ibx-l1'><span class='ibx-from'>" + esc(m.from) + (m.count ? " <span class='ibx-cnt'>(" + m.count + ")</span>" : "") + "</span>" +
      "<span class='ibx-time'>" + m.time + "</span></span>" +
      "<span class='ibx-subj'>" + esc(m.subject) + "</span>" +
      "<span class='ibx-prev'>" + esc(m.preview) + "</span></button>" +
      "<div class='ibx-tools'><button type='button' class='ibx-open' data-id='" + m.id + "'>Open &rsaquo;</button>" +
      "<span class='ibx-div'></span>" + chips(m.id) + "</div></div>";
  }
  app.innerHTML =
    "<div class='ibx-top'><span><b>Orvane Appliances</b> &middot; Mail &middot; Inbox (" + EMAILS.length + ")</span>" +
    "<span><span class='ibx-count'></span>" + (MEETING_SECONDS > 0 ? " &middot; <span class='ibx-clock'></span>" : "") + "</span></div>" +
    "<div class='ibx-main'><div class='ibx-list' role='list'>" + rows + "</div>" +
    "<div class='ibx-pane' aria-live='polite'>" + HELLO + "</div></div>" +
    "<div class='ibx-status'></div>";

  var mountAt = root.querySelector(".QuestionText") || root;
  mountAt.appendChild(app);
  var pane = app.querySelector(".ibx-pane");

  /* ---------- 5. Logging ---------- */
  var T0 = Date.now();
  function now() { return Date.now() - T0; }
  var S = { cur: null, segStart: null, nextRank: 1, seq: [], segs: [], acts: [],
            dwell: {}, opens: {}, rank: {}, tri: {}, flag: {}, fwd: {}, hiddenMs: 0, hiddenAt: null,
            done: false, snapped: false };
  for (k = 0; k < EMAILS.length; k++) {
    var id0 = EMAILS[k].id;
    S.dwell[id0] = 0; S.opens[id0] = 0; S.rank[id0] = ""; S.tri[id0] = ""; S.flag[id0] = 0; S.fwd[id0] = [];
  }

  function put(key, val) {
    val = String(val);
    try { SE.setEmbeddedData(key, val); } catch (e) {}
    try { if (typeof SE.setJSEmbeddedData === "function") SE.setJSEmbeddedData(key, val); } catch (e) {}
  }
  function closeSeg() {
    if (S.cur && S.segStart !== null) {
      var t = now();
      S.dwell[S.cur] += t - S.segStart;
      if (S.segs.length < 300) S.segs.push(S.cur + ":" + S.segStart + "-" + t);
      S.segStart = null;
    }
  }
  function dwellNow(id) {
    return S.dwell[id] + ((S.cur === id && S.segStart !== null) ? now() - S.segStart : 0);
  }
  function nTriaged() {
    var n = 0;
    for (var j = 0; j < EMAILS.length; j++) if (S.tri[EMAILS[j].id]) n++;
    return n;
  }
  // Summary across every message that carries the controversy
  // (E4, plus E1 and E2 when Salience = High).
  function ctrlAgg() {
    var a = { open: 0, dwell: 0, rank: "", tri: "", flag: 0, fwd: [] }, id;
    for (var j = 0; j < CTRL.length; j++) {
      id = CTRL[j];
      if (S.opens[id] > 0) a.open++;
      a.dwell += dwellNow(id);
      if (S.rank[id] && (a.rank === "" || S.rank[id] < a.rank)) a.rank = S.rank[id];
      if (S.tri[id] && (a.tri === "" || S.tri[id] < a.tri)) a.tri = S.tri[id];
      if (S.flag[id]) a.flag = 1;
      for (var w = 0; w < S.fwd[id].length; w++) a.fwd.push(id + ">" + S.fwd[id][w]);
    }
    return a;
  }
  function nOpenedNow() {
    var n = 0;
    for (var j = 0; j < EMAILS.length; j++) if (S.opens[EMAILS[j].id] > 0) n++;
    return n;
  }

  /* The manipulation-check questions sit on this same page, and participants may look back at
     the inbox to answer them. The moment they first touch one of those questions we freeze a
     copy of the attention measures (ib_pre_*), which are the uncontaminated ones for analysis;
     the ib_* fields keep running and include any re-reading. */
  function snapshot() {
    if (S.snapped) return;
    S.snapped = true;
    var a = ctrlAgg();
    put("ib_q_start_ms", now());
    put("ib_pre_ctrl_open", a.open > 0 ? 1 : 0);
    put("ib_pre_ctrl_n_open", a.open);
    put("ib_pre_ctrl_dwell_ms", a.dwell);
    put("ib_pre_ctrl_rank", a.rank);
    put("ib_pre_ctrl_triage", a.tri);
    put("ib_pre_n_opened", nOpenedNow());
    put("ib_pre_n_triaged", nTriaged());
    put("ib_pre_total_ms", now());
  }

  function save() {
    var j, id;
    for (j = 0; j < EMAILS.length; j++) {
      id = EMAILS[j].id;
      put("ib_" + id + "_dwell", dwellNow(id));
      put("ib_" + id + "_rank", S.rank[id]);
      put("ib_" + id + "_triage", S.tri[id]);
    }
    var a = ctrlAgg();
    put("ib_cond_seen", sal + "|" + expo + (condError ? "|ERROR" : ""));
    put("ib_ctrl_ids", CTRL.join(","));
    put("ib_ctrl_open", a.open > 0 ? 1 : 0);
    put("ib_ctrl_n_open", a.open);
    put("ib_ctrl_dwell_ms", a.dwell);
    put("ib_ctrl_rank", a.rank);
    put("ib_ctrl_triage", a.tri);
    put("ib_ctrl_flag", a.flag);
    put("ib_ctrl_fwd", a.fwd.join(";"));
    put("ib_n_opened", nOpenedNow());
    put("ib_n_triaged", nTriaged());
    put("ib_total_ms", now());
    put("ib_hidden_ms", S.hiddenMs + (S.hiddenAt !== null ? now() - S.hiddenAt : 0));
    put("ib_overtime_ms", MEETING_SECONDS > 0 ? Math.max(0, now() - MEETING_SECONDS * 1000) : "");
    put("ib_seq", S.seq.join(","));
    put("ib_log", S.segs.join(";"));
    put("ib_actions", S.acts.join(";"));
  }

  /* ---------- 6. Next button, triage counter, meeting clock ---------- */
  function setNext(enabled) {
    if (!REQUIRE_TRIAGE) return;
    try { if (enabled) { Q.enableNextButton(); } else { Q.disableNextButton(); } return; } catch (e) {}
    var nb = document.getElementById("NextButton") || document.getElementById("next-button");
    if (nb) nb.disabled = !enabled;
  }
  function updateStatus() {
    var n = nTriaged(), all = (n === EMAILS.length);
    app.querySelector(".ibx-count").innerHTML = "Triaged " + n + " of " + EMAILS.length;
    var st = app.querySelector(".ibx-status");
    st.className = "ibx-status" + (all ? " ok" : "");
    st.innerHTML = all
      ? "&#10003; All messages triaged. Open anything else you want to read, then click the Next arrow."
      : "Click <b>Open</b> to read a message. Triage every message as <b>Act today</b>, <b>This week</b>, or <b>No action</b>. You can do that from the list without opening it. " +
        (REQUIRE_TRIAGE ? "The Next button unlocks once all " + EMAILS.length + " are triaged." : "");
    setNext(all);
  }
  function updateClock() {
    if (MEETING_SECONDS <= 0) return;
    var left = MEETING_SECONDS - Math.floor(now() / 1000);
    var el = app.querySelector(".ibx-clock");
    if (left > 0) {
      var mm = Math.floor(left / 60), ss = left % 60;
      el.innerHTML = "Meeting starts in " + mm + ":" + (ss < 10 ? "0" : "") + ss;
    } else {
      el.innerHTML = "Your meeting is starting";
      el.className = "ibx-clock late";
    }
  }

  /* ---------- 7. Interaction ---------- */
  function byId(id) { for (var j = 0; j < EMAILS.length; j++) if (EMAILS[j].id === id) return EMAILS[j]; return null; }

  function paintItems() {
    var items = app.querySelectorAll(".ibx-item");
    for (var j = 0; j < items.length; j++) {
      var id = items[j].getAttribute("data-item");
      items[j].className = "ibx-item" + (id === S.cur ? " sel" : "") + (S.opens[id] ? "" : " unread");
    }
    var cs = app.querySelectorAll(".ibx-chip");
    for (j = 0; j < cs.length; j++) {
      var on = String(S.tri[cs[j].getAttribute("data-tid")]) === cs[j].getAttribute("data-tri");
      cs[j].className = "ibx-chip t" + cs[j].getAttribute("data-tri") + (on ? " on" : "");
    }
  }

  function renderPane(m) {
    pane.innerHTML =
      "<div class='ibx-h'>" + esc(m.subject) + "</div>" +
      "<div class='ibx-meta'><b>" + esc(m.from) + "</b>" + (m.addr ? " &lt;" + m.addr + "&gt;" : "") +
      (m.count ? " &middot; " + m.count + " messages" : "") + "<br>To: " + ME + " &middot; " + m.time + "</div>" +
      "<div class='ibx-actions'>" +
        "<span class='ibx-trilbl'>Triage:</span>" + chips(m.id) +
      "</div>" +
      "<div class='ibx-body'>" + m.body + "</div>";
    pane.scrollTop = 0;
  }

  function openMsg(id) {
    if (S.done || (S.cur === id && S.segStart !== null)) return;
    closeSeg();
    S.cur = id;
    S.segStart = document.hidden ? null : now();
    S.opens[id]++;
    if (!S.rank[id]) S.rank[id] = S.nextRank++;
    S.seq.push(id);
    renderPane(byId(id));
    paintItems();
    // If the reading pane is off-screen (narrow window, stacked layout), bring it into view.
    if (pane.scrollIntoView && pane.getBoundingClientRect().top > window.innerHeight - 140) {
      pane.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    save();
  }

  app.addEventListener("click", function (ev) {
    var t = ev.target;
    while (t && t !== app && !(t.getAttribute && (t.getAttribute("data-id") || t.getAttribute("data-act") ||
           t.getAttribute("data-fwd") || t.getAttribute("data-tri")))) t = t.parentNode;
    if (!t || t === app) return;
    ev.preventDefault();
    if (S.done) return;
    if (t.getAttribute("data-tri")) {
      var tid = t.getAttribute("data-tid"), code = +t.getAttribute("data-tri");
      S.tri[tid] = code;
      S.acts.push(tid + ":triage=" + code + "@" + now());
      paintItems();
      updateStatus();
      save();
      return;
    }
    if (t.getAttribute("data-id")) { openMsg(t.getAttribute("data-id")); return; }
    var cur = S.cur;
    if (!cur) return;
    var act = t.getAttribute("data-act");
    if (act === "flag") {
      S.flag[cur] = S.flag[cur] ? 0 : 1;
      S.acts.push(cur + ":" + (S.flag[cur] ? "flag" : "unflag") + "@" + now());
      t.className = "ibx-btn" + (S.flag[cur] ? " on" : "");
      t.innerHTML = "&#9873; " + (S.flag[cur] ? "Flagged" : "Flag for follow-up");
      save();
    } else if (act === "fwd") {
      var menuEl = pane.querySelector(".ibx-menu");
      menuEl.className = (menuEl.className.indexOf("open") > -1) ? "ibx-menu" : "ibx-menu open";
    } else if (t.getAttribute("data-fwd") !== null) {
      var who = FORWARD_TO[+t.getAttribute("data-fwd")];
      if (S.fwd[cur].indexOf(who) === -1) S.fwd[cur].push(who);
      S.acts.push(cur + ":fwd=" + who + "@" + now());
      pane.querySelector(".ibx-note").innerHTML = "&#10003; Forwarded to " + esc(S.fwd[cur].join(", "));
      pane.querySelector(".ibx-menu").className = "ibx-menu";
      save();
    }
  });

  // Pause dwell time while the browser tab is hidden.
  function onVisibility() {
    if (document.hidden) {
      closeSeg();
      if (S.hiddenAt === null) S.hiddenAt = now();
    } else {
      if (S.hiddenAt !== null) { S.hiddenMs += now() - S.hiddenAt; S.hiddenAt = null; }
      if (S.cur && S.segStart === null && !S.done) S.segStart = now();
    }
    save();
  }
  document.addEventListener("visibilitychange", onVisibility);

  // First interaction with any answer control outside the inbox freezes the ib_pre_* measures.
  function isAnswerControl(t) {
    while (t && t !== document.body) {
      if (t === app) return false;
      var tag = (t.tagName || "").toLowerCase();
      if (tag === "input" || tag === "label" || tag === "select" || tag === "textarea") return true;
      t = t.parentNode;
    }
    return false;
  }
  function onOutside(ev) { if (isAnswerControl(ev.target)) snapshot(); }
  document.addEventListener("click", onOutside, true);
  document.addEventListener("change", onOutside, true);

  var ticks = 0;
  var timer = setInterval(function () {
    updateClock();
    if (++ticks % 3 === 0) save();
  }, 1000);
  function finish() {
    if (S.done) return;
    closeSeg();
    snapshot();                       // in case they answered without clicking (e.g. keyboard only)
    save();
    S.done = true;
    clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisibility);
    document.removeEventListener("click", onOutside, true);
    document.removeEventListener("change", onOutside, true);
  }
  updateClock();
  updateStatus();
  save();
  return { finish: finish, save: save };
} };
