function normalizeError(errorLike) {
  if (errorLike instanceof Error) return errorLike;
  if (typeof errorLike === "string") return new Error(errorLike);
  try {
    return new Error(JSON.stringify(errorLike));
  } catch {
    return new Error(String(errorLike));
  }
}

function createOverlayDom() {
  const root = document.createElement("div");
  root.className = "ha-overlay";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", "Application error");

  root.innerHTML = `
    <div class="ha-overlay__backdrop"></div>
    <div class="ha-overlay__panel" role="document">
      <div class="ha-overlay__header">
        <div class="ha-overlay__title">发生未处理的错误</div>
        <button class="ha-overlay__close" type="button" aria-label="关闭">×</button>
      </div>
      <div class="ha-overlay__body">
        <div class="ha-overlay__desc">
          我们已捕获到一个运行时异常。你可以尝试刷新页面继续使用；如果问题持续，请复制错误信息反馈给维护者。
        </div>
        <pre class="ha-overlay__pre" aria-label="错误详情"></pre>
        <div class="ha-overlay__actions">
          <button class="ha-btn ha-btn--primary" type="button" data-action="reload">刷新页面</button>
          <button class="ha-btn" type="button" data-action="copy">复制错误信息</button>
          <button class="ha-btn" type="button" data-action="dismiss">忽略并继续</button>
        </div>
      </div>
    </div>
  `.trim();

  const panel = root.querySelector(".ha-overlay__panel");
  const pre = root.querySelector(".ha-overlay__pre");
  const closeBtn = root.querySelector(".ha-overlay__close");
  const actionReload = root.querySelector('[data-action="reload"]');
  const actionCopy = root.querySelector('[data-action="copy"]');
  const actionDismiss = root.querySelector('[data-action="dismiss"]');

  function hide() {
    root.remove();
  }

  function show(error, meta = {}) {
    pre.textContent = `${error?.name ?? "Error"}: ${error?.message ?? ""}\n\n${error?.stack ?? ""}\n\n${JSON.stringify(meta, null, 2)}`;
    document.body.appendChild(root);
    panel?.focus?.();
  }

  closeBtn?.addEventListener("click", hide);
  root.querySelector(".ha-overlay__backdrop")?.addEventListener("click", hide);
  actionDismiss?.addEventListener("click", hide);
  actionReload?.addEventListener("click", () => location.reload());
  actionCopy?.addEventListener("click", async () => {
    const text = pre.textContent || "";
    try {
      await navigator.clipboard.writeText(text);
      actionCopy.textContent = "已复制";
      setTimeout(() => {
        actionCopy.textContent = "复制错误信息";
      }, 1200);
    } catch {
      // ignore
    }
  });

  return { show, hide };
}

export function installGlobalErrorBoundary(options = {}) {
  const {
    logger = null,
    telemetry = null,
    showOverlay = true,
  } = options;

  const overlay = showOverlay ? createOverlayDom() : null;

  function report(kind, error, meta) {
    logger?.error?.(`runtime.${kind}`, { message: error.message, stack: error.stack, ...meta });
    telemetry?.capture?.(`runtime.${kind}`, { message: error.message, stack: error.stack, ...meta }, "error");
    overlay?.show?.(error, meta);
  }

  window.addEventListener(
    "error",
    (event) => {
      const error = normalizeError(event.error ?? event.message ?? "Unknown error");
      report("error", error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    },
    true,
  );

  window.addEventListener(
    "unhandledrejection",
    (event) => {
      const error = normalizeError(event.reason ?? "Unhandled promise rejection");
      report("unhandledrejection", error, {});
    },
    true,
  );

  return {
    overlay,
  };
}

