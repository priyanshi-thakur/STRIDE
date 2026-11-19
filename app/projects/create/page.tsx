import { getSession } from "@/app/auth/actions";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import CreateProjectForm from "./form";

async function CreateProjectContent() {
  const user = await getSession();

  if (!user) {
    redirect("/auth/login");
  }

  return <CreateProjectForm />;
}

export default function CreateProjectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col min-h-screen bg-stride-ivory text-stride-dark">
          <header className="flex items-center justify-between px-6 py-4 bg-stride-ivory">
            <a
              href="/dashboard"
              className="font-serif text-xl font-bold tracking-tight text-stride-dark"
            >
              STRIDE
            </a>
          </header>
          <main className="flex-1 px-6 py-8 max-w-md mx-auto">
            <div className="flex flex-col gap-4">
              <div className="animate-pulse rounded-lg bg-stride-stone/20 h-10 w-40"></div>
              <div className="animate-pulse rounded-lg bg-stride-stone/20 h-4 w-64"></div>
              <div className="animate-pulse rounded-lg bg-stride-stone/20 h-4 w-96"></div>
            </div>
          </main>
        </div>
      }
    >
      <CreateProjectContent />
    </Suspense>
  );
}
