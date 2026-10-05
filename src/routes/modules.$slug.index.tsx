import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, PlayCircle, Presentation } from "lucide-react";
import { getScenario } from "@/lib/scenarios";
import { useProgress } from "@/hooks/useProgress";

export const Route = createFileRoute("/modules/$slug/")({
  head: ({ params }) => {
    const scenario = getScenario(params.slug);
    const title = scenario ? `${scenario.title} — Black Mirror Lab` : "Scenario — Black Mirror Lab";
    const description = scenario?.intro ?? "Scenario didattico interattivo di Black Mirror Lab.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: ModuleIntro,
});

function ModuleIntro() {
  const { slug } = Route.useParams();
  const scenario = getScenario(slug);
  if (!scenario) throw notFound();
  const { completedFor } = useProgress();
  const completed = completedFor(scenario.id);
  const first = scenario.tasks[0]!;
  const nextUncompleted = scenario.tasks.find((t) => !completed.includes(t.id)) ?? first;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 max-w-3xl duration-500">
      <p className="mb-3 text-xs uppercase tracking-[0.2em] text-gold">Introduzione</p>
      <h2 className="font-serif text-4xl leading-tight text-ivory md:text-5xl">
        {scenario.title}
      </h2>
      <p className="mt-2 text-lg italic text-gold/90">{scenario.subtitle}</p>
      <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{scenario.intro}</p>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {[
          { t: "Cosa vedrai", d: "URL, form e API con id manipolabili." },
          { t: "Cosa farai", d: "Modifichi tu i parametri, in prima persona." },
          { t: "Cosa impari", d: "Riconoscere e mitigare l'IDOR." },
        ].map((x) => (
          <div key={x.t} className="rounded-lg border border-border bg-surface p-5">
            <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
              {x.t}
            </div>
            <div className="text-sm text-ivory">{x.d}</div>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        {scenario.slides && scenario.slides.length > 0 && (
          <Link
            to="/modules/$slug/slides"
            params={{ slug: scenario.slug }}
            className="group inline-flex items-center gap-2 rounded-md border border-gold/50 bg-surface px-6 py-3 text-sm font-medium text-gold transition hover:border-gold hover:bg-gold/10"
          >
            <Presentation className="h-4 w-4" />
            Avvia slide
          </Link>
        )}
        <Link
          to="/modules/$slug/$taskId"
          params={{ slug: scenario.slug, taskId: nextUncompleted.id }}
          className="group inline-flex items-center gap-2 rounded-md bg-gold px-6 py-3 text-sm font-medium text-primary-foreground transition hover:brightness-110"
        >
          <PlayCircle className="h-4 w-4" />
          {completed.length === 0 ? "Inizia il primo task" : "Continua"}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <span className="text-sm text-muted-foreground">
          {scenario.tasks.length} micro-task · circa 20 minuti
        </span>
      </div>
    </div>
  );
}
