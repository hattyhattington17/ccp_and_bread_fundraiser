export type KawaiiCardProps = {
  cardTitle: string;
  cardText: string;
  href: string;
  emoji: string;
};

export default function KawaiiCard({
  cardTitle,
  cardText,
  href,
  emoji,
}: KawaiiCardProps) {
  return (
    <div className="max-w-sm overflow-hidden rounded-xl bg-pink-100/90 shadow-lg hover:bg-pink-300/90">
      <a href={href} target="_blank" rel="noopener noreferrer">
        <div className="px-6 py-4">
          <span className="rounded-full bg-pink-200 text-5xl">{emoji}</span>
          <div className="text-xl font-bold">{cardTitle}</div>
          <p className="text-base text-gray-700">{cardText}</p>
        </div>
      </a>
    </div>
  );
}
