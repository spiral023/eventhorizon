import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen relative page-stable">
      <div className="fixed inset-0 gradient-bg -z-10" />
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:ml-64">
          {children}
        </main>
      </div>
    </div>
  );
}
