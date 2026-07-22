import { LegalPageLayout } from '@/components/marketing/legal-page-layout'

const sections = [
  {
    title: 'What Are Cookies',
    content: [
      'Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and to provide information to the owners of the site.',
      'Cookies allow a website to recognize your device and remember information about your visit, such as your preferred language, font size, and other display preferences. This can simplify the process of recording your personal information.',
    ],
  },
  {
    title: 'How We Use Cookies',
    content: [
      'Agency Beats uses cookies and similar tracking technologies to improve your experience on our platform, analyze how our services are used, and personalize content. We use both session cookies (which expire when you close your browser) and persistent cookies (which remain on your device until they expire or you delete them).',
    ],
  },
  {
    title: 'Essential Cookies',
    content: [
      'These cookies are strictly necessary for the operation of our platform. They enable core functionality such as security, authentication, session management, and accessibility. Without these cookies, the services you have requested cannot be provided.',
      'Examples include cookies that keep you logged in during your session, remember your security preferences, and enable load balancing across our servers. These cookies do not require your consent.',
    ],
  },
  {
    title: 'Analytics Cookies',
    content: [
      'We use analytics cookies to understand how visitors interact with our platform. These cookies collect information such as the number of visitors, the pages they visit, and the time spent on each page. This data helps us improve the performance and usability of our services.',
      'We use tools such as Vercel Analytics and PostHog to collect and analyze this information. All data is aggregated and anonymized where possible.',
    ],
  },
  {
    title: 'Functional Cookies',
    content: [
      'Functional cookies enable enhanced functionality and personalization on our platform. They may be set by us or by third-party providers whose services we have added to our pages.',
      'These cookies remember choices you make, such as your preferred language, region, dashboard layout, and theme settings. If you do not allow these cookies, some or all of these features may not function properly.',
    ],
  },
  {
    title: 'Marketing Cookies',
    content: [
      'Marketing cookies may be set through our site by our advertising partners. They may be used by those companies to build a profile of your interests and show you relevant advertisements on other sites.',
      'These cookies do not directly store personal information but are based on uniquely identifying your browser and internet device. If you do not allow these cookies, you will experience less targeted advertising. Agency Beats currently uses minimal marketing cookies.',
    ],
  },
  {
    title: 'Third-Party Cookies',
    content: [
      'Some cookies on our platform are placed by third-party services that appear on our pages. We do not control these cookies and they are subject to the respective third party\'s privacy policies. Third-party services we use include payment processors, analytics providers, and customer support tools.',
      'We regularly review the third-party cookies used on our platform and aim to minimize unnecessary data collection.',
    ],
  },
  {
    title: 'Managing Your Cookie Preferences',
    content: [
      'You can control and manage cookies in several ways. Most web browsers allow you to manage your cookie preferences through their settings. You can set your browser to refuse cookies or to alert you when cookies are being sent.',
      'Please note that if you disable or refuse cookies, some parts of our platform may become inaccessible or not function properly. Essential cookies cannot be disabled as they are required for the platform to function.',
      'You can also manage your preferences through our cookie consent banner, which appears when you first visit our platform. You can update your preferences at any time from the footer of our website.',
    ],
  },
  {
    title: 'Changes to This Cookie Policy',
    content: [
      'We may update this Cookie Policy from time to time to reflect changes in technology, legislation, or our data practices. Any changes will be posted on this page with an updated revision date. We encourage you to periodically review this policy to stay informed about how we use cookies.',
    ],
  },
]

export default function CookiesPage() {
  return (
    <LegalPageLayout
      title="Cookie Policy"
      lastUpdated="March 1, 2026"
      intro="This Cookie Policy explains how Agency Beats uses cookies and similar technologies to recognize you when you visit our platform. It explains what these technologies are, why we use them, and your rights to control our use of them."
      sections={sections}
    />
  )
}
