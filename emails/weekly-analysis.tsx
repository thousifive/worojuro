import {
  Body, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from '@react-email/components';
import type { MarketSignal } from '@/types';

interface WeeklyAnalysisEmailProps {
  signal: MarketSignal;
  appUrl: string;
}

const SIGNAL_EMOJI: Record<string, string> = {
  switch_now: '🟢',
  wait: '🟡',
  market_hot: '🔥',
  market_cold: '🧊',
};

export function WeeklyAnalysisEmail({ signal, appUrl }: WeeklyAnalysisEmailProps) {
  const emoji = SIGNAL_EMOJI[signal.signal_type] ?? '📊';

  return (
    <Html>
      <Head />
      <Preview>Your weekly job market signal: {signal.signal_type.replace('_', ' ')} {emoji}</Preview>
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '24px 0' }}>
          <Heading style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0 0 4px' }}>
            Weekly market signal {emoji}
          </Heading>
          <Text style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 20px' }}>
            Powered by Worojuro AI
          </Text>

          <Section style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px' }}>
            <Text style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: '0 0 12px', textTransform: 'capitalize' }}>
              {signal.signal_type.replace('_', ' ')} {emoji}
            </Text>
            <Text style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.6', margin: 0 }}>
              {signal.analysis}
            </Text>
          </Section>

          <Section style={{ marginTop: '16px' }}>
            <Link
              href={`${appUrl}/dashboard/analysis`}
              style={{ backgroundColor: '#111827', color: '#ffffff', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', textDecoration: 'none', display: 'inline-block' }}
            >
              Full analysis →
            </Link>
          </Section>

          <Text style={{ fontSize: '12px', color: '#9ca3af', marginTop: '24px', textAlign: 'center' }}>
            Worojuro ·{' '}
            <Link href={`${appUrl}/dashboard/settings`} style={{ color: '#6b7280' }}>
              Manage emails
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default WeeklyAnalysisEmail;
