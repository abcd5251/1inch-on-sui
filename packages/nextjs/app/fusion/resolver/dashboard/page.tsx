'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ResolverDashboardPage() {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <nav className="text-sm breadcrumbs mb-4">
              <ul>
                <li><Link href="/fusion" className="text-blue-600 hover:text-blue-800">Fusion</Link></li>
                <li><Link href="/fusion/resolver" className="text-blue-600 hover:text-blue-800">Resolver</Link></li>
                <li className="text-gray-500">Dashboard</li>
              </ul>
            </nav>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Resolver Dashboard</h1>
            <p className="text-gray-600">Detailed resolver performance metrics and analysis</p>
          </div>
        </div>

        <div className="text-center py-12">
          <div className="text-6xl mb-4">🚧</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Feature Under Development</h3>
          <p className="text-gray-600 mb-6">Resolver dashboard is under development, stay tuned</p>
          <Link 
            href="/fusion/resolver"
            className="inline-flex items-center bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Back to Resolver Home
          </Link>
        </div>
      </div>
    </div>
  );
}