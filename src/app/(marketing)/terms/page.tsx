import type { Metadata } from 'next'
import { LegalPageLayout } from '@/components/marketing/legal-page-layout'

const sections = [
  {
    title: 'Acceptance of Terms',
    content: [
      'By accessing or using Agency Beats\'s platform and services, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing our services.',
      'We reserve the right to modify these terms at any time. Your continued use of the platform after any modifications indicates your acceptance of the updated terms.',
    ],
  },
  {
    title: 'Account Registration',
    content: [
      'To access certain features of our platform, you must register for an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate, current, and complete.',
      'You are responsible for safeguarding the password you use to access the platform and for any activities or actions under your account. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.',
    ],
  },
  {
    title: 'Subscription and Billing',
    content: [
      'Agency Beats offers various subscription plans. By selecting a plan, you agree to pay the applicable fees as described at the time of purchase. Subscription fees are billed in advance on a monthly or annual basis, depending on your chosen plan.',
      'All fees are non-refundable except as expressly set forth in these terms or as required by applicable law. We reserve the right to change our pricing at any time, with at least 30 days\' notice before any price increase takes effect on your account.',
      'If your payment method fails or your account is past due, we may suspend or terminate your access to the platform. You remain responsible for any outstanding amounts owed.',
    ],
  },
  {
    title: 'Permitted Use',
    content: [
      'You may use our platform only for lawful purposes and in accordance with these terms. You agree not to use the platform in any way that violates any applicable law or regulation, or to engage in any conduct that restricts or inhibits anyone\'s use of the platform.',
      'You agree not to: (a) attempt to gain unauthorized access to the platform or its related systems; (b) use automated scripts or bots to access the platform; (c) interfere with or disrupt the integrity or performance of the platform; (d) reverse engineer, decompile, or disassemble any aspect of the platform.',
    ],
  },
  {
    title: 'Intellectual Property',
    content: [
      'The platform and its original content, features, and functionality are owned by Agency Beats and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.',
      'Your content remains yours. By uploading content to the platform, you grant Agency Beats a non-exclusive, worldwide, royalty-free license to use, store, and process your content solely as necessary to provide and improve our services.',
    ],
  },
  {
    title: 'Data Processing',
    content: [
      'We process your data in accordance with our Privacy Policy. By using the platform, you consent to such processing and you warrant that all data provided by you is accurate.',
      'For customers subject to GDPR or similar data protection regulations, we will enter into a Data Processing Agreement (DPA) upon request, which governs the processing of personal data on your behalf.',
    ],
  },
  {
    title: 'Service Availability',
    content: [
      'We strive to maintain 99.9% uptime for our platform. However, we do not guarantee uninterrupted, secure, or error-free operation of the platform. We may perform scheduled maintenance with reasonable advance notice.',
      'We shall not be liable for any interruptions to the service, whether planned or unplanned, including those caused by force majeure events, third-party service failures, or circumstances beyond our reasonable control.',
    ],
  },
  {
    title: 'Limitation of Liability',
    content: [
      'To the maximum extent permitted by applicable law, Agency Beats shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, use, or goodwill, arising out of or in connection with your use of the platform.',
      'In no event shall our total liability to you for all claims arising out of or relating to the use of the platform exceed the amount you have paid to Agency Beats in the twelve (12) months preceding the claim.',
    ],
  },
  {
    title: 'Termination',
    content: [
      'You may terminate your account at any time by contacting us or through your account settings. Upon termination, your right to use the platform will immediately cease.',
      'We may terminate or suspend your account and access to the platform immediately, without prior notice, if you breach these Terms of Service. Upon termination, we will provide you an opportunity to export your data for a period of 30 days.',
    ],
  },
  {
    title: 'Governing Law',
    content: [
      'These terms shall be governed by and construed in accordance with the laws of the Arab Republic of Egypt, without regard to its conflict of law provisions. Any disputes arising from these terms shall be resolved through binding arbitration in Cairo, Egypt.',
    ],
  },
]

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms governing your use of Agency Beats.',
  alternates: { canonical: '/terms' },
}

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="Terms of Service"
      lastUpdated="March 1, 2026"
      intro="Welcome to Agency Beats. These Terms of Service govern your access to and use of our platform, products, and services. By using Agency Beats, you agree to comply with and be bound by the following terms and conditions."
      sections={sections}
    />
  )
}
