import type { SwapMode } from "../types";

function parseFragment(html: string): DocumentFragment {
  const template = document.createElement("template");
  template.innerHTML = html;
  return template.content;
}

export function applySwap(
  target: Element,
  html: string,
  mode: SwapMode
): Element[] {
  const inserted: Element[] = [];

  if (mode === "none") {
    return inserted;
  }

  if (mode === "remove") {
    target.remove();
    return inserted;
  }

  const fragment = parseFragment(html);
  const elements = Array.from(fragment.children);

  switch (mode) {
    case "innerHTML": {
      (target as HTMLElement).innerHTML = html;
      return Array.from(target.children);
    }
    case "outerHTML": {
      target.replaceWith(fragment);
      return elements;
    }
    case "beforebegin": {
      target.before(fragment);
      inserted.push(...elements);
      break;
    }
    case "afterbegin": {
      target.prepend(fragment);
      inserted.push(...Array.from(target.children));
      break;
    }
    case "beforeend": {
      target.append(fragment);
      inserted.push(...Array.from(target.children));
      break;
    }
    case "afterend": {
      target.after(fragment);
      inserted.push(...elements);
      break;
    }
  }

  return inserted;
}