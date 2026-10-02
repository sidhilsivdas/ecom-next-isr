import { categoryStyle } from "@/lib/ui";

const sizes = {
  sm: { box: "size-16 rounded-xl", emoji: "text-3xl" },
  md: { box: "aspect-square rounded-2xl", emoji: "text-5xl transition-transform duration-300 group-hover:scale-110" },
  lg: { box: "aspect-square rounded-3xl", emoji: "text-8xl sm:text-9xl" },
};

export function ProductImage({ category, size = "md" }: { category: string; size?: keyof typeof sizes }) {
  const style = categoryStyle(category);
  return (
    <div className={`grid shrink-0 place-items-center bg-gradient-to-br ${style.gradient} ${sizes[size].box}`} aria-hidden>
      <span className={sizes[size].emoji}>{style.emoji}</span>
    </div>
  );
}
