import { useEffect } from 'react';

// "Gizle" modu: kök elemanın altındaki tüm sayıları (tutar, oran, adet, tarih içindeki rakamlar dahil) ***** yapar.
// Yıl (2020-2030) başlıklarda okunabilir kalır. Etkin değilse ya da kapatılınca metinler eski haline döner.
const NUM = /\d[\d.,]*(?:\s?(?:M|K|B|mn|bn))?/g;
const YEAR = /^20[2-3]\d$/;
const MASK = '*****';
// 1-2 haneli sayılar (sıra no vb.) kendi genişliğinde, diğerleri ***** olur; yerleşim bozulmasın.
const maskText = (s) => s.replace(NUM, (m) => (YEAR.test(m) ? m : m.length <= 2 ? '*'.repeat(m.length) : MASK));

export function useMaskNumbers(active, rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!active || !root) return undefined;
    const originals = new Map(); // text node -> özgün metin

    const maskNode = (node) => {
      const v = node.nodeValue;
      if (!v || !/\d/.test(v)) return;
      const next = maskText(v);
      if (next !== v) {
        if (!originals.has(node)) originals.set(node, v);
        node.nodeValue = next;
      }
    };
    const walk = (el) => {
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let n = w.nextNode();
      while (n) { maskNode(n); n = w.nextNode(); }
    };

    walk(root);
    const mo = new MutationObserver((records) => {
      mo.disconnect();
      records.forEach((r) => {
        if (r.type === 'characterData') {
          // React metni yenilediyse yeni özgün değeri sakla
          if (originals.has(r.target) && r.target.nodeValue !== maskText(originals.get(r.target))) originals.delete(r.target);
          maskNode(r.target);
        } else r.addedNodes.forEach((n) => { if (n.nodeType === 3) maskNode(n); else if (n.nodeType === 1) walk(n); });
      });
      mo.observe(root, { childList: true, characterData: true, subtree: true });
    });
    mo.observe(root, { childList: true, characterData: true, subtree: true });

    return () => {
      mo.disconnect();
      originals.forEach((v, node) => { if (node.isConnected && node.nodeValue === maskText(v)) node.nodeValue = v; });
    };
  }, [active, rootRef]);
}
