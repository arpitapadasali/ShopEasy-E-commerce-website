import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar.jsx';
import { Footer } from './Footer.jsx';

export const Layout = () => {
  return (
    <>
      <Navbar />
      <main style={{ flex: 1, padding: 'var(--space-8) 0' }}>
        <div className="container">
          <Outlet />
        </div>
      </main>
      <Footer />
    </>
  );
};
