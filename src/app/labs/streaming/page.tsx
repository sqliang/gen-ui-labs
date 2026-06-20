import { LabHub } from "@/components/lab-hub";
import { getLab } from "@/core/labs";

export default function StreamingLabOverview() {
  return <LabHub lab={getLab("streaming")} />;
}
