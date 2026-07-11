export function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "className") el.className = value;
    else if (key.startsWith("on"))
      el.addEventListener(key.slice(2).toLowerCase(), value);
    else el.setAttribute(key, value);
  }
  for (const child of children) {
    if (typeof child === "string")
      el.appendChild(document.createTextNode(child));
    else el.appendChild(child);
  }
  return el;
}

export function emptyElement(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}
