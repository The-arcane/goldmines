
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
import type { Visit, User, Outlet, Order } from "@/lib/types";
import { parseISO, format } from 'date-fns';

type VisitsTableProps = {
  visits: Visit[];
  users: User[];
  outlets: Outlet[];
  orders: Order[];
};

export function VisitsTable({ visits, users, outlets, orders }: VisitsTableProps) {
  const getUserName = (userId: number) => users.find(u => u.id === userId)?.name || 'Unknown User';
  const getOutletName = (outletId: string) => outlets.find(o => o.id === outletId)?.name || 'Unknown Outlet';
  
  const getVisitStatus = (visit: Visit) => {
    const orderPlacedDuringVisit = orders.some(order => 
      order.created_by_user_id === visit.user_id &&
      order.outlet_id === visit.outlet_id &&
      new Date(order.created_at) >= new Date(visit.entry_time) &&
      (visit.exit_time ? new Date(order.created_at) <= new Date(visit.exit_time) : true)
    );

    if (orderPlacedDuringVisit) {
      return { text: "Successful", variant: "default" as const };
    }
    
    if (visit.exit_time) {
      return { text: "Completed", variant: "secondary" as const };
    }

    return { text: "In Progress", variant: "outline" as const };
  };

  if (visits.length === 0) {
    return <div className="text-center p-4 text-muted-foreground">No visits recorded yet.</div>;
  }
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Executive</TableHead>
          <TableHead className="hidden sm:table-cell">Outlet</TableHead>
          <TableHead className="text-right md:text-left">Status</TableHead>
          <TableHead className="hidden md:table-cell">Entry Time</TableHead>
          <TableHead className="text-right">AI Check</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {visits.map((visit) => {
          const status = getVisitStatus(visit);
          return (
            <TableRow key={visit.id}>
              <TableCell>
                <div className="font-medium">{getUserName(visit.user_id)}</div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">{getOutletName(visit.outlet_id)}</TableCell>
              <TableCell className="text-right md:text-left">
                <Badge variant={status.variant}>
                  {status.text}
                </Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell">{format(parseISO(visit.entry_time), 'MMM d, h:mm a')}</TableCell>
              <TableCell className="text-right">
                <AnomalyDetector visit={visit} users={users} outlets={outlets} />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  );
}
