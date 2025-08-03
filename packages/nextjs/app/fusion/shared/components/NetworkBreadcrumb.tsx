"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NetworkBreadcrumbProps {
  network: 'ethereum' | 'sui';
}

const NetworkBreadcrumb: React.FC<NetworkBreadcrumbProps> = ({ network }) => {
  const pathname = usePathname();
  
  // Parse path to generate breadcrumbs
  const generateBreadcrumbs = () => {
    const pathParts = pathname.split('/').filter(Boolean);
    const breadcrumbs = [];
    
    // Add home page
    breadcrumbs.push({
      label: 'Fusion',
      href: '/fusion',
      isActive: false
    });
    
    // Add network
    const networkConfig = {
      ethereum: { label: 'Ethereum', icon: '⟠', color: 'text-blue-600' },
      sui: { label: 'Sui', icon: '🌊', color: 'text-cyan-600' }
    };
    
    const currentNetwork = networkConfig[network];
    breadcrumbs.push({
      label: currentNetwork.label,
      href: `/fusion/${network}`,
      isActive: false,
      icon: currentNetwork.icon,
      color: currentNetwork.color
    });
    
    // Parse remaining path
    const fusionIndex = pathParts.indexOf('fusion');
    if (fusionIndex !== -1) {
      const remainingParts = pathParts.slice(fusionIndex + 2); // Skip 'fusion' and network
      
      let currentPath = `/fusion/${network}`;
      
      remainingParts.forEach((part, index) => {
        currentPath += `/${part}`;
        const isLast = index === remainingParts.length - 1;
        
        // Convert path names to friendly display names
        const friendlyNames: Record<string, string> = {
          'swap': 'Trading',
          'orders': 'Orders',
          'analytics': 'Analytics',
          'active': 'Active Orders',
          'history': 'Order History',
          'volume': 'Volume',
          'performance': 'Performance',
          'settings': 'Settings',
          'help': 'Help',
          'demo': 'Demo'
        };
        
        breadcrumbs.push({
          label: friendlyNames[part] || part,
          href: currentPath,
          isActive: isLast
        });
      });
    }
    
    return breadcrumbs;
  };
  
  const breadcrumbs = generateBreadcrumbs();
  
  return (
    <nav className="breadcrumb bg-white border-b border-gray-200 px-6 py-3">
      <ol className="flex items-center space-x-2 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <li key={crumb.href} className="flex items-center">
            {index > 0 && (
              <span className="mx-2 text-gray-400">/</span>
            )}
            
            {crumb.isActive ? (
              <span className={`font-medium ${crumb.color || 'text-gray-900'} flex items-center space-x-1`}>
                {crumb.icon && <span>{crumb.icon}</span>}
                <span>{crumb.label}</span>
              </span>
            ) : (
              <Link 
                href={crumb.href}
                className={`hover:underline ${crumb.color || 'text-gray-600'} flex items-center space-x-1 transition-colors`}
              >
                {crumb.icon && <span>{crumb.icon}</span>}
                <span>{crumb.label}</span>
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default NetworkBreadcrumb;