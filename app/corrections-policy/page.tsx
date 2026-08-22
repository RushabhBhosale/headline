export default function CorrectionsPolicyPage() {
  return (
    <main className="prose max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Corrections Policy</h1>
      <p className="text-zinc-600 mb-4">
        We are committed to accuracy and transparency in our reporting.
      </p>
      <ul className="list-disc list-inside text-zinc-500 space-y-4">
        <li>
          <strong>Prompt Corrections:</strong> We issue corrections promptly when errors are identified.
        </li>
        <li>
          <strong>Visibility:</strong> Corrections are displayed prominently at the article level.
        </li>
        <li>
          <strong>Transparency:</strong> We note the original error and the correction made.
        </li>
      </ul>
    </main>
  );
}