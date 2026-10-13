/* Mini-parser Markdown propio para el chatbot HidroSmart.
   Seguro por diseño: construye elementos React (sin dangerouslySetInnerHTML),
   así el HTML que venga en la respuesta del LLM se muestra como texto.
   Soporta: encabezados #, ##, ### · **negrita** · *cursiva* · `código` ·
   bloques ``` · listas - y 1. · citas > · [enlaces](url) · párrafos. */

function renderInline(text, keyPrefix) {
  const tokens = String(text).split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g);
  return tokens.map((tok, i) => {
    const key = `${keyPrefix}-${i}`;
    if (!tok) return null;
    if (tok.startsWith("**") && tok.endsWith("**") && tok.length > 4) {
      return <strong key={key} className="font-extrabold">{renderInline(tok.slice(2, -2), key)}</strong>;
    }
    if (tok.startsWith("*") && tok.endsWith("*") && tok.length > 2) {
      return <em key={key}>{renderInline(tok.slice(1, -1), key)}</em>;
    }
    if (tok.startsWith("`") && tok.endsWith("`") && tok.length > 2) {
      return <code key={key} className="bg-black/10 rounded-md px-1.5 py-0.5 text-[12px] font-bold">{tok.slice(1, -1)}</code>;
    }
    const link = tok.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      return <a key={key} href={link[2]} target="_blank" rel="noopener noreferrer" className="underline font-bold text-leaf-700">{link[1]}</a>;
    }
    return <span key={key}>{tok}</span>;
  });
}

function parseBlocks(text) {
  const lines = String(text || "").split("\n");
  const blocks = [];
  let para = [];
  let list = null;

  const flushPara = () => {
    if (para.length) {
      const merged = [];
      para.forEach((ln, idx) => {
        if (idx > 0) merged.push(<br key={`br-${idx}`} />);
        merged.push(...renderInline(ln, `p${blocks.length}-${idx}`));
      });
      blocks.push({ type: "p", nodes: merged });
      para = [];
    }
  };
  const flushList = () => { if (list) { blocks.push(list); list = null; } };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Bloque de código ```
    if (/^```/.test(line.trim())) {
      flushPara(); flushList();
      const code = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) { code.push(lines[i]); i++; }
      i++; // salta cierre
      blocks.push({ type: "code", content: code.join("\n") });
      continue;
    }
    // Encabezados
    const h = line.match(/^(#{1,4})\s+(.*)\s*$/);
    if (h) {
      flushPara(); flushList();
      blocks.push({ type: "h", level: h[1].length, content: h[2] });
      i++;
      continue;
    }
    // Cita
    const q = line.match(/^>\s?(.*)$/);
    if (q) {
      flushPara(); flushList();
      blocks.push({ type: "quote", content: q[1] });
      i++;
      continue;
    }
    // Lista no ordenada
    const ul = line.match(/^\s*[-*•]\s+(.*)$/);
    if (ul) {
      flushPara();
      if (!list || list.ordered) { flushList(); list = { type: "list", ordered: false, items: [] }; blocks.push(list); }
      list.items.push(ul[1]);
      i++;
      continue;
    }
    // Lista ordenada
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ol) {
      flushPara();
      if (!list || !list.ordered) { flushList(); list = { type: "list", ordered: true, items: [] }; blocks.push(list); }
      list.items.push(ol[1]);
      i++;
      continue;
    }
    // Línea vacía = separador
    if (/^\s*$/.test(line)) { flushPara(); flushList(); i++; continue; }

    // Texto normal → acumula párrafo
    flushList();
    para.push(line);
    i++;
  }
  flushPara(); flushList();
  return blocks;
}

/** Devuelve nodos React listos para renderizar dentro de la burbuja del chat. */
export function renderMarkdown(text) {
  const blocks = parseBlocks(text);
  return blocks.map((b, i) => {
    if (b.type === "h") {
      const cls = b.level <= 2 ? "font-display font-bold text-[14.5px] mt-1" : "font-extrabold text-[13.5px] mt-1";
      return <div key={i} className={cls}>{renderInline(b.content, `h${i}`)}</div>;
    }
    if (b.type === "code") {
      return (
        <pre key={i} className="bg-gray-900 text-green-100 rounded-xl px-3 py-2 my-1.5 text-[11.5px] font-mono overflow-x-auto whitespace-pre-wrap break-words">
          {b.content}
        </pre>
      );
    }
    if (b.type === "quote") {
      return <div key={i} className="border-l-4 border-leaf-300 pl-2.5 my-1 italic opacity-90">{renderInline(b.content, `q${i}`)}</div>;
    }
    if (b.type === "list") {
      const Tag = b.ordered ? "ol" : "ul";
      return (
        <Tag key={i} className={`${b.ordered ? "list-decimal" : "list-disc"} ml-4 my-1 space-y-0.5`}>
          {b.items.map((it, j) => <li key={j}>{renderInline(it, `li${i}-${j}`)}</li>)}
        </Tag>
      );
    }
    return <p key={i} className="my-0.5">{b.nodes}</p>;
  });
}
