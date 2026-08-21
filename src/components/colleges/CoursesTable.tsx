import { Badge } from "@/components/ui/Badge";
import { formatDuration, formatNumber, formatRupees, titleCaseEnum } from "@/lib/format";
import type { CollegeDetail } from "@/lib/queries/college-detail";

/**
 * Courses offered, as a real table.
 *
 * A <table> rather than a grid of divs, because this genuinely is tabular
 * data. Screen readers announce row and column headers as you move through a
 * table, so a user can hear "Annual fee, 2,20,000" instead of a bare number
 * with no idea which column it came from. A div grid loses all of that.
 *
 * Fees show in full here rather than the compact "₹2.2 L" used on cards. This
 * is the page where someone is actually comparing costs, and a rounded figure
 * is not something to make that decision on.
 */
export function CoursesTable({ courses }: { courses: CollegeDetail["courses"] }) {
  if (courses.length === 0) {
    return <p className="text-sm text-text-secondary">No course information available yet.</p>;
  }

  return (
    // The wrapper scrolls, not the page. Without this a wide table forces the
    // whole document to scroll sideways on a phone, which breaks every other
    // section on the page too.
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border-subtle">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="bg-surface-sunken text-left">
            <th scope="col" className="px-4 py-3 font-semibold">
              Course
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Duration
            </th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">
              Annual fee
            </th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">
              Seats
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Exams accepted
            </th>
          </tr>
        </thead>
        <tbody>
          {courses.map((course) => (
            <tr key={course.id} className="border-t border-border-subtle">
              {/* scope="row" marks this cell as the row's label, so a screen
                  reader repeats the course name when reading later cells. */}
              <th scope="row" className="px-4 py-3 text-left font-medium">
                {course.name}
                <span className="mt-0.5 block text-xs font-normal text-text-muted">
                  {titleCaseEnum(course.degree)} · {titleCaseEnum(course.stream)}
                </span>
              </th>
              <td className="px-4 py-3 whitespace-nowrap text-text-secondary">
                {formatDuration(course.durationMonths)}
              </td>
              {/* tabular-nums makes digits equal width, so the rupee columns
                  line up vertically and can be compared at a glance. */}
              <td className="px-4 py-3 text-right font-medium whitespace-nowrap tabular-nums">
                {formatRupees(course.annualFee)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-text-secondary">
                {formatNumber(course.totalSeats)}
              </td>
              <td className="px-4 py-3">
                <span className="flex flex-wrap gap-1">
                  {course.examsAccepted.map((exam) => (
                    <Badge key={exam} tone="neutral">
                      {exam}
                    </Badge>
                  ))}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
