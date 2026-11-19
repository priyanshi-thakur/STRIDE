import { getSession } from "@/app/auth/actions";
import { getProject } from "@/app/projects/actions";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import RYChat from "./ry-chat";

function ProjectNotFound() {
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

async function ProjectDetailContent({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const user = await getSession();

  if (!user) {
    redirect("/auth/login");
  }

  const result = await getProject(projectId);

  if (!result.success) {
    return <ProjectNotFound />;
  }

  const project = result.project;

  return (
    <div className="flex flex-col min-h-screen bg-stride-ivory text-stride-dark">
      <header className="flex items-center justify-between px-6 py-4 bg-stride-ivory">
        <Link
          href="/projects"
          className="inline-flex items-center justify-center rounded-full bg-stride-olive text-stride-olive-contrast font-medium text-sm px-5 py-2.5 transition-colors hover:bg-stride-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2"
        >
          Back to Projects
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-stride-dark">
            {project.current_stage}
          </span>
          <span className="inline-flex items-center rounded-full bg-stride-mint px-2.5 py-0.5 text-xs font-medium text-stride-dark">
            {project.status}
          </span>
        </div>
      </header>

      <main className="flex-1 px-6 py-8 max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold tracking-tight text-stride-dark">
            {project.name}
          </h1>
          <p className="mt-2 text-stride-dark/70 text-sm">
            Domain: {project.domain}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-stride-stone bg-white p-6 shadow-sm">
            <h3 className="font-serif text-lg font-bold tracking-tight text-stride-dark mb-3">
              Problem Statement
            </h3>
            <p className="text-stride-dark/80 text-sm leading-relaxed">
              {project.problem_statement}
            </p>
          </div>

          <div className="rounded-xl border border-stride-stone bg-white p-6 shadow-sm">
            <h3 className="font-serif text-lg font-bold tracking-tight text-stride-dark mb-3">
              Learning Objective
            </h3>
            <p className="text-stride-dark/80 text-sm leading-relaxed">
              {project.learning_objective || "Not specified"}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-stride-stone bg-white p-6 shadow-sm">
          <h3 className="font-serif text-lg font-bold tracking-tight text-stride-dark mb-3">
            Project Details
          </h3>
          <div className="space-y-2 text-sm text-stride-dark/70">
            <p>
              <span className="font-medium">Status:</span> {project.status}
            </p>
            <p>
              <span className="font-medium">Current Stage:</span>{" "}
              {project.current_stage}
            </p>
            <p>
              <span className="font-medium">Created:</span>{" "}
              {new Date(project.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-4">
          <Link
            href={`/projects/${projectId}/research`}
            className={`inline-flex items-center justify-center rounded-full px-6 py-3 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2 ${
              project.current_stage === "research"
                ? "bg-stride-olive text-stride-olive-contrast hover:bg-stride-dark"
                : "border border-stride-stone bg-transparent text-stride-dark hover:bg-stride-stone/50"
            }`}
          >
            Research
          </Link>
          <Link
            href={`/projects/${projectId}/problem-definition`}
            className={`inline-flex items-center justify-center rounded-full px-6 py-3 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2 ${
              project.current_stage === "problem_definition"
                ? "bg-stride-olive text-stride-olive-contrast hover:bg-stride-dark"
                : "border border-stride-stone bg-transparent text-stride-dark hover:bg-stride-stone/50"
            }`}
          >
            Problem Definition
          </Link>
          <Link
            href={`/projects/${projectId}/ideation`}
            className={`inline-flex items-center justify-center rounded-full px-6 py-3 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2 ${
              project.current_stage === "ideation"
                ? "bg-stride-olive text-stride-olive-contrast hover:bg-stride-dark"
                : "border border-stride-stone bg-transparent text-stride-dark hover:bg-stride-stone/50"
            }`}
          >
            Ideation
          </Link>
          <Link
            href={`/projects/${projectId}/prototype-evaluation`}
            className={`inline-flex items-center justify-center rounded-full px-6 py-3 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2 ${
              project.current_stage === "prototype_evaluation"
                ? "bg-stride-olive text-stride-olive-contrast hover:bg-stride-dark"
                : "border border-stride-stone bg-transparent text-stride-dark hover:bg-stride-stone/50"
            }`}
          >
            Prototype & Evaluation
          </Link>
        </div>

        <div className="mt-6 rounded-xl border border-stride-stone bg-white p-6 shadow-sm">
          <h3 className="font-serif text-lg font-bold tracking-tight text-stride-dark mb-3">
            Stage Progress
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                project.current_stage === "research" || project.current_stage === "problem_definition"
                  ? "bg-stride-olive text-stride-olive-contrast"
                  : "bg-stride-stone text-stride-dark/50"
              }`}>
                {project.current_stage === "research" || project.current_stage === "problem_definition" ? "1" : "○"}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-stride-dark">Research</p>
                <p className="text-xs text-stride-dark/50">
                  {project.current_stage === "research" || project.current_stage === "problem_definition"
                    ? "Complete"
                    : "Not started"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                project.current_stage === "problem_definition"
                  ? "bg-stride-olive text-stride-olive-contrast"
                  : "bg-stride-stone text-stride-dark/50"
              }`}>
                {project.current_stage === "problem_definition" ? "2" : "○"}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-stride-dark">Problem Definition</p>
                <p className="text-xs text-stride-dark/50">
                  {project.problem_definition_completed ? "Complete" : "Not started"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                project.ideation_completed
                  ? "bg-stride-olive text-stride-olive-contrast"
                  : "bg-stride-stone text-stride-dark/50"
              }`}>
                {project.ideation_completed ? "3" : "○"}
              </span>
              <div className="flex-1">
                <p className={`text-sm font-medium ${project.ideation_completed ? "text-stride-dark" : "text-stride-dark/50"}`}>Ideation</p>
                <p className="text-xs text-stride-dark/50">
                  {project.ideation_completed ? "Complete" : "Not started"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                project.prototype_completed
                  ? "bg-stride-olive text-stride-olive-contrast"
                  : "bg-stride-stone text-stride-dark/50"
              }`}>
                {project.prototype_completed ? "4" : "○"}
              </span>
              <div className="flex-1">
                <p className={`text-sm font-medium ${project.prototype_completed ? "text-stride-dark" : "text-stride-dark/50"}`}>Prototype & Evaluation</p>
                <p className="text-xs text-stride-dark/50">
                  {project.prototype_completed ? "Complete" : "Not started"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium bg-stride-stone text-stride-dark/50">
                5
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-stride-dark/50">Evaluation</p>
                <p className="text-xs text-stride-dark/50">Coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-6 right-6 z-50">
        <RYChat projectId={projectId} />
      </div>
    </div>
  );
}

export default function ProjectDetailPage({
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
      <ProjectDetailContent params={params} />
    </Suspense>
  );
}
