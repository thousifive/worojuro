import {
  Body, Container, Head, Heading, Hr, Html, Link,
  Preview, Section, Text, Row, Column,
} from '@react-email/components';
import type { JobMatch } from '@/types';
import { formatSalary, getWoroBadgeTier } from '@/types';

interface DailyDigestEmailProps {
  matches: JobMatch[];
  appUrl: string;
}

export function DailyDigestEmail({ matches, appUrl }: DailyDigestEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{matches.length} new job matches — your Worojuro morning digest</Preview>
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '24px 0' }}>
          <Heading style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: '0 0 4px' }}>
            Good morning ☀️
          </Heading>
          <Text style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 24px' }}>
            {matches.length} job {matches.length === 1 ? 'match' : 'matches'} tailored to your profile
          </Text>

          {matches.map((match) => {
            const tier = getWoroBadgeTier(match.woro_score);
            const woroColor = tier === 'green' ? '#16a34a' : tier === 'amber' ? '#d97706' : '#dc2626';

            return (
              <Section key={match.id} style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px', marginBottom: '12px' }}>
                <Row>
                  <Column>
                    <Text style={{ fontWeight: '600', fontSize: '14px', color: '#111827', margin: '0 0 2px' }}>
                      {match.title}
                    </Text>
                    <Text style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 8px' }}>
                      {match.company}{match.location ? ` · ${match.location}` : ''}
                    </Text>
                    <Row>
                      <Column>
                        <Text style={{ fontSize: '12px', fontWeight: '600', color: '#2563eb', margin: 0 }}>
                          Match: {match.match_score}%
                        </Text>
                      </Column>
                      {match.woro_score !== null && (
                        <Column>
                          <Text style={{ fontSize: '12px', fontWeight: '600', color: woroColor, margin: 0, paddingLeft: '12px' }}>
                            Woro: {match.woro_score}
                          </Text>
                        </Column>
                      )}
                    </Row>
                  </Column>
                </Row>
                <Link href={`${appUrl}/dashboard/feed`} style={{ fontSize: '13px', color: '#2563eb', marginTop: '8px', display: 'block' }}>
                  View in Worojuro →
                </Link>
              </Section>
            );
          })}

          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
          <Text style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>
            Worojuro · woro (alert) + juro (trust) ·{' '}
            <Link href={`${appUrl}/dashboard/settings`} style={{ color: '#6b7280' }}>
              Manage notifications
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default DailyDigestEmail;
