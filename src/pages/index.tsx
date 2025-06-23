import { GetStaticPropsContext } from "next";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { LanguageSwitcher } from "../components/LangageSwitcher";
import { ThemeToggle } from "../components/ThemeToggle";

export async function getStaticProps(context: GetStaticPropsContext) {
  const locale = context.locale || "en";
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common"])),
    },
  };
}

export default function HomePage() {
  const { t } = useTranslation("common");

  return (
    <main className="container mx-auto py-10 px-4 space-y-8 text-zinc-900 dark:text-zinc-100">
      <div className="flex justify-between items-center">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <section className="text-center space-y-4">
        <h1 className="text-4xl font-bold">{t("title")}</h1>
        <p className="text-lg max-w-2xl mx-auto">{t("description")}</p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white dark:bg-zinc-800 border dark:border-zinc-700">
          <CardContent className="p-6 space-y-2">
            <h2 className="text-2xl font-semibold">{t("featuresTitle")}</h2>
            <ul className="list-disc list-inside">
              <li>{t("feature.0")}</li>
              <li>{t("feature.1")}</li>
              <li>{t("feature.2")}</li>
              <li>{t("feature.3")}</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-zinc-800 border dark:border-zinc-700">
          <CardContent className="p-6 space-y-2">
            <h2 className="text-2xl font-semibold">{t("techTitle")}</h2>
            <ul className="list-disc list-inside">
              <li>{t("tech.0")}</li>
              <li>{t("tech.1")}</li>
              <li>{t("tech.2")}</li>
              <li>{t("tech.3")}</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="text-center space-y-4">
        <h2 className="text-2xl font-semibold">{t("quickLinksTitle")}</h2>
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="https://github.com/YanisHlali/every-frame-in-order"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline">{t("sourceCode")}</Button>
          </a>
          <a
            href="https://twitter.com/TwinPeaksShot"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="secondary">{t("twitterAccount")}</Button>
          </a>
        </div>
      </section>
    </main>
  );
}
