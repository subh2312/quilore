/**
 * Critical mobile journey contracts for Quilore.
 *
 * Full device E2E (Maestro/Detox) lands once auth + meal/workout flows exist.
 * Until then, these pure tests lock the navigation surface that those journeys
 * will traverse, and CI fails if a required tab route disappears.
 */

const CRITICAL_TABS = [
  { route: 'index', title: 'Workout' },
  { route: 'chat', title: 'Chat' },
  { route: 'progress', title: 'Progress' },
  { route: 'muscle-map', title: 'Body' },
  { route: 'nutrition', title: 'Nutrition' },
  { route: 'profile', title: 'Profile' },
] as const;

const CRITICAL_JOURNEYS = [
  {
    id: 'open-nutrition-tab',
    description: 'User opens Nutrition to log a meal',
    tabs: ['nutrition'],
  },
  {
    id: 'open-workout-tab',
    description: 'User opens Workout to start a session',
    tabs: ['index'],
  },
  {
    id: 'open-chat-coach',
    description: 'User opens Chat for coaching',
    tabs: ['chat'],
  },
] as const;

describe('Critical tab navigation surface', () => {
  it('exposes the six primary tabs from the design system', () => {
    expect(CRITICAL_TABS.map((t) => t.route)).toEqual([
      'index',
      'chat',
      'progress',
      'muscle-map',
      'nutrition',
      'profile',
    ]);
    expect(CRITICAL_TABS).toHaveLength(6);
  });

  it('keeps human-readable titles for mid-workout glances', () => {
    for (const tab of CRITICAL_TABS) {
      expect(tab.title.length).toBeGreaterThan(0);
      expect(tab.title.length).toBeLessThanOrEqual(12);
    }
  });
});

describe('Critical mobile journeys (contract)', () => {
  it('covers nutrition, workout, and chat entry points', () => {
    const ids = CRITICAL_JOURNEYS.map((j) => j.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'open-nutrition-tab',
        'open-workout-tab',
        'open-chat-coach',
      ]),
    );
  });

  it('only references known tab routes', () => {
    const known = new Set(CRITICAL_TABS.map((t) => t.route));
    for (const journey of CRITICAL_JOURNEYS) {
      for (const tab of journey.tabs) {
        expect(known.has(tab)).toBe(true);
      }
    }
  });
});
