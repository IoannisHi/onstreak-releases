// OnStreak - connect Claude (the sign-in and consent page).
//
// A static page: Supabase shows a function's HTML as plain text on its own
// address, so this page draws what the connector function decides. It holds
// no key and no words of its own: every step is POST <connector>/authorize/step
// (JSON, answered to this page's origin only), and the words come from the
// connector (GET <connector>/authorize/words, and each answer's errorText).
// The sign-in request and its one-time secret arrive in the address's fragment
// (never sent to any server) and are taken out of the address bar at once.
(function () {
  "use strict";
  var CONNECTOR = "https://nnbuopzrisejvpctvyel.supabase.co/functions/v1/mcp";
  var card = document.getElementById("card");
  var words = { page: {}, error: {} };
  var request = null;
  var ticket = null;
  var head = { client: "Claude", returnsTo: null };

  function fill(text, vars) {
    return String(text || "").replace(/\{\{(\w+)\}\}/g, function (_, k) {
      return vars && k in vars ? String(vars[k]) : "";
    });
  }
  function w(key, vars) {
    return fill(words.page[key] || "", Object.assign({ client: head.client }, vars || {}));
  }
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") node.textContent = attrs[k];
      else if (k === "checked" || k === "disabled" || k === "required" || k === "selected") node[k] = Boolean(attrs[k]);
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) {
      if (c) node.appendChild(c);
    });
    return node;
  }
  function draw(view, nodes) {
    card.textContent = "";
    card.setAttribute("data-view", view);
    card.appendChild(el("div", { class: "mark", "aria-hidden": "true", text: "O" }));
    nodes.forEach(function (n) {
      if (n) card.appendChild(n);
    });
    var first = card.querySelector("input:not([type=hidden]), select, button.primary");
    if (first) first.focus();
  }
  function lines(answer) {
    var out = [];
    if (answer.errorText) out.push(el("p", { class: "error", role: "alert", "data-testid": "connect-error", text: answer.errorText }));
    if (answer.noteText) out.push(el("p", { class: "note", text: answer.noteText }));
    return out;
  }
  function returnsLine() {
    var r = head.returnsTo;
    if (!r) return null;
    return el("p", { class: "muted", text: r.local ? w("localhost", { host: r.host }) : w("returnsTo", { host: r.host }) });
  }

  function message(text) {
    draw("message", [el("h1", { text: words.page.errorHeading || "This link does not work" }), el("p", { "data-testid": "connect-message", text: text || "" })]);
  }

  function send(body) {
    return fetch(CONNECTOR + "/authorize/step", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.assign({ request: request, ticket: ticket }, body)),
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
    })
      .then(function (res) {
        return res.json().catch(function () {
          return { view: "message", errorText: words.error.server };
        });
      })
      .catch(function () {
        return { view: "message", errorText: words.error.server };
      })
      .then(show);
  }

  function busy(form, on) {
    Array.prototype.forEach.call(form.querySelectorAll("button, input, select"), function (n) {
      n.disabled = on;
    });
  }

  function show(answer) {
    if (answer.ticket) ticket = answer.ticket;
    if (answer.client) head.client = answer.client;
    if (answer.returnsTo !== undefined) head.returnsTo = answer.returnsTo;
    if (answer.view === "redirect") {
      draw("redirect", [el("h1", { text: answer.outcome === "allowed" ? w("doneHeading") : w("deniedHeading") }), el("p", { text: answer.outcome === "allowed" ? w("doneLead") : w("deniedLead") })]);
      window.location.assign(answer.to);
      return;
    }
    if (answer.view === "signin") return signIn(answer);
    if (answer.view === "code") return codeView(answer);
    if (answer.view === "consent") return consent(answer);
    return message(answer.errorText || words.error.server);
  }

  function cancelButton() {
    return el("button", { type: "button", "data-testid": "connect-cancel", text: w("cancel") });
  }

  function signIn(answer) {
    var email = el("input", { type: "email", name: "email", autocomplete: "email", required: true, "data-testid": "connect-email" });
    if (answer.email) email.value = answer.email;
    var password = el("input", { type: "password", name: "password", autocomplete: "current-password", required: true, "data-testid": "connect-password" });
    var cancel = cancelButton();
    var form = el("form", { "data-testid": "connect-signin", novalidate: "" }, [
      el("label", {}, [document.createTextNode(w("email")), email]),
      el("label", {}, [document.createTextNode(w("password")), password]),
    ].concat(lines(answer), [el("div", { class: "buttons" }, [el("button", { type: "submit", class: "primary", "data-testid": "connect-signin-submit", text: w("signIn") }), cancel])]));
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      busy(form, true);
      send({ step: "signin", email: email.value.trim(), password: password.value });
    });
    cancel.addEventListener("click", function () {
      send({ step: "deny" });
    });
    draw("signin", [el("h1", { text: w("signInHeading") }), el("p", { text: fill(words.page.lead, { client: head.client }) }), el("p", { class: "muted", text: w("signInLead") }), returnsLine(), form, el("p", { class: "muted", text: w("noAccount") }), el("p", { class: "muted", text: w("forgot") })]);
    if (answer.email) password.focus();
  }

  function codeView(answer) {
    var code = el("input", { type: "text", name: "code", inputmode: "numeric", autocomplete: "one-time-code", required: true, "data-testid": "connect-code" });
    var again = el("button", { type: "button", text: w("sendAgain") });
    var cancel = cancelButton();
    var form = el("form", { novalidate: "" }, [el("label", {}, [document.createTextNode(w("code")), code])].concat(lines(answer), [el("div", { class: "buttons" }, [el("button", { type: "submit", class: "primary", text: w("confirm") }), again, cancel])]));
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      busy(form, true);
      send({ step: "code", email: answer.email, code: code.value });
    });
    again.addEventListener("click", function () {
      send({ step: "resend", email: answer.email });
    });
    cancel.addEventListener("click", function () {
      send({ step: "deny" });
    });
    draw("code", [el("h1", { text: w("codeHeading") }), el("p", { text: w("codeLead", { email: answer.email }) }), form]);
  }

  function consent(answer) {
    var businesses = answer.businesses || [];
    var select = el(
      "select",
      { name: "office", "data-testid": "connect-business" },
      businesses.map(function (b) {
        return el("option", { value: b.id, text: b.name, selected: b.id === answer.chosen });
      }),
    );
    var boxes = (answer.areas || []).map(function (a) {
      var box = el("input", { type: "checkbox", name: "area", value: a.key, checked: a.shared, "data-testid": "connect-area", "data-key": a.key });
      return el("label", { class: "area" }, [box, el("span", {}, [document.createTextNode(a.label || a.key), a.hint ? el("small", { text: a.hint }) : null])]);
    });
    var name = el("input", { type: "text", name: "name", maxlength: "80", "data-testid": "connect-name" });
    name.value = answer.name || "";
    var allow = el("button", { type: "submit", class: "primary", "data-testid": "connect-allow", text: w("allow") });
    var deny = el("button", { type: "button", "data-testid": "connect-deny", text: w("deny") });
    var form = el("form", { "data-testid": "connect-consent", novalidate: "" }, [
      el("label", {}, [document.createTextNode(w("business")), select]),
      el("fieldset", {}, [el("legend", { text: w("areasLegend") })].concat(boxes)),
      el("label", {}, [document.createTextNode(w("nameLabel")), name, el("small", { class: "muted", text: w("nameHint") })]),
      el("p", { class: "muted", text: w("never") }),
    ].concat(lines(answer), [el("div", { class: "buttons" }, [allow, deny])]));
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var areas = boxes
        .map(function (l) {
          return l.querySelector("input");
        })
        .filter(function (b) {
          return b.checked;
        })
        .map(function (b) {
          return b.value;
        });
      busy(form, true);
      send({ step: "consent", office: select.value, areas: areas, name: name.value.trim() });
    });
    deny.addEventListener("click", function () {
      send({ step: "deny" });
    });
    draw("consent", [el("h1", { text: w("consentHeading") }), el("p", { class: "muted", text: w("consentLead", { email: answer.email }) }), returnsLine(), form]);
  }

  function start() {
    var f = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    // The request and its secret leave the address bar at once (a copied address finishes nothing).
    if (window.location.hash) history.replaceState(null, "", window.location.pathname);
    var error = f.get("error");
    if (error && /^connect\.error\.\w+$/.test(error)) return message(words.error[error.slice("connect.error.".length)] || words.error.badRequest);
    request = f.get("request");
    ticket = f.get("ticket");
    if (!request || !ticket || !/^[0-9a-f-]{36}$/.test(request)) return message(words.error.badRequest);
    send({ step: "open" });
  }

  fetch(CONNECTOR + "/authorize/words", { credentials: "omit", referrerPolicy: "no-referrer" })
    .then(function (res) {
      return res.json();
    })
    .then(function (got) {
      if (got && got.page && got.error) words = got;
    })
    .catch(function () {
      /* expected: no network - the fallbacks below still say what happened */
      words.error.server = words.error.server || "Something went wrong on our side. Try again in a moment.";
    })
    .then(function () {
      if (words.page.title) document.title = words.page.title;
      start();
    });
})();
