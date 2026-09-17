const SIBLING_COUNT = 1;

// Always includes page 1, the last page, and up to SIBLING_COUNT pages on
// either side of the current page, collapsing any gaps into "ellipsis" — so
// the number of rendered buttons stays constant no matter how many pages
// there are in total.
export function getPageItems(page: number, pages: number): (number | "ellipsis")[] {
  const items: (number | "ellipsis")[] = [1];
  const start = Math.max(2, page - SIBLING_COUNT);
  const end = Math.min(pages - 1, page + SIBLING_COUNT);

  if (start > 2) items.push("ellipsis");
  for (let i = start; i <= end; i++) items.push(i);
  if (end < pages - 1) items.push("ellipsis");
  if (pages > 1) items.push(pages);

  return items;
}
