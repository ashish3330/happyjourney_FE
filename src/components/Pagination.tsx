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

const Pagination: FC<PaginationProps> = (props) => {
  const { numOfPages, from, to, pageNo, handlePageClick, totalItems } = props;

  useEffect(() => {
    console.error = () => {}; // Suppress the console.error output
  }, []);

  return (
    <div
      className={`w-full flex flex-row justify-between items-center  ${
        numOfPages === 0 ? "sr-only" : ""
      } `}
    >
      <div className="pl-4">
        <p className="text-sm text-gray-700">
          Showing <span className="font-medium">{from}</span> to{" "}
          <span className="font-medium">{to}</span> of
          <span className="font-medium"> {totalItems}</span> results
        </p>
      </div>
      <div>
        <ReactPaginate
          containerClassName="flex justify-center items-center gap-1 mx-4 mb-3"
          activeClassName="bg-[#133885] text-white px-3 py-1 cursor-pointer"
          pageClassName="px-3 py-1 rounded-md bg-gary cursor-pointer"
          previousClassName="px-3 py-1 cursor-pointer"
          nextClassName="px-3 py-1 cursor-pointer"
          disabledClassName="cursor-not-allowed"
          breakLabel="..."
          nextLabel={
            numOfPages > pageNo && (
              <button className="mt-2">
                <ChevronRight className="size-7 text-gray-900" />
              </button>
            )
          }
          forcePage={pageNo - 1}
          onPageChange={handlePageClick}
          pageRangeDisplayed={0}
          pageCount={numOfPages}
          previousLabel={
            from > 1 && (
              <button className="mt-2">
                <ChevronLeft className="size-7 text-gray-900" />
              </button>
            )
          }
          renderOnZeroPageCount={null}
        />
      </div>
    </div>
  );
};

export default Pagination;