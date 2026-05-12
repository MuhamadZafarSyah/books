import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import Link from "next/link";

export function QuickActions() {
  return (
    <div className="flex items-center gap-2">
      <Button
        asChild
        size="sm"
        className="cursor-pointer gap-1.5 rounded-full shadow-sm transition-all duration-200 hover:shadow-md"
      >
        <Link href="/dashboard/shelf">
          <Plus aria-hidden="true" className="size-3.5" />
          Tambah Buku
        </Link>
      </Button>
      <Button
        asChild
        size="sm"
        variant="outline"
        className="cursor-pointer gap-1.5 rounded-full transition-colors duration-200"
      >
        <Link href="/dashboard/explore">
          <Search aria-hidden="true" className="size-3.5" />
          Jelajahi
        </Link>
      </Button>
    </div>
  );
}
