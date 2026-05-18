const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await page.goto('http://localhost:3077/planner', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Wait for layout to be rendered
  await page.locator('[data-view="top"]').waitFor({ timeout: 10000 });

  // Screenshot top view
  await page.locator('[data-view="top"]').screenshot({ path: '/tmp/screenshot-top.png' });
  console.log('Top view screenshot saved');

  // Switch to front view
  await page.getByRole('button', { name: 'Front' }).click();
  await page.waitForTimeout(500);
  await page.locator('[data-view="front"]').screenshot({ path: '/tmp/screenshot-front.png' });
  console.log('Front view screenshot saved');

  // Switch to side view
  await page.getByRole('button', { name: 'Side' }).click();
  await page.waitForTimeout(500);
  await page.locator('[data-view="side"]').screenshot({ path: '/tmp/screenshot-side.png' });
  console.log('Side view screenshot saved');

  await browser.close();
  console.log('Done');
})();
