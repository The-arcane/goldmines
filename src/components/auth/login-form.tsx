"use client";

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import type { UserRole } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Rocket, Shield, Truck, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const roles: { value: UserRole; label: string; icon: React.ElementType }[] = [
  { value: 'admin', label: 'Admin', icon: Shield },
  { value: 'sales_executive', label: 'Sales Executive', icon: Rocket },
  { value: 'distributor', label: 'Distributor', icon: UserCheck },
  { value: 'delivery_partner', label: 'Delivery Partner', icon: Truck },
];

export function LoginForm() {
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(selectedRole);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select a Role to Login</CardTitle>
        <CardDescription>This is a demo. Select a role to view the corresponding dashboard.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <RadioGroup
            value={selectedRole}
            onValueChange={(value: string) => setSelectedRole(value as UserRole)}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {roles.map(({ value, label, icon: Icon }) => (
              <Label
                key={value}
                htmlFor={value}
                className={cn(
                  "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                  selectedRole === value && "border-primary"
                )}
              >
                <RadioGroupItem value={value} id={value} className="sr-only" />
                <Icon className="mb-3 h-7 w-7" />
                <span className="font-semibold">{label}</span>
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full">
            Login
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
