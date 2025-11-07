/**
 * Dashboard Page Component
 * 
 * Main dashboard page for the FinOps Portal.
 * Displays different sections (tabs) based on user role:
 * - Upload CSV: Only ADMIN and ANALYST can access
 * - Spend Overview: All authenticated users can view
 * - Savings Pipeline: All authenticated users can view (VIEWER is read-only)
 * - PR Helper: All authenticated users can use
 */

"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Modal from "@/components/Modal";
import UploadSection from "./components/UploadSection";
import SpendSection from "./components/SpendSection";
import SavingsSection from "./components/SavingsSection";
import PRHelperSection from "./components/PRHelperSection";
import { UploadIcon, MoneyIcon, LightbulbIcon, DocumentIcon } from "@/components/Icons";

/**
 * User Type Definition
 * 
 * Represents the authenticated user's data from the session.
 */
type User = {
  email: string;
  role: string;
  name: string | null;
};

/**
 * Dashboard Page Component
 * 
 * Main dashboard that displays different sections based on user role.
 * Implements Role-Based Access Control (RBAC) to show/hide tabs.
 */
export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("upload"); // Currently selected tab
  const [user, setUser] = useState<User | null>(null); // Current authenticated user
  const [loading, setLoading] = useState(true); // Loading state while fetching user
  const [showLogoutModal, setShowLogoutModal] = useState(false); // Modal visibility state

  /**
   * Fetch Current User
   * 
   * On component mount, fetch the current user's session.
   * If no session exists, redirect to login page.
   */
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user); // Store user data
        } else {
          router.push("/login"); // No session, redirect to login
        }
      })
      .catch(() => router.push("/login")) // Error fetching user, redirect to login
      .finally(() => setLoading(false)); // Always stop loading
  }, [router]);

  /**
   * Handle Logout
   * 
   * Logs out the user by calling the logout API endpoint,
   * then redirects to the login page.
   */
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }); // Call logout API
    router.push("/login"); // Redirect to login page
  }

  /**
   * Define All Available Tabs
   * 
   * All possible tabs in the dashboard.
   * Each tab has an ID, label, icon, and permission requirement.
   */
  const allTabs = [
    { id: "upload", label: "Upload CSV", icon: UploadIcon, requiresWrite: true }, // Only ADMIN/ANALYST
    { id: "spend", label: "Spend Overview", icon: MoneyIcon, requiresWrite: false }, // All users
    { id: "savings", label: "Savings Pipeline", icon: LightbulbIcon, requiresWrite: false }, // All users (VIEWER read-only)
    { id: "pr", label: "PR Helper", icon: DocumentIcon, requiresWrite: false }, // All users
  ];
  
  /**
   * Filter Tabs Based on User Role
   * 
   * Remove tabs that the current user doesn't have permission to access.
   * VIEWER role cannot access tabs that require write permissions.
   */
  const tabs = allTabs.filter(tab => {
    // VIEWER role cannot access tabs that require write permissions (like Upload)
    if (tab.requiresWrite && user?.role === "VIEWER") return false;
    return true; // Include all other tabs
  });

  /**
   * Auto-Switch Tab if Current Tab is Not Available
   * 
   * If the currently selected tab is not available for the user's role,
   * automatically switch to the first available tab.
   */
  useEffect(() => {
    if (user && !tabs.find(t => t.id === activeTab)) {
      // Current tab is not available, switch to first available tab
      setActiveTab(tabs[0]?.id || "spend");
    }
  }, [user, tabs, activeTab]);

  /**
   * Loading State
   * 
   * Display skeleton loader while fetching user session.
   * Provides visual feedback that the page is loading.
   */
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-800/50 p-6 md:p-8">
            <div className="space-y-6">
              {/* Header skeleton */}
              <div className="flex items-center gap-3">
                <div className="w-24 h-24 bg-gray-700 rounded animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-8 bg-gray-700 rounded w-64 animate-pulse"></div>
                  <div className="h-4 bg-gray-700 rounded w-48 animate-pulse"></div>
                </div>
              </div>
              {/* Tabs skeleton */}
              <div className="h-12 bg-gray-800/50 rounded-lg animate-pulse"></div>
              {/* Content skeleton */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="h-80 bg-gray-800/50 rounded-lg animate-pulse"></div>
                <div className="h-80 bg-gray-800/50 rounded-lg animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Main Dashboard UI
   * 
   * Renders the dashboard with:
   * - Header: Logo, title, user info, logout button
   * - Navigation Tabs: Role-filtered tabs for different sections
   * - Main Content: Active tab's content (Upload, Spend, Savings, PR Helper)
   * - Logout Modal: Confirmation dialog for logout
   */
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      {/* Header Section */}
      <header className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-800/50 shadow-lg sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <Image
                  src="/kandco-symbol.png"
                  alt="Company Logo"
                  width={64}
                  height={64}
                  className="object-contain"
                  priority
                  unoptimized
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  FinOps Portal
                </h1>
                <p className="text-xs text-gray-400 mt-0.5 font-medium">Financial Operations Dashboard</p>
              </div>
            </div>
            {/* User Info and Logout Button */}
            {user && (
              <div className="flex items-center gap-4">
                {/* User Details (hidden on mobile) */}
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-white">{user.name || user.email}</p>
                  {/* Role Badge with Color Indicator */}
                  <p className="text-xs text-gray-400 capitalize flex items-center justify-end gap-1.5 mt-0.5">
                    <span className={`inline-block w-2 h-2 rounded-full ${
                      user.role === "ADMIN" ? "bg-red-500" : // Red for admin
                      user.role === "ANALYST" ? "bg-blue-500" : // Blue for analyst
                      "bg-green-500" // Green for viewer
                    }`}></span>
                    {user.role.toLowerCase()}
                  </p>
                </div>
                {/* Logout Button */}
                <button
                  onClick={() => setShowLogoutModal(true)} // Open logout confirmation modal
                  className="px-4 py-2 text-sm font-semibold text-white bg-gray-800/80 rounded-lg hover:bg-gray-700/90 active:bg-gray-600 transition-all duration-200 shadow-md hover:shadow-lg border border-gray-700/50 hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                  aria-label="Logout"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Navigation Tabs Section */}
      <div className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-800/50 sticky top-[81px] z-10 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {/* Render each available tab (filtered by user role) */}
            {tabs.map((tab) => {
              const IconComponent = tab.icon; // Get icon component for this tab
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)} // Switch to this tab on click
                  role="tab"
                  aria-selected={activeTab === tab.id} // Indicate if tab is selected
                  aria-controls={`tabpanel-${tab.id}`} // Link to corresponding panel
                  id={`tab-${tab.id}`}
                  className={`px-5 py-3 rounded-t-lg font-semibold text-sm transition-all duration-200 whitespace-nowrap relative flex items-center gap-2 ${
                    activeTab === tab.id
                      ? "bg-blue-600 text-white shadow-lg transform scale-[1.02]" // Active tab styling
                      : "bg-gray-800/30 text-gray-400 hover:bg-gray-700/50 hover:text-gray-300 border-b-2 border-transparent hover:border-gray-600" // Inactive tab styling
                  }`}
                >
                  <IconComponent className="w-4 h-4" /> {/* Tab icon */}
                  {tab.label} {/* Tab label */}
                  {/* Active tab indicator (blue underline) */}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" aria-hidden="true"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-800/50 p-6 md:p-8 transition-all duration-300">
          {/* Tab Panel (ARIA for accessibility) */}
          <div
            key={activeTab} // Re-render on tab change for animation
            role="tabpanel"
            id={`tabpanel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
            className="animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            {/* Conditionally render the active tab's content */}
            {activeTab === "upload" && <UploadSection userRole={user?.role} />}
            {activeTab === "spend" && <SpendSection />}
            {activeTab === "savings" && <SavingsSection userRole={user?.role} />}
            {activeTab === "pr" && <PRHelperSection />}
          </div>
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={showLogoutModal} // Control modal visibility
        onClose={() => setShowLogoutModal(false)} // Close modal handler
        onConfirm={handleLogout} // Confirm logout handler
        title="Confirm Logout"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        cancelText="Cancel"
        variant="default"
      />
    </div>
  );
}
