import { getSession } from "@/app/auth/actions";
import { getProjects } from "@/app/projects/actions";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

function ProjectCard({
  project,
}: {
  project: {
    id: string;
    name: string;
    domain: string;
    current_stage: string;
    status: string;
    created_at: string;
  };
}) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group block rounded-xl border border-stride-stone bg-white p-6 shadow-sm hover:border-stride-olive transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <h2 className="font-serif text-xl font-bold tracking-tight text-stride-dark group-hover:text-stride-olive transition-colors">
          {project.name}
        </h2>
        <span className="inline-flex items-center rounded-full bg-stride-mint px-2.5 py-0.5 text-xs font-medium text-stride-dark">
          {project.current_stage}
        </span>
      </div>
      <p className="text-sm text-stride-dark/70 mb-3 line-clamp-2">
        {project.domain}
      </p>
      <div className="flex items-center justify-between text-xs text-stride-dark/50">
        <span>Status: {project.status}</span>
        <span>Created: {new Date(project.created_at).toLocaleDateString()}</span>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12">
      <div className="rounded-xl border border-stride-stone bg-white p-8 shadow-sm">
        <h2 className="font-serif text-2xl font-bold tracking-tight text-stride-dark mb-3">
          No projects yet
        </h2>
        <p className="text-stride-dark/70 text-sm mb-6">
          Start by creating your first project. Define the problem you want to solve.
        </p>
        <Link
          href="/projects/create"
          className="inline-flex items-center justify-center rounded-full bg-stride-olive text-stride-olive-contrast font-medium text-sm px-5 py-2.5 transition-colors hover:bg-stride-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2"
        >
          Create Project
        </Link>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-stride-dark/20 bg-stride-dark/5 p-6 text-center text-stride-dark text-sm">
      <p>{message}</p>
    </div>
  );
}

async function ProjectsContent() {
  const user = await getSession();

  if (!user) {
    redirect("/auth/login");
  }

  const result = await getProjects();

  if (!result.success) {
    return (
      <div className="flex flex-col min-h-screen bg-stride-ivory text-stride-dark">
        <header className="flex items-center justify-between px-6 py-4 bg-stride-ivory">
          <Link
            href="/dashboard"
            className="font-serif text-xl font-bold tracking-tight text-stride-dark"
          >
            STRIDE
          </Link>
        </header>
        <main className="flex-1 px-6 py-8 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="font-serif text-3xl font-bold tracking-tight text-stride-dark">
              My Projects
            </h1>
            <p className="mt-2 text-stride-dark/70 text-sm">
              Your Path A projects. Create a project to get started.
            </p>
          </div>
          <ErrorState message={result.message} />
        </main>
      </div>
    );
  }

  const projects = result.projects;

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
          href="/projects/create"
          className="inline-flex items-center justify-center rounded-full bg-stride-olive text-stride-olive-contrast font-medium text-sm px-5 py-2.5 transition-colors hover:bg-stride-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2"
        >
          Create Project
        </Link>
      </header>

      <main className="flex-1 px-6 py-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold tracking-tight text-stride-dark">
            My Projects
          </h1>
          <p className="mt-2 text-stride-dark/70 text-sm">
            Your Path A projects. Create a project to get started.
          </p>
        </div>

        {projects.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function ProjectsPage() {
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
          <main className="flex-1 px-6 py-8 max-w-7xl mx-auto">
            <div className="flex flex-col gap-4">
              <div className="animate-pulse rounded-lg bg-stride-stone/20 h-10 w-40"></div>
              <div className="animate-pulse rounded-lg bg-stride-stone/20 h-4 w-64"></div>
              <div className="animate-pulse rounded-lg bg-stride-stone/20 h-4 w-96"></div>
            </div>
          </main>
        </div>
      }
    >
      <ProjectsContent />
    </Suspense>
  );
}
