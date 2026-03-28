import { Shield, Lock, EyeOff, Server } from "lucide-react";

const PrivacyPolicy = () => {
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Privacy Policy</h1>
      
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-8 h-8 text-teal-600" />
          <h2 className="text-xl font-semibold text-gray-800">Your Privacy Matters</h2>
        </div>

        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <Lock className="w-6 h-6 text-gray-500 mt-0.5" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Data Collection</h3>
              <p className="text-gray-600">
                We collect only the necessary information required to provide our services, including your name, 
                contact details, and order history. Payment information is processed securely through our 
                PCI-DSS compliant payment processors.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <EyeOff className="w-6 h-6 text-gray-500 mt-0.5" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Data Usage</h3>
              <p className="text-gray-600">
                Your data is used solely for order processing, delivery coordination, and service improvement. 
                We never sell your information to third parties. Analytics are anonymized and aggregated to 
                enhance user experience.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <Server className="w-6 h-6 text-gray-500 mt-0.5" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Data Protection</h3>
              <p className="text-gray-600">
                We implement industry-standard security measures including encryption, access controls, and 
                regular audits. All data is stored on secure servers with restricted access. Our systems 
                are regularly updated to protect against vulnerabilities.
              </p>
            </div>
          </div>

          <div className="pt-4">
            <h3 className="text-lg font-medium text-gray-800 mb-2">Policy Updates</h3>
            <p className="text-gray-600">
              This policy may be updated periodically. Significant changes will be communicated through 
              our platform or via email. Continued use of our services constitutes acceptance of the 
              updated policy.
            </p>
          </div>

          <div className="pt-4 text-sm text-gray-500">
            <p>Last updated: June 15, 2023</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;