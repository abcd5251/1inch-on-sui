"use client";

import React from 'react';
import EthereumHeader from '../shared/components/EthereumHeader';
import NetworkBreadcrumb from '../shared/components/NetworkBreadcrumb';

export default function EthereumLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="ethereum-layout">
      <EthereumHeader />
      <NetworkBreadcrumb network="ethereum" />
      <div className="ethereum-content bg-blue-50 min-h-screen">
        {children}
      </div>
    </div>
  );
}