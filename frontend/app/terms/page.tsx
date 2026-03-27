"use client";

import Link from "next/link";
import { TrendingUp, ArrowLeft } from "lucide-react";

const LAST_UPDATED = "March 27, 2026";

export default function TermsPage() {
  return (
    <div
      className="min-h-screen px-4 py-12"
      style={{ backgroundColor: "var(--bg-base)" }}
    >
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 mb-6 text-sm transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            <ArrowLeft size={14} />
            Back to home
          </Link>

          <div className="flex items-center gap-2.5 mb-4">
            <div className="relative">
              <TrendingUp size={22} style={{ color: "var(--accent-green)" }} />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full" style={{ backgroundColor: "var(--accent-green)" }} />
            </div>
            <span
              className="font-mono text-sm font-medium tracking-[0.2em]"
              style={{ color: "var(--text-primary)" }}
            >
              STOCKMIND
            </span>
          </div>

          <h1
            className="text-2xl font-semibold mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            Terms of Service
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Last updated: {LAST_UPDATED}
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8">
          <Section title="1. Acceptance of Terms">
            <p>
              By accessing or using the StockMind platform ("Service"), you agree to be bound by these
              Terms of Service ("Terms"). If you do not agree to all of these Terms, you must not access
              or use the Service. These Terms constitute a legally binding agreement between you ("User")
              and StockMind ("we", "us", or "our").
            </p>
            <p>
              We reserve the right to modify these Terms at any time. Material changes will be communicated
              via the email address associated with your account or through a prominent notice on the Service.
              Your continued use of the Service after such modifications constitutes acceptance of the updated Terms.
            </p>
          </Section>

          <Section title="2. Eligibility">
            <p>
              You must be at least 18 years of age or the age of legal majority in your jurisdiction,
              whichever is greater, to create an account and use the Service. By registering, you represent
              and warrant that you meet this age requirement and that all registration information you
              provide is accurate, current, and complete.
            </p>
            <p>
              Accounts registered by automated means (bots, scripts, or other programmatic methods) are
              prohibited and will be terminated without notice.
            </p>
          </Section>

          <Section title="3. Nature of the Service">
            <p>
              StockMind is a financial data aggregation and analysis platform that provides market data,
              technical indicators, machine learning predictions, community discussion features, and
              portfolio tracking tools. The Service integrates third-party data sources and user-supplied
              API keys to deliver its functionality.
            </p>
            <p>
              <strong>The Service does not provide financial advice, investment recommendations, or
              portfolio management services.</strong> All data, analysis, predictions, and information
              presented through the Service are for informational and educational purposes only. No
              content on the Service should be construed as a solicitation, recommendation, endorsement,
              or offer to buy or sell any securities, cryptocurrencies, or other financial instruments.
            </p>
          </Section>

          <Section title="4. No Financial Advice Disclaimer">
            <p>
              You acknowledge and agree that:
            </p>
            <ul>
              <li>
                All information provided by the Service, including but not limited to stock quotes,
                technical analysis, machine learning predictions, and community discussions, is
                presented "as-is" and is not intended as financial, investment, tax, or legal advice.
              </li>
              <li>
                Machine learning models and algorithmic predictions are inherently uncertain and may
                produce inaccurate, incomplete, or misleading results. Past performance of any model
                or indicator does not guarantee future results.
              </li>
              <li>
                You are solely responsible for your own investment decisions. You should consult with
                a qualified financial advisor before making any investment decisions.
              </li>
              <li>
                We do not guarantee the accuracy, completeness, timeliness, or reliability of any
                data, analysis, or prediction provided through the Service.
              </li>
              <li>
                Financial markets involve substantial risk of loss. You may lose some or all of your
                invested capital.
              </li>
            </ul>
          </Section>

          <Section title="5. User Accounts and Security">
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and
              for all activities that occur under your account. You agree to immediately notify us of
              any unauthorized use of your account or any other breach of security.
            </p>
            <p>
              We implement industry-standard security measures to protect your data, but we cannot
              guarantee absolute security. You acknowledge that no method of electronic transmission
              or storage is 100% secure, and you accept the inherent risks of providing information
              online.
            </p>
            <p>
              We reserve the right to suspend or terminate your account at our sole discretion if we
              suspect unauthorized use, violation of these Terms, or any activity that may harm the
              Service or other users.
            </p>
          </Section>

          <Section title="6. API Keys and Third-Party Services">
            <p>
              Certain features of the Service require you to provide your own API keys from third-party
              providers (e.g., OpenAI, Google, Anthropic, xAI). By supplying these keys, you acknowledge
              that:
            </p>
            <ul>
              <li>
                You are solely responsible for the security, usage, and associated costs of your API keys.
              </li>
              <li>
                API keys are stored in your browser session and are transmitted to our servers only to
                proxy requests on your behalf. We do not permanently store your API keys on our servers.
              </li>
              <li>
                Your use of third-party services through the platform is subject to those providers'
                respective terms of service and privacy policies.
              </li>
              <li>
                We are not responsible for any charges, data processing, or actions taken by third-party
                API providers in connection with your keys.
              </li>
            </ul>
          </Section>

          <Section title="7. Community Features and User Content">
            <p>
              The Service includes community features such as chat rooms and discussion spaces. By
              participating, you agree to the following:
            </p>
            <ul>
              <li>
                You will not post content that is unlawful, defamatory, harassing, threatening,
                obscene, fraudulent, or otherwise objectionable.
              </li>
              <li>
                You will not impersonate any person or entity, or falsely represent your affiliation
                with any person or entity.
              </li>
              <li>
                You will not post spam, promotional content, or solicitations.
              </li>
              <li>
                You will not share specific investment advice or "stock tips" that could be construed
                as a recommendation to buy or sell securities.
              </li>
              <li>
                You will not engage in market manipulation, including but not limited to coordinated
                pump-and-dump schemes, spreading false information to influence prices, or any other
                activity prohibited by securities laws.
              </li>
              <li>
                Community messages are automatically deleted every 24 hours. We do not guarantee the
                availability or persistence of any user-generated content.
              </li>
            </ul>
            <p>
              We reserve the right to remove any content and suspend or terminate accounts that
              violate these guidelines, at our sole discretion and without prior notice.
            </p>
          </Section>

          <Section title="8. Portfolio Tracking">
            <p>
              The portfolio tracking feature allows you to manually record and monitor your holdings.
              You acknowledge that:
            </p>
            <ul>
              <li>
                Portfolio data is stored in your account and relies on third-party market data feeds
                for pricing. We do not guarantee the accuracy or timeliness of price data.
              </li>
              <li>
                Currency conversion rates are approximate and sourced from third-party providers.
                Actual exchange rates may differ.
              </li>
              <li>
                The portfolio feature is a tracking tool only. It does not connect to brokerage
                accounts and does not execute trades.
              </li>
              <li>
                Performance metrics, profit/loss calculations, and allocation percentages are
                estimates and should not be relied upon for tax reporting or financial planning.
              </li>
            </ul>
          </Section>

          <Section title="9. Intellectual Property">
            <p>
              The Service, including its design, code, features, logos, and documentation, is owned
              by StockMind and is protected by intellectual property laws. You are granted a limited,
              non-exclusive, non-transferable, revocable license to access and use the Service for
              personal, non-commercial purposes in accordance with these Terms.
            </p>
            <p>
              You may not copy, modify, distribute, sell, lease, reverse-engineer, or create
              derivative works based on the Service or any part thereof without our prior written
              consent.
            </p>
          </Section>

          <Section title="10. Data Privacy and Collection">
            <p>
              We collect and process personal data in accordance with applicable data protection laws.
              The types of data we collect include:
            </p>
            <ul>
              <li>
                <strong>Account data:</strong> email address, authentication credentials (managed by
                Supabase Auth), and profile information you choose to provide.
              </li>
              <li>
                <strong>Usage data:</strong> portfolio holdings, watchlists, chat messages, and
                interaction patterns with the Service.
              </li>
              <li>
                <strong>Technical data:</strong> browser type, device information, and IP address
                for security and analytics purposes.
              </li>
            </ul>
            <p>
              We do not sell your personal data to third parties. Data is processed for the sole
              purpose of providing and improving the Service. You may request deletion of your
              account and associated data at any time by contacting us.
            </p>
          </Section>

          <Section title="11. Limitation of Liability">
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, STOCKMIND AND ITS OFFICERS,
              DIRECTORS, EMPLOYEES, AGENTS, AND AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT,
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED
              TO LOSS OF PROFITS, DATA, INVESTMENTS, OR GOODWILL, ARISING OUT OF OR IN CONNECTION
              WITH YOUR USE OF THE SERVICE.
            </p>
            <p>
              IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR
              RELATING TO THE SERVICE EXCEED THE AMOUNT YOU HAVE PAID US IN THE TWELVE (12) MONTHS
              PRECEDING THE CLAIM, OR ONE HUNDRED US DOLLARS ($100), WHICHEVER IS GREATER.
            </p>
            <p>
              YOU EXPRESSLY ACKNOWLEDGE THAT INVESTMENT DECISIONS CARRY INHERENT RISK AND THAT WE
              SHALL BEAR NO LIABILITY FOR ANY FINANCIAL LOSSES YOU INCUR AS A RESULT OF ACTIONS
              TAKEN BASED ON INFORMATION PROVIDED THROUGH THE SERVICE.
            </p>
          </Section>

          <Section title="12. Indemnification">
            <p>
              You agree to indemnify, defend, and hold harmless StockMind and its officers, directors,
              employees, agents, and affiliates from and against any and all claims, damages,
              obligations, losses, liabilities, costs, and expenses (including reasonable attorneys'
              fees) arising from: (a) your use of the Service; (b) your violation of these Terms;
              (c) your violation of any third-party rights, including intellectual property or privacy
              rights; or (d) any content you post or share through the Service.
            </p>
          </Section>

          <Section title="13. Termination">
            <p>
              We may terminate or suspend your access to the Service immediately, without prior notice
              or liability, for any reason, including without limitation if you breach these Terms.
              Upon termination, your right to use the Service will immediately cease.
            </p>
            <p>
              You may terminate your account at any time by contacting us. Upon termination, we will
              make reasonable efforts to delete your data within 30 days, except where retention is
              required by law.
            </p>
            <p>
              Sections 4 (No Financial Advice), 11 (Limitation of Liability), 12 (Indemnification),
              and 14 (Governing Law) shall survive any termination of these Terms.
            </p>
          </Section>

          <Section title="14. Governing Law and Dispute Resolution">
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the
              jurisdiction in which StockMind operates, without regard to its conflict of law provisions.
            </p>
            <p>
              Any dispute arising out of or relating to these Terms or the Service shall first be
              attempted to be resolved through good-faith negotiation. If the dispute cannot be resolved
              within 30 days, either party may pursue resolution through binding arbitration in
              accordance with the rules of the applicable arbitration authority in the governing
              jurisdiction.
            </p>
            <p>
              You agree that any arbitration shall be conducted on an individual basis and not as a
              class action, collective action, or representative proceeding.
            </p>
          </Section>

          <div
            className="rounded-xl p-6 mt-10"
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border)",
            }}
          >
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              By creating an account on StockMind, you acknowledge that you have read, understood,
              and agree to be bound by these Terms of Service. If you have questions about these
              Terms, contact us at{" "}
              <span style={{ color: "var(--accent-blue)" }}>support@stockmind.app</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2
        className="text-base font-semibold mb-3"
        style={{ color: "var(--text-primary)" }}
      >
        {title}
      </h2>
      <div
        className="space-y-3 text-sm leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_strong]:font-semibold"
        style={{ color: "var(--text-secondary)" }}
      >
        {children}
      </div>
    </section>
  );
}
