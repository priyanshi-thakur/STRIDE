import { getSession } from "@/app/auth/actions";
import { getProject, getIdeas } from "@/app/projects/actions";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import IdeationForm from "./form";

function IdeationNotFound() {
  return (
    <div className="flex flex-col min-h-screen bg-stride-ivory text-stride-dark">
      <header className="flex items-center justify-between px-6 py-4 bg-stride-ivory">
        <Link
          href="/dashboard"
          className="font-serif text-xl font-bold tracking-tight text-stride-dark"
        >
          STRIDE
        </Link>
        <Link
          href="/projects"
          className="inline-flex items-center justify-center rounded-full bg-stride-olive text-stride-olive-contrast font-medium text-sm px-5 py-2.5 transition-colors hover:bg-stride-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2"
        >
          Back to Projects
        </Link>
      </header>
      <main className="flex-1 px-6 py-8 max-w-md mx-auto">
        <div className="text-center py-12">
          <h2 className="font-serif text-2xl font-bold tracking-tight text-stride-dark mb-3">
            Project not found
          </h2>
          <p className="text-stride-dark/70 text-sm">
            This project does not exist or you do not have access to it.
          </p>
        </div>
      </main>
    </div>
  );
}

async function IdeationContent({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const user = await getSession();

  if (!user) {
    redirect("/auth/login");
  }

  const projectResult = await getProject(projectId);

  if (!projectResult.success) {
    return <IdeationNotFound />;
  }

  const project = projectResult.project;

  const ideasResult = await getIdeas(projectId);
  const ideas = ideasResult.success ? ideasResult.ideas : [];

  return (
    <div className="flex flex-col min-h-screen bg-stride-ivory text-stride-dark">
      <header className="flex items-center justify-between px-6 py-4 bg-stride-ivory">
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center justify-center rounded-full bg-stride-olive text-stride-olive-contrast font-medium text-sm px-5 py-2.5 transition-colors hover:bg-stride-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2"
        >
          Back to Project
        </Link>
      </header>

      <main className="flex-1 px-6 py-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold tracking-tight text-stride-dark">
            Ideation: {project.name}
          </h1>
          <p className="mt-2 text-stride-dark/70 text-sm">
            Generate, organise, compare, and select ideas for your project.
          </p>
        </div>

        <div className="rounded-xl border border-stride-stone bg-white p-6 shadow-sm">
          <IdeationForm projectId={projectId} initialIdeas={ideas} />
        </div>

        <div className="mt-8 text-sm text-stride-dark/60">
          <p>
            Your ideas are saved privately to your account and linked to this
            project. Only you can view or edit them.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function IdeationPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col min-h-screen bg-stride-ivory text-stride-dark">
          <header className="flex items-center justify-between px-6 py-4 bg-stride-ivory">
            <Link
              href="/dashboard"
              className="font-serif text-xl font-bold tracking-tight text-stride-dark"
            >
              STRIDE
            </Link>
          </header>
          <main className="flex-1 px-6 py-8 max-w-3xl mx-auto">
            <div className="flex flex-col gap-4">
              <div className="animate-pulse rounded-lg bg-stride-stone/20 h-10 w-40"></div>
              <div className="animate-pulse rounded-lg bg-stride-stone/20 h-4 w-64"></div>
              <div className="animate-pulse rounded-lg bg-stride-stone/20 h-4 w-96"></div>
            </div>
          </main>
        </div>
      }
      >
        <IdeationContent params={params} />
      </Suspense>
    );
  }
