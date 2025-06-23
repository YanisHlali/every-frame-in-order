import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "./ui/button";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const languages = [
  { code: "fr", label: "FR" },
  { code: "en", label: "EN" },
];

export function LanguageSwitcher() {
  const { locale, pathname } = useRouter();

  return (
    <div className="flex gap-2 items-center">
      <Globe className="w-4 h-4 opacity-70" />
      {languages.map(({ code, label }) => {
        const isActive = locale === code;

        return (
          <Link key={code} href={pathname} locale={code}>
            <Button
              variant={isActive ? "default" : "outline"}
              className={cn(
                "transition-colors",
                isActive &&
                  "dark:bg-white dark:text-black dark:hover:bg-white text-white"
              )}
            >
              {label}
            </Button>
          </Link>
        );
      })}
    </div>
  );
}
