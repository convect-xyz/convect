import { createColumnHelper } from "@tanstack/react-table";
import { RouterOutputs } from "~/trpc/shared";

const columnHelper =
  createColumnHelper<RouterOutputs["fuunctions"]["getLogs"][0]>();

export const columns = [
  columnHelper.accessor("time", {
    header: () => "Timestamp",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("invocation_id", {
    header: () => "ID",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("log_level", {
    header: () => "Level",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("log_message", {
    header: () => "Message",
    cell: (info) => info.getValue(),
  }),
];
