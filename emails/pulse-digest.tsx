import {
  Body, Container, Head, Heading, Html, Link, Preview, Section, Text, Hr,
} from '@react-email/components';
import type { PulseItem } from '@/types';
import { relativeTime, truncate } from '@/lib/utils';

interface PulseDigestEmailProps {
  items: PulseItem[];
  appUrl: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  tech_update: 'Tech Update',
  layoff: 'Layoff',
  market_change: 'Market',
  funding: 'Funding',
  ipo: 'IPO',
};

const CATEGORY_COLOR: Record<string, string> = {
  tech_update: '#2563eb',
  layoff: '#dc2626',
  market_change: '#d97706',
  funding: '#16a34a',
  ipo: '#7c3aed',
};

export function PulseDigestEmail({ items, appUrl }: PulseDigestEmailProps) {
  const techItems = items.filter((i) => i.category === 'tech_update');
  const fundingItems = items.filter((i) => i.category === 'funding' || i.category === 'ipo');
  const layoffItems = items.filter((i) => i.category === 'layoff');
  const marketItems = items.filter((i) => i.category === 'market_change');

  return (
    <Html>
      <Head />
      <Preview>{`Market pulse: ${items.length} updates — tech, funding, layoffs`}</Preview>
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '24px 0' }}>
          <Heading style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: '0 0 4px' }}>
            Market Pulse
          </Heading>
          <Text style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 24px' }}>
            {items.length} updates from your Worojuro intelligence feed
          </Text>

          {[
            { label: 'Tech Updates', items: techItems },
            { label: 'Funding & IPOs', items: fundingItems },
            { label: 'Layoffs', items: layoffItems },
            { label: 'Market Changes', items: marketItems },
          ].filter((s) => s.items.length > 0).map((section) => (
            <Section key={section.label} style={{ marginBottom: '24px' }}>
              <Text style={{ fontSize: '13px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>
                {section.label}
              </Text>
              {section.items.slice(0, 3).map((item) => (
                <Section key={item.id} style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '14px', marginBottom: '8px' }}>
                  <Link href={item.url} style={{ fontSize: '13px', fontWeight: '600', color: '#111827', textDecoration: 'none', display: 'block', marginBottom: '6px' }}>
                    {item.title}
                  </Link>
                  {(item.summary_ai ?? item.summary_raw) && (
                    <Text style={{ fontSize: '12px', color: '#6b7280', margin: 0, lineHeight: '1.5' }}>
                      {truncate(item.summary_ai ?? item.summary_raw, 150)}
                      {item.summary_ai && (
                        <span style={{ marginLeft: '4px', backgroundColor: '#ede9fe', color: '#7c3aed', padding: '1px 4px', borderRadius: '4px', fontSize: '10px' }}>AI</span>
                      )}
                    </Text>
                  )}
                </Section>
              ))}
            </Section>
          ))}

          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
          <Text style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>
            <Link href={`${appUrl}/dashboard/pulse`} style={{ color: '#2563eb' }}>
              View full pulse →
            </Link>
            {' · '}
            <Link href={`${appUrl}/dashboard/settings`} style={{ color: '#6b7280' }}>
              Manage emails
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default PulseDigestEmail;
