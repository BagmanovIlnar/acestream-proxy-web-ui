// Общие стили компонентов. CSS-переменные из css/shell.css наследуются сквозь shadow DOM,
// тема остаётся в одном месте.
export const common = `
  :host { display: block; }
  :host([hidden]) { display: none; } // перебивает :host{display:block} — иначе атрибут hidden не скрывает вкладки
  * { box-sizing: border-box; }
  input[type=text], select {
    background: var(--panel2); border: 1px solid var(--border); color: var(--text);
    border-radius: 10px; padding: 9px 12px; font: inherit; outline: none; min-width: 0;
    transition: border-color .15s, box-shadow .15s;
  }
  input[type=text]::placeholder { color: #5d6c8c; }
  input[type=text]:hover, select:hover { border-color: #33456e; }
  input[type=text]:focus, select:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(110, 168, 255, .18); }
  button.primary, button.ghost { font: inherit; font-weight: 600; cursor: pointer; border-radius: 10px; transition: filter .15s, border-color .15s, color .15s, transform .15s; }
  button.primary {
    appearance: none; border: 0; color: #fff;
    background: linear-gradient(90deg, var(--accent), var(--accent2));
    padding: 9px 18px; box-shadow: 0 4px 14px rgba(110, 168, 255, .28);
  }
  button.primary:hover { filter: brightness(1.12); }
  button.primary:active { transform: translateY(1px); }
  button.ghost {
    appearance: none; color: var(--dim); background: transparent;
    border: 1px solid var(--border); padding: 6px 14px;
  }
  button.ghost:hover { color: var(--text); border-color: #3a4f7d; }
  button.ghost.danger:hover { color: var(--bad); border-color: var(--bad); }
  .toolbar { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; }
  .chip {
    display: inline-flex; align-items: center; gap: 7px; padding: 5px 12px;
    background: rgba(255, 255, 255, .04); border: 1px solid var(--border); border-radius: 999px;
    color: var(--dim); font-size: 12.5px; white-space: nowrap;
  }
  .chip b { color: var(--text); font-weight: 600; }
  a.chip { text-decoration: none; }
  a.chip:hover { color: var(--text); border-color: #3a4f7d; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--dim); flex: none; }
  .dot.on { background: var(--ok); box-shadow: 0 0 8px var(--ok); }
  .dot.off { background: var(--bad); box-shadow: 0 0 8px var(--bad); }
  .codec { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; background: var(--panel2); border: 1px solid var(--border); border-radius: 6px; padding: 1px 7px; color: var(--dim); }
  .badge { font-size: 11px; font-weight: 600; padding: 2px 9px; border-radius: 999px; border: 1px solid var(--border); }
  .badge.hls { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 45%, transparent); background: color-mix(in srgb, var(--accent) 12%, transparent); }
  .badge.ts { color: var(--warn); border-color: color-mix(in srgb, var(--warn) 45%, transparent); background: color-mix(in srgb, var(--warn) 12%, transparent); }
  .badge.browser { color: var(--accent2); border-color: color-mix(in srgb, var(--accent2) 45%, transparent); background: color-mix(in srgb, var(--accent2) 12%, transparent); }
  .empty {
    color: var(--dim); text-align: center; padding: 40px 20px; margin-top: 8px;
    border: 1px dashed #2a3a5f; border-radius: var(--radius);
  }
`;
