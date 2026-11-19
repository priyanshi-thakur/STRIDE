import { getSession, signoutFormAction } from "@/app/auth/actions";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

function ComingSoonCard({
  title,
  description,
  href,
  isComingSoon = true,
}: {
  title: string;
  description: string;
  href?: string;
  isComingSoon?: boolean;
}) {
  const cardContent = (
    <>
      <div className="flex items-start justify-between mb-4">
        <h2 className="font-serif text-xl font-bold tracking-tight text-stride-dark">
          {title}
        </h2>
      </div>
      <p className="text-stride-dark/60 text-sm mb-6">{description}</p>
      {isComingSoon && (
        <div className="rounded-lg border border-stride-butter bg-stride-butter/30 p-4 text-center">
          <p className="text-stride-dark text-sm font-medium">Coming soon</p>
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-xl border border-stride-stone bg-white p-6 shadow-sm transition-colors hover:border-stride-olive hover:bg-stride-stone/5 focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2 cursor-pointer"
      >
        {cardContent}
      </Link>
    );
  }

  return (
    <div className="rounded-xl border border-stride-stone bg-white p-6 shadow-sm">
      {cardContent}
    </div>
  );
}

async function DashboardContent() {
  const user = await getSession();

  if (!user) {
    redirect("/auth/login");
  }

  const userName =
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "User";

  return (
    <div className="flex flex-col min-h-screen bg-stride-ivory text-stride-dark">
      <header className="flex items-center justify-between px-6 py-4 bg-stride-ivory">
        <Link
          href="/"
          className="font-serif text-xl font-bold tracking-tight text-stride-dark"
        >
          STRIDE
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-stride-dark">
            {userName}
          </span>
          <form action={signoutFormAction} className="inline">
            <button
              type="submit"
              className="rounded-full bg-stride-olive text-stride-olive-contrast font-medium text-sm px-4 py-2 transition-colors hover:bg-stride-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 px-6 py-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold tracking-tight text-stride-dark">
            Welcome back, {userName}
          </h1>
          <p className="mt-2 text-stride-dark/70 text-sm">
            Your dashboard for managing projects, scenarios, and progress.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ComingSoonCard
            title="My Projects"
            description="View and manage your Path A projects."
            href="/projects"
            isComingSoon={false}
          />
          <ComingSoonCard
            title="Explore Scenarios"
            description="Complete prepared Path B exercises."
          />
          <ComingSoonCard
            title="My Progress"
            description="Track your stage completions and scores."
          />
          <ComingSoonCard
            title="My Profile"
            description="Manage your account settings and preferences."
          />
          <ComingSoonCard
            title="RY Coach"
            description="Get stage-specific AI coaching guidance."
          />
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col min-h-screen bg-stride-ivory text-stride-dark">
          <header className="flex items-center justify-between px-6 py-4 bg-stride-ivory">
            <Link
              href="/"
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
              <div className="animate-pulse rounded-lg bg-stride-stone/20 h-32 w-full"></div>
            </div>
          </main>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
