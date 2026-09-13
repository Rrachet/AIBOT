import { Card, CardHeader } from '@/components/ui/card';

/**
 * Placeholder that holds the table's shape during the first fetch, so the page
 * does not collapse and then jump when data arrives.
 */
export function LeadsTableSkeleton() {
  return (
    <Card>
      <CardHeader title="All leads" subtitle="Loading leads…" />
      <div className="table-scroll">
        <table className="table" aria-hidden="true">
          <thead>
            <tr>
              <th scope="col">Lead</th>
              <th scope="col">Phone</th>
              <th scope="col">Source</th>
              <th scope="col">Status</th>
              <th scope="col">Updated</th>
            </tr>
          </thead>
          <tbody aria-busy="true">
            {[0, 1, 2, 3, 4].map((row) => (
              <tr key={row}>
                <td>
                  <div className="lead-name">
                    <span className="lead-avatar skeleton-block" />
                    <span style={{ flex: 1 }}>
                      <span className="skeleton" style={{ width: 132 }} />
                      <span className="skeleton" style={{ width: 92, marginTop: 6 }} />
                    </span>
                  </div>
                </td>
                <td>
                  <span className="skeleton" style={{ width: 118 }} />
                </td>
                <td>
                  <span className="skeleton" style={{ width: 78 }} />
                </td>
                <td>
                  <span className="skeleton" style={{ width: 64 }} />
                </td>
                <td>
                  <span className="skeleton" style={{ width: 70 }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
