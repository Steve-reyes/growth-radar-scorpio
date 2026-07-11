'use client';

export default function DocsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="page-breadcrumb mb-2">Docs</div>
      <h1 className="text-2xl font-bold text-[#F1F5F9] mb-6">📖 Growth Radar — User Guide</h1>

      {/* ---- WHAT IS GROWTH RADAR ---- */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">🚀 What is Growth Radar?</h2>
        <div className="dark-card p-5">
          <p className="text-[#94A3B8] leading-relaxed mb-3">
            Growth Radar finds commercial HVAC leads for you — automatically. It scans Canadian municipal permit
            data, scores every prospect on HVAC potential, and lets you import enriched leads from
            <strong className="text-[#F1F5F9]"> LeadScraper</strong> or your own <strong className="text-[#F1F5F9]">CSV files</strong>.
          </p>
          <p className="text-[#94A3B8] leading-relaxed">
            Everything lives in one dashboard: browse leads, track your pipeline on drag-and-drop kanban boards,
            and get an AI-generated daily brief every morning so you never miss a hot lead.
          </p>
        </div>
      </section>

      {/* ---- QUICK START ---- */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">⚡ Quick Start</h2>
        <div className="dark-card-gradient p-5">
          <p className="text-[#94A3B8] leading-relaxed mb-3">
            Here&apos;s how to go from login to your first hot lead in five minutes:
          </p>
          <ol className="list-decimal list-inside text-[#94A3B8] space-y-2">
            <li><strong className="text-[#10B981]">Log in</strong> with credentials from your admin — all features unlock instantly</li>
            <li><strong className="text-[#10B981]">Check your Dashboard</strong> for an overview of scores and recent imports</li>
            <li><strong className="text-[#10B981]">Set up a Territory</strong> — pick a city, run an ingestion scan</li>
            <li><strong className="text-[#10B981]">Browse Leads — Permits</strong> to see what&apos;s been found</li>
            <li><strong className="text-[#10B981]">Import CSV or LeadScraper</strong> data to enrich your lead list</li>
            <li><strong className="text-[#10B981]">Use the Kanban boards</strong> to track your sales pipeline</li>
          </ol>
        </div>
      </section>

      {/* ---- NAVIGATION TABLE ---- */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">🧭 Navigation</h2>
        <p className="text-[#94A3B8] mb-3">The sidebar on the left gives you quick access to every page:</p>
        <div className="dark-card overflow-hidden">
          <table className="dark-table">
            <thead>
              <tr>
                <th>Page</th>
                <th>What it does</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <span className="flex items-center gap-2">
                    <span>📊</span>
                    <span className="text-[#F1F5F9]">Dashboard</span>
                  </span>
                </td>
                <td className="text-[#94A3B8]">Stats overview, import batches, score chart, daily brief snippet</td>
              </tr>
              <tr>
                <td>
                  <span className="flex items-center gap-2">
                    <span>🏙️</span>
                    <span className="text-[#F1F5F9]">Territories</span>
                  </span>
                </td>
                <td className="text-[#94A3B8]">Create and manage geographic scan areas, run ingestion</td>
              </tr>
              <tr>
                <td>
                  <span className="flex items-center gap-2">
                    <span>📋</span>
                    <span className="text-[#F1F5F9]">Leads — Permits</span>
                  </span>
                </td>
                <td className="text-[#94A3B8]">Browse scored permit leads found by scanning territories</td>
              </tr>
              <tr>
                <td>
                  <span className="flex items-center gap-2">
                    <span>📥</span>
                    <span className="text-[#F1F5F9]">Leads — Imported</span>
                  </span>
                </td>
                <td className="text-[#94A3B8]">View imported leads (LeadScraper / CSV) grouped by batch</td>
              </tr>
              <tr>
                <td>
                  <span className="flex items-center gap-2">
                    <span>📌</span>
                    <span className="text-[#F1F5F9]">Kanban — Permits</span>
                  </span>
                </td>
                <td className="text-[#94A3B8]">Drag-and-drop pipeline for territory-based leads</td>
              </tr>
              <tr>
                <td>
                  <span className="flex items-center gap-2">
                    <span>📌</span>
                    <span className="text-[#F1F5F9]">Kanban — Imported</span>
                  </span>
                </td>
                <td className="text-[#94A3B8]">Drag-and-drop pipeline for imported leads</td>
              </tr>
              <tr>
                <td>
                  <span className="flex items-center gap-2">
                    <span>📰</span>
                    <span className="text-[#F1F5F9]">Daily Brief</span>
                  </span>
                </td>
                <td className="text-[#94A3B8]">AI-generated summaries with top leads, refreshed daily</td>
              </tr>
              <tr>
                <td>
                  <span className="flex items-center gap-2">
                    <span>📖</span>
                    <span className="text-[#F1F5F9]">Docs</span>
                  </span>
                </td>
                <td className="text-[#94A3B8]">You are here</td>
              </tr>
              <tr>
                <td>
                  <span className="flex items-center gap-2">
                    <span>⚙️</span>
                    <span className="text-[#F1F5F9]">Settings</span>
                  </span>
                </td>
                <td className="text-[#94A3B8]">Admins only — manage users, territories, and platform config</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ---- DASHBOARD ---- */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">📊 Dashboard</h2>
        <p className="text-[#94A3B8] mb-3">
          Your command centre. Open it first thing to see where things stand.
          The dashboard is split into two columns — a wide analytics panel on the left
          and a sidebar with score distribution and daily brief on the right.
        </p>

        <h3 className="text-lg font-semibold text-[#F1F5F9] mb-2">📈 Leads Analytics (Top)</h3>
        <p className="text-[#94A3B8] mb-3">
          Four color-coded stat cards give you a combined snapshot of <em>all</em> your leads:
        </p>
        <div className="dark-card p-4 mb-3">
          <table className="dark-table">
            <thead>
              <tr>
                <th>Card</th>
                <th>What it shows</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="text-[#10B981] font-bold">🟢 Total All Leads</td>
                <td className="text-[#94A3B8]">Grand total (permit leads + imported leads combined)</td>
              </tr>
              <tr>
                <td className="text-[#3B82F6] font-bold">🔵 Permit Leads</td>
                <td className="text-[#94A3B8]">Leads found via municipal permit scans</td>
              </tr>
              <tr>
                <td className="text-[#8B5CF6] font-bold">🟣 Imported Leads</td>
                <td className="text-[#94A3B8]">Leads imported from CSV or LeadScraper</td>
              </tr>
              <tr>
                <td className="text-[#F59E0B] font-bold">🟡 Avg HVAC Score</td>
                <td className="text-[#94A3B8]">Average HVAC score across permit leads</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold text-[#F1F5F9] mb-2">📥 Imported &amp; 📋 Permits Detail</h3>
        <p className="text-[#94A3B8] mb-3">
          Below the stat cards, two side-by-side panels break down each lead source:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="dark-card p-4">
            <h4 className="font-semibold text-[#8B5CF6] mb-2">🟣 Imported</h4>
            <ul className="space-y-1 text-[#94A3B8] text-sm">
              <li>📦 <strong className="text-[#F1F5F9]">Import Lists</strong> — total batch count</li>
              <li>📥 <strong className="text-[#F1F5F9]">Total Leads</strong> — sum of all imported leads</li>
              <li>📊 <strong className="text-[#F1F5F9]">Avg per List</strong> — average leads per batch</li>
              <li>📅 Newest / oldest import dates</li>
              <li>🔗 <strong className="text-[#10B981]">View All</strong> → <strong className="text-[#F1F5F9]">Leads — Imported</strong></li>
            </ul>
          </div>
          <div className="dark-card p-4">
            <h4 className="font-semibold text-[#3B82F6] mb-2">🔵 Permits</h4>
            <ul className="space-y-1 text-[#94A3B8] text-sm">
              <li>📋 <strong className="text-[#F1F5F9]">Total Leads</strong> — permit lead count</li>
              <li>⭐ <strong className="text-[#F1F5F9]">Avg Score</strong> — average HVAC score</li>
              <li>🏙️ <strong className="text-[#F1F5F9]">Cities</strong> — unique cities covered</li>
              <li>📈 High / Low score range</li>
              <li>🔗 <strong className="text-[#10B981]">View All</strong> → <strong className="text-[#F1F5F9]">Leads — Permits</strong></li>
            </ul>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-[#F1F5F9] mb-2">🏆 Largest Import Lists</h3>
        <p className="text-[#94A3B8] mb-3">
          A ranked list of your top 5 biggest import batches, each with a progress bar
          showing relative size. Handy for seeing which lists give you the most leads at a glance.
        </p>

        <h3 className="text-lg font-semibold text-[#F1F5F9] mb-2">📈 Stats Cards (Bottom Row)</h3>
        <p className="text-[#94A3B8] mb-3">
          Four summary cards sit below the analytics panel with per-metric highlights:
        </p>
        <div className="dark-card p-4 mb-3">
          <table className="dark-table">
            <thead>
              <tr>
                <th>Stat</th>
                <th>What it means</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="text-[#10B981] font-bold">🏙️ Territories</td>
                <td className="text-[#94A3B8]">How many cities or areas you&apos;re scanning</td>
              </tr>
              <tr>
                <td className="text-[#818CF8] font-bold">📋 Permit Leads</td>
                <td className="text-[#94A3B8]">Total leads discovered via municipal permit scans</td>
              </tr>
              <tr>
                <td className="text-[#F59E0B] font-bold">📥 Imported Leads</td>
                <td className="text-[#94A3B8]">Total leads imported from CSV or LeadScraper</td>
              </tr>
              <tr>
                <td className="text-[#10B981] font-bold">⭐ Avg Score</td>
                <td className="text-[#94A3B8]">Average HVAC score across all your leads</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold text-[#F1F5F9] mb-2">📊 Score Distribution</h3>
        <p className="text-[#94A3B8] mb-3">
          A bar chart that breaks down your permit leads by score range (0–20, 21–40, 41–60, 61–80, 81–100).
          Each bar shows the count and percentage. See at a glance
          whether you have plenty of 🔥 hot leads or need to cast a wider net.
        </p>

        <h3 className="text-lg font-semibold text-[#F1F5F9] mb-2">📰 Latest Brief</h3>
        <p className="text-[#94A3B8]">
          The most recent AI-generated daily brief, condensed into a summary card. Shows the top leads
          with their scores — click any lead to see full details. If you haven&apos;t generated a brief yet,
          head to the <strong className="text-[#F1F5F9]">Daily Brief</strong> page to create one.
        </p>
      </section>

      {/* ---- LEADS — PERMITS ---- */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">📋 Leads — Permits</h2>
        <p className="text-[#94A3B8] mb-3">
          This page shows every permit lead discovered by scanning your territories. Think of it as
          your living, growing lead list — new leads appear here automatically whenever you run an
          ingestion scan.
        </p>

        <div className="dark-card p-4 mb-3">
          <h3 className="font-semibold text-[#F1F5F9] mb-3">🔍 Searching &amp; Filtering</h3>
          <ul className="space-y-2 text-[#94A3B8]">
            <li>
              <strong className="text-[#F1F5F9]">Search bar</strong> — type a business name, city, or phone number to find leads instantly
            </li>
            <li>
              <strong className="text-[#F1F5F9]">Territory filter</strong> — show leads from one territory at a time
            </li>
            <li>
              <strong className="text-[#F1F5F9]">Status filter</strong> — narrow by pipeline stage (new, contacted, qualified, etc.)
            </li>
            <li>
              <strong className="text-[#F1F5F9]">Min score slider</strong> — drag to hide low-scoring leads and focus on hot prospects
            </li>
          </ul>
        </div>

        <div className="dark-card p-4 mb-3">
          <h3 className="font-semibold text-[#F1F5F9] mb-3">📊 Sorting</h3>
          <p className="text-[#94A3B8]">
            Click any column header to sort — score, business name, city, phone, or status.
            Click again to toggle ascending / descending. A small arrow shows the active sort.
          </p>
        </div>

        <div className="dark-card p-4 mb-3">
          <h3 className="font-semibold text-[#F1F5F9] mb-3">🔎 Lead Details</h3>
          <p className="text-[#94A3B8] mb-2">
            Click any row to open a detail modal with everything you need to know about that lead:
          </p>
          <ul className="space-y-2 text-[#94A3B8]">
            <li>📄 Business name, address, phone, website</li>
            <li>🏢 Business type and description</li>
            <li>⭐ <strong className="text-[#F1F5F9]">HVAC Score</strong> with color badge</li>
            <li>🔗 <strong className="text-[#10B981]">Google Search</strong> link — click to research the business</li>
          </ul>
        </div>

        <div className="dark-card p-4">
          <h3 className="font-semibold text-[#F1F5F9] mb-3">🏷️ Badges</h3>
          <p className="text-[#94A3B8] mb-2">Each lead has two badges that tell you everything at a glance:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-[#F1F5F9] font-semibold mb-1">⭐ Score Badges</p>
              <ul className="space-y-1 text-[#94A3B8]">
                <li><span className="score-badge score-high">85</span> — <strong className="text-[#10B981]">Hot 🔥</strong> (≥ 70)</li>
                <li><span className="score-badge score-mid">55</span> — <strong className="text-[#F59E0B]">Warm 🟡</strong> (40–69)</li>
                <li><span className="score-badge score-low">25</span> — <strong className="text-[#EF4444]">Cool ⚪</strong> (&lt; 40)</li>
              </ul>
            </div>
            <div>
              <p className="text-[#F1F5F9] font-semibold mb-1">📌 Status Badges</p>
              <ul className="space-y-1 text-[#94A3B8]">
                <li><span className="status-badge status-new"><span className="status-dot status-dot-new" /> New</span></li>
                <li><span className="status-badge status-contacted"><span className="status-dot status-dot-contacted" /> Contacted</span></li>
                <li><span className="status-badge status-qualified"><span className="status-dot status-dot-qualified" /> Qualified</span></li>
                <li><span className="status-badge status-converted"><span className="status-dot status-dot-converted" /> Converted</span></li>
                <li><span className="status-badge status-dismissed"><span className="status-dot status-dot-dismissed" /> Dismissed</span></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ---- LEADS — IMPORTED ---- */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">📥 Leads — Imported</h2>
        <p className="text-[#94A3B8] mb-3">
          Import leads from two sources. This is the <strong className="text-[#F1F5F9]">only public page</strong> —
          no login required, so you can share it with your team or send a link to someone who just needs
          to browse leads.
        </p>

        <h3 className="text-lg font-semibold text-[#F1F5F9] mb-2">📤 Two Import Methods</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="dark-card p-4">
            <h4 className="font-semibold text-[#10B981] mb-2">📄 Import CSV</h4>
            <p className="text-[#94A3B8] text-sm">
              Upload any <code className="text-[#F1F5F9] bg-[#0F1117] px-1 rounded">.csv</code> file.
              Growth Radar parses it and stores every row as a lead. Name your batch so you
              can find it later.
            </p>
          </div>
          <div className="dark-card p-4">
            <h4 className="font-semibold text-[#818CF8] mb-2">📥 Import from LeadScraper</h4>
            <p className="text-[#94A3B8] text-sm">
              Fetches all enriched groups from your LeadScraper account automatically.
              Each group becomes a batch. If you&apos;ve already synced, use
              <strong className="text-[#F1F5F9]"> Re-import</strong> to refresh data.
            </p>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-[#F1F5F9] mb-2">📂 Batch Management</h3>
        <p className="text-[#94A3B8] mb-3">
          Every import creates a <strong className="text-[#F1F5F9]">batch</strong>. Batches are shown in
          collapsible sections — expand one to see all its leads.
        </p>

        <div className="dark-card p-4 mb-3">
          <h3 className="font-semibold text-[#F1F5F9] mb-3">🔍 Filters &amp; Tools</h3>
          <ul className="space-y-2 text-[#94A3B8]">
            <li>
              <strong className="text-[#F1F5F9]">🔎 Search bar</strong> — filter leads across all batches by name or city
            </li>
            <li>
              <strong className="text-[#F1F5F9]">📁 Batch filter</strong> — dropdown to show leads from one batch at a time
            </li>
            <li>
              <strong className="text-[#F1F5F9]">🏙️ City filter</strong> — filter all leads by city
            </li>
            <li>
              <strong className="text-[#F1F5F9]">🎚️ Min score slider</strong> — hide low-scoring leads, focus on hot ones
            </li>
            <li>
              <strong className="text-[#F1F5F9]">↕️ Sortable columns</strong> — click any header to sort
            </li>
          </ul>
        </div>

        <div className="dark-card p-4 mb-3">
          <h3 className="font-semibold text-[#F1F5F9] mb-2">🗑️ Deleting Leads</h3>
          <ul className="space-y-2 text-[#94A3B8]">
            <li>
              <strong className="text-[#EF4444]">🗑️</strong> button on any row — deletes that single lead
            </li>
            <li>
              <strong className="text-[#EF4444]">🗑️ List</strong> button on a batch header — deletes the <em>entire</em> batch and all its leads
            </li>
            <li>
              The detail modal also has a <strong className="text-[#EF4444]">🗑️ Delete</strong> button
            </li>
          </ul>
        </div>

        <div className="dark-card p-4">
          <h3 className="font-semibold text-[#F1F5F9] mb-2">🔎 Lead Detail Modal</h3>
          <p className="text-[#94A3B8]">
            Click any lead row to open a detail modal. It shows the business name, address, phone,
            website, enriched contact info (phone &amp; email from LeadScraper), categories, and
            sources. A <strong className="text-[#10B981]">Google Search</strong> link lets you research
            the company. The <strong className="text-[#EF4444]">🗑️ Delete</strong> button is right there too.
          </p>
        </div>
      </section>

      {/* ---- KANBAN ---- */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">📌 Kanban Boards</h2>
        <p className="text-[#94A3B8] mb-3">
          Two kanban boards let you track your sales pipeline visually. Drag and drop leads between
          columns to update their status instantly.
        </p>

        <div className="dark-card p-4 mb-4 text-center">
          <p className="text-[#F1F5F9] font-semibold text-lg">
            🆕 New  →  📞 Contacted  →  ✅ Qualified  →  💰 Converted  →  ❌ Dismissed
          </p>
          <div className="flex justify-center gap-3 mt-3">
            <span className="status-badge status-new"><span className="status-dot status-dot-new" /> New</span>
            <span className="status-badge status-contacted"><span className="status-dot status-dot-contacted" /> Contacted</span>
            <span className="status-badge status-qualified"><span className="status-dot status-dot-qualified" /> Qualified</span>
            <span className="status-badge status-converted"><span className="status-dot status-dot-converted" /> Converted</span>
            <span className="status-badge status-dismissed"><span className="status-dot status-dot-dismissed" /> Dismissed</span>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-[#F1F5F9] mb-2">📋 Kanban — Permits</h3>
        <div className="dark-card p-4 mb-4">
          <ul className="space-y-2 text-[#94A3B8]">
            <li>🧩 Cards show <strong className="text-[#F1F5F9]">business name</strong>, <strong className="text-[#F1F5F9]">city</strong>, and <strong className="text-[#F1F5F9]">score badge</strong></li>
            <li>🏙️ <strong className="text-[#F1F5F9]">Territory filter pills</strong> — click a territory to show only its leads</li>
            <li>🖱️ Click any card to open the detail modal with full info + Google Search</li>
            <li>💾 Status is saved per user in the database — switch devices and your pipeline is still there</li>
          </ul>
        </div>

        <h3 className="text-lg font-semibold text-[#F1F5F9] mb-2">📥 Kanban — Imported</h3>
        <div className="dark-card p-4">
          <ul className="space-y-2 text-[#94A3B8]">
            <li>🧩 Same drag-and-drop pipeline: New → Contacted → Qualified → Converted → Dismissed</li>
            <li>📁 <strong className="text-[#F1F5F9]">Batch/list filter pills</strong> — pick one import batch to focus on</li>
            <li>🖱️ Click any card to see full details + Google Search</li>
            <li>💾 Status persists per user across logins and devices — your pipeline follows you</li>
          </ul>
        </div>
      </section>

      {/* ---- TERRITORIES ---- */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">🏙️ Territories</h2>
        <p className="text-[#94A3B8] mb-3">
          A <strong className="text-[#F1F5F9]">territory</strong> is a city or geographic area you choose to scan
          for municipal permits. Each scan finds new construction and commercial renovation leads in that area.
        </p>

        <div className="dark-card p-4 mb-3">
          <h3 className="font-semibold text-[#F1F5F9] mb-3">➕ Creating a Territory</h3>
          <ol className="list-decimal list-inside space-y-2 text-[#94A3B8]">
            <li>Go to <strong className="text-[#F1F5F9]">Territories</strong> and click <strong className="text-[#10B981]">Add Territory</strong></li>
            <li>Give it a name (e.g. &ldquo;Toronto Downtown&rdquo;)</li>
            <li>Enter the <strong className="text-[#F1F5F9]">city</strong> and <strong className="text-[#F1F5F9]">province</strong></li>
            <li>Set the <strong className="text-[#F1F5F9]">search radius</strong> (km from city centre)</li>
            <li>Click <strong className="text-[#10B981]">Save</strong> — it&apos;s ready to scan</li>
          </ol>
        </div>

        <div className="dark-card p-4 mb-3">
          <h3 className="font-semibold text-[#F1F5F9] mb-3">🔄 Running Ingestion</h3>
          <p className="text-[#94A3B8]">
            Click <strong className="text-[#10B981]">Run Ingestion</strong> on any territory to start scanning
            permit data immediately. New leads will appear in <strong className="text-[#F1F5F9]">Leads — Permits</strong>
            once the scan completes. You can also toggle a territory <strong className="text-[#F1F5F9]">Active / Inactive</strong>
            to include or exclude it from automatic scans.
          </p>
        </div>

        <div className="dark-card p-4">
          <h3 className="font-semibold text-[#F1F5F9] mb-3">📊 Territory Stats</h3>
          <p className="text-[#94A3B8]">
            Each territory card shows its key numbers at a glance: total leads found, hot leads (score ≥ 70),
            and the average HVAC score across all leads in that area.
          </p>
        </div>
      </section>

      {/* ---- DAILY BRIEF ---- */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">📰 Daily Brief</h2>
        <p className="text-[#94A3B8] mb-3">
          Wake up to a concise AI-written summary of what&apos;s happening across your territories.
        </p>

        <div className="dark-card p-4 mb-3">
          <h3 className="font-semibold text-[#F1F5F9] mb-3">⏰ Auto-Generation</h3>
          <p className="text-[#94A3B8]">
            Growth Radar automatically generates a Daily Brief every day at <strong className="text-[#F1F5F9]">6 AM</strong>.
            It scans all active territories, scores every new lead, and writes a summary.
          </p>
        </div>

        <div className="dark-card p-4 mb-3">
          <h3 className="font-semibold text-[#F1F5F9] mb-3">⚡ Manual Generation</h3>
          <p className="text-[#94A3B8]">
            Click <strong className="text-[#10B981]">Generate Brief</strong> to create one on demand anytime.
            Useful after adding a new territory or importing a big batch of leads.
          </p>
        </div>

        <div className="dark-card p-4">
          <h3 className="font-semibold text-[#F1F5F9] mb-3">📋 What&apos;s In a Brief</h3>
          <ul className="space-y-2 text-[#94A3B8]">
            <li>📄 Per-territory summary — what&apos;s new and noteworthy</li>
            <li>🔥 <strong className="text-[#10B981]">Top leads</strong> section — your highest-scoring prospects, clickable to see details</li>
            <li>🕐 Timestamp showing when the brief was last generated</li>
            <li>📊 Stats per territory: total leads, average score, and hot lead count</li>
          </ul>
        </div>
      </section>

      {/* ---- SCORING ---- */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">⭐ Scoring</h2>
        <p className="text-[#94A3B8] mb-3">
          Every lead gets an <strong className="text-[#F1F5F9]">HVAC score</strong> from 0 to 100 that tells you
          how likely they are to need commercial HVAC services. The score is calculated from the business type,
          keywords in their description, and company size.
        </p>

        <div className="dark-card overflow-hidden mb-4">
          <table className="dark-table">
            <thead>
              <tr>
                <th>Score Range</th>
                <th>Rating</th>
                <th>Color</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <span className="score-badge score-high">≥ 70</span>
                </td>
                <td className="text-[#F1F5F9] font-semibold">🔥 Hot</td>
                <td className="text-[#10B981]"><span className="text-[#10B981]">●</span> Green</td>
                <td className="text-[#94A3B8]"><strong className="text-[#F1F5F9]">Call today</strong> — high HVAC potential</td>
              </tr>
              <tr>
                <td>
                  <span className="score-badge score-mid">40–69</span>
                </td>
                <td className="text-[#F1F5F9] font-semibold">🟡 Warm</td>
                <td className="text-[#F59E0B]"><span className="text-[#F59E0B]">●</span> Amber</td>
                <td className="text-[#94A3B8]"><strong className="text-[#F1F5F9]">Follow up soon</strong> — moderate potential</td>
              </tr>
              <tr>
                <td>
                  <span className="score-badge score-low">&lt; 40</span>
                </td>
                <td className="text-[#F1F5F9] font-semibold">⚪ Cool</td>
                <td className="text-[#64748B]"><span className="text-[#64748B]">●</span> Slate</td>
                <td className="text-[#94A3B8]"><strong className="text-[#F1F5F9]">Check when you have time</strong> — low priority</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="dark-card p-4">
          <h3 className="font-semibold text-[#F1F5F9] mb-2">📊 Scoring Factors</h3>
          <ul className="space-y-1 text-[#94A3B8]">
            <li>🏢 <strong className="text-[#F1F5F9]">Business type</strong> — restaurants, hotels, offices, retail, industrial</li>
            <li>🔑 <strong className="text-[#F1F5F9]">Keywords</strong> — mentions of HVAC, cooling, heating, ventilation, renovation</li>
            <li>📐 <strong className="text-[#F1F5F9]">Company size</strong> — larger spaces typically need more HVAC</li>
          </ul>
        </div>
      </section>

      {/* ---- GETTING STARTED ---- */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">🎯 Getting Started Checklist</h2>
        <div className="dark-card-gradient p-5 border-[rgba(16,185,129,0.2)] border">
          <ul className="space-y-3 text-[#94A3B8]">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[rgba(16,185,129,0.15)] text-[#10B981] flex items-center justify-center flex-shrink-0 text-sm font-bold">1</span>
              <span><strong className="text-[#F1F5F9]">Log in</strong> with credentials from your admin</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[rgba(16,185,129,0.15)] text-[#10B981] flex items-center justify-center flex-shrink-0 text-sm font-bold">2</span>
              <span><strong className="text-[#F1F5F9]">Check the Dashboard</strong> — get oriented, see your stats</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[rgba(16,185,129,0.15)] text-[#10B981] flex items-center justify-center flex-shrink-0 text-sm font-bold">3</span>
              <span><strong className="text-[#F1F5F9]">Set up a territory</strong> — pick a city, name it, run ingestion</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[rgba(16,185,129,0.15)] text-[#10B981] flex items-center justify-center flex-shrink-0 text-sm font-bold">4</span>
              <span><strong className="text-[#F1F5F9]">Browse permit leads</strong> — search, filter, sort, click to see details</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[rgba(16,185,129,0.15)] text-[#10B981] flex items-center justify-center flex-shrink-0 text-sm font-bold">5</span>
              <span><strong className="text-[#F1F5F9]">Import leads</strong> — upload a CSV or pull from LeadScraper</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[rgba(16,185,129,0.15)] text-[#10B981] flex items-center justify-center flex-shrink-0 text-sm font-bold">6</span>
              <span><strong className="text-[#F1F5F9]">Use the Kanban boards</strong> — drag leads through your pipeline</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[rgba(16,185,129,0.15)] text-[#10B981] flex items-center justify-center flex-shrink-0 text-sm font-bold">7</span>
              <span><strong className="text-[#F1F5F9]">Read the Daily Brief</strong> every morning — know your top leads instantly</span>
            </li>
          </ul>
          <div className="mt-4 pt-4 border-t border-[rgba(148,163,184,0.1)]">
            <p className="text-[#F1F5F9] text-center">
              🚀 That&apos;s it. You&apos;re ready to grow.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
