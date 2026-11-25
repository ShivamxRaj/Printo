import React from 'react';
import { Mail, ShieldCheck, FileText, RefreshCw, MapPin, Clock } from 'lucide-react';

export default function LegalPage({ type = 'terms', onBack }) {
  const configs = {
    terms: {
      title: 'Terms & Conditions',
      icon: FileText,
      updated: 'November 26, 2026',
      sections: [
        {
          heading: '1. Acceptance of Terms',
          body: 'By accessing or using Printo (https://getprinto.in), including our self-service customer printing portal and shopkeeper dashboard, you agree to be bound by these Terms & Conditions.'
        },
        {
          heading: '2. Service Description',
          body: 'Printo provides a cloud-based self-service document printing platform connecting walk-in customers with local print shops and cyber cafes. Customers upload documents, select print preferences (Black & White, Color, Single/Double-sided, ID Card merge), and pay in Indian Rupees (INR ₹) at rates displayed on the shop page.'
        },
        {
          heading: '3. Pricing & Payments',
          body: 'All print prices are calculated transparently in INR (₹) prior to checkout based on page count, color mode, and shop rates. Payments are processed securely through UPI and authorized payment gateway partners.'
        },
        {
          heading: '4. User Responsibilities',
          body: 'Customers are solely responsible for the legality and copyright compliance of the documents uploaded for printing. Uploading malicious files, executable scripts disguised as documents, or illegal material is strictly prohibited.'
        },
        {
          heading: '5. Governing Law',
          body: 'These terms are governed by the laws of India. Any disputes arising from the use of Printo shall be subject to the jurisdiction of Indian courts.'
        }
      ]
    },
    privacy: {
      title: 'Privacy Policy',
      icon: ShieldCheck,
      updated: 'November 26, 2026',
      sections: [
        {
          heading: '1. Zero-Storage Document Guarantee',
          body: 'We treat your personal documents (such as Aadhaar cards, resumes, and certificates) with the highest level of privacy. Uploaded files are temporarily stored only to spool to the designated shop printer and are automatically purged from disk after printing.'
        },
        {
          heading: '2. Information We Collect',
          body: 'For customers, we collect only the uploaded document (temporarily) and order metadata (page count, amount, pickup PIN). For print shop owners, we collect shop name, owner name, contact phone number, and settlement UPI / bank details.'
        },
        {
          heading: '3. Payment Security',
          body: 'Printo does not store your UPI PIN, credit/debit card numbers, or banking passwords. All financial transactions are processed securely via PCI-DSS compliant payment gateway partners and NPCI UPI rails.'
        },
        {
          heading: '4. Data Sharing',
          body: 'We never sell, rent, or trade your personal information or uploaded documents to third-party marketers.'
        }
      ]
    },
    refund: {
      title: 'Refund & Cancellation Policy',
      icon: RefreshCw,
      updated: 'November 26, 2026',
      sections: [
        {
          heading: '1. Cancellation Policy',
          body: 'Since print jobs are processed instantaneously upon payment confirmation, orders cannot be cancelled once the document has been dispatched to the shop printer.'
        },
        {
          heading: '2. Eligibility for Refund',
          body: 'A full refund will be issued if: (a) your payment was successfully debited, but the print job failed due to a printer offline error, hardware jam, or software failure, and no physical print was delivered; or (b) duplicate payment was charged for the same order.'
        },
        {
          heading: '3. Refund Processing Timeline',
          body: 'Approved refunds are processed within 5 to 7 business days and credited directly back to the original payment method (UPI / Bank Account / Card).'
        },
        {
          heading: '4. How to Request a Refund',
          body: 'Please email support@getprinto.in with your 4-digit Order PIN, Transaction ID, and shop name. Our support team will resolve your request within 24 hours.'
        }
      ]
    },
    contact: {
      title: 'Contact Us',
      icon: Mail,
      updated: 'November 26, 2026',
      sections: [
        {
          heading: 'Customer & Merchant Support',
          body: 'Have questions about an order, refund, or setting up Printo at your print shop? Reach out to our team directly and we will respond promptly.'
        }
      ]
    }
  };

  const active = configs[type] || configs.terms;
  const Icon = active.icon;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" onClick={(e) => { if (onBack) { e.preventDefault(); onBack(); } }} className="flex items-center gap-2">
            <img src="/printo-logo-transparent.png" alt="Printo" className="h-8 w-auto object-contain" />
          </a>
          <button
            onClick={() => onBack ? onBack() : (window.location.href = '/')}
            className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-[#b84b00] transition-colors cursor-pointer"
          >
            <span>Back to Home</span>
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-8 sm:p-10 space-y-8">
          <div className="border-b border-slate-100 pb-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-[#b84b00] shrink-0">
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{active.title}</h1>
              <p className="text-xs text-slate-500 mt-1">Last updated: {active.updated} • Printo (getprinto.in)</p>
            </div>
          </div>

          <div className="space-y-6">
            {active.sections.map((sec, idx) => (
              <div key={idx} className="space-y-2">
                <h2 className="text-base font-bold text-slate-900">{sec.heading}</h2>
                <p className="text-sm text-slate-600 leading-relaxed">{sec.body}</p>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200/80 space-y-3 text-sm">
            <h3 className="font-bold text-slate-900">Official Contact Details</h3>
            <div className="flex items-center gap-2.5 text-slate-600">
              <Mail className="w-4 h-4 text-[#b84b00] shrink-0" />
              <span>Email: <a href="mailto:support@getprinto.in" className="text-[#b84b00] font-semibold hover:underline">support@getprinto.in</a></span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-600">
              <Clock className="w-4 h-4 text-[#b84b00] shrink-0" />
              <span>Support Hours: Monday – Saturday, 9:00 AM – 8:00 PM IST</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-600">
              <MapPin className="w-4 h-4 text-[#b84b00] shrink-0" />
              <span>Operations: India (https://getprinto.in)</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

