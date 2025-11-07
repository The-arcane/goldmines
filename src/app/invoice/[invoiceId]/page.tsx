
"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Invoice, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Printer, Download } from "lucide-react";
import { format } from "date-fns";

const BrandDetails = {
    name: "Success Arrow Superfoods Pvt Ltd",
    address: "456 FMCG Plaza, Corporate Towers, Gurgaon, Haryana, 122002",
    gst_number: "06AABCU9567L1Z5"
}

export default function InvoicePage({ params }: { params: { invoiceId: string } }) {
    const invoiceId = parseInt(use(params).invoiceId, 10);
    const router = useRouter();
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchInvoiceData = useCallback(async () => {
        setLoading(true);

        const { data, error } = await supabase
            .from('invoices')
            .select(`
                *,
                orders (
                    *,
                    outlets (name, address),
                    order_items (*, skus (name, product_code))
                ),
                stock_orders (
                    *,
                    distributors (name, address, gst_number),
                    stock_order_items (*, skus (name, product_code, units_per_case))
                )
            `)
            .eq('id', invoiceId)
            .single();

        if (error || !data) {
            console.error("Error fetching invoice:", error);
            router.push('/dashboard'); // Fallback redirect
        } else {
            setInvoice(data as Invoice);
        }
        setLoading(false);
    }, [invoiceId, router]);

    useEffect(() => {
        fetchInvoiceData();
    }, [fetchInvoiceData]);
    
    if (loading) {
        return <div className="flex h-screen w-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div></div>;
    }
    if (!invoice) {
        return <div className="flex h-screen w-full items-center justify-center"><p>Invoice not found.</p></div>;
    }

    const isStockOrderInvoice = !!invoice.stock_order_id;
    const order = isStockOrderInvoice ? invoice.stock_orders : invoice.orders;
    const items = isStockOrderInvoice ? order?.stock_order_items : order?.order_items;

    const seller = isStockOrderInvoice ? BrandDetails : order?.distributors;
    const buyer = isStockOrderInvoice ? order?.distributors : order?.outlets;
    
    // For stock orders, items are in cases. For retail, they are individual units.
    const getQuantityText = (item: any) => {
        if (isStockOrderInvoice) {
            return `${item.quantity} case${item.quantity > 1 ? 's' : ''}`;
        }
        return `${item.quantity} unit${item.quantity > 1 ? 's' : ''}`;
    }

    const getUnitPrice = (item: any) => {
         if (isStockOrderInvoice) {
            return item.case_price;
        }
        return item.unit_price;
    }

    return (
        <div className="bg-muted/40 p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Back</span>
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Print</Button>
                        <Button disabled><Download className="mr-2 h-4 w-4" /> Download PDF</Button>
                    </div>
                </div>

                <Card id="invoice-content" className="p-6 sm:p-10">
                    <CardHeader className="p-0">
                        <div className="flex justify-between items-start flex-wrap gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-primary">{seller?.name}</h1>
                                <p className="text-muted-foreground max-w-xs">{seller?.address}</p>
                                <p className="text-muted-foreground">GSTIN: {seller?.gst_number}</p>
                            </div>
                            <div className="text-right">
                                <h2 className="text-3xl font-bold uppercase">Invoice</h2>
                                <p className="text-muted-foreground">#{invoice.invoice_number}</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 mt-8">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <h3 className="font-semibold mb-2">Bill To:</h3>
                                <p className="font-medium">{buyer?.name}</p>
                                <p className="text-muted-foreground">{buyer?.address}</p>
                                {isStockOrderInvoice && <p className="text-muted-foreground">GSTIN: {buyer?.gst_number}</p>}
                            </div>
                            <div className="text-left sm:text-right">
                                 <div className="grid grid-cols-2 sm:grid-cols-[120px_1fr] gap-x-2 gap-y-1">
                                    <span className="font-semibold">Issue Date:</span>
                                    <span>{format(new Date(invoice.issue_date), "MMM d, yyyy")}</span>
                                    <span className="font-semibold">Order Date:</span>
                                    <span>{format(new Date(order!.order_date), "MMM d, yyyy")}</span>
                                    <span className="font-semibold">Order ID:</span>
                                    <span>#{order!.id}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="mt-8">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead className="text-center">Qty</TableHead>
                                        <TableHead className="text-right">Rate</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items?.map((item: any) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="font-medium">{item.skus.name}</div>
                                                <div className="text-xs text-muted-foreground">{item.skus.product_code}</div>
                                            </TableCell>
                                            <TableCell className="text-center">{getQuantityText(item)}</TableCell>
                                            <TableCell className="text-right font-mono">₹{getUnitPrice(item).toFixed(2)}</TableCell>
                                            <TableCell className="text-right font-mono">₹{item.total_price.toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                    <CardFooter className="flex-col items-end p-0 mt-8 space-y-2">
                        <div className="w-full sm:w-1/2 ml-auto grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                            <span className="text-muted-foreground">Subtotal:</span>
                            <span className="text-right font-mono">₹{invoice.total_amount.toFixed(2)}</span>
                             <span className="text-muted-foreground">Tax (GST):</span>
                            <span className="text-right font-mono">₹0.00</span>
                        </div>
                         <Separator className="my-4 sm:w-1/2 ml-auto" />
                         <div className="w-full sm:w-1/2 ml-auto grid grid-cols-2 gap-x-2 text-lg">
                            <span className="font-bold">Total Amount:</span>
                            <span className="text-right font-bold font-mono">₹{invoice.total_amount.toFixed(2)}</span>
                        </div>
                    </CardFooter>

                    <div className="mt-12 text-center text-xs text-muted-foreground">
                        <p>Thank you for your business!</p>
                        <p>This is a computer generated invoice and does not require a signature.</p>
                    </div>
                </Card>
            </div>
        </div>
    );
}

function Separator({className}: {className?: string}) {
    return <div className={cn("h-px w-full bg-border", className)}></div>
}
