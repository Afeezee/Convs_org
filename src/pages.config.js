/**
 * Page routing map for App.jsx.
 *
 * Each entry in PAGES becomes a route at `/{Name}` (see App.jsx). `mainPage`
 * is what visitors see at `/`. To add a page, drop the component in
 * `./pages/` and register it here — imports are explicit, not auto-scanned.
 * Layout wraps every page.
 *
 * The `/sign-in/*` route is hardcoded in App.jsx (Clerk owns its own sub-
 * routes) and does NOT belong in PAGES.
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