import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import CustomerView from './components/CustomerView';
import ShopkeeperDashboard from './components/ShopkeeperDashboard';
import StandeePoster from './components/StandeePoster';
import RegisterShopModal from './components/RegisterShopModal';
import NotFoundPage from './components/NotFoundPage';
import { API_BASE } from './config';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState('landing'); // 'landing', 'customer', 'dashboard', 'standee', '404'
  const [shops, setShops] = useState([]);
  const [selectedShopId, setSelectedShopId] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('shop') || localStorage.getItem('printo_shopId') || 'shivam';
  });
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  // Load all registered shops
  const fetchShops = () => {
    fetch(`${API_BASE}/api/shops`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setShops(data);
        }
      })
      .catch(err => console.error('Failed to load shops:', err));
  };

  useEffect(() => {
    fetchShops();
  }, []);

  // Update URL and Route simultaneously
  const navigateTo = (route, shopId = selectedShopId) => {
    setCurrentRoute(route);
    let targetPath = '/';

    if (route === 'landing') {
      targetPath = '/';
      document.title = 'Printo — Smart Self-Service Printing SaaS | Automate Xerox & Cyber Cafes';
    } else if (route === 'dashboard') {
      targetPath = `/dashboard?shop=${shopId}`;
      document.title = `Shopkeeper Dashboard | Printo`;
    } else if (route === 'customer') {
      targetPath = `/s/${shopId}`;
      document.title = `Instant Print | Printo`;
    } else if (route === 'standee') {
      targetPath = `/standee/${shopId}`;
      document.title = `Counter Standee Poster | Printo`;
    } else if (route === '404') {
      document.title = 'Page Not Found | Printo';
    }

    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
  };

  // Check URL pathname on mount
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/' || path === '') {
      setCurrentRoute('landing');
      document.title = 'Printo — Smart Self-Service Printing SaaS | Automate Xerox & Cyber Cafes';
    } else if (path.startsWith('/dashboard') || path.startsWith('/admin')) {
      const urlParams = new URLSearchParams(window.location.search);
      const shopParam = urlParams.get('shop') || localStorage.getItem('printo_shopId') || 'shivam';
      setSelectedShopId(shopParam);
      localStorage.setItem('printo_shopId', shopParam);
      setCurrentRoute('dashboard');
      document.title = 'Shopkeeper Dashboard | Printo';
    } else if (path.startsWith('/standee')) {
      const parts = path.split('/');
      if (parts[2]) {
        setSelectedShopId(parts[2]);
        localStorage.setItem('printo_shopId', parts[2]);
        setCurrentRoute('standee');
      } else {
        setCurrentRoute('404');
      }
    } else if (path.startsWith('/s/')) {
      const parts = path.split('/');
      if (parts[2]) {
        setSelectedShopId(parts[2]);
        localStorage.setItem('printo_shopId', parts[2]);
        setCurrentRoute('customer');
      } else {
        setCurrentRoute('404');
      }
    } else {
      setCurrentRoute('404');
    }
  }, []);

  const handleShopCreated = (newShop) => {
    fetchShops();
    setSelectedShopId(newShop.id);
    localStorage.setItem('printo_shopId', newShop.id);
    navigateTo('dashboard', newShop.id);
  };

  const handleSelectShop = (shopId) => {
    setSelectedShopId(shopId);
    localStorage.setItem('printo_shopId', shopId);
    navigateTo('dashboard', shopId);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Main View Router */}
      <div className="flex-1">
        {currentRoute === 'landing' && (
          <LandingPage
            onOpenRegister={() => setIsRegisterModalOpen(true)}
            onGoToDashboard={() => {
              const saved = localStorage.getItem('printo_shopId');
              if (saved) {
                navigateTo('dashboard', saved);
              } else {
                setIsRegisterModalOpen(true);
              }
            }}
            onGoToDemo={() => navigateTo('customer')}
          />
        )}
        {currentRoute === 'customer' && <CustomerView key={selectedShopId} shopId={selectedShopId} />}
        {currentRoute === 'dashboard' && (
          <ShopkeeperDashboard
            key={selectedShopId}
            shopId={selectedShopId}
            onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
          />
        )}
        {currentRoute === 'standee' && <StandeePoster key={selectedShopId} shopId={selectedShopId} />}
        {currentRoute === '404' && (
          <NotFoundPage
            onGoHome={() => navigateTo('landing')}
            onGoDashboard={() => navigateTo('dashboard')}
          />
        )}
      </div>

      {/* Unified Register & Login Shop Modal */}
      <RegisterShopModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onShopCreated={handleShopCreated}
        shops={shops}
        onSelectShop={handleSelectShop}
      />
    </div>
  );
}
