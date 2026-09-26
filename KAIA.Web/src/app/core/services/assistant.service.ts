import { Injectable } from '@angular/core';
import { Item } from '../models/item.model';

const CATEGORY_LABELS: Record<string, string> = {
  FD: 'Food',
  HY: 'Hygiene',
  ED: 'Education',
  SH: 'Shelter',
  MD: 'Medical',
  OT: 'Other'
};

/**
 * KAIA Assistant — parses natural-language questions about the catalog and
 * answers them using the item data already loaded in the browser.
 *
 * The `answer()` method is the single entry point. To swap in a real AI
 * provider later, replace the body of `answer()` with an HTTP call to your
 * chosen service; everything else in the component stays the same.
 */
@Injectable({ providedIn: 'root' })
export class AssistantService {

  // ─── Public API ────────────────────────────────────────────────────
  answer(query: string, items: Item[]): string {
    const q = (query || '').trim().toLowerCase();
    if (!q) return 'Ask me anything about your donation catalog.';

    // Greetings
    if (/^(hi|hello|hey|yo|kamusta|kumusta)\b/.test(q)) {
      return "Hi! I'm the KAIA Assistant. Ask me about items, brands, prices, or categories — try one of the suggestions below.";
    }

    // Help
    if (/\b(help|what can you do|commands?|options?|capabilities)\b/.test(q)) {
      return this.helpText();
    }

    // Total count
    if (/\b(how many items|total items|item count|number of items)\b/.test(q) ||
        /^items?$/.test(q)) {
      return `You have ${items.length} donation item${items.length === 1 ? '' : 's'} in the catalog.`;
    }

    // Total value
    if (/\b(total value|total worth|how much is everything|combined value|overall value)\b/.test(q)) {
      const total = items.reduce((s, i) => s + i.unitPrice, 0);
      return `The total estimated value of your catalog is ₱${this.money(total)}.`;
    }

    // Average
    if (/\baverage\b/.test(q) || /\bmean\b/.test(q) || /\btypical\b/.test(q)) {
      if (items.length === 0) return 'No items yet.';
      const avg = items.reduce((s, i) => s + i.unitPrice, 0) / items.length;
      return `The average item is worth ₱${avg.toFixed(2)}.`;
    }

    // Highest priced
    if (/\b(highest|most expensive|priciest|max|top priced|biggest)\b/.test(q)) {
      if (items.length === 0) return 'No items yet.';
      const top = items.reduce((m, i) => i.unitPrice > m.unitPrice ? i : m, items[0]);
      return `The highest-priced item is **${top.name}** at ₱${this.money(top.unitPrice)} — ${top.brand} · ${top.code}.`;
    }

    // Cheapest
    if (/\b(cheapest|lowest priced|least expensive|min|smallest)\b/.test(q)) {
      if (items.length === 0) return 'No items yet.';
      const low = items.reduce((m, i) => i.unitPrice < m.unitPrice ? i : m, items[0]);
      return `The lowest-priced item is **${low.name}** at ₱${this.money(low.unitPrice)} — ${low.brand} · ${low.code}.`;
    }

    // How many brands
    if (/\b(how many brands|brand count|number of brands|distinct brands)\b/.test(q)) {
      const brands = new Set(items.map(i => i.brand));
      return `You have ${brands.size} distinct brand${brands.size === 1 ? '' : 's'} in the catalog.`;
    }

    // How many categories
    if (/\b(how many categor|category count|number of categor|distinct categor)\b/.test(q)) {
      const cats = Array.from(new Set(items.map(i => i.category)));
      const names = cats.map(c => CATEGORY_LABELS[c] ?? c).join(', ');
      return `You have ${cats.length} categories: ${names}.`;
    }

    // Recent
    if (/\b(this week|last week|recent|recently|new items)\b/.test(q)) {
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const n = items.filter(i => new Date(i.createdAtUtc).getTime() >= cutoff).length;
      return `${n} item${n === 1 ? '' : 's'} added in the last 7 days.`;
    }

    // Price under ₱X
    const under = q.match(/under\s*[₱p]?\s*(\d+(?:[.,]\d+)?)/);
    if (under) {
      const t = parseFloat(under[1].replace(',', '.'));
      const list = items.filter(i => i.unitPrice < t);
      return `${list.length} item${list.length === 1 ? '' : 's'} under ₱${this.money(t)}.`;
    }

    // Price over ₱X
    const over = q.match(/(?:over|above|more than|greater than)\s*[₱p]?\s*(\d+(?:[.,]\d+)?)/);
    if (over) {
      const t = parseFloat(over[1].replace(',', '.'));
      const list = items.filter(i => i.unitPrice > t);
      return `${list.length} item${list.length === 1 ? '' : 's'} over ₱${this.money(t)}.`;
    }

    // Category query — "items in Food" / "how many hygiene" / "show food"
    for (const [prefix, label] of Object.entries(CATEGORY_LABELS)) {
      const re = new RegExp(`\\b${label.toLowerCase()}\\b`);
      if (re.test(q)) {
        const inCat = items.filter(i => i.category === prefix);
        if (inCat.length === 0) return `No items in ${label} yet.`;
        const total = inCat.reduce((s, i) => s + i.unitPrice, 0);
        const top3 = [...inCat].sort((a, b) => b.unitPrice - a.unitPrice).slice(0, 3);
        const list = top3.map(i => `• ${i.name} — ₱${this.money(i.unitPrice)}`).join('\n');
        return `${inCat.length} item${inCat.length === 1 ? '' : 's'} in **${label}** (₱${this.money(total)} total):\n${list}`;
      }
    }

    // "show me X" / "find X" / "where is X"
    const findMatch = q.match(/(?:show me|find|where is|what is|tell me about|look up)\s+(.+)/);
    if (findMatch) {
      const term = findMatch[1].trim();
      const found = items.find(i =>
        i.name.toLowerCase().includes(term) ||
        i.code.toLowerCase() === term ||
        i.brand.toLowerCase().includes(term)
      );
      if (found) {
        return `**${found.name}** — ${found.brand} · ${found.code} · ₱${this.money(found.unitPrice)} (${CATEGORY_LABELS[found.category] ?? found.category}).`;
      }
      return `I couldn't find an item matching "${term}". Try part of the name or a code.`;
    }

    // Brand mentioned by name — check against real brands
    const brandHit = items.find(i => q.includes(i.brand.toLowerCase()));
    if (brandHit) {
      const sameBrand = items.filter(i => i.brand.toLowerCase() === brandHit.brand.toLowerCase());
      const total = sameBrand.reduce((s, i) => s + i.unitPrice, 0);
      return `**${brandHit.brand}** has ${sameBrand.length} item${sameBrand.length === 1 ? '' : 's'} worth ₱${this.money(total)} total.`;
    }

    // Fallback
    return `I'm not sure how to answer that yet. Try:\n• "How many items?"\n• "Total value"\n• "Most expensive item"\n• "Items in Food"\n• "How many items under ₱50?"`;
  }

  getSuggestions(): string[] {
    return [
      'How many items do I have?',
      "What's the total value?",
      "Show me the most expensive item",
      'How many items under ₱50?',
      'Items in Food',
      'How many brands?'
    ];
  }

  // ─── Helpers ───────────────────────────────────────────────────────
  private helpText(): string {
    return `I can answer questions about your catalog. Try:
• "How many items do I have?"
• "What's the total value?"
• "What's the most expensive item?"
• "What's the cheapest item?"
• "How many brands?"
• "Items in Food" (or Hygiene, Education, Shelter, Medical)
• "How many items under ₱50?"
• "Show me [item name]"`;
  }

  private money(v: number): string {
    return v.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
}