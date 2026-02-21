export default function TermsOfService() {
  return (
    <div className="min-h-screen px-6 py-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-sm text-purple-300 mb-2 tracking-wide">
            PrismPlay
          </div>
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
            Terms of Service
          </h1>
          <p className="text-gray-300 mt-4 text-lg">
            These terms govern access to PrismPlay and the games we provide.
          </p>
        </div>

        <div className="space-y-6 text-gray-200">
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-3">
              Account Responsibilities
            </h2>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>
                Keep your login credentials secure and do not share your account.
              </li>
              <li>
                You are responsible for activity that occurs under your account.
              </li>
              <li>
                Provide accurate information so we can keep your profile and
                rankings consistent.
              </li>
            </ul>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-3">
              Fair Play and Community Rules
            </h2>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>Do not cheat, exploit, or manipulate matchmaking systems.</li>
              <li>Respect other players in chat and social features.</li>
              <li>
                Avoid disruptive behavior, harassment, or abusive content.
              </li>
            </ul>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-3">
              Service Availability
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              PrismPlay may be updated, improved, or temporarily unavailable for
              maintenance. We aim to keep the experience stable but do not
              guarantee uninterrupted access.
            </p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-3">
              Content and Intellectual Property
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              The games, visuals, and platform elements are owned by PrismPlay
              or its licensors. You may not copy, distribute, or resell any
              portion of the service without permission.
            </p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-3">
              Termination
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              We may suspend or terminate accounts that violate these terms or
              harm the community. You may stop using PrismPlay at any time.
            </p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-3">
              Contact
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              Questions about these terms? Email us at
              <span className="text-purple-300"> support@prismplay.app</span>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
