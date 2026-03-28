  import { Wallet, CreditCard, History, PlusCircle } from "lucide-react";

const WalletPage = () => {
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Wallet</h1>
      
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-700">Balance</h2>
          <Wallet className="text-teal-600" size={24} />
        </div>
        <p className="text-3xl font-bold text-gray-800">₹1,250.00</p>
        <button className="mt-4 flex items-center gap-2 text-teal-600 font-medium">
          <PlusCircle size={18} /> Add Money
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Payment Methods</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <CreditCard className="text-gray-600" />
              <div>
                <p className="font-medium">Credit Card</p>
                <p className="text-sm text-gray-500">•••• •••• •••• 4242</p>
              </div>
            </div>
            <button className="w-full flex items-center justify-center gap-2 text-teal-600 font-medium p-3 border border-dashed rounded-lg">
              <PlusCircle size={18} /> Add New Payment Method
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Recent Transactions</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 border-b">
              <div className="flex items-center gap-3">
                <History className="text-gray-400" size={18} />
                <div>
                  <p className="font-medium">Food Order</p>
                  <p className="text-sm text-gray-500">Today, 12:30 PM</p>
                </div>
              </div>
              <p className="font-medium text-red-500">-₹350.00</p>
            </div>
            <button className="w-full text-center text-teal-600 font-medium">
              View All Transactions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletPage;