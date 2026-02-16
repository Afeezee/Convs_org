/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AboutConvs from './pages/AboutConvs';
import AdminDashboard from './pages/AdminDashboard';
import ApiPage from './pages/ApiPage';
import CommunityGuidelines from './pages/CommunityGuidelines';
import ConvDetail from './pages/ConvDetail';
import Documentation from './pages/Documentation';
import Explore from './pages/Explore';
import Features from './pages/Features';
import FollowSuggestions from './pages/FollowSuggestions';
import Home from './pages/Home';
import HowItWorks from './pages/HowItWorks';
import Landing from './pages/Landing';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Support from './pages/Support';
import TermsOfService from './pages/TermsOfService';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AboutConvs": AboutConvs,
    "AdminDashboard": AdminDashboard,
    "ApiPage": ApiPage,
    "CommunityGuidelines": CommunityGuidelines,
    "ConvDetail": ConvDetail,
    "Documentation": Documentation,
    "Explore": Explore,
    "Features": Features,
    "FollowSuggestions": FollowSuggestions,
    "Home": Home,
    "HowItWorks": HowItWorks,
    "Landing": Landing,
    "Messages": Messages,
    "Notifications": Notifications,
    "PrivacyPolicy": PrivacyPolicy,
    "Profile": Profile,
    "Settings": Settings,
    "Support": Support,
    "TermsOfService": TermsOfService,
}

export const pagesConfig = {
    mainPage: "Landing",
    Pages: PAGES,
    Layout: __Layout,
};