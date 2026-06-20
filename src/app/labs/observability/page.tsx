import { LabHub } from "@/components/lab-hub";
import { getLab } from "@/core/labs";

export default function ObservabilityLabOverview() {
  return <LabHub lab={getLab("observability")} />;
}
