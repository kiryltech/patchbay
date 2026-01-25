import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Create a promise that resolves when the 'Application Initialized' message is logged
    const appInitializedPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout waiting for '[Main] Application Initialized' message."));
      }, 25000); // 25 second timeout

      page.on('console', msg => {
        if (msg.text() === '[Main] Application Initialized') {
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    // Navigate to the live preview URL
    await page.goto('http://localhost:5173');

    // Wait for the application to be fully initialized
    console.log('Waiting for application to initialize...');
    await appInitializedPromise;
    console.log('Application initialized!');

    // Click the "Add Agent" button
    await page.click('#add-agent-button');

    // Wait for the modal to be visible
    await page.waitForSelector('#agent-catalog-modal:not(.hidden)');

    // Add a small delay for animations to complete
    await page.waitForTimeout(500);

    // Take a screenshot of the page
    await page.screenshot({ path: 'verification/screenshot.png' });

    console.log('Frontend verification successful: screenshot captured.');
  } catch (error) {
    console.error('Frontend verification failed:', error);
    await page.screenshot({ path: 'verification/screenshot_error.png' });
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
