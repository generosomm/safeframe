/* =============================================================
   VIEW — switches between the landing and the tool.
   Entering the tool pushes a history entry, so the phone's back
   button (or gesture) returns to the landing instead of leaving
   the site. Focus moves with the view for keyboard and screen
   reader users.
   ============================================================= */

const root = document.documentElement;

let landing;
let footer;
let tool;
let pushedEntry = false;

export function setView(name, { push = true, focus = true } = {}) {
  const isTool = name === "tool";
  if (root.dataset.view === name) return;

  root.dataset.view = name;
  landing.hidden = isTool;
  footer.hidden = isTool;
  tool.hidden = !isTool;

  if (isTool && push) {
    history.pushState({ view: "tool" }, "");
    pushedEntry = true;
  }

  if (isTool) window.scrollTo(0, 0);

  if (focus) {
    const target = isTool
      ? document.getElementById("tool-title")
      : document.getElementById("file-input");
    target?.focus();
  }

  document.dispatchEvent(new CustomEvent("view:change", { detail: { view: name } }));
}

/** Back to the landing. Pops our own history entry when we made one. */
export function leaveTool() {
  if (pushedEntry && history.state?.view === "tool") {
    history.back(); // popstate below does the actual switch
  } else {
    setView("landing");
  }
}

export function initView() {
  landing = document.getElementById("landing");
  footer = document.getElementById("footer");
  tool = document.getElementById("tool");
  if (!landing || !tool) return;

  window.addEventListener("popstate", (event) => {
    const view = event.state?.view === "tool" ? "tool" : "landing";
    if (view === "landing") pushedEntry = false;
    setView(view, { push: false });
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest('[data-action="new-file"]')) leaveTool();
  });

  // Development aid: ?view=tool opens the tool layout without a file,
  // so the shell can be checked at every width before Phase 2.
  if (new URLSearchParams(location.search).get("view") === "tool") {
    setView("tool", { push: false, focus: false });
  }
}
