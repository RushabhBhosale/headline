export default function ContactPage() {
  return (
    <main className="prose max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Contact</h1>
      <p className="text-zinc-600 mb-4">
        We'd love to hear from you. Please reach out via our social channels or
        email.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div>
          <h2 className="font-medium mb-3">Email</h2>
          <p className="text-zinc-500">rushabhbhosale25757@gmail.com</p>
        </div>
        <div>
          <h2 className="font-medium mb-3">Phone</h2>
          <p className="text-zinc-500">+91-9137996317</p>
        </div>
        {/* <div>
          <h2 className="font-medium mb-3">Follow Us</h2>
          <ul className="list-disc list-inside text-zinc-600 space-y-2">
            <li>Twitter</li>
            <li>Facebook</li>
            <li>LinkedIn</li>
          </ul>
        </div> */}
      </div>
    </main>
  );
}
