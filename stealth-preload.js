// ページJS実行前に注入（contextIsolation: false で使用）
try {
  Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined,
    configurable: true
  });
} catch(e) {}

try {
  if (!window.chrome) {
    window.chrome = {
      app: { isInstalled: false },
      runtime: {},
      csi: function(){},
      loadTimes: function(){}
    };
  }
} catch(e) {}

try {
  Object.defineProperty(navigator, 'languages', {
    get: () => ['ja-JP', 'ja', 'en-US', 'en'],
    configurable: true
  });
} catch(e) {}

try {
  const orig = navigator.permissions && navigator.permissions.query
    ? navigator.permissions.query.bind(navigator.permissions) : null;
  if (orig) {
    navigator.permissions.query = (p) =>
      p.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission })
        : orig(p);
  }
} catch(e) {}
