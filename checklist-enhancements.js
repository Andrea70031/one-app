(() => {
  const ACTION_STYLE = "border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:white;border-radius:999px;padding:9px 12px;font-size:12px";

  function checklistItems(result = {}) {
    const structured = result.checklist || result?.extracted?.checklist || result?.extracted?.items;
    if (Array.isArray(structured)) {
      const items = structured.map(item => typeof item === "string" ? item : (item?.title || item?.text || item?.label || "")).map(x => String(x).trim()).filter(Boolean);
      if (items.length >= 2) return items;
    }
    const text = String(result.summary || "");
    const items = text.split(/\r?\n/).map(line => {
      const match = line.match(/^\s*(?:[-*•]\s*(?:\[[ xX]\]\s*)?|\d+[.)]\s+|\[[ xX]\]\s+|☐\s*|✅\s*)(.+?)\s*$/);
      return match ? match[1].trim() : "";
    }).filter(Boolean);
    return items.length >= 2 ? items : [];
  }

  function resultTitle(result = {}, items = []) {
    if (result.memory_title) return String(result.memory_title).trim();
    if (result.title) return String(result.title).trim();
    const firstPlain = String(result.summary || "").split(/\r?\n/).map(x => x.trim()).find(line => line && !/^\s*(?:[-*•]|\d+[.)]|\[[ xX]\]|☐|✅)/.test(line));
    if (firstPlain && firstPlain.length <= 120) return firstPlain.replace(/^#+\s*/, "");
    return items.length ? "Checklist ONE" : "Risposta ONE";
  }

  function safeFilename(value = "one") {
    return String(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "one";
  }

  const cp1252 = new Map([[8364,128],[8218,130],[402,131],[8222,132],[8230,133],[8224,134],[8225,135],[710,136],[8240,137],[352,138],[8249,139],[338,140],[381,142],[8216,145],[8217,146],[8220,147],[8221,148],[8226,149],[8211,150],[8212,151],[732,152],[8482,153],[353,154],[8250,155],[339,156],[382,158],[376,159]]);
  function toWinAnsi(value = "") {
    let out = "";
    for (const ch of String(value)) {
      const cp = ch.codePointAt(0);
      const byte = cp <= 255 ? cp : (cp1252.get(cp) ?? 63);
      out += String.fromCharCode(byte);
    }
    return out;
  }
  function pdfEscape(value = "") {
    return toWinAnsi(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  }
  function wrapText(value, maxChars) {
    const paragraphs = String(value || "").replace(/\t/g, " ").split(/\r?\n/);
    const lines = [];
    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) { lines.push(""); continue; }
      const words = paragraph.trim().split(/\s+/);
      let line = "";
      for (const word of words) {
        if (!line) line = word;
        else if ((line + " " + word).length <= maxChars) line += " " + word;
        else { lines.push(line); line = word; }
      }
      if (line) lines.push(line);
    }
    return lines;
  }
  function binaryBytes(binary) {
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i) & 255;
    return out;
  }

  function createPdfBlob(result = {}) {
    const items = checklistItems(result);
    const title = resultTitle(result, items);
    const pages = [[]];
    let pageIndex = 0;
    let y = 790;
    const addLine = (text, { size = 11, bold = false, x = 48, leading = 15 } = {}) => {
      if (y < 70) { pages.push([]); pageIndex += 1; y = 790; }
      pages[pageIndex].push({ text, size, bold, x, y });
      y -= leading;
    };
    const addWrapped = (text, options = {}) => {
      const size = options.size || 11;
      const maxChars = Math.max(36, Math.floor((options.maxChars || 86) * (11 / size)));
      wrapText(text, maxChars).forEach(line => addLine(line, options));
    };

    addWrapped("ONE", { size: 10, bold: true, leading: 22, maxChars: 70 });
    addWrapped(title, { size: 18, bold: true, leading: 24, maxChars: 58 });
    addWrapped(`Generato il ${new Date().toLocaleString("it-IT")}`, { size: 9, leading: 24, maxChars: 95 });

    if (items.length) {
      items.forEach((item, index) => {
        const prefix = `[ ] ${index + 1}. `;
        const wrapped = wrapText(item, 76);
        wrapped.forEach((line, lineIndex) => addLine(`${lineIndex === 0 ? prefix : "    "}${line}`, { size: 11, x: 48, leading: 17 }));
        y -= 3;
      });
    } else {
      addWrapped(String(result.summary || "Risposta ONE"), { size: 11, leading: 16, maxChars: 86 });
    }

    const objectCount = 4 + pages.length * 2;
    const objects = new Array(objectCount + 1);
    const pageRefs = [];
    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
    objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";

    pages.forEach((lines, i) => {
      const pageObj = 5 + i * 2;
      const contentObj = pageObj + 1;
      pageRefs.push(`${pageObj} 0 R`);
      const commands = ["q", "0 0 0 rg"];
      for (const line of lines) {
        commands.push("BT", `/${line.bold ? "F2" : "F1"} ${line.size} Tf`, `${line.x} ${line.y} Td`, `(${pdfEscape(line.text)}) Tj`, "ET");
      }
      commands.push("BT", "/F1 8 Tf", "48 34 Td", `(ONE - pagina ${i + 1} di ${pages.length}) Tj`, "ET", "Q");
      const stream = commands.join("\n");
      objects[pageObj] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObj} 0 R >>`;
      objects[contentObj] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    });
    objects[2] = `<< /Type /Pages /Count ${pages.length} /Kids [${pageRefs.join(" ")}] >>`;

    let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
    const offsets = new Array(objectCount + 1).fill(0);
    for (let i = 1; i <= objectCount; i++) {
      offsets[i] = pdf.length;
      pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
    }
    const xref = pdf.length;
    pdf += `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= objectCount; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    pdf += `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return { blob: new Blob([binaryBytes(pdf)], { type: "application/pdf" }), title };
  }

  function exportPdf(result = {}) {
    const { blob, title } = createPdfBlob(result);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeFilename(title)}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    if (typeof toast === "function") toast("PDF creato");
  }

  async function saveChecklistAsReminders(result = {}) {
    const items = checklistItems(result);
    if (!items.length) return;
    const title = resultTitle(result, items);
    const checklistId = `checklist-${Date.now()}`;
    const createdAt = new Date().toISOString();
    const local = items.map((text, index) => ({
      id: `local-${Date.now()}-${index}`,
      title: text,
      note: `Checklist · ${title}`,
      due_at: null,
      completed: false,
      created_at: createdAt,
      source: { kind: "checklist", checklist_id: checklistId, checklist_title: title, checklist_index: index, checklist_total: items.length }
    }));
    let existing = [];
    try { existing = JSON.parse(localStorage.getItem("one_reminders") || "[]"); } catch {}
    localStorage.setItem("one_reminders", JSON.stringify([...local, ...existing].slice(0, 100)));

    if (typeof session !== "undefined" && session) {
      try {
        await cloudRequest("one_reminders", {
          method: "POST",
          body: local.map(item => ({
            user_id: userId(),
            site_id: typeof selectedSiteId !== "undefined" ? (selectedSiteId || null) : null,
            title: item.title,
            note: item.note,
            due_at: null,
            completed: false,
            source: item.source
          }))
        });
        await getReminders();
      } catch {}
    }
    if (typeof addActivity === "function") await addActivity(title, `${items.length} voci salvate nei Promemoria`, "☑", "checklist", { checklist_id: checklistId, items });
    if (typeof loadActionCenter === "function" && document.getElementById("actionReminders")) await loadActionCenter();
    if (typeof loadToday === "function") loadToday();
    if (typeof toast === "function") toast(`Checklist salvata: ${items.length} promemoria`);
  }

  function enhanceResult(result = {}) {
    const target = typeof resultTarget === "function" ? resultTarget() : document.getElementById("demoResult");
    if (!target || target.dataset.checklistEnhanced === "1") return;
    const wrap = target.querySelector(".result-action")?.parentElement;
    if (!wrap) return;
    target.dataset.checklistEnhanced = "1";

    const pdf = document.createElement("button");
    pdf.textContent = "Esporta PDF";
    pdf.className = "result-action";
    pdf.style.cssText = ACTION_STYLE;
    pdf.onclick = () => exportPdf(result);
    wrap.appendChild(pdf);

    const items = checklistItems(result);
    if (items.length) {
      const reminders = document.createElement("button");
      reminders.textContent = "Salva nei Promemoria";
      reminders.className = "result-action";
      reminders.style.cssText = ACTION_STYLE;
      reminders.onclick = () => saveChecklistAsReminders(result);
      wrap.appendChild(reminders);
    }
  }

  if (typeof showAIResult === "function") {
    const baseShowAIResult = showAIResult;
    showAIResult = function(result, source) {
      const target = typeof resultTarget === "function" ? resultTarget() : null;
      if (target) delete target.dataset.checklistEnhanced;
      baseShowAIResult(result, source);
      requestAnimationFrame(() => enhanceResult(result));
    };
  }
})();
