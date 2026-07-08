'use client';

export default function DocsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="page-breadcrumb mb-2">
        Docs
      </div>
      <h1 className="text-2xl font-bold text-[#F1F5F9] mb-6">Growth Radar — User Guide</h1>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">What is Growth Radar?</h2>
        <p className="text-[#94A3B8] leading-relaxed">
          Growth Radar automatically finds commercial HVAC leads for you by scanning public permit data from cities like Vancouver, Coquitlam, and Burnaby. Instead of cold calling or driving around looking for construction signs, you get a steady stream of qualified leads delivered to your dashboard.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">Territories — Your Service Areas</h2>
        <p className="text-[#94A3B8] leading-relaxed mb-3">
          A territory is a city or area you want to scan for new business. You give it a name, set the city and province, and choose a search radius.
        </p>
        <p className="text-[#F1F5F9] font-semibold mb-2">To add a territory:</p>
        <ul className="list-disc list-inside text-[#94A3B8] space-y-1 mb-3">
          <li>Go to <strong className="text-[#F1F5F9]">Territories</strong> and click <strong className="text-[#10B981]">Add Territory</strong></li>
          <li>Name it (e.g. "Vancouver Downtown")</li>
          <li>Enter the city and province</li>
          <li>Set a search radius in kilometers</li>
          <li>Click <strong className="text-[#10B981]">Run Ingestion</strong> to scan immediately, or wait for the daily scan</li>
        </ul>
        <p className="text-[#94A3B8]">
          Once added, click a territory to see all the leads found in that area.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">Leads — Your Prospect List</h2>
        <p className="text-[#94A3B8] leading-relaxed mb-3">
          Every new business permit discovered becomes a lead. You'll see the business name, phone, email, permit fee, number of employees, and a <strong className="text-[#F1F5F9]">score</strong> telling you how promising it is.
        </p>
        <p className="text-[#F1F5F9] font-semibold mb-2">Working with leads:</p>
        <ul className="list-disc list-inside text-[#94A3B8] space-y-1">
          <li>Sort any column by clicking its header</li>
          <li>Filter by status, permit type, or minimum score</li>
          <li>Click a business name to view full details</li>
          <li>Drag leads through the Kanban board to update status</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">Scoring — How We Rank Leads</h2>
        <p className="text-[#94A3B8] leading-relaxed mb-3">
          Each lead gets a score from 0 to 100 based on keywords, the type of permit, and company size.
        </p>
        <div className="dark-card p-4 mb-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(148,163,184,0.1)]">
                <th className="text-left py-2 text-[#64748B] font-semibold">Score</th>
                <th className="text-left py-2 text-[#64748B] font-semibold">Rating</th>
                <th className="text-left py-2 text-[#64748B] font-semibold">What it means</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[rgba(148,163,184,0.06)]">
                <td className="py-2 text-[#10B981] font-bold">70 or higher</td>
                <td className="py-2 text-[#F1F5F9]">Hot 🔥</td>
                <td className="py-2 text-[#94A3B8]">High priority — call today</td>
              </tr>
              <tr className="border-b border-[rgba(148,163,184,0.06)]">
                <td className="py-2 text-[#F59E0B] font-bold">40–69</td>
                <td className="py-2 text-[#F1F5F9]">Warm</td>
                <td className="py-2 text-[#94A3B8]">Good prospect — follow up soon</td>
              </tr>
              <tr>
                <td className="py-2 text-[#64748B] font-bold">Below 40</td>
                <td className="py-2 text-[#F1F5F9]">Cool</td>
                <td className="py-2 text-[#94A3B8]">Low priority — check when you have time</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[#94A3B8]">
          Hot leads appear on your Dashboard so you always see your best opportunities first.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">Daily Brief — Your Morning Summary</h2>
        <p className="text-[#94A3B8] leading-relaxed mb-3">
          Every day at 6 AM, Growth Radar automatically:
        </p>
        <ol className="list-decimal list-inside text-[#94A3B8] space-y-1 mb-3">
          <li>Scans all your territories for new permits</li>
          <li>Scores every new lead</li>
          <li>Generates a <strong className="text-[#F1F5F9]">Daily Brief</strong> — a short AI-written summary for each territory</li>
        </ol>
        <p className="text-[#94A3B8]">
          Read your Daily Brief each morning to see what's new without digging through the full leads table.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">Kanban Board — Track Your Progress</h2>
        <p className="text-[#94A3B8] leading-relaxed mb-3">
          The Kanban Board lets you drag leads through your sales pipeline:
        </p>
        <p className="text-[#10B981] font-semibold mb-3 text-center">
          New → Contacted → Qualified → Converted → Dismissed
        </p>
        <p className="text-[#94A3B8] leading-relaxed mb-3">
          Each team member has their own board. You only see your leads, and your colleagues see theirs. Everyone tracks their own progress without stepping on each other's toes.
        </p>
        <p className="text-[#F1F5F9] font-semibold mb-2">To use the Kanban:</p>
        <ul className="list-disc list-inside text-[#94A3B8] space-y-1">
          <li>Drag a lead card from one column to another to update its status</li>
          <li>Click a card to see lead details</li>
          <li>Use it as your daily to-do list</li>
        </ul>
      </section>

      <div className="dark-card p-6 border-[rgba(16,185,129,0.2)] border">
        <p className="text-[#F1F5F9] font-semibold mb-1">Getting started</p>
        <p className="text-[#94A3B8]">
          Log in at <a href="https://growth-radar.212.227.153.56.sslip.io" className="text-[#10B981] hover:underline">growth-radar.212.227.153.56.sslip.io</a>, add your first territory, and let Growth Radar find your next commercial HVAC customer.
        </p>
      </div>
    </div>
  );
}
