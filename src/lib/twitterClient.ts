import fs from "fs";
import path from "path";
import puppeteer, { Browser, Page, ElementHandle } from "puppeteer-core";
import chrome from "@sparticuz/chromium";
import type { CookieParam } from "puppeteer-core";

async function getExecutablePath(): Promise<string | undefined> {
  if (process.env.NODE_ENV === "production") {
    return await chrome.executablePath();
  }

  const localPaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ];

  return localPaths.find(fs.existsSync);
}

async function getBrowserInstance(): Promise<Browser | null> {
  const isProd = process.env.NODE_ENV === "production";
  const executablePath = await getExecutablePath();

  if (!executablePath) {
    console.error("❌ Chrome non trouvé.");
    return null;
  }

  return puppeteer.launch({
    args: isProd ? chrome.args : ["--no-sandbox", "--disable-setuid-sandbox"],
    executablePath,
    headless: isProd ? true : false,
    defaultViewport: isProd ? { width: 1920, height: 1080 } : null,
    timeout: 45000,
  });
}

async function closeBrowserInstance(browser: Browser | null) {
  if (browser) {
    await browser.close();
    console.log("🧼 Browser fermé.");
  }
}

interface TweetOptions {
  content: string;
  imagePaths: string[];
}

export default class TwitterClient {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private debug: boolean;

  constructor({ debug = false }: { debug?: boolean }) {
    this.debug = debug;
  }

  async init(): Promise<void> {
    try {
      this.browser = await getBrowserInstance();
      if (!this.browser)
        throw new Error("❌ Échec du lancement du navigateur.");

      this.page = await this.browser.newPage();
      await this.page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
      );

      if (this.debug) console.log("🛠️ Mode debug activé.");

      const cookies = await this.loadCookies();
      if (cookies.length) {
        await this.page.setCookie(...cookies);
        console.log("🍪 Cookies chargés.");
      }

      await this.page.goto("https://x.com/compose/tweet", {
        waitUntil: "networkidle2",
        timeout: 45000,
      });

      if (this.page.url().includes("login")) {
        throw new Error("❌ Non connecté à Twitter.");
      }

      console.log("🌐 Page prête pour le tweet.");
    } catch (e) {
      await this.handleError();
      throw e;
    }
  }

  private async loadCookies(): Promise<CookieParam[]> {
    if (!process.env.COOKIES_BASE64) {
      throw new Error(
        "❌ Variable d’environnement COOKIES_BASE64 manquante ! " +
          "Génère-la à partir de ton cookies.json en base64."
      );
    }

    try {
      return JSON.parse(
        Buffer.from(process.env.COOKIES_BASE64, "base64").toString("utf-8")
      );
    } catch (e) {
      throw new Error("❌ Erreur lors du décodage de COOKIES_BASE64 : " + e);
    }
  }

  async tweetWithImages({ content, imagePaths }: TweetOptions): Promise<void> {
    if (!this.page) throw new Error("Page non initialisée");

    try {
      await this.page.waitForSelector('div[role="textbox"]', {
        timeout: 30000,
      });
      const editor = await this.page.$('div[role="textbox"]');
      if (!editor) throw new Error("Textbox introuvable");
      await editor.focus();
      await editor.click();
      await this.page.keyboard.type(content, { delay: 50 });

      console.log("📝 Contenu écrit.");

      const input = (await this.page.$(
        '[data-testid="fileInput"]'
      )) as ElementHandle<HTMLInputElement>;
      if (!input) throw new Error("❌ Champ input non trouvé");

      for (const p of imagePaths) {
        try {
          await input.uploadFile(p);
        } catch (e) {
          console.error(`❌ Upload échoué pour ${p}:`, e);
        }
      }

      await this.page.waitForSelector('img[src^="blob:https://x.com"]', {
        timeout: 10000,
      });
      console.log("🖼️ Images uploadées.");

      await this.page.click('[data-testid="tweetButton"]');

      await this.page.waitForSelector(
        'div[role="alert"][data-testid="toast"]',
        {
          timeout: 5000,
        }
      );

      console.log("✅ Tweet envoyé.");
    } catch (err) {
      console.error("❌ Erreur pendant le tweet :", err);
      await this.handleError();
    } finally {
      await closeBrowserInstance(this.browser);
    }
  }

  private async handleError() {
    if (!this.page) return;

    const tmpDir = process.env.NODE_ENV === "production" ? "/tmp" : "./tmp";
    const screenshotPath = path.join(tmpDir, "vercel_debug_screenshot.png");

    try {
      if (fs.existsSync(screenshotPath)) fs.unlinkSync(screenshotPath);

      const oldDumps = fs
        .readdirSync(tmpDir)
        .filter((f) => f.startsWith("error_dom_dump_"));
      oldDumps.forEach((f) => fs.unlinkSync(`${tmpDir}/${f}`));
      if (oldDumps.length)
        console.log(`🧹 Nettoyage de ${oldDumps.length} dumps.`);

      await this.page.screenshot({ path: screenshotPath });
      console.log("📸 Screenshot capturé.");

      if (fs.existsSync(screenshotPath)) {
        console.log("✅ Screenshot bien écrit :", screenshotPath);
      } else {
        console.warn("❌ Screenshot NON TROUVÉ après capture !");
      }

      try {
        const htmlDump = await this.page.content();
        const dumpPath = path.join(tmpDir, `error_dom_dump_${Date.now()}.html`);
        fs.writeFileSync(dumpPath, htmlDump);
        console.log("📄 DOM enregistré :", dumpPath);
      } catch (err) {
        if (err instanceof Error) {
          console.warn("⚠️ Impossible d’obtenir le DOM :", err.message);
        } else {
          console.warn("⚠️ Impossible d’obtenir le DOM :", err);
        }
      }
    } catch (e) {
      console.warn("⚠️ Échec du dump d’erreur global :", e);
    }
  }
}
