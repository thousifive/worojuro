import {
  Body, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from '@react-email/components';
import type { JobMatch } from '@/types';
import { formatSalary, getWoroBadgeTier, WORO_BADGE_LABELS } from '@/types';

interface MatchAlertEmailProps {
  match: JobMatch;
  appUrl: string;
}

export function MatchAlertEmail({ match, appUrl }: MatchAlertEmailProps) {
  const tier = getWoroBadgeTier(match.woro_score);
  const woroLabel = tier ? WORO_BADGE_LABELS[tier] : null;

  return (
    <Html>
      <Head />
      <Preview>New match: {match.title} at {match.company} — {match.match_score}% fit</Preview>
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '24px 0' }}>
          <Heading style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0 0 16px' }}>
            New job match for you
          </Heading>

          <Section style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px' }}>
            <Text style={{ fontWeight: '700', fontSize: '16px', color: '#111827', margin: '0 0 4px' }}>
              {match.title}
            </Text>
            <Text style={{ fontSize: '14px', color: '#4b5563', margin: '0 0 16px' }}>
              {match.company}{match.location ? ` · ${match.location}` : ''}
            </Text>

            <Text style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 4px' }}>
              <strong style={{ color: '#2563eb' }}>Match score: {match.match_score}%</strong>
            </Text>

            {match.woro_score !== null && (
              <Text style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 4px' }}>
                Woro score:{' '}
                <strong style={{
                  color: tier === 'green' ? '#16a34a' : tier === 'amber' ? '#d97706' : '#dc2626',
                }}>
                  {match.woro_score} ({woroLabel})
                </strong>
              </Text>
            )}

            {(match.salary_min || match.salary_max) && (
              <Text style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 16px' }}>
                Salary: {formatSalary(match.salary_min, match.salary_max, match.salary_currency ?? 'USD')}
              </Text>
            )}

            {match.match_breakdown?.explanation && (
              <Text style={{ fontSize: '13px', color: '#6b7280', backgroundColor: '#f3f4f6', padding: '12px', borderRadius: '8px', margin: '0 0 16px' }}>
                {match.match_breakdown.explanation}
              </Text>
            )}

            <Link
              href={`${appUrl}/dashboard/feed`}
              style={{ backgroundColor: '#2563eb', color: '#ffffff', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', textDecoration: 'none', display: 'inline-block' }}
            >
              View job →
            </Link>
          </Section>

          <Text style={{ fontSize: '12px', color: '#9ca3af', marginTop: '24px', textAlign: 'center' }}>
            Worojuro ·{' '}
            <Link href={`${appUrl}/dashboard/settings`} style={{ color: '#6b7280' }}>
              Manage alerts
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default MatchAlertEmail;
