import { LeadCaptureForm } from '@/components/LeadCaptureForm';
import { ReserveACallForm } from '@/components/ReserveACallForm';

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              RhProject
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Family Financial Ledger
            </p>
          </div>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Take control of your family finances
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Automated tracking, secure access, and real-time updates — all in one place.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              {/* Feature 1 */}
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-xl font-semibold leading-7 text-gray-900">
                  <svg
                    className="h-5 w-5 flex-none text-blue-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Automated Tracking
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">
                    Never miss a transaction. Our system automatically tracks and categorizes all
                    your family expenses and income.
                  </p>
                </dd>
              </div>

              {/* Feature 2 */}
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-xl font-semibold leading-7 text-gray-900">
                  <svg
                    className="h-5 w-5 flex-none text-blue-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Secure Access
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">
                    Your financial data is protected with enterprise-grade security. Access your
                    information anytime, anywhere.
                  </p>
                </dd>
              </div>

              {/* Feature 3 */}
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-xl font-semibold leading-7 text-gray-900">
                  <svg
                    className="h-5 w-5 flex-none text-blue-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Real-Time Updates
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">
                    See your financial picture update in real-time. Make informed decisions with
                    the latest information at your fingertips.
                  </p>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* CTA + Lead Capture Section */}
      <section className="py-16 sm:py-24 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Get Early Access
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Be among the first to experience RhProject. Sign up for early access and help us
              shape the future of family financial management.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-xl">
            <LeadCaptureForm />
          </div>
        </div>
      </section>

      {/* Reserve a Call Section */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Reserve a Call
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Want to talk it through? Pick a time and we&apos;ll give you a call to discuss
              your family&apos;s needs, curriculum options, and next steps.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-xl sm:mt-20 lg:mt-24 lg:max-w-none lg:grid lg:grid-cols-2 lg:gap-12">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">What to expect</h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start gap-3">
                  <svg className="h-5 w-5 flex-none text-blue-600 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                  <span>15-minute introductory call — no commitment</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="h-5 w-5 flex-none text-blue-600 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                  <span>Personalized curriculum and pricing guidance</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="h-5 w-5 flex-none text-blue-600 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                  <span>Answer all your questions about Redhouse</span>
                </li>
              </ul>
            </div>
            <div>
              <ReserveACallForm />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-8">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <p className="text-center text-sm leading-6 text-gray-500">
            &copy; {new Date().getFullYear()} RhProject. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
