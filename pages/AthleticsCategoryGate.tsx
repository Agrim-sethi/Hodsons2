import React from 'react';
import Athletics from './Athletics';

const EXCLUSIVE_EVENT_NAMES = new Set(['3000m', 'Triple Jump', 'Javelin Throw']);
const CATEGORY_NAMES = ['PD U11', 'PD U12', 'GD U13', 'GD U14', 'GD U16', 'GD Opens', 'BD U13', 'BD U14', 'BD U16', 'BD Opens'];

const normalize = (value: string | null | undefined) => (value || '').replace(/\s+/g, ' ').trim();

const findActiveCategory = () => {
  const buttons = Array.from(document.querySelectorAll('button'));
  return CATEGORY_NAMES.find(category => buttons.some(button => {
    const text = normalize(button.textContent);
    return text.startsWith(`${category} `) && /\d+ students$/i.test(text) && button.className.includes('bg-primary/10');
  })) || 'PD U11';
};

const updateAthleticsEventVisibility = () => {
  const activeCategory = findActiveCategory();
  const showExclusiveEvents = activeCategory === 'BD Opens';
  const allButtons = Array.from(document.querySelectorAll('button'));

  allButtons.forEach(button => {
    const eventName = normalize(button.querySelector('h3')?.textContent);
    if (!EXCLUSIVE_EVENT_NAMES.has(eventName)) return;

    const isEventCard = button.className.includes('glass-panel') && button.className.includes('group');
    if (!isEventCard) return;

    button.style.display = showExclusiveEvents ? '' : 'none';
  });

  const stats = [
    ['Events', showExclusiveEvents ? '12' : '9'],
    ['Track Events', showExclusiveEvents ? '6' : '5'],
    ['Field Events', showExclusiveEvents ? '6' : '4']
  ];

  document.querySelectorAll('div.glass-panel').forEach(panel => {
    const label = normalize(panel.querySelector('div.text-\\[10px\\]')?.textContent);
    const stat = stats.find(([name]) => name === label);
    if (!stat) return;
    const valueNode = panel.querySelector('div.text-3xl');
    if (valueNode) valueNode.textContent = stat[1];
  });

  const summary = Array.from(document.querySelectorAll('*')).find(element => normalize(element.textContent) === '6 Track • 6 Field • 12 total');
  if (summary) summary.textContent = showExclusiveEvents ? '6 Track • 6 Field • 12 total' : '5 Track • 4 Field • 9 total';
};

const AthleticsCategoryGate: React.FC = () => {
  React.useEffect(() => {
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateAthleticsEventVisibility);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return <Athletics />;
};

export default AthleticsCategoryGate;
