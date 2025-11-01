
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Visit, User, Outlet } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VisitsTable } from "@/components/dashboard/admin/visits-table";

export default function VisitsPage() {
    const [visits, setVisits] = useState<Visit[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [outlets, setOutlets] = useState<Outlet[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const visitsPromise = supabase.from("visits").select("*").order("entry_time", { ascending: false });
            const usersPromise = supabase.from("users").select("*");
            const outletsPromise = supabase.from("outlets").select("*");

            const [visitsRes, usersRes, outletsRes] = await Promise.all([visitsPromise, usersPromise, outletsPromise]);
            
            if(visitsRes.data) setVisits(visitsRes.data as Visit[]);
            if(usersRes.data) setUsers(usersRes.data);
            if(outletsRes.data) setOutlets(outletsRes.data);

            setLoading(false);
        };

        fetchData();
    }, []);

    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="grid gap-4 md:grid-cols-2 md:gap-8">
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle>All Visit Logs</CardTitle>
                        <CardDescription>
                            A complete history of all sales executive visits.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center p-8">Loading all visits...</div>
                        ) : (
                            <VisitsTable visits={visits} users={users} outlets={outlets} />
                        )}
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
