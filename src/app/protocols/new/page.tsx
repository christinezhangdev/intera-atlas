import { redirect } from "next/navigation";

/** Protocol upload lives on the wedge home */
export default function ProtocolNewPage() {
  redirect("/#rank");
}
