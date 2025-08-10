import puppeteer from 'puppeteer';

export const generatePDFFromHTML = async (htmlContent: string): Promise<Buffer> => {
  let browser;
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // Create a new page
    const page = await browser.newPage();

    // Set content to the page
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0'
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF from HTML');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}; 