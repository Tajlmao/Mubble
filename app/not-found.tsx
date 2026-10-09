import Link from "next/link";
import Brand from "@/components/Brand";
export default function NotFound() {
  return (
    <div className="boot-screen">
      <Brand />
      <p>This view could not be found.</p>
      <Link className="primary-button" href="/">
        Return to Mubble
      </Link>
    </div>
  );
}
