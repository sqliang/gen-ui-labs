import { LabHub } from "@/components/lab-hub";
import { getLab } from "@/core/labs";

export default function WorkbenchLabOverview() {
  return <LabHub lab={getLab("workbench")} />;
}
