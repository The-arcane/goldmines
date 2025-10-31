import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AnomalyDetector } from "./anomaly-detector";
import type { Visit } from "@/lib/types";
import { users, outlets } from "@/lib/data";
import { formatDistanceToNow, parseISO } from 'date-fns';

type VisitsTableProps = {
  visits: Visit[];
};

export function VisitsTable({ visits }: VisitsTableProps) {
  const getUserName = (userId: string) => users.find(u => u.id === userId)?.name || 'Unknown User';
  const getOutletName = (outletId: string) => outlets.find(o => o.id === outletId)?.name || 'Unknown Outlet';
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Executive</TableHead>
          <TableHead className="hidden sm:table-cell">Outlet</TableHead>
          <TableHead className="hidden sm:table-cell">Duration</TableHead>
          <TableHead className="text-right">Time</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {visits.map((visit) => (
          <TableRow key={visit.id}>
            <TableCell>
              <div className="font-medium">{getUserName(visit.user_id)}</div>
            </TableCell>
            <TableCell className="hidden sm:table-cell">{getOutletName(visit.outlet_id)}</TableCell>
            <TableCell className="hidden sm:table-cell">
              {visit.duration ? (
                <Badge variant={visit.duration > 120 ? 'destructive' : 'secondary'}>
                  {visit.duration} mins
                </Badge>
              ) : (
                <Badge variant="outline">In Progress</Badge>
              )}
            </TableCell>
            <TableCell className="text-right">{formatDistanceToNow(parseISO(visit.entry_time), { addSuffix: true })}</TableCell>
            <TableCell className="text-right">
              <AnomalyDetector visit={visit} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
