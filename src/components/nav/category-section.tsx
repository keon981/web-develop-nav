import { Badge } from "@/components/ui/badge"
import { CategoryIcon } from "@/components/nav/category-icon"
import { LinkCard } from "@/components/nav/link-card"
import type { NavCategory } from "@/lib/nav-types"

export function CategorySection({ category }: { category: NavCategory }) {
  return (
    <section
      id={category.id}
      aria-labelledby={`${category.id}-heading`}
      className="scroll-mt-20"
    >
      <h2
        id={`${category.id}-heading`}
        className="group/heading mb-4 flex items-center gap-2 text-xl font-semibold tracking-tight"
      >
        <CategoryIcon category={category} className="size-5 text-base" />
        <a
          href={`#${category.id}`}
          className="underline-offset-4 hover:underline"
        >
          {category.name}
        </a>
        <Badge variant="secondary" className="tabular-nums">
          {category.links.length}
        </Badge>
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {category.links.map((link) => (
          <LinkCard key={link.id} link={link} />
        ))}
      </div>
    </section>
  )
}
