(() => {
  "use strict";
  const KEY = "agenda-servicos-data-v1",
    $ = (s) => document.querySelector(s),
    $$ = (s) => [...document.querySelectorAll(s)];
  const today = (() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  })();
  const uid = () =>
    Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  const seed = () => ({
    clients: [
      {
        id: "c1",
        name: "Mariana Costa",
        phone: "(62) 99912-3456",
        email: "mariana@email.com",
        notes: "",
      },
      {
        id: "c2",
        name: "Rafael Mendes",
        phone: "(62) 99876-5432",
        email: "rafael@email.com",
        notes: "",
      },
    ],
    services: [
      {
        id: "s1",
        name: "Consultoria inicial",
        duration: 60,
        price: 120,
        description: "Primeira conversa e levantamento de necessidades.",
      },
      {
        id: "s2",
        name: "Atendimento padrão",
        duration: 45,
        price: 80,
        description: "Atendimento de rotina.",
      },
    ],
    appointments: [
      {
        id: "a1",
        clientId: "c1",
        serviceId: "s2",
        date: today,
        time: "09:00",
        status: "Agendado",
        notes: "",
      },
      {
        id: "a2",
        clientId: "c2",
        serviceId: "s1",
        date: today,
        time: "11:00",
        status: "Agendado",
        notes: "Levar documentos.",
      },
    ],
  });
  function load() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY));
      if (
        v &&
        Array.isArray(v.clients) &&
        Array.isArray(v.services) &&
        Array.isArray(v.appointments)
      )
        return v;
    } catch (e) {
      console.warn(e);
    }
    const v = seed();
    localStorage.setItem(KEY, JSON.stringify(v));
    return v;
  }
  let db = load(),
    type = null,
    editId = null,
    timer = null,
    installPrompt = null;
  function save(v = db) {
    try {
      localStorage.setItem(KEY, JSON.stringify(v));
      db = v;
      return true;
    } catch (e) {
      toast("Não foi possível salvar os dados neste navegador.");
      return false;
    }
  }
  function esc(v = "") {
    return String(v).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  }
  function money(v) {
    return Number(v || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }
  function date(v) {
    if (!v) return "—";
    let [y, m, d] = v.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("pt-BR");
  }
  function client(id) {
    return db.clients.find((x) => x.id === id);
  }
  function service(id) {
    return db.services.find((x) => x.id === id);
  }
  function who(a) {
    return client(a.clientId)?.name || "Cliente removido";
  }
  function what(a) {
    return service(a.serviceId)?.name || "Serviço removido";
  }
  function sorted(a) {
    return [...a].sort((x, y) =>
      (x.date + "T" + x.time).localeCompare(y.date + "T" + y.time),
    );
  }
  function toast(msg) {
    let el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(timer);
    timer = setTimeout(() => el.classList.remove("show"), 2600);
  }
  async function notifyAppointment(message) {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch (e) {
        return;
      }
    }
    if (Notification.permission === "granted") {
      try {
        new Notification("Agenda de Serviços", {
          body: message,
          icon: "./icons/icon-192.png",
        });
      } catch (e) {
        console.warn("Notificação indisponível:", e);
      }
    }
  }
  function empty(title, msg) {
    return `<div class="empty"><b>${esc(title)}</b>${esc(msg)}</div>`;
  }
  function badge(s) {
    return `<span class="status status-${esc(s)}">${esc(s)}</span>`;
  }
  function buttons(t, id) {
    return `<div class="actions"><button class="mini" data-edit="${t}" data-id="${esc(id)}">Editar</button>${t === "appointment" ? `<button class="mini" data-done="${esc(id)}">Concluir</button>` : ""}<button class="mini danger" data-delete="${t}" data-id="${esc(id)}">Excluir</button></div>`;
  }
  function appointmentTable(list, compact = false) {
    if (!list.length)
      return empty(
        "Nenhum agendamento por aqui",
        "Crie um agendamento para começar a organizar sua agenda.",
      );
    return `<table class="table"><thead><tr><th>Cliente / serviço</th><th>Data e hora</th><th>Status</th>${compact ? "" : "<th>Ações</th>"}</tr></thead><tbody>${list.map((a) => `<tr><td>${esc(who(a))}<span class="sub">${esc(what(a))}</span></td><td>${date(a.date)}<span class="sub">${esc(a.time)}</span></td><td>${badge(a.status)}</td>${compact ? "" : `<td>${buttons("appointment", a.id)}</td>`}</tr>`).join("")}</tbody></table>`;
  }
  function render() {
    const ap = db.appointments.filter(
      (a) => a.date === today && a.status !== "Cancelado",
    );
    $("#statToday").textContent = ap.length;
    $("#statOpen").textContent = db.appointments.filter(
      (a) => a.status === "Agendado",
    ).length;
    $("#statClients").textContent = db.clients.length;
    $("#statServices").textContent = db.services.length;
    $("#navCount").textContent = db.appointments.filter(
      (a) => a.status === "Agendado",
    ).length;
    $("#dashboardTable").innerHTML = appointmentTable(
      sorted(
        db.appointments.filter(
          (a) =>
            a.status !== "Cancelado" &&
            a.date + "T" + a.time >= today + "T00:00",
        ),
      ).slice(0, 5),
      true,
    );
    const q = ($("#searchAppointments")?.value || "").toLowerCase().trim(),
      st = $("#filterStatus")?.value || "all",
      dt = $("#filterDate")?.value || "";
    $("#appointmentsTable").innerHTML = appointmentTable(
      sorted(
        db.appointments.filter(
          (a) =>
            (who(a) + " " + what(a)).toLowerCase().includes(q) &&
            (st === "all" || a.status === st) &&
            (!dt || a.date === dt),
        ),
      ),
    );
    const cq = ($("#searchClients")?.value || "").toLowerCase().trim(),
      cs = db.clients.filter((c) =>
        (c.name + " " + c.email + " " + c.phone).toLowerCase().includes(cq),
      );
    $("#clientCount").textContent = `${cs.length} cliente(s)`;
    $("#clientsTable").innerHTML = cs.length
      ? `<table class="table"><thead><tr><th>Nome</th><th>Telefone</th><th>E-mail</th><th>Ações</th></tr></thead><tbody>${cs.map((c) => `<tr><td>${esc(c.name)}<span class="sub">${esc(c.notes || "Sem observações")}</span></td><td>${esc(c.phone || "—")}</td><td>${esc(c.email || "—")}</td><td>${buttons("client", c.id)}</td></tr>`).join("")}</tbody></table>`
      : empty(
          "Nenhum cliente encontrado",
          "Cadastre um cliente ou tente outra busca.",
        );
    const sq = ($("#searchServices")?.value || "").toLowerCase().trim(),
      ss = db.services.filter((s) =>
        (s.name + " " + s.description).toLowerCase().includes(sq),
      );
    $("#serviceCount").textContent = `${ss.length} serviço(s)`;
    $("#servicesTable").innerHTML = ss.length
      ? `<table class="table"><thead><tr><th>Serviço</th><th>Duração</th><th>Preço</th><th>Ações</th></tr></thead><tbody>${ss.map((s) => `<tr><td>${esc(s.name)}<span class="sub">${esc(s.description || "Sem descrição")}</span></td><td>${s.duration} min</td><td>${money(s.price)}</td><td>${buttons("service", s.id)}</td></tr>`).join("")}</tbody></table>`
      : empty(
          "Nenhum serviço encontrado",
          "Cadastre um serviço para usar nos agendamentos.",
        );
  }
  function navigate(view) {
    const names = {
      dashboard: "Visão geral",
      appointments: "Agendamentos",
      clients: "Clientes",
      services: "Serviços",
    };
    if (!names[view]) return;
    $$(".view").forEach((v) =>
      v.classList.toggle("active", v.id === "view-" + view),
    );
    $$(".nav[data-view]").forEach((v) =>
      v.classList.toggle("active", v.dataset.view === view),
    );
    $("#crumb").textContent = names[view];
    $("#sidebar").classList.remove("open");
    render();
  }
  function field(name, label, kind = "text", value = "", opts = {}) {
    const id = "f-" + name,
      req = opts.required === false ? "" : "required",
      full = opts.full ? " full" : "";
    let input;
    if (kind === "select")
      input = `<select id="${id}" name="${name}" ${req}>${opts.placeholder ? `<option value="">${esc(opts.placeholder)}</option>` : ""}${(opts.choices || []).map((c) => `<option value="${esc(c.value)}" ${String(c.value) === String(value) ? "selected" : ""}>${esc(c.label)}</option>`).join("")}</select>`;
    else if (kind === "textarea")
      input = `<textarea id="${id}" name="${name}" ${req} placeholder="${esc(opts.placeholder || "")}">${esc(value)}</textarea>`;
    else
      input = `<input id="${id}" name="${name}" type="${kind}" value="${esc(value)}" ${req} ${opts.min !== undefined ? `min="${opts.min}"` : ""} ${opts.step ? `step="${opts.step}"` : ""} placeholder="${esc(opts.placeholder || "")}">`;
    return `<div class="field${full}"><label for="${id}">${label}${opts.required === false ? "" : " *"}</label>${input}</div>`;
  }
  function get(t, id) {
    return (
      (t === "appointment"
        ? db.appointments
        : t === "client"
          ? db.clients
          : db.services
      ).find((x) => x.id === id) || {}
    );
  }
  function open(t, id = null) {
    type = t;
    editId = id;
    const r = id ? get(t, id) : {},
      edit = !!id;
    $("#modalTitle").textContent = {
      appointment: edit ? "Editar agendamento" : "Novo agendamento",
      client: edit ? "Editar cliente" : "Novo cliente",
      service: edit ? "Editar serviço" : "Novo serviço",
    }[t];
    $("#modalEyebrow").textContent = edit
      ? "ATUALIZAR INFORMAÇÕES"
      : "NOVO REGISTRO";
    $("#saveBtn").textContent = edit ? "Salvar alterações" : "Salvar";
    $("#formError").textContent = "";
    let html = "";
    if (t === "client")
      html =
        field("name", "Nome completo", "text", r.name || "", {
          full: true,
          placeholder: "Ex.: Ana Souza",
        }) +
        field("phone", "Telefone", "tel", r.phone || "", {
          required: false,
          placeholder: "(00) 00000-0000",
        }) +
        field("email", "E-mail", "email", r.email || "", {
          required: false,
          placeholder: "cliente@email.com",
        }) +
        field("notes", "Observações", "textarea", r.notes || "", {
          full: true,
          required: false,
          placeholder: "Informações adicionais...",
        });
    else if (t === "service")
      html =
        field("name", "Nome do serviço", "text", r.name || "", {
          full: true,
          placeholder: "Ex.: Atendimento padrão",
        }) +
        field("duration", "Duração (minutos)", "number", r.duration ?? 30, {
          min: 5,
        }) +
        field("price", "Preço (R$)", "number", r.price ?? 0, {
          min: 0,
          step: "0.01",
        }) +
        field("description", "Descrição", "textarea", r.description || "", {
          full: true,
          required: false,
          placeholder: "Descreva o serviço",
        });
    else {
      html =
        field("clientId", "Cliente", "select", r.clientId || "", {
          full: true,
          placeholder: "Selecione um cliente",
          choices: db.clients.map((c) => ({ value: c.id, label: c.name })),
        }) +
        field("serviceId", "Serviço", "select", r.serviceId || "", {
          full: true,
          placeholder: "Selecione um serviço",
          choices: db.services.map((s) => ({
            value: s.id,
            label: `${s.name} · ${s.duration} min`,
          })),
        }) +
        field("date", "Data", "date", r.date || today, { min: today }) +
        field("time", "Horário", "time", r.time || "09:00") +
        field("status", "Status", "select", r.status || "Agendado", {
          full: true,
          choices: ["Agendado", "Concluído", "Cancelado"].map((x) => ({
            value: x,
            label: x,
          })),
        }) +
        field("notes", "Observações", "textarea", r.notes || "", {
          full: true,
          required: false,
          placeholder: "Detalhes adicionais...",
        });
      if (!db.clients.length || !db.services.length)
        $("#formError").textContent =
          !db.clients.length && !db.services.length
            ? "Cadastre pelo menos um cliente e um serviço antes de agendar."
            : !db.clients.length
              ? "Cadastre pelo menos um cliente antes de agendar."
              : "Cadastre pelo menos um serviço antes de agendar.";
    }
    $("#fields").innerHTML = html;
    $("#backdrop").hidden = false;
    $("#fields input,#fields select,#fields textarea")?.focus();
  }
  function conflict(date, time, serviceId, exclude) {
    const s = service(serviceId),
      start = mins(time),
      end = start + Number(s?.duration || 0);
    return db.appointments.some((a) => {
      if (a.id === exclude || a.date !== date || a.status === "Cancelado")
        return false;
      const st = mins(a.time),
        en = st + Number(service(a.serviceId)?.duration || 0);
      return start < en && st < end;
    });
  }
  function mins(t) {
    const [h, m] = (t || "0:0").split(":").map(Number);
    return h * 60 + m;
  }
  function close() {
    $("#backdrop").hidden = true;
    type = null;
    editId = null;
  }
  $("#form").addEventListener("submit", (e) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.currentTarget).entries()),
      editing = !!editId;
    let next = { ...db };
    if (type === "client") {
      if (!v.name.trim())
        return ($("#formError").textContent = "Informe o nome do cliente.");
      const item = {
        id: editId || uid(),
        name: v.name.trim(),
        phone: v.phone.trim(),
        email: v.email.trim(),
        notes: v.notes.trim(),
      };
      next.clients = editing
        ? db.clients.map((x) => (x.id === editId ? item : x))
        : [...db.clients, item];
    } else if (type === "service") {
      const duration = Number(v.duration),
        price = Number(v.price);
      if (
        !v.name.trim() ||
        duration < 5 ||
        !Number.isFinite(price) ||
        price < 0
      )
        return ($("#formError").textContent =
          "Confira o nome, a duração e o preço.");
      const item = {
        id: editId || uid(),
        name: v.name.trim(),
        duration,
        price,
        description: v.description.trim(),
      };
      next.services = editing
        ? db.services.map((x) => (x.id === editId ? item : x))
        : [...db.services, item];
    } else {
      if (!v.clientId || !v.serviceId || !v.date || !v.time)
        return ($("#formError").textContent =
          "Preencha cliente, serviço, data e horário.");
      if (v.date < today)
        return ($("#formError").textContent =
          "Escolha hoje ou uma data futura.");
      if (
        v.status !== "Cancelado" &&
        conflict(v.date, v.time, v.serviceId, editId)
      )
        return ($("#formError").textContent =
          "Este horário conflita com outro agendamento. Escolha outro horário.");
      const item = {
        id: editId || uid(),
        clientId: v.clientId,
        serviceId: v.serviceId,
        date: v.date,
        time: v.time,
        status: v.status,
        notes: v.notes.trim(),
      };
      next.appointments = editing
        ? db.appointments.map((x) => (x.id === editId ? item : x))
        : [...db.appointments, item];
    }
    if (save(next)) {
      const savedType = type;
      close();
      render();
      toast(
        editing ? "Registro atualizado." : "Registro cadastrado com sucesso.",
      );
      if (savedType === "appointment" && !editing)
        notifyAppointment("Novo agendamento registrado com sucesso.");
    }
  });
  function remove(t, id) {
    const label = {
      appointment: "este agendamento",
      client: "este cliente",
      service: "este serviço",
    }[t];
    if (!confirm(`Tem certeza de que deseja excluir ${label}?`)) return;
    if (t === "client" && db.appointments.some((a) => a.clientId === id))
      return toast("Este cliente tem agendamentos. Remova-os primeiro.");
    if (t === "service" && db.appointments.some((a) => a.serviceId === id))
      return toast(
        "Este serviço está vinculado a agendamentos. Remova-os primeiro.",
      );
    const key =
      t === "appointment"
        ? "appointments"
        : t === "client"
          ? "clients"
          : "services";
    if (save({ ...db, [key]: db[key].filter((x) => x.id !== id) })) {
      render();
      toast("Registro excluído.");
    }
  }
  document.addEventListener("click", (e) => {
    const v = e.target.closest("[data-view]");
    if (v) {
      e.preventDefault();
      navigate(v.dataset.view);
      return;
    }
    const a = e.target.closest("[data-action]");
    if (a) {
      open(a.dataset.action);
      return;
    }
    const ed = e.target.closest("[data-edit]");
    if (ed) {
      open(ed.dataset.edit, ed.dataset.id);
      return;
    }
    const del = e.target.closest("[data-delete]");
    if (del) {
      remove(del.dataset.delete, del.dataset.id);
      return;
    }
    const done = e.target.closest("[data-done]");
    if (done) {
      save({
        ...db,
        appointments: db.appointments.map((x) =>
          x.id === done.dataset.done ? { ...x, status: "Concluído" } : x,
        ),
      });
      render();
      toast("Agendamento concluído.");
    }
  });
  $("#closeModal").onclick = close;
  $("#cancelModal").onclick = close;
  $("#backdrop").addEventListener("click", (e) => {
    if (e.target === $("#backdrop")) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("#backdrop").hidden) close();
  });
  [
    "searchAppointments",
    "filterStatus",
    "filterDate",
    "searchClients",
    "searchServices",
  ].forEach((id) =>
    $("#" + id).addEventListener(
      id.startsWith("search") ? "input" : "change",
      render,
    ),
  );
  $("#menu").onclick = () => $("#sidebar").classList.toggle("open");
  $("#todayLabel").textContent = new Date().toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    installPrompt = e;
    $("#install").hidden = false;
  });
  $("#install").onclick = async () => {
    if (!installPrompt)
      return toast("Use o menu do navegador para instalar o aplicativo.");
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    $("#install").hidden = true;
  };
  const testNotificationButton = document.querySelector("#testNotification");

  if (testNotificationButton) {
    testNotificationButton.addEventListener("click", async () => {
      console.log("Botão de notificação clicado!");

      if (!("Notification" in window)) {
        alert("Este navegador não suporta notificações.");
        return;
      }

      if (!window.isSecureContext) {
        alert("As notificações precisam de HTTPS ou localhost.");
        return;
      }

      if (!("serviceWorker" in navigator)) {
        alert("Service Worker não suportado.");
        return;
      }

      try {
        let permission = Notification.permission;

        if (permission === "default") {
          permission = await Notification.requestPermission();
        }

        if (permission !== "granted") {
          alert("Permissão para notificações não concedida.");
          return;
        }

        const registration = await navigator.serviceWorker.ready;

        await registration.showNotification("Agenda de Serviços", {
          body: "Notificações funcionando corretamente!",
          icon: "./icons/icon-192.png",
          tag: "teste-agenda",
        });

        alert("Notificação enviada com sucesso!");
      } catch (error) {
        console.error("Erro ao enviar notificação:", error);
        alert("Erro ao enviar notificação. Verifique o console.");
      }
    });
  }
  if (
    "serviceWorker" in navigator &&
    ["https:", "http:"].includes(location.protocol)
  )
    addEventListener("load", () =>
      navigator.serviceWorker
        .register("./service-worker.js")
        .catch(console.error),
    );
  render();
  const params = new URLSearchParams(location.search);
  if (params.get("action") === "appointment")
    setTimeout(() => open("appointment"), 250);
  if (params.get("action") === "client") setTimeout(() => open("client"), 250);
})();