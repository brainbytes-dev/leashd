"use client"

import { useState, useEffect } from "react"
import { useSession } from "@/lib/auth-client"
import { updateProfile, changePassword } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { TIMEZONES, TZ_OPTIONS, tzLabel } from "@/lib/timezones"

export default function SettingsPage() {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: session?.user?.name || "",
    timezone: "UTC",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  // Load the saved timezone preference (async, so no synchronous setState in effect).
  useEffect(() => {
    let active = true
    fetch("/api/leash/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data?.timezone)
          setFormData((f) => ({ ...f, timezone: data.timezone }))
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      if (!formData.name.trim()) {
        setError("Name cannot be empty")
        return
      }

      const result = await updateProfile({ name: formData.name })
      if (result.error) {
        setError(result.error)
        return
      }
      const tzRes = await fetch("/api/leash/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ timezone: formData.timezone }),
      })
      if (!tzRes.ok) {
        setError("Could not save timezone.")
        return
      }
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile")
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      if (!formData.currentPassword || !formData.newPassword) {
        setError("All password fields are required")
        return
      }

      if (formData.newPassword !== formData.confirmPassword) {
        setError("New passwords do not match")
        return
      }

      if (formData.newPassword.length < 8) {
        setError("New password must be at least 8 characters")
        return
      }

      const result = await changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      })

      if (result.error) {
        setError(result.error)
      } else {
        setFormData({
          ...formData,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        })
        setIsSaved(true)
        setTimeout(() => setIsSaved(false), 2000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your profile information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={session?.user?.email || ""}
                  disabled
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <select
                  id="timezone"
                  value={formData.timezone}
                  disabled={isLoading}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"
                >
                  {(TIMEZONES.includes(formData.timezone)
                    ? TZ_OPTIONS
                    : [{ value: formData.timezone, label: tzLabel(formData.timezone) }, ...TZ_OPTIONS]
                  ).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Your display timezone. Policy time windows have their own zone
                  per policy.
                </p>
              </div>
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
            {isSaved && (
              <p className="text-sm text-green-600">Profile updated successfully</p>
            )}
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Password Section */}
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Change your password to keep your account secure</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-6">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  placeholder="Enter your current password"
                  value={formData.currentPassword}
                  onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter your new password"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm your new password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Password"}
            </Button>
            {isSaved && (
              <p className="text-sm text-green-600">Password updated successfully</p>
            )}
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Preferences Section */}
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Manage your notification and privacy preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Receive email updates about your account
                  </p>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4" />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Marketing Emails</p>
                  <p className="text-sm text-muted-foreground">
                    Receive emails about new features and updates
                  </p>
                </div>
                <input type="checkbox" className="h-4 w-4" />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Configure
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Danger Zone */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-700">Danger Zone</CardTitle>
          <CardDescription>Actions that cannot be undone</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-red-700">
            Deleting your account will permanently remove all your data. This action cannot be undone.
          </p>
          <Button variant="destructive" disabled>
            Delete Account
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
