import { render, screen } from '@testing-library/react';

import { WelcomeBanner } from './Welcome';

const helpLinks = [
  {
    label: 'Documentation',
    href: 'https://grafana.com/docs/grafana/latest?utm_source=grafana_gettingstarted',
  },
  {
    label: 'Tutorials',
    href: 'https://grafana.com/tutorials?utm_source=grafana_gettingstarted',
  },
  {
    label: 'Community',
    href: 'https://community.grafana.com?utm_source=grafana_gettingstarted',
  },
  {
    label: 'Public Slack',
    href: 'http://slack.grafana.com?utm_source=grafana_gettingstarted',
  },
];

describe('WelcomeBanner', () => {
  it('renders the welcome heading and need help subheading', () => {
    render(<WelcomeBanner />);

    expect(screen.getByRole('heading', { level: 1, name: /welcome to grafana/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /need help\?/i })).toBeInTheDocument();
  });

  it('renders all help links with utm_source on hrefs as external links', () => {
    render(<WelcomeBanner />);

    for (const { label, href } of helpLinks) {
      const link = screen.getByRole('link', { name: label });
      expect(link).toHaveAttribute('href', href);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noreferrer');
    }

    expect(screen.getAllByRole('link')).toHaveLength(helpLinks.length);
  });
});
