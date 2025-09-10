
import chromium from "@sparticuz/chromium";
import puppeteer, { Browser } from "puppeteer-core";

export async function launchBrowser(): Promise<Browser> {
  const isLocal = !process.env.AWS_REGION;

  if (isLocal) {
    const puppeteerLocal = await import("puppeteer-core");
    return puppeteerLocal.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      defaultViewport: { width: 1280, height: 720 },
    });
  }

  return puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
    defaultViewport: { width: 1280, height: 720 },
  });
}
