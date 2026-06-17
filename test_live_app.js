const puppeteer = require('puppeteer');

(async () => {
  try {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    
    // Listen to console logs
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));

    console.log('Navigating to POS...');
    await page.goto('https://mrlaundry.vercel.app/', { waitUntil: 'networkidle2' });
    
    // Login
    console.log('Logging in...');
    await page.type('input[name="username"]', 'adminshahzeb');
    await page.type('input[name="password"]', 'Celine2026');
    await page.click('button[type="submit"]');
    
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('Successfully logged in. Currently on URL:', page.url());

    // Wait a second for dashboard to load
    await new Promise(r => setTimeout(r, 1000));
    
    // Go to POS
    console.log('Navigating to POS checkout...');
    await page.evaluate(() => { if (typeof app !== 'undefined') app.go('pos'); });
    await new Promise(r => setTimeout(r, 1000));
    
    // Try adding a product to cart (we will click the first product tile)
    console.log('Adding product to cart...');
    await page.evaluate(() => {
      const firstProduct = document.querySelector('.product-tile');
      if (firstProduct) firstProduct.click();
    });
    
    await new Promise(r => setTimeout(r, 500));
    
    // Click Checkout (Next -> Payment)
    console.log('Opening payment modal...');
    await page.evaluate(() => {
      const nextBtn = document.getElementById('nextBtn');
      if (nextBtn) nextBtn.click();
    });
    
    await new Promise(r => setTimeout(r, 500));
    
    // Try saving the order
    console.log('Clicking Save & Print...');
    await page.evaluate(() => {
      const confirmBtn = document.getElementById('confirmBtn');
      if (confirmBtn) confirmBtn.click();
    });
    
    await new Promise(r => setTimeout(r, 1000));

    console.log('Checking if invoice modal opened...');
    const hasInvoice = await page.evaluate(() => {
      const modal = document.querySelector('.modal');
      return modal && modal.innerHTML.includes('Invoice');
    });
    
    console.log('Invoice generation successful:', hasInvoice);

    // Test Portal search
    console.log('Navigating to Portal...');
    await page.goto('https://mrlaundry.vercel.app/portal.html', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000)); // wait for cloud pull
    
    console.log('Trying portal search...');
    await page.evaluate(() => {
      const searchInp = document.getElementById('searchInp');
      const searchBtn = document.getElementById('searchBtn');
      if (searchInp && searchBtn) {
        searchInp.value = '1000'; // test invoice number
        searchBtn.click();
      }
    });

    await new Promise(r => setTimeout(r, 1000));
    const hasPortalResult = await page.evaluate(() => {
      const res = document.getElementById('result');
      return res && res.innerHTML.length > 50;
    });

    console.log('Portal search executed. Results rendered:', hasPortalResult);
    
    await browser.close();
    console.log('Tests completed.');
  } catch(e) {
    console.error('Test failed:', e);
  }
})();
