import type { Metadata } from 'next'
import { LegalPageLayout } from '@/components/marketing/legal-page-layout'

const sections = [
  {
    title: 'Information We Collect',
    content: [
      'We collect information you provide directly to us, such as when you create an account, fill out a form, make a purchase, or contact us for support. This includes your name, email address, company name, phone number, billing information, and any other information you choose to provide.',
      'We automatically collect certain information when you use our platform, including your IP address, browser type, operating system, referring URLs, pages viewed, links clicked, and the date and time of your visit. We also collect information about the device you use to access our services.',
    ],
  },
  {
    title: 'How We Use Your Information',
    content: [
      'We use the information we collect to provide, maintain, and improve our services, process transactions, send you technical notices and support messages, respond to your comments and questions, and develop new features.',
      'We may also use your information to send you marketing communications about products, services, and events offered by Agency Beats. You can opt out of receiving marketing communications at any time by following the unsubscribe instructions in those messages.',
    ],
  },
  {
    title: 'Information Sharing and Disclosure',
    content: [
      'We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy. We may share your information with third-party service providers who perform services on our behalf, such as payment processing, data analysis, email delivery, hosting services, and customer support.',
      'We may also disclose your information if required to do so by law or in response to valid requests by public authorities, or to protect the rights, property, or safety of Agency Beats, our users, or the public.',
    ],
  },
  {
    title: 'Data Security',
    content: [
      'We implement appropriate technical and organizational measures to protect the security of your personal information. This includes encryption of data in transit and at rest, regular security assessments, access controls, and secure data storage practices.',
      'While we strive to protect your personal information, no method of transmission over the Internet or method of electronic storage is completely secure. We cannot guarantee the absolute security of your data.',
    ],
  },
  {
    title: 'Data Retention',
    content: [
      'We retain your personal information for as long as your account is active or as needed to provide you services. We will retain and use your information as necessary to comply with our legal obligations, resolve disputes, and enforce our agreements.',
      'When you delete your account, we will delete or anonymize your personal data within 30 days, except where we are required to retain certain information for legal or regulatory purposes.',
    ],
  },
  {
    title: 'Your Rights and Choices',
    content: [
      'Depending on your location, you may have certain rights regarding your personal information, including the right to access, correct, delete, or port your data. You may also have the right to restrict or object to certain processing of your data.',
      'To exercise any of these rights, please contact us at legal@agencybeats.app. We will respond to your request within 30 days. You can also update your account information at any time by logging into your account settings.',
    ],
  },
  {
    title: 'International Data Transfers',
    content: [
      'Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that are different from the laws of your country. We ensure appropriate safeguards are in place to protect your data during any such transfers.',
    ],
  },
  {
    title: 'Children\'s Privacy',
    content: [
      'Our services are not directed to children under 16 years of age. We do not knowingly collect personal information from children under 16. If we become aware that we have collected personal information from a child under 16, we will take steps to delete such information promptly.',
    ],
  },
  {
    title: 'Changes to This Policy',
    content: [
      'We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last updated" date. We encourage you to review this Privacy Policy periodically for any changes.',
    ],
  },
]

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Agency Beats collects, uses, and protects your data.',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      lastUpdated="March 1, 2026"
      intro="At Agency Beats, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform and services. Please read this policy carefully to understand our practices regarding your personal data."
      sections={sections}
    />
  )
}
