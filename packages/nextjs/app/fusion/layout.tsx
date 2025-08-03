"use client";

import React from 'react';
import { FusionProvider } from './shared/context/FusionContext';
import FusionHeader from './shared/components/FusionHeader';
import FusionSidebar from './shared/components/FusionSidebar';
import FusionFooter from './shared/components/FusionFooter';

export default function FusionLayout({ children }: { children: React.ReactNode }) {
  return (
    <FusionProvider>
      <div className="fusion-layout min-h-screen bg-gray-50">
        <FusionHeader />
        <div className="flex">
          <FusionSidebar />
          <main className="fusion-main flex-1 p-6">
            {children}
          </main>
        </div>
        <FusionFooter />
      </div>
    </FusionProvider>
  );
}