# OnStreak releases

This is where **OnStreak for Mac** is published: the installers, and the updates the
app installs by itself. OnStreak's own code is kept elsewhere - this repository only
holds what is released.

## Download

Open **Releases** and take the newest version's `.dmg` for your Mac:

- `OnStreak_<version>_aarch64.dmg` - Apple silicon (M1 and later)
- `OnStreak_<version>_x64.dmg` - Intel

Open the `.dmg`, drag **OnStreak** into **Applications**, and open it from there.
OnStreak needs macOS 13 (Ventura) or later.

## Updates

Installed copies of OnStreak update themselves from this repository. The app looks
here once each time it starts, a few seconds after its window appears, and asks
before it installs anything; it saves your work and opens again on the new version.

Every update is signed, and OnStreak installs only an update signed with its own
key. Updates replace the app in the Applications folder only - an app opened
straight from the disk image asks to be moved there first.

Pre-releases here are test builds. The app never offers them as updates.
