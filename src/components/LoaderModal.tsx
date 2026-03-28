import { FC } from "react";

const LoaderModal: FC = () => {
  return (
    <div className="fixed inset-0  flex justify-center items-center z-50">
      <div className="bg-white rounded-2xl p-6 shadow-xl flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-700 text-base">Wait for a moment</p>
      </div>
    </div>
  );
};

export default LoaderModal;
