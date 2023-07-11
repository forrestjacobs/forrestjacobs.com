+++
title = "NixOS on WSL"
date = 2023-01-22
+++

I recently set up a new Windows machine for gaming, but I'm actually using it more to play around with Linux via [WSL].
I set up [NixOS] on WSL using the aptly named [NixOS on WSL] project, but ran into a few issues during setup that
bricked my environment[^wsl-brick]. Below are the steps that ended up working for me in the end:

[WSL]: https://learn.microsoft.com/en-us/windows/wsl/about
[NixOS]: https://nixos.org/
[NixOS on WSL]: https://github.com/nix-community/NixOS-WSL

### Goals

- Set up NixOS in WSL 2 on a new Windows 11 install (version 22H2.)
- Reuse my flake-based configuration from my other NixOS 22.11 installations.
- Take advantage of [native _systemd_ support in WSL].

[native _systemd_ support in WSL]: https://devblogs.microsoft.com/commandline/systemd-support-is-now-available-in-wsl/

### Step 1: Install WSL 2

Per [Microsoft's documentation]:

 1. Open PowerShell as an admin by right-clicking on it and selecting "Run as administrator."

 2. Run `wsl --install`

[Microsoft's documentation]: https://learn.microsoft.com/en-us/windows/wsl/install#install-wsl-command

### Step 2: Install NixOS

Per [NixOS-WSL's documentation]:

 3. Download the installer listed in [NixOS-WSL's 22.05 release].

 4. Move the file where you want your NixOS installation to live. I put it in
    `C:\Users\<my username>\AppData\Local\NixOS`, which I _think_ follows Windows's conventions.

 5. Open PowerShell as a normal user, change to the directory you just made, and run
    `wsl --import NixOS . nixos-wsl-installer.tar.gz --version 2`

 6. Run `wsl -d NixOS` to start NixOS. It'll run through initial setup, then hang on "Starting systemd..." Press
    <kbd>Ctrl</kbd> + <kbd>C</kbd> to get back to PowerShell, and then run `wsl --shutdown` followed by `wsl -d NixOS`
    to get back into NixOS.

[NixOS-WSL's documentation]: https://github.com/nix-community/NixOS-WSL#quick-start
[NixOS-WSL's 22.05 release]: https://github.com/nix-community/NixOS-WSL/releases/tag/22.05-5c211b47

### Step 3: Configure NixOS

At this point you should have a basic NixOS 22.05 installation! Let's finish up by setting a username, switching over to
flakes, updating to NixOS 22.11, and enabling native _systemd_:

 7. Edit `/etc/nixos/configuration.nix` and make the following changes. Use `sudo` or some such to edit the file as
    _root_. You may want to `nix-shell -p` your favorite editor at this point -- maybe [Helix]?
    - Change `wsl.defaultUser` to your desired username, and add something like
      `users.users.<your username>.isNormalUser = true;`
    - Remove references to `./nixos-wsl` since we'll set NixOS-WSL as a flake input:
      ```diff
        { lib, pkgs, config, modulesPath, ... }:
      -
      - with lib;
      - let
      -   nixos-wsl = import ./nixos-wsl;
      - in
        {
          imports = [
            "${modulesPath}/profiles/minimal.nix"
      -
      -     nixos-wsl.nixosModules.wsl
          ];
      ```
    - Add `wsl.nativeSystemd = true;`
    - Add `networking.hostName`, and set it to your Windows 11 "Device name." You can find this in the Windows Settings
      app under _System_ > _About_.

 8. Add `/etc/nixos/flake.nix` as _root_ with contents like the following. Replace `<host-name>` with your actual host
    name from `configuration.nix`.

    ```nix
    {

      inputs = {
        nixpkgs.url = "github:NixOS/nixpkgs/nixos-22.11";
        NixOS-WSL = {
          url = "github:nix-community/NixOS-WSL";
          inputs.nixpkgs.follows = "nixpkgs";
        };
      };

      outputs = { self, nixpkgs, NixOS-WSL }: {
        nixosConfigurations."<host-name>" = nixpkgs.lib.nixosSystem {
          system = "x86_64-linux";
          modules = [
            { nix.registry.nixpkgs.flake = nixpkgs; }
            ./configuration.nix
            NixOS-WSL.nixosModules.wsl
          ];
        };
      };

    }
    ```

 9. Run `sudo nixos-rebuild switch`

10. `exit` out of NixOS, then run `wsl --shutdown` followed by `wsl -d NixOS`. You should be logged in as the new
    default user.

11. At this point you should have a stable base to make any configuration changes you'd like.

[Helix]: https://helix-editor.com/

### Step 4: Cleaning up

- Rename `wsl.automountPath` to `wsl.wslConf.automount.root` in `configuration.nix` to match NixOS-WSL's latest
  configuration.
- Delete the now unused `/etc/nixos/nixos-wsl` directory.
- Delete `/home/nixos` since you've changed your username.
- You can run `sudo nix-channel --remove nixos` if you don't want the channel hanging around now that we're using
  flakes.

### Addendum: Share `.ssh` directory with Windows

It turns out that [file permissions set in WSL are preserved in NTFS][^fs-perm-wsl-ntfs]. You can store your SSH
configuration files in Windows, and still use them from WSL with no permissions issues:

- Set up your `~/.ssh` in NixOS like normal.
- Move your `~/.ssh` directory to Windows with `mv ~/.ssh /mnt/c/Users/<your Windows username>/.ssh`
- Soft link it back to your WSL VM with `ln -s /mnt/c/Users/<your Windows username>/.ssh/ ~/.ssh`

That's it! You can verify that permissions carried over with `ls -al ~/.ssh/`

[file permissions set in WSL are preserved in NTFS]: https://learn.microsoft.com/en-us/windows/wsl/file-permissions

### Addendum: Set up _fish_ in NixOS the right way

I use [_fish_] as my shell, but when I set it up in WSL I started getting errors like this:

```
fish: Unknown command: ls
/nix/store/lkf5vmavnxa0s37imb03gv7hs6dh5pll-fish-3.5.1/share/fish/functions/ls.fish (line 64):
    command $__fish_ls_command $__fish_ls_color_opt $opt $argv
    ^
in function 'ls'
```

Uh oh. Obviously, there are important directories missing from my path. It turns out that I was missing some
configuration[^fish-path-missing]:

```
programs.fish.enable = true;
```

I don't know why this issue only appeared in WSL, but _fish_ users should probably set `programs.fish.enable` in NixOS
whether the issue appears or not.

[_fish_]: https://fishshell.com/

### See also

- [Nix Flakes on WSL](https://xeiaso.net/blog/nix-flakes-4-wsl-2022-05-01) by [Xe Iaso](https://xeiaso.net/)

* * *

[^wsl-brick]: I _think_ I changed the default user without actually setting up that user? Or I switched to native
_systemd_ before upgrading to a version of NixOS on WSL that supports it?

[^fs-perm-wsl-ntfs]: Thanks to [this Stack Exchange answer](https://superuser.com/a/1334839) for pointing me in the
right direction. You don't have to follow the instructions in this post -- NixOS on WSL already mounts Windows's drives
with the necessary options.

[^fish-path-missing]: Thanks to [this GitHub issue](https://github.com/nix-community/NixOS-WSL/issues/192) for alerting
me to the problem.
