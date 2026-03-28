import { useEffect, useState } from "react";
import api from "../utils/axios";
import { Plus, Search } from "lucide-react";
import LoaderModal from "../components/LoaderModal";
import Pagination from "../components/Pagination";

const Menus = () => {
  const [listData] = useState([]);
  const [loading] = useState(false);
 
  const [page, setPage] = useState({
    current_page: 1,
    to: 0,
    total: 0,
    from: 0,
    per_page: 10,
    remainingPages: 0,
    last_page: 0,
  });

  const handlePageClick = (e: any) => {
    if (!loading) {
      setPage((prev) => ({ ...prev, current_page: e.selected + 1 }));
    }
  };

  const getData = async () => {
    const res = await api.get(`vendors?page=0&size=1`);
    console.log(res);
  };

  useEffect(() => {
    getData();
  }, []);
  <div>
    {loading ? (
      <LoaderModal />
    ) : (
      <div className="h-full w-full">
        <div className="h-36 flex justify-between items-center bg-white px-10">
          <div className="">
            <div className="flex gap-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-1 rtl:inset-r-0 rtl:right-0 flex items-center ps-3 pointer-events-none">
                  <Search className="size-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="searchQuery"
                  className="max-w-md p-2 ps-10 text-sm text-gray-900 border border-gray-300 rounded-3xl outline-none"
                  placeholder="Search "
                  // onChange={(e: any) => setSearch(e.target.value)}
                />

                <select
                  value={page.per_page}
                  // onChange={handleSelectChange}
                  className="border border-gray-300 rounded-lg px-4 py-2 ml-3"
                >
                  <option value={10}>10 Records Per Page</option>
                  <option value={25}>25 Records Per Page</option>
                  <option value={50}>50 Records Per Page</option>
                </select>
              </div>
            </div>
          </div>
          <div>
            <div className="flex gap-2">
              <div
                // onClick={() => {
                //   setModalMode("add");
                //   setOpenAdd(true);
                // }}
                className="flex justify-center items-center py-1.5 px-3 gap-2 bg-[#6672fe] text-white rounded-lg font-light shadow-lg cursor-pointer"
              >
                <Plus />
                Add
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 p-3">
          {listData.length > 0 ? (
            <div className="p-4 bg-white">
              <table className="min-w-full border-separate">
                <thead className="w-full ">
                  <tr className=" rounded-md w-full text-center py-4">
                    <th className="px-2 text-sm py-3  font-medium text-black ">
                      {/* Batch No. */}
                      Sr. No.
                    </th>
                    <th className="px-2 text-sm py-3  font-medium text-black tracking-wider ">
                      Street Num Name
                    </th>
                    <th className="px-2 text-sm py-3  font-medium text-black tracking-wider ">
                      Skill Type
                    </th>
                    <th className="px-2 text-sm py-3  font-medium text-black tracking-wider ">
                      Category
                    </th>
                    <th className="px-2 text-sm py-3  font-medium text-black tracking-wider ">
                      Street Num Type
                    </th>
                    <th className="px-2 text-sm py-3  font-medium text-black tracking-wider ">
                      Employee Count
                    </th>
                    <th className="px-2 text-sm py-3  font-medium text-black tracking-wider ">
                      Staff Count
                    </th>
                    {/* <th className="px-2 text-sm py-3  font-medium text-black tracking-wider ">
                        Street Num Count
                      </th> */}
                    <th className="px-2 text-sm py-3  font-medium text-black tracking-wider ">
                      Street Num Type
                    </th>
                    <th className="px-2 text-sm py-3  font-medium text-black tracking-wider ">
                      Street Num Department
                    </th>
                    <th className="px-2 text-sm py-3  font-medium text-black tracking-wider ">
                      Process
                    </th>
                    <th className="px-2 text-sm py-3  font-medium text-black tracking-wider ">
                      Street Num Date
                    </th>
                    {/* <th className="px-2 text-sm py-3  font-medium text-black tracking-wider ">
                        Street Num Time
                      </th> */}
                    <th className="px-2 text-sm py-3  font-medium text-black tracking-wider ">
                      Status
                    </th>
                    <th className="px-2 text-sm py-3 text-center font-medium text-black tracking-wider  ">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {listData.map((item: any, index) => (
                    <tr
                      key={index}
                      className="text-center bg-white shadow-md text-sm"
                    >
                      <td className="px-2  py-4 font-medium text-black  rounded-tl-lg rounded-bl-lg">
                        {/* {item.batch_id} */}{" "}
                        {(page.current_page - 1) * page.per_page + index + 1}
                      </td>
                      <td className="px-2  py-4 font-medium text-black ">
                        {item.training_name}
                      </td>
                      <td className="px-2  py-4 font-medium text-black ">
                        {item.skill_type === 1
                          ? "Knowledge"
                          : item.skill_type === 2
                          ? "Skill"
                          : "Both"}
                      </td>
                      <td className="px-2  py-4 font-medium text-black ">
                        {item.training_cat_name}
                      </td>
                      <td className="px-2  py-4 font-medium text-black ">
                        {item.training_type_name}
                      </td>
                      <td
                        // onClick={() => {
                        //   if (item.emp_count > 0) {
                        //     setModalLMode("EmpList");
                        //     setSelectedId(item.id);
                        //     setOpenLAdd(true);
                        //   }
                        // }}
                        className="text-center px-2 py-1 cursor-pointer"
                      >
                        <div className="flex justify-center items-center">
                          <div className="px-4 py-2 w-12 h-12 flex justify-center items-center border border-gray-200 bg-[#123884] text-white rounded-full">
                            {item.emp_count}
                          </div>
                        </div>
                      </td>
                      <td
                        // onClick={() => {
                        //   if (item.staff_count > 0) fetchStaffList(item.id);
                        // }}
                        className="text-center px-2 py-1 cursor-pointer"
                      >
                        <div className="flex justify-center items-center">
                          <div className="px-4 py-2 w-12 h-12 flex justify-center items-center border border-gray-200 bg-[#123884] text-white rounded-2xl">
                            {item.staff_count || 0}
                          </div>
                        </div>
                      </td>

                      {/* <td
                          onClick={() => {
                            setModalLMode("TrList");
                            setSelectedId(item.id);
                            setOpenLAdd(true);
                          }}
                          className="text-center px-2  py-1  cursor-pointer"
                        >
                          <div className="px-4 py-2  w-12 h-12 flex justify-center items-center border border-gray-200  bg-[#123884] text-white rounded-lg">
                            {item.trainer_count}
                          </div>
                        </td> */}
                      <td className="px-2  py-4 font-medium text-black ">
                        {item.trainer_type === 1 ? "Internal" : "External"}
                      </td>
                      <td className="px-2  py-4 font-medium text-black ">
                        {item.department_name}
                      </td>
                      <td className="px-2  py-4 font-medium text-black max-w-xs">
                        {item.process_names}
                      </td>
                      <td className="px-2  py-4 font-medium text-black">
                        {/* {moment(item.start_date).format("DD MMM YYYY")} */}
                      </td>
                      {/* <td className="px-2  py-4 font-medium text-black ">
                          {formatTo12Hour(item.from_time) +
                            " TO " +
                            formatTo12Hour(item.to_time)}
                        </td> */}
                      <td className="text-center px-2  py-1 font-medium text-black ">
                        <div className="flex flex-col justify-center items-center">
                          <label
                            className={`border rounded-md py-1 px-3 cursor-pointer ${
                              item.status === 0
                                ? "text-teal-600 bg-teal-100"
                                : item.status === 1
                                ? "text-white bg-teal-700"
                                : item.status === 2
                                ? "text-white bg-yellow-600"
                                : "text-green-600 bg-green-100"
                            }`}
                          >
                            {item.status === 0
                              ? "Start"
                              : item.status === 1
                              ? "In Process"
                              : item.status === 2
                              ? "Hold"
                              : "Completed"}
                          </label>

                          <div className="text-left text-nowrap text-sm mt-2">
                            {item.message}
                          </div>
                        </div>
                      </td>
                      <td className="px-2  py-4 font-medium  rounded-tr-lg rounded-br-lg ">
                        {/* <div className="flex gap-1 pr-3 justify-center items-center">
                            {actionsArray.some(
                              (action) => action.action === "Edit"
                            ) ? (
                              <img
                                onClick={() => handleEdit(item.id)}
                                src={edit_icon}
                                alt=""
                                className="cursor-pointer w-6 h-6 object-contain min-w-[24px]"
                              />
                            ) : null}

                            {actionsArray.some(
                              (action) => action.action === "Delete"
                            ) ? (
                              <img
                                onClick={() => {
                                  setSelectedId(item.id);
                                  setOpen(true);
                                }}
                                src={delete_icon}
                                alt=""
                                className="cursor-pointer w-6 h-6 object-contain min-w-[24px]"
                              />
                            ) : null}
                            {actionsArray.some(
                              (action) => action.action === "view"
                            ) ? (
                              <img
                                onClick={() => {
                                  setSelectedId(item.id);
                                  setPreModal(true);
                                }}
                                src={preview_icon}
                                alt=""
                                className="cursor-pointer w-6 h-6 object-contain min-w-[24px]"
                              />
                            ) : null}
                          </div> */}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="w-full mt-4">
                <Pagination
                  numOfPages={page.last_page}
                  pageNo={page.current_page}
                  pageSize={page.per_page}
                  handlePageClick={handlePageClick}
                  totalItems={page.total}
                  from={page.from}
                  to={page.to}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center mt-12">
              <h2 className="text-xl font-semibold mb-4">No DATA Found</h2>
            </div>
          )}
        </div>
      </div>
    )}
  </div>;
};

export default Menus;
