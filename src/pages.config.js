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
import AdminDashboard from './pages/AdminDashboard';
import ConvDetail from './pages/ConvDetail';
import Explore from './pages/Explore';
import FollowSuggestions from './pages/FollowSuggestions';
import Home from './pages/Home';
import Landing from './pages/Landing';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import AboutConvs from './pages/AboutConvs';
import HowItWorks from './pages/HowItWorks';
import Features from './pages/Features';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import CommunityGuidelines from './pages/CommunityGuidelines';
import Documentation from './pages/Documentation';
import ApiPage from './pages/ApiPage';
import Support from './pages/Support';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminDashboard": AdminDashboard,
    "ConvDetail": ConvDetail,
    "Explore": Explore,
    "FollowSuggestions": FollowSuggestions,
    "Home": Home,
    "Landing": Landing,
    "Messages": Messages,
    "Notifications": Notifications,
    "Profile": Profile,
    "Settings": Settings,
    "AboutConvs": AboutConvs,
    "HowItWorks": HowItWorks,
    "Features": Features,
    "PrivacyPolicy": PrivacyPolicy,
    "TermsOfService": TermsOfService,
    "CommunityGuidelines": CommunityGuidelines,
    "Documentation": Documentation,
    "ApiPage": ApiPage,
    "Support": Support,
}

export const pagesConfig = {
    mainPage: "Landing",
    Pages: PAGES,
    Layout: __Layout,
};