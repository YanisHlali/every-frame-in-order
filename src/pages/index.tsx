import Head from "next/head";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { ThemeToggle } from "../components/ThemeToggle";


export default function HomePage() {

  return (
    <>
      <Head>
        <title>Every Frame In Order</title>
        <meta name="description" content="Automatically posts every frame in order on Twitter." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎬</text></svg>" />
      </Head>
      <main className="container mx-auto py-10 px-4 space-y-8 text-zinc-900 dark:text-zinc-100">
      <div className="flex justify-end items-center">
        <ThemeToggle />
      </div>

      <section className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Every Frame In Order</h1>
        <p className="text-lg max-w-2xl mx-auto">Automatically posts every frame in order on Twitter.</p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white dark:bg-zinc-800 border dark:border-zinc-700">
          <CardContent className="p-6 space-y-2">
            <h2 className="text-2xl font-semibold">🚀 Features</h2>
            <ul className="list-disc list-inside">
              <li>Twitter scraping without API</li>
              <li>Frame storage on Google Drive</li>
              <li>PM2 automated scheduling</li>
              <li>Episode and tweet management with Firestore</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-zinc-800 border dark:border-zinc-700">
          <CardContent className="p-6 space-y-2">
            <h2 className="text-2xl font-semibold">🛠 Technologies</h2>
            <ul className="list-disc list-inside">
              <li>Next.js 15 + TypeScript</li>
              <li>Puppeteer Core + Chromium</li>
              <li>Firebase Admin, Google APIs</li>
              <li>PM2 Process Management</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="text-center space-y-4">
        <h2 className="text-2xl font-semibold">🔗 Quick links</h2>
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="https://github.com/yanishlali/frame"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline">View source code</Button>
          </a>
          <a
            href="https://twitter.com/TwinPeaksShot"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="secondary">View Twitter account</Button>
          </a>
        </div>
      </section>

      <section className="text-center space-y-4">
        <h2 className="text-2xl font-semibold">📂 Collections</h2>
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="/twin-peaks"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="secondary">Twin Peaks</Button>
          </a>
        </div>
      </section>
      </main>
    </>
  );
}
