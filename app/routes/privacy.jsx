export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <header>
          <h1 className="text-2xl font-bold">Privacy Policy</h1>
          <p className="mt-2 text-sm text-gray-600">Last updated: 2025-01-01</p>
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Summary</h2>
          <p className="text-sm text-gray-700">
            This policy explains what data Gifty collects, how it is used, and
            how merchants and customers can request changes or deletion.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Data We Collect</h2>
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-2">
            <li>Shop and merchant account identifiers from Shopify.</li>
            <li>Campaign configuration and selected products.</li>
            <li>Claim form details submitted by recipients.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">How We Use Data</h2>
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-2">
            <li>To create and manage gifting campaigns.</li>
            <li>To generate draft orders and track fulfillment status.</li>
            <li>To provide customer support and resolve issues.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Data Retention</h2>
          <p className="text-sm text-gray-700">
            We retain data only for as long as needed to operate the app and
            comply with legal obligations. You can request deletion at any time.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Contact</h2>
          <p className="text-sm text-gray-700">
            For questions or data requests, email support@gifty.app.
          </p>
        </section>
      </div>
    </div>
  );
}
