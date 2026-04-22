import { useState, useEffect } from "react";
import lawsData from "./laws.json";

function extractKeywords(text) {
  const stopWords = new Set([
    "a","an","the","is","it","in","on","at","to","for","of","and","or","but",
    "my","our","we","i","me","he","she","they","was","has","have","had","been",
    "with","by","from","about","this","that","are","be","as","not","can","do",
    "did","will","would","could","should","may","might","your","their","its"
  ]);
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
}

function searchLaws(keywords) {
  const scored = lawsData.laws.map(law => {
    const lawKeywords = law.keywords.map(k => k.toLowerCase());
    const titleWords = law.title.toLowerCase().split(" ");
    const allLawWords = [...lawKeywords, ...titleWords];
    let score = 0;
    keywords.forEach(kw => {
      allLawWords.forEach(lw => {
        if (lw.includes(kw) || kw.includes(lw)) score++;
      });
    });
    return { ...law, score };
  });
  return scored
    .filter(l => l.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

function buildPrompt(query, matchedLaws) {
  const lawsContext = matchedLaws.length > 0
    ? `Here are the relevant Indian laws found in our database:\n${matchedLaws.map(l =>
        `- ${l.title} (${l.reference}): ${l.description}`
      ).join("\n")}`
    : "No specific laws found in database. Use your knowledge of Indian law.";

  return `You are an Indian legal rights reference tool. A corporate professional has described a situation.

${lawsContext}

User situation: "${query}"

Based on the above, respond STRICTLY as valid JSON only (no markdown, no extra text):
{
  "constitutional_rights": [
    {
      "name": "Name of the constitutional right",
      "reference": "Article number from Indian Constitution",
      "what_it_means": "One simple sentence explaining this right in plain English",
      "why_relevant": "One sentence explaining why it applies to this situation"
    }
  ],
  "laws_and_statutes": [
    {
      "name": "Name of the law",
      "reference": "Act name and section number",
      "what_it_means": "One simple sentence explaining this law in plain English",
      "why_relevant": "One sentence explaining why it applies to this situation"
    }
  ],
  "disclaimer": "This information is for reference only and does not constitute legal advice. Please consult a qualified lawyer."
}`;
}

function getKanoonSearchUrl(reference) {
  if (!reference) return "#";
  return `https://indiankanoon.org/search/?formInput=${encodeURIComponent(reference)}`;
}

const exampleQueries = [
  "My employer is reading my personal emails on company devices",
  "A business partner shared our confidential trade secrets with competitors",
  "Our company was raided without prior notice or warrant",
  "An employee was terminated without any reason given",
];

export default function App() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("constitutional");
  const [matchedCount, setMatchedCount] = useState(0);

  useEffect(() => {
    setTimeout(() => setMounted(true), 80);
  }, []);

  const search = async (q) => {
    const searchQuery = q || query;
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const keywords = extractKeywords(searchQuery);
      const matchedLaws = searchLaws(keywords);
      setMatchedCount(matchedLaws.length);
      const prompt = buildPrompt(searchQuery, matchedLaws);

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
        }),
      });

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
      setActiveTab(parsed.constitutional_rights?.length > 0 ? "constitutional" : "laws");
    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalRights =
    (result?.constitutional_rights?.length || 0) +
    (result?.laws_and_statutes?.length || 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Source+Sans+3:wght@300;400;500;600&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #f5f5f0;
          font-family: 'Source Sans 3', sans-serif;
          min-height: 100vh;
          color: #1a1a2e;
        }

        .page-wrap {
          max-width: 860px;
          margin: 0 auto;
          padding: 48px 24px 80px;
        }

        .header {
          text-align: center;
          margin-bottom: 48px;
          opacity: 0;
          transform: translateY(-16px);
          transition: all 0.7s cubic-bezier(.22,1,.36,1);
        }
        .header.in { opacity: 1; transform: translateY(0); }

        .seal {
          width: 64px;
          height: 64px;
          border: 2px solid #b8860b;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          margin-bottom: 20px;
          background: rgba(184,134,11,0.08);
          box-shadow: 0 0 32px rgba(184,134,11,0.15);
        }

        h1 {
          font-family: 'Playfair Display', serif;
          font-size: clamp(2rem, 5vw, 3rem);
          font-weight: 900;
          color: #1a1a2e;
          letter-spacing: -0.5px;
          line-height: 1.1;
        }

        h1 span { color: #b8860b; }

        .tagline {
          margin-top: 10px;
          font-size: 15px;
          color: #666655;
          font-weight: 300;
          letter-spacing: 0.5px;
        }

        .search-card {
          background: #ffffff;
          border: 1px solid #e0ddd5;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 32px;
          opacity: 0;
          transform: translateY(12px);
          transition: all 0.7s cubic-bezier(.22,1,.36,1) 0.1s;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }
        .search-card.in { opacity: 1; transform: translateY(0); }

        textarea {
          width: 100%;
          background: #f9f8f5;
          border: 1px solid #e0ddd5;
          border-radius: 10px;
          padding: 14px 16px;
          color: #1a1a2e;
          font-family: 'Source Sans 3', sans-serif;
          font-size: 15px;
          font-weight: 400;
          resize: none;
          outline: none;
          line-height: 1.6;
          transition: border-color 0.2s;
        }
        textarea::placeholder { color: #aaa99a; }
        textarea:focus { border-color: #b8860b; }

        .search-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 12px;
          gap: 12px;
          flex-wrap: wrap;
        }

        .hint { font-size: 12px; color: #aaa99a; }

        .btn {
          background: #b8860b;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          padding: 11px 24px;
          font-family: 'Source Sans 3', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          letter-spacing: 0.3px;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .btn:hover:not(:disabled) { background: #9a7009; transform: translateY(-1px); }
        .btn:disabled { background: #e0ddd5; color: #aaa99a; cursor: not-allowed; transform: none; }

        .examples {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 16px;
        }

        .example-chip {
          background: #f5f5f0;
          border: 1px solid #e0ddd5;
          border-radius: 20px;
          padding: 6px 14px;
          font-size: 12px;
          color: #888877;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Source Sans 3', sans-serif;
        }
        .example-chip:hover {
          border-color: #b8860b;
          color: #b8860b;
          background: rgba(184,134,11,0.06);
        }

        .loading-bar {
          height: 2px;
          background: linear-gradient(90deg, transparent, #b8860b, transparent);
          background-size: 200% 100%;
          animation: shimmer 1.2s infinite;
          border-radius: 2px;
          margin-bottom: 32px;
        }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

        .results-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .found-badge {
          background: rgba(184,134,11,0.1);
          border: 1px solid rgba(184,134,11,0.3);
          color: #b8860b;
          border-radius: 20px;
          padding: 4px 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .db-badge {
          background: rgba(46,160,67,0.08);
          border: 1px solid rgba(46,160,67,0.25);
          color: #2d8a3e;
          border-radius: 20px;
          padding: 4px 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .tabs {
          display: flex;
          gap: 4px;
          background: #f0ede8;
          border: 1px solid #e0ddd5;
          border-radius: 10px;
          padding: 4px;
          margin-bottom: 20px;
        }

        .tab {
          flex: 1;
          padding: 9px 16px;
          border: none;
          border-radius: 7px;
          font-family: 'Source Sans 3', sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          background: transparent;
          color: #999988;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .tab.active {
          background: #ffffff;
          color: #1a1a2e;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        }
        .tab-count {
          background: #e0ddd5;
          border-radius: 10px;
          padding: 1px 7px;
          font-size: 11px;
        }
        .tab.active .tab-count { background: #b8860b; color: #ffffff; }

        .cards { display: flex; flex-direction: column; gap: 12px; }

        .card {
          background: #ffffff;
          border: 1px solid #e0ddd5;
          border-radius: 12px;
          padding: 20px;
          animation: cardIn 0.4s cubic-bezier(.22,1,.36,1) both;
          box-shadow: 0 1px 6px rgba(0,0,0,0.04);
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .card:hover { border-color: #b8860b; box-shadow: 0 2px 12px rgba(184,134,11,0.1); }

        .card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        .card-name {
          font-family: 'Playfair Display', serif;
          font-size: 17px;
          font-weight: 700;
          color: #1a1a2e;
          line-height: 1.3;
        }

        .ref-tag {
          background: rgba(184,134,11,0.08);
          border: 1px solid rgba(184,134,11,0.25);
          color: #b8860b;
          border-radius: 6px;
          padding: 3px 10px;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
          letter-spacing: 0.3px;
          text-decoration: none;
          display: inline-block;
          transition: all 0.2s;
        }
        .ref-tag:hover {
          background: rgba(184,134,11,0.15);
          text-decoration: underline;
        }

        .plain-block {
          background: #f9f8f5;
          border-radius: 8px;
          padding: 12px 14px;
          margin-bottom: 10px;
        }

        .plain-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #aaa99a;
          margin-bottom: 5px;
        }

        .plain-text {
          font-size: 14px;
          color: #444433;
          line-height: 1.55;
        }

        .why-block {
          border-left: 2px solid #b8860b;
          padding-left: 12px;
        }

        .why-text {
          font-size: 13px;
          color: #666655;
          line-height: 1.55;
        }

        .disclaimer {
          margin-top: 28px;
          background: #ffffff;
          border: 1px solid #e0ddd5;
          border-left: 3px solid #b8860b;
          border-radius: 8px;
          padding: 14px 18px;
          font-size: 13px;
          color: #888877;
          line-height: 1.6;
        }

        .error {
          background: rgba(180,60,60,0.06);
          border: 1px solid rgba(180,60,60,0.2);
          color: #c0392b;
          border-radius: 10px;
          padding: 14px 18px;
          font-size: 14px;
          margin-bottom: 24px;
        }

        .dots span { animation: blink 1.2s infinite; font-size: 18px; }
        .dots span:nth-child(2) { animation-delay: 0.2s; }
        .dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes blink { 0%,80%,100%{opacity:0.2} 40%{opacity:1} }
      `}</style>

      <div className="page-wrap">
        <div className={`header ${mounted ? "in" : ""}`}>
          <div className="seal">⚖️</div>
          <h1>Lex<span>Rights</span></h1>
          <p className="tagline">Indian Constitutional Rights & Laws — explained in plain language.</p>
        </div>

        <div className={`search-card ${mounted ? "in" : ""}`}>
          <textarea rows={3} value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.metaKey || e.ctrlKey) && search()}
            placeholder="Describe your corporate situation... e.g. 'My employer is monitoring my personal messages'"
          />
          <div className="search-row">
            <span className="hint">⌘ Enter to search</span>
            <button className="btn" onClick={() => search()} disabled={loading || !query.trim()}>
              {loading ? <span className="dots"><span>●</span><span>●</span><span>●</span></span> : "Find Relevant Rights & Laws →"}
            </button>
          </div>
          <div className="examples">
            {exampleQueries.map((q, i) => (
              <button key={i} className="example-chip" onClick={() => { setQuery(q); search(q); }}>{q}</button>
            ))}
          </div>
        </div>

        {loading && <div className="loading-bar" />}
        {error && <div className="error">⚠ {error}</div>}

        {result && (
          <div>
            <div className="results-header">
              <span className="found-badge">✓ {totalRights} relevant references found</span>
              <span className="db-badge">🗄 {matchedCount} laws matched from database</span>
            </div>
            <div className="tabs">
              <button className={`tab ${activeTab === "constitutional" ? "active" : ""}`} onClick={() => setActiveTab("constitutional")}>
                📜 Constitutional Rights <span className="tab-count">{result.constitutional_rights?.length || 0}</span>
              </button>
              <button className={`tab ${activeTab === "laws" ? "active" : ""}`} onClick={() => setActiveTab("laws")}>
                📋 Laws & Statutes <span className="tab-count">{result.laws_and_statutes?.length || 0}</span>
              </button>
            </div>
            <div className="cards">
              {activeTab === "constitutional" && result.constitutional_rights?.map((item, i) => (
                <div className="card" key={i} style={{ animationDelay: `${i * 0.07}s` }}>
                  <div className="card-top"><div className="card-name">{item.name}</div><a href={getKanoonSearchUrl(item.reference)} target="_blank" rel="noopener noreferrer" className="ref-tag">{item.reference}</a></div>
                  <div className="plain-block"><div className="plain-label">What this means</div><div className="plain-text">{item.what_it_means}</div></div>
                  <div className="why-block"><div className="plain-label">Why it applies here</div><div className="why-text">{item.why_relevant}</div></div>
                </div>
              ))}
              {activeTab === "laws" && result.laws_and_statutes?.map((item, i) => (
                <div className="card" key={i} style={{ animationDelay: `${i * 0.07}s` }}>
                  <div className="card-top"><div className="card-name">{item.name}</div><a href={getKanoonSearchUrl(item.reference)} target="_blank" rel="noopener noreferrer" className="ref-tag">{item.reference}</a></div>
                  <div className="plain-block"><div className="plain-label">What this means</div><div className="plain-text">{item.what_it_means}</div></div>
                  <div className="why-block"><div className="plain-label">Why it applies here</div><div className="why-text">{item.why_relevant}</div></div>
                </div>
              ))}
            </div>
            <div className="disclaimer">⚠️ <strong>Disclaimer:</strong> {result.disclaimer}</div>
          </div>
        )}
      </div>
    </>
  );
}