"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { UserRole } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';

export function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('sales_executive');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message,
      });
    } else {
        toast({
            title: "Login Successful",
            description: "Redirecting to your dashboard...",
        });
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
          avatar_url: `https://picsum.photos/seed/${email}/100/100`,
        },
      },
    });

    if (signUpError) {
      toast({
        variant: "destructive",
        title: "Signup Failed",
        description: signUpError.message,
      });
      setLoading(false)
      return;
    }

    if (signUpData.user) {
        const { error: insertError } = await supabase
            .from('users')
            .insert({
                auth_id: signUpData.user.id,
                name,
                email,
                role,
                avatar_url: `https://picsum.photos/seed/${email}/100/100`,
            });
        
        if (insertError) {
            toast({
                variant: "destructive",
                title: "Profile Creation Failed",
                description: insertError.message,
            });
        } else {
            toast({
                title: "Signup Successful!",
                description: "Please check your email to verify your account.",
            });
        }
    }
    setLoading(false);
  };

  return (
    <Card>
        <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
                <CardHeader>
                    <CardTitle>Welcome Back</CardTitle>
                    <CardDescription>Enter your credentials to access your dashboard.</CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="login-email">Email</Label>
                            <Input id="login-email" type="email" placeholder="m@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="login-password">Password</Label>
                            <Input id="login-password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Logging in...' : 'Login'}
                        </Button>
                    </CardContent>
                </form>
            </TabsContent>
            <TabsContent value="signup">
                <CardHeader>
                    <CardTitle>Create an Account</CardTitle>
                    <CardDescription>Join the SuccessArrow team.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSignup}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="signup-name">Full Name</Label>
                            <Input id="signup-name" type="text" placeholder="John Doe" required value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="signup-email">Email</Label>
                            <Input id="signup-email" type="email" placeholder="m@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="signup-password">Password</Label>
                            <Input id="signup-password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Select onValueChange={(value) => setRole(value as UserRole)} defaultValue={role}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="sales_executive">Sales Executive</SelectItem>
                                    <SelectItem value="distributor">Distributor</SelectItem>
                                    <SelectItem value="delivery_partner">Delivery Partner</SelectItem>
                                    <SelectItem value="admin">Admin (Requires Invite)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                             {loading ? 'Creating account...' : 'Create Account'}
                        </Button>
                    </CardContent>
                </form>
            </TabsContent>
        </Tabs>
    </Card>
  );
}
