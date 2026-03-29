import { FC } from "react";

const LoaderModal: FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl px-10 py-8 shadow-2xl flex flex-col items-center gap-4">
        {/* Double-ring spinner */}
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-4 border-teal-100" />
          <div className="absolute inset-0 rounded-full border-4 border-teal-500 border-t-transparent animate-spin" />
          <div className="absolute inset-[6px] rounded-full border-2 border-teal-200 border-b-transparent animate-spin" style={{ animationDirection: "reverse", animationDuration: "0.6s" }} />
        </div>
        <div className="text-center">
          <p className="text-gray-800 font-semibold text-sm">Please wait…</p>
          <p className="text-gray-400 text-xs mt-0.5">Fetching your data</p>
        </div>
      </div>
    </div>
  );
};

export default LoaderModal;
