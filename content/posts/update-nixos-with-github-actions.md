+++
title = "Keeping NixOS systems up to date with GitHub Actions"
date = 2024-09-03
+++

Keeping my NixOS servers up to date was dead simple before I switched to flakes -- I enabled
[system.autoUpgrade][auto-upgrade], and I was good to go. Trying the same with a shared flakes-based config introduced a
few problems:

 1. I configured `autoUpgrade` to commit flake lock changes, but it ran as _root_. This created file permission issues
    since my user owned my NixOS config.
 2. Even when committing worked, each machine piled up slightly different commits waiting for me to upstream.

I could have fixed issue #1 by changing the owner, but fixing #2 required me to rethink the process. Instead of having
each individual machine update their lock file, I realized it would be cleaner to update the lock file upstream _first_,
and then rebuild each server from upstream. Updating the lock file first ensures there's only one version of history,
and that makes it easier to reason about what is installed on each server.

Below is one method of updating the shared lock file before updating each server:

## Updating flake.lock with GitHub Actions

The [_update-flake-lock_ GitHub Action][action] updates your project's flake lock file on a schedule. It essentially runs
`nix flake update --commit-lock-file` and then opens a pull request. Add it to your NixOS config repository like this:

```yaml
# /.github/workflows/main.yml

name: update-dependencies
on:
  workflow_dispatch: # allows manual triggering
  schedule:
    - cron: '0 6 * * *' # daily at 1 am EST/2 am EDT

jobs:
  update-dependencies:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: DeterminateSystems/nix-installer-action@v12
      - id: update
        uses: DeterminateSystems/update-flake-lock@v23
```

Add this step if you want to automatically merge the pull request:

```yaml
      - name: Merge
        run: gh pr merge --auto "${{ steps.update.outputs.pull-request-number }}" --rebase
        env:
          GITHUB_TOKEN: ${{secrets.GITHUB_TOKEN}}
        if: ${{ steps.update.outputs.pull-request-number != '' }}
```

## Pulling changes & rebuilding

Next, it's time to configure NixOS to pull changes and rebuild. The configuration below adds two _systemd_ services:

* `pull-updates` pulls config changes from upstream daily at 4:40. It has a few guardrails: it ensures the local
  repository is on the main branch, and it only permits fast-forward merges. You'll want to set `serviceConfig.User` to
  the user owning the repository. If it succeeds, it kicks off `rebuild`...
* `rebuild` rebuilds and switches to the new configuration, and reboots if required. It's
  [a simplified version of `autoUpgrade`'s script][auto-upgrade-script].

```nix
systemd.services.pull-updates = {
  description = "Pulls changes to system config";
  restartIfChanged = false;
  onSuccess = [ "rebuild.service" ];
  startAt = "04:40";
  path = [pkgs.git pkgs.openssh];
  script = ''
    test "$(git branch --show-current)" = "main"
    git pull --ff-only
  '';
  serviceConfig = {
    WorkingDirectory = "/etc/nixos";
    User = "user-that-owns-the-repo";
    Type = "oneshot";
  };
};

systemd.services.rebuild = {
  description = "Rebuilds and activates system config";
  restartIfChanged = false;
  path = [pkgs.nixos-rebuild pkgs.systemd];
  script = ''
    nixos-rebuild boot
    booted="$(readlink /run/booted-system/{initrd,kernel,kernel-modules})"
    built="$(readlink /nix/var/nix/profiles/system/{initrd,kernel,kernel-modules})"

    if [ "''${booted}" = "''${built}" ]; then
      nixos-rebuild switch
    else
      reboot now
    fi
  '';
  serviceConfig.Type = "oneshot";
};
```

There are many possible variations. For example, in my real config I split the pull service into separate fetch and
merge services so I can fetch more frequently. You could also replace the GitHub action with a different scheduled
script, or change the rebuild service to never (or always!) reboot.

[auto-upgrade]: https://search.nixos.org/options?show=system.autoUpgrade.enable
[auto-upgrade-script]: https://github.com/NixOS/nixpkgs/blob/6e99f2a27d600612004fbd2c3282d614bfee6421/nixos/modules/tasks/auto-upgrade.nix#L209-L256
[action]: https://github.com/DeterminateSystems/update-flake-lock
