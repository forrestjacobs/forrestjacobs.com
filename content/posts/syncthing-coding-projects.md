+++
title = "Using Syncthing to sync coding projects"
date = 2023-05-06 12:00:00
+++

<span class="caps">I code</span> on a MacBook and a Windows PC, and I want to keep my coding projects in sync between them. Here are my wishes in decreasing priority:

 1. Code changes on my MacBook should magically update my PC, and vice versa. (Think Dropbox.)
 2. Some files should not sync, like host-specific dependencies and targets. I want to ignore these files via patterns, a la [gitignore](https://git-scm.com/docs/gitignore).
 3. Ideally, this sync extends to both a headless Linux server I use for remote development, _and_ to [WSL](/nixos-on-wsl/) on my Windows PC.

After experimenting with other solutions (outlined below) I discovered that Syncthing meets every requirement.

### What I tried first

#### 1. OneDrive

I use OneDrive to sync most of my files. It'd be nice to just add my coding projects to OneDrive, but it doesn't work in practice: [ignoring files is awkward](https://superuser.com/a/1662761), and seemingly only works on Windows. Additionally, OneDrive doesn't run on Linux without [some](https://rclone.org/onedrive/) [help](https://github.com/abraunegg/onedrive).

Dropbox looks like a better fit on paper: [it can ignore files on any platform](https://help.dropbox.com/sync/ignored-files) (in a different, awkward way) and [it has a first party Linux client](https://www.dropbox.com/install-linux). But switching to Dropbox would be painful -- my partner and I switched _away_ from Dropbox about a year ago because we were getting more storage for less money from Microsoft, and [the modern Dropbox app sucks](https://daringfireball.net/linked/2019/06/13/dropbox-sucks).

#### 2. Remote development

If the issue is syncing files across computers, [why don't I just](https://justsimply.dev/) work on one computer? Well, developing on a remote machine has its own issues:

- Blips in internet connectivity become big problems. At best, you wait for keystrokes to appear over SSH. At worst, you can't code at all. (And while file sync also requires connectivity, a few seconds is enough to sync changes.)
- Waiting for my dinky [free-tier Oracle Cloud VM](https://www.oracle.com/cloud/free/) to compile a complex Rust project is frustrating. Sure, I could rent a better VM, but it's silly to pay for that additional power when I have a more than capable computer in front of me.
- Some development doesn't work well in a remote environment. Web dev is fine, but what if I want to play around with [game](https://bevyengine.org/) or mobile dev?

#### 3. Git

Can't I just use Git to stay up to date?

No -- version control is different than file sync. I don't want to track personal config files in version control, but I _do_ want to sync them. And I don't always want to check in work in progress -- for example, I don't want to check in changes that cause builds or tests to fail.

### Using Syncthing

Syncthing is amazing. It does everything I outlined at the top -- it syncs my projects, it ignores files based on patterns, and it runs everywhere I code (Windows, MacOS, and Linux.)

I resisted using it because of its high barrier to entry. It uses peer-to-peer file syncing, so you need to set it up on a server to ensure each computer sees the latest changes. And its configuration is more involved than something like Dropbox.

But it's still worth it for me because it solves all my original problems. (And I want to sync these files to a server anyway.) If you're struggling with the same issues I ran into, and you're willing to set up a server, give Syncthing a shot.

* * *

### Addendum: Syncing your ignore patterns

Syncthing does not keep your ignore patterns in sync across hosts, but there's a way around it:

 1. Create a text file with the patterns you want to ignore.
 2. Save it to your Syncthing folder.
 3. Add <code>#include _name-of-that-file_</code> to each host's ignore patterns.

Voilà!
