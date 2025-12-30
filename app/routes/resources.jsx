export default function Resources() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <header>
          <h1 className="text-2xl font-bold">Resources</h1>
          <p className="mt-2 text-sm text-gray-600">
            Helpful links and guides for using Gifty.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Getting Started</h2>
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-2">
            <li>Creating your first campaign</li>
            <li>Selecting products and limits</li>
            <li>Sharing a claim link</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">FAQs</h2>
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-2">
            <li>Why does a claim show as pending?</li>
            <li>How do I edit a campaign after publishing?</li>
            <li>How are draft orders created?</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Support</h2>
          <p className="text-sm text-gray-700">
            Need help? Email support@gifty.app and we will respond within one
            business day.
          </p>
        </section>
      </div>
    </div>
  );
}
