'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Copy,
  Check,
  Chrome,
  Info,
  Link,
  Terminal,
  ListTodo,
  ExternalLink,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface GoogleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GoogleFormDialog({ open, onOpenChange }: GoogleFormDialogProps) {
  const [copiedWebhook, setCopiedWebhook] = useState(false)
  const [copiedToken, setCopiedToken] = useState(false)
  const [copiedScript, setCopiedScript] = useState(false)
  
  const [secretToken, setSecretToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin)
    }
  }, [])

  useEffect(() => {
    if (open) {
      const fetchConfig = async () => {
        setIsLoading(true)
        try {
          const res = await fetch('/api/integration/google-form/config')
          const json = await res.json()
          if (json.success && json.data) {
            setSecretToken(json.data.secretToken)
          } else {
            setSecretToken('CS_CRM_Form_Secret_2026!') // Fallback
          }
        } catch (err) {
          console.error('Error fetching Google Form integration config:', err)
          setSecretToken('CS_CRM_Form_Secret_2026!') // Fallback
        } finally {
          setIsLoading(false)
        }
      }
      fetchConfig()
    }
  }, [open])

  const webhookUrl = `${origin}/api/integration/google-form`

  const handleCopy = async (text: string, type: 'webhook' | 'token' | 'script') => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'webhook') {
        setCopiedWebhook(true)
        setTimeout(() => setCopiedWebhook(false), 2000)
        toast.success('Webhook URL copied to clipboard')
      } else if (type === 'token') {
        setCopiedToken(true)
        setTimeout(() => setCopiedToken(false), 2000)
        toast.success('Secret token copied to clipboard')
      } else if (type === 'script') {
        setCopiedScript(true)
        setTimeout(() => setCopiedScript(false), 2000)
        toast.success('Apps Script code copied to clipboard')
      }
    } catch (err) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const appsScriptCode = `/**
 * CS Department CRM - Google Form Integration Script
 * 
 * Instructions:
 * 1. Open your Google Form.
 * 2. Click the three dots (More) in the top-right corner.
 * 3. Select "Script editor".
 * 4. Delete any existing code and paste this script.
 * 5. Update WEBHOOK_URL and SECRET_TOKEN with your CRM details.
 * 6. Save the script (Ctrl+S or Cmd+S).
 * 7. Click on the Clock icon (Triggers) in the left sidebar.
 * 8. Click "+ Add Trigger".
 *    - Choose which function to run: onFormSubmit
 *    - Select event source: From form
 *    - Select event type: On form submit
 * 9. Click Save and authorize the script when prompted.
 */

// CONFIGURATION
var WEBHOOK_URL = "${webhookUrl}";
var SECRET_TOKEN = "${secretToken || 'CS_CRM_Form_Secret_2026!'}";

function onFormSubmit(e) {
  if (!e) {
    Logger.log("No event object found. Make sure to run this via form submit trigger.");
    return;
  }
  
  try {
    var itemResponses = e.response.getItemResponses();
    var payload = {
      secret: SECRET_TOKEN
    };
    
    // Dynamically map question titles (case-insensitive) to API parameters
    for (var i = 0; i < itemResponses.length; i++) {
      var itemResponse = itemResponses[i];
      var title = itemResponse.getItem().getTitle().toLowerCase().trim();
      var value = itemResponse.getResponse();
      
      if (!value) continue;
      
      // Match question titles
      if (title.includes("name") && !title.includes("father")) {
        payload.name = String(value);
      } else if (title.includes("email")) {
        payload.email = String(value);
      } else if (title.includes("student id") || title.includes("roll number") || title.includes("reg")) {
        payload.studentId = String(value);
      } else if (title.includes("program") || title.includes("degree")) {
        payload.program = String(value);
      } else if (title.includes("semester")) {
        payload.currentSemester = String(value);
      } else if (title.includes("enrollment year") || title.includes("admission year")) {
        payload.enrollmentYear = String(value);
      } else if (title.includes("session")) {
        payload.session = String(value);
      } else if (title.includes("batch")) {
        payload.batch = String(value);
      } else if (title.includes("mobile") || (title.includes("phone") && !title.includes("father"))) {
        payload.mobileNumber = String(value);
      } else if (title.includes("address")) {
        payload.address = String(value);
      } else if (title.includes("cnic")) {
        payload.cnic = String(value);
      } else if (title.includes("father name") || title.includes("father's name")) {
        payload.fatherName = String(value);
      } else if (title.includes("father phone") || title.includes("father's phone")) {
        payload.fatherPhone = String(value);
      } else if (title.includes("department")) {
        payload.departmentCode = String(value);
      }
    }
    
    // Use form submitter's email as fallback if not collected by form field
    if (!payload.email && e.response.getRespondentEmail()) {
      payload.email = e.response.getRespondentEmail();
    }
    
    // Post to Next.js API
    var options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    var response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    
    Logger.log("Status Code: " + responseCode);
    Logger.log("Response: " + responseText);
    
  } catch (error) {
    Logger.log("Error in onFormSubmit: " + error.toString());
  }
}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-3xl h-[85vh] flex flex-col p-6">
        <DialogHeader className="pb-2 border-b">
          <div className="flex items-center gap-2">
            <Chrome className="size-6 text-primary animate-pulse" />
            <DialogTitle className="text-xl font-bold">Google Form Integration</DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground mt-1">
            Connect a Google Form to automatically add students to the CRM upon submission.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="instructions" className="flex-1 flex flex-col mt-4 min-h-0">
          <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto mb-4 bg-muted/80 p-1 rounded-lg">
            <TabsTrigger value="instructions" className="flex items-center gap-1.5 py-2 font-medium">
              <ListTodo className="size-4" />
              <span>Instructions</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1.5 py-2 font-medium">
              <Link className="size-4" />
              <span>Settings</span>
            </TabsTrigger>
            <TabsTrigger value="code" className="flex items-center gap-1.5 py-2 font-medium">
              <Terminal className="size-4" />
              <span>Apps Script Code</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 relative">
            {/* INSTRUCTIONS TAB */}
            <TabsContent value="instructions" className="h-full m-0 focus-visible:outline-none">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">How to Setup the Integration</h3>
                    <p className="text-sm text-muted-foreground">
                      Follow these simple steps to link any Google Form with your CRM. Students' submissions will be saved instantly.
                    </p>
                  </div>

                  <div className="relative border-l border-primary/20 pl-6 ml-4 space-y-6">
                    {/* Step 1 */}
                    <div className="relative">
                      <div className="absolute -left-[35px] top-0 bg-primary text-primary-foreground size-7 rounded-full flex items-center justify-center text-xs font-semibold shadow-sm">
                        1
                      </div>
                      <h4 className="font-semibold text-sm mb-1">Create your Google Form</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Add questions for the information you want to collect. The script will automatically search for form fields matching these names:
                      </p>
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5 font-sans">
                        {[
                          { name: 'Student Name', desc: 'Mapped to name' },
                          { name: 'Email Address', desc: 'Mapped to email' },
                          { name: 'Student ID', desc: 'Mapped to studentId' },
                          { name: 'Program', desc: 'e.g. BS (Default)' },
                          { name: 'Current Semester', desc: 'e.g. 1' },
                          { name: 'Enrollment Year', desc: 'e.g. 2026' },
                          { name: 'Session', desc: 'e.g. 2024-2028' },
                          { name: 'Batch', desc: 'e.g. 2024' },
                          { name: 'Mobile Number', desc: 'Student mobile' },
                          { name: 'CNIC', desc: 'National ID' },
                          { name: 'Father Name', desc: 'Father\'s name' },
                          { name: 'Department Code', desc: 'e.g. CS' },
                        ].map((item, idx) => (
                          <div key={idx} className="bg-muted/50 p-2 rounded-md border border-muted-foreground/10">
                            <div className="font-medium text-[11px] text-foreground">{item.name}</div>
                            <div className="text-[10px] text-muted-foreground">{item.desc}</div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20 dark:text-yellow-400 p-2 rounded-md border border-yellow-500/10">
                        <AlertCircle className="size-4 shrink-0" />
                        <span>Name, Email, and Student ID/Reg No are mandatory fields.</span>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="relative">
                      <div className="absolute -left-[35px] top-0 bg-primary text-primary-foreground size-7 rounded-full flex items-center justify-center text-xs font-semibold shadow-sm">
                        2
                      </div>
                      <h4 className="font-semibold text-sm mb-1">Open Script Editor</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        In your Google Form editor, click the three vertical dots (More) in the top right header, and select <span className="font-semibold text-foreground">Script editor</span>. This opens the Google Apps Script project.
                      </p>
                    </div>

                    {/* Step 3 */}
                    <div className="relative">
                      <div className="absolute -left-[35px] top-0 bg-primary text-primary-foreground size-7 rounded-full flex items-center justify-center text-xs font-semibold shadow-sm">
                        3
                      </div>
                      <h4 className="font-semibold text-sm mb-1">Paste the Apps Script Code</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Go to the <span className="font-semibold text-foreground">Apps Script Code</span> tab in this dialog, copy the code snippet, paste it into the script editor, and save (press Ctrl+S or Cmd+S).
                      </p>
                    </div>

                    {/* Step 4 */}
                    <div className="relative">
                      <div className="absolute -left-[35px] top-0 bg-primary text-primary-foreground size-7 rounded-full flex items-center justify-center text-xs font-semibold shadow-sm">
                        4
                      </div>
                      <h4 className="font-semibold text-sm mb-1">Set Up Form Submission Trigger</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        In the Apps Script editor sidebar, click the clock icon (<span className="font-semibold text-foreground">Triggers</span>). Click the <span className="font-semibold text-foreground">+ Add Trigger</span> button in the bottom right, and select these options:
                      </p>
                      <ul className="list-disc list-inside text-xs text-muted-foreground mt-1 ml-1.5 space-y-0.5">
                        <li>Choose which function to run: <span className="font-semibold text-foreground">onFormSubmit</span></li>
                        <li>Select event source: <span className="font-semibold text-foreground">From form</span></li>
                        <li>Select event type: <span className="font-semibold text-foreground">On form submit</span></li>
                      </ul>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Save the trigger and authorize Google permissions. Your integration is live!
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* CONNECTION SETTINGS TAB */}
            <TabsContent value="settings" className="h-full m-0 focus-visible:outline-none">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Connection Settings</h3>
                    <p className="text-sm text-muted-foreground">
                      Use these parameters in your Apps Script setup to establish a secure link.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Webhook URL */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Webhook Endpoint URL</label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted p-3 rounded-md font-mono text-xs overflow-x-auto whitespace-nowrap border border-muted-foreground/10">
                          {webhookUrl}
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleCopy(webhookUrl, 'webhook')}
                          className="shrink-0"
                        >
                          {copiedWebhook ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        This is the endpoint where your Google Form will send JSON payloads.
                      </p>
                    </div>

                    {/* Secret Token */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Secret Token</label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted p-3 rounded-md font-mono text-xs overflow-x-auto whitespace-nowrap border border-muted-foreground/10">
                          {isLoading ? 'Loading token...' : secretToken}
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleCopy(secretToken, 'token')}
                          disabled={isLoading}
                          className="shrink-0"
                        >
                          {copiedToken ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Used to authorize requests coming from Google Forms. Anyone with this token can register students in the database.
                      </p>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 p-4 rounded-md border border-blue-500/10 flex items-start gap-2.5">
                      <Info className="size-5 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1">
                        <div className="font-semibold">Security Note</div>
                        <div className="leading-relaxed">
                          The secret token is stored in the environment variable <code className="font-mono bg-blue-100 dark:bg-blue-900/50 px-1 rounded">GOOGLE_FORM_SECRET_TOKEN</code>. To change it, update the variable in your CRM's configuration/environment files.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* APPS SCRIPT CODE TAB */}
            <TabsContent value="code" className="h-full m-0 focus-visible:outline-none flex flex-col">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-semibold">Copy Apps Script Snippet</h3>
                  <p className="text-xs text-muted-foreground">Paste this code directly inside Google Apps Script editor.</p>
                </div>
                <Button
                  onClick={() => handleCopy(appsScriptCode, 'script')}
                  size="sm"
                  className="gap-1.5"
                >
                  {copiedScript ? (
                    <>
                      <Check className="size-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-4" />
                      <span>Copy Script</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="flex-1 min-h-0 border rounded-md overflow-hidden bg-zinc-950 text-zinc-100 flex flex-col">
                <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex items-center justify-between shrink-0">
                  <span className="text-xs font-mono text-zinc-400">Code.gs</span>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-red-500" />
                    <span className="size-2.5 rounded-full bg-yellow-500" />
                    <span className="size-2.5 rounded-full bg-green-500" />
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <pre className="p-4 font-mono text-[11px] leading-relaxed selection:bg-zinc-800 selection:text-zinc-100 overflow-x-auto">
                    <code>{appsScriptCode}</code>
                  </pre>
                </ScrollArea>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="pt-4 border-t mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <a
            href="https://forms.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <span>Open Google Forms</span>
            <ExternalLink className="size-4" />
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
