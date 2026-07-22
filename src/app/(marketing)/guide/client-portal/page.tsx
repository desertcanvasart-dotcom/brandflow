import {
  Shield,
  Settings,
  Palette,
  Users,
  CheckCircle,
  MessageSquare,
  BarChart3,
  Bell,
  Video,
  Lock,
  Globe,
  Zap,
} from 'lucide-react'
import {
  ContentPageLayout,
  type ContentSection,
} from '@/components/marketing/content-page-layout'

const sections: ContentSection[] = [
  {
    title: 'What Is the Client Portal?',
    icon: Shield,
    content: [
      {
        type: 'paragraph',
        text: 'The Agency Beats Client Portal is a branded, secure space where your clients can view project progress, review and approve content, leave feedback, track performance metrics, and join meetings — all without needing access to your internal workspace.',
      },
      {
        type: 'paragraph',
        text: 'Each portal is automatically generated per brand and can be shared with any number of client stakeholders. Clients only see what you choose to expose, ensuring your internal operations stay private while keeping clients fully informed.',
      },
      {
        type: 'tip',
        variant: 'info',
        text: 'Client portal access is available on all plans. White-label customization (custom domains, logos, and colors) is available on the Agency and Enterprise plans.',
      },
    ],
  },
  {
    title: 'Setting Up a Client Portal',
    icon: Settings,
    content: [
      {
        type: 'paragraph',
        text: 'Creating a client portal takes just a few steps. Once a brand is set up in Agency Beats, you can activate its portal and invite client stakeholders immediately.',
      },
      {
        type: 'steps',
        items: [
          {
            label: 'Navigate to the Brand',
            description:
              'Open the brand you want to create a portal for from the Brands section of your dashboard.',
          },
          {
            label: 'Enable Client Portal',
            description:
              'Go to Settings > Client Portal and toggle the portal on. This generates a unique portal URL for the brand.',
          },
          {
            label: 'Configure Visibility',
            description:
              'Choose which modules are visible to clients: content calendar, deliverables, reports, meetings, and files.',
          },
          {
            label: 'Invite Client Stakeholders',
            description:
              'Add client email addresses. Each person receives a secure magic link to access the portal — no passwords needed.',
          },
        ],
      },
      {
        type: 'tip',
        variant: 'tip',
        text: 'You can preview exactly what the client will see by clicking "Preview as Client" in the portal settings. This helps you verify the experience before sending invitations.',
      },
    ],
  },
  {
    title: 'Branding & Customization',
    icon: Palette,
    content: [
      {
        type: 'paragraph',
        text: 'Every client portal can be customized to match your agency\'s or your client\'s brand identity. This creates a seamless, professional experience that reinforces trust.',
      },
      {
        type: 'list',
        items: [
          'Upload your agency logo or the client\'s logo to the portal header',
          'Set primary and accent colors to match brand guidelines',
          'Customize the portal welcome message and description',
          'Add a custom domain (e.g., portal.youragency.com) on Agency and Enterprise plans',
          'Toggle dark or light theme for the portal interface',
          'Configure email notification templates with your branding',
        ],
      },
      {
        type: 'tip',
        variant: 'info',
        text: 'White-label portals remove all Agency Beats branding, making the experience appear as your own proprietary platform to clients.',
      },
    ],
  },
  {
    title: 'Client Roles & Permissions',
    icon: Users,
    content: [
      {
        type: 'paragraph',
        text: 'Not all client stakeholders need the same level of access. Agency Beats provides granular role-based permissions so you can control exactly what each person can see and do within the portal.',
      },
      {
        type: 'list',
        items: [
          'Viewer — Can view content, reports, and project timelines but cannot take actions',
          'Reviewer — Can view content plus leave comments and feedback on deliverables',
          'Approver — Full review capabilities plus the ability to approve or request revisions on content items',
          'Admin — Full portal access including inviting other stakeholders and managing portal settings',
        ],
      },
      {
        type: 'paragraph',
        text: 'Roles are assigned per person when you send the invitation. You can change a stakeholder\'s role at any time from the portal settings without requiring them to re-authenticate.',
      },
      {
        type: 'tip',
        variant: 'warning',
        text: 'Be careful when assigning the Admin role to clients. Admins can invite additional stakeholders and modify portal-level settings. In most cases, Approver is the recommended role for primary client contacts.',
      },
    ],
  },
  {
    title: 'Content Review & Approvals',
    icon: CheckCircle,
    content: [
      {
        type: 'paragraph',
        text: 'The approval workflow is the heart of the client portal. When your team marks content as "Ready for Review," it instantly appears in the client\'s portal with all the context they need to make a decision.',
      },
      {
        type: 'paragraph',
        text: 'Clients can approve, request changes, or leave inline comments directly on the content. Every action triggers real-time notifications to your team so nothing falls through the cracks.',
      },
      {
        type: 'steps',
        items: [
          {
            label: 'Content Submitted for Review',
            description:
              'Your team moves a content item to "Ready for Review" status. The client receives an email and in-portal notification.',
          },
          {
            label: 'Client Reviews Content',
            description:
              'The client views the full content with preview, captions, hashtags, and scheduled date. They can zoom into images and preview how posts will look on each platform.',
          },
          {
            label: 'Approve or Request Changes',
            description:
              'With one click, the client either approves the content or sends it back with specific feedback. Approved content moves to your publishing queue automatically.',
          },
          {
            label: 'Revision Cycle (If Needed)',
            description:
              'If changes are requested, your team is notified instantly. After revisions, the content is resubmitted for another round of review.',
          },
        ],
      },
      {
        type: 'tip',
        variant: 'tip',
        text: 'Enable "Auto-approve after 48 hours" in portal settings for clients who prefer a passive approval approach. Content will be automatically approved if no action is taken within the configured window.',
      },
    ],
  },
  {
    title: 'Feedback & Comments',
    icon: MessageSquare,
    content: [
      {
        type: 'paragraph',
        text: 'Agency Beats supports threaded, contextual feedback directly on content items. Clients can leave general comments or attach their feedback to specific elements within a deliverable.',
      },
      {
        type: 'list',
        items: [
          'Threaded comments with replies — keep conversations organized per topic',
          'Visual annotations — clients can click on images or designs to pin feedback to exact locations',
          'Mention team members with @mentions to direct feedback to the right person',
          'Attach files to comments (briefs, reference images, brand assets)',
          'Comment status tracking — mark feedback as resolved, in progress, or open',
          'Full comment history preserved for audit trail and reference',
        ],
      },
      {
        type: 'paragraph',
        text: 'All feedback is synced back to your internal workspace in real-time. Your team sees client comments alongside internal notes, with clear labels distinguishing between the two.',
      },
    ],
  },
  {
    title: 'Performance Dashboards',
    icon: BarChart3,
    content: [
      {
        type: 'paragraph',
        text: 'Give your clients real-time visibility into campaign performance with automatically generated dashboards. No more manually building reports in spreadsheets or slide decks.',
      },
      {
        type: 'list',
        items: [
          'Overview dashboard with key metrics: reach, engagement, impressions, clicks, and conversions',
          'Platform-specific breakdowns for Instagram, Facebook, LinkedIn, TikTok, and X (Twitter)',
          'Content performance ranking — see which posts performed best by engagement rate',
          'Audience growth and demographics over time',
          'Campaign-level analytics with goal tracking and progress indicators',
          'Custom date range filtering and comparison periods',
        ],
      },
      {
        type: 'paragraph',
        text: 'Dashboards are updated automatically as new data flows in from connected social accounts. You can choose which metrics and platforms are visible to each client.',
      },
      {
        type: 'tip',
        variant: 'info',
        text: 'Clients can export dashboard data as PDF reports at any time. You can also schedule automated weekly or monthly report emails from the portal settings.',
      },
    ],
  },
  {
    title: 'Notifications & Activity Feed',
    icon: Bell,
    content: [
      {
        type: 'paragraph',
        text: 'Clients stay informed without being overwhelmed. Agency Beats sends smart notifications based on the client\'s role and the actions that matter most to them.',
      },
      {
        type: 'list',
        items: [
          'Email notifications for new content ready for review, approved content going live, and weekly performance summaries',
          'In-portal notification bell with a real-time activity feed',
          'Configurable notification preferences — clients choose what they want to be notified about',
          'Digest mode available — bundle notifications into a single daily or weekly email',
        ],
      },
      {
        type: 'paragraph',
        text: 'The activity feed provides a chronological timeline of everything happening on the brand: new content published, approvals given, comments added, and milestones reached.',
      },
    ],
  },
  {
    title: 'Meetings & Video Calls',
    icon: Video,
    content: [
      {
        type: 'paragraph',
        text: 'Clients can join scheduled meetings directly from their portal — no need for separate video call links or calendar invitations. Agency Beats\'s integrated meeting system powered by LiveKit provides a seamless experience.',
      },
      {
        type: 'list',
        items: [
          'Upcoming meetings displayed on the portal dashboard with one-click join',
          'Meeting recordings and AI-generated summaries available after each call',
          'Action items extracted from meetings are automatically linked to tasks',
          'Screen sharing and presentation mode for creative reviews',
          'Meeting transcripts searchable within the portal',
        ],
      },
      {
        type: 'tip',
        variant: 'tip',
        text: 'Use the "Schedule from Portal" feature to let clients book meetings directly from available time slots you configure, similar to Calendly but built right into the portal.',
      },
    ],
  },
  {
    title: 'Security & Access Control',
    icon: Lock,
    content: [
      {
        type: 'paragraph',
        text: 'Client portals are built with enterprise-grade security. Every interaction is encrypted, authenticated, and logged to ensure your clients\' data and your agency\'s work remain protected.',
      },
      {
        type: 'list',
        items: [
          'Passwordless magic link authentication — no credentials to manage or forget',
          'Session expiry and automatic logout after configurable idle periods',
          'IP allowlisting available on Enterprise plans for restricted network access',
          'Full audit log of all portal activity — who viewed, approved, or commented on what and when',
          'Two-factor authentication (2FA) available for Admin-role stakeholders',
          'SOC 2 Type II compliant infrastructure with data encrypted at rest and in transit',
        ],
      },
      {
        type: 'paragraph',
        text: 'You can revoke a client stakeholder\'s access instantly from the portal settings. Revoked users lose access immediately and cannot view any cached content.',
      },
    ],
  },
  {
    title: 'Portal Analytics for Your Team',
    icon: Globe,
    content: [
      {
        type: 'paragraph',
        text: 'Beyond client-facing features, Agency Beats provides your agency team with insights into how clients interact with the portal. This helps you understand engagement patterns and optimize your service delivery.',
      },
      {
        type: 'list',
        items: [
          'Track which clients are actively reviewing content and which are unresponsive',
          'See average approval turnaround time per client and per content type',
          'Monitor portal login frequency and session duration',
          'Identify bottlenecks — content items that have been pending review the longest',
          'View comment and feedback volume trends over time',
        ],
      },
      {
        type: 'tip',
        variant: 'info',
        text: 'Use portal analytics to proactively follow up with clients who haven\'t reviewed pending content. A simple "We noticed 3 items waiting for your review" email can significantly reduce approval delays.',
      },
    ],
  },
  {
    title: 'Best Practices',
    icon: Zap,
    content: [
      {
        type: 'paragraph',
        text: 'Based on feedback from thousands of agencies using Agency Beats, here are the recommended practices for getting the most value from the Client Portal.',
      },
      {
        type: 'steps',
        items: [
          {
            label: 'Onboard Clients Early',
            description:
              'Introduce the portal during your client onboarding process. Walk them through the interface so they feel comfortable from day one.',
          },
          {
            label: 'Keep Modules Focused',
            description:
              'Only enable the modules each client actually needs. Too many options can be overwhelming — start simple and expand as the relationship grows.',
          },
          {
            label: 'Set Review Expectations',
            description:
              'Clearly communicate your approval SLA. Let clients know how long they have to review content before it\'s auto-approved or the publishing window closes.',
          },
          {
            label: 'Use Visual Annotations',
            description:
              'Encourage clients to use pinned comments on visuals rather than describing feedback in text. This eliminates ambiguity and speeds up revisions.',
          },
          {
            label: 'Schedule Regular Check-Ins',
            description:
              'Use the built-in meeting scheduler to maintain a recurring touchpoint. Even with full portal transparency, face-to-face time strengthens client relationships.',
          },
        ],
      },
      {
        type: 'tip',
        variant: 'tip',
        text: 'Agencies that use the Client Portal report an average 60% reduction in email back-and-forth and 40% faster content approval cycles.',
      },
    ],
  },
]

export default function ClientPortalGuidePage() {
  return (
    <ContentPageLayout
      title="Client Portal Guide"
      badge="Guide"
      subtitle="Everything you need to set up, customize, and get the most out of the Agency Beats Client Portal for your agency and clients."
      lastUpdated="March 1, 2026"
      intro="The Client Portal is one of the most powerful features in Agency Beats. It bridges the gap between your agency and your clients by providing a single, branded space for approvals, feedback, reporting, and collaboration. This guide covers everything from initial setup to advanced best practices."
      sections={sections}
      footerContact={{
        email: 'support@agencybeats.app',
        text: 'Need help setting up your client portal? Our support team is here to assist. Reach out at',
      }}
    />
  )
}
