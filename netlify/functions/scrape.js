// netlify/functions/scrape.js
const chromium = require('chrome-aws-lambda'); // Or puppeteer-core
const playwright = require('playwright'); // Or puppeteer-core

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { url } = JSON.parse(event.body);

  if (!url) {
    return { statusCode: 400, body: 'Missing URL in request body' };
  }

  let browser = null;
  try {
    // Launch a headless browser
    // This part is tricky with serverless functions due to binary size.
    // We'll use playwright-chromium which is generally smaller than full puppeteer
    browser = await playwright.chromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' }); // Wait for network to be idle

    // --- SCRAPING LOGIC GOES HERE ---
    // Example: Extract page title and all product names/prices
    const scrapedData = await page.evaluate(() => {
      const data = {
        title: document.title,
        products: [],
        text_content: document.body.innerText.substring(0, 1000) // First 1000 chars
      };

      // Example for product cards (you might need to adjust selectors)
      const productElements = document.querySelectorAll('.product-card'); // Assuming a class 'product-card'
      productElements.forEach(el => {
        const name = el.querySelector('.product-name')?.innerText;
        const price = el.querySelector('.product-price')?.innerText;
        const imageUrl = el.querySelector('.product-image')?.src;
        if (name && price) {
          data.products.push({ name, price, imageUrl });
        }
      });
      return data;
    });
    // --- END SCRAPING LOGIC ---

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scrapedData),
    };
  } catch (error) {
    console.error('Scraping error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Failed to scrape URL' }),
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
