/**
 * Landing page surfaced when IRCTC sends the user back without an order
 * payload (e.g. the user closed the IRCTC tab mid-flow). Renders the same
 * branded header IRCTC will have shown them plus an inline copy of the search
 * tabs so they can resume immediately.
 */

import { Link } from "react-router-dom";

import { IrctcBrandedHeader } from "../BrandingProvider";
import IrctcSearchTabs from "../components/IrctcSearchTabs";

const HomeFallback = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-4 md:p-6">
        <IrctcBrandedHeader className="mb-4" />

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back from IRCTC
          </h1>
          <p className="text-gray-600 mt-2">
            Your IRCTC session ended. Search again below — your prior order
            journey is safe.
          </p>
        </div>

        <IrctcSearchTabs />

        <p className="text-center mt-6 text-sm text-gray-500">
          <Link
            to="/"
            className="text-teal-700 hover:text-teal-800 underline underline-offset-2"
          >
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
};

export default HomeFallback;
