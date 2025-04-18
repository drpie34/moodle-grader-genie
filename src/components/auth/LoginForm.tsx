import React, { useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/auth/use-auth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

type FormValues = z.infer<typeof formSchema>;

interface LoginFormProps {
  onSuccess?: () => void;
  onToggleMode: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onToggleMode }) => {
  const { signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    
    try {
      console.log("Starting login process for:", values.email);
      
      // For special cases like the demo account, no need to involve Supabase
      if (values.email === "demo@example.com" && values.password === "password") {
        console.log("Using demo login");
        
        // Clear any existing sessions first
        await signOut();
        
        // Create fake auth session
        localStorage.setItem('demo_user', JSON.stringify({
          email: values.email,
          account_tier: 'basic',
          grades_used: 25,
          grades_limit: 500
        }));
        
        toast.success('Logged in with demo account');
        
        // Force reload to apply new auth state
        setTimeout(() => {
          navigate('/');
          window.location.reload();
        }, 100);
        
        return;
      }
      
      // Show a message for any email other than demo for testing
      console.log("Using test-only mode - only demo@example.com is supported");
      toast.info("Using test mode: only demo@example.com is available");
      toast.error("Login with email: demo@example.com / password: password");
      setIsSubmitting(false);
      
      // Skip actual Supabase login for now since we're in demo mode
      return;
      
      /*
      // This would be the real implementation with Supabase:
      const { error } = await signIn(values.email, values.password);
      
      if (error) {
        console.error("Login error:", error);
        toast.error(error);
      } else {
        console.log("Login successful");
        toast.success('Logged in successfully');
        navigate('/');
      }
      */
    } catch (error) {
      toast.error('An unexpected error occurred');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Log in to your account</CardTitle>
        <CardDescription>
          Enter your email and password to access your saved assignments
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="email@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Logging in...' : 'Log in'}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <div className="text-sm text-center text-muted-foreground">
          Don't have an account yet?{' '}
          <Button variant="link" className="p-0 h-auto" onClick={onToggleMode}>
            Sign up
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default LoginForm;