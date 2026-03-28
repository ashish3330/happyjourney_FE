import { ChevronLeft, ChevronRight } from "lucide-react";
import { FC, useEffect } from "react";
import ReactPaginate from "react-paginate";

interface PaginationProps {
  numOfPages: number;
  pageNo: number;
  pageSize: number;
  handlePageClick: (selectedItem: { selected: number }) => void;
  totalItems: number;
  from: number;
  to: number;
}

const Pagination: FC<PaginationProps> = ({ numOfPages, from, to, pageNo, handlePageClick, totalItems }) => {
  useEffect(() => {
    console.error = () => {};
  }, []);

  if (numOfPages === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 py-2">
      {/* Result count */}
      <p className="text-sm text-gray-500">
        Showing{" "}
        <span className="font-semibold text-gray-800">{from}</span>
        {" – "}
        <span className="font-semibold text-gray-800">{to}</span>
        {" of "}
        <span className="font-semibold text-gray-800">{totalItems}</span>
        {" results"}
      </p>

      {/* Pages */}
      <ReactPaginate
        containerClassName="flex items-center gap-1"
        pageClassName=""
        pageLinkClassName="min-w-[36px] h-9 flex items-center justify-center rounded-lg text-sm font-semibold text-gray-600 hover:bg-teal-50 hover:text-teal-700 transition-colors border border-transparent hover:border-teal-200"
        activeClassName=""
        activeLinkClassName="!bg-teal-600 !text-white !border-teal-600 shadow-sm"
        previousClassName=""
        previousLinkClassName="h-9 px-2 flex items-center justify-center rounded-lg text-gray-500 hover:bg-teal-50 hover:text-teal-700 border border-transparent hover:border-teal-200 transition-colors"
        nextClassName=""
        nextLinkClassName="h-9 px-2 flex items-center justify-center rounded-lg text-gray-500 hover:bg-teal-50 hover:text-teal-700 border border-transparent hover:border-teal-200 transition-colors"
        disabledClassName="opacity-30 pointer-events-none"
        breakLabel={<span className="px-1 text-gray-400 text-sm select-none">…</span>}
        breakClassName=""
        nextLabel={<ChevronRight className="w-4 h-4" />}
        previousLabel={<ChevronLeft className="w-4 h-4" />}
        forcePage={pageNo - 1}
        onPageChange={handlePageClick}
        pageRangeDisplayed={3}
        marginPagesDisplayed={1}
        pageCount={numOfPages}
        renderOnZeroPageCount={null}
      />
    </div>
  );
};

export default Pagination;
