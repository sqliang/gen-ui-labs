import { LabHub } from "@/components/lab-hub";
import { getLab } from "@/core/labs";

export default function CodegenLabOverview() {
  return <LabHub lab={getLab("codegen")} />;
}
