import { useState } from "react";
import {
  Search,

  MoreHorizontal,
  FileText,

} from "lucide-react";

export default function MediaFilesUI() {
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [searchBy, setSearchBy] = useState("Search By User ID");
  

  const mediaFiles = [
    {
      id: 1,
      file: "/api/placeholder/60/40",
      userId: "#58",
      url: "/relswad.in/uploads/25/05/200...",
      directory: "uploads/25/05/",
      uploadedAt: "2 weeks ago",
    },
    {
      id: 2,
      file: "/api/placeholder/60/40",
      userId: "#58",
      url: "/relswad.in/uploads/25/05/200...",
      directory: "uploads/25/05/",
      uploadedAt: "2 weeks ago",
    },
    {
      id: 3,
      file: "/api/placeholder/60/40",
      userId: "#58",
      url: "/relswad.in/uploads/25/05/200...",
      directory: "uploads/25/05/",
      uploadedAt: "2 weeks ago",
    },
    {
      id: 4,
      file: "/api/placeholder/60/40",
      userId: "#58",
      url: "/relswad.in/uploads/25/05/200...",
      directory: "uploads/25/05/",
      uploadedAt: "2 weeks ago",
    },
    {
      id: 5,
      file: "/api/placeholder/60/40",
      userId: "#58",
      url: "/relswad.in/uploads/25/05/200...",
      directory: "uploads/25/05/",
      uploadedAt: "2 weeks ago",
    },
    {
      id: 6,
      file: "/api/placeholder/60/40",
      userId: "#75",
      url: "/relswad.in/uploads/25/05/682...",
      directory: "uploads/25/05/",
      uploadedAt: "2 weeks ago",
    },
    {
      id: 7,
      file: "/api/placeholder/60/40",
      userId: "#58",
      url: "/relswad.in/uploads/25/05/682...",
      directory: "uploads/25/05/",
      uploadedAt: "3 weeks ago",
    },
    {
      id: 8,
      file: "/api/placeholder/60/40",
      userId: "#1",
      url: "/relswad.in/uploads/25/04/160...",
      directory: "uploads/25/04/",
      uploadedAt: "1 month ago",
    },
  ];

  

  const handleSelectAll = (checked: any) => {
    if (checked) {
      setSelectedFiles(new Set(mediaFiles.map((file) => file.id)));
    } else {
      setSelectedFiles(new Set());
    }
  };

  const handleSelectFile = (fileId: any, checked: boolean) => {
    const newSelected = new Set(selectedFiles);
    if (checked) {
      newSelected.add(fileId);
    } else {
      newSelected.delete(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const isAllSelected = selectedFiles.size === mediaFiles.length;
  const isIndeterminate =
    selectedFiles.size > 0 && selectedFiles.size < mediaFiles.length;

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white">
                <option>Select Action</option>
                <option>Delete Selected</option>
                <option>Move to Folder</option>
              </select>
              <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
                Apply
              </button>
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 w-64"
                />
              </div>
              <select
                value={searchBy}
                onChange={(e) => setSearchBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
              >
                <option>Search By User ID</option>
                <option>Search By Directory</option>
                <option>Search By Date</option>
              </select>
              <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
                Search
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(input) => {
                          if (input) input.indeterminate = isIndeterminate;
                        }}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User Id
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Url
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Directory
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Uploaded At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {mediaFiles.map((file) => (
                    <tr
                      key={file.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedFiles.has(file.id)}
                          onChange={(e) =>
                            handleSelectFile(file.id, e.target.checked)
                          }
                          className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-16 h-12 bg-gray-200 rounded-lg overflow-hidden">
                          <div className="w-full h-full bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-teal-500" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-teal-600 font-medium hover:text-teal-800 cursor-pointer">
                          {file.userId}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-teal-600 hover:text-teal-800 cursor-pointer text-sm">
                          {file.url}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {file.directory}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {file.uploadedAt}
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-gray-400 hover:text-gray-600 transition-colors">
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-600">
              Showing {mediaFiles.length} results
            </div>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                Previous
              </button>
              <button className="px-3 py-2 bg-teal-600 text-white rounded-lg">
                1
              </button>
              <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                2
              </button>
              <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                Next
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
