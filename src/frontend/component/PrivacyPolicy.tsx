export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen px-6 py-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-sm text-purple-300 mb-2 tracking-wide">
            PrismPlay
          </div>
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 leading-tight pb-1">
            Privacy Policy
          </h1>
          <p className="text-gray-300 mt-4 text-lg">
            This policy explains how we collect, use, and protect your data
            while you play.
          </p>
        </div>

        <div className="space-y-6 text-gray-200">
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-3">
              Information We Collect
            </h2>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>
                Account details such as username, email address, and
                authentication tokens to keep your session secure.
              </li>
              <li>
                Gameplay data including match results, leaderboards,
                achievements, and room history to power competitive features.
              </li>
              <li>
                Social data such as friend relationships and chat messages so
                you can communicate and connect with other players.
              </li>
            </ul>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-3">
              How We Use Your Information
            </h2>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>
                Deliver game sessions, matchmaking, and leaderboard rankings.
              </li>
              <li>Maintain your account, profile, and saved progress.</li>
              <li>
                Enable social features, including friend requests and chat.
              </li>
              <li>
                Improve performance, balance, and security across the platform.
              </li>
            </ul>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-3">
              Sharing and Disclosure
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              We do not sell your personal information. We share data only with
              service providers that help run PrismPlay and only as required to
              deliver core features like authentication, matchmaking, and chat.
              We may also disclose information if required by law or to protect
              player safety and platform integrity.
            </p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-3">
              Data Retention
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              We retain account and gameplay data while your account is active.
            </p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-3">
              Your Choices
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              You can update profile details in your account settings. If you
              want your data removed, contact us and we will process the request
              as quickly as possible.
            </p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-3">Contact</h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              Questions about privacy? Email us at
              <span className="text-purple-300"> amine.fathi@gmail.com</span>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
