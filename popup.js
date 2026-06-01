const ENV_MAP = {
  staging: 'https://staging-pull-requests.clickup.com',
  qa: 'https://pull-requests.clickup.com'
};

const ENV_DETECT = [
  { pattern: /staging-pull-requests\.clickup\.com/, name: 'Staging', key: 'staging' },
  { pattern: /pull-requests\.clickup\.com/, name: 'QA', key: 'qa' },
  { pattern: /\.clickup\.com/, name: 'Production', key: 'prod' }
];

document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || '';

  const currentEnvEl = document.getElementById('currentEnv');
  let detected = ENV_DETECT.find(e => e.pattern.test(url));
  if (detected) {
    currentEnvEl.textContent = `Currently on: ${detected.name}`;
    const buildMatch = url.match(/pull-requests\.clickup\.com\/(\d+)/);
    if (buildMatch) {
      currentEnvEl.textContent += ` (build ${buildMatch[1]})`;
      document.getElementById('buildNum').value = buildMatch[1];
    }
  } else {
    currentEnvEl.textContent = 'Not on a ClickUp domain';
  }

  chrome.storage.local.get(['lastEnv', 'lastBuild'], (data) => {
    if (data.lastEnv) document.getElementById('env').value = data.lastEnv;
    if (data.lastBuild && !document.getElementById('buildNum').value) {
      document.getElementById('buildNum').value = data.lastBuild;
    }
  });

  document.getElementById('go').addEventListener('click', () => {
    const env = document.getElementById('env').value;
    const buildNum = document.getElementById('buildNum').value.trim();
    const preservePath = document.getElementById('preservePath').checked;

    if (!buildNum) {
      alert('Enter a build/PR number.');
      return;
    }

    let newUrl = `${ENV_MAP[env]}/${buildNum}`;

    if (preservePath && tab?.url) {
      try {
        const parsed = new URL(tab.url);
        let path = parsed.pathname.replace(/^\/\d+/, '');
        if (path && path !== '/') newUrl += path;
        if (parsed.search) newUrl += parsed.search;
        if (parsed.hash) newUrl += parsed.hash;
      } catch (e) {}
    }

    if (!newUrl.endsWith('/')) newUrl += '/';

    chrome.storage.local.set({ lastEnv: env, lastBuild: buildNum });
    chrome.tabs.update(tab.id, { url: newUrl });
    window.close();
  });
});
