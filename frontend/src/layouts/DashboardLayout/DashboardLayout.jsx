import { Outlet } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import TopNavbar from '../../components/layout/TopNavbar';

/**
 * DashboardLayout — Shell layout for admin dashboard pages.
 * Sidebar (fixed right) + Main area (TopNavbar + scrollable content).
 */
export default function DashboardLayout() {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 mr-64 flex flex-col h-screen overflow-hidden">
        {/* Top Navigation Bar */}
        <TopNavbar />

        {/* Page Content — scrollable */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
