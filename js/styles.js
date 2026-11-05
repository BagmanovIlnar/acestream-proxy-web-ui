// Общие стили компонентов. CSS-переменные из css/shell.css наследуются сквозь shadow DOM,
// тема остаётся в одном месте.
export const common = `
  :host { display: block; }
  * { box-sizing: border-box; }
  input[type=text], select {
    background: var(--panel); border: 1px solid var(--border); color: var(--text);
    border-radius: 8px; padding: 8px 12px; font: inherit; outline: none; min-width: 0;
  }
  input[type=text]:focus, select:focus { border-color: var(--accent); }
  button.primary {
    appearance: none; border: 0; cursor: pointer; font: inherit; font-weight: 600;
    color: #fff; background: linear-gradient(90deg, var(--accent), var(--accent2));
    border-radius: 8px; padding: 8px 16px;
  }
  button.primary:hover { filter: brightness(1.1); }
  button.ghost {
    appearance: none; cursor: pointer; font: inherit; color: var(--dim);
    background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 6px 12px;
  }
  button.ghost:hover { color: var(--bad); border-color: var(--bad); }
  .toolbar { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
  .chip {
    display: inline-flex; align-items: center; gap: 7px; padding: 5px 12px;
    background: var(--panel); border: 1px solid var(--border); border-radius: 999px;
    color: var(--dim); font-size: 12.5px; white-space: nowrap;
  }
  .chip b { color: var(--text); font-weight: 600; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--dim); }
  .dot.on { background: var(--ok); box-shadow: 0 0 8px var(--ok); }
  .dot.off { background: var(--bad); box-shadow: 0 0 8px var(--bad); }
  .codec { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; background: var(--panel2); border: 1px solid var(--border); border-radius: 6px; padding: 1px 7px; }
  .badge { font-size: 11px; padding: 1px 8px; border-radius: 999px; border: 1px solid var(--border); }
  .badge.hls { color: var(--accent); border-color: var(--accent); }
  .badge.ts { color: var(--warn); border-color: var(--warn); }
  .badge.browser { color: var(--accent2); border-color: var(--accent2); }
  .empty { color: var(--dim); text-align: center; padding: 48px 0; }
`;
