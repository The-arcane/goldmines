
"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Outlet } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SalespersonMap } from "@/components/salesperson/live-map";

export default function RoutePlanPage() {
    const { user, refetchKey } = useAuth();
    const [outlets, setOutlets] = useState<Outlet[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchOutlets = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        const { data, error } = await supabase
            .from("outlets")
            .select("*"); // Simplified: fetch all outlets. Can be scoped to assigned outlets later.

        if (error) {
            console.error("Error fetching outlets for route plan:", error);
        } else {
            setOutlets(data || []);
        }
        setLoading(false);
    }, [user]);

    useEffect(() => {
        if(user) {
            fetchOutlets();
        }
    }, [user, fetchOutlets, refetchKey]);

    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <Card>
                <CardHeader>
                    <CardTitle>Daily Route Plan</CardTitle>
                    <CardDescription>
                        An overview of your assigned outlets for the day.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SalespersonMap outlets={outlets} loading={loading} />
                </CardContent>
            </Card>
        </main>
    );
}
