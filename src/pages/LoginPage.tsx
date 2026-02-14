import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/context';
import { ClipboardCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export function LoginPage() {
  const { login } = useAppStore();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    await login(name.trim(), email.trim().toLowerCase());
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
            <ClipboardCheck size={28} className="text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Process + Control</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Store audit & compliance tracking
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Smith"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@company.com"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full mt-6">
                Sign in
              </Button>

              <p className="text-xs text-muted-foreground text-center mt-4">
                First user becomes admin. Others join as team members.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
