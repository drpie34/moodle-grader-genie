import React from 'react';
import { useAuth } from '@/hooks/auth/use-auth';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { TIER_LIMITS, TIER_PRICES } from '@/types/auth';
import { Progress } from '@/components/ui/progress';

const ProfilePage: React.FC = () => {
  const { authState, signOut } = useAuth();
  const navigate = useNavigate();
  const { user, profile } = authState;

  // Redirect if not logged in
  React.useEffect(() => {
    if (!authState.isLoading && !user) {
      navigate('/login');
    }
  }, [authState.isLoading, user, navigate]);

  if (authState.isLoading || !user || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <p>Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  // Calculate usage percentage
  const usagePercentage = Math.min(100, Math.round((profile.grades_used / profile.grades_limit) * 100));
  
  // Determine plan
  const currentPlan = profile.account_tier;
  const planInfo = {
    free: {
      name: 'Free',
      description: 'Basic access with limited grades',
      price: '$0',
      limit: TIER_LIMITS.free
    },
    basic: {
      name: 'Basic',
      description: 'More grades for regular users',
      price: `$${TIER_PRICES.basic}/month`,
      limit: TIER_LIMITS.basic
    },
    premium: {
      name: 'Premium',
      description: 'Unlimited grades for power users',
      price: `$${TIER_PRICES.premium}/month`,
      limit: TIER_LIMITS.premium
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-3xl space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
            <p className="text-muted-foreground">Manage your account and subscription</p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Your account details and usage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Account created</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(profile.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Current plan</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {planInfo[currentPlan].name} ({planInfo[currentPlan].price})
                </p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Usage</p>
                  <p className="text-sm text-muted-foreground">
                    {profile.grades_used} of {profile.grades_limit} grades used
                  </p>
                </div>
                <Progress value={usagePercentage} className="h-2" />
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={() => signOut().then(() => navigate('/'))}>
                Sign out
              </Button>
            </CardFooter>
          </Card>
          
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Subscription Plans</h2>
            <p className="text-muted-foreground mb-4">Choose the right plan for your needs</p>
            
            <div className="grid gap-4 md:grid-cols-3">
              {Object.entries(planInfo).map(([key, plan]) => (
                <Card key={key} className={currentPlan === key ? 'border-primary' : ''}>
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{plan.price}</p>
                    <p className="text-sm text-muted-foreground mt-2">{plan.limit} grades per month</p>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant={currentPlan === key ? 'outline' : 'default'}
                      className="w-full" 
                      disabled={currentPlan === key}
                    >
                      {currentPlan === key ? 'Current Plan' : 'Upgrade'}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;