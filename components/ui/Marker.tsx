/**
 * Section rule + index. Every section carries one, so the page reads as a
 * single numbered document rather than a stack of pages — and it supplies the
 * section's heading, since the oversized statements are content, not titles.
 */
export default function Marker({
  index,
  title,
  meta,
}: {
  index: string;
  title: string;
  meta?: string;
}) {
  return (
    <div className="marker mono">
      <span className="marker__idx" aria-hidden="true">
        {index}
      </span>
      <h2 className="marker__title">{title}</h2>
      {meta ? (
        <span className="marker__meta faint" aria-hidden="true">
          {meta}
        </span>
      ) : null}
    </div>
  );
}
