import { defineConfig } from "vite";

function createDemoState() {
  return {
    nextTaskId: 4,
    nextUserId: 4,
    tasks: [
      { id: 1, title: "Ship request core", priority: "high", done: true },
      { id: 2, title: "Finish form flows", priority: "high", done: false },
      { id: 3, title: "Polish examples", priority: "medium", done: false }
    ],
    team: [
      { id: 1, name: "Jane Doe", role: "Product engineer", email: "jane@example.com" },
      { id: 2, name: "Malik Chen", role: "Backend engineer", email: "malik@example.com" },
      { id: 3, name: "Iris Vega", role: "Designer", email: "iris@example.com" }
    ],
    catalog: [
      { id: 1, title: "Server actions", status: "ready" },
      { id: 2, title: "Table filters", status: "draft" },
      { id: 3, title: "Toast headers", status: "ready" },
      { id: 4, title: "Drawer patterns", status: "ready" }
    ],
    releases: [
      { id: 1, name: "Core refresh", stage: "ready", owner: "Jane", updatedAt: "2025-01-12" },
      { id: 2, name: "Modal polish", stage: "draft", owner: "Iris", updatedAt: "2025-01-10" },
      { id: 3, name: "Forms v2", stage: "ready", owner: "Malik", updatedAt: "2025-01-08" },
      { id: 4, name: "Docs launch", stage: "review", owner: "Jane", updatedAt: "2025-01-07" },
      { id: 5, name: "Table sorting", stage: "review", owner: "Malik", updatedAt: "2025-01-05" },
      { id: 6, name: "Toast themes", stage: "draft", owner: "Iris", updatedAt: "2025-01-03" }
    ]
  };
}

function json(res, status, payload, headers = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value);
  }
  res.end(JSON.stringify(payload));
}

function html(res, status, markup, headers = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value);
  }
  res.end(markup);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

function parsePayload(body) {
  if (!body) {
    return {};
  }

  try {
    return JSON.parse(body);
  } catch {
    return Object.fromEntries(new URLSearchParams(body).entries());
  }
}

function renderTask(task) {
  const priorityTone = task.priority === "high" ? "#d6336c" : task.priority === "medium" ? "#e67700" : "#2b8a3e";
  return `
    <article id="task-${task.id}" class="task-item ${task.done ? "done" : ""}">
      <div class="row" style="justify-content: space-between; align-items: flex-start;">
        <div class="stack" style="gap: 0.35rem;">
          <strong class="title">${escapeHtml(task.title)}</strong>
          <span class="pill" style="background: ${priorityTone}1A; color: ${priorityTone};">${escapeHtml(task.priority)}</span>
        </div>
        <div class="row">
          <button class="ghost" lt-patch="/api/demo/tasks/${task.id}/toggle" lt-target="#task-${task.id}" lt-swap="outerHTML">
            ${task.done ? "Reopen" : "Done"}
          </button>
          <button
            class="danger"
            lt-delete="/api/demo/tasks/${task.id}"
            lt-target="#task-${task.id}"
            lt-swap="remove"
            lt-confirm="Delete this task?"
            lt-confirm-title="Delete task"
            lt-confirm-confirm-text="Delete task"
            lt-confirm-tone="danger"
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderTaskStats(state) {
  const total = state.tasks.length;
  const done = state.tasks.filter((task) => task.done).length;
  const open = total - done;
  return `
    <div class="stat"><span class="muted">Total tasks</span><strong>${total}</strong></div>
    <div class="stat"><span class="muted">Open</span><strong>${open}</strong></div>
    <div class="stat"><span class="muted">Done</span><strong>${done}</strong></div>
  `;
}

function renderTeamCard(member) {
  return `
    <article class="team-card">
      <div class="row" style="justify-content: space-between; align-items: flex-start;">
        <div class="stack" style="gap: 0.3rem;">
          <strong>${escapeHtml(member.name)}</strong>
          <span class="muted">${escapeHtml(member.role)}</span>
          <span class="muted">${escapeHtml(member.email)}</span>
        </div>
        <button class="ghost" lt-drawer="/api/demo/users/${member.id}">View</button>
      </div>
    </article>
  `;
}

function renderSearchResults(state, searchParams) {
  const q = (searchParams.get("q") || "").toLowerCase();
  const status = searchParams.get("status") || "all";
  const items = state.catalog.filter((item) => {
    const matchesText = item.title.toLowerCase().includes(q);
    const matchesStatus = status === "all" || item.status === status;
    return matchesText && matchesStatus;
  });

  if (items.length === 0) {
    return `<p class="muted">No matches for this combination.</p>`;
  }

  return items.map((item) => `
    <article class="team-card">
      <strong>${escapeHtml(item.title)}</strong>
      <p class="muted">Status: ${escapeHtml(item.status)}</p>
    </article>
  `).join("");
}

function renderReleaseTable(state, searchParams) {
  const q = (searchParams.get("q") || "").toLowerCase();
  const stage = searchParams.get("stage") || "";
  const sort = searchParams.get("sort") || "updatedAt";
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";
  const page = Number(searchParams.get("page") || "1") || 1;
  const perPage = 3;

  const filtered = state.releases
    .filter((entry) => {
      const matchesText = !q || entry.name.toLowerCase().includes(q) || entry.owner.toLowerCase().includes(q);
      const matchesStage = !stage || entry.stage === stage;
      return matchesText && matchesStage;
    })
    .sort((left, right) => {
      const leftValue = String(left[sort] || "");
      const rightValue = String(right[sort] || "");
      return order === "asc"
        ? leftValue.localeCompare(rightValue)
        : rightValue.localeCompare(leftValue);
    });

  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, pageCount);
  const rows = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const body = rows.length > 0
    ? rows.map((entry) => `
        <tr>
          <td>${escapeHtml(entry.name)}</td>
          <td>${escapeHtml(entry.stage)}</td>
          <td>${escapeHtml(entry.owner)}</td>
          <td>${escapeHtml(entry.updatedAt)}</td>
        </tr>
      `).join("")
    : `<tr><td colspan="4" class="muted">No release matches these filters.</td></tr>`;

  return `
    <div class="stack">
      <div class="row" style="justify-content: space-between;">
        <span class="pill">${filtered.length} matching releases</span>
        <div class="row">
          <button class="ghost" lt-table-page="prev">Prev</button>
          <button class="ghost" lt-table-page="next">Next</button>
        </div>
      </div>
      <div style="overflow-x: auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th><button class="ghost table-sort" lt-table-sort="name">Release</button></th>
              <th><button class="ghost table-sort" lt-table-sort="stage">Stage</button></th>
              <th><button class="ghost table-sort" lt-table-sort="owner">Owner</button></th>
              <th><button class="ghost table-sort" lt-table-sort="updatedAt">Updated</button></th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      <p class="muted">Page ${currentPage} of ${pageCount}</p>
    </div>
  `;
}

function renderInviteForm() {
  return `
    <div class="stack">
      <h2>Invite teammate</h2>
      <p class="muted">This form is served remotely and closes the modal through response headers.</p>
      <form
        class="stack"
        lt-form
        lt-post="/api/demo/users"
        lt-target="#team-list"
        lt-swap="beforeend"
        lt-error-target="#invite-errors"
        lt-error-class="field-error"
        lt-close-on-success="modal"
        lt-reset-on-success
      >
        <div id="invite-errors" class="summary"></div>
        <label class="stack">
          <span>Name</span>
          <input name="name" required>
          <span data-latch-error-for="name" class="error-text"></span>
        </label>
        <label class="stack">
          <span>Email</span>
          <input name="email" type="email" required>
          <span data-latch-error-for="email" class="error-text"></span>
        </label>
        <label class="stack">
          <span>Role</span>
          <input name="role" value="Engineer" required>
          <span data-latch-error-for="role" class="error-text"></span>
        </label>
        <div class="row">
          <button type="submit">Send invite</button>
          <button type="button" class="ghost" lt-close="modal">Cancel</button>
        </div>
      </form>
    </div>
  `;
}

function renderDrawer(member) {
  return `
    <div class="stack">
      <span class="pill">Team drawer</span>
      <h2>${escapeHtml(member.name)}</h2>
      <p class="muted">${escapeHtml(member.role)}</p>
      <p>${escapeHtml(member.email)}</p>
      <p class="muted">This content comes from a local server route and is rescanned inside the drawer.</p>
      <button class="ghost" lt-close="drawer">Close drawer</button>
    </div>
  `;
}

export default defineConfig({
  cacheDir: ".vite-cache",
  server: {
    port: 5173
  },
  plugins: [
    {
      name: "latch-demo-api",
      configureServer(server) {
        const state = createDemoState();

        server.middlewares.use(async (req, res, next) => {
          if (!req.url || !req.url.startsWith("/api/demo/")) {
            next();
            return;
          }

          const url = new URL(req.url, "http://localhost:5173");
          const pathname = url.pathname;
          const method = req.method || "GET";

          if (method === "GET" && pathname === "/api/demo/stats") {
            html(res, 200, renderTaskStats(state));
            return;
          }

          if (method === "GET" && pathname === "/api/demo/tasks") {
            html(res, 200, state.tasks.map(renderTask).join(""));
            return;
          }

          if (method === "POST" && pathname === "/api/demo/tasks") {
            const payload = parsePayload(await readBody(req));
            const title = String(payload.title || "").trim();
            const priority = String(payload.priority || "medium").trim();

            if (!title) {
              json(res, 422, {
                errors: {
                  title: "Task title is required"
                }
              });
              return;
            }

            const task = {
              id: state.nextTaskId++,
              title,
              priority,
              done: false
            };
            state.tasks.push(task);
            html(res, 200, renderTask(task), {
              "X-Latch-Toast": "Task added",
              "X-Latch-Toast-Type": "success",
              "X-Latch-Refresh": "#stats-refresh"
            });
            return;
          }

          const toggleMatch = pathname.match(/^\/api\/demo\/tasks\/(\d+)\/toggle$/);
          if (method === "PATCH" && toggleMatch) {
            const task = state.tasks.find((entry) => entry.id === Number(toggleMatch[1]));
            if (!task) {
              html(res, 404, "<p>Task not found</p>");
              return;
            }
            task.done = !task.done;
            html(res, 200, renderTask(task), {
              "X-Latch-Toast": task.done ? "Task completed" : "Task reopened",
              "X-Latch-Toast-Type": "success",
              "X-Latch-Refresh": "#stats-refresh"
            });
            return;
          }

          const deleteMatch = pathname.match(/^\/api\/demo\/tasks\/(\d+)$/);
          if (method === "DELETE" && deleteMatch) {
            const index = state.tasks.findIndex((entry) => entry.id === Number(deleteMatch[1]));
            if (index === -1) {
              html(res, 404, "<p>Task not found</p>");
              return;
            }
            state.tasks.splice(index, 1);
            html(res, 200, "", {
              "X-Latch-Toast": "Task deleted",
              "X-Latch-Toast-Type": "success",
              "X-Latch-Refresh": "#stats-refresh"
            });
            return;
          }

          if (method === "GET" && pathname === "/api/demo/team") {
            html(res, 200, state.team.map(renderTeamCard).join(""));
            return;
          }

          if (method === "GET" && pathname === "/api/demo/users/new") {
            html(res, 200, renderInviteForm());
            return;
          }

          if (method === "POST" && pathname === "/api/demo/users") {
            const payload = parsePayload(await readBody(req));
            const name = String(payload.name || "").trim();
            const email = String(payload.email || "").trim();
            const role = String(payload.role || "").trim();
            const errors = {};

            if (!name) {
              errors.name = "Name is required";
            }
            if (!email.includes("@")) {
              errors.email = "Email is invalid";
            }
            if (!role) {
              errors.role = "Role is required";
            }

            if (Object.keys(errors).length > 0) {
              json(res, 422, { errors });
              return;
            }

            const member = {
              id: state.nextUserId++,
              name,
              email,
              role
            };
            state.team.push(member);
            html(res, 200, renderTeamCard(member), {
              "X-Latch-Toast": "Invite sent",
              "X-Latch-Toast-Type": "success",
              "X-Latch-Close": "modal"
            });
            return;
          }

          const userMatch = pathname.match(/^\/api\/demo\/users\/(\d+)$/);
          if (method === "GET" && userMatch) {
            const member = state.team.find((entry) => entry.id === Number(userMatch[1]));
            if (!member) {
              html(res, 404, "<p>User not found</p>");
              return;
            }
            html(res, 200, renderDrawer(member));
            return;
          }

          if (method === "GET" && pathname === "/api/demo/search") {
            html(res, 200, renderSearchResults(state, url.searchParams));
            return;
          }

          if (method === "GET" && pathname === "/api/demo/releases") {
            html(res, 200, renderReleaseTable(state, url.searchParams));
            return;
          }

          next();
        });
      }
    }
  ]
});
