import React from 'react';
import { ArrowLeft, ShieldCheck, Mail, Phone, Clock, FileText, RefreshCw, HelpCircle } from 'lucide-react';

export default function LegalPolicies({ policyType = 'privacy', onBack }) {
  const policies = {
    privacy: {
      title: 'Privacy Policy',
      lastUpdated: 'November 20, 2026',
      content: (
        <div className="space-y-6 text-sm text-slate-600 leading-relaxed">
          <p>
            At <strong>Printo Technologies</strong> (&quot;Printo&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), available at{' '}
            <a href="https://www.getprinto.in" className="text-[#b84b00] underline">https://www.getprinto.in</a>, we are committed to protecting the privacy of store owners, cyber cafes, and their end customers.
          </p>

          <div>
            <h3 className="text-base font-bold text-slate-900 mb-2">1. 100% Zero-Storage Document Privacy</h3>
            <p>
              When end-customers scan a shop&apos;s counter QR code and upload documents, photos, or identity cards (Aadhaar, PAN, Voter ID), these files are processed strictly in-memory or in transient encrypted temporary storage for the sole purpose of dispatching to the shopkeeper&apos;s local print spooler.
            </p>
            <p className="mt-2 font-semibold text-slate-800">
              All uploaded files are permanently destroyed and auto-purged from both cloud servers and local systems 30 seconds after the print job completes. We do not store, view, index, or share customer documents under any circumstances.
            </p>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 mb-2">2. Information We Collect from Store Owners</h3>
            <p>To enable automated printing and subscription accounts, we collect:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Store name, owner contact name, and registered 10-digit mobile number.</li>
              <li>Store UPI VPA handle (e.g. your Paytm/PhonePe QR VPA) to receive customer print payments directly.</li>
              <li>Configured print rates and printer diagnostic status (online/offline).</li>
            </ul>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 mb-2">3. Direct Customer-to-Store Settlements</h3>
            <p>
              Customer payments for printouts are made directly to the store owner&apos;s personal or business UPI handle. Printo does not collect, withhold, or manage customer print revenues.
            </p>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 mb-2">4. Data Security &amp; Encryption</h3>
            <p>
              All traffic between the browser, cloud servers, and local print agents is encrypted end-to-end using TLS 1.3 / HTTPS. We adhere to industry best practices to prevent unauthorized access or disclosure.
            </p>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 mb-2">5. Contact Information</h3>
            <p>
              If you have any questions or data requests regarding this Privacy Policy, please contact us at{' '}
              <a href="mailto:support@getprinto.in" className="text-[#b84b00] font-semibold underline">support@getprinto.in</a>.
            </p>
          </div>
        </div>
      )
    },
    terms: {
      title: 'Terms & Conditions',
      lastUpdated: 'November 20, 2026',
      content: (
        <div className="space-y-6 text-sm text-slate-600 leading-relaxed">
          <p>
            Welcome to <strong>Printo</strong>. By accessing or using our website at{' '}
            <a href="https://www.getprinto.in" className="text-[#b84b00] underline">https://www.getprinto.in</a> or installing the Printo desktop print agent, you agree to be bound by these Terms and Conditions.
          </p>

          <div>
            <h3 className="text-base font-bold text-slate-900 mb-2">1. Nature of the Service</h3>
            <p>
              Printo provides software-as-a-service (SaaS) that connects customers&apos; smartphones with local print shop printers via counter QR codes and Windows print drivers.
            </p>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 mb-2">2. User Accounts &amp; Merchant Responsibility</h3>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Store owners are solely responsible for keeping their registered credentials and agent authorization keys secure.</li>
              <li>Store owners are responsible for maintaining their own physical printing hardware, paper, and ink supplies.</li>
              <li>Store owners must ensure they do not print counterfeit currency, classified government intelligence, or unlawful copyrighted materials.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 mb-2">3. Subscription Plans &amp; Billing</h3>
            <p>
              Printo offers a Free Starter Tier, Monthly Pro (₹49/month), and Yearly Pro (₹499/year). Subscriptions are billed in Indian Rupees (INR) and grant access to unlimited automated prints and advanced auto-merge features.
            </p>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 mb-2">4. Service Availability &amp; Disclaimer</h3>
            <p>
              While we strive for 99.9% cloud uptime, Printo is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. We are not liable for physical printer hardware jams, local network dropouts, or electric power failures at the store location.
            </p>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 mb-2">5. Governing Law</h3>
            <p>
              These terms shall be governed by and construed in accordance with the laws of India. Any disputes arising shall be subject to the exclusive jurisdiction of the courts of India.
            </p>
          </div>
        </div>
      )
    },
    refund: {
      title: 'Refund & Cancellation Policy',
      lastUpdated: 'November 20, 2026',
      content: (
        <div className="space-y-6 text-sm text-slate-600 leading-relaxed">
          <p>
            At <strong>Printo Technologies</strong>, customer and merchant satisfaction is our highest priority. This policy outlines our cancellation and refund guidelines for SaaS subscriptions.
          </p>

          <div>
            <h3 className="text-base font-bold text-slate-900 mb-2">1. 7-Day Money-Back Guarantee</h3>
            <p>
              If you purchase a <strong>Monthly Pro (₹49)</strong> or <strong>Yearly Pro (₹499)</strong> subscription and encounter persistent technical issues that our support team cannot resolve within 7 days of activation, you are entitled to a 100% full refund with no questions asked.
            </p>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 mb-2">2. Subscription Cancellation</h3>
            <p>
              Store owners can cancel their recurring subscription at any time directly from the Shopkeeper Dashboard. Upon cancellation, your Pro plan will remain active until the end of the current billing cycle, with zero future auto-debits.
            </p>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 mb-2">3. Instant Digital Service Delivery</h3>
            <p>
              Printo is a cloud software service. Upon successful payment, your account, standee posters, and software features are activated instantly with zero shipping delays or physical courier requirements.
            </p>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 mb-2">4. How to Request a Refund</h3>
            <p>
              To request a refund, simply email{' '}
              <a href="mailto:support@getprinto.in" className="text-[#b84b00] font-semibold underline">support@getprinto.in</a>{' '}
              with your registered mobile number and transaction ID. Approved refunds are credited back to your original payment method (Bank Account / UPI / Card) within <strong>5 to 7 business days</strong>.
            </p>
          </div>
        </div>
      )
    },
    contact: {
      title: 'Contact Us',
      lastUpdated: 'November 20, 2026',
      content: (
        <div className="space-y-6 text-sm text-slate-600 leading-relaxed">
          <p>
            Have a question, need printer setup assistance, or want to partner with Printo? Our engineering and support team is here to help!
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-[#b84b00] flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Official Email Support</h4>
              <p className="text-xs text-slate-600">For inquiries, billing, and technical assistance:</p>
              <a href="mailto:support@getprinto.in" className="text-sm font-bold text-[#b84b00] block hover:underline">
                support@getprinto.in
              </a>
            </div>

            <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Phone className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Merchant Helpline &amp; WhatsApp</h4>
              <p className="text-xs text-slate-600">Direct phone &amp; WhatsApp assistance for shops:</p>
              <a href="tel:+916299446452" className="text-sm font-bold text-emerald-700 block hover:underline">
                +91 6299446452
              </a>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Clock className="w-4 h-4 text-[#b84b00]" />
              <span>Operational Hours &amp; Entity Information</span>
            </div>
            <p className="text-xs text-slate-600">
              <strong>Entity Name:</strong> Printo Technologies<br />
              <strong>Operating Country:</strong> India<br />
              <strong>Support Hours:</strong> Monday – Saturday, 9:00 AM – 8:00 PM IST (Urgent printer spools monitored 24x7).
            </p>
          </div>
        </div>
      )
    }
  };

  const current = policies[policyType] || policies.privacy;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 flex justify-center items-start">
      <div className="max-w-3xl w-full bg-white rounded-3xl border border-slate-200/80 shadow-xl p-6 sm:p-10 space-y-6">
        
        {/* Top Header & Back Button */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack || (() => window.location.href = '/')}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              aria-label="Back to home"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{current.title}</h1>
              <span className="text-xs text-slate-400">Last updated: {current.lastUpdated}</span>
            </div>
          </div>
          <img src="/printo-logo-transparent.png" alt="Printo" className="h-8 w-auto hidden sm:block object-contain" />
        </div>

        {/* Content Body */}
        <div className="py-2">
          {current.content}
        </div>

        {/* Footer Navigation between policies */}
        <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <a href="/privacy" className="hover:text-[#b84b00] underline">Privacy Policy</a>
            <span>•</span>
            <a href="/terms" className="hover:text-[#b84b00] underline">Terms &amp; Conditions</a>
            <span>•</span>
            <a href="/refund" className="hover:text-[#b84b00] underline">Refund Policy</a>
            <span>•</span>
            <a href="/contact" className="hover:text-[#b84b00] underline">Contact Us</a>
          </div>
          <span>© 2026 Printo Technologies</span>
        </div>

      </div>
    </div>
  );
}
