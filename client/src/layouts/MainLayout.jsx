import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Footer from '../components/layout/Footer.jsx';
import Navbar from '../components/layout/Navbar.jsx';

export function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-fg">
      <Navbar />
      <main className="container mx-auto w-full flex-1 px-4 py-6">
        <Outlet />
      </main>
      <Footer />
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
    </div>
  );
}

export default MainLayout;
