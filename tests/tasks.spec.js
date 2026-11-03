import { test, expect } from "@playwright/test";
test.beforeEach(async ({ request }) => {
  // Delete repeated first pages only in the isolated test server's database.
  for (;;) {
    const response = await request.get("/api/v1/tasks?limit=100");
    const { data } = await response.json();
    if (!data.tasks.length) break;
    for (const task of data.tasks)
      await request.delete(`/api/v1/tasks/${task._id}`);
  }
});
test("responsive workspace supports validation, CRUD, filters, persistence and keyboard dialogs", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByText("A fresh start, a clear mind.")).toBeVisible();
  await page.getByRole("button", { name: "New task", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Create task", exact: true })
    .click();
  await expect(page.getByText("Give your task a title.")).toBeVisible();
  await page.getByLabel("Task title").fill("Review launch checklist");
  await page
    .getByLabel("Description")
    .fill("Confirm accessibility and release notes.");
  await dialog.getByLabel("Priority").selectOption("high");
  await dialog.getByLabel("Due date").fill("2026-12-15");
  await dialog
    .getByRole("button", { name: "Create task", exact: true })
    .click();
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(page.locator(".toast")).toHaveText("Task created successfully.");
  await page.reload();
  await expect(page.getByRole("article")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Review launch checklist", exact: true })
    .click();
  await expect(
    dialog.getByText("Confirm accessibility and release notes."),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Review launch checklist", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Edit Review launch checklist" })
    .click();
  await dialog.getByLabel("Status").selectOption("completed");
  await dialog.getByLabel("Priority").selectOption("low");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".toast")).toHaveText("Task updated successfully.");
  await expect(
    page.getByRole("article").getByText("Completed", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "100",
  );
  await page
    .getByLabel("Search tasks", { exact: true })
    .fill("nothing-matches");
  await expect(page.getByText("No tasks match your search")).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .first()
    .click();
  await page.getByLabel("Filter by status").selectOption("pending");
  await expect(page.getByText("No tasks match your search")).toBeVisible();
  await page.getByLabel("Filter by status").selectOption("completed");
  await page.getByLabel("Filter by priority").selectOption("low");
  await expect(page.getByRole("article")).toHaveCount(1);
  await page
    .getByRole("combobox", { name: "Sort tasks", exact: true })
    .selectOption("priority");
  await page.getByRole("button", { name: "Sort ascending" }).click();
  await expect(page.locator('[aria-live="polite"][aria-busy]')).toHaveAttribute(
    "aria-busy",
    "false",
  );
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole("article")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/workspace-${width}.png`,
      fullPage: true,
    });
  }
  await page
    .getByRole("button", { name: "Delete Review launch checklist" })
    .click();
  await dialog.getByRole("button", { name: "Keep task" }).click();
  await expect(page.getByText("Task deleted successfully.")).toHaveCount(0);
  await expect(page.getByRole("article")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Delete Review launch checklist" })
    .click();
  await dialog
    .getByRole("button", { name: "Delete task", exact: true })
    .click();
  await expect(page.getByRole("article")).toHaveCount(0);
  await expect(page.locator(".toast")).toHaveText("Task deleted successfully.");
  expect(errors).toEqual([]);
});

// Create enough persisted records to exercise actual server pagination in the UI.
async function seedTasks(request, count) {
  for (let index = 1; index <= count; index++) {
    const response = await request.post("/api/v1/tasks", {
      data: {
        title: `Task ${String(index).padStart(2, "0")}`,
        status: index % 2 ? "pending" : "completed",
        priority: index % 2 ? "high" : "low",
      },
    });
    expect(response.ok()).toBe(true);
  }
}

test("pagination, page size, filter resets, view switching, and emptied-page recovery", async ({
  page,
  request,
}) => {
  await seedTasks(request, 25);
  await page.goto("/");
  await expect(page.getByText("Showing 1–12 of 25 tasks")).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(12);
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.getByText("Showing 13–24 of 25 tasks")).toBeVisible();
  let listRequests = 0;
  page.on("request", (req) => {
    if (req.method() === "GET" && req.url().includes("/api/v1/tasks?"))
      listRequests++;
  });
  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(page.getByRole("table", { name: "Task list" })).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(13);
  expect(listRequests).toBe(0);
  await expect(
    page.getByRole("button", { name: "Page 2", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.getByRole("button", { name: "Cards", exact: true }).click();
  await expect(page.getByRole("article")).toHaveCount(12);
  expect(listRequests).toBe(0);
  await page.getByLabel("Tasks per page", { exact: true }).selectOption("24");
  await expect(page.getByText("Showing 1–24 of 25 tasks")).toBeVisible();
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.getByText("Showing 25–25 of 25 tasks")).toBeVisible();
  await page
    .getByRole("article")
    .getByRole("button", { name: /^Delete / })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete task", exact: true })
    .click();
  await expect(page.getByText("Showing 1–24 of 24 tasks")).toBeVisible();
  await expect(page.locator(".toast")).toHaveText("Task deleted successfully.");
  await page.getByLabel("Tasks per page", { exact: true }).selectOption("12");
  await expect(page.getByText("Showing 1–12 of 24 tasks")).toBeVisible();
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.getByText("Showing 13–24 of 24 tasks")).toBeVisible();
  await page.getByLabel("Filter by status").selectOption("completed");
  await expect(page.getByText("Showing 1–12 of 12 tasks")).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(page.getByText("Showing 1–12 of 24 tasks")).toBeVisible();
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.getByText("Showing 13–24 of 24 tasks")).toBeVisible();
  await page
    .getByRole("combobox", { name: "Sort tasks", exact: true })
    .selectOption("dueDate");
  await expect(page.getByText("Showing 1–12 of 24 tasks")).toBeVisible();
  await page.getByLabel("Search tasks", { exact: true }).fill("Task 20");
  await expect(page.getByText("Showing 1–1 of 1 tasks")).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "50",
  );
});

test("list actions work and both views fit desktop, tablet, and mobile", async ({
  page,
  request,
}) => {
  await seedTasks(request, 2);
  await page.goto("/");
  await expect(page.getByRole("article")).toHaveCount(2);
  await page.getByRole("button", { name: "List", exact: true }).click();
  await page.getByRole("button", { name: "Task 02", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Task 02", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Edit Task 02" }).click();
  await page.getByLabel("Task title").fill("Updated list task");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.locator(".toast")).toHaveText("Task updated successfully.");
  await expect(
    page.getByRole("button", { name: "Updated list task", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Dismiss notification").click();
  for (const mode of ["List", "Cards"]) {
    await page.getByRole("button", { name: mode, exact: true }).click();
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(
        page.locator('[aria-live="polite"][aria-busy]'),
      ).toHaveAttribute("aria-busy", "false");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/${mode.toLowerCase()}-${width}.png`,
        fullPage: true,
      });
    }
  }
  await page.getByRole("button", { name: "List", exact: true }).click();
  await page.getByRole("button", { name: "Delete Updated list task" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete task", exact: true })
    .click();
  await expect(page.locator(".task-list-row")).toHaveCount(1);
  await expect(page.locator(".toast")).toHaveText("Task deleted successfully.");
});

test("mutation errors stay visible inside dialogs and preserve entered values", async ({
  page,
  request,
}) => {
  await seedTasks(request, 1);
  await page.goto("/");
  await expect(page.getByRole("article")).toHaveCount(1);
  await page.route("**/api/v1/tasks**", (route) =>
    route.request().method() === "GET"
      ? route.continue()
      : route.fulfill({
          status: route.request().method() === "POST" ? 400 : 500,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            message: "Unable to save this task.",
            errors:
              route.request().method() === "POST"
                ? [{ field: "title", message: "Title rejected by server." }]
                : [],
          }),
        }),
  );
  await page.getByRole("button", { name: "New task", exact: true }).click();
  await page.getByLabel("Task title").fill("Keep my draft");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create task", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toHaveText(
    "Unable to save this task.",
  );
  await expect(page.getByLabel("Task title")).toHaveValue("Keep my draft");
  await expect(
    page.getByText("Title rejected by server.", { exact: true }),
  ).toBeVisible();
  expect(
    await page
      .locator(".toast")
      .evaluate((element) => element.closest("dialog")?.open),
  ).toBe(true);
  // Visibility must include hit testing: dialog backdrops must not cover the toast.
  expect(
    await page.locator(".toast").evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return element.contains(
        document.elementFromPoint(
          rect.x + rect.width / 2,
          rect.y + rect.height / 2,
        ),
      );
    }),
  ).toBe(true);
  await page.screenshot({ path: "test-results/dialog-error-toast.png" });
  await page.getByLabel("Dismiss notification").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".toast")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Edit Task 01" }).click();
  await page.getByLabel("Task title").fill("Retained edit");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("Task title")).toHaveValue("Retained edit");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Delete Task 01" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete task", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Keep task", exact: true }).click();
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(page.getByText("Task deleted successfully.")).toHaveCount(0);
});

test("notification auto-dismiss pauses for hover and keyboard focus", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("A fresh start, a clear mind.")).toBeVisible();
  await page.clock.install();
  await page.getByRole("button", { name: "New task", exact: true }).click();
  await page.getByLabel("Task title").fill("Timer task");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create task", exact: true })
    .click();
  await expect(page.locator(".toast")).toHaveText("Task created successfully.");
  await page.locator(".toast").hover();
  await page.clock.runFor(7000);
  await expect(page.locator(".toast")).toBeVisible();
  await page.getByLabel("Dismiss notification").focus();
  await page.getByRole("heading", { level: 1 }).hover();
  await page.clock.runFor(7000);
  await expect(page.locator(".toast")).toBeVisible();
  await page.getByRole("button", { name: "New task", exact: true }).focus();
  await page.clock.runFor(6100);
  await expect(page.locator(".toast")).toHaveCount(0);
});

test("updates recover emptied filtered pages and creation returns to page one in list mode", async ({
  page,
  request,
}) => {
  await seedTasks(request, 25);
  await page.goto("/");
  await expect(page.getByText("Showing 1–12 of 25 tasks")).toBeVisible();
  await page.getByLabel("Filter by status").selectOption("pending");
  await expect(page.getByText("Showing 1–12 of 13 tasks")).toBeVisible();
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.getByText("Showing 13–13 of 13 tasks")).toBeVisible();
  await page
    .getByRole("article")
    .getByRole("button", { name: /^Edit / })
    .click();
  await page.getByRole("dialog").getByLabel("Status").selectOption("completed");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByText("Showing 1–12 of 12 tasks")).toBeVisible();
  await expect(page.locator(".toast")).toHaveText("Task updated successfully.");
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(page.getByText("Showing 1–12 of 25 tasks")).toBeVisible();
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.getByText("Showing 13–24 of 25 tasks")).toBeVisible();
  await page.getByRole("button", { name: "List", exact: true }).click();
  await page.getByRole("button", { name: "New task", exact: true }).click();
  await page.getByLabel("Task title").fill("Created from page two");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create task", exact: true })
    .click();
  await expect(page.getByText("Showing 1–12 of 26 tasks")).toBeVisible();
  await expect(
    page
      .getByRole("table", { name: "Task list" })
      .getByRole("button", { name: "Created from page two", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".toast")).toHaveText("Task created successfully.");
});

test("list failure leaves statistics visible and retries only the task list", async ({
  page,
  request,
}) => {
  await seedTasks(request, 1);
  let statsRequests = 0;
  page.on("request", (req) => {
    if (new URL(req.url()).pathname === "/api/v1/tasks/stats") statsRequests++;
  });
  await page.route("**/api/v1/tasks*", (route) => route.abort());
  await page.goto("/");
  await expect(page.getByText("We couldn’t load your tasks")).toBeVisible();
  await expect(page.locator(".stat-value")).toHaveText(["1", "1", "0", "0"]);
  const beforeRetry = statsRequests;
  await page.unroute("**/api/v1/tasks*");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("article")).toHaveCount(1);
  expect(statsRequests).toBe(beforeRetry);
});

test("statistics fail and retry independently while tasks remain usable", async ({
  page,
  request,
}) => {
  await seedTasks(request, 2);
  let fail = true;
  let listRequests = 0;
  page.on("request", (req) => {
    if (
      req.method() === "GET" &&
      new URL(req.url()).pathname === "/api/v1/tasks"
    )
      listRequests++;
  });
  await page.route("**/api/v1/tasks/stats", (route) =>
    fail
      ? route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            message: "Statistics temporarily unavailable.",
            errors: [],
          }),
        })
      : route.continue(),
  );
  await page.goto("/");
  await expect(page.getByRole("article")).toHaveCount(2);
  await expect(
    page.getByText("Couldn’t load dashboard statistics"),
  ).toBeVisible();
  await expect(page.locator(".stat-value")).toHaveText(["—", "—", "—", "—"]);
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuetext",
    "Progress unavailable",
  );
  await expect(page.getByRole("progressbar")).not.toHaveAttribute(
    "aria-valuenow",
  );
  const beforeRetry = listRequests;
  fail = false;
  await page
    .getByRole("button", { name: "Retry statistics", exact: true })
    .click();
  await expect(page.locator(".stat-value")).toHaveText(["2", "1", "0", "1"]);
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "50",
  );
  expect(listRequests).toBe(beforeRetry);
});

test("list controls and presentation changes never refetch statistics", async ({
  page,
  request,
}) => {
  await seedTasks(request, 25);
  let statsRequests = 0;
  page.on("request", (req) => {
    if (new URL(req.url()).pathname === "/api/v1/tasks/stats") statsRequests++;
  });
  await page.goto("/");
  await expect(page.locator(".stat-value")).toHaveText(["25", "13", "0", "12"]);
  await expect(page.getByText("Showing 1–12 of 25 tasks")).toBeVisible();
  const initial = statsRequests;
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.getByText("Showing 13–24 of 25 tasks")).toBeVisible();
  await page.getByLabel("Tasks per page", { exact: true }).selectOption("24");
  await expect(page.getByText("Showing 1–24 of 25 tasks")).toBeVisible();
  await page.getByLabel("Filter by status").selectOption("pending");
  await expect(page.getByText("Showing 1–13 of 13 tasks")).toBeVisible();
  await page.getByLabel("Filter by priority").selectOption("high");
  await expect(page.locator('[aria-live="polite"][aria-busy]')).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await page
    .getByRole("combobox", { name: "Sort tasks", exact: true })
    .selectOption("dueDate");
  await expect(page.locator('[aria-live="polite"][aria-busy]')).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await page
    .getByRole("button", { name: "Sort ascending", exact: true })
    .click();
  await expect(page.locator('[aria-live="polite"][aria-busy]')).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await page.getByLabel("Search tasks", { exact: true }).fill("Task 01");
  await expect(page.getByText("Showing 1–1 of 1 tasks")).toBeVisible();
  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(page.getByRole("table", { name: "Task list" })).toBeVisible();
  await page.getByRole("button", { name: "Cards", exact: true }).click();
  await expect(page.getByRole("article")).toHaveCount(1);
  expect(statsRequests).toBe(initial);
  await expect(page.locator(".stat-value")).toHaveText(["25", "13", "0", "12"]);
});

test("CRUD refreshes both resources and successful mutations survive statistics-refresh failures", async ({
  page,
  request,
}) => {
  await seedTasks(request, 1);
  let statsRequests = 0;
  page.on("request", (req) => {
    if (new URL(req.url()).pathname === "/api/v1/tasks/stats") statsRequests++;
  });
  await page.goto("/");
  await expect(page.locator(".stat-value")).toHaveText(["1", "1", "0", "0"]);
  await expect(page.getByRole("article")).toHaveCount(1);
  const initial = statsRequests;
  let release;
  const heldResponse = new Promise((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/tasks/stats", async (route) => {
    await heldResponse;
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        message: "Statistics refresh failed.",
        errors: [],
      }),
    });
  });
  await page.getByRole("button", { name: "New task", exact: true }).click();
  await page.getByLabel("Task title").fill("Saved despite stats failure");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create task", exact: true })
    .click();
  await expect(page.locator(".toast")).toHaveText("Task created successfully.");
  await expect(page.getByRole("article")).toHaveCount(2);
  await expect(
    page.getByRole("region", { name: "Task statistics", exact: true }),
  ).toHaveAttribute("aria-busy", "true");
  await expect(page.locator(".stat-value")).toHaveText(["1", "1", "0", "0"]);
  expect(statsRequests).toBe(initial + 1);
  release();
  await expect(
    page.getByText("Couldn’t load dashboard statistics"),
  ).toBeVisible();
  await expect(page.locator(".toast")).toHaveText("Task created successfully.");
  await page.unroute("**/api/v1/tasks/stats");
  await page
    .getByRole("button", { name: "Retry statistics", exact: true })
    .click();
  await expect(page.locator(".stat-value")).toHaveText(["2", "2", "0", "0"]);
  const beforeUpdate = statsRequests;
  await page.getByRole("button", { name: "Edit Task 01" }).click();
  await page.getByRole("dialog").getByLabel("Status").selectOption("completed");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.locator(".stat-value")).toHaveText(["2", "1", "0", "1"]);
  expect(statsRequests).toBe(beforeUpdate + 1);
  const beforeDelete = statsRequests;
  await page.getByRole("button", { name: "Delete Task 01" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete task", exact: true })
    .click();
  await expect(page.locator(".stat-value")).toHaveText(["1", "1", "0", "0"]);
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(page.locator(".toast")).toHaveText("Task deleted successfully.");
  expect(statsRequests).toBe(beforeDelete + 1);
});
