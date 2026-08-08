import { FailurePage } from "@/components/failure-page";

// Styles the `notFound()` calls the [id] detail routes already make — before
// this file existed they rendered Next's unstyled default 404.
export default function NotFound() {
  return (
    <FailurePage
      kicker="Toprock CRM"
      title="Not found"
      message="We couldn't find that page. If you followed a link to a record, it may have been deleted or merged into another account."
    />
  );
}
