
"use client";

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
import type { Visit, User, Outlet } from "@/lib/types";
import { formatDistanceToNow, parseISO, format } from 'date-fns';

type VisitsTableProps = {
  visits: Visit[];
  users: User[];
  outlets: Outlet[];
};

export function VisitsTable({ visits, users, outlets }: VisitsTableProps) {
  const getUserName = (userId: number) => users.find(u => u.id === userId)?.name || 'Unknown User';
  const getOutletName = (outletId: string) => outlets.find(o => o.id === outletId)?.name || 'Unknown Outlet';
  
  if (visits.length === 0) {
    return <div className="text-center p-4 text-muted-foreground">No visits recorded yet.</div>;
  }
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Executive</TableHead>
          <TableHead className="hidden sm:table-cell">Outlet</TableHead>
          <TableHead className="text-right md:text-left">Duration</TableHead>
          <TableHead className="hidden md:table-cell">Entry Time</TableHead>
          <TableHead className="text-right">AI Check</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {visits.map((visit) => (
          <TableRow key={visit.id}>
            <TableCell>
              <div className="font-medium">{getUserName(visit.user_id)}</div>
            </TableCell>
            <TableCell className="hidden sm:table-cell">{getOutletName(visit.outlet_id)}</TableCell>
            <TableCell className="text-right md:text-left">
              {visit.duration_minutes ? (
                <Badge variant={visit.duration_minutes > 120 ? 'destructive' : 'secondary'}>
                  {visit.duration_minutes} mins
                </Badge>
              ) : (
                <Badge variant="outline">In Progress</Badge>
              )}
            </TableCell>
            <TableCell className="hidden md:table-cell">{format(parseISO(visit.entry_time), 'MMM d, h:mm a')}</TableCell>
            <TableCell className="text-right">
              <AnomalyDetector visit={visit} users={users} outlets={outlets} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
