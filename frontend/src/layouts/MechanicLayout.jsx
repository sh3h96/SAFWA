import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import TopNavbar from '../components/layout/TopNavbar';
import { mechanicNavGroups } from '../constants/navigation';

export default function MechanicLayout() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-surface">
      <Sidebar navGroups={mechanicNavGroups} />
      <main className="flex-1 mr-64 flex flex-col h-screen overflow-hidden">
        <TopNavbar />
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
