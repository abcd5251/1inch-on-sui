"use client";

import React from 'react';
import SuiHeader from '../shared/components/SuiHeader';
import NetworkBreadcrumb from '../shared/components/NetworkBreadcrumb';

export default function SuiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="sui-layout">
      <SuiHeader />
      <NetworkBreadcrumb network="sui" />
      <div className="sui-content bg-cyan-50 min-h-screen">
        {children}
      </div>
    </div>
  );
}