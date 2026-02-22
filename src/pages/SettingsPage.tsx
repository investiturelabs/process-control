import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/context';
import { Building2, Save, Database, Download, HardDrive, History } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { createBackup, downloadBackup } from '@/lib/backup';
import { track } from '@/lib/analytics';
import { captureException } from '@/lib/errorTracking';

export function SettingsPage() {
  const { company, setCompany, currentUser, departments, generateTestData, users, sessions, invitations } =
    useAppStore();
  const isAdmin = currentUser?.role === 'admin';
  const navigate = useNavigate();

  const [companyName, setCompanyName] = useState(company?.name || '');
  const [logoUrl, setLogoUrl] = useState(company?.logoUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [generatingData, setGeneratingData] = useState(false);
  const [dataGenerated, setDataGenerated] = useState(false);

  // Fix #41: Company name validation + Fix #34: URL validation
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = companyName.trim();
    if (!trimmedName) {
      setCompanyError('Company name is required.');
      return;
    }
    const trimmedUrl = logoUrl.trim();
    if (trimmedUrl && !trimmedUrl.startsWith('https://')) {
      setCompanyError('Logo URL must start with https://');
      return;
    }
    setCompanyError(null);
    setIsSaving(true);
    try {
      await setCompany({ id: '', name: trimmedName, logoUrl: trimmedUrl || undefined });
    } catch (err) {
      captureException(err);
      toast.error('Failed to save company settings.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold mb-2">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Only admins can modify settings.
        </p>
        {company && (
          <Card className="mt-6">
            <CardContent className="p-4">
              <p className="text-sm">
                <strong>Company:</strong> {company.name}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>

      {/* Company info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 size={16} className="text-muted-foreground" />
            Company
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveCompany}>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="companyName">Company name</Label>
                <Input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Your Company Name"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="logoUrl">Logo URL (optional)</Label>
                <Input
                  id="logoUrl"
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </div>
            {companyError && (
              <p className="text-sm text-red-600 mt-2" role="alert">{companyError}</p>
            )}
            <div className="mt-4 flex items-center gap-3">
              <Button type="submit" size="sm" className="gap-1.5" disabled={isSaving}>
                <Save size={14} />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Test data — dev only */}
      {import.meta.env.DEV && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Database size={16} className="text-muted-foreground" />
              Test Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Generate 6 months of sample audit data across all departments to preview charts and analytics.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={generatingData || dataGenerated}
              onClick={async () => {
                setGeneratingData(true);
                try {
                  await generateTestData();
                  setDataGenerated(true);
                } catch (err) {
                  captureException(err);
                  toast.error('Failed to generate test data.');
                } finally {
                  setGeneratingData(false);
                }
              }}
            >
              <Database size={14} />
              {generatingData ? 'Generating...' : dataGenerated ? 'Data generated' : 'Generate test data'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Data backup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <HardDrive size={16} className="text-muted-foreground" />
            Data Backup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Export all company data as JSON. Contains departments, questions, audit history, users, and invitations.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => {
              try {
                downloadBackup(createBackup({ company, users, departments, sessions, invitations }));
                track({ name: 'backup_exported', properties: {} });
                toast.success('Backup exported.');
              } catch (err) {
                captureException(err);
                toast.error('Failed to export backup.');
              }
            }}
          >
            <Download size={14} />
            Export backup
          </Button>
        </CardContent>
      </Card>

      {/* Activity log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <History size={16} className="text-muted-foreground" />
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            View a log of all administrative changes, role updates, and audit completions.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => navigate('/activity')}
          >
            <History size={14} />
            View activity log
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
