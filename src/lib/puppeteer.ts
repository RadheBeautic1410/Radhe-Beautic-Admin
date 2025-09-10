// import puppeteer from 'puppeteer';


// export const generatePDFFromHTML = async (htmlContent: string): Promise<Buffer> => {
//   let browser;
//   try {
//     // Launch browser
//     browser = await puppeteer.launch({
//       headless: true,
//       args: ['--no-sandbox', '--disable-setuid-sandbox']
//     });

//     // Create a new page
//     const page = await browser.newPage();

//     // Set content to the page
//     await page.setContent(htmlContent, {
//       waitUntil: 'networkidle0'
//     });

//     // Generate PDF
//     const pdfBuffer = await page.pdf({
//       format: 'A4',
//       printBackground: true,
//       margin: {
//         top: '20px',
//         right: '20px',
//         bottom: '20px',
//         left: '20px'
//       }
//     });

//     return Buffer.from(pdfBuffer);
//   } catch (error) {
//     console.error('Error generating PDF:', error);
//     throw new Error('Failed to generate PDF from HTML');
//   } finally {
//     if (browser) {
//       await browser.close();
//     }
//   }
// };

// export const generateSmallPDFFromHTML = async (htmlContent: string): Promise<Buffer> => {
//   let browser;
//   try {
//     // Launch browser
//     browser = await puppeteer.launch({
//       headless: true,
//       args: ['--no-sandbox', '--disable-setuid-sandbox']
//     });

//     // Create a new page
//     const page = await browser.newPage();

//     // Set content
//     await page.setContent(htmlContent, {
//       waitUntil: 'networkidle0'
//     });

//     // Generate PDF with 4x6 inch size
//     const pdfBuffer = await page.pdf({
//       width: '4in',
//       height: '6in',
//       printBackground: true,
//       margin: {
//         top: '5mm',
//         right: '5mm',
//         bottom: '5mm',
//         left: '5mm'
//       }
//     });

//     return Buffer.from(pdfBuffer);
//   } catch (error) {
//     console.error('Error generating PDF:', error);
//     throw new Error('Failed to generate PDF from HTML');
//   } finally {
//     if (browser) {
//       await browser.close();
//     }
//   }
// };

// import chromium from "chrome-aws-lambda";
// import puppeteer from "puppeteer-core";

// async function launchBrowser() {
//   const executablePath = await chromium.executablePath;

//   return puppeteer.launch({
//     args: chromium.args,
//     executablePath: await chromium.executablePath,
//     headless: chromium.headless,
//   });
// }

// export const generatePDFFromHTML = async (htmlContent: string): Promise<Buffer> => {
//   let browser;
//   try {
//     browser = await launchBrowser();
//     const page = await browser.newPage();

//     await page.setContent(htmlContent, { waitUntil: "networkidle0" });

//     const pdfBuffer = await page.pdf({
//       format: "a4",
//       printBackground: true,
//       margin: { top: "20px", right: "20px", bottom: "20px", left: "20px" },
//     });

//     return Buffer.from(pdfBuffer);
//   } catch (error) {
//     console.error("Error generating PDF:", error);
//     throw new Error("Failed to generate PDF from HTML");
//   } finally {
//     if (browser) {
//       await browser.close();
//     }
//   }
// };

// export const generateSmallPDFFromHTML = async (htmlContent: string): Promise<Buffer> => {
//   let browser;
//   try {
//     browser = await launchBrowser();
//     const page = await browser.newPage();

//     await page.setContent(htmlContent, { waitUntil: "networkidle0" });

//     const pdfBuffer = await page.pdf({
//       width: "4in",
//       height: "6in",
//       printBackground: true,
//       margin: { top: "5mm", right: "5mm", bottom: "5mm", left: "5mm" },
//     });

//     return Buffer.from(pdfBuffer);
//   } catch (error) {
//     console.error("Error generating small PDF:", error);
//     throw new Error("Failed to generate small PDF from HTML");
//   } finally {
//     if (browser) {
//       await browser.close();
//     }
//   }
// };


import type { Browser } from "puppeteer-core";
import { launchBrowser } from "./launchBrowser";

export const generatePDFFromHTML = async (htmlContent: string): Promise<Buffer> => {
  let browser: Browser | undefined;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "a4",
      printBackground: true,
      margin: { top: "20px", right: "20px", bottom: "20px", left: "20px" },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    if (browser) await browser.close();
  }
};


